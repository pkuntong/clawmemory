#!/bin/bash

# ============================================
# Delivery Date Estimator — Setup Script
# ============================================
# Run this AFTER you've done:
#   1. shopify app init (scaffolded the app)
#   2. shopify app generate extension (created theme extension)
#
# This script copies your custom files into the right places.
# ============================================

echo ""
echo "🚚 Delivery Date Estimator — Setup"
echo "==================================="
echo ""

# Check if we're in the right directory
if [ ! -f "shopify.app.toml" ]; then
    echo "❌ Error: shopify.app.toml not found."
    echo "   Make sure you're in your app's root directory."
    echo "   cd delivery-date-estimator"
    exit 1
fi

# Check if extension exists
if [ ! -d "extensions/delivery-date-widget" ]; then
    echo "❌ Error: extensions/delivery-date-widget/ not found."
    echo "   Run: shopify app generate extension"
    echo "   Type: Theme app extension"
    echo "   Name: delivery-date-widget"
    exit 1
fi

# Check if _custom-files exist
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CUSTOM_DIR="$SCRIPT_DIR/_custom-files"

if [ ! -d "$CUSTOM_DIR" ]; then
    echo "❌ Error: _custom-files/ directory not found."
    echo "   Make sure the _custom-files folder is in the same directory as this script."
    exit 1
fi

echo "📦 Copying widget file..."
# Remove any default liquid files in blocks/
rm -f extensions/delivery-date-widget/blocks/*.liquid
# Copy our widget
cp "$CUSTOM_DIR/delivery-timer.liquid" extensions/delivery-date-widget/blocks/
echo "   ✅ delivery-timer.liquid → extensions/delivery-date-widget/blocks/"

echo ""
echo "💰 Copying billing page..."
# Create routes directory if needed
mkdir -p app/routes
cp "$CUSTOM_DIR/app.billing.jsx" app/routes/
echo "   ✅ app.billing.jsx → app/routes/"

echo ""
echo "📋 Appending billing config to shopify.app.toml..."
# Check if billing config already exists
if grep -q "\[billing\]" shopify.app.toml; then
    echo "   ⚠️  Billing config already exists in shopify.app.toml, skipping."
else
    echo "" >> shopify.app.toml
    cat "$CUSTOM_DIR/billing-config-for-toml.txt" >> shopify.app.toml
    echo "   ✅ Billing plans added to shopify.app.toml"
fi

echo ""
echo "==================================="
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run: shopify app dev"
echo "  2. Open your dev store"
echo "  3. Go to: Online Store → Themes → Customize"
echo "  4. Navigate to a Product page"
echo "  5. Click 'Add block' → 'Delivery Date Estimator'"
echo "  6. Configure and Save"
echo ""
echo "🎉 You should see the widget on the product page!"
echo ""
