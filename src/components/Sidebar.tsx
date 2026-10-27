import React from 'react';
import { TabType } from '../types/index.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  Home,
  Sparkles,
  FolderArchive,
  Settings,
  X,
  Activity,
  Layers,
} from 'lucide-react';
import { ModaUICore } from './ModaUICore.tsx';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isOpen: boolean;
  onClose: () => void;
  activeTasksCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
  activeTasksCount = 0,
}) => {
  const { language, setLanguage, strings } = useLanguage();

  const navItems: Array<{
    id: TabType;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'home',
      label: strings.nav?.home || (language === 'zh' ? '首页' : 'Home'),
      sublabel: language === 'zh' ? '工作台概览与快捷指令' : 'Overview & Quick Launch',
      icon: <Home className="w-5 h-5" />,
    },
    {
      id: 'creator',
      label: strings.nav?.creator || (language === 'zh' ? 'AI 创作中心' : 'AI Creation Center'),
      sublabel: language === 'zh' ? '统一命令框 · 5大能力闭环' : 'Unified Prompt · 5 Engines',
      icon: <Sparkles className="w-5 h-5" />,
    },
    {
      id: 'assets',
      label: strings.nav?.assets || (language === 'zh' ? '素材库' : 'Asset Library'),
      sublabel: language === 'zh' ? '服装、模特与成片管理' : 'Garments, Models & Results',
      icon: <FolderArchive className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: strings.nav?.settings || (language === 'zh' ? '总设置' : 'Settings'),
      sublabel: language === 'zh' ? '系统配置与引擎策略' : 'System & Engine Config',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-stone-950/40 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Main Sidebar Rail */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-stone-200 flex flex-col justify-between transition-transform duration-300 ease-in-out shrink-0 select-none ${
          isOpen ? 'translate-x-0 shadow-2xl md:shadow-none' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header & Brand */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div
            onClick={() => {
              setActiveTab('home');
              onClose();
            }}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center font-serif font-bold text-lg shadow-xs group-hover:scale-105 transition-transform">
              M
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-lg tracking-tight text-stone-900">
                  {strings.nav?.brand || 'ModaGPT'}
                </span>
                <span className="text-[10px] font-mono font-semibold bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded border border-stone-200">
                  V8
                </span>
              </div>
              <div className="text-[10px] font-mono text-stone-400 tracking-wider">
                {strings.nav?.brandSubtitle || 'AI 时装统一工作台'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 md:hidden rounded-lg hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Core Navigation Items */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <div className="px-3 pt-2 pb-1 text-[11px] font-mono text-stone-400 uppercase tracking-wider">
            {language === 'zh' ? '主要工作区' : 'Workspace'}
          </div>

          {navItems.map((item) => {
            const isActive =
              activeTab === item.id ||
              (item.id === 'creator' && (activeTab === 'chat' || activeTab === 'designer' || activeTab === 'try_on' || activeTab === 'model_shoot' || activeTab === 'recolor'));

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left ${
                  isActive
                    ? 'bg-stone-900 text-white font-medium shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/90'
                }`}
              >
                <div className={`mt-0.5 shrink-0 ${isActive ? 'text-white' : 'text-stone-500'}`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm tracking-tight">{item.label}</span>
                    {item.id === 'creator' && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${
                          isActive ? 'bg-stone-800 text-stone-200' : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        Unified
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-[11px] truncate mt-0.5 ${
                      isActive ? 'text-stone-300' : 'text-stone-400'
                    }`}
                  >
                    {item.sublabel}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Bottom Digital Core Indicator & Language Switcher */}
        <div className="p-4 border-t border-stone-200/90 bg-stone-50/70 space-y-3">
          {/* Digital Core Status Card */}
          <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-stone-200 shadow-2xs">
            <ModaUICore state="idle" size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                <span>ModaGPT Brain</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              <div className="text-[10px] font-mono text-stone-500">
                {activeTasksCount > 0
                  ? `${activeTasksCount} 项任务执行中`
                  : language === 'zh'
                    ? '所有引擎待命'
                    : 'All Engines Ready'}
              </div>
            </div>
          </div>

          {/* Language Switcher Bar */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-stone-500 text-[11px]">Language</span>
            <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-white text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setLanguage('zh')}
                className={`px-2.5 py-1 transition-colors ${
                  language === 'zh'
                    ? 'bg-stone-900 text-white font-semibold'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                中文
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 transition-colors ${
                  language === 'en'
                    ? 'bg-stone-900 text-white font-semibold'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
