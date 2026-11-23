# OneNation SVG — Dropbox OAuth integration

This integration is being verified on the canonical Cloudflare Pages production domain. OAuth is kept server-side and does not expose Dropbox tokens to the browser.

## What it adds

- `/api/dropbox/connect`: starts Dropbox's server-side OAuth 2 authorization-code flow and sets a short-lived, HttpOnly, Secure, SameSite=Lax state cookie.
- `/api/dropbox/callback`: validates the one-time state against that cookie, exchanges the authorization code server-side, and stores the token encrypted.
- `/api/dropbox/status`: reports only whether a Dropbox connection exists; it never returns tokens.
- `functions/_shared/dropbox.js`: encrypts/decrypts the stored token and refreshes short-lived access tokens using the offline refresh token.

The callback is fixed to:

`https://www.onenationsvg.dpdns.org/api/dropbox/callback`

Register this exact URI in the Dropbox Developer Console only after this branch has been reviewed, merged, and deployed to the canonical Cloudflare Pages domain.

## Cloudflare Pages configuration

Create a KV namespace, then add a Pages binding:

- Binding name: `DROPBOX_KV`
- Namespace: the newly created namespace

Add these settings under the Cloudflare Pages project's production environment:

- Variable `DROPBOX_APP_KEY`: the Dropbox app key.
- Secret `DROPBOX_APP_SECRET`: the Dropbox app secret.

The token is encrypted before it is stored in KV. The encryption key is derived from the server-only app secret; do not rotate the app secret without first migrating/re-authorizing the stored token.

Do not put the app secret or any Dropbox access/refresh token in GitHub, HTML, browser JavaScript, a public issue, or a chat message.

## Dropbox Developer Console

After deployment, register the exact callback URI above under Settings > OAuth 2 > Redirect URIs. Keep the app in Development while testing. Keep public clients disabled: this implementation uses a confidential server-side code flow.

## Test

1. Visit `https://www.onenationsvg.dpdns.org/api/dropbox/status`; before setup it should report not configured.
2. After Cloudflare configuration and deployment, visit `https://www.onenationsvg.dpdns.org/api/dropbox/connect`.
3. Approve the requested Dropbox scopes in Dropbox.
4. Confirm the callback displays “Dropbox connected”.
5. Visit `/api/dropbox/status` and confirm `connected: true`.

This stage establishes secure Dropbox authorization only. GitHub write credentials and the actual reviewed asset-sync job are a separate stage; no website assets are copied or overwritten by this OAuth callback.
