"""Modelo SQLAlchemy para usuarios."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.ai_event import AIEvent
    from app.models.git_event import GitEvent


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="developer")
    api_key_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    anonymize: Mapped[bool] = mapped_column(Boolean, default=False)
    cost_alert_eur_day: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relaciones bidireccionales
    ai_events: Mapped[list["AIEvent"]] = relationship(  # noqa: F821
        "AIEvent", back_populates="user", cascade="all, delete-orphan"
    )
    git_events: Mapped[list["GitEvent"]] = relationship(  # noqa: F821
        "GitEvent", back_populates="user", cascade="all, delete-orphan"
    )
