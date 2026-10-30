export const MODE_1_BASE_PROMPT = `Create one photorealistic edit of Image 1: the same person, pose, framing, clothing, background, and scene lighting, now wearing the hairstyle shown in Image 2.

Image 1 is the target portrait and the source of identity and everything outside the hair. Image 2 is a hairstyle reference only. Transfer the recognizable hair cut and silhouette, length, parting, fringe, layers, volume, curl or wave pattern, texture, and visible hair color. Do not copy the reference person's face, skin, head shape, pose, accessories, clothing, or background.

Fit the reference hairstyle naturally to the target person's head size, hairline, camera angle, and perspective. Match the target photo's light direction, shadows, and photographic texture. Render believable roots, strands, and edges. If a reference detail is hidden or unclear, infer only what is needed for a natural result.

Keep the target's facial anatomy, expression, age, body, clothing, and background unchanged. Hair may naturally overlap the forehead or ears, but do not redraw the visible face, ears, or skin. Change only the hair and the small edge or shadow transitions needed to attach it naturally. Keep the target head in the same position and at the same scale. Return one image with the same composition, without a collage, text, or extra people.`

export const MODE_2_BASE_PROMPT = `Analyze the person's face shape, facial proportions, current hair characteristics, hairline, hair texture, and overall appearance.

Choose the hairstyle that would most naturally and aesthetically suit this person.

Then edit the image by changing ONLY the hair and hairstyle.

Preserve the person's identity and facial appearance as accurately as possible. Do not change the face, eyes, eyebrows, nose, lips, ears, skin tone, skin texture, facial proportions, age, body, clothing, background, camera angle, lighting, or composition.

Only modify the hair.

The result must be photorealistic and naturally integrated with the original image.

Also return the selected hairstyle name and a short explanation in this exact format:
Recommended hairstyle: [Name of hairstyle]
Reason: [Short 1-2 sentence explanation of why this suits their face shape and features]`;
