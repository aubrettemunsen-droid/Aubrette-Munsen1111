import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { assetStore } from './server/store/assetStore.ts';
import { taskQueue } from './server/store/taskQueue.ts';
import { isGeminiConfigured } from './server/ai/geminiClient.ts';
import { analyzeGarmentDeep, fastAnalyzeGarment } from './server/ai/garmentAnalysis.ts';
import { startRunwayVideo, checkRunwayVideoStatus } from './server/ai/videoRunway.ts';
import {
  parseDesignIntent,
  renderCandidateImage,
  reviseDesignCandidate,
  generateMultiViews,
  designerStore,
} from './server/ai/fashionDesignBrain.ts';
import { DesignCandidate } from './src/types/index.ts';
import { openSourceRegistry } from './server/core/openSourceModelRegistry.ts';
import { aiRoutingEngine } from './server/core/aiRoutingEngine.ts';
import { evaluationSystem } from './server/core/evaluationSystem.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const startTime = Date.now();

// Large body limit for high-res base64 image data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// API Endpoints
// ==========================================

// 1. Upload & validate image asset
app.post('/api/uploads', (req: Request, res: Response) => {
  try {
    const { dataUrl, name, category, tags } = req.body;
    if (!dataUrl || typeof dataUrl !== 'string') {
      res.status(400).json({ error: 'Missing or invalid dataUrl.' });
      return;
    }

    if (!dataUrl.startsWith('data:image/')) {
      res.status(400).json({ error: 'Uploaded file must be a valid image format (JPEG, PNG, WEBP).' });
      return;
    }

    // Estimate file size from base64 length
    const approxBytes = Math.round((dataUrl.length * 3) / 4);
    if (approxBytes > 18 * 1024 * 1024) {
      res.status(400).json({ error: 'Image exceeds maximum allowable file size of 15MB.' });
      return;
    }

    const matches = dataUrl.match(/^data:([a-zA-Z0-9/+-]+);base64,/);
    const mimeType = matches ? matches[1] : 'image/jpeg';

    const id = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const asset = assetStore.save({
      id,
      name: name || `Asset_${Date.now()}`,
      mimeType,
      dataUrl,
      sizeBytes: approxBytes,
      category: category || 'garment',
      tags: tags || [],
    });

    res.status(201).json({
      assetId: asset.id,
      name: asset.name,
      mimeType: asset.mimeType,
      category: asset.category,
      createdAt: asset.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Upload processing failed.' });
  }
});

// 2. Feature A: Virtual Try-On
app.post('/api/try-on', (req: Request, res: Response) => {
  try {
    const { personAssetId, garmentAssetId, quality, preserveIdentity, preserveBackground, category } = req.body;

    if (!personAssetId || !garmentAssetId) {
      res.status(400).json({ error: 'personAssetId and garmentAssetId are both required.' });
      return;
    }

    const person = assetStore.get(personAssetId);
    const garment = assetStore.get(garmentAssetId);

    if (!person || !garment) {
      res.status(404).json({ error: 'One or more assets were not found in repository.' });
      return;
    }

    const task = taskQueue.createTask('try_on', {
      personAssetId,
      garmentAssetId,
      quality: quality || 'hd',
      preserveIdentity: preserveIdentity !== false,
      preserveBackground: preserveBackground !== false,
      category: category || 'outerwear',
    });

    res.status(202).json({
      taskId: task.id,
      status: task.status,
      stageMessage: task.stageMessage,
      progress: task.progress,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Virtual Try-On submission failed.' });
  }
});

// 3. Feature B: AI Fashion Model Shoot
app.post('/api/model-shoot', (req: Request, res: Response) => {
  try {
    const { garmentAssetId, modelStyle, gender, composition, background, pose, imageSize, numCandidates } = req.body;

    if (!garmentAssetId) {
      res.status(400).json({ error: 'garmentAssetId is required.' });
      return;
    }

    const garment = assetStore.get(garmentAssetId);
    if (!garment) {
      res.status(404).json({ error: 'Garment asset was not found.' });
      return;
    }

    const task = taskQueue.createTask('model_shoot', {
      garmentAssetId,
      modelStyle: modelStyle || 'commercial_catalog',
      gender: gender || 'female',
      composition: composition || 'full_body',
      background: background || 'studio_warm_grey',
      pose: pose || 'natural_standing',
      imageSize: imageSize || '1K',
      numCandidates: numCandidates || 1,
    });

    res.status(202).json({
      taskId: task.id,
      status: task.status,
      stageMessage: task.stageMessage,
      progress: task.progress,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Model shoot task creation failed.' });
  }
});

// 4. Feature C: Precision Clothing Recolor
app.post('/api/recolor', (req: Request, res: Response) => {
  try {
    const { sourceAssetId, targetColor, region, maskData, preserveTexture, preservePattern, mode } = req.body;

    if (!sourceAssetId || !targetColor) {
      res.status(400).json({ error: 'sourceAssetId and targetColor (HEX) are required.' });
      return;
    }

    const source = assetStore.get(sourceAssetId);
    if (!source) {
      res.status(404).json({ error: 'Source garment asset not found.' });
      return;
    }

    const task = taskQueue.createTask('recolor', {
      sourceAssetId,
      targetColor,
      region: region || 'garment',
      maskData,
      preserveTexture: preserveTexture !== false,
      preservePattern: preservePattern !== false,
      mode: mode || 'programmatic',
    });

    res.status(202).json({
      taskId: task.id,
      status: task.status,
      stageMessage: task.stageMessage,
      progress: task.progress,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Recolor task creation failed.' });
  }
});

// 5. Query task list & status
app.get('/api/tasks', (req: Request, res: Response) => {
  const { status, type } = req.query;
  let tasks = taskQueue.listTasks();
  if (status && typeof status === 'string') {
    tasks = tasks.filter(t => t.status === status);
  }
  if (type && typeof type === 'string') {
    tasks = tasks.filter(t => t.type === type);
  }
  res.json(tasks);
});

// 5b. Query single task status & progress
app.get('/api/tasks/:id', (req: Request, res: Response) => {
  const task = taskQueue.getTask(req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }
  res.json(task);
});

// 6. Retry task
app.post('/api/tasks/:id/retry', (req: Request, res: Response) => {
  const newTask = taskQueue.retryTask(req.params.id, req.body.updatedParams);
  if (!newTask) {
    res.status(404).json({ error: 'Task not found to retry.' });
    return;
  }
  res.status(202).json(newTask);
});

// 7. Cancel task
app.post('/api/tasks/:id/cancel', (req: Request, res: Response) => {
  const success = taskQueue.cancelTask(req.params.id);
  if (!success) {
    res.status(400).json({ error: 'Unable to cancel task (already completed or not found).' });
    return;
  }
  res.json({ message: 'Task cancelled successfully.' });
});

// 8. Get result asset & details
app.get('/api/results/:id', (req: Request, res: Response) => {
  const asset = assetStore.get(req.params.id);
  if (!asset) {
    res.status(404).json({ error: 'Result asset not found.' });
    return;
  }
  res.json(asset);
});

// 9. Delete asset
app.delete('/api/assets/:id', (req: Request, res: Response) => {
  const success = assetStore.delete(req.params.id);
  if (!success) {
    res.status(400).json({ error: 'Asset could not be deleted or is a protected benchmark asset.' });
    return;
  }
  res.json({ message: 'Asset successfully deleted.' });
});

// 10. List assets
app.get('/api/assets', (req: Request, res: Response) => {
  const category = req.query.category as any;
  const list = assetStore.list(category);
  res.json(list.map(a => ({
    id: a.id,
    name: a.name,
    mimeType: a.mimeType,
    category: a.category,
    sizeBytes: a.sizeBytes,
    tags: a.tags,
    createdAt: a.createdAt,
    dataUrl: a.dataUrl,
  })));
});

// 11. Benchmark assets
app.get('/api/benchmark-assets', (_req: Request, res: Response) => {
  res.json(assetStore.getBenchmarks());
});

// 12. Deep garment intelligence with Gemini 4 Argon High Thinking
app.post('/api/analyze-garment', async (req: Request, res: Response) => {
  try {
    const { imageOrVideoDataUrl, isVideo } = req.body;
    if (!imageOrVideoDataUrl) {
      res.status(400).json({ error: 'imageOrVideoDataUrl is required.' });
      return;
    }
    const analysis = await analyzeGarmentDeep({ imageOrVideoDataUrl, isVideo });
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Deep garment analysis failed.' });
  }
});

// 13. Low-latency fast garment triage with Gemini 3.1 Flash-Lite
app.post('/api/fast-analyze', async (req: Request, res: Response) => {
  try {
    const { imageDataUrl } = req.body;
    if (!imageDataUrl) {
      res.status(400).json({ error: 'imageDataUrl is required.' });
      return;
    }
    const fastResult = await fastAnalyzeGarment({ imageDataUrl });
    res.json(fastResult);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Fast analysis failed.' });
  }
});

// 14. Veo Runway Video Generation
app.post('/api/generate-video', async (req: Request, res: Response) => {
  try {
    const { imageDataUrl, prompt, aspectRatio } = req.body;
    const op = await startRunwayVideo({ imageDataUrl, prompt, aspectRatio });
    res.json({ operationName: op.operationName });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Veo video generation failed to start.' });
  }
});

// 15. Veo Runway Video Status Check
app.post('/api/video-status', async (req: Request, res: Response) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      res.status(400).json({ error: 'operationName is required.' });
      return;
    }
    const status = await checkRunwayVideoStatus(operationName);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Veo status poll failed.' });
  }
});

// ==========================================
// AI Fashion Designer Endpoints
// ==========================================

// 16. Natural Language Design Chat & Multi-Candidate Planner
app.post('/api/designer/chat', async (req: Request, res: Response) => {
  try {
    const { userMessage, conversationHistory, targetCandidateSpec } = req.body;
    if (!userMessage || typeof userMessage !== 'string') {
      res.status(400).json({ error: 'userMessage is required.' });
      return;
    }

    const intent = await parseDesignIntent({
      userMessage,
      conversationHistory,
      targetCandidateSpec,
    });

    // Create candidate instances and store them
    const initializedCandidates: DesignCandidate[] = [];
    for (let i = 0; i < intent.candidates.length; i++) {
      const c = intent.candidates[i];
      const candId = `cand_${Date.now()}_${i + 1}_${Math.random().toString(36).substring(2, 6)}`;
      const candidate: DesignCandidate = {
        id: candId,
        directionTitle: c.directionTitle,
        directionDescription: c.directionDescription,
        spec: c.spec,
        prompt: c.prompt,
        version: 1,
        createdAt: Date.now(),
      };
      designerStore.saveCandidate(candidate);
      initializedCandidates.push(candidate);
    }

    res.json({
      assistantResponse: intent.assistantResponse,
      conflictNotice: intent.conflictNotice || null,
      suggestedRevisions: intent.suggestedRevisions,
      candidates: initializedCandidates,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Designer brain intent parsing failed.' });
  }
});

// 17. Render image for a specific candidate
app.post('/api/designer/render-candidate', async (req: Request, res: Response) => {
  try {
    const { candidateId } = req.body;
    if (!candidateId) {
      res.status(400).json({ error: 'candidateId is required.' });
      return;
    }

    const candidate = designerStore.getCandidate(candidateId);
    if (!candidate) {
      res.status(404).json({ error: 'Design candidate not found.' });
      return;
    }

    const renderRes = await renderCandidateImage({
      id: candidate.id,
      prompt: candidate.prompt,
      spec: candidate.spec,
    });
    const dataUrl = renderRes.dataUrl;

    const assetId = `asset_design_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    assetStore.save({
      id: assetId,
      name: `${candidate.directionTitle} (${candidate.spec.primaryColor})`,
      mimeType: 'image/jpeg',
      dataUrl,
      category: 'garment',
      tags: ['ai_designer', candidate.spec.designStyle],
    });

    candidate.imageUrl = dataUrl;
    candidate.assetId = assetId;
    candidate.consistencyScore = renderRes.consistencyScore;
    candidate.auditNotes = renderRes.auditNotes;
    designerStore.saveCandidate(candidate);

    res.json({
      candidateId: candidate.id,
      imageUrl: dataUrl,
      assetId,
      consistencyScore: renderRes.consistencyScore,
      auditNotes: renderRes.auditNotes,
      verificationPassed: renderRes.verificationPassed,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to render candidate.' });
  }
});

// 18. Conversational Revision on candidate
app.post('/api/designer/revise', async (req: Request, res: Response) => {
  try {
    const { candidateId, revisionInstruction } = req.body;
    if (!candidateId || !revisionInstruction) {
      res.status(400).json({ error: 'candidateId and revisionInstruction are required.' });
      return;
    }

    const result = await reviseDesignCandidate({
      candidateId,
      revisionInstruction,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Revision failed.' });
  }
});

// 19. Multi-View Technical Generation (Front, Back, Side, Detail)
app.post('/api/designer/multi-view', async (req: Request, res: Response) => {
  try {
    const { candidateId, viewTypes } = req.body;
    if (!candidateId || !viewTypes || !Array.isArray(viewTypes)) {
      res.status(400).json({ error: 'candidateId and viewTypes array are required.' });
      return;
    }

    const views = await generateMultiViews({
      candidateId,
      viewTypes,
    });

    res.json({ views });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Multi-view generation failed.' });
  }
});

// 20. List candidates and revision history
app.get('/api/designer/candidates', (_req: Request, res: Response) => {
  res.json(designerStore.listCandidates());
});

app.get('/api/designer/revisions/:candidateId', (req: Request, res: Response) => {
  res.json(designerStore.getRevisionHistory(req.params.candidateId));
});

// 21. System status
app.get('/api/system/status', (_req: Request, res: Response) => {
  const allTasks = taskQueue.listTasks();
  const activeCount = allTasks.filter(t => t.status === 'processing' || t.status === 'validating' || t.status === 'queued').length;
  const completedCount = allTasks.filter(t => t.status === 'completed').length;

  res.json({
    geminiConfigured: isGeminiConfigured,
    serverTime: new Date().toISOString(),
    activeTasks: activeCount,
    completedTasks: completedCount,
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    availableModels: {
      tryOn: 'gemini-nano-banana-2.1 / gemini-3.1-flash-lite-image',
      modelShoot: 'gemini-nano-banana-2.1 (1K / 2K / 4K)',
      recolor: 'Programmatic HSL/LAB Engine & gemini-nano-banana-2.1 Inpainting',
      analysis: 'gemini-4-argon (ThinkingLevel.HIGH) & gemini-3.1-flash-lite',
      video: 'veo-3.1-fast-generate-preview (16:9 / 9:16)',
      designer: 'gemini-3.8-flash (Fashion Brain) & gemini-nano-banana-2.1 (Synthesis)',
    },
  });
});

// 22. Open-Source Model Registry Specs & Deployment Matrix
app.get('/api/open-source-models', (_req: Request, res: Response) => {
  res.json(openSourceRegistry.listAll());
});

// 23. AI Routing Engine Policy & Telemetry
app.get('/api/routing/config', (_req: Request, res: Response) => {
  res.json({
    config: aiRoutingEngine.getConfig(),
    stats: aiRoutingEngine.getStats(),
  });
});

app.post('/api/routing/config', (req: Request, res: Response) => {
  const updated = aiRoutingEngine.updateConfig(req.body);
  res.json({
    message: 'Routing configuration updated successfully.',
    config: updated,
  });
});

// 24. Automated Benchmark Testing & Commercial Readiness Checklist
app.post('/api/benchmark/run', async (_req: Request, res: Response) => {
  try {
    const result = await evaluationSystem.runLiveBenchmarkSuite();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Benchmark run failed.' });
  }
});

app.get('/api/benchmark/reports', (_req: Request, res: Response) => {
  res.json(evaluationSystem.getEvaluations());
});

app.get('/api/commercial/checklist', (_req: Request, res: Response) => {
  res.json(evaluationSystem.getCommercialChecklist());
});

// ==========================================
// Vite Middleware / Static Serving
// ==========================================

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Atelier AI Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
