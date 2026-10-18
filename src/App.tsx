import React, { useState, useEffect } from 'react';
import { AssetRecord, TabType } from './types/index.ts';
import { Header } from './components/Header.tsx';
import { VirtualTryOnTab } from './components/VirtualTryOnTab.tsx';
import { ModelShootTab } from './components/ModelShootTab.tsx';
import { RecolorTab } from './components/RecolorTab.tsx';
import { GarmentIntelligenceModal } from './components/GarmentIntelligenceModal.tsx';
import { VideoRunwayModal } from './components/VideoRunwayModal.tsx';
import { TaskHistoryDrawer } from './components/TaskHistoryDrawer.tsx';
import { FashionDesignerTab } from './components/FashionDesignerTab.tsx';
import { EngineHubTab } from './components/EngineHubTab.tsx';

// Fallback benchmark paths matching our generated files
import benchmarkPersonImg from './assets/images/test_person_model_1792284592530.jpg';
import benchmarkBlazerImg from './assets/images/test_garment_blazer_1792284593019.jpg';
import benchmarkSilkImg from './assets/images/test_garment_silk_jacket_1792284594069.jpg';
import benchmarkSweaterImg from './assets/images/test_garment_knit_sweater_1792284594426.jpg';
import { useLanguage } from './context/LanguageContext.tsx';


