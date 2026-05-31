"""
ETF (Earn-Trust Fund) API Routes

Endpoints for viewing vault status, contribution history, projections,
and claiming or reinvesting matured funds.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import Dict, Any, List

from beanie import PydanticObjectId

from app.models.schema import User
from app.services.etf_service import ETFService
from app.services.etf_points_service import EtfPointsService
from app.auth.auth import get_current_user
from app.api.schemas.etf_schemas import (
    VaultSummaryResponse,
    VaultProjectionResponse,
    ContributionListResponse,
    ClaimRequest,
    ClaimResponse,
    ReinvestRequest,
    ReinvestResponse,
    NoVaultResponse,
)

router = APIRouter(prefix="/etf", tags=["ETF Trust Fund"])


# ──────────────────────────────────────────────────────────────────────
# GET /etf/vault — Current vault summary
# ──────────────────────────────────────────────────────────────────────

@router.get("/vault", summary="Get ETF vault summary")
async def get_vault(
    current_user: User = Depends(get_current_user),
):
    """
    Returns the user's ETF vault summary including balance,
    contribution count, maturity date, and claim status.

    Returns a 200 with ``has_vault: false`` if the user has no vault yet.
    """
    summary = await ETFService.get_vault_summary(current_user.id)
    if not summary:
        return NoVaultResponse()
    return summary


# ──────────────────────────────────────────────────────────────────────
# GET /etf/contributions — Paginated contribution history
# ──────────────────────────────────────────────────────────────────────

@router.get("/contributions", summary="Get contribution history")
async def get_contributions(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
):
    """
    Returns a paginated list of all ETF contributions the user has earned,
    ordered by most recent first.
    """
    result = await ETFService.get_contributions(
        user_id=current_user.id,
        page=page,
        page_size=page_size,
    )
    return result


# ──────────────────────────────────────────────────────────────────────
# GET /etf/projections — Estimated maturity value
# ──────────────────────────────────────────────────────────────────────

@router.get("/projections", summary="Get vault projections")
async def get_projections(
    current_user: User = Depends(get_current_user),
):
    """
    Estimates the vault's value at maturity based on the user's
    recent contribution velocity (average over last 6 months).

    Returns 404 if the user has no vault.
    """
    projection = await ETFService.get_projections(current_user.id)
    if not projection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No ETF vault found. Complete your first project to start earning.",
        )
    return projection


# ──────────────────────────────────────────────────────────────────────
# POST /etf/claim — Claim matured funds
# ──────────────────────────────────────────────────────────────────────

@router.post("/claim", summary="Claim matured vault funds")
async def claim_funds(
    request: ClaimRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Claim funds from a matured ETF vault.

    - If ``amount`` is omitted, the entire claimable balance is claimed.
    - Partial claims are supported — the vault moves to ``partially_claimed``.
    - Only matured or partially-claimed vaults are eligible.

    **Errors:**
    - 400: Vault not matured or no claimable balance.
    """
    result = await ETFService.process_claim(
        user_id=current_user.id,
        amount=request.amount,
        payout_method=request.payout_method,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"],
        )

    return result


# ──────────────────────────────────────────────────────────────────────
# POST /etf/reinvest — Reinvest matured funds
# ──────────────────────────────────────────────────────────────────────

@router.post("/reinvest", summary="Reinvest matured funds into platform services")
async def reinvest_funds(
    request: ReinvestRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Reinvest matured vault funds into premium services:

    - ``profile_boost`` — boost profile visibility
    - ``service_boost`` — boost a gig/service listing
    - ``subscription_upgrade`` — apply funds toward a subscription

    **Errors:**
    - 400: Vault not matured, insufficient balance, or invalid target.
    """
    result = await ETFService.process_reinvestment(
        user_id=current_user.id,
        amount=request.amount,
        target=request.target,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"],
        )

    return result

# ============================================================================
# ETF POINTS — Earn Trust Framework
# ============================================================================
# Points-based loyalty surface. Internal USD value of points is NEVER
# returned by any of these endpoints — clients only see points, level,
# progress, and badge.
# ============================================================================


@router.get("/me", summary="My ETF Points balance + level")
async def get_my_etf_balance(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's ETF Points balance, lifetime total,
    current level (bronze / silver / gold / platinum), and progress toward
    the next level. The dashboard and ETF page both consume this.
    """
    balance = await EtfPointsService.get_balance(current_user.id)
    return balance.model_dump()


@router.get("/me/events", summary="My recent ETF Points activity")
async def get_my_etf_events(
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
):
    """Paginated activity feed for the ETF page."""
    events = await EtfPointsService.get_events(current_user.id, limit=limit, skip=skip)
    return {"events": [e.model_dump() for e in events], "skip": skip, "limit": limit}


@router.get("/badge/{user_id}", summary="Public ETF badge for a user")
async def get_etf_badge(user_id: str):
    """Lightweight public read for cards / search results / profile chips.
    Returns only the level info — no balance numbers are leaked.
    """
    try:
        PydanticObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id")
    level = await EtfPointsService.badge_for(user_id)
    return level.model_dump()


# ─── Cash-out (Phase 1: eligibility check + request only) ────────────────────


class CashoutRequestBody(BaseModel):
    points: int = Field(..., gt=0, description="Number of ETF Points to cash out")


@router.get("/me/cashout", summary="Check my cash-out eligibility")
async def get_cashout_eligibility(current_user: User = Depends(get_current_user)):
    """Return a structured eligibility report. Always callable so the UI
    can show 'Eligible in N days' / 'Need M more points' etc.
    """
    return await EtfPointsService.check_cashout_eligibility(current_user)


@router.post("/me/cashout", summary="Request a cash-out")
async def request_cashout(
    body: CashoutRequestBody,
    current_user: User = Depends(get_current_user),
):
    """Record a cash-out request. Phase 1 only debits the balance and queues
    the request for admin review — the actual payout integration ships
    in Phase 2 alongside the payment processor.
    """
    return await EtfPointsService.request_cashout(current_user, body.points)
