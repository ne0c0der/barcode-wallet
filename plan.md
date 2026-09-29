# Barcode Wallet — plan.md

## What it is
A tiny PWA that generates linear barcodes from text, saves them locally on the
device, and shows any saved code fullscreen (pure white, max contrast) for
scanning. Purpose: stop retyping badge IDs / logins / press numbers on the
factory floor. Pull out phone → tap → scan.

This is a **reputation tool, not a product**. It demonstrates resourcefulness
at work. Keep it small, keep it maintained, don't let it grow a roadmap.

## V1 (shipped)
- Generate Code 128 (default, accepts any text) and Code 39
- Save with label → localStorage; saved list shows each barcode inline like notes
- Tap any saved code for the fullscreen scan overlay (pure white, max contrast)
- PWA: manifest, service worker (offline), installable
- Vendored JsBarcode (MIT) — no CDN dependency at runtime

## Deployment
- GitHub Pages from `main`, free. URL: ne0c0der.github.io/barcode-wallet
- No custom domain — after "Add to Home Screen" the URL is invisible anyway.
  Not worth money or decision-energy for a personal utility.

## Parked (only if someone asks)
- Home-screen widget → needs a native app, out of scope for a web tool
- QR codes → floor laser scanners read linear codes; skip
- Sync across devices → conflicts with the local-first privacy story; skip
- Sharing codes with other leads → send them the link, they save their own

## Done criteria
- Opens on phone, installs, works offline
- A saved login barcode scans first try on the floor scanners
- Other leads can use it from a link with zero explanation
