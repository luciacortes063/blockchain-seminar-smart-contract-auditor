"""
main.py — FastAPI entry point
Run locally:  uvicorn main:app --reload --port 8000
On Render:    automatically via Dockerfile CMD
"""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Smart Contract Audit Backend starting…")
    yield
    logger.info("Backend shutting down.")


app = FastAPI(
    title="Smart Contract Audit API",
    description="LLM (Groq) + Slither security auditing pipeline for Solidity contracts.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # TODO tight to frontend URL in production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
