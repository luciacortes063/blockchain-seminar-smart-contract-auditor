"""
pipeline/graph.py — LangGraph audit pipeline

Graph:
  START → validate ──(ok)──► llm_analysis → slither_analysis → merge_reports → END
                   └─(bad)─► abort → END
"""

import logging
from datetime import datetime, timezone
from typing import Literal

from langgraph.graph import StateGraph, START, END

from pipeline.state import AuditState
from pipeline.nodes.llm_node import run_llm_node
from pipeline.nodes.slither_node import run_slither_node
from pipeline.nodes.merge_node import run_merge_node

logger = logging.getLogger(__name__)


# ── Validate node ──────────────────────────────────────────────────────────────

def validate_node(state: AuditState) -> AuditState:
    code = state.get("contract_code", "").strip()
    errors = list(state.get("errors", []))

    if not code:
        errors.append("Contract code is empty.")
    elif len(code) < 20:
        errors.append("Contract code is too short to be valid Solidity.")
    elif "pragma solidity" not in code and "contract " not in code and "interface " not in code:
        errors.append(
            "Does not look like a valid Solidity file "
            "(missing 'pragma solidity' / 'contract' / 'interface')."
        )
    return {**state, "errors": errors}


def should_abort(state: AuditState) -> Literal["run", "abort"]:
    return "abort" if not state.get("contract_code", "").strip() else "run"


def abort_node(state: AuditState) -> AuditState:
    return {
        **state,
        "final_report": {
            "meta": {
                "contract_name": state.get("contract_name", "unknown"),
                "audit_timestamp": datetime.now(timezone.utc).isoformat(),
                "pipeline_errors": state.get("errors", []),
            },
            "overall_risk": "INFO",
            "summary": "Audit aborted: invalid input.",
            "statistics": {"total": 0, "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0},
            "vulnerabilities": [],
        },
    }


# ── Build and compile graph ────────────────────────────────────────────────────

def _build_graph() -> StateGraph:
    g = StateGraph(AuditState)

    g.add_node("validate", validate_node)
    g.add_node("abort", abort_node)
    g.add_node("llm_analysis", run_llm_node)
    g.add_node("slither_analysis", run_slither_node)
    g.add_node("merge_reports", run_merge_node)

    g.add_edge(START, "validate")
    g.add_conditional_edges("validate", should_abort, {"run": "llm_analysis", "abort": "abort"})
    g.add_edge("abort", END)
    g.add_edge("llm_analysis", "slither_analysis")
    g.add_edge("slither_analysis", "merge_reports")
    g.add_edge("merge_reports", END)

    return g.compile()


# Compiled once at import time (reused across requests)
_pipeline = _build_graph()


# ── Public entry point ─────────────────────────────────────────────────────────

async def run_audit(contract_code: str, contract_name: str) -> dict:
    """Called by the API layer. Returns the final_report dict."""
    logger.info("═" * 60)
    logger.info("Audit started: %s", contract_name)

    initial: AuditState = {
        "contract_code": contract_code,
        "contract_name": contract_name,
        "llm_report": None,
        "slither_report": None,
        "final_report": None,
        "errors": [],
        "started_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await _pipeline.ainvoke(initial)

    logger.info("Audit finished: %s", contract_name)
    logger.info("═" * 60)

    return result.get("final_report", {})
