#!/usr/bin/env python3
"""Dependency-free checks for the OneNation SVG static website."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
from datetime import date
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "https://onenationsvg.dpdns.org"
PAGES = sorted(ROOT.glob("*.html"))
ERRORS = []

# Public, canonical routes that should be discoverable in Google's sitemap.
EXPECTED_ROUTES = {
    "/": "index.html",
    "/mens-collection": "mens-collection.html",
    "/womens-collection": "womens-collection.html",
    "/holiday-collection": "holiday-collection.html",
    "/svg-culture-island-life": "svg-culture-island-life.html",
    "/copyright": "copyright.html",
}
SITEMAP_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}


class Audit(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.ids = set()
        self.references = []
        self.images = 0
        self.blank_targets = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            if a["id"] in self.ids:
                ERRORS.append(f"{self.path}: duplicate id '{a['id']}'")
            self.ids.add(a["id"])
        if tag == "img":
            self.images += 1
            if "alt" not in a:
                ERRORS.append(
                    f"{self.path}: image missing alt attribute ({a.get('src', 'unknown src')})"
                )
        if tag == "a" and a.get("href", "").startswith("#"):
            self.references.append(a["href"][1:])
        if tag == "a" and a.get("target") == "_blank":
            self.blank_targets += 1
            rel = set(a.get("rel", "").lower().split())
            if not {"noopener", "noreferrer"}.intersection(rel):
                ERRORS.append(
                    f"{self.path}: target=_blank link missing noopener/noreferrer "
                    f"({a.get('href', '')})"
                )


def check_html_pages():
    for page in PAGES:
        parser = Audit(page.name)
        source = page.read_text(encoding="utf-8")
        parser.feed(source)
        parser.close()
        for ref in parser.references:
            if ref and ref not in parser.ids:
                ERRORS.append(f"{page.name}: fragment link '#{ref}' has no matching id")
        if 'class="skip-link"' not in source or 'id="main-content"' not in source:
            ERRORS.append(f"{page.name}: missing accessible skip link or main-content target")
        if ":focus-visible" not in source:
            ERRORS.append(f"{page.name}: missing visible keyboard focus styling")
        if "prefers-reduced-motion" not in source:
            ERRORS.append(f"{page.name}: missing reduced-motion support")
        print(
            f"Checked {page.name}: {parser.images} images, "
            f"{len(parser.ids)} IDs, {parser.blank_targets} external new-tab links"
        )

    if not PAGES:
        ERRORS.append("No top-level HTML pages found")


def check_google_crawl_files():
    robots_path = ROOT / "robots.txt"
    sitemap_path = ROOT / "sitemap.xml"

    if not robots_path.is_file():
        ERRORS.append("robots.txt is missing from the site root")
    if not sitemap_path.is_file():
        ERRORS.append("sitemap.xml is missing from the site root")
        return

    robots_text = robots_path.read_text(encoding="utf-8")
    robots_lines = [
        line.strip() for line in robots_text.splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]
    if not any(line.lower() == "user-agent: *" for line in robots_lines):
        ERRORS.append("robots.txt must include 'User-agent: *'")
    if not any(line.lower() == "allow: /" for line in robots_lines):
        ERRORS.append("robots.txt should explicitly allow crawling with 'Allow: /'")
    if any(line.lower() == "disallow: /" for line in robots_lines):
        ERRORS.append("robots.txt blocks the entire site with 'Disallow: /'")

    sitemap_lines = [
        line.split(":", 1)[1].strip()
        for line in robots_lines
        if line.lower().startswith("sitemap:")
    ]
    if f"{BASE_URL}/sitemap.xml" not in sitemap_lines:
        ERRORS.append("robots.txt must point to the canonical sitemap URL")

    try:
        root = ET.parse(sitemap_path).getroot()
    except (ET.ParseError, OSError) as exc:
        ERRORS.append(f"sitemap.xml is not valid XML: {exc}")
        return

    expected_root = "{http://www.sitemaps.org/schemas/sitemap/0.9}urlset"
    if root.tag != expected_root:
        ERRORS.append("sitemap.xml must use the standard XML sitemap urlset namespace")
        return

    found_routes = set()
    seen_urls = set()
    for entry in root.findall("sm:url", SITEMAP_NS):
        loc_node = entry.find("sm:loc", SITEMAP_NS)
        if loc_node is None or not (loc_node.text or "").strip():
            ERRORS.append("sitemap.xml contains a URL entry without a loc value")
            continue

        loc = loc_node.text.strip()
        parsed = urlparse(loc)
        if parsed.scheme != "https" or parsed.netloc != "onenationsvg.dpdns.org":
            ERRORS.append(f"sitemap URL is not on the canonical HTTPS host: {loc}")
            continue
        if parsed.query or parsed.fragment:
            ERRORS.append(f"sitemap URL should not contain query strings or fragments: {loc}")
        if loc in seen_urls:
            ERRORS.append(f"sitemap.xml contains a duplicate URL: {loc}")
        seen_urls.add(loc)

        route = parsed.path or "/"
        if route not in EXPECTED_ROUTES:
            ERRORS.append(f"sitemap contains an unexpected route: {loc}")
        else:
            found_routes.add(route)
            target_file = ROOT / EXPECTED_ROUTES[route]
            if not target_file.is_file():
                ERRORS.append(f"sitemap route {route} has no matching file: {target_file.name}")

        lastmod_node = entry.find("sm:lastmod", SITEMAP_NS)
        if lastmod_node is not None and (lastmod_node.text or "").strip():
            try:
                date.fromisoformat(lastmod_node.text.strip()[:10])
            except ValueError:
                ERRORS.append(f"sitemap has an invalid lastmod date for {loc}")

    missing = set(EXPECTED_ROUTES) - found_routes
    for route in sorted(missing):
        ERRORS.append(f"sitemap is missing expected canonical route: {BASE_URL}{route}")

    if not seen_urls:
        ERRORS.append("sitemap.xml contains no URLs")
    print(f"Checked robots.txt and sitemap.xml: {len(seen_urls)} canonical URLs")


check_html_pages()
check_google_crawl_files()

if ERRORS:
    print("\nSITE CHECKS FAILED:")
    for error in ERRORS:
        print(f"- {error}")
    sys.exit(1)

print(
    f"\nAll checks passed for {len(PAGES)} HTML pages and "
    f"{len(EXPECTED_ROUTES)} Google-discovery routes."
)
