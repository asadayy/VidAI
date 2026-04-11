"""
VidAI AI Service — API Router
Four endpoints matching the backend proxy contract:
  POST /api/v1/chat
  POST /api/v1/chat/stream
  POST /api/v1/recommendations
  POST /api/v1/budget-plan
"""

import logging
import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import httpx

from app.models.schemas import (
    BudgetAllocation,
    BudgetPlanRequest,
    BudgetPlanResponse,
    BudgetPlanResponseData,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ChatResponseData,
    RecommendationItem,
    RecommendationRequest,
    RecommendationResponse,
    RecommendationResponseData,
    VendorPickRequest,
    VendorPickResponse,
    VendorPickResponseData,
    VendorPickItem,
)
from app.services.ollama_service import ollama_service
from app.services.gemini_service import gemini_service
from app.services.database import db_client
from app.services.prompts import (
    build_budget_prompt,
    build_recommendation_prompt,
    build_vendor_pick_prompt,
)

logger = logging.getLogger("vidai.router")

router = APIRouter(prefix="/api/v1", tags=["AI"])


# ── Chat Endpoint ────────────────────────────────────────────────────


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """
    Chat with the VidAI wedding planning assistant.
    Uses Gemini AI for responses.
    """
    try:
        # Fetch vendors from DB for context
        try:
            vendors = await db_client.get_all_vendors()
            vendors_context = json.dumps(vendors, indent=2) if vendors else ""
        except Exception as e:
            logger.error("Failed to fetch vendors context for chat: %r", e)
            vendors_context = ""

        history_dicts = [
            {"role": msg.role, "content": msg.content}
            for msg in request.conversationHistory
        ]

        # Use Gemini for chat
        ai_reply = await gemini_service.chat(
            user_message=request.message,
            conversation_history=history_dicts,
            vendors_context=vendors_context,
        )

        # Build updated conversation history
        updated_history = list(request.conversationHistory) + [
            ChatMessage(role="user", content=request.message),
            ChatMessage(role="assistant", content=ai_reply),
        ]

        return ChatResponse(
            data=ChatResponseData(
                response=ai_reply,
                conversationHistory=updated_history,
            )
        )

    except Exception as exc:
        logger.error("Chat endpoint error: %r", exc)
        raise HTTPException(
            status_code=503,
            detail=f"AI service unavailable: {type(exc).__name__}: {exc or 'connection error'}",
        ) from exc


# ── Streaming Chat Endpoint ──────────────────────────────────────────


@router.post("/chat/stream")
async def chat_with_ai_stream(request: ChatRequest):
    """
    Streaming chat with the VidAI wedding planning assistant.
    Returns Server-Sent Events with text chunks.
    """
    try:
        # Fetch vendors from DB for context
        try:
            vendors = await db_client.get_all_vendors()
            vendors_context = json.dumps(vendors, indent=2) if vendors else ""
        except Exception as e:
            logger.error("Failed to fetch vendors context for stream chat: %r", e)
            vendors_context = ""

        history_dicts = [
            {"role": msg.role, "content": msg.content}
            for msg in request.conversationHistory
        ]

        async def event_generator():
            try:
                async for chunk in gemini_service.chat_stream(
                    user_message=request.message,
                    conversation_history=history_dicts,
                    vendors_context=vendors_context,
                ):
                    yield f"data: {json.dumps({'text': chunk})}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as exc:
                logger.error("Stream chat error: %r", exc)
                yield f"data: {json.dumps({'error': str(exc)})}\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    except Exception as exc:
        logger.error("Stream chat setup error: %r", exc)
        raise HTTPException(
            status_code=503,
            detail=f"AI service unavailable: {type(exc).__name__}: {exc or 'connection error'}",
        ) from exc


# ── Recommendations Endpoint ─────────────────────────────────────────


