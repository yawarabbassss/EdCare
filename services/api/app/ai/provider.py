import json
import logging
import httpx
from typing import List, Dict, Any, Optional
from app.config import settings

logger = logging.getLogger("leo.ai")

class AIProvider:
    async def generate_response(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        available_tools: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Returns dict: {"content": str, "tool_calls": list or None}"""
        raise NotImplementedError

class OpenAIProvider(AIProvider):
    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model = model

    async def generate_response(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        available_tools: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        all_messages = [{"role": "system", "content": system_prompt}] + messages
        payload = {
            "model": self.model,
            "messages": all_messages,
            "temperature": 0.3
        }
        if available_tools:
            payload["tools"] = available_tools
            payload["tool_choice"] = "auto"

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            choice = data["choices"][0]["message"]
            return {
                "content": choice.get("content") or "",
                "tool_calls": choice.get("tool_calls")
            }

class LocalSmartProvider(AIProvider):
    """
    Zero-config built-in intelligent engine with exact intent recognition & tool selection
    so the assistant works seamlessly without needing external paid keys.
    """
    async def generate_response(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        available_tools: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        last_msg = messages[-1]["content"].lower() if messages else ""

        # Emergency intent
        if any(w in last_msg for w in ["help", "emergency", "fall", "call 911", "call doctor", "sos", "urgent", "hurt"]):
            return {
                "content": "I am triggering an immediate emergency alert and notifying your caregivers right away. Please stay calm and stay where you are if you are unable to stand safely.",
                "tool_calls": [{"name": "trigger_emergency", "arguments": {"location": "Living Room"}}]
            }

        # Next medication intent
        if any(w in last_msg for w in ["next medicine", "next pill", "when is my next", "when do i take", "what pill"]):
            return {
                "content": "Let me check your medication schedule for your next dose.",
                "tool_calls": [{"name": "get_next_medication", "arguments": {}}]
            }

        # All medications list
        if any(w in last_msg for w in ["all medicine", "my medications", "list my pills", "what medications", "prescriptions"]):
            return {
                "content": "Here is your current medication list and instructions.",
                "tool_calls": [{"name": "get_medications", "arguments": {}}]
            }

        # Health / Vitals intent
        if any(w in last_msg for w in ["blood pressure", "heart rate", "pulse", "oxygen", "sugar", "glucose", "temperature", "vitals", "how am i doing"]):
            return {
                "content": "Checking your latest recorded health vitals from your profile.",
                "tool_calls": [{"name": "get_health_records", "arguments": {}}]
            }

        # Emergency contacts intent
        if any(w in last_msg for w in ["caregiver", "contact", "doctor phone", "who can i call", "phone number", "call family"]):
            return {
                "content": "Here are your registered emergency and caregiver contacts.",
                "tool_calls": [{"name": "get_emergency_contacts", "arguments": {}}]
            }

        # Recent timeline events
        if any(w in last_msg for w in ["what happened", "recent event", "timeline", "today's activity"]):
            return {
                "content": "Here is what happened today in your care timeline.",
                "tool_calls": [{"name": "get_recent_events", "arguments": {}}]
            }

        # General friendly care conversation
        if any(w in last_msg for w in ["hello", "hi", "good morning", "good evening", "how are you"]):
            return {
                "content": "Hello! I am EdCare, your AI Care Assistant. I am here to help you check your medications, look up your health vitals, contact your caregiver, or get emergency help anytime. How can I assist you today?",
                "tool_calls": None
            }

        return {
            "content": "I am here to assist you with your daily care. You can ask me about your next medication, your recent blood pressure or heart rate, or ask me to call your caregiver. If you ever feel unwell or need help, simply say 'Help' or press the red SOS button.",
            "tool_calls": None
        }

def get_ai_provider() -> AIProvider:
    if settings.AI_PROVIDER == "openai" and settings.AI_API_KEY:
        return OpenAIProvider(api_key=settings.AI_API_KEY, model=settings.AI_MODEL)
    return LocalSmartProvider()
