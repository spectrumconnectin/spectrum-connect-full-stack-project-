import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

async def send_email(to_email: str, subject: str, html_content: str):
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = settings.FROM_EMAIL
    msg['To'] = to_email
    
    html_part = MIMEText(html_content, 'html')
    msg.attach(html_part)
    
    try:
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False

def get_verification_email_html(username: str, verification_link: str):
    return f"""
    <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Spectrum Connect, {username}!</h2>
            <p>Please verify your email address to activate your account.</p>
            <a href="{verification_link}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                Verify Email
            </a>
            <p>Or copy this link: {verification_link}</p>
            <p>This link will expire in 24 hours.</p>
        </body>
    </html>
    """

def get_password_reset_email_html(username: str, reset_link: str):
    return f"""
    <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0;">Spectrum Connect</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
                <p style="color: #4b5563; font-size: 16px;">Hi {username},</p>
                <p style="color: #4b5563; font-size: 16px;">
                    We received a request to reset your password. Click the button below to create a new password:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #6b7280; font-size: 14px;">
                    Or copy and paste this link into your browser:<br>
                    <a href="{reset_link}" style="color: #667eea; word-break: break-all;">{reset_link}</a>
                </p>
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="color: #92400e; margin: 0; font-size: 14px;">
                        <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour.
                    </p>
                </div>
                <p style="color: #6b7280; font-size: 14px;">
                    If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                    © 2025 Spectrum Connect. All rights reserved.
                </p>
            </div>
        </body>
    </html>
    """
