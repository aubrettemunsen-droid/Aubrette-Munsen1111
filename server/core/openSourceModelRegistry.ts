import { OpenSourceModelSpec } from '../../src/types/index.ts';

export const OPEN_SOURCE_MODEL_REGISTRY: OpenSourceModelSpec[] = [
  {
    id: 'ootdiffusion_v1',
    name: 'OOTDiffusion (Outfitting Over Time)',
    taskType: 'try_on',
    repositoryUrl: 'https://github.com/levihsu/OOTDiffusion',
    weightsSource: 'HuggingFace (levihsu/OOTDiffusion)',
    license: 'Apache 2.0 (Code) / CC-BY-NC-SA 4.0 (Base SD1.5/Human Art Weights)',
    commercialUsable: false, // Requires commercial license review for base checkpoint
    vramRequirements: 'NVIDIA RTX 3090/4090 (24GB VRAM recommended, 16GB min with half-precision)',
    averageLatencyMs: 3800,
    qualityVsApi: 'High garment alignment on half-body poses; occasional seam deformation on extreme limb bending compared to Google VTO.',
    deploymentGuide: 'Docker container with CUDA 12.1 + PyTorch 2.2 + Diffusers. Exposed via FastAPI / vLLM-like worker.',
    status: 'adapter_ready',
  },
  {
    id: 'idm_vton',
    name: 'IDM-VTON (Improving Diffusion Models for Authentic Virtual Try-On)',
    taskType: 'try_on',
    repositoryUrl: 'https://github.com/yisol/IDM-VTON',
    weightsSource: 'HuggingFace (yisol/IDM-VTON)',
    license: 'CC-BY-NC 4.0 (Academic Research; commercial deployment requires fine-tuning on custom license data)',
    commercialUsable: false,
    vramRequirements: 'NVIDIA A100 (40GB) or RTX 4090 (24GB) with fp16/bf16',
    averageLatencyMs: 4200,
    qualityVsApi: 'Exceptional textile fold fidelity; state-of-the-art drape dynamics closely matching commercial API standards.',
    deploymentGuide: 'Deploy via Triton Inference Server with TensorRT-LLM and Diffusers acceleration pipeline.',
    status: 'evaluating',
  },
  {
    id: 'sam_cloth_segmenter',
    name: 'Segment Anything (SAM) with Cloth-Fine-Tune',
    taskType: 'segmentation',
    repositoryUrl: 'https://github.com/facebookresearch/segment-anything',
    weightsSource: 'Meta AI (sam_vit_h_4b8939.pth / sam_vit_l.pth)',
    license: 'Apache 2.0 (Permissive Commercial Use Permitted)',
    commercialUsable: true,
    vramRequirements: 'NVIDIA RTX 3060/4070 (8GB - 12GB VRAM)',
    averageLatencyMs: 340,
    qualityVsApi: 'Pixel-perfect garment boundary segmentation. Outperforms generic cloud vision APIs on collar and hem borders.',
    deploymentGuide: 'Lightweight ONNX Runtime / TensorRT backend on standard GPU instance. Microservice HTTP API.',
    status: 'production_candidate',
  },
  {
    id: 'schp_human_parsing',
    name: 'Self-Correction for Human Parsing (SCHP)',
    taskType: 'human_parsing',
    repositoryUrl: 'https://github.com/GoGoDuck912/Self-Correction-Human-Parsing',
    weightsSource: 'LIP / ATR Pretrained Checkpoints',
    license: 'MIT License (Fully Open Commercial Permitted)',
    commercialUsable: true,
    vramRequirements: 'NVIDIA T4 / RTX 3060 (4GB - 6GB VRAM, or CPU inference)',
    averageLatencyMs: 180,
    qualityVsApi: 'Separates 20 distinct anatomical and apparel semantic zones (face, hair, arms, upper clothes, skirt, pants, shoes).',
    deploymentGuide: 'TorchScript / ONNX export. Can run on shared CPU/GPU nodes with sub-200ms turnaround.',
    status: 'production_candidate',
  },
  {
    id: 'flux_fill_inpaint',
    name: 'FLUX.1-Fill (Black Forest Labs)',
    taskType: 'inpainting',
    repositoryUrl: 'https://github.com/black-forest-labs/flux',
    weightsSource: 'HuggingFace (black-forest-labs/FLUX.1-Fill-dev)',
    license: 'Non-Commercial Dev (Commercial requires BFL API or Enterprise license)',
    commercialUsable: false,
    vramRequirements: 'NVIDIA A100 (40GB/80GB) or dual RTX 4090 with quantized GGUF/NF4',
    averageLatencyMs: 5100,
    qualityVsApi: 'Unmatched photorealistic inpainting for complex reflective velvet, leather grain, and micro-embroidery.',
    deploymentGuide: 'ComfyUI headless server or Diffusers pipeline with NF4 quantization.',
    status: 'evaluating',
  },
];

export const openSourceRegistry = {
  listAll(): OpenSourceModelSpec[] {
    return OPEN_SOURCE_MODEL_REGISTRY;
  },
  getById(id: string): OpenSourceModelSpec | undefined {
    return OPEN_SOURCE_MODEL_REGISTRY.find((m) => m.id === id);
  },
  filterByTask(task: OpenSourceModelSpec['taskType']): OpenSourceModelSpec[] {
    return OPEN_SOURCE_MODEL_REGISTRY.filter((m) => m.taskType === task);
  },
  getCommercialCandidates(): OpenSourceModelSpec[] {
    return OPEN_SOURCE_MODEL_REGISTRY.filter((m) => m.commercialUsable);
  },
};
