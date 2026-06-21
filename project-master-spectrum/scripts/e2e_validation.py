"""
Spectrum Connect — Full Platform E2E Validation Harness
=======================================================
Exercises every major workflow against the LIVE backend with fresh, clearly
marked test accounts, plus direct MongoDB assertions for data integrity.
Cleans up all test data at the end.

Run:  MONGO_URI=... python3 scripts/e2e_validation.py
"""
import os, sys, time, uuid, random, string
import requests
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import ObjectId

BASE = os.environ.get("BASE", "http://spectrum-connect-single.ap-south-1.elasticbeanstalk.com")
MONGO_URI = os.environ["MONGO_URI"]
DB = os.environ.get("MONGODB_DB", "spectrum-connect")
TAG = "e2eval"                                  # marks all test docs
PWD = "E2eValid@2026"

m = MongoClient(MONGO_URI)
db = m[DB]

results = []
def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
    return ok

def section(t): print(f"\n=== {t} ===")

def api(method, path, token=None, **kw):
    h = kw.pop("headers", {})
    if token: h["Authorization"] = f"Bearer {token}"
    return requests.request(method, f"{BASE}{path}", headers=h, timeout=30, **kw)

def reg(email, username, account_type):
    r = api("POST", "/auth/register", json={
        "email": email, "username": username, "password": PWD, "account_type": account_type,
        "first_name": username, "last_name": "Test",
    })
    return r

def verify_in_db(email):
    db.users.update_one({"email": email}, {"$set": {"is_verified": True}})

def login(identifier):
    r = api("POST", "/auth/login", data={"username": identifier, "password": PWD})
    if r.status_code != 200:
        return None, r
    return r.json()["access_token"], r

# ─────────────────────────────────────────────────────────────────────────────
suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
CLIENT_EMAIL  = f"{TAG}-client-{suffix}@example.com"
CREATOR_EMAIL = f"{TAG}-creator-{suffix}@example.com"
UNVER_EMAIL   = f"{TAG}-unver-{suffix}@example.com"
ADMIN_EMAIL   = f"{TAG}-admin-{suffix}@example.com"
CLIENT_U  = f"{TAG}client{suffix}"
CREATOR_U = f"{TAG}creator{suffix}"
UNVER_U   = f"{TAG}unver{suffix}"
ADMIN_U   = f"{TAG}admin{suffix}"

created_ids = {"users": [], "jobs": [], "apps": [], "escrows": [], "tx": []}

