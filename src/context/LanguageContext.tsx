import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language } from '../i18n/translations.ts';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (path: string, fallback?: string) => string;
  strings: typeof translations.zh;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('atelier_language');
      if (saved === 'zh' || saved === 'en') {
        return saved;
      }
      // Intelligent browser language detection
      if (typeof navigator !== 'undefined' && navigator.language) {
        if (navigator.language.toLowerCase().startsWith('zh')) {
          return 'zh';
        }
      }
    } catch {
      // ignore
    }
    return 'zh'; // Default to Chinese as requested by user
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('atelier_language', lang);
    } catch {
      // ignore
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
      document.title =
        language === 'zh'
          ? 'Atelier AI - 商业级时尚智能与虚拟试衣工作室'
          : 'Atelier AI - Commercial Fashion Intelligence & Virtual Fitting Studio';
    }
  }, [language]);

  const t = (path: string, fallback?: string): string => {
    const keys = path.split('.');
    let current: any = translations[language];
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to English dictionary if not found in current language
        let fallbackVal: any = translations.en;
        for (const fbKey of keys) {
          if (fallbackVal && typeof fallbackVal === 'object' && fbKey in fallbackVal) {
            fallbackVal = fallbackVal[fbKey];
          } else {
            fallbackVal = undefined;
            break;
          }
        }
        return (typeof fallbackVal === 'string' ? fallbackVal : fallback) || path;
      }
    }
    return typeof current === 'string' ? current : fallback || path;
  };

  const strings = translations[language] as typeof translations.zh;

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        strings,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
