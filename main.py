import json
import mimetypes
import os
import random
import re
import shutil
import tempfile
import uuid
from io import BytesIO
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, RedirectResponse, Response
from starlette.background import BackgroundTask
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError

from builder import GENERATED_DIR, build_website
from zip_maker import make_birthday_zip


BASE_DIR = Path(__file__).resolve().parent

THEMES_DIR = BASE_DIR / "themes"
TEMP_DIR = BASE_DIR / "data" / "temp"

TEMP_DIR.mkdir(parents=True, exist_ok=True)


# -------------------------
# SUPABASE
# -------------------------

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY", "")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "birthday-sites")

supabase = None

if SUPABASE_URL and SUPABASE_SECRET_KEY:
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)


# -------------------------
# CONFIG
# -------------------------

THEMES = [
    folder.name
    for folder in THEMES_DIR.iterdir()
    if folder.is_dir()
]

MIN_AGE = 1
MAX_AGE = 120
MAX_NAME_LENGTH = 60
MAX_MESSAGE_LENGTH = 500

ALLOWED_MUSIC_EXTENSIONS = {
    ".mp3",
    ".wav",
    ".ogg",
    ".m4a",
}

RANDOM_MESSAGES = [
    "Wishing you a birthday filled with happiness, laughter, and unforgettable memories!",
    "May your special day be as wonderful and amazing as you are. Happy Birthday!",
    "Here's to another year of beautiful moments, big dreams, and lots of happiness!",
    "Wishing you endless smiles, wonderful adventures, and a fantastic year ahead!",
    "May this birthday bring you everything that makes you smile and everything you wish for!",
]


app = FastAPI(title="Birthday Website Maker")


NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate",
}


# -------------------------
# SUPABASE HELPERS
# -------------------------

def storage_bucket():
    if not supabase:
        raise RuntimeError("Supabase is not configured.")
    return supabase.storage.from_(SUPABASE_BUCKET)


def public_storage_url(path: str) -> str:
    result = storage_bucket().get_public_url(path)

    if isinstance(result, str):
        return result

    if isinstance(result, dict):
        return (
            result.get("publicUrl")
            or result.get("public_url")
            or result.get("data", {}).get("publicUrl", "")
        )

    return str(result)


def storage_list(path: str):
    return storage_bucket().list(
        path,
        {
            "limit": 1000,
            "offset": 0,
        },
    )


def delete_storage_prefix(prefix: str):
    """Delete every object below a birthday folder."""
    if not supabase:
        return

    objects = []

    def walk(folder):
        for item in storage_list(folder) or []:
            name = item.get("name", "")
            if not name:
                continue

            full_path = f"{folder}/{name}" if folder else name

            # Supabase folder entries normally have no object id.
            if item.get("id"):
                objects.append(full_path)
            else:
                walk(full_path)

    walk(prefix)

    bucket = storage_bucket()

    for start in range(0, len(objects), 100):
        bucket.remove(objects[start:start + 100])


def upload_website(website_dir: Path, birthday_id: str):
    """Upload the birthday-specific generated site to Supabase Storage."""
    if not supabase:
        return

    delete_storage_prefix(birthday_id)

    bucket = storage_bucket()

    for file in website_dir.rglob("*"):
        if not file.is_file():
            continue

        relative = file.relative_to(website_dir).as_posix()
        remote_path = f"{birthday_id}/{relative}"

        content_type = (
            mimetypes.guess_type(file.name)[0]
            or "application/octet-stream"
        )

        with file.open("rb") as handle:
            bucket.upload(
                file=handle,
                path=remote_path,
                file_options={
                    "content-type": content_type,
                    "cache-control": "no-cache",
                    "upsert": "true",
                },
            )


def remote_birthday_exists(birthday_id: str) -> bool:
    if not supabase:
        return False

    try:
        items = storage_list(birthday_id)
        return any(
            item.get("name") == "data.json"
            for item in (items or [])
        )
    except Exception:
        return False


