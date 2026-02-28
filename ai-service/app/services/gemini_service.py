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

gemini_service = GeminiService()
