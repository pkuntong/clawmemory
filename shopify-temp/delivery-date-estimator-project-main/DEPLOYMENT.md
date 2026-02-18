# Deployment & App Store Submission Guide

## Phase 1: Deploy Your App Server

Your Shopify app needs to be hosted somewhere. 
Easiest option: **Railway.app** (free tier available, ~$5/month after).

### Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project (run from your app's root folder)
railway init

# Add a Postgres database
railway add --plugin postgresql

# Deploy
railway up
```

After deploying, Railway gives you a URL like: `https://delivery-date-estimator.up.railway.app`

### Update Shopify with your production URL

```bash
shopify app config set --app-url https://YOUR-RAILWAY-URL.up.railway.app
```

Or manually update `shopify.app.toml`:
```toml
[app]
application_url = "https://YOUR-RAILWAY-URL.up.railway.app"
```

---

## Phase 2: Prepare App Store Listing

Go to: https://partners.shopify.com → Apps → Your App → Distribution

1. **Choose distribution:** Select "Shopify App Store"

2. **App listing info:**
   - Copy text from `APP_STORE_LISTING.md` in this project
   - Fill in all fields

3. **Screenshots (required, minimum 3):**
   
   HOW TO TAKE GOOD SCREENSHOTS:
   - Install the app on your dev store
   - Add some products with images  
   - Add the widget to a product page
   - Take full-page screenshots showing the widget
   - Screenshot the theme editor showing the settings panel
   - Screenshot mobile view
   
   Recommended sizes: 1600x900px or 1200x800px
   
   Tools: Chrome DevTools (Cmd+Shift+M for mobile), or CleanShot/Screenshot app

4. **App icon:** 
   - 1200x1200px square PNG
   - Simple, clean — a truck icon or clock with your brand color works great
   - Use Figma or Canva to make one quickly

5. **Privacy policy URL:**
   - Host the `privacy-policy.html` file somewhere public
   - Easy option: Create a GitHub Pages site or use your Railway deployment
   - Paste the URL in the listing

6. **Pricing:**
   - Set up Free, Pro ($7.99), and Premium ($14.99) plans
   - Make sure billing config is in your `shopify.app.toml`

---

## Phase 3: Pre-Submission Checklist

Before hitting "Submit for Review":

- [ ] App works on a clean dev store (fresh install)
- [ ] Widget displays correctly on product pages
- [ ] Countdown timer counts down and updates
- [ ] All settings work in the theme editor
- [ ] Widget looks good on mobile
- [ ] Widget works with Dawn theme (Shopify's default)
- [ ] Billing flow works (test charges)
- [ ] Privacy policy is accessible
- [ ] App icon uploaded (1200x1200)
- [ ] At least 3 screenshots uploaded
- [ ] All listing text filled in
- [ ] Support email is set and working
- [ ] `isTest: true` changed to `isTest: false` in billing code
- [ ] `test = true` changed to `test = false` in shopify.app.toml

---

## Phase 4: Submit for Review

1. Go to Partners Dashboard → Apps → Your App
2. Click "Submit for review"  
3. Include test instructions:
   
   ```
   Test Instructions:
   1. Install the app
   2. Go to Online Store → Themes → Customize
   3. Navigate to a product page template
   4. Click "Add block" in the product section
   5. Select "Delivery Date Estimator"  
   6. The widget appears with estimated delivery date and countdown
   7. Adjust settings (cutoff hour, shipping days, colors) to verify customization
   8. Save and preview on the storefront
   ```

4. Submit

**Review typically takes 3-7 business days.**
Shopify may request changes — respond quickly to stay in the queue.

---

## Phase 5: Post-Launch

### First Week
- Monitor for any bug reports
- Respond to every review within 24 hours
- Ask early users for reviews (politely, in-app)

### First Month  
- Add features based on feedback
- Track install/uninstall rates in Partners Dashboard
- Consider running Shopify App Store Ads ($50-100/month budget to start)

### Ongoing
- Ship updates regularly (shows activity in the app store)
- Keep adding value: more icons, more languages, analytics
- Good reviews compound — each one brings more installs

---

## Useful Links

- Partners Dashboard: https://partners.shopify.com
- App Store listing requirements: https://shopify.dev/docs/apps/store/requirements
- Billing API docs: https://shopify.dev/docs/apps/billing
- Theme Extensions docs: https://shopify.dev/docs/apps/build/online-store/theme-app-extensions
- Railway deployment: https://railway.app
- Shopify CLI reference: https://shopify.dev/docs/apps/tools/cli