@router.post("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """
    Get AI-powered vendor recommendations for a Pakistani wedding.
    Uses user profile for smart filtering: city, budget proximity, availability.
    """
    try:
        # Determine user context from profile
        profile = request.userProfile
        effective_city = request.city
        event_date = None

        if profile:
            effective_city = effective_city or profile.city
            event_date = profile.eventDate
            # If there are wedding events, use the nearest future event date
            if profile.weddingEvents:
                for evt in profile.weddingEvents:
                    if evt.eventDate:
                        event_date = event_date or evt.eventDate

        # Smart vendor query: filter by category, city, budget, availability
        try:
            vendors = await db_client.get_matching_vendors(
                category=request.category,
                city=effective_city,
                budget=request.budget,
                event_date=event_date,
            )
            vendors_context = json.dumps(vendors, indent=2) if vendors else ""
        except Exception as e:
            logger.error("Failed to fetch matching vendors: %r", e)
            vendors_context = ""

        messages = build_recommendation_prompt(
            preferences=request.preferences,
            budget=request.budget,
            city=effective_city,
            category=request.category,
            vendors_context=vendors_context,
            user_profile=profile,
        )

        result = await ollama_service.generate_json(messages)

        # Parse recommendations from AI response
        recommendations = [
            RecommendationItem(
                category=rec.get("category", request.category or "general"),
                suggestion=rec.get("suggestion", ""),
                estimatedCost=rec.get("estimatedCost", "Contact for pricing"),
                reasoning=rec.get("reasoning", ""),
                tips=rec.get("tips", []),
            )
            for rec in result.get("recommendations", [])
        ]

        return RecommendationResponse(
            data=RecommendationResponseData(
                recommendations=recommendations,
                summary=result.get("summary", ""),
                city=request.city,
                budget=request.budget,
            )
        )

    except ValueError as exc:
        # JSON parse failure — return empty with message
        logger.warning("Recommendation JSON parse error: %s", exc)
        return RecommendationResponse(
            data=RecommendationResponseData(
                recommendations=[],
                summary=f"Could not parse AI response. Please try again. ({exc})",
                city=request.city,
                budget=request.budget,
            )
        )

    except httpx.TimeoutException as exc:
        logger.error("Recommendations endpoint timeout: %r", exc)
        return RecommendationResponse(
            data=RecommendationResponseData(
                recommendations=[],
                summary="AI request timed out. Please try again with simpler preferences.",
                city=request.city,
                budget=request.budget,
            )
        )

    except Exception as exc:
        logger.error("Recommendations endpoint error: %r", exc)
        raise HTTPException(
            status_code=503,
            detail=f"AI service unavailable: {type(exc).__name__}: {exc or 'connection error'}",
        ) from exc


# ── Budget Plan Endpoint ─────────────────────────────────────────────


@router.post("/budget-plan", response_model=BudgetPlanResponse)
async def get_budget_plan(request: BudgetPlanRequest):
    """
    Generate an AI-powered budget allocation plan for a Pakistani wedding.
    Returns structured allocations matching the Budget model's aiPlan schema.
    """
    try:
        # Fetch vendors from DB
        try:
            vendors = await db_client.get_all_vendors()
            vendors_context = json.dumps(vendors, indent=2) if vendors else ""
        except Exception as e:
            logger.error("Failed to fetch vendors context for budget: %r", e)
            vendors_context = ""

        messages = build_budget_prompt(
            total_budget=request.totalBudget,
            event_type=request.eventType,
            preferences=request.preferences,
            vendors_context=vendors_context
        )

        result = await ollama_service.generate_json(messages)

        # Parse and normalize allocations
        raw_allocations = result.get("allocations", [])
        allocations = []
        total_percentage = 0.0

        for alloc in raw_allocations:
            pct = float(alloc.get("percentage", 0))
            # Recalculate amount from percentage to ensure consistency
            amount = round(request.totalBudget * pct / 100, 2)
            total_percentage += pct

            allocations.append(
                BudgetAllocation(
                    category=alloc.get("category", "other"),
                    percentage=pct,
                    amount=amount,
                    explanation=alloc.get("explanation", ""),
                )
            )

        # Normalize percentages if they don't sum to 100
        if allocations and abs(total_percentage - 100) > 0.5:
            logger.warning(
                "AI allocations sum to %.1f%%, normalizing to 100%%",
                total_percentage,
            )
            factor = 100.0 / total_percentage if total_percentage > 0 else 1.0
            for alloc in allocations:
                alloc.percentage = round(alloc.percentage * factor, 1)
                alloc.amount = round(request.totalBudget * alloc.percentage / 100, 2)

        return BudgetPlanResponse(
            data=BudgetPlanResponseData(
                allocations=allocations,
                summary=result.get("summary", ""),
                tips=result.get("tips", []),
                totalBudget=request.totalBudget,
                eventType=request.eventType,
                currency="PKR",
            )
        )

    except ValueError as exc:
        # JSON parse failure — return a fallback static plan
        logger.warning("Budget plan JSON parse error: %s", exc)
        return _build_fallback_budget(request.totalBudget, request.eventType)

    except httpx.TimeoutException as exc:
        # Timeout — return fallback plan rather than failing
        logger.warning("Budget plan timeout, returning fallback: %r", exc)
        return _build_fallback_budget(request.totalBudget, request.eventType)

    except Exception as exc:
        logger.error("Budget plan endpoint error: %r", exc)
        raise HTTPException(
            status_code=503,
            detail=f"AI service unavailable: {type(exc).__name__}: {exc or 'connection error'}",
        ) from exc


# ── Fallback Budget Plan ─────────────────────────────────────────────


# ── Vendor Picks Endpoint ───────────────────────────────────────────


@router.post("/vendor-picks", response_model=VendorPickResponse)
async def get_vendor_picks(request: VendorPickRequest):
    """
    AI-powered vendor category matching.
    Returns one recommended vendorCategory per requested category.
    Node.js backend does the actual DB lookup.
    """
    try:
        # Fetch vendors for context
        try:
            vendors = await db_client.get_all_vendors()
            vendors_context = json.dumps(vendors, indent=2) if vendors else ""
        except Exception as e:
            logger.error("Failed to fetch vendors context for picks: %r", e)
            vendors_context = ""

        categories_with_pct = [
            {"name": c.name, "percentage": c.percentage}
            for c in request.categoriesWithPercentages
        ]

        messages = build_vendor_pick_prompt(
            total_budget=request.totalBudget,
            categories_with_pct=categories_with_pct,
            preferences=request.preferences,
            vendors_context=vendors_context,
            event_type=request.eventType,
        )

        result = await ollama_service.generate_json(messages)

        raw_picks = result.get("picks", [])
        picks = []
        for p in raw_picks:
            picks.append(
                VendorPickItem(
                    category=p.get("category", ""),
                    vendorCategory=p.get("vendorCategory", ""),
                    reasoning=p.get("reasoning", ""),
                    keyFeatures=p.get("keyFeatures", []),
                )
            )

        return VendorPickResponse(data=VendorPickResponseData(picks=picks))

    except (ValueError, httpx.TimeoutException) as exc:
        logger.warning("Vendor picks failed (%s), returning category defaults", exc)
        # Fallback: echo back input categories with best-guess DB enums
        CATEGORY_ENUM_MAP = {
            "venue": "venue",
            "catering": "caterer",
            "photography": "photographer",
            "makeup/mehndi": "makeup_artist",
            "decoration": "decorator",
        }
        fallback_picks = []
        for cat in request.categoriesWithPercentages:
            enum = CATEGORY_ENUM_MAP.get(cat.name.lower(), "other")
            fallback_picks.append(
                VendorPickItem(
                    category=cat.name,
                    vendorCategory=enum,
                    reasoning="AI unavailable — using default category mapping.",
                    keyFeatures=[],
                )
            )
        return VendorPickResponse(data=VendorPickResponseData(picks=fallback_picks))

    except Exception as exc:
        logger.error("Vendor picks endpoint error: %r", exc)
        raise HTTPException(
            status_code=503,
            detail=f"AI service unavailable: {type(exc).__name__}: {exc or 'connection error'}",
        ) from exc


def _build_fallback_budget(
    total_budget: float,
    event_type: str,
) -> BudgetPlanResponse:
    """Return a sensible static budget plan when AI fails to produce valid JSON."""

    # Default Pakistani wedding budget breakdown
    breakdown = {
        "full_wedding": [
            ("venue", 25),
            ("catering", 25),
            ("photography", 8),
            ("videography", 7),
            ("decoration", 10),
            ("bridal_wear", 8),
            ("makeup_artist", 4),
            ("invitation_cards", 3),
            ("transport", 3),
            ("dj_music", 3),
            ("other", 4),
        ],
        "walima": [
            ("venue", 30),
            ("catering", 35),
            ("decoration", 10),
            ("photography", 10),
            ("groom_wear", 5),
            ("invitation_cards", 3),
            ("transport", 3),
            ("other", 4),
        ],
        "mehndi": [
            ("venue", 20),
            ("catering", 20),
            ("mehndi_artist", 15),
            ("decoration", 15),
            ("dj_music", 10),
            ("photography", 8),
            ("bridal_wear", 7),
            ("other", 5),
        ],
        "nikkah": [
            ("venue", 30),
            ("catering", 25),
            ("photography", 10),
            ("bridal_wear", 10),
            ("decoration", 8),
            ("invitation_cards", 5),
            ("makeup_artist", 5),
            ("transport", 3),
            ("other", 4),
        ],
    }

    items = breakdown.get(event_type, breakdown["full_wedding"])

    allocations = [
        BudgetAllocation(
            category=cat,
            percentage=float(pct),
            amount=round(total_budget * pct / 100, 2),
            explanation=f"Standard {pct}% allocation for {cat.replace('_', ' ')}",
        )
        for cat, pct in items
    ]

    return BudgetPlanResponse(
        data=BudgetPlanResponseData(
            allocations=allocations,
            summary=(
                f"Standard budget plan for a Pakistani {event_type.replace('_', ' ')} "
                f"with a total budget of PKR {total_budget:,.0f}. "
                f"This is a fallback plan — try again for AI-personalized allocations."
            ),
            tips=[
                "Book venues during off-peak season (January-March) for 20-30% discounts",
                "Negotiate package deals when hiring photographer + videographer together",
                "Consider local designers instead of big brands for bridal wear to save 40-50%",
            ],
            totalBudget=total_budget,
            eventType=event_type,
            currency="PKR",
        )
    )
