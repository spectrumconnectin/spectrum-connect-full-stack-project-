import httpx
from app.core.config import settings

FROM_ADDRESS = "Spectrum Connect <onboarding@resend.dev>"

async def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """Send an email via Resend API."""
    api_key = getattr(settings, "RESEND_API_KEY", "")
    if not api_key:
        print(f"[email] RESEND_API_KEY not set — skipping send to {to_email}")
        return False
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"from": FROM_ADDRESS, "to": [to_email], "subject": subject, "html": html_content},
                timeout=10,
            )
        if resp.status_code in (200, 201):
            print(f"[email] Sent '{subject}' to {to_email}")
            return True
        else:
            print(f"[email] Resend error {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        print(f"[email] Exception sending to {to_email}: {e}")
        return False


def get_otp_email_html(username: str, otp: str) -> str:
    return f"""
    <html>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:32px;text-align:center;">
                <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">Spectrum Connect</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 48px;">
                <h2 style="color:#111827;margin:0 0 8px;">Verify your email</h2>
                <p style="color:#6b7280;font-size:15px;margin:0 0 32px;">Hi {username}, use the code below to verify your account.</p>
                <div style="background:#f5f3ff;border:2px solid #7c3aed;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px;">
                  <div style="font-size:40px;font-weight:800;letter-spacing:12px;color:#4c1d95;font-family:monospace;">{otp}</div>
                  <div style="color:#7c3aed;font-size:13px;margin-top:8px;">Expires in 10 minutes</div>
                </div>
                <p style="color:#9ca3af;font-size:13px;margin:0;">If you didn&apos;t create a Spectrum Connect account, you can safely ignore this email.</p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;padding:20px 48px;border-top:1px solid #e5e7eb;">
                <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">&copy; 2025 Spectrum Connect. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """


def get_verification_email_html(username: str, verification_link: str) -> str:
    return f"""
    <html>
    <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2>Welcome to Spectrum Connect, {username}!</h2>
        <p>Please verify your email address to activate your account.</p>
        <a href="{verification_link}" style="display:inline-block;padding:12px 24px;background:#667eea;color:white;text-decoration:none;border-radius:6px;margin:20px 0;">
            Verify Email
        </a>
        <p>Or copy this link: {verification_link}</p>
        <p>This link will expire in 24 hours.</p>
    </body>
    </html>
    """


def get_password_reset_email_html(username: str, reset_link: str) -> str:
    return f"""
    <html>
    <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;border-radius:10px 10px 0 0;text-align:center;">
            <h1 style="color:white;margin:0;">Spectrum Connect</h1>
        </div>
        <div style="background:#f9fafb;padding:30px;border-radius:0 0 10px 10px;">
            <h2 style="color:#1f2937;margin-top:0;">Password Reset Request</h2>
            <p style="color:#4b5563;font-size:16px;">Hi {username},</p>
            <p style="color:#4b5563;font-size:16px;">Click the button below to create a new password:</p>
            <div style="text-align:center;margin:30px 0;">
                <a href="{reset_link}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">
                    Reset Password
                </a>
            </div>
            <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin:20px 0;border-radius:4px;">
                <p style="color:#92400e;margin:0;font-size:14px;"><strong>This link expires in 1 hour.</strong></p>
            </div>
            <p style="color:#6b7280;font-size:14px;">If you didn&apos;t request a reset, you can safely ignore this email.</p>
        </div>
    </body>
    </html>
    """
