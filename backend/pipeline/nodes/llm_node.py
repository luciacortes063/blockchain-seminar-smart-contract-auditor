"""
pipeline/nodes/llm_node.py

Calls Groq's free API via LangChain to get a structured vulnerability report.

Setup:
  1. Get a free API key at https://console.groq.com
  2. Set environment variable: GROQ_API_KEY=gsk_...
     - Locally: add to .env file
     - Render: add in dashboard → Environment Variables
"""

import json
import logging
import os
import re
from pathlib import Path

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

from pipeline.state import AuditState

logger = logging.getLogger(__name__)

INSTRUCTIONS_PATH = (
    Path(__file__).parent.parent.parent
    / "data"
    / "instructions"
    / "prompt.txt"
)

# Best free model on Groq for code analysis.
# Alternatives (also free): "llama3-8b-8192" (faster, less accurate)
LLM_MODEL = "llama-3.3-70b-versatile"
LLM_TEMPERATURE = 0.1
LLM_MAX_TOKENS = 4096


def _load_system_prompt() -> str:
    if not INSTRUCTIONS_PATH.exists():
        raise FileNotFoundError(f"Prompt file not found: {INSTRUCTIONS_PATH}")
    return INSTRUCTIONS_PATH.read_text(encoding="utf-8")


def _extract_json(raw: str) -> dict:
    """Robustly extract JSON from LLM response even if wrapped in markdown fences."""
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError("No JSON object found in LLM response")
    return json.loads(cleaned[start:end])


def run_llm_node(state: AuditState) -> AuditState:
    logger.info("▶ LLM node — %s", state["contract_name"])
    errors = list(state.get("errors", []))

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        msg = "GROQ_API_KEY not set. Get a free key at https://console.groq.com"
        logger.error("  ✗ %s", msg)
        errors.append(msg)
        return {**state, "llm_report": None, "errors": errors}

    try:
        system_prompt = _load_system_prompt()

        llm = ChatGroq(
            model=LLM_MODEL,
            temperature=LLM_TEMPERATURE,
            api_key=api_key,
            max_tokens=LLM_MAX_TOKENS,
        )

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(
                content=(
                    f"Audit the following Solidity smart contract "
                    f"(filename: {state['contract_name']}):\n\n"
                    f"```solidity\n{state['contract_code']}\n```"
                )
            ),
        ]

        logger.info("  Sending to Groq (%s)…", LLM_MODEL)
        response = llm.invoke(messages)
        parsed = _extract_json(response.content)

        n = len(parsed.get("llm_analysis", {}).get("vulnerabilities", []))
        logger.info("  ✓ LLM done — %d vulnerabilities found", n)

        return {**state, "llm_report": parsed}

    except json.JSONDecodeError as exc:
        msg = f"LLM returned invalid JSON: {exc}"
        logger.error("  ✗ %s", msg)
        errors.append(msg)
        return {**state, "llm_report": None, "errors": errors}

    except Exception as exc:
        msg = f"LLM node error: {exc}"
        logger.exception("  ✗ %s", msg)
        errors.append(msg)
        return {**state, "llm_report": None, "errors": errors}
