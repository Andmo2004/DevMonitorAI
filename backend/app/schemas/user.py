from pydantic import BaseModel, Field


class UserPolicyUpdate(BaseModel):
    anonymize: bool | None = Field(
        None,
        description="Si True, los prompts no se almacenan en texto plano"
    )
    cost_alert_eur_day: float | None = Field(
        None,
        ge=0.0,
        description="Alerta cuando el coste diario supere este valor en EUR"
    )
    retention_days: int | None = Field(
        None,
        ge=1,
        le=365,
        description="Número de días que se retienen los eventos (1-365)"
    )


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    team: str | None
    anonymize: bool
    cost_alert_eur_day: float | None
    retention_days: int

    model_config = {"from_attributes": True}
