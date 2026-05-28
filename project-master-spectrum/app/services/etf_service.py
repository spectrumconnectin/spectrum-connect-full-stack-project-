"""
ETF (Earn-Trust Fund) Service

Business logic for vault creation, contributions, maturity processing,
claims, forfeitures, and projections.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from beanie import PydanticObjectId
import logging
import math

from app.models.etf import ETFVault, ETFContribution, ETFLedger, VaultContributionEntry
from app.models.schema import User

logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURATION
# ============================================================================

# Vault maturity period
VAULT_MATURITY_YEARS = 5

# Contribution rate tiers — percentage of project/milestone value deposited
# into the vault. Higher trust = higher contribution rate.
CONTRIBUTION_RATE_TIERS = {
    "base": 0.02,           # 2% — default for all verified users
    "trusted": 0.03,        # 3% — trust_score >= 70
    "highly_trusted": 0.04, # 4% — trust_score >= 85
    "elite": 0.05,          # 5% — trust_score >= 95 + premium verification
}

# Forfeiture schedule — percentage the user keeps based on vault age
# (years active → retention percentage)
FORFEITURE_SCHEDULE = {
    0: 0.00,   # Less than 1 year → forfeit everything
    1: 0.20,   # 1–2 years → keep 20%
    2: 0.40,   # 2–3 years → keep 40%
    3: 0.60,   # 3–4 years → keep 60%
    4: 0.80,   # 4–5 years → keep 80%
    5: 1.00,   # Matured → keep 100%
}

# Minimum contribution amount (skip dust contributions)
MIN_CONTRIBUTION_AMOUNT = 0.01


class ETFService:
    """Service for all ETF vault operations."""

    # ──────────────────────────────────────────────────────────────────────
    # CONTRIBUTION CALCULATION
    # ──────────────────────────────────────────────────────────────────────

    @staticmethod
    def calculate_contribution_amount(
        project_value: float,
        trust_score: Optional[float] = None,
        verification_level: Optional[str] = None,
    ) -> float:
        """
        Determine how much goes into the vault for a given project value.

        The rate is selected based on the user's current trust score and
        verification level, then applied to the project value.

        Args:
            project_value: Total value of the completed project/milestone.
            trust_score: User's current trust score (0–100).
            verification_level: One of none, email, identity, premium.

        Returns:
            Dollar amount to deposit into the vault.
        """
        if project_value <= 0:
            return 0.0

        score = trust_score or 0.0
        rate = CONTRIBUTION_RATE_TIERS["base"]

        if score >= 95 and verification_level == "premium":
            rate = CONTRIBUTION_RATE_TIERS["elite"]
        elif score >= 85:
            rate = CONTRIBUTION_RATE_TIERS["highly_trusted"]
        elif score >= 70:
            rate = CONTRIBUTION_RATE_TIERS["trusted"]

        amount = round(project_value * rate, 2)
        return amount if amount >= MIN_CONTRIBUTION_AMOUNT else 0.0

    # ──────────────────────────────────────────────────────────────────────
    # VAULT CREATION / RETRIEVAL
    # ──────────────────────────────────────────────────────────────────────

    @staticmethod
    async def get_or_create_vault(user_id: PydanticObjectId) -> ETFVault:
        """
        Return the user's existing vault or create a new one.

        A user has exactly one vault. The maturity date is set to
        5 years from vault creation.
        """
        vault = await ETFVault.find_one(ETFVault.user_id == user_id)
        if vault:
            return vault

        now = datetime.utcnow()
        maturity = now + relativedelta(years=VAULT_MATURITY_YEARS)

        vault = ETFVault(
            user_id=user_id,
            total_balance=0.0,
            currency="USD",
            contributions=[],
            contribution_count=0,
            maturity_date=maturity,
            status="active",
            created_at=now,
            updated_at=now,
        )
        await vault.insert()
        logger.info("Created ETF vault %s for user %s", vault.id, user_id)
        return vault

    # ──────────────────────────────────────────────────────────────────────
    # ADD CONTRIBUTION
    # ──────────────────────────────────────────────────────────────────────

    @staticmethod
    async def add_contribution(
        user_id: PydanticObjectId,
        amount: float,
        source_type: str,
        source_id: Optional[PydanticObjectId] = None,
        description: Optional[str] = None,
        trust_score: Optional[float] = None,
        verification_level: Optional[str] = None,
    ) -> Optional[ETFContribution]:
        """
        Deposit a contribution into the user's ETF vault.

        Called by external modules (project completion, milestone payout,
        skill challenge reward, manual bonus).

        Returns the contribution document, or None if the amount is below
        the minimum threshold.
        """
        if amount < MIN_CONTRIBUTION_AMOUNT:
            logger.debug(
                "Skipping ETF contribution of %.4f for user %s (below minimum)",
                amount, user_id,
            )
            return None

        vault = await ETFService.get_or_create_vault(user_id)

        # Do not accept contributions into non-active vaults
        if vault.status not in ("active",):
            logger.warning(
                "Cannot add contribution to vault %s with status '%s'",
                vault.id, vault.status,
            )
            return None

        now = datetime.utcnow()

        # 1. Create immutable contribution record
        contribution = ETFContribution(
            user_id=user_id,
            vault_id=vault.id,
            amount=amount,
            currency=vault.currency,
            source_type=source_type,
            source_id=source_id,
            description=description,
            trust_score_at_time=trust_score,
            verification_level_at_time=verification_level,
            created_at=now,
        )
        await contribution.insert()

        # 2. Update vault balance
        vault.total_balance = round(vault.total_balance + amount, 2)
        vault.contribution_count += 1
        vault.contributions.append(
            VaultContributionEntry(
                amount=amount,
                source_type=source_type,
                source_id=source_id,
                earned_at=now,
            )
        )
        vault.updated_at = now
        await vault.save()

        # 3. Write ledger entry
        ledger = ETFLedger(
            vault_id=vault.id,
            user_id=user_id,
            entry_type="contribution",
            amount=amount,
            balance_after=vault.total_balance,
            description=description or f"{source_type} contribution",
            reference_id=contribution.id,
            reference_type="etf_contribution",
            created_at=now,
        )
        await ledger.insert()

        logger.info(
            "ETF contribution of %.2f added to vault %s (new balance: %.2f)",
            amount, vault.id, vault.total_balance,
        )
        return contribution

    # ──────────────────────────────────────────────────────────────────────
    # VAULT SUMMARY (Dashboard)
    # ──────────────────────────────────────────────────────────────────────

    @staticmethod
    async def get_vault_summary(user_id: PydanticObjectId) -> Optional[Dict[str, Any]]:
        """
        Return a dashboard-friendly summary of the user's vault.
        Returns None if the user has no vault.
        """
        vault = await ETFVault.find_one(ETFVault.user_id == user_id)
        if not vault:
            return None

        now = datetime.utcnow()
        days_until_maturity = max((vault.maturity_date - now).days, 0)
        is_matured = now >= vault.maturity_date

        return {
            "vault_id": str(vault.id),
            "status": vault.status,
            "total_balance": vault.total_balance,
            "currency": vault.currency,
            "contribution_count": vault.contribution_count,
            "claimed_amount": vault.claimed_amount,
            "forfeited_amount": vault.forfeited_amount,
            "maturity_date": vault.maturity_date,
            "days_until_maturity": days_until_maturity,
            "is_matured": is_matured,
            "created_at": vault.created_at,
            "updated_at": vault.updated_at,
        }

    # ──────────────────────────────────────────────────────────────────────
    # CONTRIBUTION HISTORY (Paginated)
    # ──────────────────────────────────────────────────────────────────────

    @staticmethod
    async def get_contributions(
        user_id: PydanticObjectId,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """Return paginated contribution history for a user."""
        skip = (page - 1) * page_size

        total = await ETFContribution.find(
            ETFContribution.user_id == user_id
        ).count()

        contributions = (
            await ETFContribution.find(ETFContribution.user_id == user_id)
            .sort(-ETFContribution.created_at)
            .skip(skip)
            .limit(page_size)
            .to_list()
        )

        items = [
            {
                "id": str(c.id),
                "amount": c.amount,
                "currency": c.currency,
                "source_type": c.source_type,
                "source_id": str(c.source_id) if c.source_id else None,
                "description": c.description,
                "trust_score_at_time": c.trust_score_at_time,
                "verification_level_at_time": c.verification_level_at_time,
                "created_at": c.created_at,
            }
            for c in contributions
        ]

        return {
            "contributions": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "has_more": (skip + page_size) < total,
        }

    # ──────────────────────────────────────────────────────────────────────
    # PROJECTIONS
    # ──────────────────────────────────────────────────────────────────────

    @staticmethod
    async def get_projections(user_id: PydanticObjectId) -> Optional[Dict[str, Any]]:
        """
        Estimate the vault's value at maturity using the user's recent
        contribution velocity (average over the last 6 months).
        """
        vault = await ETFVault.find_one(ETFVault.user_id == user_id)
        if not vault:
            return None

        now = datetime.utcnow()
        six_months_ago = now - relativedelta(months=6)

        recent_contributions = await ETFContribution.find(
            ETFContribution.user_id == user_id,
            ETFContribution.created_at >= six_months_ago,
        ).to_list()

        total_recent = sum(c.amount for c in recent_contributions)

        # Months of data we actually have (cap at 6)
        vault_age_months = max(
            (now - vault.created_at).days / 30.44, 1
        )
        sample_months = min(vault_age_months, 6)
        avg_monthly = round(total_recent / sample_months, 2)

        months_remaining = max(
            (vault.maturity_date - now).days / 30.44, 0
        )
        projected_additional = round(avg_monthly * months_remaining, 2)
        projected_total = round(vault.total_balance + projected_additional, 2)

        basis = (
            f"Based on last {int(sample_months)} month(s) of activity"
            if recent_contributions
            else "No recent contributions — projection uses current balance only"
        )

        return {
            "current_balance": vault.total_balance,
            "currency": vault.currency,
            "avg_monthly_contribution": avg_monthly,
            "projected_balance_at_maturity": projected_total,
            "maturity_date": vault.maturity_date,
            "months_remaining": int(math.ceil(months_remaining)),
            "projection_basis": basis,
        }

    # ──────────────────────────────────────────────────────────────────────
    # MATURITY PROCESSING (Scheduled job)
    # ──────────────────────────────────────────────────────────────────────

    @staticmethod
    async def process_matured_vaults() -> int:
        """
        Batch job: find all active vaults past their maturity date and
        transition them to 'matured' status.

        Returns the number of vaults matured.
        """
        now = datetime.utcnow()
        vaults = await ETFVault.find(
            ETFVault.status == "active",
            ETFVault.maturity_date <= now,
        ).to_list()

        count = 0
        for vault in vaults:
            vault.status = "matured"
            vault.updated_at = now
            await vault.save()
            logger.info("Vault %s matured for user %s", vault.id, vault.user_id)
            count += 1

        return count

    # ──────────────────────────────────────────────────────────────────────
    # CLAIM (Payout matured funds)
    # ──────────────────────────────────────────────────────────────────────

    @staticmethod
    async def process_claim(
        user_id: PydanticObjectId,
        amount: Optional[float] = None,
        payout_method: str = "bank_transfer",
    ) -> Dict[str, Any]:
        """
        Claim funds from a matured vault.

        If ``amount`` is None, the entire balance is claimed.
        Partial claims are allowed — vault moves to ``partially_claimed``.
        """
        vault = await ETFVault.find_one(ETFVault.user_id == user_id)
        if not vault:
            return {"success": False, "message": "No ETF vault found."}

        if vault.status not in ("matured", "partially_claimed"):
            return {
                "success": False,
                "message": f"Vault is not eligible for claims (status: {vault.status}). "
                           f"Funds unlock on {vault.maturity_date.strftime('%B %d, %Y')}.",
            }

        claimable = round(vault.total_balance - vault.claimed_amount, 2)
        if claimable <= 0:
            return {"success": False, "message": "No claimable balance remaining."}

        claim_amount = round(min(amount, claimable), 2) if amount else claimable

        now = datetime.utcnow()

        # Update vault
        vault.claimed_amount = round(vault.claimed_amount + claim_amount, 2)
        remaining = round(claimable - claim_amount, 2)
        vault.status = "fully_claimed" if remaining <= 0 else "partially_claimed"
        vault.updated_at = now
        await vault.save()

        # Ledger entry
        ledger = ETFLedger(
            vault_id=vault.id,
            user_id=user_id,
            entry_type="claim",
            amount=-claim_amount,
            balance_after=remaining,
            description=f"Claim of {claim_amount} via {payout_method}",
            created_at=now,
        )
        await ledger.insert()

        # TODO: Trigger actual payout via billing/payment service
        # transaction_id = await PaymentService.initiate_payout(...)

        logger.info(
            "User %s claimed %.2f from vault %s (remaining: %.2f)",
            user_id, claim_amount, vault.id, remaining,
        )

        return {
            "success": True,
            "claimed_amount": claim_amount,
            "remaining_balance": remaining,
            "currency": vault.currency,
            "payout_method": payout_method,
            "transaction_id": None,  # populated when payment integration is live
            "message": f"Successfully claimed ${claim_amount:.2f}.",
        }

    # ──────────────────────────────────────────────────────────────────────
    # REINVESTMENT (Convert matured funds to platform services)
    # ──────────────────────────────────────────────────────────────────────

    @staticmethod
    async def process_reinvestment(
        user_id: PydanticObjectId,
        amount: float,
        target: str,
    ) -> Dict[str, Any]:
        """
        Reinvest matured vault funds into premium platform services
        (profile boost, service boost, subscription upgrade).
        """
        vault = await ETFVault.find_one(ETFVault.user_id == user_id)
        if not vault:
            return {"success": False, "message": "No ETF vault found."}

        if vault.status not in ("matured", "partially_claimed"):
            return {
                "success": False,
                "message": f"Vault is not eligible for reinvestment (status: {vault.status}).",
            }

        claimable = round(vault.total_balance - vault.claimed_amount, 2)
        if amount > claimable:
            return {
                "success": False,
                "message": f"Insufficient balance. Available: ${claimable:.2f}.",
            }

        allowed_targets = {"profile_boost", "service_boost", "subscription_upgrade"}
        if target not in allowed_targets:
            return {
                "success": False,
                "message": f"Invalid reinvestment target. Choose from: {', '.join(allowed_targets)}.",
            }

        now = datetime.utcnow()

        # Deduct from vault (treated same as a claim internally)
        vault.claimed_amount = round(vault.claimed_amount + amount, 2)
        remaining = round(claimable - amount, 2)
        vault.status = "fully_claimed" if remaining <= 0 else "partially_claimed"
        vault.updated_at = now
        await vault.save()

        # Ledger entry
        ledger = ETFLedger(
            vault_id=vault.id,
            user_id=user_id,
            entry_type="reinvestment",
            amount=-amount,
            balance_after=remaining,
            description=f"Reinvested {amount} into {target}",
            created_at=now,
        )
        await ledger.insert()

        # TODO: Activate the target service (boost, subscription, etc.)
        # await BoostService.activate(user_id, target, amount)

        logger.info(
            "User %s reinvested %.2f from vault %s into %s",
            user_id, amount, vault.id, target,
        )

        return {
            "success": True,
            "reinvested_amount": amount,
            "remaining_balance": remaining,
            "currency": vault.currency,
            "target": target,
            "message": f"Successfully reinvested ${amount:.2f} into {target}.",
        }

    # ──────────────────────────────────────────────────────────────────────
    # FORFEITURE (Early departure)
    # ──────────────────────────────────────────────────────────────────────

    @staticmethod
    async def process_forfeiture(user_id: PydanticObjectId) -> Dict[str, Any]:
        """
        Process forfeiture when a user deactivates their account before
        vault maturity.

        The user retains a percentage based on how long the vault has
        been active (see ``FORFEITURE_SCHEDULE``).
        """
        vault = await ETFVault.find_one(ETFVault.user_id == user_id)
        if not vault:
            return {"success": False, "message": "No ETF vault found."}

        if vault.status != "active":
            return {
                "success": False,
                "message": f"Vault is not active (status: {vault.status}).",
            }

        now = datetime.utcnow()
        vault_age_years = (now - vault.created_at).days / 365.25
        age_bucket = int(min(vault_age_years, 5))

        retention_rate = FORFEITURE_SCHEDULE.get(age_bucket, 0.0)
        retained = round(vault.total_balance * retention_rate, 2)
        forfeited = round(vault.total_balance - retained, 2)

        vault.forfeited_amount = forfeited
        vault.claimed_amount = retained  # auto-release retained portion
        vault.status = "forfeited"
        vault.updated_at = now
        await vault.save()

        # Ledger entries
        if forfeited > 0:
            await ETFLedger(
                vault_id=vault.id,
                user_id=user_id,
                entry_type="forfeiture",
                amount=-forfeited,
                balance_after=retained,
                description=f"Forfeited {forfeited} due to early departure ({age_bucket}yr retention: {int(retention_rate*100)}%)",
                created_at=now,
            ).insert()

        if retained > 0:
            await ETFLedger(
                vault_id=vault.id,
                user_id=user_id,
                entry_type="claim",
                amount=-retained,
                balance_after=0.0,
                description=f"Auto-released {retained} retained portion on forfeiture",
                created_at=now,
            ).insert()

        logger.info(
            "Vault %s forfeited for user %s — retained: %.2f, forfeited: %.2f",
            vault.id, user_id, retained, forfeited,
        )

        return {
            "success": True,
            "total_balance": vault.total_balance,
            "retained_amount": retained,
            "forfeited_amount": forfeited,
            "retention_rate": retention_rate,
            "vault_age_years": round(vault_age_years, 1),
            "message": (
                f"Vault forfeited. You retained ${retained:.2f} "
                f"({int(retention_rate*100)}% of ${vault.total_balance:.2f}) "
                f"based on {round(vault_age_years, 1)} years of membership."
            ),
        }











# from typing import Dict, Any, Optional
# from datetime import datetime
# from dateutil.relativedelta import relativedelta
# from beanie import PydanticObjectId
# import logging
# import math

# from app.models.etf import ETFVault, ETFContribution, ETFLedger, VaultContributionEntry

# logger = logging.getLogger(__name__)

# VAULT_MATURITY_YEARS = 5

# CONTRIBUTION_RATE_TIERS = {
#     "base": 0.00,
#     "trusted": 0.03,
#     "highly_trusted": 0.04,
#     "elite": 0.05,
# }

# FORFEITURE_SCHEDULE = {
#     0: 0.00,
#     1: 0.20,
#     2: 0.40,
#     3: 0.60,
#     4: 0.80,
#     5: 1.00,
# }

# MIN_CONTRIBUTION_AMOUNT = 0.01


# class ETFService:

#     @staticmethod
#     def calculateContributionAmount(
#         projectValue: float,
#         trustScore: Optional[float] = None,
#         verificationLevel: Optional[str] = None,
#     ) -> float:
#         if projectValue <= 0:
#             return 0.0

#         score = trustScore or 0.0
#         rate = CONTRIBUTION_RATE_TIERS["base"]

#         if score >= 95 and verificationLevel == "premium":
#             rate = CONTRIBUTION_RATE_TIERS["elite"]
#         elif score >= 85:
#             rate = CONTRIBUTION_RATE_TIERS["highly_trusted"]
#         elif score >= 70:
#             rate = CONTRIBUTION_RATE_TIERS["trusted"]

#         amount = round(projectValue * rate, 2)
#         return amount if amount >= MIN_CONTRIBUTION_AMOUNT else 0.0

#     @staticmethod
#     async def getOrCreateVault(userId: PydanticObjectId) -> ETFVault:
#         vault = await ETFVault.find_one(ETFVault.user_id == userId)
#         if vault:
#             return vault

#         now = datetime.utcnow()
#         maturity = now + relativedelta(years=VAULT_MATURITY_YEARS)

#         vault = ETFVault(
#             user_id=userId,
#             total_balance=0.0,
#             currency="USD",
#             contributions=[],
#             contribution_count=0,
#             maturity_date=maturity,
#             status="active",
#             created_at=now,
#             updated_at=now,
#         )
#         await vault.insert()
#         logger.info("Vault created %s user %s", vault.id, userId)
#         return vault

#     @staticmethod
#     async def addContribution(
#         userId: PydanticObjectId,
#         amount: float,
#         sourceType: str,
#         sourceId: Optional[PydanticObjectId] = None,
#         description: Optional[str] = None,
#         trustScore: Optional[float] = None,
#         verificationLevel: Optional[str] = None,
#     ) -> Optional[ETFContribution]:

#         if amount < MIN_CONTRIBUTION_AMOUNT:
#             logger.debug("Skip contribution %.4f user %s", amount, userId)
#             return None

#         vault = await ETFService.getOrCreateVault(userId)

#         if vault.status != "active":
#             logger.warning("Vault not active %s", vault.id)
#             return None

#         now = datetime.utcnow()

#         contribution = ETFContribution(
#             user_id=userId,
#             vault_id=vault.id,
#             amount=amount,
#             currency=vault.currency,
#             source_type=sourceType,
#             source_id=sourceId,
#             description=description,
#             trust_score_at_time=trustScore,
#             verification_level_at_time=verificationLevel,
#             created_at=now,
#         )
#         await contribution.insert()

#         vault.total_balance = round(vault.total_balance + amount, 2)
#         vault.contribution_count += 1
#         vault.contributions.append(
#             VaultContributionEntry(
#                 amount=amount,
#                 source_type=sourceType,
#                 source_id=sourceId,
#                 earned_at=now,
#             )
#         )
#         vault.updated_at = now
#         await vault.save()

#         await ETFLedger(
#             vault_id=vault.id,
#             user_id=userId,
#             entry_type="contribution",
#             amount=amount,
#             balance_after=vault.total_balance,
#             description=description or f"{sourceType} contribution",
#             reference_id=contribution.id,
#             reference_type="etf_contribution",
#             created_at=now,
#         ).insert()

#         logger.info("Contribution %.2f vault %s", amount, vault.id)
#         return contribution

#     @staticmethod
#     async def getVaultSummary(userId: PydanticObjectId) -> Optional[Dict[str, Any]]:
#         vault = await ETFVault.find_one(ETFVault.user_id == userId)
#         if not vault:
#             return None

#         now = datetime.utcnow()

#         return {
#             "vault_id": str(vault.id),
#             "status": vault.status,
#             "total_balance": vault.total_balance,
#             "currency": vault.currency,
#             "contribution_count": vault.contribution_count,
#             "claimed_amount": vault.claimed_amount,
#             "forfeited_amount": vault.forfeited_amount,
#             "maturity_date": vault.maturity_date,
#             "days_until_maturity": max((vault.maturity_date - now).days, 0),
#             "is_matured": now >= vault.maturity_date,
#             "created_at": vault.created_at,
#             "updated_at": vault.updated_at,
#         }

#     @staticmethod
#     async def getContributions(
#         userId: PydanticObjectId,
#         page: int = 1,
#         pageSize: int = 20,
#     ) -> Dict[str, Any]:

#         skip = (page - 1) * pageSize

#         total = await ETFContribution.find(
#             ETFContribution.user_id == userId
#         ).count()

#         data = (
#             await ETFContribution.find(ETFContribution.user_id == userId)
#             .sort(-ETFContribution.created_at)
#             .skip(skip)
#             .limit(pageSize)
#             .to_list()
#         )

#         return {
#             "contributions": [
#                 {
#                     "id": str(c.id),
#                     "amount": c.amount,
#                     "currency": c.currency,
#                     "source_type": c.source_type,
#                     "source_id": str(c.source_id) if c.source_id else None,
#                     "description": c.description,
#                     "trust_score_at_time": c.trust_score_at_time,
#                     "verification_level_at_time": c.verification_level_at_time,
#                     "created_at": c.created_at,
#                 }
#                 for c in data
#             ],
#             "total": total,
#             "page": page,
#             "page_size": pageSize,
#             "has_more": (skip + pageSize) < total,
#         }

#     @staticmethod
#     async def getProjections(userId: PydanticObjectId) -> Optional[Dict[str, Any]]:
#         vault = await ETFVault.find_one(ETFVault.user_id == userId)
#         if not vault:
#             return None

#         now = datetime.utcnow()
#         sixMonthsAgo = now - relativedelta(months=6)

#         recent = await ETFContribution.find(
#             ETFContribution.user_id == userId,
#             ETFContribution.created_at >= sixMonthsAgo,
#         ).to_list()

#         totalRecent = sum(c.amount for c in recent)

#         ageMonths = max((now - vault.created_at).days / 30.44, 1)
#         sampleMonths = min(ageMonths, 6)

#         avgMonthly = round(totalRecent / sampleMonths, 2)
#         monthsRemaining = max((vault.maturity_date - now).days / 30.44, 0)

#         projected = round(vault.total_balance + (avgMonthly * monthsRemaining), 2)

#         return {
#             "current_balance": vault.total_balance,
#             "currency": vault.currency,
#             "avg_monthly_contribution": avgMonthly,
#             "projected_balance_at_maturity": projected,
#             "maturity_date": vault.maturity_date,
#             "months_remaining": int(math.ceil(monthsRemaining)),
#         }

#     @staticmethod
#     async def processMaturedVaults() -> int:
#         now = datetime.utcnow()

#         vaults = await ETFVault.find(
#             ETFVault.status == "active",
#             ETFVault.maturity_date <= now,
#         ).to_list()

#         count = 0
#         for v in vaults:
#             v.status = "matured"
#             v.updated_at = now
#             await v.save()
#             logger.info("Vault matured %s", v.id)
#             count += 1

#         return count

#     @staticmethod
#     async def processClaim(
#         userId: PydanticObjectId,
#         amount: Optional[float] = None,
#         payoutMethod: str = "bank_transfer",
#     ) -> Dict[str, Any]:

#         vault = await ETFVault.find_one(ETFVault.user_id == userId)
#         if not vault:
#             return {"success": False, "message": "No vault"}

#         if vault.status not in ("matured", "partially_claimed"):
#             return {"success": False, "message": "Not eligible"}

#         claimable = round(vault.total_balance - vault.claimed_amount, 2)
#         if claimable <= 0:
#             return {"success": False, "message": "No balance"}

#         claimAmount = round(min(amount, claimable), 2) if amount else claimable

#         now = datetime.utcnow()

#         vault.claimed_amount = round(vault.claimed_amount + claimAmount, 2)
#         remaining = round(claimable - claimAmount, 2)
#         vault.status = "fully_claimed" if remaining <= 0 else "partially_claimed"
#         vault.updated_at = now
#         await vault.save()

#         await ETFLedger(
#             vault_id=vault.id,
#             user_id=userId,
#             entry_type="claim",
#             amount=-claimAmount,
#             balance_after=remaining,
#             description=f"Claim via {payoutMethod}",
#             created_at=now,
#         ).insert()

#         logger.info("Claim %.2f user %s", claimAmount, userId)

#         return {
#             "success": True,
#             "claimed_amount": claimAmount,
#             "remaining_balance": remaining,
#             "currency": vault.currency,
#         }

#     @staticmethod
#     async def processReinvestment(
#         userId: PydanticObjectId,
#         amount: float,
#         target: str,
#     ) -> Dict[str, Any]:

#         vault = await ETFVault.find_one(ETFVault.user_id == userId)
#         if not vault:
#             return {"success": False, "message": "No vault"}

#         claimable = round(vault.total_balance - vault.claimed_amount, 2)
#         if amount > claimable:
#             return {"success": False, "message": "Insufficient balance"}

#         allowed = {"profile_boost", "service_boost", "subscription_upgrade"}
#         if target not in allowed:
#             return {"success": False, "message": "Invalid target"}

#         now = datetime.utcnow()

#         vault.claimed_amount = round(vault.claimed_amount + amount, 2)
#         remaining = round(claimable - amount, 2)
#         vault.status = "fully_claimed" if remaining <= 0 else "partially_claimed"
#         vault.updated_at = now
#         await vault.save()

#         await ETFLedger(
#             vault_id=vault.id,
#             user_id=userId,
#             entry_type="reinvestment",
#             amount=-amount,
#             balance_after=remaining,
#             description=f"Reinvested into {target}",
#             created_at=now,
#         ).insert()

#         logger.info("Reinvest %.2f %s", amount, target)

#         return {
#             "success": True,
#             "reinvested_amount": amount,
#             "remaining_balance": remaining,
#             "currency": vault.currency,
#             "target": target,
#         }

#     @staticmethod
#     async def processForfeiture(userId: PydanticObjectId) -> Dict[str, Any]:
#         vault = await ETFVault.find_one(ETFVault.user_id == userId)
#         if not vault:
#             return {"success": False, "message": "No vault"}

#         if vault.status != "active":
#             return {"success": False, "message": "Not active"}

#         now = datetime.utcnow()
#         ageYears = (now - vault.created_at).days / 365.25
#         bucket = int(min(ageYears, 5))

#         rate = FORFEITURE_SCHEDULE.get(bucket, 0.0)

#         retained = round(vault.total_balance * rate, 2)
#         forfeited = round(vault.total_balance - retained, 2)

#         vault.forfeited_amount = forfeited
#         vault.claimed_amount = retained
#         vault.status = "forfeited"
#         vault.updated_at = now
#         await vault.save()

#         if forfeited > 0:
#             await ETFLedger(
#                 vault_id=vault.id,
#                 user_id=userId,
#                 entry_type="forfeiture",
#                 amount=-forfeited,
#                 balance_after=retained,
#                 description="Forfeited early exit",
#                 created_at=now,
#             ).insert()

#         if retained > 0:
#             await ETFLedger(
#                 vault_id=vault.id,
#                 user_id=userId,
#                 entry_type="claim",
#                 amount=-retained,
#                 balance_after=0.0,
#                 description="Retained release",
#                 created_at=now,
#             ).insert()

#         logger.info("Forfeiture %s user %s", vault.id, userId)

#         return {
#             "success": True,
#             "retained_amount": retained,
#             "forfeited_amount": forfeited,
#             "vault_age_years": round(ageYears, 1),
#         }