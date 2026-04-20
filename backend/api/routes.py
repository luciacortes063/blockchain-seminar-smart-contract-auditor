"""
api/routes.py — HTTP endpoints
"""

import logging
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from pipeline.graph import run_audit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["audit"])

MAX_FILE_SIZE = 500_000  # 500 KB


@router.post("/audit", summary="Audit a Solidity smart contract")
async def audit_contract(file: UploadFile = File(...)):
    filename = file.filename or "contract.sol"

    if not filename.endswith(".sol"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only .sol (Solidity) files are accepted.",
        )

    content_bytes = await file.read()

    if not content_bytes:
        raise HTTPException(status_code=422, detail="File is empty.")

    if len(content_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 500 KB limit.")

    try:
        contract_code = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=422, detail="File must be UTF-8 encoded.")

    logger.info("Received: %s (%d bytes)", filename, len(content_bytes))

    try:
        report = await run_audit(contract_code=contract_code, contract_name=filename)
    except Exception as exc:
        logger.exception("Pipeline error")
        raise HTTPException(status_code=500, detail=f"Pipeline error: {exc}")

    return JSONResponse(content=report)


@router.get("/health", summary="Health check")
async def health():
    return {"status": "ok"}
