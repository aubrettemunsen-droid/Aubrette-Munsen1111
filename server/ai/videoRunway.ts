import { ai, isGeminiConfigured, parseDataUrl } from './geminiClient.ts';
import { GenerateVideosOperation } from '@google/genai';

export async function startRunwayVideo(params: {
  imageDataUrl?: string;
  prompt?: string;
  aspectRatio?: '16:9' | '9:16';
}): Promise<{ operationName: string }> {
  if (!isGeminiConfigured) {
    throw new Error('GEMINI_API_KEY is required for Veo video generation.');
  }

  const defaultPrompt = 'Fashion runway model walking with confidence down an architectural runway, fabric moving naturally with fluid physics, soft studio lighting, cinematic 4k footage.';
  const finalPrompt = params.prompt || defaultPrompt;
  const ratio = params.aspectRatio || '9:16';

  const configPayload: any = {
    numberOfVideos: 1,
    resolution: '720p',
    aspectRatio: ratio,
  };

  if (params.imageDataUrl) {
    const parsed = parseDataUrl(params.imageDataUrl);
    const operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: finalPrompt,
      image: {
        imageBytes: parsed.base64Data,
        mimeType: parsed.mimeType,
      },
      config: configPayload,
    });
    if (!operation.name) {
      throw new Error('Video generation operation did not return an operation name.');
    }
    return { operationName: operation.name };
  } else {
    const operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: finalPrompt,
      config: configPayload,
    });
    if (!operation.name) {
      throw new Error('Video generation operation did not return an operation name.');
    }
    return { operationName: operation.name };
  }
}

export async function checkRunwayVideoStatus(operationName: string): Promise<{
  done: boolean;
  videoUri?: string;
  error?: string;
}> {
  if (!isGeminiConfigured) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const op = new GenerateVideosOperation();
  op.name = operationName;
  const updated = await ai.operations.getVideosOperation({ operation: op });

  if (updated.done) {
    const videoUri = updated.response?.generatedVideos?.[0]?.video?.uri;
    return {
      done: true,
      videoUri,
    };
  }

  return {
    done: false,
  };
}
