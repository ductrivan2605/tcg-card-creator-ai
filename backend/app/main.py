from fastapi import FastAPI

from app.api.routes.pipeline import router as pipeline_router
from app.api.websocket.progress import router as websocket_router

app = FastAPI(title='TCG Card Creator AI')
app.include_router(pipeline_router)
app.include_router(websocket_router)


@app.get('/health')
async def health() -> dict[str, str]:
    return {'status': 'ok'}