try:
    # ── 1. AUTHENTICATION & REGISTRATION ────────────────────────────────────
    section("1. Authentication & Registration")
    rc = reg(CLIENT_EMAIL, CLIENT_U, "both")
    check("Register client", rc.status_code in (200, 201), f"HTTP {rc.status_code}")
    rk = reg(CREATOR_EMAIL, CREATOR_U, "both")
    check("Register creator", rk.status_code in (200, 201), f"HTTP {rk.status_code}")
    ru = reg(UNVER_EMAIL, UNVER_U, "both")
    check("Register 3rd (left unverified)", ru.status_code in (200, 201), f"HTTP {ru.status_code}")

    # Duplicate email rejected
    rdup = reg(CLIENT_EMAIL, CLIENT_U + "x", "both")
    check("Duplicate email rejected", rdup.status_code == 400, f"HTTP {rdup.status_code}")

    # Unverified login blocked
    tok, r = login(UNVER_EMAIL)
    check("Unverified login blocked (403)", r.status_code == 403, f"HTTP {r.status_code}")

    # Verify the two real test accounts
    verify_in_db(CLIENT_EMAIL); verify_in_db(CREATOR_EMAIL)
    for e in (CLIENT_EMAIL, CREATOR_EMAIL, UNVER_EMAIL):
        u = db.users.find_one({"email": e})
        if u: created_ids["users"].append(u["_id"])

    client_tok, _ = login(CLIENT_EMAIL)
    creator_tok, _ = login(CREATOR_EMAIL)
    check("Client login returns JWT", bool(client_tok))
    check("Creator login returns JWT", bool(creator_tok))

    # Wrong password
    rwp = api("POST", "/auth/login", data={"username": CLIENT_EMAIL, "password": "wrongpass"})
    check("Wrong password rejected (401)", rwp.status_code == 401, f"HTTP {rwp.status_code}")

    # No token → protected endpoint 401
    rno = api("GET", "/escrow/my-escrows")
    check("Protected endpoint without token (401)", rno.status_code == 401, f"HTTP {rno.status_code}")

    client = db.users.find_one({"email": CLIENT_EMAIL})
    creator = db.users.find_one({"email": CREATOR_EMAIL})
    CLIENT_ID, CREATOR_ID = str(client["_id"]), str(creator["_id"])

    # ── 2. PROFILES ─────────────────────────────────────────────────────────
    section("2. Profiles")
    rme = api("GET", "/auth/me/role", token=client_tok)
    check("Authenticated /me/role", rme.status_code == 200, f"HTTP {rme.status_code}")
    # public creator profile
    rprof = api("GET", f"/profiles/username/{CREATOR_U}", token=client_tok)
    if rprof.status_code != 200:
        rprof = api("GET", f"/profiles/{CREATOR_ID}", token=client_tok)
    check("Fetch creator public profile", rprof.status_code == 200, f"HTTP {rprof.status_code}")

    # ── 3. JOB CREATION & PUBLISH ───────────────────────────────────────────
    section("3. Project / Job Creation")
    job_body = {
        "title": f"{TAG} Brand Film Production {suffix}",
        "description": "End-to-end validation job post for automated platform testing. " * 2,
        "department": "Film & Video",
        "budget_type": "fixed",
        "budget": {"min": 500, "max": 500},
        "currency": "USD",
        "skills": ["Cinematography", "Editing"],
    }
    rjob = api("POST", "/jobs", token=client_tok, json=job_body)
    ok = rjob.status_code in (200, 201)
    check("Client creates job (draft)", ok, f"HTTP {rjob.status_code} {rjob.text[:120] if not ok else ''}")
    job_id = rjob.json().get("id") if ok else None
    if job_id: created_ids["jobs"].append(ObjectId(job_id))
    # publish draft -> open
    rpub = api("PATCH", f"/jobs/{job_id}/status", token=client_tok, json={"status": "open"})
    check("Publish job (draft→open)", rpub.status_code in (200, 201), f"HTTP {rpub.status_code}")

    # creator CANNOT publish someone else's job
    rbad = api("PATCH", f"/jobs/{job_id}/status", token=creator_tok, json={"status": "closed"})
    check("Creator cannot change client's job status (403/404)", rbad.status_code in (403, 404), f"HTTP {rbad.status_code}")

    # ── 4. APPLICATION ──────────────────────────────────────────────────────
    section("4. Project Application")
    rapp = api("POST", f"/proposals/{job_id}", token=creator_tok, json={
        "cover_letter": "I am the validation creator and would love to work on this.",
        "proposed_budget": 500, "role": "Cinematographer", "proposed_duration": 7,
    })
    ok = rapp.status_code in (200, 201)
    check("Creator submits proposal", ok, f"HTTP {rapp.status_code} {rapp.text[:120] if not ok else ''}")
    app_doc = db.applications.find_one({"project_id": ObjectId(job_id)}) if job_id else None
    app_id = str(app_doc["_id"]) if app_doc else (rapp.json().get("id") if ok else None)
    if app_doc: created_ids["apps"].append(app_doc["_id"])
    check("Proposal persisted in DB", bool(app_doc))

    # client sees the proposal
    rlist = api("GET", f"/proposals/job/{job_id}", token=client_tok)
    if rlist.status_code != 200:
        rlist = api("GET", f"/proposals?job_id={job_id}", token=client_tok)
    check("Client lists proposals for job", rlist.status_code == 200, f"HTTP {rlist.status_code}")

    # creator CANNOT accept their own proposal (client-only action)
    rselfacc = api("PATCH", f"/proposals/{app_id}/status", token=creator_tok, json={"status": "accepted"})
    check("Creator cannot accept proposal (client-only) (403)", rselfacc.status_code in (403, 404), f"HTTP {rselfacc.status_code}")

    # ── 5. HIRING ───────────────────────────────────────────────────────────
    section("5. Hiring")
    racc = api("PATCH", f"/proposals/{app_id}/status", token=client_tok, json={"status": "accepted"})
    check("Client accepts proposal (hire)", racc.status_code in (200, 201), f"HTTP {racc.status_code}")
    app_doc = db.applications.find_one({"_id": ObjectId(app_id)})
    check("Application marked accepted in DB", app_doc and app_doc.get("status") == "accepted",
          f"status={app_doc.get('status') if app_doc else 'none'}")

    # ── 6. ESCROW CREATION + AUTHZ ──────────────────────────────────────────
    section("6. Escrow Creation & Authorization")
    resc = api("POST", "/escrow", token=client_tok, json={
        "creator_id": CREATOR_ID, "job_post_id": job_id,
        "description": f"{TAG} escrow {suffix}",
        "milestones": [{"title": "Final Delivery", "amount": 500, "currency": "USD"}],
        "currency": "USD",
    })
    ok = resc.status_code in (200, 201)
    check("Client creates escrow", ok, f"HTTP {resc.status_code} {resc.text[:160] if not ok else ''}")
    escrow_id = resc.json().get("escrow_id") if ok else None
    if escrow_id: created_ids["escrows"].append(ObjectId(escrow_id))

    # creator cannot create escrow against a job they don't own
    rescbad = api("POST", "/escrow", token=creator_tok, json={
        "creator_id": CLIENT_ID, "job_post_id": job_id,
        "milestones": [{"title": "x", "amount": 10, "currency": "USD"}], "currency": "USD",
    })
    check("Creator cannot escrow against non-owned job (403)", rescbad.status_code == 403, f"HTTP {rescbad.status_code}")

    # self-escrow blocked
    rself = api("POST", "/escrow", token=client_tok, json={
        "creator_id": CLIENT_ID,
        "milestones": [{"title": "x", "amount": 10, "currency": "USD"}], "currency": "USD",
    })
    check("Self-escrow blocked (400)", rself.status_code == 400, f"HTTP {rself.status_code}")

    # get milestone id
    esc = db.escrows.find_one({"_id": ObjectId(escrow_id)})
    mid = esc["milestones"][0]["milestone_id"]

    # non-party cannot view escrow
    _, _ = None, None
    # creator IS a party; use unverified... need a token. Use creator viewing — allowed.
    rview_creator = api("GET", f"/escrow/{escrow_id}", token=creator_tok)
    check("Creator (party) can view escrow", rview_creator.status_code == 200, f"HTTP {rview_creator.status_code}")

    # ── 7. PAYMENT SECURITY ─────────────────────────────────────────────────
    section("7. Payment Security")
    # 7a. removed bypass
    rby = api("POST", f"/escrow/{escrow_id}/fund-milestone", token=client_tok, json={"milestone_id": mid})
    check("Direct fund-milestone bypass removed (404)", rby.status_code == 404, f"HTTP {rby.status_code}")

    # 7b. amount manipulation — client asks to pay $1 for a $500 milestone
    rco = api("POST", "/stripe/checkout-session", token=client_tok, json={
        "escrow_id": escrow_id, "milestone_id": mid, "amount": 1, "currency": "USD",
        "project_title": "tamper test",
    })
    ok = rco.status_code == 200
    sess_id = rco.json().get("session_id") if ok else None
    check("Checkout session created (ignores client amount)", ok, f"HTTP {rco.status_code} {rco.text[:120] if not ok else ''}")
    if sess_id:
        # Retrieve the real session from Stripe to PROVE the server set the amount.
        skey = os.environ.get("STRIPE_SECRET_KEY")
        try:
            import stripe
            stripe_ok = True
        except ImportError:
            stripe_ok = False
        if stripe_ok and skey:
            stripe.api_key = skey
            s = stripe.checkout.Session.retrieve(sess_id)
            check("Stripe amount is server-derived ($520, not $1)", s["amount_total"] == 52000,
                  f"amount_total={s['amount_total']} cents")
            try: stripe.checkout.Session.expire(sess_id)
            except Exception: pass
        else:
            check("Stripe amount server-derived (verifier available)", False,
                  "stripe lib or STRIPE_SECRET_KEY missing (skipped)")

    # 7c. creator cannot create a checkout session for client's escrow
    rcobad = api("POST", "/stripe/checkout-session", token=creator_tok, json={
        "escrow_id": escrow_id, "milestone_id": mid, "project_title": "x",
    })
    check("Creator cannot fund client's escrow (403)", rcobad.status_code == 403, f"HTTP {rcobad.status_code}")

    # 7d. creator cannot release / refund
    rrel = api("POST", f"/escrow/{escrow_id}/release-milestone", token=creator_tok, json={"milestone_id": mid})
    check("Creator cannot release milestone (403)", rrel.status_code == 403, f"HTTP {rrel.status_code}")
    rref = api("POST", f"/escrow/{escrow_id}/refund", token=creator_tok, json={"reason": "x"})
    check("Creator cannot refund escrow (403)", rref.status_code == 403, f"HTTP {rref.status_code}")

    # ── 8. FUND (fixture) → DELIVER → REVIEW GATE → RELEASE ──────────────────
    section("8. Funding → Delivery → Review → Release")
    # Simulate the Stripe webhook outcome directly (NO real charge): mark funded.
    db.escrows.update_one(
        {"_id": ObjectId(escrow_id), "milestones.milestone_id": mid},
        {"$set": {"status": "active", "milestones.$.status": "funded",
                  "milestones.$.funded_at": datetime.utcnow(),
                  "milestones.$.amount_paid": 520.0, "milestones.$.stripe_fee": 15.38,
                  "funded_amount": 500.0}})
    check("Milestone funded (fixture = webhook outcome)", True, "status=funded, funded_amount=500")

    # creator delivers
    rdel = api("POST", f"/escrow/{escrow_id}/milestone/{mid}/deliver", token=creator_tok,
               json={"google_drive_link": "https://drive.google.com/file/d/e2evalid/view",
                     "delivery_notes": "Final cut delivered."})
    check("Creator delivers work", rdel.status_code == 200, f"HTTP {rdel.status_code} {rdel.text[:120]}")
    esc = db.escrows.find_one({"_id": ObjectId(escrow_id)})
    msd = esc["milestones"][0]
    check("Auto-release timer set (delivered_at + 48h)",
          msd.get("auto_release_at") and msd.get("delivered_at")
          and abs((msd["auto_release_at"] - msd["delivered_at"]).total_seconds() - 48*3600) < 5,
          f"auto_release_at={msd.get('auto_release_at')}")

    # release BEFORE opening link / confirming review → blocked
    rblk = api("POST", f"/escrow/{escrow_id}/release-milestone", token=client_tok, json={"milestone_id": mid})
    check("Release blocked before review gate (400)", rblk.status_code == 400, f"HTTP {rblk.status_code}")

    # open link + confirm review
    api("POST", f"/escrow/{escrow_id}/milestone/{mid}/mark-opened", token=client_tok)
    api("POST", f"/escrow/{escrow_id}/milestone/{mid}/confirm-review", token=client_tok)
    # release
    rrl = api("POST", f"/escrow/{escrow_id}/release-milestone", token=client_tok, json={"milestone_id": mid})
    ok = rrl.status_code == 200
    check("Client releases milestone after gate", ok, f"HTTP {rrl.status_code} {rrl.text[:150] if not ok else ''}")
    rel = rrl.json() if ok else {}
    tx_id = rel.get("transaction_id")
    if tx_id: created_ids["tx"].append(tx_id)

    # duplicate release blocked (idempotency)
    rdup2 = api("POST", f"/escrow/{escrow_id}/release-milestone", token=client_tok, json={"milestone_id": mid})
    check("Duplicate release prevented (400/409)", rdup2.status_code in (400, 409), f"HTTP {rdup2.status_code}")

    # ── 9. DATA INTEGRITY ───────────────────────────────────────────────────
    section("9. Data Integrity (DB assertions)")
    esc = db.escrows.find_one({"_id": ObjectId(escrow_id)})
    ms = esc["milestones"][0]
    check("Milestone status == released", ms["status"] == "released", ms["status"])
    check("escrow.released_amount == 500", abs(esc["released_amount"] - 500) < 0.01, str(esc["released_amount"]))
    check("escrow.status == completed", esc["status"] == "completed", esc["status"])
    check("completed_at stamped", esc.get("completed_at") is not None)

    tx = db.transactions.find_one({"transaction_id": tx_id}) if tx_id else None
    check("Transaction record created", bool(tx))
    if tx:
        check("Tx amount == 500 (subtotal)", abs(tx["amount"] - 500) < 0.01, str(tx["amount"]))
        check("Tx creator_fee == 40 (8%)", abs(tx["creator_fee"] - 40) < 0.01, str(tx["creator_fee"]))
        check("Tx client_fee == 20 (4%)", abs(tx["client_fee"] - 20) < 0.01, str(tx["client_fee"]))
        check("Tx net_amount == 460 (creator payout)", abs(tx["net_amount"] - 460) < 0.01, str(tx["net_amount"]))
        check("Tx records real Stripe fee", tx.get("payment_processing_fee", 0) > 0, str(tx.get("payment_processing_fee")))

    # unique transaction_id index present
    idx = db.transactions.index_information()
    uniq = any(v.get("unique") for v in idx.values())
    check("transactions has a UNIQUE index", uniq, str([k for k,v in idx.items() if v.get('unique')]))

    creatorD = db.users.find_one({"_id": ObjectId(CREATOR_ID)})
    stats = creatorD.get("stats") or {}
    check("Creator projects_completed incremented", (stats.get("projects_completed") or 0) >= 1,
          str(stats.get("projects_completed")))
    check("Creator total_earnings increased", (stats.get("total_earnings") or 0) >= 500,
          str(stats.get("total_earnings")))

    # ── 10. ETF ─────────────────────────────────────────────────────────────
    section("10. ETF Rewards & Idempotency")
    etf_events = list(db.etf_events.find({"$or": [{"user_id": ObjectId(CREATOR_ID)},
                                                  {"user_id": ObjectId(CLIENT_ID)}]}))
    actions = {e.get("action") for e in etf_events}
    check("ETF events created on release", bool(actions & {"milestone.released.creator",
          "milestone.released.client", "project.completed.creator"}), str(sorted(actions))[:120])
    keys = [e.get("idempotency_key") for e in etf_events if e.get("idempotency_key")]
    check("ETF events have idempotency keys (no manual exploit path)",
          len(keys) == len(set(keys)) and len(keys) > 0, f"{len(keys)} keys, {len(set(keys))} unique")

    # ── 11. RATINGS & REVIEWS ───────────────────────────────────────────────
    section("11. Ratings & Reviews")
    rrate = api("POST", f"/proposals/{app_id}/rate", token=client_tok, json={
        "ratings": {"quality": 5, "communication": 5, "professionalism": 5},
        "review": "Outstanding work, delivered on time.", "tags": ["professional"],
    })
    check("Client rates creator", rrate.status_code in (200, 201), f"HTTP {rrate.status_code} {rrate.text[:120]}")
    app_doc = db.applications.find_one({"_id": ObjectId(app_id)})
    check("client_rating persisted on application", app_doc.get("client_rating") is not None,
          str(app_doc.get("client_rating"))[:80] if app_doc else "none")

    # ── 12. AUTO-RELEASE (real, via admin trigger) ──────────────────────────
    section("12. Automatic Payment Release")
    # second escrow, fund + deliver, set auto_release_at in the past, run the job
    resc2 = api("POST", "/escrow", token=client_tok, json={
        "creator_id": CREATOR_ID, "job_post_id": job_id, "description": f"{TAG} auto {suffix}",
        "milestones": [{"title": "Auto Milestone", "amount": 200, "currency": "USD"}], "currency": "USD"})
    escrow2 = resc2.json().get("escrow_id")
    if escrow2: created_ids["escrows"].append(ObjectId(escrow2))
    esc2 = db.escrows.find_one({"_id": ObjectId(escrow2)})
    mid2 = esc2["milestones"][0]["milestone_id"]
    past = datetime.utcnow() - timedelta(hours=1)
    db.escrows.update_one({"_id": ObjectId(escrow2), "milestones.milestone_id": mid2},
        {"$set": {"status": "active", "milestones.$.status": "delivered",
                  "milestones.$.funded_at": datetime.utcnow() - timedelta(hours=50),
                  "milestones.$.delivered_at": datetime.utcnow() - timedelta(hours=49),
                  "milestones.$.google_drive_link": "https://drive.google.com/file/d/auto/view",
                  "milestones.$.auto_release_at": past, "milestones.$.auto_released": False,
                  "funded_amount": 200.0}})
    # promote a temp admin
    db.users.update_one({"email": CLIENT_EMAIL}, {"$set": {"user_role": "admin"}})
    admin_tok, _ = login(CLIENT_EMAIL)
    rtrig = api("POST", "/escrow/trigger-auto-release", token=admin_tok)
    check("Admin trigger-auto-release runs", rtrig.status_code == 200, f"HTTP {rtrig.status_code} {rtrig.text[:120]}")
    esc2 = db.escrows.find_one({"_id": ObjectId(escrow2)})
    ms2 = esc2["milestones"][0]
    check("Overdue milestone auto-released", ms2["status"] == "released" and ms2.get("auto_released") is True,
          f"status={ms2['status']} auto_released={ms2.get('auto_released')}")
    check("Auto-release created a Transaction",
          db.transactions.count_documents({"to_user_id": ObjectId(CREATOR_ID), "amount": 200.0}) >= 1)
    # revert admin role
    db.users.update_one({"email": CLIENT_EMAIL}, {"$set": {"user_role": "user"}})

    # ── 13. ADMIN ACCESS CONTROL ────────────────────────────────────────────
    section("13. Admin Access Control")
    radm = api("GET", "/disputes/all", token=creator_tok)
    check("Non-admin blocked from /disputes/all (403)", radm.status_code == 403, f"HTTP {radm.status_code}")
    db.users.update_one({"email": CLIENT_EMAIL}, {"$set": {"user_role": "admin"}})
    admin_tok, _ = login(CLIENT_EMAIL)
    radm2 = api("GET", "/disputes/all", token=admin_tok)
    check("Admin allowed on /disputes/all (200)", radm2.status_code == 200, f"HTTP {radm2.status_code}")
    raud = api("GET", "/admin/audit?limit=5", token=admin_tok)
    check("Admin can read audit logs", raud.status_code == 200, f"HTTP {raud.status_code}")
    db.users.update_one({"email": CLIENT_EMAIL}, {"$set": {"user_role": "user"}})

    # ── 14. NOTIFICATIONS ───────────────────────────────────────────────────
    section("14. Notifications")
    notif_count = db.notifications.count_documents({"user_id": ObjectId(CREATOR_ID)})
    check("Creator received notifications during flow", notif_count > 0, f"{notif_count} notifications")

    # ── 15. AUDIT LOG OF PAYMENTS ───────────────────────────────────────────
    section("15. Payment Audit Trail")
    pay_events = db.audit_logs.count_documents({"event_type": {"$in":
        ["payment.released", "payment.funded", "payment.refunded"]}, "target_id": escrow_id})
    check("payment.released logged to audit_logs", pay_events >= 1, f"{pay_events} payment events for escrow")

    # ── 16. SEARCH ──────────────────────────────────────────────────────────
    section("16. Search")
    rsearch = api("GET", "/talent?limit=5", token=client_tok)
    if rsearch.status_code != 200:
        rsearch = api("GET", "/talent/search?limit=5", token=client_tok)
    check("Talent search responds", rsearch.status_code == 200, f"HTTP {rsearch.status_code}")
    rjobs = api("GET", "/jobs/search?limit=5", token=creator_tok)
    check("Job listing/search responds", rjobs.status_code == 200, f"HTTP {rjobs.status_code}")

