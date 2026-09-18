from pathlib import Path
import shutil
import json
import uuid
import re
import html

from zip_maker import make_zip

BASE_DIR = Path(__file__).resolve().parent

THEMES_DIR = BASE_DIR / "themes"
GENERATED_DIR = BASE_DIR / "data" / "generated"

GENERATED_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_MUSIC_EXTENSIONS = {".mp3", ".wav", ".ogg", ".m4a"}

# Files that only exist to support the builder UI (theme picker preview,
# raw template) and are not needed by the generated, standalone website.
BUILDER_ONLY_FILES = {"preview.html", "preview.png"}

PLACEHOLDER_PATTERN = re.compile(r"\{\{[A-Z0-9_]+\}\}")


def build_website(data):

    theme = data["theme"]
    theme_dir = THEMES_DIR / theme
    birthday_id = data.get("birthday_id") or uuid.uuid4().hex[:8]
    website_dir = GENERATED_DIR / birthday_id

    if not theme_dir.exists():
        raise ValueError("The selected theme does not contain a valid template.")

    if website_dir.exists():
        shutil.rmtree(website_dir)

    # Copy the complete theme first.
    shutil.copytree(
        theme_dir,
        website_dir,
        dirs_exist_ok=True
    )

    # -------------------------
    # PHOTOS
    # -------------------------

    photos_dir = website_dir / "photos"
    photos_dir.mkdir(parents=True, exist_ok=True)

    photos = []

    for i, photo in enumerate(data["photos"], 1):

        if not photo:
            continue

        filename = f"photo{i}{photo.suffix}"
        destination = photos_dir / filename

        shutil.copy2(photo, destination)
        photos.append(f"photos/{filename}")

    if not photos:
        raise ValueError("Please upload at least 1 photo.")

    if len(photos) > 6:
        raise ValueError("You can upload a maximum of 6 photos.")

    # -------------------------
    # MUSIC
    # -------------------------

    music = None

    if data["music"]:

        # User music replaces the theme music.
        filename = f"music{data['music'].suffix}"
        destination = website_dir / filename

        shutil.copy2(
            data["music"],
            destination
        )

        music = filename

    else:

        # No custom music: use the first music file
        # already inside the selected theme.
        theme_music_dir = theme_dir / "music"

        if theme_music_dir.exists():

            music_files = sorted(
                file
                for file in theme_music_dir.iterdir()
                if file.is_file()
                and file.suffix.lower() in ALLOWED_MUSIC_EXTENSIONS
            )

            if music_files:

                source = music_files[0]
                filename = f"music{source.suffix}"

                shutil.copy2(
                    source,
                    website_dir / filename
                )

                music = filename

    # The theme's own music/ folder is only needed as a source for the
    # step above. Whichever track was chosen now lives at the top level
    # as music.<ext>, so drop the extra copy from the generated output.
    shutil.rmtree(website_dir / "music", ignore_errors=True)

    # -------------------------
    # WEBSITE DATA
    # -------------------------

    website_data = {
        "name": data["name"],
        "age": str(data["age"]),
        "message": data["message"],
        "theme": theme,
        "photos": photos,
        "music": music
    }

    (website_dir / "data.json").write_text(
        json.dumps(
            website_data,
            indent=2,
            ensure_ascii=False
        ),
        encoding="utf-8"
    )

    # -------------------------
    # BUILD INDEX FROM PREVIEW
    # -------------------------

    template = website_dir / "preview.html"

    if not template.exists():
        raise ValueError("The selected theme does not contain a valid template.")

    template_html = template.read_text(
        encoding="utf-8"
    )

    # NAME/AGE/MESSAGE are escaped because themes embed them inside HTML
    # attributes (e.g. data-cute-popup="{{MESSAGE}}") as well as text
    # content -- an unescaped quote or "&" could otherwise break the markup.
    replacements = {
        "{{NAME}}": html.escape(str(data["name"])),
        "{{AGE}}": html.escape(str(data["age"])),
        "{{MESSAGE}}": html.escape(str(data["message"])),
        "{{MUSIC}}": music or ""
    }

    for i in range(1, 7):
        replacements[f"{{{{PHOTO{i}}}}}"] = (
            photos[i - 1] if i <= len(photos) else ""
        )

    # Replace placeholders in the generated HTML.
    for old, new in replacements.items():
        template_html = template_html.replace(old, new)

    # Force the browser to load the current theme JS/CSS instead of a
    # stale cached copy from a previous generation.
    version = uuid.uuid4().hex

    template_html = re.sub(
        r'(<script\s+[^>]*src=["\'])([^"\']+\.js)(["\'])',
        lambda m: (
            f"{m.group(1)}"
            f"{m.group(2)}?v={version}"
            f"{m.group(3)}"
        ),
        template_html,
        flags=re.IGNORECASE
    )

    (website_dir / "index.html").write_text(
        template_html,
        encoding="utf-8"
    )

    # Drop builder-only files now that index.html has been generated from
    # them; they aren't needed to run the standalone birthday website.
    for name in BUILDER_ONLY_FILES:
        (website_dir / name).unlink(missing_ok=True)

    # -------------------------
    # ALSO REPLACE PLACEHOLDERS
    # IN COPIED THEME JS/CSS
    # -------------------------

    for file in website_dir.rglob("*"):

        if not file.is_file():
            continue

        if file.suffix.lower() not in {
            ".html",
            ".js",
            ".css"
        }:
            continue

        try:
            text = file.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue

        changed = False

        for old, new in replacements.items():

            if old in text:
                text = text.replace(old, new)
                changed = True

        if changed:
            file.write_text(
                text,
                encoding="utf-8"
            )

    # -------------------------
    # SAFETY NET: NO UNRESOLVED
    # {{PLACEHOLDER}} MAY REMAIN
    # -------------------------

    leftover_files = []

    for file in website_dir.rglob("*"):

        if not file.is_file() or file.suffix.lower() not in {".html", ".js", ".css"}:
            continue

        try:
            text = file.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue

        if PLACEHOLDER_PATTERN.search(text):
            leftover_files.append(file.relative_to(website_dir).as_posix())

    if leftover_files:
        raise ValueError(
            "The website could not be generated. "
            f"Unresolved placeholders in: {', '.join(leftover_files)}"
        )

    # -------------------------
    # ZIP
    # -------------------------

    zip_file = GENERATED_DIR / f"{birthday_id}.zip"

    make_zip(
        website_dir,
        zip_file
    )

    return {
        "success": True,
        "birthday_id": birthday_id,
        "url": f"/birthday/{birthday_id}/"
    }
