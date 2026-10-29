"""JSON-in/JSON-out image preparation and composition for the Next.js server."""

import base64
import io
import json
import os
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

MODEL_DIR = Path(__file__).resolve().parent / "models"
os.environ.setdefault("MPLCONFIGDIR", str(Path(tempfile.gettempdir()) / "faceontry-matplotlib"))
MAX_PIXELS = 24_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS
FACE_OVAL = (10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361,
             288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149,
             150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103,
             67, 109)


def decode(data):
    image = Image.open(io.BytesIO(base64.b64decode(data, validate=True)))
    if image.width * image.height > MAX_PIXELS:
        raise ValueError("Image is too large to process")
    return ImageOps.exif_transpose(image).convert("RGB")


def encode(image):
    out = io.BytesIO()
    image.save(out, format="PNG", optimize=True)
    return base64.b64encode(out.getvalue()).decode("ascii")


def detect(image):
    try:
        import mediapipe as mp
    except ImportError as exc:
        raise RuntimeError("Install python_service/requirements.txt") from exc
    face_path = MODEL_DIR / "face_landmarker.task"
    hair_path = MODEL_DIR / "hair_segmenter.tflite"
    if not face_path.is_file() or not hair_path.is_file():
        raise RuntimeError("Run python python_service/download_models.py first")
    analysis = image.copy()
    analysis.thumbnail((1536, 1536), Image.Resampling.LANCZOS)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.asarray(analysis))
    global _LANDMARKER, _SEGMENTER
    if _LANDMARKER is None:
        face_options = mp.tasks.vision.FaceLandmarkerOptions(
            base_options=mp.tasks.BaseOptions(model_asset_path=str(face_path)), num_faces=2)
        _LANDMARKER = mp.tasks.vision.FaceLandmarker.create_from_options(face_options)
    if _SEGMENTER is None:
        hair_options = mp.tasks.vision.ImageSegmenterOptions(
            base_options=mp.tasks.BaseOptions(model_asset_path=str(hair_path)), output_category_mask=True)
        _SEGMENTER = mp.tasks.vision.ImageSegmenter.create_from_options(hair_options)
    faces = _LANDMARKER.detect(mp_image).face_landmarks
    if len(faces) != 1:
        raise ValueError("Use a clear photo with exactly one visible face")
    category = np.squeeze(_SEGMENTER.segment(mp_image).category_mask.numpy_view().copy())
    mask = Image.fromarray((category == 1).astype(np.uint8) * 255, "L").resize(image.size, Image.Resampling.NEAREST)
    if mask.getbbox() is None:
        raise ValueError("Hair could not be detected in this image")
    points = [(round(p.x * image.width), round(p.y * image.height)) for p in faces[0]]
    return points, mask


_LANDMARKER = None
_SEGMENTER = None


def align_reference_hair(reference_points, reference_hair, target_points, target_size):
    """Map reference hair silhouette onto the target using eyes and chin."""
    anchors = (33, 263, 152)
    if min(len(reference_points), len(target_points)) <= max(anchors):
        return Image.new("L", target_size, 0)
    source = np.array([[*reference_points[i], 1] for i in anchors], dtype=float)
    destination = np.array([target_points[i] for i in anchors], dtype=float)
    try:
        forward = np.linalg.solve(source, destination).T
        affine = np.vstack([forward, [0, 0, 1]])
        inverse = np.linalg.inv(affine)
    except np.linalg.LinAlgError:
        return Image.new("L", target_size, 0)
    if not np.isfinite(inverse).all():
        return Image.new("L", target_size, 0)
    return reference_hair.transform(target_size, Image.Transform.AFFINE,
                                    tuple(inverse[:2].ravel()),
                                    resample=Image.Resampling.NEAREST, fillcolor=0)


def crop_box(image, points, hair_mask, reference=False):
    hair = hair_mask.getbbox()
    xs, ys = zip(*points)
    face = (min(xs), min(ys), max(xs), max(ys))
    x0, y0 = min(hair[0], face[0]), min(hair[1], face[1])
    x1, y1 = max(hair[2], face[2]), max(hair[3], face[3])
    span_x, span_y = x1 - x0, y1 - y0
    side = 0.22 if reference else 0.32
    left = max(0, int(x0 - span_x * side))
    right = min(image.width, int(x1 + span_x * side))
    top = max(0, int(y0 - span_y * 0.28))
    bottom = min(image.height, int(y1 + span_y * (0.18 if reference else 0.40)))
    return [left, top, right, bottom]


