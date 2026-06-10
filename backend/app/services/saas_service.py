# services/saas_service.py — Phase 7: Multi-tenant + Subscriptions + Billing
import logging
import os
from dotenv import load_dotenv
import stripe
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app import models, schemas

load_dotenv()
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

logger = logging.getLogger(__name__)

PLAN_PRICES = {
    "basic":  {"amount": 0,      "credits": 100,  "max_users": 5,   "max_tasks": 50},
    "silver": {"amount": 99900,  "credits": 500,  "max_users": 20,  "max_tasks": 500},
    "gold":   {"amount": 299900, "credits": 2000, "max_users": 100, "max_tasks": 5000},
}


# ── ORGANIZATION ─────────────────────────────────────────────

def create_organization(db: Session, data: schemas.OrganizationCreate,
                         current_user: models.User) -> models.Organization:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create organizations")
    if db.execute(select(models.Organization).where(models.Organization.slug == data.slug)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Organization slug already exists")
    org = models.Organization(name=data.name, slug=data.slug, plan=data.plan or "basic")
    db.add(org); db.commit(); db.refresh(org)
    # Add creator as org member
    db.add(models.OrganizationUser(organization_id=org.id, user_id=current_user.id, role="admin"))
    # Create default subscription
    plan_info = PLAN_PRICES.get(org.plan, PLAN_PRICES["basic"])
    db.add(models.Subscription(
        organization_id=org.id, plan=org.plan,
        credits=plan_info["credits"], status="active"
    ))
    db.commit(); db.refresh(org)
    logger.info(f"Organization '{org.name}' created by {current_user.email}")
    return org


def list_organizations(db: Session, current_user: models.User) -> list:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return db.execute(select(models.Organization)).scalars().all()


def get_organization(db: Session, org_id: int) -> models.Organization:
    org = db.execute(select(models.Organization).where(models.Organization.id == org_id)).scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


# ── SUBSCRIPTION ─────────────────────────────────────────────

def get_subscription(db: Session, org_id: int) -> models.Subscription:
    sub = db.execute(select(models.Subscription).where(models.Subscription.organization_id == org_id, models.Subscription.status == "active")).scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="No active subscription found")
    return sub


def get_plan_features(plan: str) -> dict:
    features = PLAN_PRICES.get(plan)
    if not features:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {plan}")
    return {"plan": plan, **features}


# ── BILLING / PAYMENTS ────────────────────────────────────────

