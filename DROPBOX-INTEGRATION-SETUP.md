# OneNation SVG — Dropbox OAuth and staged asset sync

The Dropbox integration runs on the canonical Cloudflare Pages production domain. OAuth tokens remain server-side and are encrypted before storage.

## OAuth endpoints

- `/api/dropbox/connect` starts Dropbox's server-side authorization-code flow and sets a short-lived, HttpOnly, Secure, SameSite=Lax state cookie.
- `/api/dropbox/callback` validates the one-time state, exchanges the authorization code server-side, and stores the encrypted offline token in Cloudflare KV.
- `/api/dropbox/status` reports only whether a token record exists; it never returns credentials.
- `functions/_shared/dropbox.js` encrypts/decrypts the token record and refreshes short-lived access tokens.

The exact registered callback URI is:

`https://onenationsvg.dpdns.org/api/dropbox/callback`

Keep the Dropbox app in Development while testing. Do not expose the app secret or access/refresh tokens in GitHub, HTML, browser JavaScript, public issues, or chat.

## Cloudflare Pages production configuration

Project: `onenationsvg-git` (production branch: `main`).

Required production settings:
- KV binding: `DROPBOX_KV`
- Variable: `DROPBOX_APP_KEY`
- Secret: `DROPBOX_APP_SECRET`
- Secret: `DROPBOX_SYNC_SECRET`
- Secret: `GITHUB_TOKEN`

The app secret is also used to derive the encryption key for the stored token. Do not rotate it without migrating or re-authorizing the stored token.

## Dropbox-to-GitHub sync

The authenticated POST endpoint is `/api/dropbox/sync?batch=N`. It requires an Authorization bearer value matching the server-side `DROPBOX_SYNC_SECRET`. The GitHub Actions workflow `.github/workflows/dropbox-sync.yml` invokes this endpoint manually or on its daily schedule.

The sync is deliberately staged:
- It writes only to `staging/dropbox-assets`, never directly to `main`.
- It accepts WebP assets only from the approved web-ready categories.
- It excludes `06_Needs_Review`.
- It enforces file-count and byte-size limits, validates paths, checks duplicate paths and compares file hashes.
- The separate Gaming Streetwear ZIP batch extracts only WebP files from `assets/optimized/04_Gaming_Streetwear/` and expects exactly 10.
- It does not publish to Cloudflare production. A separate review and merge is required before assets reach the live site.

The workflow is scheduled daily at 10:00 UTC and can also be started manually from GitHub Actions. Do not run it until the live status endpoint confirms the Dropbox token record exists and the Dropbox source folder has been reviewed.

## Verification checklist

1. Visit `https://onenationsvg.dpdns.org/api/dropbox/status`; expected response after OAuth is `{"configured":true,"connected":true}`.
2. Confirm Dropbox OAuth callback displays “Dropbox connected”.
3. Before a sync, verify the expected approved WebP files exist under the configured web-ready folder and the Gaming Streetwear ZIP exists at the configured source path.
4. Run the GitHub Actions workflow only when ready to create/update the staging branch.
5. Review `staging/dropbox-assets` and its file diff before opening a pull request to `main`.

OAuth authorization alone does not run the asset sync or publish website changes.
