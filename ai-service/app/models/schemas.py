"""
VidAI AI Service — Pydantic Request/Response Schemas
Defines the data contracts for all AI endpoints.
"""

from typing import Optional
from pydantic import BaseModel, Field


# ── Chat ─────────────────────────────────────────────


class ChatMessage(BaseModel):
    """Single message in a conversation."""

    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """POST /api/v1/chat request body."""

    message: str = Field(..., min_length=1, description="User's message")
    conversationHistory: list[ChatMessage] = Field(
        default_factory=list,
        description="Previous messages for context",
    )
    userId: str = Field(default="", description="User ID from backend")


class ChatResponseData(BaseModel):
    """Data payload for chat response."""

    response: str = Field(..., description="AI assistant reply")
    conversationHistory: list[ChatMessage] = Field(
        default_factory=list,
        description="Updated conversation history",
    )


class ChatResponse(BaseModel):
    """POST /api/v1/chat response."""

    data: ChatResponseData


# ── Recommendations ──────────────────────────────────


class WeddingEventInfo(BaseModel):
    """Event details for availability checking."""

    eventType: str = Field(default="")
    eventDate: Optional[str] = Field(default=None)
    guestCount: int = Field(default=0)
    allocatedBudget: float = Field(default=0)
    venueType: str = Field(default="")


class UserProfile(BaseModel):
    """User profile data for smart vendor matching."""

    city: str = Field(default="")
    eventDate: Optional[str] = Field(default=None)
    guestCount: int = Field(default=0)
    totalBudget: float = Field(default=0)
    venueType: str = Field(default="")
    foodPreference: str = Field(default="")
    eventTypes: list[str] = Field(default_factory=list)
    weddingEvents: list[WeddingEventInfo] = Field(default_factory=list)


class RecommendationRequest(BaseModel):
    """POST /api/v1/recommendations request body."""

    preferences: dict = Field(
        default_factory=dict,
        description="User preferences (style, theme, etc.)",
    )
    budget: float = Field(default=0, ge=0, description="Budget in PKR")
    city: str = Field(default="", description="City name in Pakistan")
    category: str = Field(default="", description="Vendor category")
    userId: str = Field(default="", description="User ID from backend")
    userProfile: Optional[UserProfile] = Field(
        default=None, description="User profile for smart matching"
    )


class RecommendationItem(BaseModel):
    """Single vendor recommendation."""

    category: str
    suggestion: str
    estimatedCost: str
    reasoning: str
    tips: list[str] = Field(default_factory=list)


class RecommendationResponseData(BaseModel):
    """Data payload for recommendations response."""

    recommendations: list[RecommendationItem] = Field(default_factory=list)
    summary: str = Field(default="")
    city: str = Field(default="")
    budget: float = Field(default=0)


class RecommendationResponse(BaseModel):
    """POST /api/v1/recommendations response."""

    data: RecommendationResponseData


# ── Budget Plan ──────────────────────────────────────


class BudgetPlanRequest(BaseModel):
    """POST /api/v1/budget-plan request body."""

    totalBudget: float = Field(..., gt=0, description="Total budget in PKR")
    eventType: str = Field(
        default="full_wedding",
        description="Event type (wedding, engagement, mehndi, baraat, walima, nikkah, full_wedding, other)",
    )
    preferences: dict = Field(
        default_factory=dict,
        description="User preferences (priorities, style, guest count, etc.)",
    )
    userId: str = Field(default="", description="User ID from backend")


class BudgetAllocation(BaseModel):
    """Single category allocation in a budget plan."""

    category: str
    percentage: float
    amount: float
    explanation: str


class BudgetPlanResponseData(BaseModel):
    """Data payload for budget plan response — matches Budget model's aiPlan schema."""

    allocations: list[BudgetAllocation] = Field(default_factory=list)
    summary: str = Field(default="")
    tips: list[str] = Field(default_factory=list)
    totalBudget: float = Field(default=0)
    eventType: str = Field(default="")
    currency: str = Field(default="PKR")


class BudgetPlanResponse(BaseModel):
    """POST /api/v1/budget-plan response."""

    data: BudgetPlanResponseData


# ── Vendor Picks ─────────────────────────────────────────────────────


class CategoryWithPercentage(BaseModel):
    """Single category input with user-set percentage."""

    name: str = Field(..., description="Category name e.g. Venue, Catering")
    percentage: float = Field(..., gt=0, le=100, description="Budget percentage 1-100")


class VendorPickRequest(BaseModel):
    """POST /api/v1/vendor-picks request body."""

    totalBudget: float = Field(..., gt=0, description="Total budget in PKR")
    categoriesWithPercentages: list[CategoryWithPercentage] = Field(
        ..., min_length=1, description="Categories with user-set percentages"
    )
    preferences: dict = Field(
        default_factory=dict, description="User onboarding preferences"
    )
    userId: str = Field(default="", description="User ID from backend")
    eventType: str = Field(
        default="",
        description="Active event type (e.g. mehndi, baraat, walima). Empty = all events / full wedding.",
    )


class VendorPickItem(BaseModel):
    """AI recommendation for a single vendor category."""

    category: str = Field(..., description="Category name matching input")
    vendorCategory: str = Field(..., description="DB vendor category enum value")
    reasoning: str = Field(default="", description="Why this allocation fits")
    keyFeatures: list[str] = Field(default_factory=list, description="Key features to look for")


class VendorPickResponseData(BaseModel):
    """Data payload for vendor picks response."""

    picks: list[VendorPickItem] = Field(default_factory=list)


class VendorPickResponse(BaseModel):
    """POST /api/v1/vendor-picks response."""

    data: VendorPickResponseData
