
import React, { useState, useMemo } from 'react';
import { JournalEntry, WellnessMetrics } from '../types';
import { 
    Plus, Search, Calendar, Image as ImageIcon, Mic, Smile, Trash2, Tag as TagIcon, Zap, Wind, Moon, X, Target as FocusIcon, List, Check, Notebook, PenLine, FileText, Sparkles, Loader2
} from 'lucide-react';
import { generateJournalEntry } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

interface JournalProps {
  entries: JournalEntry[];
  setEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  getNow: () => Date;
  apiKey: string;
}

type EntryTypeFilter = 'all' | 'reports' | 'notes';

const Journal: React.FC<JournalProps> = ({ entries, setEntries, getNow, apiKey }) => {
  const { t, language } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [entryTypeFilter, setEntryTypeFilter] = useState<EntryTypeFilter>('all');
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showWellnessInModal, setShowWellnessInModal] = useState(true);
  
  const initialNewEntryState: Partial<JournalEntry> = {
    content: '',
    tags: [],
    wellness: { mood: 5, energy: 5, stress: 5, sleep: 5, concentration: 5 },
    media: []
  };

  const [newEntry, setNewEntry] = useState<Partial<JournalEntry>>(initialNewEntryState);

  // AI Generation State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAIPrompt, setShowAIPrompt] = useState(false);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    entries.forEach(e => e.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [entries]);

  const filteredEntries = entries.filter(e => {
    const matchesSearch = e.content.toLowerCase().includes(search.toLowerCase()) || 
                          e.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesTag = !activeTag || e.tags.includes(activeTag);
    
    const isReport = !!e.wellness;
    const matchesType = entryTypeFilter === 'all' || 
                        (entryTypeFilter === 'reports' && isReport) || 
                        (entryTypeFilter === 'notes' && !isReport);

    return matchesSearch && matchesTag && matchesType;
  });

  const openModal = (type: 'report' | 'note') => {
    setShowWellnessInModal(type === 'report');
    setIsAdding(true);
  };

  const closeModal = () => {
    setIsAdding(false);
    setNewEntry(initialNewEntryState);
    setShowAIPrompt(false);
    setAiPrompt('');
  }

  const handleGenerateAIEntry = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    const generatedContent = await generateJournalEntry(aiPrompt, language, apiKey);
    setNewEntry(prev => ({ ...prev, content: (prev.content ? prev.content + '\n\n' : '') + generatedContent }));
    setIsGenerating(false);
    setShowAIPrompt(false);
    setAiPrompt('');
  }

  const saveEntry = () => {
    if (!newEntry.content) return;
    const entry: JournalEntry = {
      ...newEntry as JournalEntry,
      id: Date.now().toString(),
      date: getNow().toISOString(),
      wellness: showWellnessInModal ? newEntry.wellness : undefined,
      media: newEntry.media || []
    };
    setEntries([entry, ...entries]);
    closeModal();
  };

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const removeTagFromEntry = (entryId: string, tagToRemove: string) => {
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, tags: e.tags.filter(t => t !== tagToRemove) } : e));
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white transition-colors">{t('journal.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('journal.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => openModal('note')} 
            className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-5 py-2.5 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-all hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95"
          >
            <PenLine className="w-4 h-4" /> {t('journal.addNote')}
          </button>
          <button 
            onClick={() => openModal('report')} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" /> {t('journal.addReport')}
          </button>
        </div>
      </div>

      <div className="space-y-6 mb-8">
        {/* Type Filter */}
        <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors">
          <button
            onClick={() => setEntryTypeFilter('all')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${entryTypeFilter === 'all' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
          >
            <List className="w-4 h-4" /> {t('journal.filters.all')}
          </button>
          <button
            onClick={() => setEntryTypeFilter('reports')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${entryTypeFilter === 'reports' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
          >
            <Smile className="w-4 h-4" /> {t('journal.filters.reports')}
          </button>
          <button
            onClick={() => setEntryTypeFilter('notes')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${entryTypeFilter === 'notes' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
          >
            <FileText className="w-4 h-4" /> {t('journal.filters.notes')}
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
          <input 
              type="text" 
              placeholder={t('journal.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm dark:text-slate-100 transition-colors"
          />
        </div>

        {allTags.length > 0 && (
          <div className="flex bg-white dark:bg-[#0f172a] p-1 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar shadow-sm transition-colors">
            <button
              onClick={() => setActiveTag(null)}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${!activeTag ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              {t('journal.allTags')}
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTag === tag ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <TagIcon className="w-3 h-3" />
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-8">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <Notebook className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
            <h3 className="text-lg font-bold dark:text-slate-300">{t('journal.empty')}</h3>
            <p className="text-slate-400 text-sm mt-1">{t('journal.emptySub')}</p>
          </div>
        ) : (
          filteredEntries.map(entry => (
            <div key={entry.id} className="bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden group transition-colors">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl
                                ${entry.wellness ? (entry.wellness.mood >= 8 ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : entry.wellness.mood >= 5 ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' : 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400') : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                {entry.wellness ? (entry.wellness.mood >= 8 ? '😊' : entry.wellness.mood >= 5 ? '😐' : '😔') : <FileText className="w-6 h-6" />}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white transition-colors">{new Date(entry.date).toLocaleDateString('uk-UA', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{new Date(entry.date).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })} • {entry.wellness ? t('journal.report') : t('journal.note')}</p>
                            </div>
                        </div>
                        <button onClick={() => deleteEntry(entry.id)} className="p-2 text-slate-200 dark:text-slate-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>

                    <p className="text-slate-700 dark:text-slate-200 leading-relaxed mb-6 whitespace-pre-wrap font-medium">{entry.content}</p>

                    {entry.wellness && (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 py-4 border-y border-slate-50 dark:border-slate-800/50">
                            <MiniMetric label={t('journal.metrics.energy')} value={entry.wellness.energy} color="text-amber-500" />
                            <MiniMetric label={t('journal.metrics.focus')} value={entry.wellness.concentration} color="text-indigo-500" />
                            <MiniMetric label={t('journal.metrics.stress')} value={entry.wellness.stress} color="text-rose-500" />
                            <MiniMetric label={t('journal.metrics.sleep')} value={entry.wellness.sleep} color="text-blue-500" />
                            <MiniMetric label={t('journal.metrics.mood')} value={entry.wellness.mood} color="text-indigo-500" />
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-6">
                        {entry.tags.map(tag => (
                            <span key={tag} className="px-3 py-1 bg-slate-100 dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-200/50 dark:border-slate-700/50">
                                <TagIcon className="w-3 h-3" />
                                {tag}
                                <button onClick={() => removeTagFromEntry(entry.id, tag)} className="hover:text-rose-500">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
          ))
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-[#0f172a] w-full max-w-2xl rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold dark:text-white transition-colors">
                  {showWellnessInModal ? t('journal.modal.newReport') : t('journal.modal.newNote')}
                </h2>
                <button onClick={closeModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="text-slate-500" /></button>
            </div>
            
            <div className="space-y-6">
              {showWellnessInModal ? (
                <div className="bg-slate-50 dark:bg-[#1e293b] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2"><Smile className="w-4 h-4 text-indigo-500" /> {t('journal.modal.wellnessTitle')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                        <RangeSlider label={t('journal.metrics.mood')} value={newEntry.wellness?.mood} onChange={(v) => setNewEntry({...newEntry, wellness: {...newEntry.wellness!, mood: v}})} icon={Smile} />
                        <RangeSlider label={t('journal.metrics.energy')} value={newEntry.wellness?.energy} onChange={(v) => setNewEntry({...newEntry, wellness: {...newEntry.wellness!, energy: v}})} icon={Zap} />
                        <RangeSlider label={t('journal.metrics.focus')} value={newEntry.wellness?.concentration} onChange={(v) => setNewEntry({...newEntry, wellness: {...newEntry.wellness!, concentration: v}})} icon={FocusIcon} />
                        <RangeSlider label={t('journal.metrics.stress')} value={newEntry.wellness?.stress} onChange={(v) => setNewEntry({...newEntry, wellness: {...newEntry.wellness!, stress: v}})} icon={Wind} />
                        <RangeSlider label={t('journal.metrics.sleep')} value={newEntry.wellness?.sleep} onChange={(v) => setNewEntry({...newEntry, wellness: {...newEntry.wellness!, sleep: v}})} icon={Moon} />
                    </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-800 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                    <PenLine className="w-5 h-5" />
                  </div>
                  <div className="text-sm">
                    <p className="font-bold text-indigo-900 dark:text-indigo-200 text-sm">{t('journal.modal.noteInfo')}</p>
                    <p className="text-indigo-600 dark:text-indigo-400 text-xs">{t('journal.modal.noteInfoSub')}</p>
                  </div>
                </div>
              )}

              <div className="relative">
                  <textarea 
                    value={newEntry.content}
                    onChange={(e) => setNewEntry({...newEntry, content: e.target.value})}
                    placeholder={showWellnessInModal ? t('journal.modal.placeholderReport') : t('journal.modal.placeholderNote')}
                    className="w-full h-40 p-6 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-white resize-none transition-colors"
                  />
                   <button onClick={() => setShowAIPrompt(p => !p)} title={t('journal.modal.aiGenerate')} className={`absolute top-4 right-4 p-2 rounded-lg transition-all ${showAIPrompt ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200/50 dark:bg-slate-700/50 text-slate-500 hover:bg-slate-200'}`}><Sparkles className="w-4 h-4" /></button>
              </div>

              {showAIPrompt && (
                <div className="flex gap-2 animate-in fade-in duration-300">
                    <input type="text" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGenerateAIEntry()} placeholder={t('journal.modal.aiPlaceholder')} className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    <button onClick={handleGenerateAIEntry} disabled={isGenerating || !aiPrompt} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 active:scale-95">
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin"/> : t('journal.modal.aiGenerateButton')}
                    </button>
                </div>
              )}

              <div>
                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <TagIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <input 
                          type="text" 
                          placeholder={t('journal.modal.addTag')}
                          onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                  const val = (e.target as HTMLInputElement).value.trim();
                                  if (val) {
                                      setNewEntry({...newEntry, tags: [...(newEntry.tags || []), val]});
                                      (e.target as HTMLInputElement).value = '';
                                  }
                              }
                          }}
                          className="bg-transparent outline-none text-sm font-bold flex-1 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                      {newEntry.tags?.map(t => (
                          <span key={t} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold flex items-center gap-2 border border-indigo-100 dark:border-indigo-800 transition-colors">
                              {t}
                              <button onClick={() => setNewEntry({...newEntry, tags: newEntry.tags?.filter(tag => tag !== t)})}><X className="w-3 h-3" /></button>
                          </span>
                      ))}
                  </div>
              </div>

              <button onClick={saveEntry} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl transition-all active:scale-95 shadow-indigo-200 dark:shadow-none">{t('journal.modal.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MiniMetric = ({ label, value, color }: any) => (
    <div className="text-center">
        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 mb-1 transition-colors">{label}</p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
);

const RangeSlider = ({ label, value, onChange, icon: Icon }: any) => (
    <div className="space-y-2">
        <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase flex items-center gap-1.5 transition-colors"><Icon className="w-3.5 h-3.5" /> {label}</label>
            <span className="text-sm font-black text-slate-900 dark:text-white transition-colors">{value}/10</span>
        </div>
        <input type="range" min="1" max="10" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-500 rounded-full appearance-none cursor-pointer" />
    </div>
);

export default Journal;
