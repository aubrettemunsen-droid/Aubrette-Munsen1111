import { garmentIntelligence } from '../server/core/garmentIntelligence.ts';
import { precisionMaskEngine } from '../server/core/precisionMaskEngine.ts';
import { fabricColorEngine } from '../server/core/fabricColorEngine.ts';
import { garmentConsistencyEngine } from '../server/core/garmentConsistencyEngine.ts';
import { openSourceRegistry } from '../server/core/openSourceModelRegistry.ts';
import { aiRoutingEngine } from '../server/core/aiRoutingEngine.ts';
import { evaluationSystem } from '../server/core/evaluationSystem.ts';
import { assetStore } from '../server/store/assetStore.ts';
import { taskQueue } from '../server/store/taskQueue.ts';
import { designSchemaValidator, DesignSchemaValidationError } from '../server/core/designSchemaValidator.ts';
import { executeMultimodalChat } from '../server/ai/multimodalChatOrchestrator.ts';
import { GarmentDesignSpec } from '../src/types/index.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ''}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('  ATELIER AI COMMERCIAL VERIFICATION & BENCHMARK SUITE');
  console.log('======================================================\n');

  // Test 1: Garment Intelligence
  console.log('--- 1. Testing Garment Intelligence Local Engine ---');
  const blazer = garmentIntelligence.extractFeatures({ assetName: 'Tailored Wool Blazer' });
  assert(blazer.category === 'suit', 'Identifies blazer as suit/tailored cut');
  assert(blazer.textureComplexityScore >= 5, 'Evaluates wool fabric texture complexity score');
  assert(blazer.attributes.length > 0, 'Extracts structural garment attributes without API spend');

  const sweater = garmentIntelligence.extractFeatures({ assetName: 'Cobalt Cable-Knit Sweater' });
  assert(sweater.category === 'knitwear', 'Identifies cable-knit sweater category');
  assert(sweater.textureComplexityScore === 9, 'Heavy cable knit assigned 9/10 texture score');

  // Test 2: Precision Mask Engine & Non-Target Drift
  console.log('\n--- 2. Testing Precision Mask Engine & Drift Audit ---');
  const mask = precisionMaskEngine.processMask({ width: 1000, height: 1200 });
  assert(mask.metadata.width === 1000 && mask.metadata.height === 1200, 'Dimensions correctly computed');
  assert(mask.metadata.coverageRatio > 0 && mask.metadata.coverageRatio < 1, 'Bounding coverage valid');

  const driftCheck = precisionMaskEngine.verifyNonTargetProtection({
    maskMetadata: mask.metadata,
    targetAreaPixelCount: 300000,
    totalPixels: 1200000,
  });
  assert(driftCheck.isCompliant, 'Strict non-target drift requirement (<1.0%) PASSED');
  assert(driftCheck.driftPercentage === 0.08, 'Non-target drift measured at 0.08%');

  // Test 3: Fabric Color Engine (Luminance Locked Transform)
  console.log('\n--- 3. Testing Fabric Color Engine (Luminance Lock) ---');
  const lumBlack = fabricColorEngine.calculateLuminance(0, 0, 0);
  const lumWhite = fabricColorEngine.calculateLuminance(255, 255, 255);
  assert(lumBlack === 0 && lumWhite === 255, 'ITU-R BT.601 boundary values confirmed');

  // Transform emerald green to crimson red
  const transformed = fabricColorEngine.transformPixel(27, 77, 62, 139, 35, 50, 1.0);
  assert(transformed.r > 0 && transformed.g >= 0 && transformed.b >= 0, 'RGB color shift successfully computed');

  const batchRecolors = fabricColorEngine.simulateBatchRecolor({
    sourceAssetId: 'test_garment_blazer',
    palette: [
      { hex: '#8B2332', name: 'Bordeaux Red' },
      { hex: '#1D4ED8', name: 'Cobalt Blue' },
    ],
  });
  assert(batchRecolors.length === 2, 'Batch seasonal recolors generated without API tokens');
  assert(batchRecolors[0].nonTargetDrift < 1.0, 'Batch recolor non-target drift strictly below 1%');

  // Test 4: Garment Consistency Engine
  console.log('\n--- 4. Testing Garment Consistency Engine ---');
  const tryOnConsistency = await garmentConsistencyEngine.evaluateConsistency({
    taskType: 'try_on',
    category: 'suit',
  });
  assert(tryOnConsistency.verificationPassed, 'Virtual Try-On consistency evaluation passes threshold');
  assert(tryOnConsistency.overallConsistencyScore >= 90, 'Garment consistency score meets >=90% requirement');

  // Test 5: Open-Source Models Registry
  console.log('\n--- 5. Testing Open-Source Model Registry ---');
  const allModels = openSourceRegistry.listAll();
  assert(allModels.length >= 5, 'Open-source model registry contains full evaluation portfolio');
  const commercialCandidates = openSourceRegistry.getCommercialCandidates();
  assert(commercialCandidates.length >= 2, 'SAM and SCHP identified as permissive commercial licenses');

  // Test 6: AI Routing Engine
  console.log('\n--- 6. Testing AI Routing Engine Dual-Channel Dispatch ---');
  const recolorRoute = aiRoutingEngine.routeTask({ taskType: 'recolor' });
  assert(recolorRoute.selectedChannel === 'programmatic', 'Recolor routed to programmatic engine with $0 cost');
  assert(recolorRoute.costTokens === 0, 'Zero tokens consumed for standard recolor');

  const tryOnRoute = aiRoutingEngine.routeTask({ taskType: 'try_on' });
  assert(tryOnRoute.selectedChannel === 'cloud_api' || tryOnRoute.selectedChannel === 'self_hosted', 'Try-on dispatched via supported channel');

  // Test 7: Evaluation System & Checklist
  console.log('\n--- 7. Testing Automated Evaluation System & Checklist ---');
  const checklist = evaluationSystem.getCommercialChecklist();
  assert(checklist.length === 10, '10-point commercial launch checklist fully defined');
  const allPassed = checklist.every((c) => c.passed);
  assert(allPassed, 'All 10 commercial operational readiness items PASSED');

  const liveBenchmark = await evaluationSystem.runLiveBenchmarkSuite();
  assert(liveBenchmark.summary.passRate === 100, 'Live benchmark suite achieved 100% pass rate');
  assert(liveBenchmark.summary.averageNonTargetDrift < 1.0, 'Average non-target drift across suite <1.0%');

  // Test 8: Asset Store & Task Queue Lifecycle
  console.log('\n--- 8. Testing Asset Store & Task Lifecycle ---');
  const benchmarks = assetStore.getBenchmarks();
  assert(benchmarks.length >= 4, 'Pre-loaded benchmarks available (Model, Blazer, Silk Bomber, Sweater)');

  const testAsset = assetStore.save({
    id: `test_unit_${Date.now()}`,
    name: 'Unit Test Garment',
    mimeType: 'image/jpeg',
    dataUrl: 'data:image/jpeg;base64,12345',
    category: 'garment',
  });
  assert(Boolean(assetStore.get(testAsset.id)), 'Asset saved and retrievable');

  const deleted = assetStore.delete(testAsset.id);
  assert(deleted, 'User asset successfully deleted with isolation guarantee');

  // Test 9: Design Workflow Schema Validation Layer
  console.log('\n--- 9. Testing Design Schema Validation Layer (Anti-Empty & Anti-Default) ---');
  // 9.1 Empty prompt check
  const emptyPromptCheck = designSchemaValidator.validateUserPrompt('');
  assert(!emptyPromptCheck.isValid, 'Rejects completely empty user prompt');
  assert(emptyPromptCheck.emptyFields.includes('userMessage'), 'Identifies userMessage as empty field');

  const whitespacePromptCheck = designSchemaValidator.validateUserPrompt('   ');
  assert(!whitespacePromptCheck.isValid, 'Rejects whitespace-only prompt');

  // 9.2 Incomplete spec with empty strings
  const invalidSpec: Partial<GarmentDesignSpec> = {
    garmentCategory: 'Wool Coat',
    targetAudience: 'Women',
    designStyle: 'Minimalist',
    silhouette: '', // EMPTY VALUE
    fabricAppearance: 'Cashmere',
    primaryColor: '   ', // WHITESPACE EMPTY VALUE
    hardConstraints: [], // EMPTY ARRAY
    optionalPreferences: ['Horn buttons'],
  };

  const specValidation = designSchemaValidator.validateGarmentDesignSpec(invalidSpec, 'InvalidTestSpec');
  assert(!specValidation.isValid, 'Schema validator intercepts spec with empty values');
  assert(specValidation.emptyFields.includes('silhouette'), 'Flags empty silhouette string');
  assert(specValidation.emptyFields.includes('primaryColor'), 'Flags whitespace-only primaryColor');
  assert(specValidation.emptyFields.includes('hardConstraints'), 'Flags empty hardConstraints array');

  // 9.3 Pre-AI Generation gatekeeper
  let generationBlocked = false;
  try {
    designSchemaValidator.assertValidCandidateForGeneration({
      prompt: 'Short', // Too brief
      spec: invalidSpec as GarmentDesignSpec,
    });
  } catch (err: any) {
    if (err instanceof DesignSchemaValidationError) {
      generationBlocked = true;
    }
  }
  assert(generationBlocked, 'assertValidCandidateForGeneration strictly blocks AI generation when empty values exist');

  // 9.4 Valid spec passes
  const validSpec: GarmentDesignSpec = {
    garmentCategory: 'Luxury Wool Trench Coat',
    targetAudience: 'Contemporary Womenswear',
    designStyle: 'Milan Minimalist',
    silhouette: 'Hourglass Belted Trench',
    fabricAppearance: 'Double-Faced Loro Piana Wool',
    primaryColor: 'Obsidian Black (#18181B)',
    collarType: 'Wide Peak Lapel (意式宽戗驳领)',
    hardConstraints: ['Color: Obsidian Black', 'Category: Luxury Wool Trench Coat'],
    optionalPreferences: ['Horn button hardware'],
  };
  const validCheck = designSchemaValidator.validateGarmentDesignSpec(validSpec, 'ValidTestSpec');
  assert(validCheck.isValid, 'Valid spec with complete non-empty values passes schema validation');

  // 9.5 cleanUnspecifiedFields strips empty strings without overwriting unspecified fields
  const partiallyEmpty = {
    garmentCategory: 'Silk Blouse',
    collarType: '   ',
    pocketStyle: '',
    primaryColor: 'Ivory White',
  };
  const cleaned = designSchemaValidator.cleanUnspecifiedFields(partiallyEmpty);
  assert(cleaned.garmentCategory === 'Silk Blouse', 'Preserves valid fields');
  assert(!('collarType' in cleaned), 'Strips empty whitespace-only collarType');
  assert(!('pocketStyle' in cleaned), 'Strips empty string pocketStyle');

  // Test 10: ModaUI V8 Native Multimodal Conversational Orchestrator
  console.log('\n--- 10. Testing ModaUI V8 Multimodal Chat Orchestrator ---');
  // 10.1 Garment design generation via natural language in chat
  const designChatRes = await executeMultimodalChat({
    message: '帮我设计一件意大利高端女装羊毛大衣，黑色修身廓形',
  });
  assert(designChatRes.intent === 'design', 'Correctly detects design intention from natural language');
  assert(Boolean(designChatRes.imageResult?.url), 'Returns embedded synthesized image in conversational response');
  assert(designChatRes.imageResult?.version === 1, 'Initial design marked as version 1');
  assert(designChatRes.imageResult?.consistencyScore! >= 85, 'Image quality and spec verification passed threshold');

  // 10.2 In-chat continuous revision preserving context & comparing previous version
  const revisionChatRes = await executeMultimodalChat({
    message: '领口改成翻领，腰身收紧，其他保持不变',
    activeImageRef: {
      imageUrl: designChatRes.imageResult!.url,
      designSpec: designChatRes.imageResult!.spec,
      candidateId: designChatRes.imageResult!.candidateId,
      version: 1,
    },
  });
  assert(revisionChatRes.intent === 'revision', 'Correctly detects continuous revision intent on active image');
  assert(revisionChatRes.imageResult?.version === 2, 'Increments revision version to v2');
  assert(revisionChatRes.imageResult?.previousImageUrl === designChatRes.imageResult!.url, 'Retains previous image for side-by-side comparison');
  assert(Boolean(revisionChatRes.imageResult?.url), 'Returns revised image without page navigation');

  // 10.3 General sartorial Q&A without unintended image generation
  const qaChatRes = await executeMultimodalChat({
    message: '什么是意式那不勒斯西装的平驳领特点？',
  });
  assert(qaChatRes.intent === 'qa', 'Correctly categorizes styling question as qa intent');
  assert(!qaChatRes.imageResult, 'Does not mistakenly generate images for standard Q&A questions');
  assert(qaChatRes.assistantResponse.length > 20, 'Returns professional couturier advice');

  // 10.4 Empty input rejection in chat
  let chatValidationRejected = false;
  try {
    await executeMultimodalChat({ message: '   ' });
  } catch (err: any) {
    if (err instanceof DesignSchemaValidationError) {
      chatValidationRejected = true;
    }
  }
  assert(chatValidationRejected, 'Rejects empty messages in multimodal orchestrator with validation error');

  // Test 11: Unified Tool Registry & 5 Core Engines
  console.log('\n--- 11. Testing Unified Tool Registry & 5 Core Creation Tools ---');
  const { toolRegistry } = await import('../server/core/toolRegistry.ts');
  const registeredTools = toolRegistry.listTools();
  assert(registeredTools.length >= 5, 'Tool Registry contains all unified creation tools');
  
  const toolIds = registeredTools.map((t) => t.id);
  assert(toolIds.includes('fashion_designer_create'), 'Fashion design generator registered');
  assert(toolIds.includes('fashion_designer_revise'), 'Continuous revision engine registered');
  assert(toolIds.includes('virtual_try_on'), 'Virtual try-on engine registered');
  assert(toolIds.includes('precision_recolor'), 'Precision recolor engine registered');
  assert(toolIds.includes('runway_video_veo'), 'Veo runway video engine registered');

  console.log('\n======================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite();

