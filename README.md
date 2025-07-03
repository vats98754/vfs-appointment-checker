# VFS Appointment Checker

My dad told my mom to check the VFS Global website every morning so I built this automation tool for her.

## 🚀 NEW: Improved Node.js Version (Recommended)

The **Node.js version (`index.js`)** is now the recommended approach as it successfully **bypasses Cloudflare protection** using Puppeteer with a real browser instance. This version is more reliable than the Python implementation for handling modern web protections.

### Quick Start (Node.js)

```bash
# 1. Install dependencies
npm install

# 2. Create .env file with your credentials
# VFS_EMAIL=your_email@example.com
# VFS_PASSWORD=your_password
# EMAIL_SENDER=sender@gmail.com
# EMAIL_SENDER_PASS=app_password
# EMAIL_RECEIVER=receiver@example.com

# 3. Run the checker
node index.js
```

## Features

- 🔄 Automated VFS Global appointment checking
- �️ **Superior Cloudflare bypass** using real browser automation (Node.js version)
- 🔒 **Turnstile CAPTCHA solver** (Python version with integrated [Turnstile-Solver](https://github.com/Theyka/Turnstile-Solver))
- 📧 Email notifications when appointments are available
- 🖼️ Debug screenshots for troubleshooting
- ⚡ GitHub Actions automation for daily checks
- 🛡️ Robust error handling and retry logic

## Setup Instructions

### Node.js Version (Recommended - Better Cloudflare Bypass)

The Node.js version uses Puppeteer with a real browser to successfully bypass Cloudflare protection.

1. **Ensure Node.js 16+ is installed** on your system

2. **Install dependencies:**
   ```bash
   npm install
   ```
   
   This will install:
   - `puppeteer-real-browser` - Real browser automation
   - `nodemailer` - Email notifications
   - `dotenv` - Environment variable management

3. **Configure environment variables** in `.env` file:
   ```env
   VFS_EMAIL=your_email@example.com
   VFS_PASSWORD=your_password
   EMAIL_SENDER=sender@gmail.com
   EMAIL_SENDER_PASS=app_password
   EMAIL_RECEIVER=receiver@example.com
   ```

4. **Run the checker:**
   ```bash
   node index.js
   ```

### Python Version (Alternative)

This version includes Turnstile solver but may struggle with newer Cloudflare protections.

**Note**: The Turnstile Solver is included as a Git submodule. If you're cloning fresh, run:
```bash
git submodule update --init --recursive
```

#### Quick Setup (Recommended)

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

### Node.js Version (Recommended)

```bash
node index.js
```

The Node.js version will:
- Launch a real browser instance with Puppeteer
- Automatically handle Cloudflare protection
- Navigate through the VFS login process
- Take debug screenshots at each step
- Send email notifications when appointments are found

### Python Version

#### Local Testing

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

## Key Advantages of Node.js Version

- ✅ **Better Cloudflare Bypass**: Uses real browser automation instead of headless detection
- 🚀 **Higher Success Rate**: More reliable login and navigation
- 📸 **Comprehensive Debugging**: Automatic screenshots at every step
- 🔄 **Smart Retry Logic**: Robust error handling with multiple retry attempts
- 🎯 **Real Browser Behavior**: Mimics actual user interactions
- 📧 **Email Integration**: Built-in notification system

## Turnstile Solver Integration (Python Version)

This project incorporates a Cloudflare Turnstile solver based on the [Turnstile-Solver](https://github.com/Theyka/Turnstile-Solver) repository, included as a Git submodule in the `Turnstile-Solver/` directory. The solver:

- ✅ Automatically detects Turnstile challenges
- 🎯 Extracts sitekeys from the DOM  
- 🤖 Solves challenges using browser automation
- 🔄 Includes fallback mechanisms for reliability
- 📊 Provides detailed logging and debugging

### Setting up the Turnstile Solver submodule

If you're cloning this repository fresh, initialize the submodule:

```bash
# After cloning the main repository
git submodule update --init --recursive
```

If you've already cloned and need to add the submodule:

```bash
# Remove the existing directory first
git rm --cached Turnstile-Solver
rm -rf Turnstile-Solver

# Add as proper submodule
git submodule add https://github.com/Theyka/Turnstile-Solver.git Turnstile-Solver
```

## Troubleshooting

### Node.js Version
- **Screenshots**: Check generated `.png` files for step-by-step debugging
- **Browser Issues**: Ensure you have Chrome/Chromium installed
- **Dependencies**: Run `npm install` to ensure all packages are installed
- **Environment**: Verify `.env` file has all required variables

### Python Version
- **Screenshots**: Check generated `.png` files for debugging
- **Logs**: Review terminal output for detailed error messages
- **Turnstile Issues**: Run `python test_turnstile.py` to test the solver
- **Browser Issues**: Try different browser types (chromium, chrome, camoufox)

## Disclaimer

This tool is for educational purposes. Users are responsible for complying with VFS Global's terms of service and any applicable laws. The integrated Turnstile solver follows the CC BY-NC 4.0 license from the original repository.
