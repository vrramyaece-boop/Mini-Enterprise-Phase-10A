# routers/saas.py — Phase 7: Multi-tenant + Subscriptions + Billing
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app import schemas, models
from app.services import saas_service

router = APIRouter(prefix="/saas", tags=["SaaS"])


# ── ORGANIZATIONS ─────────────────────────────────────────────

@router.post("/organizations", response_model=schemas.OrganizationOut, status_code=201)
def create_org(body: schemas.OrganizationCreate, db: Session = Depends(get_db),
               current_user: models.User = Depends(get_current_user)):
    """Create a new organization (tenant). Admin only."""
    return saas_service.create_organization(db, body, current_user)


@router.get("/organizations", response_model=list[schemas.OrganizationOut])
def list_orgs(db: Session = Depends(get_db),
              current_user: models.User = Depends(get_current_user)):
    """List all organizations. Admin only."""
    return saas_service.list_organizations(db, current_user)


@router.get("/organizations/{org_id}", response_model=schemas.OrganizationOut)
def get_org(org_id: int, db: Session = Depends(get_db),
            current_user: models.User = Depends(get_current_user)):
    return saas_service.get_organization(db, org_id)


# ── SUBSCRIPTIONS ─────────────────────────────────────────────

@router.get("/organizations/{org_id}/subscription",
            response_model=schemas.SubscriptionOut)
def get_subscription(org_id: int, db: Session = Depends(get_db),
                     current_user: models.User = Depends(get_current_user)):
    """Get active subscription for an organization."""
    return saas_service.get_subscription(db, org_id)


@router.get("/plans/{plan}")
def get_plan_features(plan: str, current_user: models.User = Depends(get_current_user)):
    """Get features and limits for a specific plan (basic/silver/gold)."""
    return saas_service.get_plan_features(plan)


@router.get("/plans")
def list_plans(current_user: models.User = Depends(get_current_user)):
    """List all available plans with features and pricing."""
    from app.schemas import PLAN_FEATURES
    return PLAN_FEATURES


# ── BILLING / PAYMENTS ────────────────────────────────────────

@router.post("/billing/initiate", response_model=dict)
def initiate_payment(body: schemas.PaymentInitiate, db: Session = Depends(get_db),
                     current_user: models.User = Depends(get_current_user)):
    """
    Initiate a payment via Razorpay or Stripe.
    Returns gateway order details for frontend checkout.
    """
    return saas_service.initiate_payment(db, body, current_user)


@router.post("/billing/verify", response_model=dict)
def verify_payment(body: schemas.PaymentVerify, db: Session = Depends(get_db),
                   current_user: models.User = Depends(get_current_user)):
    """Verify payment completion and upgrade subscription."""
    return saas_service.verify_payment(db, body, current_user)


@router.get("/billing/{org_id}/history", response_model=list[schemas.PaymentOut])
def payment_history(org_id: int, db: Session = Depends(get_db),
                    current_user: models.User = Depends(get_current_user)):
    """Get payment history for an organization."""
    return saas_service.get_payment_history(db, org_id, current_user)


# ── STRIPE WEBHOOK ────────────────────────────────────────────

@router.post("/webhook/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Stripe webhook endpoint for automatic payment verification.
    No authentication required — Stripe signature verification only.
    Handles checkout.session.completed events to auto-upgrade subscriptions.
    """
    return await saas_service.handle_stripe_webhook(request, db)
