"""
pipeline/nodes/slither_node.py

Runs Slither static analyzer on the contract and normalises its output
to our internal vulnerability schema.

Key improvement over the original:
  - Automatically detects the Solidity pragma from the contract source.
  - Installs the required solc version via `solc-select` if not present.
  - Switches to that version before invoking Slither, so contracts with
    any pragma (^0.6.x, ^0.7.x, ^0.8.x …) work correctly instead of
    silently failing when the active solc doesn't match.

Requirements (handled by Dockerfile on Render):
  pip install slither-analyzer solc-select
  solc-select install 0.8.20 && solc-select use 0.8.20
"""

import json
import logging
import re
import subprocess
import tempfile
from pathlib import Path

from pipeline.state import AuditState

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Severity / SWC maps
# ---------------------------------------------------------------------------

SLITHER_SEVERITY_MAP = {
    "High":          "HIGH",
    "Medium":        "MEDIUM",
    "Low":           "LOW",
    "Informational": "INFO",
    "Optimization":  "INFO",
}

SLITHER_CHECK_TO_SWC = {
    "reentrancy-eth":         "SWC-107",
    "reentrancy-no-eth":      "SWC-107",
    "reentrancy-benign":      "SWC-107",
    "integer-overflow":       "SWC-101",
    "tx-origin":              "SWC-115",
    "timestamp":              "SWC-116",
    "weak-prng":              "SWC-120",
    "controlled-delegatecall":"SWC-112",
    "suicidal":               "SWC-106",
    "uninitialized-local":    "SWC-109",
    "uninitialized-storage":  "SWC-109",
    "unchecked-lowlevel":     "SWC-104",
    "unchecked-send":         "SWC-104",
}

# Fallback version used when no pragma is found or parsing fails
FALLBACK_SOLC = "0.8.20"

# ---------------------------------------------------------------------------
# Solc version helpers
# ---------------------------------------------------------------------------

# Matches pragmas like: ^0.8.9  >=0.7.0  =0.6.12  0.8.20  ~0.8.0
_PRAGMA_RE = re.compile(
    r"pragma\s+solidity\s*[^;]*?(\d+\.\d+\.\d+)",
    re.IGNORECASE,
)

# Matches "X.Y.Z" version strings in `solc-select install` output
_VERSION_LINE_RE = re.compile(r"^\d+\.\d+\.\d+$")


def _detect_pragma_version(source: str) -> str | None:
    """Return the first concrete version number found in the pragma, or None."""
    m = _PRAGMA_RE.search(source)
    return m.group(1) if m else None


def _list_installed_versions() -> set[str]:
    """Return the set of solc versions already installed via solc-select."""
    try:
        result = subprocess.run(
            ["solc-select", "versions"],
            capture_output=True, text=True, timeout=15,
        )
        versions = set()
        for line in result.stdout.splitlines():
            # Lines look like "0.8.20 (current, set by …)" or just "0.8.20"
            parts = line.strip().split()
            if parts and re.match(r"^\d+\.\d+\.\d+$", parts[0]):
                versions.add(parts[0])
        return versions
    except Exception as exc:
        logger.warning("  ⚠ Could not list installed solc versions: %s", exc)
        return set()


def _install_solc(version: str) -> bool:
    """Install a solc version via solc-select. Returns True on success."""
    logger.info("  Installing solc %s via solc-select…", version)
    try:
        result = subprocess.run(
            ["solc-select", "install", version],
            capture_output=True, text=True, timeout=120,
        )
        if result.returncode == 0:
            logger.info("  ✓ solc %s installed", version)
            return True
        logger.warning(
            "  ⚠ solc-select install %s failed (code %d): %s",
            version, result.returncode, result.stderr[:200],
        )
        return False
    except Exception as exc:
        logger.warning("  ⚠ Could not install solc %s: %s", version, exc)
        return False


