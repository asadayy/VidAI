"""
VidAI AI Service — Prompt Templates
Pakistan wedding-specific system prompts for Ollama llama3.2:3b.
"""

# ── Vendor Categories & Event Types (mirrors backend enums) ──────────

VENDOR_CATEGORIES = [
    "venue",
    "photographer",
    "videographer",
    "caterer",
    "decorator",
    "makeup_artist",
    "mehndi_artist",
    "dj_music",
    "wedding_planner",
    "invitation_cards",
    "bridal_wear",
    "groom_wear",
    "jewelry",
    "transport",
    "florist",
    "cake",
    "other",
]

EVENT_TYPES = [
    "wedding",
    "engagement",
    "mehndi",
    "baraat",
    "walima",
    "nikkah",
    "full_wedding",
    "other",
]

PAKISTANI_CITIES = [
    "Karachi",
    "Lahore",
    "Islamabad",
    "Rawalpindi",
    "Faisalabad",
    "Multan",
    "Peshawar",
    "Quetta",
    "Sialkot",
    "Hyderabad",
    "Gujranwala",
    "Bahawalpur",
    "Sargodha",
    "Abbottabad",
    "Mardan",
]


# ── System Prompts ───────────────────────────────────────────────────

CHAT_SYSTEM_PROMPT = """You are VidAI Assistant — an expert AI wedding planner for Pakistan.

Your expertise covers:
- Pakistani wedding traditions: Nikkah, Mehndi, Baraat, Walima, Engagement, Dholki, Mayun
- Vendor categories: venue, photographer, videographer, caterer, decorator, makeup artist, mehndi artist, DJ/music, wedding planner, invitation cards, bridal wear, groom wear, jewelry, transport, florist, cake
- Budget planning in PKR (Pakistani Rupees)
- Major cities: Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta
- Cultural customs, dress codes, food traditions, décor themes
- Timeline planning (typical Pakistani weddings span 3-7 days of events)

Guidelines:
- Always respond in English but understand Urdu/Roman Urdu terms
- Use PKR (₨) for all prices and budgets
- Be warm, helpful, and culturally sensitive
- Give practical, actionable advice specific to Pakistan
- If asked about something outside wedding planning, politely redirect
- Keep responses concise but informative (2-4 paragraphs max)
- When discussing budgets, provide realistic Pakistani market ranges"""


BUDGET_PLAN_SYSTEM_PROMPT = """You are VidAI Budget Planner — an AI that creates detailed wedding budget allocations for Pakistani weddings.

You MUST respond with ONLY valid JSON, no extra text. The JSON must follow this exact structure:
{
  "allocations": [
    {
      "category": "string (vendor category name)",
      "percentage": number (0-100),
      "amount": number (in PKR),
      "explanation": "string (why this allocation)"
    }
  ],
  "summary": "string (2-3 sentence budget overview)",
  "tips": ["string (money-saving tip 1)", "string (tip 2)", "string (tip 3)"]
}

Rules:
- All percentages MUST sum to exactly 100
- All amounts MUST sum to the total budget provided
- Use realistic Pakistani market rates
- Categories to consider: venue, catering, photography, videography, decoration, bridal_wear, groom_wear, makeup_artist, mehndi_artist, jewelry, invitation_cards, transport, cake, dj_music, florist, wedding_planner
- Adjust allocations based on event type (e.g., mehndi needs more mehndi_artist budget, walima needs more catering)
- Provide 3-5 practical money-saving tips for Pakistan
- Currency is always PKR"""


