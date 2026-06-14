# Tauri updater signing

Generate a key pair once (replace the password):

```powershell
npm run tauri signer generate -- -w scripts/tauri-signing.key --ci --force -p "YOUR_STRONG_PASSWORD"
```

1. Copy the public key into `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`.
2. Commit `scripts/tauri-signing.key.pub` only (private key is gitignored).
3. Add GitHub secrets:
   - `TAURI_SIGNING_PRIVATE_KEY` — full contents of `scripts/tauri-signing.key`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — the password from step 1

Verify locally before publishing secrets:

```powershell
echo "test" > scripts/sign-test.txt
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content scripts/tauri-signing.key -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "YOUR_STRONG_PASSWORD"
npm run tauri signer sign -- scripts/sign-test.txt
```

Check that GitHub releases use the same key pair (must match `scripts/tauri-signing.key.pub`):

```powershell
$env:RELEASE_TAG = "v1.1.0"
npm run verify:signing-key
npm run verify:release-signatures
```

Both commands should pass. `verify:release-signatures` downloads each installer and checks the
cryptographic signature (not just the key id).

If `verify:signing-key` reports a **signing key mismatch**, the Release workflow secret does not
match `tauri.conf.json`. If it passes but the app still fails, install the latest setup.exe from
GitHub Releases once (your installed build may predate a fixed feed).

Publish a release: bump versions, push tag `vX.Y.Z`, wait for the Release workflow.
