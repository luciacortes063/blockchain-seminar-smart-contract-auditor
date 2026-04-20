"""
pipeline/nodes/merge_node.py

Merges + deduplicates LLM and Slither findings into the final JSON report.

Deduplication strategy:
  - If LLM and Slither detect the same SWC ID → merge (source: "BOTH")
  - LLM provides richer descriptions; Slither provides precise line numbers
  - Remaining unmatched findings from each source are appended as-is
  - Final list is sorted by severity (CRITICAL → INFO)
"""

import json
import logging
from datetime import datetime, timezone

from pipeline.state import AuditState

logger = logging.getLogger(__name__)

SEVERITY_RANK = {"CRITICAL": 5, "HIGH": 4, "MEDIUM": 3, "LOW": 2, "INFO": 1}


def _overall_risk(vulns: list[dict]) -> str:
    if not vulns:
        return "INFO"
    return max((v.get("severity", "INFO") for v in vulns), key=lambda s: SEVERITY_RANK.get(s, 1))


def _stats(vulns: list[dict]) -> dict:
    out = {"total": len(vulns), "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for v in vulns:
        key = v.get("severity", "INFO").lower()
        out[key] = out.get(key, 0) + 1
    return out


def _are_same(a: dict, b: dict) -> bool:
    """Two findings are duplicates if they share the same SWC ID or >40% category overlap."""
    swc_a, swc_b = a.get("swc_id"), b.get("swc_id")
    if swc_a and swc_b and swc_a == swc_b:
        return True
    cat_a = set(a.get("category", "").lower().split())
    cat_b = set(b.get("category", "").lower().split())
    if cat_a and cat_b:
        overlap = len(cat_a & cat_b) / max(len(cat_a), len(cat_b))
        return overlap > 0.4
    return False


def _merge(llm_v: dict, sli_v: dict) -> dict:
    """LLM finding enriched with Slither's precise line numbers and higher severity."""
    merged = {**llm_v, "source": "BOTH", "slither_check": sli_v.get("slither_check")}
    if sli_v.get("line_numbers"):
        merged["line_numbers"] = sli_v["line_numbers"]
    # Take the more severe rating
    if SEVERITY_RANK.get(sli_v.get("severity", "INFO"), 1) > SEVERITY_RANK.get(llm_v.get("severity", "INFO"), 1):
        merged["severity"] = sli_v["severity"]
    return merged


def run_merge_node(state: AuditState) -> AuditState:
    logger.info("▶ Merge node")
    errors = list(state.get("errors", []))

    llm_analysis = (state.get("llm_report") or {}).get("llm_analysis", {})
    llm_vulns = llm_analysis.get("vulnerabilities", [])
    slither_vulns = (state.get("slither_report") or {}).get("vulnerabilities", [])

    merged: list[dict] = []
    slither_used: set[int] = set()

    for llm_v in llm_vulns:
        llm_v = {**llm_v, "source": "LLM"}
        matched = False
        for i, sli_v in enumerate(slither_vulns):
            if i not in slither_used and _are_same(llm_v, sli_v):
                merged.append(_merge(llm_v, sli_v))
                slither_used.add(i)
                matched = True
                break
        if not matched:
            merged.append(llm_v)

    for i, sli_v in enumerate(slither_vulns):
        if i not in slither_used:
            merged.append({**sli_v, "source": "SLITHER"})

    merged.sort(key=lambda v: SEVERITY_RANK.get(v.get("severity", "INFO"), 1), reverse=True)

    for i, v in enumerate(merged):
        v["id"] = f"VULN-{i + 1:03d}"

    stats = _stats(merged)
    logger.info(
        "  ✓ Merge done — %d findings (CRIT:%d HIGH:%d MED:%d LOW:%d INFO:%d)",
        stats["total"], stats.get("critical", 0), stats.get("high", 0),
        stats.get("medium", 0), stats.get("low", 0), stats.get("info", 0),
    )

    final_report = {
        "meta": {
            "contract_name": state["contract_name"],
            "audit_timestamp": datetime.now(timezone.utc).isoformat(),
            "started_at": state.get("started_at", ""),
            "llm_model": llm_analysis.get("model_used", LLM_MODEL if "LLM_MODEL" in dir() else "llama-3.3-70b-versatile"),
            "slither_available": (state.get("slither_report") or {}).get("success", False),
            "pipeline_errors": errors,
        },
        "overall_risk": _overall_risk(merged),
        "summary": llm_analysis.get("summary", "Audit completed."),
        "contract_info": llm_analysis.get("contract_info", {}),
        "statistics": stats,
        "vulnerabilities": merged,
        "positive_findings": llm_analysis.get("positive_findings", []),
        "gas_optimizations": llm_analysis.get("gas_optimizations", []),
        "raw": {
            "llm": state.get("llm_report"),
            "slither": (state.get("slither_report") or {}).get("raw_output"),
        },
    }

    # ── Final report ───────────────────────────────────────────────────────
    logger.info("━" * 50)
    logger.info("FINAL REPORT")
    logger.info("━" * 50)
    logger.info(json.dumps(final_report, indent=2, ensure_ascii=False))
    logger.info("━" * 50)

    return {**state, "final_report": final_report, "errors": errors}