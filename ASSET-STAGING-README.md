# OneNation SVG — Asset Performance Staging

This branch is isolated from `main`. Nothing in this staging branch is published to the live website unless changes are reviewed and merged.

## Package and extracted assets

The optimized website asset package has been reassembled, integrity-checked, and extracted into `assets/optimized/`, preserving its category folders.

- 129 optimized WebP image files are staged.
- The original flat `assets/` files remain in place as fallbacks.
- Print masters are not replaced by website WebP derivatives.
- The two original logo-sheet PNGs remain unchanged because no optimized replacements were staged for them.

## Website integration completed on staging

Responsive WebP `<picture>` sources have been added to:

- `index.html`: 21 image placements.
- `womens-collection.html`: 6 image placements.

Each updated image keeps its original `assets/` source as a fallback, while browsers that support WebP can select the optimized `assets/optimized/` variants (480w / 960w where available). Navigation, ordering links, copy, and production files were not intentionally changed.

## Verification status

- Staging preview: `https://asset-performance-staging.onenationsvg-git.pages.dev/`
- The deployed homepage HTML was checked and contains 21 responsive picture elements.
- The women's collection HTML contains 6 responsive picture elements.
- A browser review found the desktop layouts and navigation intact; homepage imagery rendered without visible broken-image indicators.
- A dedicated mobile viewport test is still outstanding.
- Representative binary image fetch checks were not completed by the text-only page inspection tool; do not treat those as a verified image-by-image network audit.

## Safety and release

- All edits remain on `asset-performance-staging`.
- `main` and the canonical production domain are not changed by this work.
- Do not merge or publish these changes until the staging review is complete and the owner explicitly approves.