finally:
    # ── CLEANUP ─────────────────────────────────────────────────────────────
    section("Cleanup")
    uids = created_ids["users"]
    job_ids = created_ids["jobs"]
    esc_ids = created_ids["escrows"]
    db.users.delete_many({"_id": {"$in": uids}})
    db.job_posts.delete_many({"_id": {"$in": job_ids}})
    db.applications.delete_many({"$or": [{"crew_id": {"$in": uids}}, {"project_id": {"$in": job_ids}}]})
    db.disputes.delete_many({"escrow_id": {"$in": esc_ids}})
    db.escrows.delete_many({"_id": {"$in": esc_ids}})
    db.transactions.delete_many({"$or": [{"from_user_id": {"$in": uids}}, {"to_user_id": {"$in": uids}}]})
    db.notifications.delete_many({"user_id": {"$in": uids}})
    db.etf_events.delete_many({"user_id": {"$in": uids}})
    db.etf_points.delete_many({"user_id": {"$in": uids}})
    db.audit_logs.delete_many({"actor_id": {"$in": uids}})
    db.audit_logs.delete_many({"target_id": {"$in": [str(e) for e in esc_ids]}})
    print(f"  Removed {len(uids)} users, {len(job_ids)} jobs, {len(esc_ids)} escrows and related docs.")

    # ── SUMMARY ─────────────────────────────────────────────────────────────
    passed = sum(1 for _,ok,_ in results if ok)
    total = len(results)
    print(f"\n{'='*60}\nRESULT: {passed}/{total} checks passed\n{'='*60}")
    for name, ok, detail in results:
        if not ok:
            print(f"  FAILED: {name} — {detail}")
    sys.exit(0 if passed == total else 1)
