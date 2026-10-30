import unittest
from unittest.mock import patch

from PIL import Image, ImageDraw

from processor import compose, editable_mask, encode, prepare, decode


class ProcessorTest(unittest.TestCase):
    def test_composition_keeps_original_outside_hair_region(self):
        original = Image.new("RGB", (200, 200), "red")
        generated = Image.new("RGB", (1024, 1024), "blue")
        allowed = Image.new("L", (1024, 1024), 0)
        ImageDraw.Draw(allowed).rectangle((400, 100, 600, 300), fill=255)
        result = compose({
            "userImage": encode(original), "generatedImage": encode(generated),
            "allowed": encode(allowed), "box": [0, 0, 200, 200],
            "contentBox": [0, 0, 1024, 1024],
        })
        from base64 import b64decode
        from io import BytesIO
        output = Image.open(BytesIO(b64decode(result["imageUrl"].split(",", 1)[1])))
        self.assertEqual(output.getpixel((10, 10)), (255, 0, 0))
        self.assertEqual(output.getpixel((100, 40)), (0, 0, 255))

    def test_editable_mask_excludes_central_face(self):
        hair = Image.new("L", (200, 200), 0)
        ImageDraw.Draw(hair).rectangle((45, 10, 155, 100), fill=255)
        points = [(50, 40), (150, 40), (150, 180), (50, 180)]
        mask = editable_mask((200, 200), points, hair, [0, 0, 200, 200])
        self.assertEqual(mask.getpixel((100, 20)), 255)
        self.assertEqual(mask.getpixel((100, 90)), 0)

    def test_prepare_sends_compact_target_and_reference_with_real_mask(self):
        photo = Image.new("RGB", (1600, 1200), "gray")
        hair = Image.new("L", photo.size, 0)
        ImageDraw.Draw(hair).ellipse((600, 150, 1000, 500), fill=255)
        points = [(650, 320), (950, 320), (950, 800), (650, 800)]
        with patch("processor.detect", return_value=(points, hair)):
            result = prepare({"userImage": encode(photo), "referenceImage": encode(photo)})
        self.assertEqual(decode(result["target"]).size, (1024, 1024))
        self.assertLessEqual(max(decode(result["reference"]).size), 768)
        self.assertEqual(decode(result["mask"]).size, (1024, 1024))
        self.assertGreater(result["contentBox"][2] - result["contentBox"][0], 0)

    def test_reference_hair_expands_edit_area_for_longer_style(self):
        photo = Image.new("RGB", (400, 400), "gray")
        target_hair = Image.new("L", photo.size, 0)
        reference_hair = Image.new("L", photo.size, 0)
        ImageDraw.Draw(target_hair).rectangle((155, 70, 245, 125), fill=255)
        ImageDraw.Draw(reference_hair).rectangle((120, 50, 280, 230), fill=255)
        points = [(200, 200)] * 468
        points[33], points[263], points[152] = (160, 160), (240, 160), (200, 300)
        with patch("processor.detect", side_effect=[
            (points, target_hair), (points, reference_hair),
        ]):
            result = prepare({"userImage": encode(photo), "referenceImage": encode(photo)})

        box = result["box"]
        content = result["contentBox"]
        allowed = decode(result["allowed"]).convert("L")
        x = round(content[0] + (130 - box[0]) * (content[2] - content[0]) / (box[2] - box[0]))
        y = round(content[1] + (180 - box[1]) * (content[3] - content[1]) / (box[3] - box[1]))
        self.assertGreater(allowed.getpixel((x, y)), 0)


if __name__ == "__main__":
    unittest.main()
