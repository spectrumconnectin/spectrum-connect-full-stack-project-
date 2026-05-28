"""
ETF (Earn-Trust Fund) API Routes

Endpoints for viewing vault status, contribution history, projections,
and claiming or reinvesting matured funds.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Dict, Any

from app.models.schema import User
from app.services.etf_service import ETFService
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