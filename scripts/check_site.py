#!/usr/bin/env python3
"""Dependency-free checks for the OneNation SVG static website."""
from html.parser import HTMLParser
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
PAGES = sorted(ROOT.glob("*.html"))
errors = []

class Audit(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.ids = set()
        self.references = []
        self.images = 0
        self.bad_images = 0
        self.blank_targets = 0
        self.bad_blank_targets = 0
        self.skip_link = False
        self.main_target = False
        self.focus_style = False
        self.reduced_motion = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            if a["id"] in self.ids:
                errors.append(f"{self.path}: duplicate id '{a['id']}'")
            self.ids.add(a["id"])
        if tag == "img":
            self.images += 1
            if "alt" not in a:
                self.bad_images += 1
                errors.append(f"{self.path}: image missing alt attribute ({a.get('src','unknown src')})")
        if tag == "a" and a.get("href", "").startswith("#"):
            self.references.append(a["href"][1:])
            if a.get("class") == "skip-link" and a["href"] == "#main-content":
                self.skip_link = True
        if tag == "main" and a.get("id") == "main-content":
            self.main_target = True
        if tag == "a" and a.get("target") == "_blank":
            self.blank_targets += 1
            rel = set(a.get("rel", "").lower().split())
            if not {"noopener", "noreferrer"}.intersection(rel):
                self.bad_blank_targets += 1
                errors.append(f"{self.path}: target=_blank link missing noopener/noreferrer ({a.get('href','')})")

for page in PAGES:
    parser = Audit(page.name)
    source = page.read_text(encoding="utf-8")
    parser.feed(source)
    parser.close()
    for ref in parser.references:
        if ref and ref not in parser.ids:
            errors.append(f"{page.name}: fragment link '#{ref}' has no matching id")
    if not parser.skip_link or not parser.main_target:
        errors.append(f"{page.name}: missing accessible skip link or main-content target")
    if ":focus-visible" not in source:
        errors.append(f"{page.name}: missing visible keyboard focus styling")
    if "prefers-reduced-motion" not in source:
        errors.append(f"{page.name}: missing reduced-motion support")
    print(f"Checked {page.name}: {parser.images} images, {len(parser.ids)} IDs, {parser.blank_targets} external new-tab links")

if not PAGES:
    errors.append("No top-level HTML pages found")

if errors:
    print("\nSITE CHECKS FAILED:")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print(f"\nAll static site checks passed for {len(PAGES)} HTML pages.")
