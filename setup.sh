#!/bin/bash
# Setup script for VFS Appointment Checker with Turnstile Solver

echo "🚀 Setting up VFS Appointment Checker with Turnstile Solver..."

# Check Python version
echo "🐍 Checking Python version..."
python3 --version || { echo "❌ Python 3.8+ is required!"; exit 1; }

# Install dependencies
echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
python3 -m playwright install --with-deps

# Install Patchright browsers (for turnstile solver)
echo "🔧 Installing Patchright browsers..."
python3 -m patchright install chromium

# Optional: Install Camoufox (alternative browser for better stealth)
echo "🦊 Installing Camoufox (optional)..."
python3 -m camoufox fetch || echo "⚠️ Camoufox installation failed (optional)"

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Configure your environment variables in .env file:"
echo "   - VFS_EMAIL=your_email@example.com"
echo "   - VFS_PASSWORD=your_password"
echo "   - EMAIL_SENDER=sender@gmail.com"
echo "   - EMAIL_SENDER_PASS=app_password"
echo "   - EMAIL_RECEIVER=receiver@example.com"
echo ""
echo "2. Test the turnstile solver:"
echo "   python3 test_turnstile.py"
echo ""
echo "3. Run the VFS checker:"
echo "   python3 check_vfs.py"
echo ""
echo "📚 For troubleshooting, check the screenshots generated in the directory."