def scaled_crop(image, box, limit, upscale=False):
    result = image.crop(tuple(box))
    scale = limit / max(result.size)
    if scale < 1 or upscale:
        result = result.resize((max(1, round(result.width * scale)),
                                max(1, round(result.height * scale))), Image.Resampling.LANCZOS)
    return result


def editable_mask(size, points, hair, box):
    left, top, right, bottom = box
    width, height = size
    hair = hair.crop(tuple(box)).resize(size, Image.Resampling.NEAREST)
    radius = max(9, round(min(size) * 0.055) | 1)
    allowed = hair.filter(ImageFilter.MaxFilter(radius))
    xy = [((x - left) * width / (right - left), (y - top) * height / (bottom - top)) for x, y in points]
    xs, ys = zip(*xy)
    face_l, face_r = min(xs), max(xs)
    face_t, face_b = min(ys), max(ys)
    protected = Image.new("L", size, 0)
    draw = ImageDraw.Draw(protected)
    if len(xy) > max(FACE_OVAL):
        draw.polygon([xy[index] for index in FACE_OVAL], fill=255)
        # Keep the upper forehead editable for a new fringe, but protect eyes.
        brow_y = min(xy[70][1], xy[300][1]) if len(xy) > 300 else face_t + (face_b-face_t)*0.28
        draw.rectangle((0, 0, width, brow_y), fill=0)
    else:
        draw.ellipse((face_l + (face_r-face_l)*0.11, face_t + (face_b-face_t)*0.28,
                      face_r - (face_r-face_l)*0.11, face_b), fill=255)
    allowed = Image.fromarray(np.where(np.asarray(protected) > 0, 0, np.asarray(allowed)).astype(np.uint8), "L")
    return allowed


def prepare(payload):
    target = decode(payload["userImage"])
    points, hair = detect(target)
    reference = None
    ref_points = None
    ref_hair = None
    if payload.get("referenceImage"):
        reference = decode(payload["referenceImage"])
        ref_points, ref_hair = detect(reference)
        aligned = align_reference_hair(ref_points, ref_hair, points, target.size)
        hair = Image.fromarray(np.maximum(np.asarray(hair), np.asarray(aligned)).astype(np.uint8), "L")
    box = crop_box(target, points, hair)
    target_crop = scaled_crop(target, box, 1024, upscale=True)
    allowed_crop = editable_mask(target_crop.size, points, hair, box)
    offset = ((1024 - target_crop.width) // 2, (1024 - target_crop.height) // 2)
    canvas = Image.new("RGB", (1024, 1024), target_crop.getpixel((0, 0)))
    canvas.paste(target_crop, offset)
    allowed = Image.new("L", (1024, 1024), 0)
    allowed.paste(allowed_crop, offset)
    if np.asarray(allowed).mean() < 2:
        raise ValueError("Detected hair region is too small")
    api_mask = Image.new("RGBA", canvas.size, (0, 0, 0, 255))
    api_mask.putalpha(ImageOps.invert(allowed))
    result = {"target": encode(canvas), "mask": encode(api_mask),
              "allowed": encode(allowed), "box": box, "size": canvas.size,
              "contentBox": [offset[0], offset[1], offset[0] + target_crop.width, offset[1] + target_crop.height]}
    if reference is not None and ref_points is not None and ref_hair is not None:
        ref_box = crop_box(reference, ref_points, ref_hair, reference=True)
        result["reference"] = encode(scaled_crop(reference, ref_box, 768))
    return result


def compose(payload):
    original = decode(payload["userImage"])
    generated = decode(payload["generatedImage"])
    box = payload["box"]
    if len(box) != 4 or box[2] <= box[0] or box[3] <= box[1]:
        raise ValueError("Invalid crop box")
    region_size = (box[2] - box[0], box[3] - box[1])
    generated = generated.resize((1024, 1024), Image.Resampling.LANCZOS)
    content_box = tuple(payload["contentBox"])
    generated = generated.crop(content_box).resize(region_size, Image.Resampling.LANCZOS)
    alpha = decode(payload["allowed"]).convert("L").crop(content_box).resize(region_size, Image.Resampling.BILINEAR)
    alpha = alpha.filter(ImageFilter.GaussianBlur(max(2, round(min(region_size) * 0.006))))
    out = original.copy()
    background = original.crop(tuple(box))
    out.paste(Image.composite(generated, background, alpha), tuple(box[:2]))
    return {"imageUrl": "data:image/png;base64," + encode(out)}


def main():
    try:
        payload = json.load(sys.stdin)
        action = payload.get("action")
        result = prepare(payload) if action == "prepare" else compose(payload) if action == "compose" else None
        if result is None:
            raise ValueError("Unknown action")
        print(json.dumps({"ok": True, **result}))
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
