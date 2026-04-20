"""
pipeline/state.py — Shared LangGraph state
"""

from typing import TypedDict, Optional


class AuditState(TypedDict):
    # Input
    contract_code: str
    contract_name: str

    # Intermediate outputs
    llm_report: Optional[dict]
    slither_report: Optional[dict]

    # Final
    final_report: Optional[dict]

    # Metadata
    errors: list[str]
    started_at: str
