# OneNation VC Hub — Master Project Index

## Source of truth
- Repository: https://github.com/onenationsvg/onenationsvg
- Branch: `main`
- Canonical public production domain: https://www.onenationsvg.dpdns.org/
- Cloudflare Pages preview: https://onenationsvg-git.pages.dev/
- Legacy Cloudflare Pages endpoint: https://onenationsvg.pages.dev/

**Deployment policy (2026-11-21):** GitHub `main` is the shared source of truth. The canonical custom domain is the public production endpoint, and the `-git.pages.dev` address is used for preview/testing. The older `pages.dev` project URL is retained only as a legacy endpoint and is not a production target because its routing is not currently consistent with the canonical deployment. Do not use the legacy endpoint for releases, promotion, or collaborator work.

## Approved identity
- Brand: OneNation VC Hub
- Direction: D
- Tagline: Unity • Culture • Progress

## Current production website
- `index.html` — primary website
- `mens-collection.html` — men's collection
- `womens-collection.html` — women's collection
- `copyright.html` — copyright / IP page
- `_headers` — site headers
- `assets/` — approved visual assets

## Current supporting material
- `OneNation-SVG-Mens-Collection-Catalogue.pdf`
- `README.md`
- `README-CLOUDFLARE-PAGES.txt`
- `UPDATE-NOTES-MENS-COLLECTION.txt`
- `readme-womens-collection-update.txt`
- `ONENATION-COLLABORATION-STANDARD.md`
- `ONENATION-WEBSITE-AUDIT-2026-11-21.md`
- `COLLABORATOR-SYNC-CHECKLIST.md`

## Asset policy
The contents of `assets/` are the current repository asset set. Do not replace or delete an existing asset merely to make a personal/local copy match. Add new approved assets with clear names and update this index when they become part of the production set.

## Collaboration rule
Use `main` as the shared baseline. Before making work, sync from `main`. Make changes in a branch or reviewable commit when practical. Do not treat private ZIPs, downloads, or older local copies as the current version unless they have been deliberately merged into `main`.

## Important
This index is an organizational layer; it does not erase creative history or silently overwrite collaborator-owned files. Each collaborator should synchronize their own workspace from this repository.

## Collection page status — 2026-11-21
- Men's collection: `mens-collection.html` exists and is linked from the homepage navigation.
- Women's collection: `womens-collection.html` exists, is linked from the homepage navigation in GitHub `main`, and uses the four approved model PNGs plus the two women's lookbook JPGs.
- The four approved women's model assets are physically present in `assets/`: black, bright blue, navy, and white.
- The canonical custom production domain serves the women's collection successfully.
- The legacy `pages.dev` endpoint may continue to serve older/fallback routing; this is not considered a source-of-truth conflict and does not require changes to the website source.