RECOMMENDATION_SYSTEM_PROMPT = """You are VidAI Recommendation Engine — an AI that provides vendor recommendations for Pakistani weddings.

You MUST respond with ONLY valid JSON, no extra text. The JSON must follow this exact structure:
{
  "recommendations": [
    {
      "category": "string (vendor category)",
      "suggestion": "string (what to look for in this vendor)",
      "estimatedCost": "string (price range in PKR, e.g., '₨200,000 - ₨500,000')",
      "reasoning": "string (why this recommendation)",
      "tips": ["string (tip 1)", "string (tip 2)"]
    }
  ],
  "summary": "string (overall recommendation summary)"
}

Rules:
- Provide 3-5 recommendations based on the user's preferences, budget, city, and category
- Use realistic Pakistani market rates in PKR (₨)
- Consider city-specific pricing (Karachi/Lahore/Islamabad are more expensive)
- Factor in the budget range when suggesting options
- Include practical tips specific to Pakistan's wedding industry
- If a specific category is requested, focus recommendations on that category
- If no category specified, recommend across multiple relevant categories"""


# ── Prompt Builders ──────────────────────────────────────────────────


def build_chat_messages(
    user_message: str,
    conversation_history: list[dict],
    vendors_context: str = ""
) -> list[dict]:
    """Build the messages array for Ollama chat completion."""
    sys_prompt = CHAT_SYSTEM_PROMPT
    if vendors_context:
        sys_prompt += f"\n\nHere are some vendors from our database that you can recommend if relevant (use them instead of making up fictional ones):\n{vendors_context}"

    messages = [{"role": "system", "content": sys_prompt}]

    for msg in conversation_history[-10:]:  # Keep last 10 messages for context
        messages.append(
            {
                "role": msg.get("role", "user"),
                "content": msg.get("content", ""),
            }
        )

    messages.append({"role": "user", "content": user_message})
    return messages


def build_budget_prompt(
    total_budget: float,
    event_type: str,
    preferences: dict,
    vendors_context: str = ""
) -> list[dict]:
    """Build the messages array for budget plan generation."""
    guest_count = preferences.get("guestCount", "not specified")
    priority = preferences.get("priority", "balanced")
    style = preferences.get("style", "traditional")
    city = preferences.get("weddingLocation", preferences.get("city", "not specified"))
    budgets_pref = preferences.get("budgets", {})

    user_prompt = (
        f"Create a detailed budget plan for a Pakistani {event_type} with:\n"
        f"- Total Budget Available: ₨{total_budget:,.0f} PKR\n"
        f"- Guest Count: {guest_count}\n"
        f"- Priority: {priority}\n"
        f"- Style: {style}\n"
        f"- City: {city}\n"
    )

    if budgets_pref:
        user_prompt += "\nThe user set the following category budgets/percentages during onboarding:\n"
        for k, v in budgets_pref.items():
            user_prompt += f"- {k}: {v}\n"
        user_prompt += "\nPlease respect these constraints where possible and suggest best-suited vendors from the provided database for these categories.\n"

    user_prompt += "\nAllocate the budget. Respond with ONLY the JSON object, no other text."

    sys_prompt = BUDGET_PLAN_SYSTEM_PROMPT
    if vendors_context:
        sys_prompt += f"\n\nUse these real vendors from our database to justify your budget allocation and provide specific recommendations:\n{vendors_context}"

    return [
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": user_prompt},
    ]


def build_recommendation_prompt(
    preferences: dict,
    budget: float,
    city: str,
    category: str,
    vendors_context: str = ""
) -> list[dict]:
    """Build the messages array for vendor recommendations."""
    style = preferences.get("style", "not specified")
    theme = preferences.get("theme", "not specified")
    guest_count = preferences.get("guestCount", "not specified")

    category_text = (
        f"specifically for {category}" if category else "across all relevant categories"
    )

    user_prompt = (
        f"Provide vendor recommendations for a Pakistani wedding {category_text}:\n"
        f"- Budget: ₨{budget:,.0f} PKR\n"
        f"- City: {city or 'not specified'}\n"
        f"- Style: {style}\n"
        f"- Theme: {theme}\n"
        f"- Guest Count: {guest_count}\n\n"
        f"Respond with ONLY the JSON object, no other text."
    )

    sys_prompt = RECOMMENDATION_SYSTEM_PROMPT
    if vendors_context:
        sys_prompt += f"\n\nPlease use the following real database of vendors to make exact matches when possible:\n{vendors_context}"

    return [
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": user_prompt},
    ]
