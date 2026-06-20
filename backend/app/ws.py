import asyncio
import json
from typing import Dict, Optional

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self._connections: Dict[int, dict] = {}  # user_id → {ws, role}
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop

    async def connect(self, user_id: int, role: str, ws: WebSocket):
        await ws.accept()
        self._connections[user_id] = {"ws": ws, "role": role}

    def disconnect(self, user_id: int):
        self._connections.pop(user_id, None)

    async def broadcast(self, event: dict, exclude_roles: set = None, only_roles: set = None):
        dead = []
        for uid, conn in list(self._connections.items()):
            role = conn["role"]
            if exclude_roles and role in exclude_roles:
                continue
            if only_roles and role not in only_roles:
                continue
            try:
                await conn["ws"].send_text(json.dumps(event))
            except Exception:
                dead.append(uid)
        for uid in dead:
            self.disconnect(uid)

    async def send_to_user(self, user_id: int, event: dict):
        conn = self._connections.get(user_id)
        if conn:
            try:
                await conn["ws"].send_text(json.dumps(event))
            except Exception:
                self.disconnect(user_id)

    def schedule(self, event: dict, exclude_roles: set = None, only_roles: set = None):
        """Broadcast from a sync route handler."""
        if self._loop and self._loop.is_running():
            asyncio.run_coroutine_threadsafe(
                self.broadcast(event, exclude_roles=exclude_roles, only_roles=only_roles),
                self._loop,
            )

    def schedule_to_user(self, user_id: int, event: dict):
        """Send to a single user from a sync route handler."""
        if self._loop and self._loop.is_running():
            asyncio.run_coroutine_threadsafe(
                self.send_to_user(user_id, event),
                self._loop,
            )


manager = ConnectionManager()
