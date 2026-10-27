import React, { useState, useEffect } from 'react';
import { AssetRecord, TabType } from './types/index.ts';
import { Sidebar } from './components/Sidebar.tsx';
import { HomeView } from './components/HomeView.tsx';
import { ModaUIChatWorkbench } from './components/ModaUIChatWorkbench.tsx';
import { AssetLibraryView } from './components/AssetLibraryView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { GarmentIntelligenceModal } from './components/GarmentIntelligenceModal.tsx';
import { VideoRunwayModal } from './components/VideoRunwayModal.tsx';
import { useLanguage } from './context/LanguageContext.tsx';
import { Menu, Sparkles } from 'lucide-react';

export default function App() {
  const { language, strings } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [prefilledPrompt, setPrefilledPrompt] = useState<string>('');

  // Modals state (triggered from chat or asset operations)
  const [isIntelligenceOpen, setIsIntelligenceOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [modalTargetImage, setModalTargetImage] = useState<string | undefined>(undefined);

  // Active tasks count
  const [activeTasksCount, setActiveTasksCount] = useState<number>(0);

  // Periodic poll of active tasks count for sidebar indicator
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/system/status');
        if (res.ok) {
          const data = await res.json();
          setActiveTasksCount(data.activeTasks || 0);
        }
      } catch (e) {
        // Silent poll error handling
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenIntelligence = (dataUrl?: string) => {
    setModalTargetImage(dataUrl);
    setIsIntelligenceOpen(true);
  };

  const handleOpenVideo = (dataUrl?: string) => {
    setModalTargetImage(dataUrl);
    setIsVideoOpen(true);
  };

  const handleLaunchCreatorWithPrompt = (prompt?: string) => {
    if (prompt) {
      setPrefilledPrompt(prompt);
    }
    setActiveTab('creator');
  };

  const handleSendAssetToCreator = (asset: AssetRecord) => {
    setPrefilledPrompt(
      language === 'zh'
        ? `以此高定素材（${asset.name}）为基础，生成电商模特上身试衣图并保持面料光泽`
        : `Using this garment asset (${asset.name}), generate commercial model lookbook preserving fabric drape`
    );
    setActiveTab('creator');
  };

  // Title lookup
  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'home':
        return language === 'zh' ? '首页工作台' : 'Home Overview';
      case 'creator':
      case 'chat':
      case 'designer':
      case 'try_on':
      case 'model_shoot':
      case 'recolor':
        return language === 'zh' ? 'AI 创作中心' : 'AI Creation Center';
      case 'assets':
        return language === 'zh' ? '素材与成果库' : 'Asset Library';
      case 'settings':
        return language === 'zh' ? '总设置' : 'Settings';
      default:
        return 'ModaGPT';
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans selection:bg-stone-900 selection:text-white flex">
      {/* 1. Left Main Navigation Sidebar (4 entries only) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsSidebarOpen(false);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTasksCount={activeTasksCount}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile & Tablet Header Bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-serif font-bold text-stone-900 tracking-tight">
                {getHeaderTitle()}
              </h1>
              <div className="text-[11px] font-mono text-stone-400 hidden sm:block">
                ModaGPT V8 · {language === 'zh' ? '统一时装智能创作引擎' : 'Unified Haute Couture AI'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab !== 'creator' && (
              <button
                type="button"
                onClick={() => setActiveTab('creator')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {language === 'zh' ? '进入创作中心' : 'Open Creator'}
                </span>
              </button>
            )}
          </div>
        </header>

        {/* 3. Primary Workspace Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col">
          {activeTab === 'home' && (
            <HomeView
              onNavigateToCreator={handleLaunchCreatorWithPrompt}
              onNavigateToAssets={() => setActiveTab('assets')}
              onNavigateToSettings={() => setActiveTab('settings')}
              onOpenVideoModal={handleOpenVideo}
            />
          )}

          {(activeTab === 'creator' ||
            activeTab === 'chat' ||
            activeTab === 'designer' ||
            activeTab === 'try_on' ||
            activeTab === 'model_shoot' ||
            activeTab === 'recolor') && (
            <ModaUIChatWorkbench
              onOpenVideoModal={handleOpenVideo}
              onOpenAnalysisModal={handleOpenIntelligence}
              initialPrompt={prefilledPrompt}
              onClearInitialPrompt={() => setPrefilledPrompt('')}
            />
          )}

          {activeTab === 'assets' && (
            <AssetLibraryView
              onSendToCreator={handleSendAssetToCreator}
              onOpenVideoModal={handleOpenVideo}
            />
          )}

          {activeTab === 'settings' && <SettingsView />}
        </main>

        {/* 4. Production Footer */}
        <footer className="border-t border-stone-200 bg-white py-4 px-6 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-stone-400">
            <div>
              <span>ModaGPT Haute Couture AI</span>
              <span className="mx-2">·</span>
              <span>{language === 'zh' ? '统一命令调度与高定生成' : 'Unified Multimodal Creative Architecture'}</span>
            </div>
            <div>
              <span>{language === 'zh' ? '纯净工程级体验' : 'SaaS Engineering Grade'}</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Multimodal Modals for Video and Deep Analysis (Triggered on demand) */}
      <GarmentIntelligenceModal
        isOpen={isIntelligenceOpen}
        onClose={() => setIsIntelligenceOpen(false)}
        initialImageDataUrl={modalTargetImage}
      />

      <VideoRunwayModal
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        initialImageDataUrl={modalTargetImage}
      />
    </div>
  );
}