def download_remote_file(path: str) -> bytes | None:
    if not supabase:
        return None

    try:
        return storage_bucket().download(path)
    except Exception:
        return None


def remote_generated_path(file_path: str) -> bool:
    """True for files stored specifically for a birthday."""
    if file_path in {
        "index.html",
        "data.json",
    }:
        return True

    if file_path.startswith("photos/"):
        return True

    if re.fullmatch(r"music\.[a-z0-9]+", file_path, re.IGNORECASE):
        return True

    return bool(
        re.fullmatch(
            r"(cute|classic|funny|dreamy|romantic)\.(css|js)",
            file_path,
            re.IGNORECASE,
        )
    )


# -------------------------
# STARTUP
# -------------------------

@app.on_event("startup")
def clear_stale_uploads():
    for entry in TEMP_DIR.iterdir():
        if entry.is_dir():
            shutil.rmtree(entry, ignore_errors=True)
        else:
            entry.unlink(missing_ok=True)


# -------------------------
# THEME FILES
# -------------------------

app.mount(
    "/themes",
    StaticFiles(directory=THEMES_DIR),
    name="themes",
)


# -------------------------
# HOME
# -------------------------

@app.get("/")
def home():
    return FileResponse(
        BASE_DIR / "index.html",
        headers=NO_CACHE_HEADERS,
    )


# -------------------------
# AVAILABLE THEMES
# -------------------------

@app.get("/api/themes")
def get_themes():
    return THEMES


# -------------------------
# BIRTHDAY WEBSITE
# -------------------------

@app.get("/birthday/{birthday_id}")
def birthday_redirect_id(birthday_id: str):
    return RedirectResponse(f"/birthday/{birthday_id}/")


@app.get("/birthday/{birthday_id}/")
def birthday_index(birthday_id: str):
    if not re.fullmatch(r"[0-9a-f]{8}", birthday_id):
        raise HTTPException(404, "Birthday website not found")

    website_dir = GENERATED_DIR / birthday_id
    website = website_dir / "index.html"

    if website.exists() and website.is_file():
        return FileResponse(
            website,
            headers=NO_CACHE_HEADERS,
        )

    if supabase:
        content = download_remote_file(f"{birthday_id}/index.html")

        if content is not None:
            return Response(
                content=content,
                media_type="text/html",
                headers=NO_CACHE_HEADERS,
            )

    raise HTTPException(404, "Birthday website not found")


