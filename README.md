# VFS Appointment Checker

My dad told my mom to check the VFS Global website every morning so I built this automation tool for her.

## Features

- 🔄 Automated VFS Global appointment checking
- 🔒 **Cloudflare Turnstile CAPTCHA solver** (integrated from [Turnstile-Solver](https://github.com/Theyka/Turnstile-Solver))
- 📧 Email notifications when appointments are available
- 🖼️ Debug screenshots for troubleshooting
- ⚡ GitHub Actions automation for daily checks
- 🛡️ Robust error handling and retry logic

## Setup Instructions

### Quick Setup (Recommended)

Run the automated setup script:

```bash
./setup.sh
```

### Manual Setup

1. **Ensure Python 3.8+ is installed** on your system

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Install browsers:**
   ```bash
   # Playwright browsers
   python -m playwright install --with-deps
   
   # Patchright browsers (for Turnstile solver)
   python -m patchright install chromium
   
   # Optional: Camoufox (better stealth)
   python -m camoufox fetch
   ```

4. **Configure environment variables** in `.env` file:
   ```env
   VFS_EMAIL=your_email@example.com
   VFS_PASSWORD=your_password
   EMAIL_SENDER=sender@gmail.com
   EMAIL_SENDER_PASS=app_password
   EMAIL_RECEIVER=receiver@example.com
   ```

## Usage

### Local Testing

1. **Test the Turnstile solver:**
   ```bash
   python test_turnstile.py
   ```

2. **Run the VFS checker:**
   ```bash
   python check_vfs.py
   ```

### GitHub Actions (Automated)

The checker runs automatically every day at 7:10 PM Bangladesh time via GitHub Actions. Configure these secrets in your repository:

- `VFS_EMAIL` - Your VFS Global email
- `VFS_PASSWORD` - Your VFS Global password  
- `EMAIL_SENDER` - Gmail address for sending notifications
- `EMAIL_SENDER_PASS` - Gmail app password
- `EMAIL_RECEIVER` - Email address to receive notifications

## Turnstile Solver Integration

This project incorporates a sophisticated Cloudflare Turnstile solver based on the [Turnstile-Solver](https://github.com/Theyka/Turnstile-Solver) repository. The solver:

- ✅ Automatically detects Turnstile challenges
- 🎯 Extracts sitekeys from the DOM  
- 🤖 Solves challenges using browser automation
- 🔄 Includes fallback mechanisms for reliability
- 📊 Provides detailed logging and debugging

## Troubleshooting

- **Screenshots**: Check generated `.png` files for debugging
- **Logs**: Review terminal output for detailed error messages
- **Turnstile Issues**: Run `python test_turnstile.py` to test the solver
- **Browser Issues**: Try different browser types (chromium, chrome, camoufox)

## Disclaimer

This tool is for educational purposes. Users are responsible for complying with VFS Global's terms of service and any applicable laws. The integrated Turnstile solver follows the CC BY-NC 4.0 license from the original repository.
