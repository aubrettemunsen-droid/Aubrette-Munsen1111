export interface BenchmarkTestCase {
  id: string;
  name: string;
  category: 'try_on' | 'model_shoot' | 'recolor' | 'designer';
  description: string;
  sourceAssetId?: string;
  secondaryAssetId?: string;
  inputParams: Record<string, any>;
  hardConstraints: string[];
  expectedOutput: {
    categoryMatch: string;
    targetColorHex?: string;
    maxAllowedNonTargetDriftPercent: number; // e.g. 1.0%
    minGarmentConsistencyScore: number; // e.g. 85
    minTexturePreservationScore: number; // e.g. 90
    requiredFeatures: string[];
    forbiddenArtifacts: string[];
  };
}

export const BENCHMARK_MANIFEST: BenchmarkTestCase[] = [
  {
    id: 'case_recolor_blazer_bordeaux',
    name: 'Precision Recolor: Tailored Wool Blazer to Bordeaux (#722F37)',
    category: 'recolor',
    description: 'Verifies pure programmatic color shift on high-twist wool weave with strict non-target boundary isolation.',
    sourceAssetId: 'benchmark_garment_blazer',
    inputParams: {
      targetColor: '#722F37',
      preserveTexture: true,
      preservePattern: true,
      mode: 'programmatic',
    },
    hardConstraints: [
      'Lapel shadow gradient and button reflections must be preserved by luminance equation',
      'All pixels outside the garment boundary must exhibit <1.0% drift',
      'Zero API spend required ($0.00)',
    ],
    expectedOutput: {
      categoryMatch: 'suit',
      targetColorHex: '#722F37',
      maxAllowedNonTargetDriftPercent: 1.0,
      minGarmentConsistencyScore: 92,
      minTexturePreservationScore: 95,
      requiredFeatures: ['Luminance curve locked', 'Button hardware intact'],
      forbiddenArtifacts: ['Plastic flat matte overlay', 'Color bleeding onto backdrop'],
    },
  },
  {
    id: 'case_recolor_sweater_cobalt',
    name: 'Precision Recolor: Cable-Knit Sweater to Royal Cobalt (#1D4ED8)',
    category: 'recolor',
    description: 'Audits complex 3D textured cable-knit yarn under luminance shift.',
    sourceAssetId: 'benchmark_garment_knit_sweater',
    inputParams: {
      targetColor: '#1D4ED8',
      preserveTexture: true,
      preservePattern: true,
      mode: 'programmatic',
    },
    hardConstraints: [
      'Cable knit twist depth shadows must remain dark',
      'Specular yarn highlights must not burn out to white',
    ],
    expectedOutput: {
      categoryMatch: 'knitwear',
      targetColorHex: '#1D4ED8',
      maxAllowedNonTargetDriftPercent: 1.0,
      minGarmentConsistencyScore: 90,
      minTexturePreservationScore: 92,
      requiredFeatures: ['3D stitch depth retention', 'Ribbed cuff edge preservation'],
      forbiddenArtifacts: ['Loss of cable stitch relief'],
    },
  },
  {
    id: 'case_tryon_model_blazer',
    name: 'Virtual Try-On: Studio Model + Tailored Wool Blazer',
    category: 'try_on',
    description: 'Evaluates dual-image conditioning, shoulder seam retargeting, and facial identity preservation.',
    sourceAssetId: 'benchmark_person_model',
    secondaryAssetId: 'benchmark_garment_blazer',
    inputParams: {
      quality: 'hd',
      preserveIdentity: true,
      preserveBackground: true,
      category: 'outerwear',
    },
    hardConstraints: [
      'Model facial landmarks, expression, and skin tone must be preserved',
      'Blazer lapels and chest pocket must drape in perspective across torso',
    ],
    expectedOutput: {
      categoryMatch: 'outerwear',
      maxAllowedNonTargetDriftPercent: 1.5,
      minGarmentConsistencyScore: 88,
      minTexturePreservationScore: 88,
      requiredFeatures: ['Collar fitting to neck', 'Natural armhole drape'],
      forbiddenArtifacts: ['Facial distortion', 'Floating lapels', 'Severed limbs'],
    },
  },
  {
    id: 'case_model_shoot_silk_bomber',
    name: 'AI Model Shoot: Cream Silk Bomber Jacket',
    category: 'model_shoot',
    description: 'Tests commercial model generation with silk luster and brass zipper preservation.',
    sourceAssetId: 'benchmark_garment_silk_jacket',
    inputParams: {
      modelStyle: 'commercial_catalog',
      gender: 'female',
      composition: 'full_body',
      background: 'studio_warm_grey',
      pose: 'natural_standing',
      imageSize: '1K',
    },
    hardConstraints: [
      'Bomber brass zipper and ribbed hem must be retained',
      'No hallucinatory logos or graphic prints',
    ],
    expectedOutput: {
      categoryMatch: 'outerwear',
      maxAllowedNonTargetDriftPercent: 2.0,
      minGarmentConsistencyScore: 85,
      minTexturePreservationScore: 88,
      requiredFeatures: ['Silk luster highlights', 'Authentic model anatomy'],
      forbiddenArtifacts: ['Random brand text', 'Extra fingers'],
    },
  },
  {
    id: 'case_designer_dress_constraint',
    name: 'AI Fashion Designer: Heavyweight Silk Bias-Cut Evening Gown',
    category: 'designer',
    description: 'Ensures the design engine correctly parses dress semantics and NEVER defaults to suits.',
    inputParams: {
      userMessage: '设计一条重磅真丝法式吊带晚礼服长裙，珍珠米白色，斜裁流线垂坠，大露背，不要任何西装元素',
    },
    hardConstraints: [
      'Must identify category as Evening Gown / Dress (NOT suit or blazer)',
      'Primary color must be Pearl / Ivory / Ecru (NOT dark navy blue)',
      'Silhouette must be fluid bias-cut drape',
    ],
    expectedOutput: {
      categoryMatch: 'dress',
      maxAllowedNonTargetDriftPercent: 0.5,
      minGarmentConsistencyScore: 90,
      minTexturePreservationScore: 90,
      requiredFeatures: ['Halter or slip silhouette', 'Fluid draping spec'],
      forbiddenArtifacts: ['Suits', 'Lapels', 'Blazer buttons'],
    },
  },
];
