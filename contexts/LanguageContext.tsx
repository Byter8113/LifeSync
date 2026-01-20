import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { translations, Language, locales, getGoalTypeName, getGeminiSystemPrompt, getGeminiJournalPrompt, getGeminiAnalyticsPrompt } from '../i18n';
import { Goal, JournalEntry } from '../types';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  locale: string;
  getGoalTypeName: (type: string, lang?: Language) => string;
  getGeminiSystemPrompt: (language: Language, goalsContext: string, recentEntries: string) => string;
  getGeminiJournalPrompt: (language: Language, prompt: string) => { systemInstruction: string; userPrompt: string; errorMessage: string; };
  getGeminiAnalyticsPrompt: (language: Language, dataContext: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('uk');

  useEffect(() => {
    const savedLang = localStorage.getItem('ls_language') as Language;
    if (savedLang && translations[savedLang]) {
      setLanguageState(savedLang);
    } else {
        const browserLang = navigator.language.split('-')[0] as Language;
        setLanguageState(translations[browserLang] ? browserLang : 'en');
    }
  }, []);
  
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    localStorage.setItem('ls_language', lang);
    setLanguageState(lang);
  };

  const t = useCallback((key: string): string => {
    const keys = key.split('.');
    let result: any = translations[language];
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        // Fallback to English if key not found
        let fallbackResult: any = translations.en;
        for (const fk of keys) {
            fallbackResult = fallbackResult?.[fk];
        }
        return fallbackResult || key;
      }
    }
    return result || key;
  }, [language]);

  const value = {
    language,
    setLanguage,
    t,
    locale: locales[language],
    getGoalTypeName,
    getGeminiSystemPrompt,
    getGeminiJournalPrompt,
    getGeminiAnalyticsPrompt,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
