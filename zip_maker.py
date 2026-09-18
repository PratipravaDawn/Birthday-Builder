from pathlib import Path
import zipfile


def make_zip(folder, output):
    folder = Path(folder)
    output = Path(output)

    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for file in folder.rglob("*"):
            if file.is_file():
                zip_file.write(
                    file,
                    file.relative_to(folder)
                )

    return output


def make_birthday_zip(website_dir, theme_dir, output, website_data):
    website_dir = Path(website_dir)
    theme_dir = Path(theme_dir)
    output = Path(output)

    generated_files = {
        file.relative_to(website_dir).as_posix()
        for file in website_dir.rglob("*")
        if file.is_file()
    }

    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zip_file:

        # Birthday-specific files.
        for file in website_dir.rglob("*"):
            if file.is_file():
                zip_file.write(
                    file,
                    file.relative_to(website_dir)
                )

        # Shared theme assets are added only to the downloaded ZIP.
        # They are not duplicated in data/generated/.
        for file in theme_dir.rglob("*"):

            if not file.is_file():
                continue

            relative = file.relative_to(theme_dir).as_posix()

            if relative in {
                "preview.html",
                "preview.png",
                f"{theme_dir.name}.css",
                f"{theme_dir.name}.js",
                "classic.zip"
            }:
                continue

            # Only include the theme's music when the birthday uses it.
            if relative.startswith("music/"):
                if website_data.get("music") != relative:
                    continue

            if relative in generated_files:
                continue

            zip_file.write(
                file,
                relative
            )

    return output
