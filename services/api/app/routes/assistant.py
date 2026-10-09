from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User
from app.schemas.schemas import AIChatRequest, AIChatResponse
from app.services.auth_service import get_current_user
from app.ai.assistant_engine import process_chat_message
from app.ai.speech_service import speech_service

router = APIRouter(prefix="/assistant", tags=["AI Assistant"])

@router.post("/chat", response_model=AIChatResponse)
async def chat_with_assistant(
    payload: AIChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = await process_chat_message(
        db=db,
        user=current_user,
        message_text=payload.message,
        conversation_id=payload.conversation_id
    )
    return result

@router.post("/speech-to-text")
async def speech_to_text(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    content = await file.read()
    transcription = await speech_service.transcribe_audio(content, file.filename or "audio.wav")
    return {"text": transcription}
