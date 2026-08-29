# Deploy with Termux

Assuming this ZIP is downloaded to `~/storage/downloads/` and your existing repository is `~/sonu-invoice`:

```bash
cd ~ || exit 1
rm -rf ~/billing-final-extract
mkdir -p ~/billing-final-extract

unzip -o ~/storage/downloads/smart-parts-billing-final-client-v5.1.zip \
-d ~/billing-final-extract || exit 1

cd ~/sonu-invoice || exit 1
find . -mindepth 1 -maxdepth 1 ! -name ".git" -exec rm -rf {} +
cp -r ~/billing-final-extract/. . || exit 1

git add .
git commit -m "Deploy Smart Parts Billing Final v5.1"
git push origin main
```

Then check GitHub Actions. The live URL remains:
`https://hindipro24-web.github.io/sonu-invoice/`
