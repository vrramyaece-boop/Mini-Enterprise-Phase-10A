# create_superadmin.py
# ─────────────────────────────────────────────────────────────
# Run this ONCE to create the first Super Admin on a fresh install.
#
# Usage:
#   cd "Phase 10A - Mini Enterprise/backend"
#   python create_superadmin.py
#
# After running, login at http://localhost:3000/login
# with the email and password you set below.
# ─────────────────────────────────────────────────────────────

import sys
import os

# Make sure Python can find the app package
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import User
from app.auth import hash_password
from sqlalchemy import select

# ── Change these values before running ───────────────────────
SUPER_ADMIN_NAME     = "Platform Admin"
SUPER_ADMIN_EMAIL    = "superadmin@platform.com"
SUPER_ADMIN_PASSWORD = "SuperPass@123"
# ─────────────────────────────────────────────────────────────

db = SessionLocal()

try:
    # Check if this email already exists in the database
    existing = db.execute(
        select(User).where(User.email == SUPER_ADMIN_EMAIL)
    ).scalar_one_or_none()

    if existing:
        if existing.is_super_admin:
            # Already a Super Admin — nothing to do
            print(f"\n✅ Super Admin already exists: {existing.email}")
            print(f"   Just login at http://localhost:3000/login")
        else:
            # User exists but is not Super Admin — promote them
            existing.is_super_admin = True
            db.commit()
            print(f"\n✅ Promoted existing user to Super Admin!")
            print(f"   Email : {existing.email}")
            print(f"   Login with your existing password.")
    else:
        # No user found — create a brand new Super Admin
        user = User(
            name=SUPER_ADMIN_NAME,
            email=SUPER_ADMIN_EMAIL,
            hashed_password=hash_password(SUPER_ADMIN_PASSWORD),
            role="admin",
            is_super_admin=True,
            is_active=True,
            tenant_id=None  # Super Admin is not scoped to any tenant
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        print(f"\n✅ Super Admin created successfully!")
        print(f"   Name     : {user.name}")
        print(f"   Email    : {user.email}")
        print(f"   Password : {SUPER_ADMIN_PASSWORD}")
        print(f"   ID       : {user.id}")

    print(f"\n🎉 Done!")
    print(f"   Step 1 → Open   : http://localhost:3000/login")
    print(f"   Step 2 → Email  : {SUPER_ADMIN_EMAIL}")
    print(f"   Step 3 → Password: {SUPER_ADMIN_PASSWORD}")
    print(f"   Step 4 → Look for '🛡️ Super Admin' in the sidebar\n")

except Exception as e:
    print(f"\n❌ Error: {e}")
    print("Make sure your backend server dependencies are installed.")
    print("Run: pip install -r requirements.txt")

finally:
    db.close()
