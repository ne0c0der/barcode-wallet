# Barcode Wallet

Tiny installable web app: generate barcodes from text, save them locally, pull one up fullscreen to scan.

Built for the factory floor — badge logins, press check-ins, QA scans — but it's just a generic barcode wallet. Everything is stored in `localStorage` on the device. Nothing ever leaves your phone.

## Use

1. Open the app, type text, pick Code 128 or Code 39, hit Generate.
2. Save it with a label (e.g. "Login", "Press 12").
3. Tap **Scan** → fullscreen white barcode. Hold it up to the scanner.

Tip: crank brightness for stubborn laser scanners.

## Run it

No build step. Serve the folder statically, or just open `index.html`. It's a PWA — "Add to Home Screen" for the app experience, works offline via service worker.

Live: https://ne0c0der.github.io/barcode-wallet/

## Stack

- Vanilla HTML/CSS/JS, zero build
- [JsBarcode](https://github.com/lindell/JsBarcode) (vendored, MIT) for Code 128 / Code 39 rendering

## What's deliberately not here

- No accounts, no backend, no sync — local-first on purpose
- No QR codes (laser scanners on the floor read linear codes)
- No home-screen widget (would need a native app; parked until someone asks)
