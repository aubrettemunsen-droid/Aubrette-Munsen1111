import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { ai, isGeminiConfigured, parseDataUrl } from './geminiClient.ts';
import { GarmentAnalysisResult } from '../../src/types/index.ts';

export async function analyzeGarmentDeep(params: {
  imageOrVideoDataUrl: string;
  isVideo?: boolean;
}): Promise<GarmentAnalysisResult> {
  if (!isGeminiConfigured) {
    throw new Error('GEMINI_API_KEY is required for Gemini 4 Argon analysis.');
  }

  const parsed = parseDataUrl(params.imageOrVideoDataUrl);

  const prompt = `As a master textile engineer and luxury apparel merchandiser, analyze this clothing item or fashion recording in deep technical detail.
Provide:
1. garmentType: Specific apparel nomenclature (e.g. 'Double-Breasted Peak-Lapel Blazer').
2. fabricCategory: Textile composition (e.g. 'High-twist Virgin Wool, Worsted Finish').
3. estimatedGSM: Grams per square meter fabric weight estimate (e.g. '280-320 GSM').
4. weaveStructure: Technical weave type (e.g. 'Twill Weave with Melange Texture').
5. silhouetteAndFit: Structural cut (e.g. 'Structured Tailored Slim Fit, Soft Shoulder Pad').
6. keyDesignFeatures: Array of 3-5 specific details (e.g. ['Horn buttons', 'Ticket flap pocket', 'Double vented rear']).
7. drapeScore: Integer 1-10 describing fluid drape vs structured stiffness (10 = fluid silk, 1 = heavy canvas).
8. lightingAndTextureNotes: Analysis of specular highlights, fiber luster, and wrinkle resistance.
9. colorPalette: Dominant hex code and 2-3 accent or complementary hex codes.
10. commercialCopy: High-conversion, editorial luxury product description for commercial e-commerce.`;

  // Note: Do not set maxOutputTokens with thinkingLevel: HIGH per instructions
  const response = await ai.models.generateContent({
    model: 'gemini-4-argon',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.base64Data,
          },
        },
        { text: prompt },
      ],
    },
    config: {
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.HIGH,
      },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          garmentType: { type: Type.STRING },
          fabricCategory: { type: Type.STRING },
          estimatedGSM: { type: Type.STRING },
          weaveStructure: { type: Type.STRING },
          silhouetteAndFit: { type: Type.STRING },
          keyDesignFeatures: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          drapeScore: { type: Type.INTEGER },
          lightingAndTextureNotes: { type: Type.STRING },
          colorPalette: {
            type: Type.OBJECT,
            properties: {
              dominant: { type: Type.STRING },
              accents: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['dominant', 'accents'],
          },
          commercialCopy: { type: Type.STRING },
        },
        required: [
          'garmentType',
          'fabricCategory',
          'estimatedGSM',
          'weaveStructure',
          'silhouetteAndFit',
          'keyDesignFeatures',
          'drapeScore',
          'lightingAndTextureNotes',
          'colorPalette',
          'commercialCopy',
        ],
      },
    },
  });

  const text = response.text || '{}';
  try {
    const parsedData = JSON.parse(text) as GarmentAnalysisResult;
    return parsedData;
  } catch (err) {
    console.error('Failed to parse Gemini 4 Argon structured response:', text);
    throw new Error('Garment analysis response parsing failed.');
  }
}

export async function fastAnalyzeGarment(params: {
  imageDataUrl: string;
}): Promise<{
  category: string;
  colors: string[];
  recommendedShades: string[];
  summary: string;
}> {
  if (!isGeminiConfigured) {
    throw new Error('GEMINI_API_KEY is required for quick analysis.');
  }

  const parsed = parseDataUrl(params.imageDataUrl);

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.base64Data,
          },
        },
        {
          text: 'Quick clothing triage: Identify apparel category, detected primary colors (hex), 3 trending seasonal recolor palette recommendations (hex), and a 1-sentence summary.',
        },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          colors: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendedShades: { type: Type.ARRAY, items: { type: Type.STRING } },
          summary: { type: Type.STRING },
        },
        required: ['category', 'colors', 'recommendedShades', 'summary'],
      },
    },
  });

  const text = response.text || '{}';
  return JSON.parse(text);
}
