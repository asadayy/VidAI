"""
VidAI AI Service — API Router
Three endpoints matching the backend proxy contract:
  POST /api/v1/chat
  POST /api/v1/recommendations
  POST /api/v1/budget-plan
"""

import logging
import json

from fastapi import APIRouter, HTTPException
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
)
from app.services.ollama_service import ollama_service
from app.services.database import db_client
from app.services.prompts import (
    build_budget_prompt,
    build_chat_messages,
    build_recommendation_prompt,
)

logger = logging.getLogger("vidai.router")

router = APIRouter(prefix="/api/v1", tags=["AI"])


# ── Chat Endpoint ────────────────────────────────────────────────────


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """
    Chat with the VidAI wedding planning assistant.
    Sends conversation to Ollama and returns the assistant's reply.
    """
    try:
        # Fetch vendors from DB
        try:
            vendors = await db_client.get_all_vendors()
            vendors_context = json.dumps(vendors, indent=2) if vendors else ""
        except Exception as e:
            logger.error("Failed to fetch vendors context for chat: %r", e)
            vendors_context = ""

        # Build message history for Ollama
        history_dicts = [
            {"role": msg.role, "content": msg.content}
            for msg in request.conversationHistory
        ]
        messages = build_chat_messages(
            request.message, 
            history_dicts, 
            vendors_context=vendors_context
        )

        # Call Ollama
        ai_reply = await ollama_service.chat(messages)

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

    except httpx.TimeoutException as exc:
        logger.error("Chat endpoint timeout: %r", exc)
        raise HTTPException(
            status_code=503,
            detail="AI service timed out. Ollama may be busy — please try again.",
        ) from exc

    except Exception as exc:
        logger.error("Chat endpoint error: %r", exc)
        raise HTTPException(
            status_code=503,
            detail=f"AI service unavailable: {type(exc).__name__}: {exc or 'connection error'}",
        ) from exc


# ── Recommendations Endpoint ─────────────────────────────────────────


@router.post("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """
    Get AI-powered vendor recommendations for a Pakistani wedding.
    Returns structured JSON with recommendations, costs, and tips.
    """
    try:
        # Fetch vendors from DB
        try:
            vendors = await db_client.get_all_vendors()
            vendors_context = json.dumps(vendors, indent=2) if vendors else ""
        except Exception as e:
            logger.error("Failed to fetch vendors context for recommendations: %r", e)
            vendors_context = ""

        messages = build_recommendation_prompt(
            preferences=request.preferences,
            budget=request.budget,
            city=request.city,
            category=request.category,
            vendors_context=vendors_context
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
