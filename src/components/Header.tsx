import React from 'react';
import { TabType } from '../types/index.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import { MessageSquare, Cpu, History } from 'lucide-react';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenIntelligence?: () => void;
  onOpenVideoModal?: () => void;
  activeTasksCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeTasksCount,
}) => {
  const { language, setLanguage, strings } = useLanguage();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('chat');
            }}
            className="font-serif text-2xl font-bold tracking-tight text-stone-900 hover:text-stone-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <span>{strings.header.brand}</span>
            <span className="text-[10px] font-mono font-semibold bg-stone-900 text-white px-2 py-0.5 rounded-full tracking-normal">
              V8
            </span>
          </a>
          <span className="hidden sm:inline text-xs font-mono text-stone-400 tracking-wider uppercase border-l border-stone-200 pl-3">
            {strings.header.studio}
          </span>
        </div>

        {/* Zone 2: Navigation Links (Clean ChatGPT-Style: Primary Chat Workbench + Quality Audit Hub) */}
        <nav className="flex items-center gap-4 sm:gap-6 text-sm font-medium text-stone-600">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-1 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'chat'
                ? 'text-stone-950 border-stone-900 font-semibold'
                : 'border-transparent hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{strings.header.chatWorkbench}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('engine_hub')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-1 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'engine_hub'
                ? 'text-stone-950 border-stone-900 font-semibold'
                : 'border-transparent hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>{strings.header.engineHub}</span>
          </button>
        </nav>

        {/* Zone 3: Actions & Language Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Intelligent Language Switcher */}
          <div className="flex items-center border border-stone-200 rounded-md overflow-hidden bg-stone-50 p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setLanguage('zh')}
              className={`px-2 py-1 rounded transition-colors ${
                language === 'zh'
                  ? 'bg-stone-900 text-white font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
              title="切换到中文版"
            >
              中文
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded transition-colors ${
                language === 'en'
                  ? 'bg-stone-900 text-white font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
              title="Switch to English"
            >
              EN
            </button>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{strings.header.pipelineTasks}</span>
            {activeTasksCount > 0 && (
              <span className="font-semibold text-amber-500 tabular-nums">
                ({activeTasksCount})
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