export default function App() {
  const { strings } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('try_on');
  const [benchmarkAssets, setBenchmarkAssets] = useState<AssetRecord[]>([]);

  // Modals state
  const [isIntelligenceOpen, setIsIntelligenceOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [modalTargetImage, setModalTargetImage] = useState<string | undefined>(undefined);

  // Asset handover state (e.g. passing a Try-on result into Recolor tab)
  const [handoverAsset, setHandoverAsset] = useState<AssetRecord | null>(null);

  // Active tasks tracking
  const [activeTasks, setActiveTasks] = useState<string[]>([]);

  // Fetch benchmark assets on mount
  useEffect(() => {
    fetch('/api/benchmark-assets')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: AssetRecord[]) => {
        if (data && data.length > 0) {
          setBenchmarkAssets(data);
        } else {
          // Fallback to imported benchmark assets
          const fallbacks: AssetRecord[] = [
            {
              id: 'benchmark_person_model',
              name: 'Benchmark Studio Model',
              mimeType: 'image/jpeg',
              dataUrl: benchmarkPersonImg,
              category: 'person',
              createdAt: Date.now(),
            },
            {
              id: 'benchmark_garment_blazer',
              name: 'Benchmark Tailored Wool Blazer',
              mimeType: 'image/jpeg',
              dataUrl: benchmarkBlazerImg,
              category: 'garment',
              createdAt: Date.now(),
            },
            {
              id: 'benchmark_garment_silk_jacket',
              name: 'Benchmark Cream Silk Bomber',
              mimeType: 'image/jpeg',
              dataUrl: benchmarkSilkImg,
              category: 'garment',
              createdAt: Date.now(),
            },
            {
              id: 'benchmark_garment_knit_sweater',
              name: 'Benchmark Cobalt Cable-Knit Sweater',
              mimeType: 'image/jpeg',
              dataUrl: benchmarkSweaterImg,
              category: 'garment',
              createdAt: Date.now(),
            },
          ];
          setBenchmarkAssets(fallbacks);
        }
      })
      .catch(() => {
        const fallbacks: AssetRecord[] = [
          {
            id: 'benchmark_person_model',
            name: 'Benchmark Studio Model',
            mimeType: 'image/jpeg',
            dataUrl: benchmarkPersonImg,
            category: 'person',
            createdAt: Date.now(),
          },
          {
            id: 'benchmark_garment_blazer',
            name: 'Benchmark Tailored Wool Blazer',
            mimeType: 'image/jpeg',
            dataUrl: benchmarkBlazerImg,
            category: 'garment',
            createdAt: Date.now(),
          },
          {
            id: 'benchmark_garment_silk_jacket',
            name: 'Benchmark Cream Silk Bomber',
            mimeType: 'image/jpeg',
            dataUrl: benchmarkSilkImg,
            category: 'garment',
            createdAt: Date.now(),
          },
          {
            id: 'benchmark_garment_knit_sweater',
            name: 'Benchmark Cobalt Cable-Knit Sweater',
            mimeType: 'image/jpeg',
            dataUrl: benchmarkSweaterImg,
            category: 'garment',
            createdAt: Date.now(),
          },
        ];
        setBenchmarkAssets(fallbacks);
      });
  }, []);

  const handleOpenIntelligence = (dataUrl?: string) => {
    setModalTargetImage(dataUrl || benchmarkAssets[1]?.dataUrl);
    setIsIntelligenceOpen(true);
  };

  const handleOpenVideo = (dataUrl?: string) => {
    setModalTargetImage(dataUrl || benchmarkAssets[0]?.dataUrl);
    setIsVideoOpen(true);
  };

  const handleTaskCreated = (taskId: string) => {
    setActiveTasks((prev) => [...prev, taskId]);
  };

  const handleNavigateToRecolor = (asset: AssetRecord) => {
    setHandoverAsset(asset);
    setActiveTab('recolor');
  };

  const handleNavigateToTryOn = (garment: AssetRecord) => {
    setActiveTab('try_on');
  };

  const handleDesignerSendToTryOn = (garment: any) => {
    setBenchmarkAssets((prev) => [garment, ...prev.filter((p) => p.id !== garment.id)]);
    setActiveTab('try_on');
  };

  const handleDesignerSendToModelShoot = (garment: any) => {
    setBenchmarkAssets((prev) => [garment, ...prev.filter((p) => p.id !== garment.id)]);
    setActiveTab('model_shoot');
  };

  const handleDesignerSendToRecolor = (garment: any) => {
    setHandoverAsset(garment);
    setActiveTab('recolor');
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans selection:bg-stone-900 selection:text-white flex flex-col">
      {/* 3-Zone Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenIntelligence={() => handleOpenIntelligence()}
        onOpenVideoModal={() => handleOpenVideo()}
        activeTasksCount={activeTasks.length}
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {activeTab === 'designer' && (
          <FashionDesignerTab
            onSendToTryOn={handleDesignerSendToTryOn}
            onSendToModelShoot={handleDesignerSendToModelShoot}
            onSendToRecolor={handleDesignerSendToRecolor}
            onOpenVideoModal={handleOpenVideo}
          />
        )}

        {activeTab === 'try_on' && (
          <VirtualTryOnTab
            benchmarkAssets={benchmarkAssets}
            onNavigateToRecolor={handleNavigateToRecolor}
            onOpenVideoModal={handleOpenVideo}
            onOpenAnalysis={handleOpenIntelligence}
            onTaskCreated={handleTaskCreated}
          />
        )}

        {activeTab === 'model_shoot' && (
          <ModelShootTab
            benchmarkAssets={benchmarkAssets}
            onNavigateToTryOn={handleNavigateToTryOn}
            onOpenVideoModal={handleOpenVideo}
            onOpenAnalysis={handleOpenIntelligence}
            onTaskCreated={handleTaskCreated}
          />
        )}

        {activeTab === 'recolor' && (
          <RecolorTab
            benchmarkAssets={benchmarkAssets}
            initialAsset={handoverAsset}
            onNavigateToTryOn={handleNavigateToTryOn}
            onOpenVideoModal={handleOpenVideo}
            onOpenAnalysis={handleOpenIntelligence}
            onTaskCreated={handleTaskCreated}
          />
        )}

        {activeTab === 'engine_hub' && (
          <EngineHubTab />
        )}

        {activeTab === 'history' && (
          <TaskHistoryDrawer />
        )}
      </main>

      {/* Fabric Intelligence Modal (Gemini 4 Argon High Thinking) */}
      <GarmentIntelligenceModal
        isOpen={isIntelligenceOpen}
        onClose={() => setIsIntelligenceOpen(false)}
        initialImageDataUrl={modalTargetImage}
      />

      {/* Runway Video Modal (Veo 3.1) */}
      <VideoRunwayModal
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        initialImageDataUrl={modalTargetImage}
      />

      {/* Subtle Production Footer */}
      <footer className="border-t border-stone-200 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-stone-500">
          <div>
            <span>{strings.footer.brand}</span>
            <span aria-hidden="true" className="mx-2">·</span>
            <span>{strings.footer.subtext}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>{strings.footer.identityPreservation}</span>
            <span aria-hidden="true">·</span>
            <span>{strings.footer.luminanceLocked}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
