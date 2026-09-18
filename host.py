from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
WEBSITE_DIR = BASE_DIR / "data" / "generated" / "latest"


def get_website():
    return WEBSITE_DIR / "index.html"