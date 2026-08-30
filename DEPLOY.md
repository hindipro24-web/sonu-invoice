# V6 deploy with Termux

Download `smart-parts-billing-v6.zip` into the phone's Downloads folder, then run:

```bash
termux-setup-storage
pkg install git nodejs-lts unzip -y

cd ~/sonu-invoice || exit 1
git stash push -m "before-v6-install"
git pull --ff-only origin main || exit 1

unzip -o ~/storage/downloads/smart-parts-billing-v6.zip -d ~/sonu-invoice || exit 1

npm install || exit 1
npm run build || exit 1

git add .
git commit -m "Release Smart Parts Billing V6"
git push origin main
```

After the push:

1. Open the repository's **Actions** tab.
2. Wait for **Deploy Smart Billing V6** and **Build Android APK V6** to turn green.
3. Website: `https://hindipro24-web.github.io/sonu-invoice/`
4. APK: open **Build Android APK V6**, then download **Smart-Parts-Billing-V6-APK** from Artifacts.

If Chrome still shows the old design, close every open app tab and reopen the URL once. The V6 service worker will then activate the latest files.
