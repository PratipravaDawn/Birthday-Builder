import random
import re
import shutil
import uuid
from io import BytesIO
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError

from builder import GENERATED_DIR, build_website


BASE_DIR = Path(__file__).resolve().parent

THEMES_DIR = BASE_DIR / "themes"
TEMP_DIR = BASE_DIR / "data" / "temp"

TEMP_DIR.mkdir(parents=True, exist_ok=True)


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
    ".m4a"
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
# STARTUP
# -------------------------

@app.on_event("startup")
def clear_stale_uploads():

    for entry in TEMP_DIR.iterdir():

        if entry.is_dir():
            shutil.rmtree(
                entry,
                ignore_errors=True
            )

        else:
            entry.unlink(
                missing_ok=True
            )


# -------------------------
# THEME FILES
# -------------------------

app.mount(
    "/themes",
    StaticFiles(directory=THEMES_DIR),
    name="themes"
)


# -------------------------
# HOME
# -------------------------

@app.get("/")
def home():

    return FileResponse(
        BASE_DIR / "index.html",
        headers=NO_CACHE_HEADERS
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
def birthday_redirect_id(
    birthday_id: str
):

    return RedirectResponse(
        f"/birthday/{birthday_id}/"
    )


@app.get("/birthday/{birthday_id}/")
def birthday_index(
    birthday_id: str
):

    website_dir = GENERATED_DIR / birthday_id
    website = website_dir / "index.html"

    if not website.exists() or not website.is_file():

        raise HTTPException(
            404,
            "Birthday website not found"
        )

    return FileResponse(
        website,
        headers=NO_CACHE_HEADERS
    )


@app.get("/birthday/{birthday_id}/{file_path:path}")
def birthday_file(
    birthday_id: str,
    file_path: str
):

    website_dir = GENERATED_DIR / birthday_id
    file = website_dir / file_path

    if not file.exists() or not file.is_file():

        raise HTTPException(
            404,
            "Birthday website not found"
        )

    return FileResponse(
        file,
        headers=NO_CACHE_HEADERS
    )


# -------------------------
# IMAGE VALIDATION
# -------------------------

def _is_valid_image(
    content: bytes
) -> bool:

    try:

        with Image.open(
            BytesIO(content)
        ) as image:

            image.verify()

        return True

    except (
        UnidentifiedImageError,
        OSError,
        ValueError
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

    music: UploadFile | None = File(None)

):

    # Reuse the current builder session ID when it belongs to a generated site.
    if birthday_id and (
        not re.fullmatch(r"[0-9a-f]{8}", birthday_id)
        or not (GENERATED_DIR / birthday_id).is_dir()
    ):
        birthday_id = ""


    # -------------------------
    # VALIDATE THEME
    # -------------------------

    theme = theme.strip()

    if theme not in THEMES:

        raise HTTPException(
            400,
            "The selected theme does not contain a valid template."
        )


    # -------------------------
    # VALIDATE NAME
    # -------------------------

    name = name.strip()

    if not name:

        raise HTTPException(
            400,
            "Please enter a name."
        )

    if len(name) > MAX_NAME_LENGTH:

        raise HTTPException(
            400,
            "Please enter a shorter name."
        )


    # -------------------------
    # VALIDATE AGE
    # -------------------------

    age = age.strip()

    if (
        not age.isdigit()
        or not (
            MIN_AGE
            <= int(age)
            <= MAX_AGE
        )
    ):

        raise HTTPException(
            400,
            "Please enter a valid age."
        )

    age_value = int(age)


    # -------------------------
    # MESSAGE
    # -------------------------

    message = message.strip()

    if len(message) > MAX_MESSAGE_LENGTH:

        raise HTTPException(
            400,
            f"Message is too long (max {MAX_MESSAGE_LENGTH} characters)."
        )

    if not message:

        message = random.choice(
            RANDOM_MESSAGES
        )


    # -------------------------
    # PHOTOS
    # -------------------------

    photos = [
        photo1,
        photo2,
        photo3,
        photo4,
        photo5,
        photo6
    ]

    selected_photos = [
        photo
        for photo in photos
        if photo and photo.filename
    ]

    if not selected_photos:

        raise HTTPException(
            400,
            "Please upload at least 1 photo."
        )

    if len(selected_photos) > 6:

        raise HTTPException(
            400,
            "You can upload a maximum of 6 photos."
        )


    photo_contents = []

    for photo in selected_photos:

        content = await photo.read()

        if not content:

            continue

        if not _is_valid_image(content):

            raise HTTPException(
                400,
                f"{photo.filename} is not a valid image."
            )

        photo_contents.append(
            (
                photo.filename,
                content
            )
        )


    if not photo_contents:

        raise HTTPException(
            400,
            "Please upload at least 1 photo."
        )


    # -------------------------
    # MUSIC
    # -------------------------

    music_filename = None
    music_content = None

    if music and music.filename:

        extension = Path(
            music.filename
        ).suffix.lower()

        if extension not in ALLOWED_MUSIC_EXTENSIONS:

            raise HTTPException(
                400,
                "The selected music file is not supported."
            )

        content = await music.read()

        if not content:

            raise HTTPException(
                400,
                "The selected music file is not supported."
            )

        music_filename = music.filename
        music_content = content


    # -------------------------
    # TEMPORARY FILES
    # -------------------------

    temp = TEMP_DIR / uuid.uuid4().hex

    temp.mkdir(
        parents=True
    )

    try:

        photo_paths = []

        for i, (
            filename,
            content
        ) in enumerate(
            photo_contents,
            1
        ):

            extension = (
                Path(filename).suffix
                or ".jpg"
            )

            path = (
                temp
                / f"photo{i}{extension}"
            )

            path.write_bytes(content)

            photo_paths.append(path)


        music_path = None

        if music_content is not None:

            extension = Path(
                music_filename
            ).suffix

            music_path = (
                temp
                / f"music{extension}"
            )

            music_path.write_bytes(
                music_content
            )


        data = {
            "birthday_id": birthday_id or None,
            "theme": theme,
            "name": name,
            "age": age_value,
            "message": message,
            "photos": photo_paths,
            "music": music_path
        }


        try:

            result = build_website(data)

            print(
                "GENERATED RESULT:",
                result
            )

            return result

        except ValueError as error:

            raise HTTPException(
                400,
                str(error)
            )

        except Exception:

            raise HTTPException(
                500,
                "The website could not be generated."
            )


    finally:

        shutil.rmtree(
            temp,
            ignore_errors=True
        )


# -------------------------
# DOWNLOAD
# -------------------------

@app.get("/download/{birthday_id}")
def download_zip(
    birthday_id: str
):

    zip_file = (
        GENERATED_DIR
        / f"{birthday_id}.zip"
    )

    if not zip_file.exists():

        raise HTTPException(
            404,
            "Birthday website not found"
        )

    return FileResponse(
        zip_file,
        filename="birthday-website.zip",
        media_type="application/zip",
        headers=NO_CACHE_HEADERS
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
        reload=True
    )