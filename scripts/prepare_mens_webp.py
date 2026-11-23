from pathlib import Path
from PIL import Image

root = Path(".")
folder = root / "assets" / "mens-catalogue"
files = sorted(folder.glob("*.jpg"))
expected = [
    "01-island-born-world-ready.jpg",
    "02-wear-your-identity.jpg",
    "03-onenation-svg-crest.jpg",
    "04-svg-my-roots.jpg",
    "05-on-signature-logo.jpg",
]
if [p.name for p in files] != expected:
    raise SystemExit(f"Expected exactly the five original catalogue images; found {[p.name for p in files]}")

for source in files:
    destination = source.with_suffix(".webp")
    with Image.open(source) as image:
        image = image.convert("RGB")
        image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        image.save(destination, "WEBP", quality=84, method=6)

page = root / "mens-collection.html"
html = page.read_text(encoding="utf-8")
for name in expected:
    html = html.replace(name, Path(name).with_suffix(".webp").name)
page.write_text(html, encoding="utf-8")

print("Created five WebP derivatives and updated the five matching catalogue references.")
