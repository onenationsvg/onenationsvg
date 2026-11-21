# OneNation VC Hub — Website Audit
**Audit date:** 2026-11-21  
**Repository:** `onenationsvg/onenationsvg`  
**Branch reviewed:** `main`  
**Identity reference:** Direction D · Unity • Culture • Progress

## Scope and limitations
This is a source-repository audit, not a live-browser, device, accessibility, security-penetration, or Cloudflare-dashboard test. The main HTML, project indexes, supporting notes, copyright page, deployment headers, and a representative set of referenced assets were inspected. Live deployment and custom-domain status remain unverified.

## Confirmed strengths
- `index.html` is a self-contained static HTML page with embedded CSS and JavaScript.
- The homepage currently links directly to `mens-collection.html` through the Men navigation item.
- The homepage has sections for Shop, Designs, Lookbook, Gallery, Brand Marks, Our Story, and Contact.
- Responsive CSS breakpoints are present at 850px and 560px.
- Design filtering, image preview, keyboard activation for product images, mobile navigation, and WhatsApp design enquiry actions are implemented in inline JavaScript.
- Contact paths include telephone, WhatsApp, Instagram, and Facebook.
- Metricool tracking is included.
- `copyright.html`, `mens-collection.html`, and `_headers` exist in the repository.
- A representative set of homepage image references and both brand-mark exploration sheets were found in `assets/`.

## Findings to resolve
1. **Women's collection remains unreconciled — medium priority.** The homepage now exposes the Men collection, and `mens-collection.html` exists. The repository also contains two women's look assets and an older note describing a prepared women's update with four model images, but no dedicated `womens-collection.html` or `women-collection.html` page was found. Do not add a Women navigation link until the missing page and complete approved assets are recovered or the women's release is deliberately rebuilt.
2. **Approved tagline visibility — resolved.** The homepage now visibly presents **Unity • Culture • Progress** beneath the Saint Vincent & the Grenadines identity line. The supporting phrase “One People · One Culture · One Nation” remains as campaign language.
3. **Commercial details need owner confirmation — high priority before promotion.** The homepage publishes a starting price of EC$65 and a fixed telephone/WhatsApp number. Confirm the price, scope/conditions, and contact number are current before promoting or taking orders.
4. **Copyright and contributor permissions — high priority before wider publication.** The copyright page makes specific authorship and ownership statements and acknowledges AI-assisted and third-party materials. Have the rights holder review the wording and ensure any collaborator-created material has documented permissions or licences. This is an operational review item, not a legal conclusion.
5. **Accessibility / interaction refinement — partially resolved.** The image viewer now remembers its opening trigger and restores focus when closed. A full keyboard/screen-reader test and true modal focus trap are still recommended before a formal accessibility sign-off.
6. **External dependency and privacy review — medium priority.** Metricool is loaded from an external tracker script. Confirm the account/hash is correct and review whether a privacy notice or consent approach is needed for the intended audience and jurisdictions.
7. **Release verification — high priority before declaring launch complete.** Confirm all asset requests, internal links, mobile layouts, WhatsApp deep links, analytics, response headers, Cloudflare Pages build settings, and custom-domain DNS/TLS in a real browser and the hosting dashboard.

## Asset spot-check
Both brand-mark PNG sheets and a representative selection of product, apparel, and campaign image assets referenced by the homepage were found in the repository. This spot-check does not certify every file, visual quality, image dimensions, or browser loading on the deployed site.

## Recommended next sequence
- [ ] Decide whether a separate women's collection page is part of the current release; recover/rebuild the missing page and complete approved women's assets before adding Women navigation.
- [ ] Confirm current price and contact details.
- [x] Confirm approved public-facing identity wording and where the master tagline appears.
- [ ] Review copyright wording and contributor/third-party permissions.
- [ ] Complete keyboard, screen-reader, mobile, link, and image-load testing; the image-viewer focus restoration is now in place.
- [ ] Verify Cloudflare Pages deployment, custom domain, TLS, and headers before publishing a release announcement.

## Preservation rule
No website files or original assets were changed as part of this audit. Keep existing creative work intact while resolving the findings through reviewable changes.
