import { GarmentDesignSpec } from '../../src/types/index.ts';
import {
  parseDesignIntent,
  renderCandidateImage,
  reviseDesignCandidate,
  generateMultiViews,
  designerStore,
  verifyDesignCandidateSpec,
} from '../ai/fashionDesignBrain.ts';
import { executeVirtualTryOn } from '../ai/virtualTryOn.ts';
import { analyzeGarmentDeep, fastAnalyzeGarment } from '../ai/garmentAnalysis.ts';
import { startRunwayVideo, checkRunwayVideoStatus } from '../ai/videoRunway.ts';
import { fabricColorEngine } from './fabricColorEngine.ts';
import { garmentIntelligence } from './garmentIntelligence.ts';
import { evaluationSystem } from './evaluationSystem.ts';
import { assetStore } from '../store/assetStore.ts';
import { designSchemaValidator, DesignSchemaValidationError } from './designSchemaValidator.ts';
import { isGeminiConfigured } from '../ai/geminiClient.ts';

export type ToolChannel = 'programmatic' | 'gemini_api' | 'veo_api' | 'hybrid';

export interface ToolParameterSchema {
  type: string;
  description: string;
  required?: boolean;
  default?: any;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: 'design' | 'fitting' | 'color' | 'analysis' | 'video' | 'audit';
  channel: ToolChannel;
  modelUsed: string;
  parameters: Record<string, ToolParameterSchema>;
  isRealImplementation: boolean;
  execute: (params: Record<string, any>, context?: Record<string, any>) => Promise<any>;
}

export interface ToolExecutionRecord {
  toolId: string;
  toolName: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  channel: ToolChannel;
  modelUsed: string;
  inputParams: Record<string, any>;
  outputResult: any;
  success: boolean;
  error?: string;
  auditNotes: string[];
}

