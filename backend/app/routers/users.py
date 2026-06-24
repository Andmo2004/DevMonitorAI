from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models import User
from app.schemas.user import UserPolicyUpdate, UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.post(
    "/{user_id}/policy",
    response_model=UserResponse,
    summary="Actualizar política de gobernanza del usuario",
)
async def update_user_policy(
    user_id: int,
    policy: UserPolicyUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Configura las políticas de gobernanza para un usuario:

    - **anonymize**: Si es True, los prompts se anonomizan antes de guardarse.
    - **cost_alert_eur_day**: Umbral de alerta de coste diario en EUR.
    - **retention_days**: Días de retención de los eventos (cumplimiento RGPD).

    Solo se actualizan los campos que se envíen en el body (PATCH semántico).
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con ID {user_id} no encontrado",
        )

    # Actualizar solo los campos enviados (PATCH semántico)
    update_data = policy.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    await db.flush()
    await db.refresh(user)

    return user


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Obtener información y política del usuario",
)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con ID {user_id} no encontrado",
        )

    return user


@router.get(
    "/",
    response_model=list[UserResponse],
    summary="Listar todos los usuarios",
)
async def list_users(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User))
    users = result.scalars().all()
    # return list of users directly, sqlalchemy returns sequence which is compatible
    return users
