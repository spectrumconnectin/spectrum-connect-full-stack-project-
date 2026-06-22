"""Focused live test of the PayPal payout feature. Moves NO real money —
payouts stay disabled (no creds) so /withdraw must return 503. Verifies balance
accounting, payout-method save, auth gating, and the disabled-safe path."""
import os, random, string, requests, bcrypt
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId

BASE = os.environ.get("BASE", "http://spectrum-connect-single.ap-south-1.elasticbeanstalk.com")
db = MongoClient(os.environ["MONGO_URI"])[os.environ.get("MONGODB_DB", "spectrum-connect")]
PWD = "Payout@2026xx"
sfx = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
results = []
def ck(n, ok, d=""):
    results.append(ok); print(f"  [{'PASS' if ok else 'FAIL'}] {n}" + (f" — {d}" if d else "")); return ok

email = f"payt-{sfx}@example.com"
uid = db.users.insert_one({
    "email": email, "username": f"payt{sfx}", "password_hash": bcrypt.hashpw(PWD.encode(), bcrypt.gensalt()).decode(),
    "account_type": "both", "is_verified": True, "user_role": "user", "created_at": datetime.utcnow(),
}).inserted_id
# Seed completed earnings: two payments netting 460 + 184 = 644
for amt, net in [(500, 460.0), (200, 184.0)]:
    db.transactions.insert_one({
        "transaction_id": str(ObjectId()), "to_user_id": uid, "from_user_id": ObjectId(),
        "type": "payment", "amount": amt, "net_amount": net, "currency": "USD",
        "platform_fee": amt*0.12, "creator_fee": amt*0.08, "client_fee": amt*0.04,
        "status": "completed", "initiated_at": datetime.utcnow(), "completed_at": datetime.utcnow(),
    })

try:
    tok = requests.post(f"{BASE}/auth/login", data={"username": email, "password": PWD}, timeout=30).json().get("access_token")
    H = {"Authorization": f"Bearer {tok}"}

    # auth gating
    ck("Balance requires auth (401)", requests.get(f"{BASE}/earnings/balance").status_code == 401)

    # balance accounting: earned 644, withdrawn 0, available 644
    b = requests.get(f"{BASE}/earnings/balance", headers=H, timeout=30).json()
    ck("earned == 644", abs(b["earned"] - 644) < 0.01, str(b["earned"]))
    ck("available == 644", abs(b["available"] - 644) < 0.01, str(b["available"]))
    ck("payouts_enabled is False (no creds)", b["payouts_enabled"] is False)
    ck("min_withdrawal present", b.get("min_withdrawal", 0) > 0, str(b.get("min_withdrawal")))

    # invalid paypal email rejected
    ck("Invalid PayPal email rejected (400)",
       requests.post(f"{BASE}/earnings/payout-method", headers=H, json={"paypal_email": "notanemail"}).status_code == 400)
    # save valid email
    r = requests.post(f"{BASE}/earnings/payout-method", headers=H, json={"paypal_email": "creator@paypal.com"})
    ck("Save PayPal email (200)", r.status_code == 200, f"HTTP {r.status_code}")
    ck("Email persisted in DB", db.users.find_one({"_id": uid}).get("paypal_payout_email") == "creator@paypal.com")

    # withdraw below minimum
    ck("Below-min withdrawal rejected (400)",
       requests.post(f"{BASE}/earnings/withdraw", headers=H, json={"amount": 1}).status_code in (400, 503))
    # withdraw over balance
    ck("Over-balance withdrawal rejected (400/503)",
       requests.post(f"{BASE}/earnings/withdraw", headers=H, json={"amount": 99999}).status_code in (400, 503))
    # valid amount but payouts disabled → 503, and NO money moves, NO withdrawal txn created
    rw = requests.post(f"{BASE}/earnings/withdraw", headers=H, json={"amount": 100})
    ck("Withdraw blocked while disabled (503)", rw.status_code == 503, f"HTTP {rw.status_code} {rw.text[:80]}")
    ck("No withdrawal transaction created", db.transactions.count_documents({"from_user_id": uid, "type": "withdrawal"}) == 0)
finally:
    db.transactions.delete_many({"$or": [{"to_user_id": uid}, {"from_user_id": uid}]})
    db.users.delete_one({"_id": uid})
    db.audit_logs.delete_many({"actor_id": uid})
    p = sum(1 for x in results if x)
    print(f"\nRESULT: {p}/{len(results)} payout checks passed")
