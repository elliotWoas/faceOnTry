"""Download official MediaPipe task assets during setup."""

from pathlib import Path
from urllib.request import urlretrieve

ASSETS = {
    "face_landmarker.task": "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
    "hair_segmenter.tflite": "https://storage.googleapis.com/mediapipe-models/image_segmenter/hair_segmenter/float32/latest/hair_segmenter.tflite",
}
root = Path(__file__).resolve().parent / "models"
root.mkdir(parents=True, exist_ok=True)
for name, url in ASSETS.items():
    target = root / name
    if not target.is_file():
        print(f"Downloading {name}...")
        urlretrieve(url, target)
    print(f"{name}: {target.stat().st_size} bytes")
