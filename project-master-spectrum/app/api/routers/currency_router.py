"""
Currency preferences and conversion
===================================

The platform stores money in one base currency and converts at the edges. These
endpoints let a client app find out which currencies exist, what the user reads
the platform in, and what a given amount looks like to them.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import Optional

from app.models.schema import User
from app.auth.auth import get_current_user, get_current_user_optional
from app.services import fx_service

router = APIRouter()


class CurrencyPreferenceRequest(BaseModel):
    currency: str = Field(..., min_length=3, max_length=3,
                          description="ISO 4217 code, e.g. LKR")


@router.get("", summary="Currencies a user can choose")
async def list_currencies():
    """Selectable currencies, with symbol and minor-unit digits.

    `decimals` matters to clients: LKR has no minor unit, so rendering
    "Rs 50,000.00" would be wrong.
    """
    snapshot = await fx_service.current_snapshot()
    return {
        "base": fx_service.BASE_CURRENCY,
        "currencies": fx_service.supported_currencies(),
        "rates_as_of": snapshot.fetched_at.isoformat() if snapshot else None,
        "rates_stale": fx_service.is_stale(snapshot),
    }


@router.get("/me", summary="The signed-in user's currency")
async def get_my_currency(current_user: User = Depends(get_current_user)):
    code = (getattr(current_user, "preferred_currency", None) or fx_service.BASE_CURRENCY).upper()
    return {
        "currency": code,
        "symbol": fx_service.CURRENCY_SYMBOLS.get(code, f"{code} "),
        "name": fx_service.CURRENCY_NAMES.get(code, code),
        "decimals": fx_service.decimals_for(code),
        "is_base": code == fx_service.BASE_CURRENCY,
    }


@router.put("/me", summary="Change preferred currency")
async def set_my_currency(
    data: CurrencyPreferenceRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Change the currency this user reads the platform in.

    This is a display preference only. Balances, escrows and project budgets
    keep their own currency, so switching never changes what anyone is owed —
    and never re-prices work that has already been agreed.
    """
    code = data.currency.upper()
    if code not in fx_service.SUPPORTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{code} is not a supported currency.",
        )

    current_user.preferred_currency = code
    await current_user.save()

    return {
        "success": True,
        "currency": code,
        "symbol": fx_service.CURRENCY_SYMBOLS.get(code, f"{code} "),
        "message": (
            f"Amounts are now shown in {fx_service.CURRENCY_NAMES.get(code, code)}. "
            "Existing agreements keep the currency they were made in."
        ),
    }


@router.get("/convert", summary="Convert an amount")
async def convert_amount(
    amount: float = Query(..., ge=0),
    from_currency: str = Query(..., min_length=3, max_length=3, alias="from"),
    to_currency: Optional[str] = Query(None, min_length=3, max_length=3, alias="to"),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Convert an amount for display.

    Defaults to the signed-in user's preferred currency. Returns the original
    alongside the conversion — the original is the real figure, the conversion
    is an aid.
    """
    target = (
        to_currency
        or (getattr(current_user, "preferred_currency", None) if current_user else None)
        or fx_service.BASE_CURRENCY
    )
    result = await fx_service.describe(amount, from_currency, display_currency=target)
    if result.get("converted") is None and target.upper() != from_currency.upper():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Exchange rates are unavailable right now.",
        )
    return result


@router.post("/refresh-rates", summary="[Admin] Force an exchange-rate refresh")
async def force_refresh(current_user: User = Depends(get_current_user)):
    """Pull a fresh snapshot immediately instead of waiting for the daily cycle."""
    if current_user.user_role not in {"admin", "moderator"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")

    snapshot = await fx_service.refresh_rates(force=True)
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach the exchange-rate provider.",
        )
    return {
        "success": True,
        "base": snapshot.base,
        "currencies": len(snapshot.rates),
        "fetched_at": snapshot.fetched_at.isoformat(),
    }
