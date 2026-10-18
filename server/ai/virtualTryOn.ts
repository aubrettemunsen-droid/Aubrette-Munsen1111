import { ai, isGeminiConfigured, parseDataUrl } from './geminiClient.ts';
import { TryOnParams } from '../../src/types/index.ts';

export async function executeVirtualTryOn(params: {
  personDataUrl: string;
  garmentDataUrl: string;
  options: TryOnParams;
}): Promise<{
  resultDataUrl: string;
  modelUsed: string;
  tokensEstimate: number;
}> {
  const { personDataUrl, garmentDataUrl, options } = params;

  if (!isGeminiConfigured) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please verify your environment settings.');
  }

  const personParsed = parseDataUrl(personDataUrl);
  const garmentParsed = parseDataUrl(garmentDataUrl);

  const modelName = options.quality === 'max' ? 'gemini-nano-banana-2.1' : 'gemini-3.1-flash-lite-image';

  const promptText = `Commercial Virtual Try-On Task:
Input 1 is the person photograph.
Input 2 is the reference apparel garment.

Your strict task is to perform high-fidelity photorealistic clothing retargeting:
1. Dress the person in Input 1 with the exact garment shown in Input 2.
2. ${options.preserveIdentity ? 'Strictly PRESERVE the person\'s face, eyes, facial identity, hairstyle, skin tone, body stance, and anatomical proportions.' : 'Adapt body posture naturally while maintaining model characteristics.'}
3. ${options.preserveBackground ? 'Keep the background, studio floor, and ambient environment identical to Input 1.' : 'Blend into a clean commercial studio lighting setup.'}
4. Garment fidelity: Accurately reproduce the garment\'s lapels, collar, buttons, seams, fabric weave texture, silhouette, and color tone.
5. Physics: Wrap the fabric naturally around the person\'s torso, arms, and shoulders, with authentic fold lines, drape geometry, and natural contact shadows on the body.
6. Absolutely avoid clipping, unnatural limb mutations, distorted faces, or floating fabric artifacts. Output a single pristine commercial fashion catalog image.`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: personParsed.mimeType,
            data: personParsed.base64Data,
          },
        },
        {
          inlineData: {
            mimeType: garmentParsed.mimeType,
            data: garmentParsed.base64Data,
          },
        },
        {
          text: promptText,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: '3:4',
        imageSize: options.quality === 'max' ? '2K' : '1K',
      },
    },
  });

  const candidate = response.candidates?.[0];
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        const outMime = part.inlineData.mimeType || 'image/jpeg';
        return {
          resultDataUrl: `data:${outMime};base64,${part.inlineData.data}`,
          modelUsed: `${modelName} (Commercial Try-On Pipeline)`,
          tokensEstimate: options.quality === 'max' ? 1850 : 1200,
        };
      }
    }
  }

  throw new Error('AI Virtual Try-On did not return an image part in the response.');
}
