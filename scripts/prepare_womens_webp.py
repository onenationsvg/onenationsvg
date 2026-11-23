from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OUTPUTS = [
    ("onenation-womens-black-model.png", "onenation-womens-black-model-1", "onenation-womens-black-model-1-960w.webp"),
    ("onenation-womens-bright-blue-model.png", "onenation-womens-bright-blue-model-1", "onenation-womens-bright-blue-model-1-960w.webp"),
    ("onenation-womens-navy-model.png", "onenation-womens-navy-model-1", "onenation-womens-navy-model-1-960w.webp"),
    ("onenation-womens-white-model.png", "onenation-womens-white-model-1", "onenation-womens-white-model-1-960w.webp"),
]

for source_name, folder_name, output_name in OUTPUTS:
    source = ASSETS / source_name
    output_dir = ASSETS / "optimized" / "02_Apparel_and_Merchandise" / folder_name
    output_dir.mkdir(parents=True, exist_ok=True)
    output = output_dir / output_name

    with Image.open(source) as image:
        image = image.convert("RGB")
        if image.width > 960:
            height = round(image.height * 960 / image.width)
            image = image.resize((960, height), Image.Resampling.LANCZOS)
        image.save(output, "WEBP", quality=84, method=6)

    print(f"{source_name} -> {output.relative_to(ROOT)} ({output.stat().st_size} bytes)")
