#!/bin/bash

# Certificate Trust Setup Script for macOS
# This script helps you trust the auto-generated CA certificate

set -e

CERT_PATH="../certs/ca-cert.pem"
CERT_NAME="Proxy Traffic MCP CA"

echo "🔐 CERTIFICATE TRUST SETUP FOR macOS"
echo "====================================="
echo ""

# Check if certificate exists
if [ ! -f "$CERT_PATH" ]; then
    echo "❌ Certificate not found at $CERT_PATH"
    echo "   Run: npm run generate-certs"
    exit 1
fi

echo "✅ Certificate found: $CERT_PATH"
echo ""

# Display certificate info
echo "📋 Certificate Information:"
echo "=========================="
openssl x509 -in "$CERT_PATH" -subject -issuer -dates -noout
echo ""

echo "🔧 TRUST SETUP OPTIONS:"
echo "======================="
echo ""
echo "Option 1: Automatic Setup (Recommended)"
echo "----------------------------------------"
echo "This will add the certificate to your system keychain and mark it as trusted."
echo ""
read -p "Do you want to automatically trust this certificate? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🔧 Adding certificate to system keychain..."
    
    # Add certificate to system keychain and mark as trusted
    sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$CERT_PATH"
    
    if [ $? -eq 0 ]; then
        echo "✅ Certificate successfully added and trusted!"
        echo ""
        echo "🧪 Testing certificate trust..."
        
        # Verify the certificate was added
        if security find-certificate -c "$CERT_NAME" /Library/Keychains/System.keychain > /dev/null 2>&1; then
            echo "✅ Certificate found in system keychain"
        else
            echo "⚠️  Certificate added but verification failed"
        fi
    else
        echo "❌ Failed to add certificate. You may need to enter your password."
        exit 1
    fi
else
    echo ""
    echo "📋 Manual Setup Instructions:"
    echo "============================="
    echo ""
    echo "1. Open Keychain Access:"
    echo "   Applications → Utilities → Keychain Access"
    echo ""
    echo "2. Import the certificate:"
    echo "   File → Import Items → Select: $PWD/$CERT_PATH"
    echo ""
    echo "3. Trust the certificate:"
    echo "   a. Find '$CERT_NAME' in the certificate list"
    echo "   b. Double-click to open certificate details"
    echo "   c. Expand the 'Trust' section"
    echo "   d. Set 'When using this certificate' to 'Always Trust'"
    echo "   e. Close the window and enter your password"
    echo ""
fi

echo ""
echo "🌐 BROWSER SETUP:"
echo "================="
echo ""
echo "After trusting the CA certificate, you need to:"
echo ""
echo "1. Restart your browser completely"
echo "2. Configure browser to use the proxy:"
echo "   - HTTP Proxy: 127.0.0.1:8080"
echo "   - HTTPS Proxy: 127.0.0.1:8080"
echo ""
echo "3. Test with an HTTPS site:"
echo "   - Visit: https://httpbin.org/get"
echo "   - Should show no SSL warnings"
echo ""

echo "🧪 VERIFICATION COMMANDS:"
echo "========================"
echo ""
echo "Check if certificate is trusted:"
echo "  security find-certificate -c '$CERT_NAME' /Library/Keychains/System.keychain"
echo ""
echo "Test proxy with curl:"
echo "  curl -x http://localhost:8080 https://httpbin.org/get"
echo ""
echo "Remove certificate (if needed):"
echo "  sudo security delete-certificate -c '$CERT_NAME' /Library/Keychains/System.keychain"
echo ""

echo "✅ Setup complete! Your browser should now trust on-the-fly generated certificates."
echo ""
