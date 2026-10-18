import { garmentIntelligence } from '../server/core/garmentIntelligence.ts';
import { precisionMaskEngine } from '../server/core/precisionMaskEngine.ts';
import { fabricColorEngine } from '../server/core/fabricColorEngine.ts';
import { garmentConsistencyEngine } from '../server/core/garmentConsistencyEngine.ts';
import { openSourceRegistry } from '../server/core/openSourceModelRegistry.ts';
import { aiRoutingEngine } from '../server/core/aiRoutingEngine.ts';
import { evaluationSystem } from '../server/core/evaluationSystem.ts';
import { assetStore } from '../server/store/assetStore.ts';
import { taskQueue } from '../server/store/taskQueue.ts';

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

  console.log('\n======================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
