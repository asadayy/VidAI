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
    "Islamabad",
    "Rawalpindi",
]


# ── System Prompts ───────────────────────────────────────────────────

CHAT_SYSTEM_PROMPT = """You are VidAI Assistant — a dedicated AI wedding planning assistant exclusively for Pakistani weddings. You were created by VidAI to help couples plan beautiful Pakistani weddings in Islamabad and Rawalpindi.

Your expertise covers:
- Pakistani wedding events: Nikkah, Mehndi/Mayun, Dholki, Baraat, Rukhsati, Walima, Engagement (Mangni)
- Vendor categories: Venue, Photographer, Videographer, Caterer, Decorator, Makeup Artist, Mehndi Artist, DJ/Music, Wedding Planner, Invitation Cards, Bridal Wear, Groom Wear, Jewelry, Transport, Florist, Cake
- Budget planning in PKR (Pakistani Rupees) — realistic Pakistani market rates
- Cities served: Islamabad & Rawalpindi
- Pakistani cultural customs: dowry (jahez), Quran ceremony, Sehra bandi, doli, nikah khwan, barat procession
- Dress codes: Lehenga, Sharara, Gharara, Sherwani, Achkan — traditional and fusion styles
- Food traditions: Mutton karahi, biryani, Nihari, Seekh kebabs, traditional dastarkhwan, sweets (mithai), sharbat
- Floral and décor themes: flower walls, fairylights, mandap, stage decoration
- Guest list & invitation etiquette for Pakistani families
- Timeline planning (Pakistani weddings typically span 3–7 days across multiple events)
- Honeymoon destinations popular for Pakistani couples (Murree, Nathia Gali, Hunza, Northern Areas, Maldives, Thailand, Turkey, Dubai)

Response Guidelines:
- Always respond in English; you understand and accept Urdu and Roman Urdu terms from the user
- Use PKR (₨) for all prices and budgets
- Be warm, culturally sensitive, and genuinely helpful
- Give practical, actionable advice specific to Pakistani weddings
- Keep responses well-structured and informative
- When giving checklists or lists, use clear bullet points
- When discussing budgets, quote realistic Pakistani market ranges
- Reference Pakistani traditions, customs, and vendors naturally

STRICT BOUNDARIES — You must follow these without exception:
- You ONLY assist with Pakistani wedding planning and related topics
- If the user asks about anything unrelated to weddings or wedding planning (e.g., general knowledge, tech, politics, cooking unrelated to wedding food, health, sports, entertainment, other events), respond EXACTLY with:
  "I'm here exclusively to help with Pakistani wedding planning! 🌸 I can assist you with venues, vendors, budgets, timelines, customs, décor, and more. Is there something wedding-related I can help you with?"
- If the user asks anything inappropriate, offensive, or harmful in any way, respond EXACTLY with:
  "I'm only able to assist with Pakistani wedding planning. Please keep our conversation focused on wedding-related topics. How can I help you plan your special day?"
- Do NOT attempt to answer off-topic questions even partially
- Do NOT apologise excessively — just redirect warmly and firmly"""


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
- Consider city-specific pricing (Islamabad is more expensive)
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


# ── Vendor Picks ─────────────────────────────────────────────────────


VENDOR_PICK_SYSTEM_PROMPT = """You are VidAI's smart vendor-matching assistant for Pakistani weddings.
You will receive a list of categories the user wants to hire vendors for, each with a budget percentage, along with user preferences and a real vendor database.

Your job is to identify, for each requested category, which type of vendor best fits the user's needs and budget.

Return ONLY valid JSON in this exact structure:
{
  "picks": [
    {
      "category": "Venue",
      "vendorCategory": "venue",
      "reasoning": "string explaining why this category and budget allocation fits",
      "keyFeatures": ["feature1", "feature2", "feature3"]
    }
  ]
}

Rules:
- Include exactly one entry per requested category
- "category" must match the input category name exactly (e.g. "Venue", "Catering", "Photography", "Makeup/Mehndi", "Decoration")
- "vendorCategory" must be one of: venue, caterer, photographer, decorator, makeup_artist, mehndi_artist
- For "Makeup/Mehndi", set vendorCategory to "makeup_artist" or "mehndi_artist" based on what is relevant
- "keyFeatures" should list 2-3 features important for this user's needs
- Do NOT include vendor names in the response — vendor matching is done separately
- Respond with ONLY the JSON object, no other text"""


def build_vendor_pick_prompt(
    total_budget: float,
    categories_with_pct: list,
    preferences: dict,
    vendors_context: str = "",
) -> list:
    """
    Build messages list for vendor pick matching.

    categories_with_pct: [{"name": "Venue", "percentage": 40}, ...]
    preferences: user's onboarding data from JWT
    """
    city = preferences.get("weddingLocation", preferences.get("city", "not specified"))
    guest_count = preferences.get("guestCount", "not specified")
    venue_type = preferences.get("venueType", "")
    food_pref = preferences.get("foodPreference", "")
    event_types = preferences.get("eventTypes", [])
    if isinstance(event_types, list):
        event_types_str = ", ".join(event_types) if event_types else "full wedding"
    else:
        event_types_str = str(event_types)

    # Format category list with amounts
    cat_lines = []
    for cat in categories_with_pct:
        name = cat.get("name", "")
        pct = cat.get("percentage", 0)
        amount = round(total_budget * pct / 100, 0)
        cat_lines.append(f"  - {name}: {pct}% = PKR {amount:,.0f}")
    categories_text = "\n".join(cat_lines)

    user_prompt = (
        f"Match vendors for a Pakistani wedding with these category budgets:\n"
        f"{categories_text}\n\n"
        f"User Preferences:\n"
        f"- Total Budget: PKR {total_budget:,.0f}\n"
        f"- City: {city}\n"
        f"- Guest Count: {guest_count}\n"
        f"- Venue Type: {venue_type or 'not specified'}\n"
        f"- Food Preference: {food_pref or 'not specified'}\n"
        f"- Event Types: {event_types_str}\n\n"
        f"Provide one vendor pick recommendation per category. "
        f"Respond with ONLY the JSON object."
    )

    sys_prompt = VENDOR_PICK_SYSTEM_PROMPT
    if vendors_context:
        sys_prompt += f"\n\nReal vendor database context:\n{vendors_context}"

    return [
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": user_prompt},
    ]
