"""Download official MediaPipe task assets during setup."""

from pathlib import Path
from urllib.request import urlretrieve

ASSETS = {
    "face_landmarker.task": "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
    "hair_segmenter.tflite": "https://storage.googleapis.com/mediapipe-models/image_segmenter/hair_segmenter/float32/latest/hair_segmenter.tflite",
}
MIN_SIZES = {"face_landmarker.task": 1_000_000, "hair_segmenter.tflite": 100_000}
root = Path(__file__).resolve().parent / "models"
root.mkdir(parents=True, exist_ok=True)
for name, url in ASSETS.items():
    target = root / name
    if not target.is_file() or target.stat().st_size < MIN_SIZES[name]:
        print(f"Downloading {name}...")
        temporary = root / f"{name}.download"
        urlretrieve(url, temporary)
        if temporary.stat().st_size < MIN_SIZES[name]:
            raise RuntimeError(f"Downloaded {name} is incomplete")
        temporary.replace(target)
    print(f"{name}: {target.stat().st_size} bytes")
