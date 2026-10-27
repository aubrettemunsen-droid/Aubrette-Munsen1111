import React, { useState, useEffect } from 'react';
import { AssetRecord, TabType } from '../types/index.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import { ModaUICore } from './ModaUICore.tsx';
import {
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderArchive,
  Sliders,
  RefreshCw,
  ExternalLink,
  Layers,
  Cpu,
} from 'lucide-react';

interface HomeViewProps {
  onNavigateToCreator: (prefilledPrompt?: string) => void;
  onNavigateToAssets: () => void;
  onNavigateToSettings: () => void;
  onOpenVideoModal?: (dataUrl?: string) => void;
}

interface SystemStatusData {
  geminiConfigured: boolean;
  serverTime: string;
  activeTasks: number;
  completedTasks: number;
  uptimeSeconds: number;
  availableModels: Record<string, string>;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigateToCreator,
  onNavigateToAssets,
  onNavigateToSettings,
  onOpenVideoModal,
}) => {
  const { language } = useLanguage();
  const [recentCreations, setRecentCreations] = useState<AssetRecord[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch assets
      const [assetsRes, tasksRes, statusRes] = await Promise.allSettled([
        fetch('/api/assets'),
        fetch('/api/tasks'),
        fetch('/api/system/status'),
      ]);

      if (assetsRes.status === 'fulfilled' && assetsRes.value.ok) {
        const assetsData = await assetsRes.value.json();
        setRecentCreations(Array.isArray(assetsData) ? assetsData.slice(0, 4) : []);
      }

      if (tasksRes.status === 'fulfilled' && tasksRes.value.ok) {
        const tasksData = await tasksRes.value.json();
        setTasks(Array.isArray(tasksData) ? tasksData.slice(0, 5) : []);
      }

      if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
        const statusData = await statusRes.value.json();
        setSystemStatus(statusData);
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const quickPrompts = [
    {
      title: language === 'zh' ? '意式高端双排扣羊毛大衣' : 'Italian Double-Breasted Wool Coat',
      desc: language === 'zh' ? '黑色修身廓形，戗驳领，喇叭袖角' : 'Obsidian Black, Peak Lapel, Tailored Waist',
      prompt: '帮我设计一件意大利高端女装羊毛大衣，黑色修身廓形，戗驳领与喇叭袖角',
    },
    {
      title: language === 'zh' ? '虚拟试衣与成衣上身' : 'Virtual Try-on Session',
      desc: language === 'zh' ? '将测试西装合成到模特身上并保持面料纹理' : 'Fit blazer onto studio model preserving textile drape',
      prompt: '对测试面料西服与模特执行真人虚拟试衣，保持面料纹理与光影真实',
    },
    {
      title: language === 'zh' ? '季节性精准换色' : 'Seasonal Precision Recolor',
      desc: language === 'zh' ? '将羊毛外套调为波尔多酒红，锁定面料阴影' : 'Recolor outerwear to Bordeaux Red with luminance lock',
      prompt: '将当前羊毛外套精准换色为波尔多酒红(#8B1E2D)，锁定光影明度并保护背景',
    },
    {
      title: language === 'zh' ? 'Veo 走秀视频生成' : 'Veo Runway Walk Video',
      desc: language === 'zh' ? '生成巴黎时装周T台动态行走与面料摆动' : 'Synthesize 1080p catwalk fluid draping video',
      prompt: '为当前设计生成一段巴黎高定周T台走秀视频，呈现模特自然行走与面料垂坠摆动',
    },
  ];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* 1. Hero Digital Core & Executive Welcome */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-stone-900 to-stone-950 text-white p-6 sm:p-10 border border-stone-800 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-800/80 border border-stone-700/60 text-xs font-mono text-stone-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>ModaGPT V8 · {language === 'zh' ? '统一服装智能创作平台' : 'Unified Haute Couture AI'}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-medium tracking-tight text-white leading-tight">
            {language === 'zh' ? '工程级 AI 时装创作控制台' : 'Engineering-Grade Sartorial Studio'}
          </h1>

          <p className="text-stone-300 text-sm sm:text-base leading-relaxed font-light">
            {language === 'zh'
              ? '通过自然语言统一调度服装设计、虚拟试衣、AI 模特棚拍、精准换色与走秀视频。拒绝虚假演示，所有链路均接入真实模型与严格质检。'
              : 'Orchestrating bespoke garment design, virtual try-on, commercial model shoots, precision recolor, and runway video via unified multimodal natural language.'}
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigateToCreator()}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-white text-stone-900 font-medium text-sm hover:bg-stone-100 transition shadow-md hover:scale-[1.01]"
            >
              <Sparkles className="w-4 h-4 text-stone-900" />
              <span>{language === 'zh' ? '进入 AI 创作中心' : 'Launch AI Creator'}</span>
              <ArrowRight className="w-4 h-4 text-stone-400" />
            </button>

            <button
              type="button"
              onClick={onNavigateToAssets}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-200 text-sm font-medium border border-stone-700 transition"
            >
              <FolderArchive className="w-4 h-4 text-stone-400" />
              <span>{language === 'zh' ? '查看素材库' : 'View Assets'}</span>
            </button>
          </div>
        </div>

        {/* Floating Digital Core particle sphere on the right */}
        <div className="hidden lg:flex absolute right-12 top-1/2 -translate-y-1/2 items-center justify-center pointer-events-none opacity-90">
          <ModaUICore state="idle" size="lg" />
        </div>
      </section>

      {/* 2. Quick Command Dispatch Cards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-mono uppercase tracking-wider text-stone-500 font-semibold">
            {language === 'zh' ? '快捷自然语言创作指令' : 'Quick Multimodal Directives'}
          </div>
          <span className="text-xs text-stone-400 font-mono">
            {language === 'zh' ? '点击即刻在创作中心执行' : 'Dispatches directly to AI Creator'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {quickPrompts.map((qp, idx) => (
            <div
              key={idx}
              onClick={() => onNavigateToCreator(qp.prompt)}
              className="group cursor-pointer p-4 bg-white rounded-xl border border-stone-200 hover:border-stone-900 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="text-xs font-mono text-stone-400 flex items-center justify-between">
                  <span>CMD #{idx + 1}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-stone-900 group-hover:translate-x-0.5 transition" />
                </div>
                <h3 className="text-sm font-semibold text-stone-900 group-hover:text-black">
                  {qp.title}
                </h3>
                <p className="text-xs text-stone-500 leading-normal line-clamp-2">
                  {qp.desc}
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-stone-100 flex items-center text-[11px] font-mono text-stone-400 group-hover:text-stone-700">
                <span>{language === 'zh' ? '快速发起 →' : 'Send to Creator →'}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Real Active Tasks & Recent Creations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Creations (7 cols) */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-stone-600" />
                <h2 className="text-sm font-semibold text-stone-900 font-serif">
                  {language === 'zh' ? '最近创作与成果' : 'Recent Creations'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onNavigateToAssets}
                className="text-xs text-stone-500 hover:text-stone-900 font-mono transition flex items-center gap-1"
              >
                <span>{language === 'zh' ? '全部素材' : 'View all'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentCreations.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                  <Layers className="w-6 h-6" />
                </div>
                <div className="text-sm font-medium text-stone-700">
                  {language === 'zh' ? '暂无生成作品' : 'No generated creations yet'}
                </div>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  {language === 'zh'
                    ? '进入 AI 创作中心，输入您的第一条服装设计或虚拟试衣指令即可开始。'
                    : 'Launch AI Creator to generate your first garment design or try-on model.'}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateToCreator()}
                  className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition"
                >
                  {language === 'zh' ? '立即创作' : 'Start Designing'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {recentCreations.map((item) => (
                  <div
                    key={item.id}
                    className="group relative rounded-xl overflow-hidden border border-stone-200 bg-stone-50 aspect-3/4 flex flex-col"
                  >
                    <img
                      src={item.dataUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end text-white">
                      <div className="text-[11px] font-medium truncate">{item.name}</div>
                      <div className="text-[9px] font-mono text-stone-300 capitalize">{item.category || 'Garment'}</div>
                      <button
                        type="button"
                        onClick={() => onNavigateToCreator(`以此图为基础继续微调设计：${item.name}`)}
                        className="mt-2 text-[10px] bg-white text-stone-900 py-1 px-2 rounded font-medium hover:bg-stone-100 transition text-center"
                      >
                        {language === 'zh' ? '在创作中心修改' : 'Edit in Creator'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Active Tasks & Real Queue Status (5 cols) */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-stone-600" />
                <h2 className="text-sm font-semibold text-stone-900 font-serif">
                  {language === 'zh' ? '任务队列与执行状态' : 'Task Queue & Status'}
                </h2>
              </div>
              <button
                type="button"
                onClick={fetchDashboardData}
                className="p-1 text-stone-400 hover:text-stone-700 rounded transition"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-stone-300 mx-auto" />
                <div className="text-xs font-mono text-stone-500">
                  {language === 'zh' ? '当前无正在排队或执行的任务' : 'No active or queued tasks'}
                </div>
                <div className="text-[11px] text-stone-400">
                  {language === 'zh' ? '引擎待命，随时响应新请求' : 'Engines idle and standing by'}
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-1.5 font-medium text-stone-900 truncate">
                        <span className="font-mono text-[10px] bg-stone-200 px-1 rounded uppercase">
                          {task.type}
                        </span>
                        <span className="truncate">{task.stageMessage || task.id}</span>
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                        {new Date(task.createdAt).toLocaleTimeString()} · Progress: {task.progress || 0}%
                      </div>
                    </div>
                    <div>
                      {task.status === 'completed' && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono text-[10px] border border-emerald-200 font-medium">
                          Completed
                        </span>
                      )}
                      {(task.status === 'processing' || task.status === 'queued') && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono text-[10px] border border-blue-200 font-medium animate-pulse">
                          {task.status}
                        </span>
                      )}
                      {task.status === 'failed' && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-mono text-[10px] border border-rose-200 font-medium">
                          Failed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Engine Health Micro-Bar */}
          <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-[11px] font-mono text-stone-500">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-stone-400" />
              <span>
                {systemStatus?.geminiConfigured
                  ? (language === 'zh' ? 'Gemini 3.8 / Nano 已接入' : 'Gemini Connected')
                  : (language === 'zh' ? '本地确定性引擎就绪' : 'Deterministic Engine Active')}
              </span>
            </div>
            <button
              type="button"
              onClick={onNavigateToSettings}
              className="text-stone-600 hover:text-stone-900 font-sans text-xs flex items-center gap-1 transition"
            >
              <span>{language === 'zh' ? '管理出图偏好' : 'Preferences'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