def _use_solc(version: str) -> bool:
    """Switch the active solc version. Returns True on success."""
    try:
        result = subprocess.run(
            ["solc-select", "use", version],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode == 0:
            logger.info("  ✓ Active solc set to %s", version)
            return True
        logger.warning(
            "  ⚠ solc-select use %s failed: %s",
            version, result.stderr[:200],
        )
        return False
    except Exception as exc:
        logger.warning("  ⚠ Could not switch solc version: %s", exc)
        return False


def _ensure_solc(version: str) -> str:
    """
    Make sure `version` is installed and active.
    Falls back to FALLBACK_SOLC if anything goes wrong.
    Returns the version that was actually activated.
    """
    installed = _list_installed_versions()
    logger.info(
        "  Installed solc versions: %s",
        ", ".join(sorted(installed)) or "(none detected)",
    )

    if version not in installed:
        ok = _install_solc(version)
        if not ok:
            logger.warning(
                "  ⚠ Could not install solc %s — trying fallback %s",
                version, FALLBACK_SOLC,
            )
            if FALLBACK_SOLC not in installed:
                _install_solc(FALLBACK_SOLC)
            _use_solc(FALLBACK_SOLC)
            return FALLBACK_SOLC

    _use_solc(version)
    return version


# ---------------------------------------------------------------------------
# Finding normaliser
# ---------------------------------------------------------------------------

def _normalise(idx: int, detector: dict) -> dict:
    check_id         = detector.get("check", "unknown")
    impact           = detector.get("impact", "Informational")
    confidence       = detector.get("confidence", "Medium")
    description      = detector.get("description", "").strip()

    elements         = detector.get("elements", [])
    affected_function = "contract-level"
    lines            = []

    for el in elements:
        if el.get("type") == "function":
            affected_function = el.get("name", affected_function)
        lines.extend(el.get("source_mapping", {}).get("lines", []))

    return {
        "id":                   f"SLI-{idx:03d}",
        "title":                check_id.replace("-", " ").title(),
        "severity":             SLITHER_SEVERITY_MAP.get(impact, "INFO"),
        "category":             check_id.replace("-", " ").title(),
        "swc_id":               SLITHER_CHECK_TO_SWC.get(check_id),
        "affected_function":    affected_function,
        "affected_code_snippet":"",
        "line_numbers":         sorted(set(lines)),
        "description":          description,
        "exploitation_scenario":None,
        "recommendation":       None,
        "confidence":           confidence.upper(),
        "source":               "SLITHER",
        "slither_check":        check_id,
    }


# ---------------------------------------------------------------------------
# Main node
# ---------------------------------------------------------------------------

def run_slither_node(state: AuditState) -> AuditState:
    logger.info("▶ Slither node — %s", state["contract_name"])
    errors = list(state.get("errors", []))

    with tempfile.TemporaryDirectory(prefix="slither_") as tmp:
        sol_path  = Path(tmp) / state["contract_name"]
        json_path = Path(tmp) / "output.json"
        sol_path.write_text(state["contract_code"], encoding="utf-8")

        # ── 1. Detect the pragma version and ensure the right solc is active ──
        detected = _detect_pragma_version(state["contract_code"])
        if detected:
            logger.info("  Detected pragma version: %s", detected)
            active_version = _ensure_solc(detected)
        else:
            logger.info(
                "  No pragma version detected — using fallback %s", FALLBACK_SOLC
            )
            active_version = _ensure_solc(FALLBACK_SOLC)

        logger.info("  Running Slither with solc %s…", active_version)

        # ── 2. Run Slither ─────────────────────────────────────────────────
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

            # Slither returns 0 = no findings, 1 = findings found — both OK
            if result.returncode not in (0, 1):
                msg = (
                    f"Slither exited with code {result.returncode}. "
                    f"stderr: {result.stderr[:400]}"
                )
                logger.warning("  ⚠ %s", msg)
                errors.append(msg)

            if not json_path.exists():
                raise FileNotFoundError("Slither produced no JSON output")

            raw       = json.loads(json_path.read_text(encoding="utf-8"))
            detectors = raw.get("results", {}).get("detectors", [])
            logger.info("  ✓ Slither done — %d findings", len(detectors))

            normalised = [_normalise(i + 1, d) for i, d in enumerate(detectors)]

            # ── Full Slither output (debug) ────────────────────────────────
            logger.info("━" * 50)
            logger.info("SLITHER RAW OUTPUT")
            logger.info("━" * 50)
            logger.info(
                json.dumps({"findings": normalised, "raw": raw}, indent=2, ensure_ascii=False)
            )
            logger.info("━" * 50)

            return {
                **state,
                "slither_report": {
                    "success":         True,
                    "vulnerabilities": normalised,
                    "raw_output":      raw,
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
            "slither_report": {
                "success":         False,
                "vulnerabilities": [],
                "error":           msg,
            },
            "errors": errors,
        }