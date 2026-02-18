# Delivery Date Estimator — Cursor Setup Guide

## Open this folder in Cursor, then follow these 3 steps.

---

## STEP 1: Scaffold the Shopify app (in Cursor's terminal)

Open Cursor's terminal (Ctrl+` or Cmd+`) and run:

```bash
shopify app init
```

When prompted:
- **App name:** delivery-date-estimator  
- **Template:** React Router (the first/recommended option)
- Wait for install to finish (~2 minutes)

Then:
```bash
cd delivery-date-estimator
```

---

## STEP 2: Generate the theme extension

Still in terminal:
```bash
shopify app generate extension
```

When prompted:
- **Type:** Theme app extension
- **Name:** delivery-date-widget

---

## STEP 3: Copy the widget file

After Step 2, you'll see this folder in your project:
```
extensions/delivery-date-widget/blocks/
```

There will be a default `.liquid` file in there (like `star_rating.liquid`).

**Delete that default file.**

Then copy `delivery-timer.liquid` from the `_custom-files/` folder 
in this project into that `blocks/` folder.

Your final structure should look like:
```
delivery-date-estimator/
├── extensions/
│   └── delivery-date-widget/
│       └── blocks/
│           └── delivery-timer.liquid    ← THIS IS THE WIDGET
├── app/
│   └── routes/
├── ...other scaffolded files
```

---

## STEP 4: Run it

```bash
shopify app dev
```

First time it will:
- Ask you to log in to your Shopify Partner account
- Connect to your dev store
- Create a tunnel and start the server

Once running, go to your dev store:
1. Online Store → Themes → Customize
2. Navigate to a Product page template
3. Click "Add block"  
4. Find "Delivery Date Estimator"
5. Configure settings (cutoff hour, shipping days, etc.)
6. Save

You should see the widget with a live countdown timer on the product page!

---

## What Each File Does

| File | Purpose |
|------|---------|
| `_custom-files/delivery-timer.liquid` | The storefront widget (HTML + CSS + JS + Shopify config) |
| `_custom-files/billing.js` | Subscription billing route (how you get paid) |
| `_custom-files/privacy-policy.html` | Required privacy policy page |
| `APP_STORE_LISTING.md` | Copy/paste text for your App Store listing |
| `DEPLOYMENT.md` | How to deploy and submit to the App Store |

---

## Need Help?

If you get stuck on any step, paste the error into Cursor's AI chat 
or bring it back to Claude. Most common issues:

- **"shopify: command not found"** → Run `npm install -g @shopify/cli`
- **"No dev store found"** → Create one at partners.shopify.com → Stores → Add store → Development store
- **Extension not showing** → Make sure `delivery-timer.liquid` is in the `blocks/` folder, then restart `shopify app dev`
