from __future__ import annotations

import asyncio
import time
from collections import defaultdict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(prefix='/ws', tags=['websocket'])


class SessionBroadcaster:
    def __init__(self):
        self.connections: dict[str, set[WebSocket]] = defaultdict(set)
        self.last_emit_ts: dict[str, float] = {}

    async def connect(self, session_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections[session_id].add(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket) -> None:
        self.connections[session_id].discard(websocket)

    async def broadcast(self, session_id: str, payload: dict) -> None:
        now = time.time()
        if now - self.last_emit_ts.get(session_id, 0.0) < 1.0:
            return
        self.last_emit_ts[session_id] = now

        stale = []
        for conn in self.connections[session_id]:
            try:
                await conn.send_json(payload)
            except RuntimeError:
                stale.append(conn)
        for conn in stale:
            self.disconnect(session_id, conn)


broadcaster = SessionBroadcaster()


@router.websocket('/simulation/{session_id}')
async def simulation_progress(websocket: WebSocket, session_id: str) -> None:
    await broadcaster.connect(session_id, websocket)
    try:
        while True:
            await asyncio.sleep(1)
            await broadcaster.broadcast(session_id, {'session_id': session_id, 'status': 'connected'})
    except WebSocketDisconnect:
        broadcaster.disconnect(session_id, websocket)
