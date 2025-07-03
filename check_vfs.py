import os
import smtplib
from email.message import EmailMessage
from playwright.sync_api import sync_playwright
import requests
import urllib.parse as urlparse

# for local development, load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()


VFS_EMAIL = os.environ["VFS_EMAIL"]
VFS_PASSWORD = os.environ["VFS_PASSWORD"]
EMAIL_SENDER = os.environ["EMAIL_SENDER"]
EMAIL_SENDER_PASS = os.environ["EMAIL_SENDER_PASS"]
EMAIL_RECEIVER = os.environ["EMAIL_RECEIVER"]

def send_email():
    msg = EmailMessage()
    msg["Subject"] = "VFS Appointment Available"
    msg["From"] = EMAIL_SENDER
    msg["To"] = EMAIL_RECEIVER
    msg.set_content("Appointments may be available! Go check https://visa.vfsglobal.com/aus/en/ind/dashboard")

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(EMAIL_SENDER, EMAIL_SENDER_PASS)
        smtp.send_message(msg)

MAX_RETRIES = 3

def solve_turnstile_with_api(page_url, site_key):
    # Prepare the API URL with query parameters
    api_url = f"http://127.0.0.1:5000/turnstile?url={page_url}&sitekey={site_key}"
    
    print(f"📡 Sending GET request to Turnstile Solver API: {api_url}")
    
    # Send GET request to the API
    response = requests.get(api_url)

    if response.status_code == 200:
        # The response will contain the captcha solution token
        solution = response.json().get("token")
        if solution:
            print("✅ Turnstile Solver returned a token.")
            return solution
        else:
            print("❌ No token received from solver.")
            return None
    else:
        print(f"❌ Failed to solve Turnstile captcha: {response.text}")
        return None

# def safe_goto_login_and_auth(page):
#     for attempt in range(MAX_RETRIES):
#         print(f"🔁 Attempt {attempt + 1} to load login page...")

#         page.goto("https://visa.vfsglobal.com/aus/en/ind/login", timeout=60000)
#         page.wait_for_timeout(5000)

#         # Take screenshot for debugging
#         page.screenshot(path=f"login_attempt_{attempt+1}.png", full_page=True)

#         current_url = page.url
#         if "/page-not-found" in current_url:
#             print("⚠️ Redirected to /page-not-found, retrying...")
#             continue

#         # Try to dismiss cookie banner if present
#         try:
#             page.locator('button:has-text("Accept All Cookies")').click(timeout=3000)
#             print("✅ Clicked 'Accept All Cookies'")
#             page.wait_for_timeout(2000)  # Wait after cookie acceptance
#         except:
#             print("ℹ️ No cookie banner detected")

#         # Check if login form appears and fill it
#         try:
#             # Wait for the specific email input field (formcontrolname="username")
#             page.wait_for_selector('input[formcontrolname="username"]', timeout=10000)
#             print("✅ Login form detected")
            
#             # Fill in login details using the correct selectors
#             page.fill('input[formcontrolname="username"]', VFS_EMAIL)
#             page.fill('input[formcontrolname="password"]', VFS_PASSWORD)
#             print("✅ Filled login credentials")
            
#             # Handle Cloudflare Turnstile captcha using our solver
#             print("🔒 Looking for Cloudflare Turnstile captcha...")
#             try:
#                 # Check if turnstile container exists
#                 page.wait_for_selector('app-cloudflare-captcha-container', timeout=5000)
#                 print("🔒 Cloudflare Turnstile captcha detected")
                
#                 # Debug: inspect the page elements
#                 debug_page_elements(page)
                
#                 # Try multiple approaches to find and solve the turnstile
#                 turnstile_solved = False
                
