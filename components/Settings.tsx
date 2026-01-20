import React, { useRef, useState } from 'react';
import { Settings as SettingsIcon, Beaker, Calendar, RotateCcw, AlertTriangle, Moon, Cpu, Sparkles, Upload, Download, Database, Languages, Brain, Check, KeyRound } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../i18n';

interface SettingsProps {
  virtualDate: string | null;
  setVirtualDate: (date: string | null) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  preferredModel: string;
  setPreferredModel: (model: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  virtualDate, 
  setVirtualDate, 
  theme, 
  setTheme,
  preferredModel,
  setPreferredModel,
  apiKey,
  setApiKey
}) => {
  const { language, setLanguage, t } = useLanguage();
  const isTestingMode = virtualDate !== null;
  const importFileRef = useRef<HTMLInputElement>(null);
  const [localApiKey, setLocalApiKey] = useState(apiKey);

  const toggleTestingMode = () => {
    if (isTestingMode) setVirtualDate(null);
    else setVirtualDate(new Date().toISOString().split('T')[0]);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => setVirtualDate(e.target.value);

  const handleExport = () => {
    const backupData = {
      goals: JSON.parse(localStorage.getItem('ls_goals') || '[]'),
      journal: JSON.parse(localStorage.getItem('ls_journal') || '[]'),
      chat_sessions: JSON.parse(localStorage.getItem('ls_chat_sessions') || '[]'),
      theme: localStorage.getItem('ls_theme') || 'light',
      preferred_model: localStorage.getItem('ls_preferred_model') || 'gemini-3-flash-preview',
      api_key: localStorage.getItem('ls_api_key') || '',
      data_version: localStorage.getItem('ls_data_version') || '3',
      language: localStorage.getItem('ls_language') || 'uk',
    };
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `lifesync_backup_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => importFileRef.current?.click();

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (window.confirm(t('settings.importConfirm'))) {
          localStorage.setItem('ls_goals', JSON.stringify(importedData.goals || []));
          localStorage.setItem('ls_journal', JSON.stringify(importedData.journal || []));
          localStorage.setItem('ls_chat_sessions', JSON.stringify(importedData.chat_sessions || []));
          localStorage.setItem('ls_theme', importedData.theme || 'light');
          localStorage.setItem('ls_preferred_model', importedData.preferred_model || 'gemini-3-flash-preview');
          localStorage.setItem('ls_api_key', importedData.api_key || '');
          localStorage.setItem('ls_data_version', importedData.data_version || '3');
          localStorage.setItem('ls_language', importedData.language || 'uk');
          alert(t('settings.importSuccess'));
          window.location.reload();
        }
      } catch (err) {
        alert(t('settings.importError'));
        console.error(err);
      } finally {
        if(importFileRef.current) importFileRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleSaveApiKey = () => {
    setApiKey(localApiKey);
    alert(t('settings.apiKeySaved'));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('settings.title')}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1e293b]/50"><h2 className="text-lg font-bold flex items-center gap-2 dark:text-white"><KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />{t('settings.apiKeyTitle')}</h2></div>
        <div className="p-8">
          <div className="space-y-2 mb-4">
              <h3 className="font-bold">{t('settings.apiKeyTitle')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.apiKeyDesc')} <span className="font-bold text-indigo-500">{t('settings.apiKeyWarning')}</span></p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <input 
              type="password"
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              placeholder={t('settings.apiKeyPlaceholder')}
              className="flex-1 w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={handleSaveApiKey} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all">{t('settings.apiKeySaveButton')}</button>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1e293b]/50"><h2 className="text-lg font-bold flex items-center gap-2 dark:text-white"><Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />{t('settings.dataManagement')}</h2></div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="font-bold">{t('settings.exportTitle')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.exportDesc')}</p>
          </div>
          <button onClick={handleExport} className="w-full md:w-auto md:ml-auto bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all"><Download className="w-4 h-4"/>{t('settings.exportButton')}</button>
          <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-800"></div>
          <div className="space-y-2">
            <h3 className="font-bold">{t('settings.importTitle')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.importDesc')} <span className="text-rose-500 font-bold">{t('settings.importWarning')}</span> {t('settings.importWarningDesc')}</p>
          </div>
          <button onClick={handleImportClick} className="w-full md:w-auto md:ml-auto bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all"><Upload className="w-4 h-4"/>{t('settings.importButton')}</button>
          <input type="file" accept=".json" ref={importFileRef} onChange={handleFileImport} className="hidden" />
        </div>
      </div>

      <div className="bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex items-center justify-between transition-all">
        <div className="space-y-1">
          <h3 className="font-bold text-slate-900 dark:text-white">{t('settings.language')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.languageDesc')}</p>
        </div>
        <select 
          value={language} 
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="uk">Українська</option>
          <option value="en">English</option>
          <option value="ru">Русский</option>
        </select>
      </div>

      <div className="bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1e293b]/50 transition-colors"><h2 className="text-lg font-bold flex items-center gap-2 dark:text-white"><Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />{t('settings.aiLevel')}</h2></div>
        <div className="p-8"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><button onClick={() => setPreferredModel('gemini-3-flash-preview')} className={`p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${preferredModel === 'gemini-3-flash-preview' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900'}`}><div className="flex items-center gap-3 mb-2"><Sparkles className={`w-5 h-5 ${preferredModel === 'gemini-3-flash-preview' ? 'text-indigo-600' : 'text-slate-400'}`} /><h3 className="font-bold dark:text-white">{t('settings.aiFlash')}</h3></div><p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t('settings.aiFlashDesc')}</p>{preferredModel === 'gemini-3-flash-preview' && <div className="absolute top-4 right-4 bg-indigo-600 text-white p-1 rounded-full"><Check className="w-3 h-3" /></div>}</button><button onClick={() => setPreferredModel('gemini-3-pro-preview')} className={`p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${preferredModel === 'gemini-3-pro-preview' ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20' : 'border-slate-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-900'}`}><div className="flex items-center gap-3 mb-2"><Brain className={`w-5 h-5 ${preferredModel === 'gemini-3-pro-preview' ? 'text-purple-600' : 'text-slate-400'}`} /><h3 className="font-bold dark:text-white">{t('settings.aiPro')}</h3></div><p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t('settings.aiProDesc')}</p>{preferredModel === 'gemini-3-pro-preview' && <div className="absolute top-4 right-4 bg-purple-600 text-white p-1 rounded-full"><Check className="w-3 h-3" /></div>}</button></div></div>
      </div>

      <div className="bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1e293b]/50 transition-colors"><h2 className="text-lg font-bold flex items-center gap-2 dark:text-white"><Beaker className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />{t('settings.testingTools')}</h2></div>
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between"><div className="space-y-1"><h3 className="font-bold text-slate-900 dark:text-white">{t('settings.virtualDate')}</h3><p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.virtualDateDesc')}</p></div><button onClick={toggleTestingMode} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isTestingMode ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isTestingMode ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>
          {isTestingMode && (<div className="p-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2"><div className="flex items-start gap-3"><AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5" /><div><h4 className="font-bold text-amber-900 dark:text-amber-100">{t('settings.virtualDateActive')}</h4><p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{t('settings.virtualDateActiveDesc')}</p></div></div><div className="flex flex-col sm:flex-row gap-4"><div className="flex-1 relative"><Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" /><input type="date" value={virtualDate?.split('T')[0] || ''} onChange={handleDateChange} className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-700 dark:text-white transition-colors" /></div><button onClick={() => setVirtualDate(new Date().toISOString().split('T')[0])} className="px-6 py-3 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-100 dark:hover:bg-[#1e293b] transition-all"><RotateCcw className="w-4 h-4" />{t('settings.today')}</button></div></div>)}
        </div>
      </div>
      <div className="bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex items-center justify-between transition-all">
        <div className="space-y-1"><h3 className="font-bold text-slate-900 dark:text-white">{t('settings.darkTheme')}</h3><p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.darkThemeDesc')}</p></div><button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} /></button>
      </div>
    </div>
  );
};
export default Settings;
