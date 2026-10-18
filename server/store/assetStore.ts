import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AssetRecord } from '../../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assetsMap = new Map<string, AssetRecord>();

// Preload benchmark assets
function initBenchmarkAssets() {
  const imagesDir = path.resolve(__dirname, '../../src/assets/images');
  if (!fs.existsSync(imagesDir)) {
    return;
  }

  const files = fs.readdirSync(imagesDir);

  const benchmarkConfigs = [
    {
      id: 'benchmark_person_model',
      name: 'Benchmark Studio Model (Full Body)',
      prefix: 'test_person_model_',
      category: 'person' as const,
      tags: ['benchmark', 'person', 'studio', 'neutral_pose']
    },
    {
      id: 'benchmark_garment_blazer',
      name: 'Benchmark Tailored Wool Double-Breasted Blazer',
      prefix: 'test_garment_blazer_',
      category: 'garment' as const,
      tags: ['benchmark', 'garment', 'outerwear', 'emerald_wool', 'tailored']
    },
    {
      id: 'benchmark_garment_silk_jacket',
      name: 'Benchmark Cream Silk Minimalist Bomber',
      prefix: 'test_garment_silk_jacket_',
      category: 'garment' as const,
      tags: ['benchmark', 'garment', 'outerwear', 'silk', 'bomber', 'luxury']
    },
    {
      id: 'benchmark_garment_knit_sweater',
      name: 'Benchmark Cobalt Cable-Knit Textured Sweater',
      prefix: 'test_garment_knit_sweater_',
      category: 'garment' as const,
      tags: ['benchmark', 'garment', 'knitwear', 'cobalt_blue', 'heavy_texture']
    }
  ];

  for (const config of benchmarkConfigs) {
    const matchedFile = files.find(f => f.startsWith(config.prefix) && (f.endsWith('.jpg') || f.endsWith('.png')));
    if (matchedFile) {
      const fullPath = path.join(imagesDir, matchedFile);
      try {
        const fileBuffer = fs.readFileSync(fullPath);
        const mimeType = matchedFile.endsWith('.png') ? 'image/png' : 'image/jpeg';
        const base64Data = fileBuffer.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        assetsMap.set(config.id, {
          id: config.id,
          name: config.name,
          mimeType,
          dataUrl,
          category: config.category,
          sizeBytes: fileBuffer.length,
          tags: config.tags,
          createdAt: Date.now()
        });
      } catch (err) {
        console.error(`Failed to load benchmark asset ${matchedFile}:`, err);
      }
    }
  }
}

initBenchmarkAssets();

export const assetStore = {
  save(asset: Omit<AssetRecord, 'createdAt'>): AssetRecord {
    const fullAsset: AssetRecord = {
      ...asset,
      createdAt: Date.now()
    };
    assetsMap.set(asset.id, fullAsset);
    return fullAsset;
  },

  get(id: string): AssetRecord | undefined {
    return assetsMap.get(id);
  },

  delete(id: string): boolean {
    if (id.startsWith('benchmark_')) {
      return false; // protect benchmarks
    }
    return assetsMap.delete(id);
  },

  list(category?: 'person' | 'garment' | 'result' | 'mask'): AssetRecord[] {
    const all = Array.from(assetsMap.values());
    if (category) {
      return all.filter(a => a.category === category);
    }
    return all;
  },

  getBenchmarks(): AssetRecord[] {
    return Array.from(assetsMap.values()).filter(a => a.id.startsWith('benchmark_'));
  }
};
