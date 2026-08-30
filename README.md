# Smart Parts Billing — V6

Responsive non-GST invoice and parts billing app for web, installable PWA and Android.

## V6 experience

- Bright white and royal-blue professional interface
- Larger readable controls and clear business-style action buttons
- Responsive desktop, tablet and phone layouts
- Dashboard, new invoice, invoice history, customers, Parts Master and settings
- 65-part searchable catalog, editable size/rate/quantity and custom items
- Professional A4 PDF preview, download and phone share/WhatsApp flow
- Local device persistence with JSON backup and restore
- Installable PWA with offline application shell and automatic updates
- Capacitor Android project with branded icon and splash screen
- Native Android PDF share/save flow for WhatsApp, Files and Drive
- GitHub Actions workflows for Pages deployment and downloadable debug APK

## Local web development

```bash
npm ci
npm run dev -- --host 0.0.0.0
```

Production checks:

```bash
npm run build
npm run android:sync
```

## Android

The native project is in `android/`. With Android SDK 34 and Java 17 installed:

```bash
npm run android:apk
```

The debug APK is created at:

`android/app/build/outputs/apk/debug/app-debug.apk`

Pushing to `main` also runs **Build Android APK V6** on GitHub. Download the artifact named **Smart-Parts-Billing-V6-APK** from the completed workflow run.

## Deployment

GitHub Pages base path remains `/sonu-invoice/` and the live URL remains:

`https://hindipro24-web.github.io/sonu-invoice/`
