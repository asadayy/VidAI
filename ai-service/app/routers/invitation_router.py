from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from app.services.gemini_service import gemini_service

router = APIRouter()

class InvitationRequest(BaseModel):
    essentials: Dict[str, Any]
    style: Dict[str, Any]
    tone: str
    userId: str

class ImageRequest(BaseModel):
    essentials: Dict[str, Any]
    style: Dict[str, Any]
    tone: str
    generatedContent: Dict[str, Any]
    userId: str

@router.post("/generate")
async def generate_invitation(request: InvitationRequest):
    try:
        content = await gemini_service.generate_invitation_content(
            request.essentials, 
            request.style, 
            request.tone
        )
        return {
            "success": True,
            "data": {
                "generatedContent": content
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-image")
async def generate_invitation_image(request: ImageRequest):
    try:
        result = await gemini_service.generate_invitation_image(
            request.essentials,
            request.style,
            request.tone,
            request.generatedContent
        )
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
