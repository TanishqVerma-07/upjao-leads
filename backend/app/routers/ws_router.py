from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.config import settings
from app.database import SessionLocal
from app.models import User
from app.ws import manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    db: Session = SessionLocal()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = int(payload.get("sub"))
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if not user:
            await websocket.close(code=1008)
            return
    except (JWTError, Exception):
        await websocket.close(code=1008)
        return
    finally:
        db.close()

    await manager.connect(user.id, user.role.value, websocket)
    try:
        while True:
            await websocket.receive_text()  # keep alive, absorb pings
    except WebSocketDisconnect:
        manager.disconnect(user.id)
