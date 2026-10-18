export type TabType = 'designer' | 'try_on' | 'model_shoot' | 'recolor' | 'engine_hub' | 'history';

export interface AssetRecord {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  category?: 'person' | 'garment' | 'result' | 'mask';
  tags?: string[];
  createdAt: number;
}

export type TaskStatus = 'queued' | 'validating' | 'processing' | 'quality_check' | 'completed' | 'failed' | 'cancelled';

export interface QualityMetrics {
  overallScore: number; // 0 - 100
  garmentConsistencyScore: number; // 0 - 100
  identityPreservationScore?: number; // 0 - 100
  nonTargetDeltaPercent?: number; // percentage of drift in non-target pixels
  targetColorDeltaE?: number; // measured color shift in target region
  texturePreservationScore?: number; // 0 - 100
  evaluationMethod?: string;
  notes: string[];
  passed: boolean;
  needsHumanReview?: boolean;
}

export interface TaskRecord {
  id: string;
  type: 'try_on' | 'model_shoot' | 'recolor' | 'video_runway' | 'garment_analysis';
  status: TaskStatus;
  progress: number; // 0 - 100
  stageMessage: string;
  inputParams: Record<string, any>;
  resultAssetIds?: string[];
  resultData?: any;
  error?: string | null;
  qualityMetrics?: QualityMetrics;
  modelUsed?: string;
  durationMs?: number;
  costTokensEstimate?: number;
  createdAt: number;
  completedAt?: number;
}

export interface TryOnParams {
  personAssetId: string;
  garmentAssetId: string;
  quality: 'standard' | 'hd' | 'max';
  preserveIdentity: boolean;
  preserveBackground: boolean;
  category: 'tops' | 'outerwear' | 'bottoms' | 'dresses';
}

export interface ModelShootParams {
  garmentAssetId: string;
  modelStyle: 'commercial_catalog' | 'high_fashion_editorial' | 'streetwear_lookbook' | 'minimalist_nordic';
  gender: 'female' | 'male' | 'unisex';
  composition: 'full_body' | 'three_quarter' | 'close_up_detail';
  background: 'studio_warm_grey' | 'architectural_concrete' | 'sunlit_loft' | 'outdoor_urban';
  pose: 'natural_standing' | 'walking_motion' | 'relaxed_seated';
  imageSize: '1K' | '2K' | '4K';
  numCandidates: number;
}

export interface RecolorParams {
  sourceAssetId: string;
  targetColor: string; // HEX e.g. #C2410C
  region: 'garment' | 'custom_mask';
  maskData?: string; // base64 PNG mask
  preserveTexture: boolean;
  preservePattern: boolean;
  mode: 'programmatic' | 'ai_enhanced';
}

export interface GarmentAnalysisResult {
  garmentType: string;
  fabricCategory: string;
  estimatedGSM: string;
  weaveStructure: string;
  silhouetteAndFit: string;
  keyDesignFeatures: string[];
  drapeScore: number; // 1-10
  lightingAndTextureNotes: string;
  colorPalette: {
    dominant: string;
    accents: string[];
  };
  commercialCopy: string;
  thinkingRationale?: string;
}

export interface SystemStatus {
  geminiConfigured: boolean;
  serverTime: string;
  activeTasks: number;
  completedTasks: number;
  uptimeSeconds: number;
  availableModels: {
    tryOn: string;
    modelShoot: string;
    recolor: string;
    analysis: string;
    video: string;
    designer: string;
  };
}

// ==========================================
// AI Fashion Designer Specifications
// ==========================================