def initiate_payment(db: Session, data: schemas.PaymentInitiate,
                      current_user: models.User) -> dict:
    """
    Phase 7: Initiate a payment via Razorpay or Stripe.
    In production: call Razorpay/Stripe SDK to create order.
    Here: returns a mock order for demo purposes.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can initiate payments")

    plan_info = PLAN_PRICES.get(data.plan)
    if not plan_info:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {data.plan}")

    # Create payment record
    currency = "INR" if data.gateway == "razorpay" else "USD"
    payment = models.Payment(
        organization_id=data.organization_id,
        gateway=data.gateway,
        amount=plan_info["amount"],
        currency=currency,
        status="pending",
        plan=data.plan,
    )
    db.add(payment); db.commit(); db.refresh(payment)

    checkout_url = None
    if data.gateway == "stripe":
        if not STRIPE_SECRET_KEY:
            raise HTTPException(status_code=500, detail="Stripe secret key is not configured")
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"{data.plan.title()} Plan Subscription",
                        "description": f"{data.plan.title()} plan for organization {data.organization_id}",
                    },
                    "unit_amount": plan_info["amount"],
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{FRONTEND_URL}/saas?session_id={{CHECKOUT_SESSION_ID}}&organization_id={data.organization_id}&plan={data.plan}&gateway=stripe",
            cancel_url=f"{FRONTEND_URL}/saas?cancelled=1",
            metadata={
                "organization_id": str(data.organization_id),
                "plan": data.plan,
            },
        )
        payment.gateway_order_id = session.id
        payment.gateway_payment_id = None
        db.commit()
        checkout_url = session.url
    else:
        payment.gateway_order_id = f"order_demo_{data.organization_id}_{data.plan}"
        db.commit()

    logger.info(f"Payment initiated: org={data.organization_id} plan={data.plan} gateway={data.gateway}")

    response = {
        "payment_id":       payment.id,
        "gateway":          data.gateway,
        "gateway_order_id": payment.gateway_order_id,
        "amount":           plan_info["amount"],
        "currency":         payment.currency,
        "plan":             data.plan,
        "status":           payment.status,
    }

    if checkout_url:
        response["checkout_url"] = checkout_url
    else:
        response["note"] = (
            "In production: use this order_id to open Razorpay/Stripe checkout. "
            "Call /billing/verify after payment completes."
        )
    return response


def verify_payment(db: Session, data: schemas.PaymentVerify,
                    current_user: models.User) -> dict:
    """
    Phase 7: Verify payment completion and upgrade subscription.
    For Stripe, retrieve the checkout session and confirm it is paid.
    """
    payment = db.execute(select(models.Payment).where(models.Payment.gateway_order_id == data.gateway_order_id, models.Payment.organization_id == data.organization_id)).scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    if payment.gateway == "stripe":
        if not STRIPE_SECRET_KEY:
            raise HTTPException(status_code=500, detail="Stripe secret key is not configured")
        session = stripe.checkout.Session.retrieve(
            data.gateway_order_id,
            expand=["payment_intent"]
        )
        if session.payment_status != "paid":
            raise HTTPException(status_code=400, detail="Stripe payment not completed")
        payment.gateway_payment_id = session.payment_intent.id if hasattr(session.payment_intent, "id") else session.payment_intent
        payment.status = "completed"
    else:
        payment.gateway_payment_id = data.gateway_payment_id
        payment.status             = "completed"

    # Upgrade subscription
    org = db.execute(select(models.Organization).where(models.Organization.id == data.organization_id)).scalar_one_or_none()
    if org:
        org.plan = payment.plan
        sub = db.execute(select(models.Subscription).where(models.Subscription.organization_id == data.organization_id, models.Subscription.status == "active")).scalar_one_or_none()
        if sub:
            plan_info     = PLAN_PRICES.get(payment.plan, {})
            sub.plan      = payment.plan
            sub.credits   = plan_info.get("credits", sub.credits)

    db.commit()
    logger.info(f"Payment verified: org={data.organization_id} plan={payment.plan}")
    return {"message": f"Payment verified. Organization upgraded to {payment.plan} plan.",
            "plan": payment.plan}


def get_payment_history(db: Session, org_id: int,
                         current_user: models.User) -> list:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return db.execute(select(models.Payment).where(models.Payment.organization_id == org_id).order_by(models.Payment.created_at.desc())).scalars().all()


# ── STRIPE WEBHOOK HANDLER ────────────────────────────────────

async def handle_stripe_webhook(request, db: Session) -> dict:
    """
    Handle Stripe webhook events.
    Verifies signature and processes checkout.session.completed events.
    """
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe secret key not configured")
    
    WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Stripe webhook secret not configured")
    
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        
        if session.get("payment_status") != "paid":
            return {"status": "skipped", "reason": "payment not paid"}
        
        org_id = int(session["metadata"].get("organization_id"))
        plan = session["metadata"].get("plan")
        
        if not org_id or not plan:
            logger.warning(f"Webhook: missing org_id or plan in metadata")
            return {"status": "error", "reason": "missing metadata"}
        
        payment = db.execute(select(models.Payment).where(models.Payment.gateway_order_id == session.id, models.Payment.organization_id == org_id)).scalar_one_or_none()
        
        if not payment:
            payment = models.Payment(
                organization_id=org_id,
                gateway="stripe",
                gateway_order_id=session.id,
                gateway_payment_id=session.get("payment_intent"),
                amount=session.get("amount_total", 0),
                currency=session.get("currency", "usd").upper(),
                status="completed",
                plan=plan,
            )
            db.add(payment)
        else:
            payment.gateway_payment_id = session.get("payment_intent")
            payment.status = "completed"
        
        org = db.execute(select(models.Organization).where(models.Organization.id == org_id)).scalar_one_or_none()
        
        if org:
            org.plan = plan
            sub = db.execute(select(models.Subscription).where(models.Subscription.organization_id == org_id, models.Subscription.status == "active")).scalar_one_or_none()
            if sub:
                plan_info = PLAN_PRICES.get(plan, {})
                sub.plan = plan
                sub.credits = plan_info.get("credits", sub.credits)
        
        db.commit()
        logger.info(f"Webhook: payment verified and org {org_id} upgraded to {plan}")
        return {"status": "success", "message": f"Organization upgraded to {plan}"}
    
    return {"status": "received"}