#                 # Approach 1: Look for cf-turnstile div
#                 try:
#                     print("🔍 Approach 1: Looking for cf-turnstile div...")
#                     turnstile_element = page.locator("div[data-sitekey]").first
#                     if turnstile_element.is_visible(timeout=3000):
#                         sitekey = turnstile_element.get_attribute("data-sitekey")
#                         print(f"🔑 Found sitekey: {sitekey}")
#                         turnstile_token = solve_turnstile_on_page(page, sitekey, max_attempts=10)
#                         if turnstile_token:
#                             print("✅ Turnstile successfully solved!")
#                             turnstile_solved = True
#                 except Exception as e:
#                     print(f"⚠️ Approach 1 failed: {e}")
                
#                 # Approach 2: Look inside iframe for turnstile
#                 if not turnstile_solved:
#                     try:
#                         print("🔍 Approach 2: Looking inside iframes...")
#                         iframes = page.locator("iframe").all()
#                         for i, iframe in enumerate(iframes):
#                             try:
#                                 iframe_src = iframe.get_attribute("src")
#                                 if iframe_src and ("turnstile" in iframe_src or "cloudflare" in iframe_src):
#                                     print(f"🎯 Found Turnstile iframe {i+1}: {iframe_src[:50]}...")
#                                     # Click the iframe area
#                                     iframe.click(timeout=3000)
#                                     page.wait_for_timeout(3000)
#                                     turnstile_solved = True
#                                     break
#                             except:
#                                 continue
#                     except Exception as e:
#                         print(f"⚠️ Approach 2 failed: {e}")
                
#                 # Approach 3: Generic container click
#                 if not turnstile_solved:
#                     try:
#                         print("🔍 Approach 3: Clicking turnstile container...")
#                         container = page.locator("app-cloudflare-captcha-container").first
#                         if container.is_visible():
#                             container.click(timeout=3000)
#                             print("✅ Clicked Turnstile container")
#                             page.wait_for_timeout(5000)  # Wait longer for processing
#                             turnstile_solved = True
#                     except Exception as e:
#                         print(f"⚠️ Approach 3 failed: {e}")
                
#                 # Approach 4: Look for any element with turnstile-related attributes
#                 if not turnstile_solved:
#                     try:
#                         print("🔍 Approach 4: Looking for turnstile-related elements...")
#                         # Check for any div that might be a turnstile widget
#                         potential_elements = [
#                             "div[class*='turnstile']",
#                             "div[id*='turnstile']", 
#                             "[data-sitekey]",
#                             ".cf-turnstile"
#                         ]
#                         for selector in potential_elements:
#                             try:
#                                 element = page.locator(selector).first
#                                 if element.is_visible(timeout=2000):
#                                     print(f"🎯 Found potential turnstile with selector: {selector}")
#                                     element.click(timeout=3000)
#                                     page.wait_for_timeout(3000)
#                                     turnstile_solved = True
#                                     break
#                             except:
#                                 continue
#                     except Exception as e:
#                         print(f"⚠️ Approach 4 failed: {e}")
                
#                 if not turnstile_solved:
#                     print("❌ All turnstile approaches failed")
#                     # Don't continue to next retry, let it try the form submission anyway
                        
#             except:
#                 print("ℹ️ No Cloudflare Turnstile captcha detected")
            
#             # Handle regular reCAPTCHA if present
#             try:
#                 page.wait_for_selector('app-captcha-container', timeout=3000)
#                 print("🔒 reCAPTCHA detected")
#                 # Click on reCAPTCHA checkbox
#                 recaptcha_frame = page.frame_locator('iframe[src*="recaptcha"]').first
#                 if recaptcha_frame:
#                     recaptcha_frame.locator('div[role="checkbox"]').click(timeout=10000)
#                     print("✅ Clicked reCAPTCHA checkbox")
#                     page.wait_for_timeout(3000)
#             except:
#                 print("ℹ️ No reCAPTCHA detected")
            