export interface GarmentDesignSpec {
  garmentCategory: string;
  targetAudience: string;
  designStyle: string; // e.g. "Italian Tailored", "Minimalist Modern", "Bespoke Classic"
  silhouette: string; // e.g. "Structured Slim Fit", "Relaxed Drape", "Double-Breasted Hourglass"
  fabricAppearance: string; // e.g. "Worsted Wool with subtle sheen", "Raw Silk", "Chunky Cable Knit"
  primaryColor: string; // e.g. "Deep Navy (#1B2A4A)"
  secondaryColors?: string[]; // e.g. ["Cream White (#FDFBF7)", "Antique Brass"]
  collarType?: string; // e.g. "Wide Peak Lapel (戗驳领)", "Notch Lapel (平驳领)", "Shawl Collar (青果领)"
  sleeveType?: string; // e.g. "Set-in sleeve with 4 working horn buttons"
  closureType?: string; // e.g. "Single-breasted 2-button", "Double-breasted 6x2"
  pocketStyle?: string; // e.g. "Flap pockets with welt ticket pocket"
  decorativeDetails?: string[]; // e.g. ["Hand-stitched pick stitching", "Milanese buttonhole", "Natural shoulder pad"]
  intendedUse?: string; // e.g. "Executive Business, Luxury Gala, Red Carpet"
  outputViews?: string[]; // e.g. ["front", "back", "side", "detail"]
  renderingStyle?: string; // e.g. "Vogue fashion editorial photography", "High-end lookbook"
  hardConstraints: string[]; // Strict non-negotiables
  optionalPreferences: string[]; // Flexible creative guidance
}

export interface DesignCandidate {
  id: string;
  directionTitle: string; // e.g. "Direction 1: Classic Bespoke"
  directionDescription: string;
  spec: GarmentDesignSpec;
  prompt: string;
  imageUrl?: string;
  assetId?: string;
  version: number;
  multiViews?: {
    front?: string;
    back?: string;
    side?: string;
    detail?: string;
  };
  consistencyScore?: number;
  auditNotes?: string[];
  createdAt: number;
}

export interface DesignRevision {
  id: string;
  candidateId: string;
  version: number;
  instruction: string;
  modifiedFields: string[];
  previousSpec: GarmentDesignSpec;
  updatedSpec: GarmentDesignSpec;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  suggestedRevisions?: string[];
  conflictNotice?: string;
  candidateIds?: string[];
}

// ==========================================
// Hybrid AI Architecture & Core Engines
// ==========================================

export type EngineMode = 'auto' | 'programmatic' | 'self_hosted_oss' | 'cloud_api';

export interface EngineRoutingConfig {
  activeMode: EngineMode;
  recolorRoute: 'programmatic' | 'cloud_api';
  segmentationRoute: 'self_developed_mask' | 'sam_cloth_adapter' | 'cloud_api';
  tryOnRoute: 'ootdiffusion_adapter' | 'cloud_vto_api';
  consistencyAuditRoute: 'self_developed_consistency' | 'cloud_api';
  autoFallbackEnabled: boolean;
  maxCostThresholdTokens: number;
}

export interface OpenSourceModelSpec {
  id: string;
  name: string;
  taskType: 'try_on' | 'segmentation' | 'human_parsing' | 'inpainting';
  repositoryUrl: string;
  weightsSource: string;
  license: string;
  commercialUsable: boolean;
  vramRequirements: string;
  averageLatencyMs: number;
  qualityVsApi: string;
  deploymentGuide: string;
  status: 'adapter_ready' | 'evaluating' | 'production_candidate';
}

export interface BenchmarkEvaluationRecord {
  id: string;
  timestamp: number;
  testMode: 'real' | 'mock' | 'demo';
  garmentName: string;
  engineUsed: string;
  inputAssetId?: string;
  outputAssetId?: string;
  modelName?: string;
  modelVersion?: string;
  taskParams?: Record<string, any>;
  latencyMs: number;
  estimatedCostUsd: number;
  nonTargetDriftPercent: number;
  garmentConsistencyScore: number;
  textureRetentionScore: number;
  evaluationMethod:
    | 'pixel_buffer_audit'
    | 'cielab_deltaE'
    | 'structural_ssim'
    | 'attribute_checklist'
    | 'synthetic_benchmark_demo'
    | 'human_audit_required';
  passStatus: boolean;
  status: 'completed' | 'failed' | 'not_run' | 'needs_human_review';
  notes: string[];
}