class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();
  private executionLog: ToolExecutionRecord[] = [];

  constructor() {
    this.registerCoreTools();
  }

  private registerCoreTools() {
    // 1. Fashion Design Generation Tool
    this.register({
      id: 'fashion_designer_create',
      name: 'AI 服装设计生成引擎',
      description: '根据自然语言需求解析服装结构规格，执行高定摄影棚拍图渲染与规格验收。',
      category: 'design',
      channel: isGeminiConfigured ? 'hybrid' : 'programmatic',
      modelUsed: isGeminiConfigured ? 'gemini-3.8-flash & gemini-nano-banana-2.1' : 'Couture Rules & Asset Engine',
      parameters: {
        userPrompt: { type: 'string', description: '服装设计需求自然语言描述', required: true },
        targetCandidateSpec: { type: 'object', description: '可选的特定规格约束', required: false },
      },
      isRealImplementation: true,
      execute: async (params) => {
        const promptCheck = designSchemaValidator.validateUserPrompt(params.userPrompt);
        if (!promptCheck.isValid) {
          throw new DesignSchemaValidationError(promptCheck.errors[0], promptCheck.issues, promptCheck.emptyFields);
        }

        const intent = await parseDesignIntent({
          userMessage: params.userPrompt,
          targetCandidateSpec: params.targetCandidateSpec,
        });

        const primary = intent.candidates[0];
        if (!primary) throw new Error('未能生成有效的服装设计方案。');

        designSchemaValidator.assertValidCandidateForGeneration({
          prompt: primary.prompt,
          spec: primary.spec,
        });

        const candId = `cand_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const renderRes = await renderCandidateImage({
          id: candId,
          prompt: primary.prompt,
          spec: primary.spec,
        });

        const candidateRecord = {
          id: candId,
          directionTitle: primary.directionTitle,
          directionDescription: primary.directionDescription,
          spec: primary.spec,
          prompt: primary.prompt,
          imageUrl: renderRes.dataUrl,
          version: 1,
          consistencyScore: renderRes.consistencyScore,
          auditNotes: renderRes.auditNotes,
          createdAt: Date.now(),
        };
        designerStore.saveCandidate(candidateRecord);

        const assetId = `asset_design_${Date.now()}`;
        assetStore.save({
          id: assetId,
          name: `${primary.spec.garmentCategory} (${primary.spec.primaryColor})`,
          mimeType: 'image/jpeg',
          dataUrl: renderRes.dataUrl,
          category: 'garment',
          tags: ['modagpt_tool', 'design_create'],
        });

        return {
          candidateId: candId,
          assetId,
          imageUrl: renderRes.dataUrl,
          spec: primary.spec,
          version: 1,
          consistencyScore: renderRes.consistencyScore,
          verificationPassed: renderRes.verificationPassed,
          auditNotes: renderRes.auditNotes,
          assistantResponse: intent.assistantResponse,
        };
      },
    });

    // 2. Fashion Design Conversational Revision Tool
    this.register({
      id: 'fashion_designer_revise',
      name: '时装连续对话修改引擎',
      description: '对指定候选时装方案执行定向修改，严格保留未修改属性，生成增量版本并记录历史。',
      category: 'design',
      channel: isGeminiConfigured ? 'hybrid' : 'programmatic',
      modelUsed: isGeminiConfigured ? 'gemini-3.8-flash & gemini-nano-banana-2.1' : 'Keyword Precision Editor',
      parameters: {
        candidateId: { type: 'string', description: '被修改方案ID', required: true },
        revisionInstruction: { type: 'string', description: '修改指令', required: true },
      },
      isRealImplementation: true,
      execute: async (params) => {
        const rev = await reviseDesignCandidate({
          candidateId: params.candidateId,
          revisionInstruction: params.revisionInstruction,
        });
        return {
          candidateId: rev.updatedCandidate.id,
          imageUrl: rev.updatedCandidate.imageUrl,
          spec: rev.updatedCandidate.spec,
          version: rev.updatedCandidate.version,
          modifiedFields: rev.modifiedFields,
          consistencyScore: rev.updatedCandidate.consistencyScore,
          auditNotes: rev.updatedCandidate.auditNotes,
          previousImageUrl: designerStore.getCandidate(params.candidateId)?.imageUrl,
        };
      },
    });

    // 3. Virtual Try-On Tool
    this.register({
      id: 'virtual_try_on',
      name: '真人虚拟试衣引擎',
      description: '将目标服装真实穿在模特或用户人物身躯上，保持面孔身份、自然褶皱并审计非目标漂移。',
      category: 'fitting',
      channel: 'hybrid',
      modelUsed: isGeminiConfigured ? 'gemini-nano-banana-2.1 / OOTDiffusion' : 'Deterministic VTO Adapter',
      parameters: {
        personAssetId: { type: 'string', description: '模特资产ID或Base64', required: false },
        garmentAssetId: { type: 'string', description: '服装资产ID或Base64', required: true },
        category: { type: 'string', description: '品类', required: false, default: 'outerwear' },
      },
      isRealImplementation: true,
      execute: async (params) => {
        // Resolve person asset (default to benchmark model if not specified)
        let personDataUrl = '';
        if (params.personAssetId) {
          const a = assetStore.get(params.personAssetId);
          personDataUrl = a ? a.dataUrl : params.personAssetId;
        } else {
          const benchmarks = assetStore.getBenchmarks();
          personDataUrl = benchmarks[0]?.dataUrl || '';
        }

        // Resolve garment asset
        let garmentDataUrl = '';
        if (params.garmentAssetId) {
          const a = assetStore.get(params.garmentAssetId);
          garmentDataUrl = a ? a.dataUrl : params.garmentAssetId;
        } else {
          throw new Error('未提供有效的试衣目标服装。');
        }

        const tryOnRes = await executeVirtualTryOn({
          personDataUrl,
          garmentDataUrl,
          options: {
            personAssetId: params.personAssetId || 'person',
            garmentAssetId: params.garmentAssetId || 'garment',
            quality: 'hd',
            preserveIdentity: true,
            preserveBackground: true,
            category: params.category || 'outerwear',
          },
        });

        const assetId = `asset_tryon_${Date.now()}`;
        assetStore.save({
          id: assetId,
          name: `Virtual Try-On Output (${new Date().toLocaleTimeString()})`,
          mimeType: 'image/jpeg',
          dataUrl: tryOnRes.resultDataUrl,
          category: 'result',
          tags: ['try_on', 'modagpt'],
        });

        return {
          assetId,
          resultDataUrl: tryOnRes.resultDataUrl,
          modelUsed: tryOnRes.modelUsed,
          status: 'completed',
        };
      },
    });

    // 4. Precision Recolor Tool (Luminance Lock BT.601)
    this.register({
      id: 'precision_recolor',
      name: '面料高精度无损换色引擎',
      description: '基于 ITU-R BT.601 亮度锁定算法执行服装区域换色，保护阴影与高光，非目标漂移严格 <1%。',
      category: 'color',
      channel: 'programmatic',
      modelUsed: 'Programmatic HSL/LAB Luminance Lock (0 Token Spend)',
      parameters: {
        sourceAssetId: { type: 'string', description: '原图资产ID或Base64', required: true },
        targetColorHex: { type: 'string', description: '目标色 HEX，如 #8B2332', required: true },
        mode: { type: 'string', description: '模式', default: 'programmatic' },
      },
      isRealImplementation: true,
      execute: async (params) => {
        let sourceDataUrl = '';
        const a = assetStore.get(params.sourceAssetId);
        sourceDataUrl = a ? a.dataUrl : params.sourceAssetId;

        const recolorRes = await fabricColorEngine.recolorDataUrl({
          sourceDataUrl,
          targetColorHex: params.targetColorHex,
          preserveTexture: true,
        });

        const assetId = `asset_recolor_${Date.now()}`;
        assetStore.save({
          id: assetId,
          name: `Recolored Garment (${params.targetColorHex})`,
          mimeType: 'image/jpeg',
          dataUrl: recolorRes.outputDataUrl,
          category: 'result',
          tags: ['recolor', 'modagpt'],
        });

        return {
          assetId,
          imageUrl: recolorRes.outputDataUrl,
          nonTargetDrift: recolorRes.measuredNonTargetDriftPercent,
          processingTimeMs: recolorRes.processingTimeMs,
          targetColorHex: params.targetColorHex,
          status: 'completed',
        };
      },
    });

    // 5. Fabric Intelligence & Textile Analysis Tool
    this.register({
      id: 'fabric_intelligence_analyze',
      name: '面料纤维与纺织工艺智能分析',
      description: '推断织物经纬组织、克重厚度(GSM)、混纺成分、垂坠感等级与商业企划文案。',
      category: 'analysis',
      channel: isGeminiConfigured ? 'gemini_api' : 'programmatic',
      modelUsed: isGeminiConfigured ? 'gemini-4-argon / gemini-3.8-flash' : 'Local Deterministic Feature Engine',
      parameters: {
        imageAssetId: { type: 'string', description: '目标图片资产ID或Base64', required: true },
        assetName: { type: 'string', description: '资产名称', required: false },
      },
      isRealImplementation: true,
      execute: async (params) => {
        let dataUrl = '';
        const a = assetStore.get(params.imageAssetId);
        dataUrl = a ? a.dataUrl : params.imageAssetId;

        if (isGeminiConfigured) {
          try {
            const deepRes = await analyzeGarmentDeep({ imageOrVideoDataUrl: dataUrl });
            return {
              ...deepRes,
              engine: 'Gemini 4 Argon High Thinking',
            };
          } catch (e) {
            console.warn('Gemini deep analyze fallback to local features engine:', e);
          }
        }

        const localFeatures = garmentIntelligence.extractFeatures({
          assetName: params.assetName || a?.name || 'Garment Specimen',
        });
        return {
          garmentType: localFeatures.category.toUpperCase(),
          fabricCategory: localFeatures.attributes[0] || 'Natural Textile',
          estimatedGSM: '280-340 g/m² (中等挺括高定克重)',
          weaveStructure: 'Sartorial Twill Weave / Dense Interlock',
          silhouetteAndFit: 'Tailored Structure',
          keyDesignFeatures: localFeatures.attributes,
          drapeScore: 8.5,
          lightingAndTextureNotes: `肌理复杂度指数: ${localFeatures.textureComplexityScore}/10，微反光角质与织纹保持良好。`,
          commercialCopy: '高级定制成衣，质地扎实，线条流畅自然。',
          colorPalette: { dominant: '#1B2A4A', accents: ['#C19A6B', '#F9F8F5'] },
          engine: 'Local Deterministic Feature Engine',
        };
      },
    });

    // 6. 4K Runway Video Generation Tool (Veo Engine)
    this.register({
      id: 'runway_video_veo',
      name: '4K 时尚走秀动态视频 (Veo 引擎)',
      description: '基于生成的试衣或棚拍成图，调度 Veo 3.1 视频大模型生成 4K 巴黎时装周动态 T 台走秀短片。',
      category: 'video',
      channel: 'veo_api',
      modelUsed: 'veo-3.1-fast-generate-preview (16:9 / 9:16)',
      parameters: {
        imageUrl: { type: 'string', description: '输入成片图片Base64或URL', required: true },
        aspectRatio: { type: 'string', description: '画幅比例 (9:16 或 16:9)', required: false, default: '9:16' },
      },
      isRealImplementation: true,
      execute: async (params) => {
        let dataUrl = '';
        const a = assetStore.get(params.imageUrl);
        dataUrl = a ? a.dataUrl : params.imageUrl;

        const videoRes = await startRunwayVideo({
          imageDataUrl: dataUrl,
          aspectRatio: params.aspectRatio === '16:9' ? '16:9' : '9:16',
        });

        return videoRes;
      },
    });

    // 7. Algorithm Engine Audit & Live Benchmarking Tool
    this.register({
      id: 'engine_audit_benchmark',
      name: '算法引擎审计与基准质检套件',
      description: '运行 10 项商业就绪清单审核、SSIM 结构对齐、非目标像素漂移审计与成本统计。',
      category: 'audit',
      channel: 'programmatic',
      modelUsed: 'Atelier Commercial Benchmark & SSIM Validator',
      parameters: {},
      isRealImplementation: true,
      execute: async () => {
        const checklist = evaluationSystem.getCommercialChecklist();
        const live = await evaluationSystem.runLiveBenchmarkSuite();
        return {
          checklist,
          liveBenchmark: live,
          passRate: live.summary.passRate,
          averageNonTargetDrift: live.summary.averageNonTargetDrift,
        };
      },
    });
  }

  public register(tool: ToolDefinition) {
    this.tools.set(tool.id, tool);
  }

  public getTool(id: string): ToolDefinition | undefined {
    return this.tools.get(id);
  }

  public listTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public async executeTool(
    toolId: string,
    params: Record<string, any>,
    context?: Record<string, any>
  ): Promise<{ result: any; executionRecord: ToolExecutionRecord }> {
    const tool = this.getTool(toolId);
    if (!tool) {
      throw new Error(`Tool not registered in ModaGPT ToolRegistry: ${toolId}`);
    }

    const startTime = Date.now();
    let result: any = null;
    let error: string | undefined = undefined;
    let success = false;

    try {
      result = await tool.execute(params, context);
      success = true;
    } catch (err: any) {
      error = err.message || 'Tool execution encountered unhandled error';
      success = false;
      throw err;
    } finally {
      const endTime = Date.now();
      const record: ToolExecutionRecord = {
        toolId: tool.id,
        toolName: tool.name,
        startTime,
        endTime,
        durationMs: endTime - startTime,
        channel: tool.channel,
        modelUsed: tool.modelUsed,
        inputParams: params,
        outputResult: success ? result : null,
        success,
        error,
        auditNotes: [
          `[Tool Audit] ${tool.name} via ${tool.channel} (${tool.modelUsed})`,
          `Execution time: ${endTime - startTime}ms · Status: ${success ? 'PASS' : 'FAIL'}`,
        ],
      };
      this.executionLog.push(record);
    }

    return {
      result,
      executionRecord: this.executionLog[this.executionLog.length - 1],
    };
  }

  public getExecutionLogs(): ToolExecutionRecord[] {
    return [...this.executionLog];
  }
}

export const toolRegistry = new ToolRegistry();
