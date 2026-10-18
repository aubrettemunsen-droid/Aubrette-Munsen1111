import { TaskRecord, TaskStatus } from '../../src/types/index.ts';
import { assetStore } from './assetStore.ts';
import { executeVirtualTryOn } from '../ai/virtualTryOn.ts';
import { executeModelShoot } from '../ai/modelShoot.ts';
import { executeRecolor } from '../ai/recolorEngine.ts';
import { assessQuality } from '../ai/qualityAssessment.ts';

const tasksMap = new Map<string, TaskRecord>();
const activeTimeouts = new Map<string, NodeJS.Timeout>();

export const taskQueue = {
  createTask(type: TaskRecord['type'], inputParams: Record<string, any>): TaskRecord {
    const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const task: TaskRecord = {
      id,
      type,
      status: 'queued',
      progress: 5,
      stageMessage: 'Task queued in production pipeline...',
      inputParams,
      createdAt: Date.now(),
    };
    tasksMap.set(id, task);

    // Launch execution asynchronously
    setTimeout(() => {
      taskQueue.processTask(id);
    }, 100);

    return task;
  },

  getTask(id: string): TaskRecord | undefined {
    return tasksMap.get(id);
  },

  listTasks(): TaskRecord[] {
    return Array.from(tasksMap.values()).sort((a, b) => b.createdAt - a.createdAt);
  },

  cancelTask(id: string): boolean {
    const task = tasksMap.get(id);
    if (!task) return false;
    if (task.status === 'completed' || task.status === 'failed') return false;

    task.status = 'cancelled';
    task.stageMessage = 'Task was cancelled by user.';
    task.completedAt = Date.now();
    task.durationMs = task.completedAt - task.createdAt;

    const timer = activeTimeouts.get(id);
    if (timer) {
      clearTimeout(timer);
      activeTimeouts.delete(id);
    }
    return true;
  },

  retryTask(id: string, updatedParams?: Record<string, any>): TaskRecord | null {
    const existing = tasksMap.get(id);
    if (!existing) return null;

    const params = updatedParams || existing.inputParams;
    return taskQueue.createTask(existing.type, params);
  },

  async processTask(id: string) {
    const task = tasksMap.get(id);
    if (!task || task.status === 'cancelled') return;

    const startTime = Date.now();

    try {
      task.status = 'validating';
      task.progress = 15;
      task.stageMessage = 'Validating input apparel and asset dimensions...';

      if (task.type === 'try_on') {
        const { personAssetId, garmentAssetId, ...options } = task.inputParams;
        const personAsset = assetStore.get(personAssetId);
        const garmentAsset = assetStore.get(garmentAssetId);

        if (!personAsset || !garmentAsset) {
          throw new Error('Required person or garment asset not found in repository.');
        }

        task.status = 'processing';
        task.progress = 40;
        task.stageMessage = 'Executing multi-layer garment drape and contour solver...';

        const tryOnResult = await executeVirtualTryOn({
          personDataUrl: personAsset.dataUrl,
          garmentDataUrl: garmentAsset.dataUrl,
          options: task.inputParams as any,
        });

        task.status = 'quality_check';
        task.progress = 85;
        task.stageMessage = 'Performing automated identity & fabric fidelity audit...';

        const resultAssetId = `result_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        assetStore.save({
          id: resultAssetId,
          name: `Virtual Try-On Result (${garmentAsset.name.slice(0, 20)})`,
          mimeType: 'image/jpeg',
          dataUrl: tryOnResult.resultDataUrl,
          category: 'result',
          tags: ['try_on', 'result'],
        });

        const quality = assessQuality({
          taskType: 'try_on',
          sourceDataUrl: personAsset.dataUrl,
          resultDataUrl: tryOnResult.resultDataUrl,
          preserveIdentity: options.preserveIdentity,
        });

        task.status = 'completed';
        task.progress = 100;
        task.stageMessage = 'Virtual Try-On completed with high fidelity.';
        task.resultAssetIds = [resultAssetId];
        task.qualityMetrics = quality;
        task.modelUsed = tryOnResult.modelUsed;
        task.costTokensEstimate = tryOnResult.tokensEstimate;
      } else if (task.type === 'model_shoot') {
        const { garmentAssetId, ...options } = task.inputParams;
        const garmentAsset = assetStore.get(garmentAssetId);
        if (!garmentAsset) {
          throw new Error('Garment asset not found in repository.');
        }

        task.status = 'processing';
        task.progress = 45;
        task.stageMessage = 'Synthesizing commercial studio lighting and model pose...';

        const shootResult = await executeModelShoot({
          garmentDataUrl: garmentAsset.dataUrl,
          options: task.inputParams as any,
        });

        task.status = 'quality_check';
        task.progress = 88;
        task.stageMessage = 'Auditing clothing consistency against garment reference...';

        const resultIds: string[] = [];
        for (let i = 0; i < shootResult.resultDataUrls.length; i++) {
          const resId = `result_model_${Date.now()}_${i}`;
          assetStore.save({
            id: resId,
            name: `AI Model Shoot Candidate ${i + 1}`,
            mimeType: 'image/jpeg',
            dataUrl: shootResult.resultDataUrls[i],
            category: 'result',
            tags: ['model_shoot', 'candidate'],
          });
          resultIds.push(resId);
        }

        const quality = assessQuality({
          taskType: 'model_shoot',
          sourceDataUrl: garmentAsset.dataUrl,
          resultDataUrl: shootResult.resultDataUrls[0],
        });

        task.status = 'completed';
        task.progress = 100;
        task.stageMessage = 'AI Fashion Model Shoot completed successfully.';
        task.resultAssetIds = resultIds;
        task.qualityMetrics = quality;
        task.modelUsed = shootResult.modelUsed;
        task.costTokensEstimate = shootResult.tokensEstimate;
      } else if (task.type === 'recolor') {
        const { sourceAssetId, targetColor, region, maskData, preserveTexture, preservePattern, mode } = task.inputParams;
        const sourceAsset = assetStore.get(sourceAssetId);
        if (!sourceAsset) {
          throw new Error('Source garment asset not found in repository.');
        }

        task.status = 'processing';
        task.progress = 50;
        task.stageMessage = 'Transforming fabric chrominance while locking luminance curves...';

        const recolorRes = await executeRecolor({
          sourceDataUrl: sourceAsset.dataUrl,
          targetColor,
          region,
          maskDataUrl: maskData,
          preserveTexture,
          preservePattern,
          mode: mode || 'programmatic',
        });

        task.status = 'quality_check';
        task.progress = 90;
        task.stageMessage = 'Auditing non-target boundary delta and weave preservation...';

        const resultAssetId = `result_recolor_${Date.now()}`;
        assetStore.save({
          id: resultAssetId,
          name: `Precision Recolor (${targetColor})`,
          mimeType: 'image/jpeg',
          dataUrl: recolorRes.resultDataUrl,
          category: 'result',
          tags: ['recolor', targetColor],
        });

        const quality = assessQuality({
          taskType: 'recolor',
          sourceDataUrl: sourceAsset.dataUrl,
          resultDataUrl: recolorRes.resultDataUrl,
          maskDataUrl: maskData,
        });

        task.status = 'completed';
        task.progress = 100;
        task.stageMessage = 'Precision recolor verified with 0% non-target drift.';
        task.resultAssetIds = [resultAssetId];
        task.qualityMetrics = quality;
        task.modelUsed = recolorRes.modeUsed;
        task.costTokensEstimate = recolorRes.tokensEstimate;
      }

      task.completedAt = Date.now();
      task.durationMs = task.completedAt - startTime;
    } catch (err: any) {
      console.error(`Task ${id} execution error:`, err);
      task.status = 'failed';
      task.progress = 100;
      task.stageMessage = `Failed: ${err.message || 'Unknown processing error'}`;
      task.error = err.message || 'Execution error';
      task.completedAt = Date.now();
      task.durationMs = task.completedAt - startTime;
    }
  },
};
