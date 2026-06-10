# websocket/connection_manager.py — Phase 5
# Manages all active WebSocket connections per user.
import json, logging, asyncio
from datetime import datetime
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self._connections: dict[int, list[WebSocket]] = {}
        self._user_roles:  dict[int, str]             = {}

    async def connect(self, websocket: WebSocket, user_id: int, role: str = "employee"):
        await websocket.accept()
        if user_id not in self._connections:
            self._connections[user_id] = []
        self._connections[user_id].append(websocket)
        self._user_roles[user_id] = role
        logger.info(f"WS connected: user={user_id} role={role} | total={self.active_connection_count()}")
        await self._send_raw(websocket, {"event": "connected",
            "data": {"message": "WebSocket connected", "user_id": user_id},
            "timestamp": datetime.utcnow().isoformat()})

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self._connections:
            try: self._connections[user_id].remove(websocket)
            except ValueError: pass
            if not self._connections[user_id]:
                del self._connections[user_id]
                self._user_roles.pop(user_id, None)
        logger.info(f"WS disconnected: user={user_id} | total={self.active_connection_count()}")

    async def send_to_user(self, user_id: int, event: str, data: dict) -> int:
        sockets = self._connections.get(user_id, [])
        message = self._build(event, data)
        sent, dead = 0, []
        for ws in sockets:
            try: await ws.send_text(message); sent += 1
            except Exception: dead.append(ws)
        for ws in dead:
            try: self._connections[user_id].remove(ws)
            except ValueError: pass
        return sent

    async def send_to_users(self, user_ids: list[int], event: str, data: dict):
        await asyncio.gather(*[self.send_to_user(uid, event, data) for uid in user_ids],
                             return_exceptions=True)

    async def broadcast_to_role(self, role: str, event: str, data: dict):
        targets = [uid for uid, r in self._user_roles.items() if r == role]
        await self.send_to_users(targets, event, data)

    async def broadcast(self, event: str, data: dict):
        await self.send_to_users(list(self._connections.keys()), event, data)

    def active_connection_count(self) -> int:
        return sum(len(s) for s in self._connections.values())

    def connected_user_ids(self) -> list[int]:
        return list(self._connections.keys())

    def is_user_online(self, user_id: int) -> bool:
        return bool(self._connections.get(user_id))

    @staticmethod
    def _build(event: str, data: dict) -> str:
        return json.dumps({"event": event, "data": data,
                           "timestamp": datetime.utcnow().isoformat()})

    @staticmethod
    async def _send_raw(ws: WebSocket, payload: dict):
        await ws.send_text(json.dumps(payload))


manager = ConnectionManager()
