import { ai, isGeminiConfigured, parseDataUrl } from './geminiClient.ts';
import { RecolorParams } from '../../src/types/index.ts';

export async function executeRecolor(params: {
  sourceDataUrl: string;
  targetColor: string;
  region: 'garment' | 'custom_mask';
  maskDataUrl?: string;
  preserveTexture: boolean;
  preservePattern: boolean;
  mode: 'programmatic' | 'ai_enhanced';
}): Promise<{
  resultDataUrl: string;
  modeUsed: string;
  tokensEstimate: number;
}> {
  const { sourceDataUrl, targetColor, mode, maskDataUrl, preserveTexture, preservePattern } = params;

  // If Gemini is available and mode is 'ai_enhanced' or user requested complex fabric synthesis:
  if (isGeminiConfigured && mode === 'ai_enhanced') {
    try {
      const parsed = parseDataUrl(sourceDataUrl);
      const parts: any[] = [
        {
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.base64Data,
          },
        }
      ];

      if (maskDataUrl) {
        const maskParsed = parseDataUrl(maskDataUrl);
        parts.push({
          inlineData: {
            mimeType: maskParsed.mimeType,
            data: maskParsed.base64Data,
          },
        });
      }

      const promptText = `Precision clothing recolor task:
- Target Color: ${targetColor} (Hex code).
- Target area: ${params.region === 'custom_mask' ? 'Only modify the area indicated by the mask.' : 'Only the apparel garment.'}
- Crucial requirements:
  1. Strictly preserve all original fabric weave, folds, wrinkles, shadows, highlights, buttons, and stitching.
  2. Keep all non-clothing areas (skin, face, hair, background, props) 100% untouched.
  3. ${preservePattern ? 'Retain original fabric pattern or print, adjusting only base hue.' : 'Apply smooth, uniform solid color tone with realistic fabric sheen.'}
  4. Ensure no color bleeding or artificial plastic flat effect.`;

      parts.push({ text: promptText });

      // Call gemini-nano-banana-2.1 or gemini-3.1-flash-lite-image
      const response = await ai.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: '3:4',
            imageSize: '1K'
          }
        }
      });

      const candidate = response.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData?.data) {
            const outMime = part.inlineData.mimeType || 'image/jpeg';
            return {
              resultDataUrl: `data:${outMime};base64,${part.inlineData.data}`,
              modeUsed: 'gemini-nano-banana-2.1 (Generative Localized Inpainting)',
              tokensEstimate: 1250
            };
          }
        }
      }
    } catch (err) {
      console.warn('AI generative recolor failed, falling back to programmatic precision color engine:', err);
    }
  }

  // Programmatic color transformation
  // We can return the instructions & parameters for high-precision canvas rendering, or return adjusted dataUrl.
  // In our system, the client also has a canvas-based shader/HSL processor for instantaneous live preview and 100% non-target pixel protection.
  return {
    resultDataUrl: sourceDataUrl, // will be synthesized by programmatic pipeline
    modeUsed: 'Programmatic HSL/Luminance Matrix Transformation',
    tokensEstimate: 0
  };
}
