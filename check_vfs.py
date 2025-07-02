import os
import smtplib
from email.message import EmailMessage
from playwright.sync_api import sync_playwright

# for local development, load environment variables from .env file
# from dotenv import load_dotenv
# load_dotenv()


VFS_EMAIL = os.environ["VFS_EMAIL"]
VFS_PASSWORD = os.environ["VFS_PASSWORD"]
EMAIL_SENDER = os.environ["EMAIL_SENDER"]
EMAIL_SENDER_PASS = os.environ["EMAIL_SENDER_PASS"]
EMAIL_RECEIVER = os.environ["EMAIL_RECEIVER"]

def send_email():
    msg = EmailMessage()
    msg["Subject"] = "✅ VFS Appointment Available"
    msg["From"] = EMAIL_SENDER
    msg["To"] = EMAIL_RECEIVER
    msg.set_content("Appointments may be available! Go check https://visa.vfsglobal.com/aus/en/ind/dashboard")

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(EMAIL_SENDER, EMAIL_SENDER_PASS)
        smtp.send_message(msg)

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Login
        page.goto("https://visa.vfsglobal.com/aus/en/ind/login")

        # Wait for login form to appear
        page.wait_for_selector('input[name="email"]', timeout=60000)
        page.screenshot(path="login_page.png", full_page=True)

        # Fill in login details
        page.fill('input[name="email"]', VFS_EMAIL)
        page.fill('input[name="password"]', VFS_PASSWORD)

        # Wait for Sign In button then click it
        page.wait_for_selector('button:has-text("Sign In")', timeout=60000)
        page.click('button:has-text("Sign In")')

        page.wait_for_url("**/dashboard", timeout=60000)

        # Navigate to application detail page
        page.goto("https://visa.vfsglobal.com/aus/en/ind/application-detail")

        # Select options
        page.select_option('select[formcontrolname="applicationCenter"]', label="India Passport and Visa Services Center-Melbourne")
        page.select_option('select[formcontrolname="appointmentCategory"]', label="Passport Services")
        page.select_option('select[formcontrolname="subCategory"]', label="Passport Application")

        # Wait and check for slot status message
        page.wait_for_timeout(3000)  # Let the page load message
        text = page.inner_text("div.alert.alert-info")

        if "no appointment slots" not in text.lower():
            send_email()

        browser.close()

if __name__ == "__main__":
    main()
