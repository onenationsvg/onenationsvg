# OneNation VC Hub — Website Audit
**Audit date:** 2026-11-21  
**Repository:** `onenationsvg/onenationsvg`  
**Branch reviewed:** `main`  
**Identity reference:** Direction D · Unity • Culture • Progress

## Scope
This audit combines the repository review with live public-web verification of the canonical Cloudflare custom domain, Cloudflare Pages preview URL, and the legacy Pages project URL.

## Confirmed strengths
- `index.html` is a self-contained static HTML page with embedded CSS and JavaScript.
- The homepage links directly to both `mens-collection.html` and `womens-collection.html`.
- The homepage has sections for Shop, Designs, Lookbook, Gallery, Brand Marks, Our Story, and Contact.
- Responsive CSS breakpoints are present at 850px and 560px.
- Design filtering, image preview, keyboard activation for product images, mobile navigation, and WhatsApp design enquiry actions are implemented in inline JavaScript.
- Contact paths include telephone, WhatsApp, Instagram, and Facebook.
- Metricool tracking is included.
- `copyright.html`, `mens-collection.html`, `womens-collection.html`, and `_headers` exist in the repository.
- The four women's model PNGs and two women's lookbook JPGs are present in the repository.
- The approved tagline **Unity • Culture • Progress** is visibly presented on the homepage source and the current custom-domain deployment.

## Live verification
- **Canonical custom domain:** `https://www.onenationsvg.dpdns.org/` is serving the current homepage and exposes Men and Women collection routes.
- **Custom women's route:** `https://www.onenationsvg.dpdns.org/womens-collection.html` resolves to the current women's collection page and exposes all four supplied model colourways plus both women's lookbook images.
- **Preview:** `https://onenationsvg-git.pages.dev/` is serving the current Women-enabled homepage and collection route.
- **Legacy Pages project URL:** `https://onenationsvg.pages.dev/` continues to serve older/fallback routing for the Women's Collection request. It is intentionally excluded from the active deployment workflow and is not a source-of-truth conflict.
- **Real-browser smoke test:** The canonical custom domain was tested in a live browser. Homepage, Men, Women, and Copyright routes all passed; no visible broken images, obvious layout errors, or dead navigation were reported.

## Findings / remaining release checks
1. **Legacy Pages endpoint — resolved operationally.** The older `pages.dev` project URL is documented as legacy and is no longer a production or release target. No source-code change is required for it.
2. **Commercial details — high priority before promotion.** The homepage and collection pages publish a starting price of EC$65 and a fixed telephone/WhatsApp number. Confirm the price, scope/conditions, and contact number are current before promoting or taking orders.
3. **Copyright and contributor permissions — high priority before wider publication.** Review the copyright wording and ensure collaborator-created material has documented permissions or licences.
4. **Accessibility / interaction refinement — partially resolved.** The image viewer restores focus to its opening trigger. A full keyboard/screen-reader test and true modal focus trap are still recommended before formal accessibility sign-off.
5. **External dependency and privacy review — medium priority.** Metricool is loaded from an external tracker script. Confirm the account/hash is correct and review whether a privacy notice or consent approach is needed for the intended audience and jurisdictions.
6. **Extended release QA — substantially completed.** Live smoke testing passed the main public routes. A full device/browser matrix, analytics request verification, and detailed response-header/TLS/DNS review remain optional final checks.

## Recommended next sequence
- [x] Recover/rebuild the women's collection page and connect the four approved model assets.
- [x] Confirm the approved public-facing identity wording and tagline.
- [x] Verify the canonical custom production domain and preview deployment.
- [x] Exclude the legacy `pages.dev` project URL from the active production workflow.
- [x] Run live browser smoke testing of homepage, Men, Women, and Copyright routes.
- [ ] Confirm current price and contact details.
- [ ] Review copyright wording and contributor/third-party permissions.
- [ ] Complete formal keyboard, screen-reader, and mobile accessibility sign-off.

## Preservation rule
No original creative asset was deleted or replaced as part of this audit. The repository `main` branch remains the shared baseline.
