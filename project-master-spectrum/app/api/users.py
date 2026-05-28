from fastapi import APIRouter, Depends
from app.auth.auth import get_current_user
from app.auth.schemas import UserRead
from app.models.schema import User

router = APIRouter()

@router.get("/me", response_model=UserRead)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return UserRead(
        id=str(current_user.id),
        email=current_user.email,
        username=current_user.username,
        account_type=current_user.account_type
    )
