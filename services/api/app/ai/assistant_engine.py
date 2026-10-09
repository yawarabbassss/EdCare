import json
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.models import AIConversation, AIMessage, User, ElderlyProfile
from app.ai.provider import get_ai_provider
from app.ai.tools import (
    tool_get_medications,
    tool_get_next_medication,
    tool_get_health_records,
    tool_get_emergency_contacts,
    tool_trigger_emergency,
    tool_get_recent_events,
)

logger = logging.getLogger("leo.assistant")

SAFETY_SYSTEM_PROMPT = """You are LEO, a compassionate, ultra-reliable AI Elderly Care Assistant.
Your primary role is to assist the elderly user with medication schedules, looking up their recorded health vitals, contacting caregivers, and triggering immediate emergency alerts when needed.

CRITICAL SAFETY & MEDICAL RULES:
1. You must NEVER diagnose medical conditions or give medical treatment advice.
2. You must NEVER invent or hallucinate medication schedules or vital readings. Only present data retrieved from tools.
3. If the user mentions chest pain, severe shortness of breath, falling, feeling dizzy, or asks for emergency help, IMMEDIATELY call the tool 'trigger_emergency' and advise them to remain calm.
4. Keep all responses concise, clear, and reassuring. Speak in large, friendly, easy-to-understand sentences.
5. Always remind the user that you are an assistant and they should contact their doctor or emergency services for medical emergencies.
"""

async def process_chat_message(
    db: Session,
    user: User,
    message_text: str,
    conversation_id: Optional[str] = None
) -> Dict[str, Any]:
    # Resolve Elderly Profile for context
    elderly_profile = None
    if user.role == "ELDERLY_USER":
        elderly_profile = db.query(ElderlyProfile).filter(ElderlyProfile.user_id == user.id).first()
    else:
        # If caregiver chatting on behalf, pick their primary elderly patient
        from app.models.models import CaregiverRelationship
        rel = db.query(CaregiverRelationship).filter(CaregiverRelationship.caregiver_id == user.id).first()
        if rel:
            elderly_profile = db.query(ElderlyProfile).filter(ElderlyProfile.user_id == rel.elderly_id).first()

    elderly_id = elderly_profile.id if elderly_profile else ""

    # Get or create conversation
    if conversation_id:
        conversation = db.query(AIConversation).filter(AIConversation.id == conversation_id).first()
    else:
        conversation = None

    if not conversation:
        conversation = AIConversation(
            user_id=user.id,
            title=message_text[:30] + ("..." if len(message_text) > 30 else "")
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # Save user message
    user_msg_record = AIMessage(
        conversation_id=conversation.id,
        sender="user",
        content=message_text
    )
    db.add(user_msg_record)
    db.commit()

    # Load history
    history_records = db.query(AIMessage).filter(
        AIMessage.conversation_id == conversation.id
    ).order_by(AIMessage.created_at.asc()).all()

    chat_messages = [{"role": m.sender if m.sender != "tool" else "assistant", "content": m.content} for m in history_records[-6:]]

    provider = get_ai_provider()
    ai_resp = await provider.generate_response(
        system_prompt=SAFETY_SYSTEM_PROMPT,
        messages=chat_messages
    )

    content_text = ai_resp.get("content", "")
    tool_calls = ai_resp.get("tool_calls")
    executed_tool_data = []

    # Safe Backend-Controlled Tool Execution
    if tool_calls and elderly_id:
        for tool in tool_calls:
            tool_name = tool.get("name")
            args = tool.get("arguments", {})
            if isinstance(args, str):
                try:
                    args = json.loads(args)
                except Exception:
                    args = {}

            tool_result = {}
            if tool_name == "get_medications":
                tool_result = tool_get_medications(db, elderly_id)
                med_list = tool_result.get("medications", [])
                if med_list:
                    med_str = ", ".join([f"{m['name']} ({m['dosage']})" for m in med_list])
                    content_text = f"Here are your active medications: {med_str}."
                else:
                    content_text = "You currently have no active medications in your schedule."

            elif tool_name == "get_next_medication":
                tool_result = tool_get_next_medication(db, elderly_id)
                if tool_result.get("status") == "DUE_NOW":
                    content_text = f"You have a dose of {tool_result['medication']} ({tool_result['dosage']}) that is DUE NOW at {tool_result['scheduled_for']}! {tool_result.get('instructions', '')}"
                elif tool_result.get("status") == "UPCOMING":
                    content_text = f"Your next scheduled medication is {tool_result['medication']} ({tool_result['dosage']}) at {tool_result['scheduled_for']}."
                else:
                    content_text = "You have no more medications scheduled for today."

            elif tool_name == "get_health_records":
                tool_result = tool_get_health_records(db, elderly_id)
                vitals = tool_result.get("vitals", {})
                if vitals:
                    items = [f"{k.replace('_', ' ').title()}: {v['value']} {v['unit']}" for k, v in vitals.items()]
                    content_text = f"Your latest health vitals are: {'; '.join(items)}."
                else:
                    content_text = "No recent health vitals have been logged yet."

            elif tool_name == "get_emergency_contacts":
                tool_result = tool_get_emergency_contacts(db, elderly_id)
                contacts = tool_result.get("contacts", [])
                if contacts:
                    c_str = ", ".join([f"{c['name']} ({c['relationship']}): {c['phone']}" for c in contacts])
                    content_text = f"Here are your emergency contacts: {c_str}."
                else:
                    content_text = "You do not have any emergency contacts registered yet."

            elif tool_name == "trigger_emergency":
                location = args.get("location", "Home")
                tool_result = await tool_trigger_emergency(db, elderly_id, location)
                content_text = f"🚨 EMERGENCY ALERT DISPATCHED! I have notified your caregivers immediately for {location}. Help is on the way. Please stay calm."

            elif tool_name == "get_recent_events":
                tool_result = tool_get_recent_events(db, elderly_id)
                evts = tool_result.get("events", [])
                if evts:
                    e_str = ", ".join([f"{e['time']} - {e['description']}" for e in evts])
                    content_text = f"Recent activity: {e_str}."
                else:
                    content_text = "No recent events recorded today."

            executed_tool_data.append({"tool": tool_name, "result": tool_result})

    # Save assistant message
    asst_msg_record = AIMessage(
        conversation_id=conversation.id,
        sender="assistant",
        content=content_text,
        tool_calls_json=json.dumps(tool_calls) if tool_calls else None,
        tool_results_json=json.dumps(executed_tool_data) if executed_tool_data else None
    )
    db.add(asst_msg_record)
    db.commit()

    return {
        "conversation_id": conversation.id,
        "response": content_text,
        "tool_calls": executed_tool_data,
        "disclaimer": "This system is for assistance only and is not a substitute for professional medical care."
    }