@app.get("/birthday/{birthday_id}/{file_path:path}")
def birthday_file(
    birthday_id: str,
    file_path: str,
):
    if not re.fullmatch(r"[0-9a-f]{8}", birthday_id):
        raise HTTPException(404, "Birthday website not found")

    website_dir = GENERATED_DIR / birthday_id
    file = (website_dir / file_path).resolve()

    try:
        file.relative_to(website_dir.resolve())
    except ValueError:
        raise HTTPException(404, "Birthday website not found")

    # Fast local path after generation.
    if file.exists() and file.is_file():
        return FileResponse(
            file,
            headers=NO_CACHE_HEADERS,
        )

    # Birthday-specific files live in the public Supabase bucket.
    # Redirecting lets Supabase's CDN serve photos/music instead of Render.
    if supabase and remote_generated_path(file_path):
        return RedirectResponse(
            public_storage_url(f"{birthday_id}/{file_path}")
        )

    # Static theme assets are shared between all birthdays.
    # They stay inside the deployed application and are never duplicated
    # in Supabase for every birthday.
    data = download_remote_file(f"{birthday_id}/data.json") if supabase else None

    data_file = website_dir / "data.json"

    if data is not None:
        try:
            website_data = json.loads(data.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            website_data = {}
    elif data_file.exists():
        try:
            website_data = json.loads(data_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            website_data = {}
    else:
        website_data = {}

    theme = website_data.get("theme", "")

    if theme in THEMES:
        theme_file = (THEMES_DIR / theme / file_path).resolve()

        try:
            theme_file.relative_to((THEMES_DIR / theme).resolve())
        except ValueError:
            raise HTTPException(404, "Birthday website not found")

        if theme_file.exists() and theme_file.is_file():
            return FileResponse(
                theme_file,
                headers=NO_CACHE_HEADERS,
            )

    raise HTTPException(404, "Birthday website not found")


# -------------------------
# IMAGE VALIDATION
# -------------------------

def _is_valid_image(content: bytes) -> bool:
    try:
        with Image.open(BytesIO(content)) as image:
            image.verify()
        return True
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
    ):
        return False


# -------------------------
# GENERATE WEBSITE
# -------------------------

@app.post("/api/generate")
async def generate(
    theme: str = Form(...),
    name: str = Form(""),
    age: str = Form(""),
    message: str = Form(""),
    birthday_id: str = Form(""),

    photo1: UploadFile | None = File(None),
    photo2: UploadFile | None = File(None),
    photo3: UploadFile | None = File(None),
    photo4: UploadFile | None = File(None),
    photo5: UploadFile | None = File(None),
    photo6: UploadFile | None = File(None),

    music: UploadFile | None = File(None),
):
    # Keep the same session ID after a Render restart when that ID
    # already exists in Supabase.
    if birthday_id and not re.fullmatch(r"[0-9a-f]{8}", birthday_id):
        birthday_id = ""

    if birthday_id and not (GENERATED_DIR / birthday_id).is_dir():
        if not remote_birthday_exists(birthday_id):
            birthday_id = ""

    theme = theme.strip()

    if theme not in THEMES:
        raise HTTPException(
            400,
            "The selected theme does not contain a valid template.",
        )

    name = name.strip()

    if not name:
        raise HTTPException(400, "Please enter a name.")

    if len(name) > MAX_NAME_LENGTH:
        raise HTTPException(400, "Please enter a shorter name.")

    age = age.strip()

    if (
        not age.isdigit()
        or not (MIN_AGE <= int(age) <= MAX_AGE)
    ):
        raise HTTPException(400, "Please enter a valid age.")

    age_value = int(age)

    message = message.strip()

    if len(message) > MAX_MESSAGE_LENGTH:
        raise HTTPException(
            400,
            f"Message is too long (max {MAX_MESSAGE_LENGTH} characters).",
        )

    if not message:
        message = random.choice(RANDOM_MESSAGES)

    photos = [
        photo1,
        photo2,
        photo3,
        photo4,
        photo5,
        photo6,
    ]

    selected_photos = [
        photo
        for photo in photos
        if photo and photo.filename
    ]

    if not selected_photos:
        raise HTTPException(
            400,
            "Please upload at least 1 photo.",
        )

    if len(selected_photos) > 6:
        raise HTTPException(
            400,
            "You can upload a maximum of 6 photos.",
        )

    photo_contents = []

    for photo in selected_photos:
        content = await photo.read()

        if not content:
            continue

        if not _is_valid_image(content):
            raise HTTPException(
                400,
                f"{photo.filename} is not a valid image.",
            )

        photo_contents.append(
            (
                photo.filename,
                content,
            )
        )

    if not photo_contents:
        raise HTTPException(
            400,
            "Please upload at least 1 photo.",
        )

    music_filename = None
    music_content = None

    if music and music.filename:
        extension = Path(music.filename).suffix.lower()

        if extension not in ALLOWED_MUSIC_EXTENSIONS:
            raise HTTPException(
                400,
                "The selected music file is not supported.",
            )

        content = await music.read()

        if not content:
            raise HTTPException(
                400,
                "The selected music file is not supported.",
            )

        music_filename = music.filename
        music_content = content

    temp = TEMP_DIR / uuid.uuid4().hex
    temp.mkdir(parents=True)

    try:
        photo_paths = []

        for i, (filename, content) in enumerate(
            photo_contents,
            1,
        ):
            extension = Path(filename).suffix or ".jpg"
            photo_path = temp / f"photo{i}{extension}"
            photo_path.write_bytes(content)
            photo_paths.append(photo_path)

        music_path = None

        if music_content is not None:
            extension = Path(music_filename).suffix
            music_path = temp / f"music{extension}"
            music_path.write_bytes(music_content)

        data = {
            "birthday_id": birthday_id or None,
            "theme": theme,
            "name": name,
            "age": age_value,
            "message": message,
            "photos": photo_paths,
            "music": music_path,
        }

        try:
            result = build_website(data)

            website_id = result["birthday_id"]
            website_dir = GENERATED_DIR / website_id

            # Supabase is the persistent layer on Render.
            # Local files remain available for the current process too.
            if supabase:
                upload_website(website_dir, website_id)

            return result

        except ValueError as error:
            raise HTTPException(400, str(error))

        except HTTPException:
            raise

        except Exception as error:
            print("GENERATION ERROR:", repr(error))
            raise HTTPException(
                500,
                "The website could not be generated.",
            )

    finally:
        shutil.rmtree(temp, ignore_errors=True)


# -------------------------
# DOWNLOAD
# -------------------------

@app.get("/download/{birthday_id}")
def download_zip(birthday_id: str):
    if not re.fullmatch(r"[0-9a-f]{8}", birthday_id):
        raise HTTPException(404, "Birthday website not found")

    website_dir = GENERATED_DIR / birthday_id
    data_file = website_dir / "data.json"

    # After a Render restart, rebuild the small generated folder from
    # Supabase so the ZIP endpoint still works.
    if not data_file.exists() and supabase:
        data_bytes = download_remote_file(f"{birthday_id}/data.json")

        if data_bytes is not None:
            website_dir.mkdir(parents=True, exist_ok=True)
            data_file.write_bytes(data_bytes)

            for name in [
                "index.html",
                "cute.css",
                "cute.js",
                "classic.css",
                "classic.js",
                "funny.css",
                "funny.js",
                "dreamy.css",
                "dreamy.js",
                "romantic.css",
                "romantic.js",
            ]:
                remote = download_remote_file(
                    f"{birthday_id}/{name}"
                )
                if remote is not None:
                    (website_dir / name).write_bytes(remote)

            photos_dir = website_dir / "photos"
            photos_dir.mkdir(exist_ok=True)

            website_data = json.loads(
                data_bytes.decode("utf-8")
            )

            for photo_path in website_data.get("photos", []):
                remote = download_remote_file(
                    f"{birthday_id}/{photo_path}"
                )
                if remote is not None:
                    target = website_dir / photo_path
                    target.parent.mkdir(
                        parents=True,
                        exist_ok=True,
                    )
                    target.write_bytes(remote)

            custom_music = website_data.get("music")

            if custom_music and not custom_music.startswith("music/"):
                remote = download_remote_file(
                    f"{birthday_id}/{custom_music}"
                )
                if remote is not None:
                    (website_dir / custom_music).write_bytes(remote)

    if not data_file.exists():
        raise HTTPException(404, "Birthday website not found")

    try:
        website_data = json.loads(
            data_file.read_text(encoding="utf-8")
        )
        theme = website_data["theme"]
    except (
        OSError,
        KeyError,
        json.JSONDecodeError,
    ):
        raise HTTPException(404, "Birthday website not found")

    if theme not in THEMES:
        raise HTTPException(404, "Birthday website not found")

    temp_dir = Path(
        tempfile.mkdtemp(prefix="birthday-zip-")
    )
    zip_file = temp_dir / "birthday-website.zip"

    try:
        make_birthday_zip(
            website_dir,
            THEMES_DIR / theme,
            zip_file,
            website_data,
        )
    except Exception as error:
        print("ZIP ERROR:", repr(error))
        shutil.rmtree(temp_dir, ignore_errors=True)

        raise HTTPException(
            500,
            "The website could not be downloaded.",
        )

    return FileResponse(
        zip_file,
        filename="birthday-website.zip",
        media_type="application/zip",
        headers=NO_CACHE_HEADERS,
        background=BackgroundTask(
            shutil.rmtree,
            temp_dir,
            True,
        ),
    )


# -------------------------
# RUN
# -------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )
