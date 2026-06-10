# websocket/events.py — Phase 5: All WebSocket event dispatchers
import logging
from datetime import datetime
from app.websocket.connection_manager import manager

logger = logging.getLogger(__name__)


async def push_notification(user_id: int, message: str, notif_id: int | None = None):
    await manager.send_to_user(user_id, "notification", {"id": notif_id, "message": message})


async def push_notification_to_users(user_ids: list[int], message: str):
    for uid in user_ids:
        await push_notification(uid, message)


async def push_kanban_update(task_id: int, task_title: str, old_status: str,
                              new_status: str, updated_by: str, affected_user_ids: list[int]):
    payload = {"task_id": task_id, "task_title": task_title,
               "old_status": old_status, "new_status": new_status,
               "updated_by": updated_by, "timestamp": datetime.utcnow().isoformat()}
    await manager.send_to_users(affected_user_ids, "kanban_update", payload)
    logger.info(f"WS kanban_update: task {task_id} {old_status}→{new_status}")


async def push_task_update(task_id: int, task_title: str, action: str,
                            updated_by: str, affected_user_ids: list[int], detail: str | None = None):
    payload = {"task_id": task_id, "task_title": task_title, "action": action,
               "updated_by": updated_by, "detail": detail,
               "timestamp": datetime.utcnow().isoformat()}
    await manager.send_to_users(affected_user_ids, "task_update", payload)


async def push_approval_update(approval_id: int, title: str, action: str,
                                actor_name: str, requester_id: int):
    payload = {"approval_id": approval_id, "title": title, "action": action,
               "actor": actor_name, "timestamp": datetime.utcnow().isoformat()}
    await manager.send_to_user(requester_id, "approval_update", payload)
    if action == "escalate":
        await manager.broadcast_to_role("admin", "approval_update",
            {**payload, "message": f"Approval '{title}' escalated to admin"})


async def push_activity(entity_type: str, entity_id: int, action: str,
                         actor_name: str, detail: str | None = None):
    payload = {"entity_type": entity_type, "entity_id": entity_id,
               "action": action, "actor": actor_name, "detail": detail,
               "timestamp": datetime.utcnow().isoformat()}
    await manager.broadcast_to_role("admin",   "activity", payload)
    await manager.broadcast_to_role("manager", "activity", payload)