#             # Wait for Sign In button to be enabled (it starts disabled)
#             print("⏳ Waiting for Sign In button to become enabled...")
#             page.wait_for_function(
#                 "document.querySelector('button:has-text(\"Sign In\")') && !document.querySelector('button:has-text(\"Sign In\")').disabled",
#                 timeout=30000
#             )
#             print("✅ Sign In button is now enabled")
            
#             # Click the Sign In button
#             page.click('button:has-text("Sign In")')
#             print("✅ Clicked Sign In button")
            
#             # Take screenshot after login attempt
#             page.screenshot(path="after_login_click.png", full_page=True)
            
#             return True
            
#         except Exception as e:
#             print(f"⚠️ Login form or authentication failed: {e}")
#             continue

#     print("❌ All login attempts failed.")
#     return False

def smart_login(page):
    for attempt in range(1, MAX_RETRIES + 1):
        print(f"🔁 Attempt {attempt} to reach login page...")
        page.goto("https://visa.vfsglobal.com/aus/en/ind/login", timeout=60000)
        page.wait_for_timeout(5000)
        current_url = page.url
        page.screenshot(path=f"login_attempt_{attempt}.png", full_page=True)

        if "page-not-found" in current_url:
            print("⚠️ Redirected to page-not-found, retrying...")
            continue

        # Accept cookies
        try:
            page.locator('button:has-text("Accept All Cookies")').click(timeout=3000)
            print("✅ Accepted cookies.")
        except:
            print("ℹ️ No cookies prompt.")

        # Wait for login fields
        try:
            print("⏳ Waiting for login form...")
            page.wait_for_selector('input[formcontrolname="username"]', timeout=10000)
            page.wait_for_selector('input[formcontrolname="password"]', timeout=10000)
            print("✅ Found login fields.")

            # Fill login info
            page.fill('input[formcontrolname="username"]', VFS_EMAIL)
            page.fill('input[formcontrolname="password"]', VFS_PASSWORD)

            def detect_turnstile_iframe(page):
                return page.query_selector('iframe[src*="turnstile"]')

            # First attempt to detect Turnstile
            turnstile_iframe = detect_turnstile_iframe(page)

            if not turnstile_iframe:
                print("⏳ Turnstile iframe not found yet. Waiting 10 seconds...")
                page.wait_for_timeout(10000)
                turnstile_iframe = detect_turnstile_iframe(page)

            # Retry logic: Reload the page and restart loop
            if not turnstile_iframe:
                print("🔄 Still no Turnstile iframe. Refreshing login page...")
                continue

            # Now handle Turnstile normally
            iframe_src = turnstile_iframe.get_attribute("src")
            site_key = urlparse.parse_qs(urlparse.urlparse(iframe_src).query).get("k", [""])[0]

            print("🔍 Found Turnstile iframe with sitekey:", site_key)

            # Solve captcha
            token = solve_turnstile_with_api(page.url, site_key)
            if token:
                page.evaluate("""
                    (token) => {
                        document.querySelector('input[name="cf-turnstile-response"]').value = token;
                    }
                """, token)
                print("✅ Token injected into Turnstile response field.")
            else:
                print("❌ Turnstile solver failed.")
                continue


            # Wait for sign-in button to become enabled
            sign_in_button = page.locator('button:has-text("Sign In")')
            for _ in range(10):
                if not sign_in_button.is_disabled():
                    print("✅ Sign In button enabled.")
                    break
                page.wait_for_timeout(1000)
            else:
                print("❌ Sign In button never enabled.")
                continue

            sign_in_button.click()
            page.wait_for_url("**/dashboard", timeout=60000)
            print("✅ Login successful. On dashboard.")
            return True

        except Exception as e:
            print(f"⚠️ Login fields or validation failed: {e}")

    print("❌ All login attempts failed.")
    return False


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = browser.new_context(user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/116.0.0.0 Safari/537.36"
        ))
        page = context.new_page()

        if not smart_login(page):
            print("❌ Failed to complete login process after retries.")
            return

        # Wait for successful login and dashboard redirect
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
