# QA Report — Smart Parts Billing V6

## Result

V6 web production build and Android web-to-native sync passed on 2026-08-30.

## Verified V6 changes

- Bright white and royal-blue design tokens are applied throughout the app.
- Navigation, cards, forms, item controls, tables, modals and action buttons have responsive V6 styles.
- Mobile layouts retain normal scrolling with no fixed bottom navigation.
- Existing invoice, parts, customers, settings, PDF, backup and local-storage flows remain wired to their original logic.
- Invoice PDF header, table and total accents now match the royal-blue V6 brand.
- The app-install control handles browser install prompts, installed state and manual Add to Home screen fallback.
- Branded 192 px, 512 px, maskable and Apple touch icons are present.

## PWA verification

- `npm run build` completed successfully with Vite.
- The PWA build generated `sw.js`, Workbox runtime and service-worker registration.
- 20 production entries were added to the offline precache.
- Manifest start URL and scope remain `/sonu-invoice/`.
- GitHub Pages continues to use the repository base path.

## Android verification

- Capacitor Android 6.2.1 project generated successfully.
- `npm run android:sync` completed successfully with relative native asset paths.
- Android package ID is `com.smartpartsbilling.app`.
- Android SDK target is API 34 and the project uses Java 17-compatible Gradle tooling.
- Royal-blue launcher icons and light branded splash assets were generated for all Android densities.
- Native Filesystem and Share plugins are synced for Android PDF save/open/WhatsApp actions.
- GitHub Actions includes a clean SDK setup, debug APK build and artifact upload workflow.

## Build environment note

The local workspace could not download the Gradle distribution because outbound access to `services.gradle.org` is blocked. APK compilation is therefore delegated to the included GitHub Actions runner, while the complete Android source and sync steps are verified locally.
