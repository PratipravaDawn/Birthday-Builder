from pathlib import Path
import zipfile


def make_zip(folder, output):
    folder = Path(folder)
    output = Path(output)

    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for file in folder.rglob("*"):
            if file.is_file():
                zip_file.write(file, file.relative_to(folder))

    return output