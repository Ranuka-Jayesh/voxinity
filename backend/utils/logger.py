import logging
import os
import sys
from typing import Any


class _StructuredFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        base = super().format(record)
        event = getattr(record, "event", None)
        data = getattr(record, "data", None)
        parts: list[str] = []
        if event:
            parts.append(f"event={event}")
        if isinstance(data, dict) and data:
            for key, value in data.items():
                parts.append(f"{key}={value!r}")
        if parts:
            return f"{base} | " + " ".join(parts)
        return base


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    level_name = os.environ.get("LOG_LEVEL", "INFO").upper()
    logger.setLevel(getattr(logging, level_name, logging.INFO))
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(_StructuredFormatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s"))
    logger.addHandler(handler)
    logger.propagate = False
    return logger


def log_event(
    logger: logging.Logger,
    level: int,
    event: str,
    message: str,
    **data: Any,
) -> None:
    logger.log(level, message, extra={"event": event, "data": data})
