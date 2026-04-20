"""
pipeline/nodes/slither_node.py

Runs Slither static analyzer on the contract and normalises its output
to our internal vulnerability schema.

Requirements (handled by Dockerfile on Render):
  pip install slither-analyzer solc-select
  solc-select install 0.8.20 && solc-select use 0.8.20
"""

import json
import logging
import subprocess
import tempfile
from pathlib import Path

from pipeline.state import AuditState

logger = logging.getLogger(__name__)

SLITHER_SEVERITY_MAP = {
    "High": "HIGH",
    "Medium": "MEDIUM",
    "Low": "LOW",
    "Informational": "INFO",
    "Optimization": "INFO",
}

SLITHER_CHECK_TO_SWC = {
    "reentrancy-eth": "SWC-107",
    "reentrancy-no-eth": "SWC-107",
    "reentrancy-benign": "SWC-107",
    "integer-overflow": "SWC-101",
    "tx-origin": "SWC-115",
    "timestamp": "SWC-116",
    "weak-prng": "SWC-120",
    "controlled-delegatecall": "SWC-112",
    "suicidal": "SWC-106",
    "uninitialized-local": "SWC-109",
    "uninitialized-storage": "SWC-109",
    "unchecked-lowlevel": "SWC-104",
    "unchecked-send": "SWC-104",
}


def _normalise(idx: int, detector: dict) -> dict:
    check_id = detector.get("check", "unknown")
    impact = detector.get("impact", "Informational")
    confidence = detector.get("confidence", "Medium")
    description = detector.get("description", "").strip()

    elements = detector.get("elements", [])
    affected_function = "contract-level"
    lines = []

    for el in elements:
        if el.get("type") == "function":
            affected_function = el.get("name", affected_function)
        lines.extend(el.get("source_mapping", {}).get("lines", []))

    return {
        "id": f"SLI-{idx:03d}",
        "title": check_id.replace("-", " ").title(),
        "severity": SLITHER_SEVERITY_MAP.get(impact, "INFO"),
        "category": check_id.replace("-", " ").title(),
        "swc_id": SLITHER_CHECK_TO_SWC.get(check_id),
        "affected_function": affected_function,
        "affected_code_snippet": "",
        "line_numbers": sorted(set(lines)),
        "description": description,
        "exploitation_scenario": None,
        "recommendation": None,
        "confidence": confidence.upper(),
        "source": "SLITHER",
        "slither_check": check_id,
    }


def run_slither_node(state: AuditState) -> AuditState:
    logger.info("▶ Slither node — %s", state["contract_name"])
    errors = list(state.get("errors", []))

    with tempfile.TemporaryDirectory(prefix="slither_") as tmp:
        sol_path = Path(tmp) / state["contract_name"]
        json_path = Path(tmp) / "output.json"
        sol_path.write_text(state["contract_code"], encoding="utf-8")

        try:
            result = subprocess.run(
                [
                    "slither", str(sol_path),
                    "--json", str(json_path),
                    "--json-types", "detectors",
                    "--no-fail-pedantic",
                ],
                capture_output=True,
                text=True,
                timeout=120,
                cwd=tmp,
            )

            # Slither returns 0 = no findings, 1 = findings found — both are OK
            if result.returncode not in (0, 1):
                msg = f"Slither error (code {result.returncode}): {result.stderr[:300]}"
                logger.warning("  ⚠ %s", msg)
                errors.append(msg)

            if not json_path.exists():
                raise FileNotFoundError("Slither produced no JSON output")

            raw = json.loads(json_path.read_text(encoding="utf-8"))
            detectors = raw.get("results", {}).get("detectors", [])
            logger.info("  ✓ Slither done — %d findings", len(detectors))

            normalised = [_normalise(i + 1, d) for i, d in enumerate(detectors)]

            # ── Full Slither output ────────────────────────────────────────
            logger.info("━" * 50)
            logger.info("SLITHER RAW OUTPUT")
            logger.info("━" * 50)
            logger.info(json.dumps({"findings": normalised, "raw": raw}, indent=2, ensure_ascii=False))
            logger.info("━" * 50)

            return {
                **state,
                "slither_report": {
                    "success": True,
                    "vulnerabilities": normalised,
                    "raw_output": raw,
                },
                "errors": errors,
            }

        except FileNotFoundError as exc:
            msg = (
                "Slither not installed. Run: pip install slither-analyzer"
                if "slither" in str(exc)
                else str(exc)
            )
            logger.error("  ✗ %s", msg)
            errors.append(msg)

        except subprocess.TimeoutExpired:
            msg = "Slither timed out after 120s"
            logger.error("  ✗ %s", msg)
            errors.append(msg)

        except Exception as exc:
            msg = f"Slither node error: {exc}"
            logger.exception("  ✗ %s", msg)
            errors.append(msg)

        return {
            **state,
            "slither_report": {"success": False, "vulnerabilities": [], "error": msg},
            "errors": errors,
        }