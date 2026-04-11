import base64
import google.generativeai as genai
import json
from app.config import settings

class GeminiService:
    def __init__(self):
        if settings.GOOGLE_API_KEY:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
        else:
            self.model = None

    async def generate_invitation_content(self, essentials: dict, style: dict, tone: str):
        if not self.model:
            return {
                "headline": f"Wedding Invitation: {essentials.get('names')}",
                "bodyText": f"Please join us on {essentials.get('date')} at {essentials.get('time')} for our celebration at {essentials.get('venueName')}, {essentials.get('venueCity')}.",
                "footerText": "We look forward to seeing you there!",
                "rsvpInfo": "Please RSVP by the end of the month."
            }

        prompt = f"""
        You are an expert wedding invitation card writer. 
        Generate the text content for a digital wedding invitation card based on the following details:
        
        Essentials:
        - Names: {essentials.get('names')}
        - Date: {essentials.get('date')}
        - Time: {essentials.get('time')}
        - Venue: {essentials.get('venueName')}, {essentials.get('venueCity')}
        
        Style & Vibe:
        - Theme: {style.get('theme')}
        - Color Palette: {style.get('colorPalette')}
        - Orientation: {style.get('orientation')}
        - Imagery/Motifs: {style.get('imagery')}
        
        Tone: {tone}
        
        Please provide the response in a structured JSON format with the following keys:
        - headline: A catchy or formal opening (e.g., "The Wedding of...", "Join us...")
        - bodyText: The main invitation text including names and invitation message.
        - footerText: A closing message or quote.
        - rsvpInfo: A brief RSVP instruction.
        
        Keep the text elegant and evocative according to the chosen tone and theme.
        Ensure the output is ONLY valid JSON.
        IMPORTANT: Do NOT use any markdown formatting (no **bold**, no *italic*, no # headers) in any of the text values. Plain text only.
        """

        try:
            response = self.model.generate_content(prompt)
            # Find the JSON part in the response
            text = response.text
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "{" in text:
                text = text[text.find("{"):text.rfind("}")+1]
            
            return json.loads(text)
        except Exception as e:
            print(f"Gemini Error: {e}")
            # Fallback
            return {
                "headline": f"Celebrating the Love of {essentials.get('names')}",
                "bodyText": f"We invite you to share in our joy as we exchange vows on {essentials.get('date')} at {essentials.get('time')}. Ceremony to be held at {essentials.get('venueName')}, {essentials.get('venueCity')}.",
                "footerText": "Your presence means the world to us.",
                "rsvpInfo": "Kindly respond by visiting our website."
            }

    async def generate_invitation_image(self, essentials: dict, style: dict, tone: str, generated_content: dict) -> dict:
        """Generate a wedding invitation image using Nano Banana (gemini-2.5-flash-image)."""
        from google import genai as new_genai
        from google.genai import types as genai_types

        if not settings.GOOGLE_API_KEY:
            raise Exception("Google API key not configured")

        client = new_genai.Client(api_key=settings.GOOGLE_API_KEY)

        headline = generated_content.get('headline', f"The Wedding of {essentials.get('names')}")
        body_text = generated_content.get('bodyText', '')
        footer_text = generated_content.get('footerText', '')
        rsvp_info = generated_content.get('rsvpInfo', '')

        prompt = f"""Create a beautiful, elegant digital wedding invitation card image with the following details:

Theme: {style.get('theme', 'Modern Minimalist')}
Color Palette: {style.get('colorPalette', 'Classic Black and White')}
Imagery/Motifs: {style.get('imagery', 'floral')}
Tone: {tone}

Text to display on the card:
- Headline: "{headline}"
- Main Text: "{body_text}"
- Venue: {essentials.get('venueName', '')}, {essentials.get('venueCity', '')}
- Date & Time: {essentials.get('date', '')} at {essentials.get('time', '')}
- Footer: "{footer_text}"
- RSVP: "{rsvp_info}"

Design the card as a premium, print-ready wedding invitation with a portrait aspect ratio of 250x500 pixels. Use decorative borders, elegant typography, and motifs that match the theme. All text must be clearly readable. The layout should look like a real wedding card. The final image must be in portrait orientation (taller than wide, approximately 1:2 ratio)."""

        try:
            response = await client.aio.models.generate_content(
                model=settings.GEMINI_IMAGE_MODEL,
                contents=[prompt],
                config=genai_types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                ),
            )

            for part in response.parts:
                if part.inline_data is not None:
                    image_data = part.inline_data.data
                    mime_type = part.inline_data.mime_type or "image/png"
                    # inline_data.data may already be bytes or a base64 string depending on SDK version
                    if isinstance(image_data, bytes):
                        image_b64 = base64.b64encode(image_data).decode("utf-8")
                    else:
                        image_b64 = image_data  # already base64 string
                    return {"imageBase64": image_b64, "mimeType": mime_type}

            raise Exception("No image was generated in the response")
        except Exception as e:
            print(f"Gemini Image Generation Error: {e}")
            raise

    async def chat(self, user_message: str, conversation_history: list[dict], vendors_context: str = "") -> str:
        """Chat with the VidAI wedding assistant using Gemini."""
        import asyncio

        if not self.model:
            raise Exception("Gemini API key not configured")

        from app.services.prompts import CHAT_SYSTEM_PROMPT

        # Build system prompt
        sys_prompt = CHAT_SYSTEM_PROMPT
        if vendors_context:
            sys_prompt += (
                "\n\nHere are some vendors from our database that you can recommend if relevant "
                f"(use them instead of making up fictional ones):\n{vendors_context}"
            )

        # Build Gemini chat history (max last 10 messages)
        history = []
        for msg in conversation_history[-10:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            # Gemini uses 'model' instead of 'assistant'
            gemini_role = "model" if role == "assistant" else "user"
            history.append({"role": gemini_role, "parts": [{"text": content}]})

        chat_session = self.model.start_chat(history=history)
        full_message = f"{sys_prompt}\n\n{user_message}" if not history else user_message

        # send_message is synchronous — run in a thread pool to avoid blocking the async event loop
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, chat_session.send_message, full_message)
        return response.text

    async def chat_stream(self, user_message: str, conversation_history: list[dict], vendors_context: str = ""):
        """Stream chat response chunks from Gemini."""
        import asyncio

        if not self.model:
            raise Exception("Gemini API key not configured")

        from app.services.prompts import CHAT_SYSTEM_PROMPT

        sys_prompt = CHAT_SYSTEM_PROMPT
        if vendors_context:
            sys_prompt += (
                "\n\nHere are some vendors from our database that you can recommend if relevant "
                f"(use them instead of making up fictional ones):\n{vendors_context}"
            )

        history = []
        for msg in conversation_history[-10:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            gemini_role = "model" if role == "assistant" else "user"
            history.append({"role": gemini_role, "parts": [{"text": content}]})

        chat_session = self.model.start_chat(history=history)
        full_message = f"{sys_prompt}\n\n{user_message}" if not history else user_message

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, lambda: chat_session.send_message(full_message, stream=True)
        )

        # Iterate synchronous Gemini stream in a thread to avoid blocking the event loop
        import queue
        import threading

        chunk_queue = queue.Queue()
        sentinel = object()

        def _drain():
            try:
                for chunk in response:
                    if chunk.text:
                        chunk_queue.put(chunk.text)
            except Exception as exc:
                chunk_queue.put(exc)
            finally:
                chunk_queue.put(sentinel)

        threading.Thread(target=_drain, daemon=True).start()

        while True:
            item = await loop.run_in_executor(None, chunk_queue.get)
            if item is sentinel:
                break
            if isinstance(item, Exception):
                raise item
            yield item

gemini_service = GeminiService()
