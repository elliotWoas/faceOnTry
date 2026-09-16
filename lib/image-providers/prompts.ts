export const MODE_1_BASE_PROMPT = `Apply the exact hairstyle from the reference image to the person in the target image.

Strictly preserve the target person’s complete identity and facial appearance. Do not modify the face, eyes, eyebrows, nose, lips, ears, skin tone, skin texture, facial structure, proportions, age, expression, body, clothing, background, lighting, camera angle, or composition in any way.

Change only the hair and hairstyle.

Use the reference image solely as a guide for hairstyle, haircut, hair length, color, texture, volume, shape, parting, and styling details.

Do not transfer or influence the reference person’s face, identity, skin, body, or any other features.

The final result must be photorealistic, with the new hair seamlessly and naturally integrated into the original image, matching the original lighting and perspective.`

export const MODE_2_BASE_PROMPT = `Analyze the person's face shape, facial proportions, current hair characteristics, hairline, hair texture, and overall appearance.

Choose the hairstyle that would most naturally and aesthetically suit this person.

Then edit the image by changing ONLY the hair and hairstyle.

Preserve the person's identity and facial appearance as accurately as possible. Do not change the face, eyes, eyebrows, nose, lips, ears, skin tone, skin texture, facial proportions, age, body, clothing, background, camera angle, lighting, or composition.

Only modify the hair.

The result must be photorealistic and naturally integrated with the original image.

Also return the selected hairstyle name and a short explanation in this exact format:
Recommended hairstyle: [Name of hairstyle]
Reason: [Short 1-2 sentence explanation of why this suits their face shape and features]`;
