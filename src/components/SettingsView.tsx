import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  Settings,
  Globe,
  Sliders,
  Bell,
  Trash2,
  CheckCircle2,
  Save,
  Moon,
  Sparkles,
  HardDrive,
  User,
} from 'lucide-react';

interface UserPreferences {
  defaultResolution: '1K' | '2K' | '4K';
  defaultLanguage: 'zh' | 'en';
  enableNotifications: boolean;
  autoScrollChat: boolean;
  defaultAesthetic: string;
}

export const SettingsView: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [preferences, setPreferences] = useState<UserPreferences>({
    defaultResolution: '2K',
    defaultLanguage: language as 'zh' | 'en',
    enableNotifications: true,
    autoScrollChat: true,
    defaultAesthetic: 'contemporary_luxury',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  // Load user settings on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('modagpt_user_preferences');
      if (saved) {
        setPreferences(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load user preferences', e);
    }
  }, []);

  const handleSavePreferences = () => {
    setIsSaving(true);
    try {
      localStorage.setItem('modagpt_user_preferences', JSON.stringify(preferences));
      setLanguage(preferences.defaultLanguage);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      console.error('Failed to save preferences', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearDrafts = () => {
    if (confirm(language === 'zh' ? '确定要清空本地聊天记录与草稿吗？' : 'Clear all local chat history and drafts?')) {
      localStorage.removeItem('modagpt_v8_execution_history_v1');
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 2500);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300 max-w-4xl">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-stone-900" />
            <h1 className="text-xl font-serif font-bold text-stone-900">
              {language === 'zh' ? '总设置' : 'Settings'}
            </h1>
          </div>
          <p className="text-xs text-stone-500 font-mono mt-1">
            {language === 'zh'
              ? '管理您的界面语言、出图规格、创作偏好与个人偏好设置'
              : 'Manage interface language, resolution, creative style & personal preferences'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSavePreferences}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-medium transition shadow-xs disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? (language === 'zh' ? '保存中...' : 'Saving...') : (language === 'zh' ? '保存设置' : 'Save Changes')}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{language === 'zh' ? '个人偏好设置已成功保存' : 'Preferences successfully saved'}</span>
        </div>
      )}

      {cacheCleared && (
        <div className="p-3 bg-stone-100 border border-stone-300 text-stone-800 text-xs rounded-xl flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 text-stone-700" />
          <span>{language === 'zh' ? '本地聊天草稿已清空' : 'Local drafts cleared'}</span>
        </div>
      )}

      {/* 2. Language & Localization */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
          <Globe className="w-4 h-4 text-stone-900" />
          <h2 className="text-sm font-semibold text-stone-900 font-serif">
            {language === 'zh' ? '语言与地区' : 'Language & Localization'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-800 block">
              {language === 'zh' ? '界面与对话语言' : 'Display & Conversation Language'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPreferences((p) => ({ ...p, defaultLanguage: 'zh' }));
                  setLanguage('zh');
                }}
                className={`py-2 text-xs rounded-xl border transition ${
                  preferences.defaultLanguage === 'zh'
                    ? 'bg-stone-900 text-white border-stone-900 font-medium'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                简体中文
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreferences((p) => ({ ...p, defaultLanguage: 'en' }));
                  setLanguage('en');
                }}
                className={`py-2 text-xs rounded-xl border transition ${
                  preferences.defaultLanguage === 'en'
                    ? 'bg-stone-900 text-white border-stone-900 font-medium'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                English
              </button>
            </div>
            <p className="text-[11px] text-stone-400">
              {language === 'zh' ? '设置 AI 对话回复及时装设计规格书的默认语言' : 'Sets the default language for AI chat and specification sheets.'}
            </p>
          </div>
        </div>
      </section>

      {/* 3. Creative Output Preferences */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
          <Sparkles className="w-4 h-4 text-stone-900" />
          <h2 className="text-sm font-semibold text-stone-900 font-serif">
            {language === 'zh' ? '出图偏好与画质规格' : 'Creative Output & Resolution'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Resolution */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-stone-800 block">
              {language === 'zh' ? '默认生成画质' : 'Default Image Resolution'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['1K', '2K', '4K'] as const).map((res) => (
                <button
                  key={res}
                  type="button"
                  onClick={() => setPreferences((p) => ({ ...p, defaultResolution: res }))}
                  className={`py-2 text-xs font-mono rounded-xl border transition ${
                    preferences.defaultResolution === res
                      ? 'bg-stone-900 text-white border-stone-900 font-medium'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-stone-400">
              {language === 'zh' ? '2K 兼顾生成速度与商用细节，4K 提供超高清织物纹理。' : '2K balances speed and commercial detail; 4K provides ultra-fine fabric texture.'}
            </p>
          </div>

          {/* Aesthetic Direction */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-stone-800 block">
              {language === 'zh' ? '默认摄影美学风格' : 'Default Studio Aesthetic'}
            </label>
            <select
              value={preferences.defaultAesthetic}
              onChange={(e) => setPreferences((p) => ({ ...p, defaultAesthetic: e.target.value }))}
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-stone-900"
            >
              <option value="contemporary_luxury">{language === 'zh' ? '意式高定棚拍 (Contemporary Sartorial Luxury)' : 'Contemporary Sartorial Luxury'}</option>
              <option value="minimalist_nordic">{language === 'zh' ? '极简主义纯净光影 (Minimalist Nordic Studio)' : 'Minimalist Nordic Studio'}</option>
              <option value="editorial_paris">{language === 'zh' ? '巴黎时装周大片 (Paris High-Fashion Editorial)' : 'Paris High-Fashion Editorial'}</option>
              <option value="urban_streetwear">{language === 'zh' ? '先锋先锋街头造型 (Avant-Garde Architectural)' : 'Avant-Garde Architectural'}</option>
            </select>
            <p className="text-[11px] text-stone-400">
              {language === 'zh' ? '未在自然语言中特别指定背景与灯光时默认采用的影棚布光。' : 'Default lighting and studio atmosphere applied when unspecified.'}
            </p>
          </div>
        </div>
      </section>

      {/* 4. Experience & Notifications */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
          <Bell className="w-4 h-4 text-stone-900" />
          <h2 className="text-sm font-semibold text-stone-900 font-serif">
            {language === 'zh' ? '通知与交互偏好' : 'Notifications & Interaction'}
          </h2>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200/80">
            <div>
              <div className="font-semibold text-stone-900">
                {language === 'zh' ? '任务完成系统提示音' : 'Task Completion Audio Ping'}
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">
                {language === 'zh' ? '多步骤设计生成或走秀视频渲染完毕后发出轻柔提示' : 'Subtle notification chime when generation finishes.'}
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.enableNotifications}
              onChange={(e) => setPreferences((p) => ({ ...p, enableNotifications: e.target.checked }))}
              className="w-4 h-4 accent-stone-900 rounded"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200/80">
            <div>
              <div className="font-semibold text-stone-900">
                {language === 'zh' ? '自动滚动至最新创作' : 'Auto-Scroll to New Creations'}
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">
                {language === 'zh' ? '生成新设计或版本微调完成后视口平滑聚焦到新作品' : 'Smoothly scrolls viewport to newly synthesized garment.'}
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.autoScrollChat}
              onChange={(e) => setPreferences((p) => ({ ...p, autoScrollChat: e.target.checked }))}
              className="w-4 h-4 accent-stone-900 rounded"
            />
          </div>
        </div>
      </section>

      {/* 5. Storage & Draft Management */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
          <HardDrive className="w-4 h-4 text-stone-900" />
          <h2 className="text-sm font-semibold text-stone-900 font-serif">
            {language === 'zh' ? '本地草稿与存储管理' : 'Local Drafts & Storage'}
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-stone-50 rounded-xl border border-stone-200">
          <div>
            <div className="text-xs font-semibold text-stone-900">
              {language === 'zh' ? '清空本地创作记录' : 'Clear Local Chat History'}
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">
              {language === 'zh' ? '清除保存在本地浏览器的对话草稿与上下文，不影响素材库已保存资产。' : 'Removes local chat drafts. Assets in Asset Library remain intact.'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearDrafts}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium rounded-lg border border-rose-200 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{language === 'zh' ? '清空草稿' : 'Clear Drafts'}</span>
          </button>
        </div>
      </section>
    </div>
  );
};
