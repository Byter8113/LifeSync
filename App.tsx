import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Target, 
  BookOpen, 
  BarChart3, 
  Settings as SettingsIcon,
  Bell,
  Search,
  Menu,
  X,
  Sparkles,
  Flame,
  Loader2
} from 'lucide-react';
import { Goal, JournalEntry, AppView, GoalSnapshot, GoalType, ChatSession } from './types';
import Dashboard from './components/Dashboard';
import GoalsList from './components/GoalsList';
import Journal from './components/Journal';
import Analytics from './components/Analytics';
import Consultation from './components/Consultation';
import Settings from './components/Settings';
import Streaks from './components/Streaks';
import { migrateData } from './migration';
import { useLanguage } from './contexts/LanguageContext';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<AppView>('dashboard');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [preferredModel, setPreferredModel] = useState<string>('gemini-3-flash-preview');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [virtualDate, setVirtualDate] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const { t } = useLanguage();

  useEffect(() => {
    migrateData();
    const loadedGoals = JSON.parse(localStorage.getItem('ls_goals') || '[]');
    setGoals(loadedGoals);
    setView((localStorage.getItem('ls_current_view') as AppView) || 'dashboard');
    setEntries(JSON.parse(localStorage.getItem('ls_journal') || '[]'));
    setChatSessions(JSON.parse(localStorage.getItem('ls_chat_sessions') || '[]'));
    setActiveChatId(localStorage.getItem('ls_active_chat_id') || null);
    setTheme((localStorage.getItem('ls_theme') as 'light' | 'dark') || 'light');
    setPreferredModel(localStorage.getItem('ls_preferred_model') || 'gemini-3-flash-preview');
    setVirtualDate(localStorage.getItem('ls_virtual_date') || null);
    setApiKey(localStorage.getItem('ls_api_key') || '');
    
    setIsLoading(false);
  }, []);

  const getNow = useCallback(() => {
    return virtualDate ? new Date(virtualDate + 'T12:00:00') : new Date();
  }, [virtualDate]);

  useEffect(() => {
    if (isLoading) return;
    localStorage.setItem('ls_theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme, isLoading]);

  useEffect(() => { if (!isLoading) localStorage.setItem('ls_preferred_model', preferredModel); }, [preferredModel, isLoading]);
  useEffect(() => { if (!isLoading) localStorage.setItem('ls_api_key', apiKey); }, [apiKey, isLoading]);
  useEffect(() => { if (!isLoading) localStorage.setItem('ls_current_view', view); }, [view, isLoading]);
  useEffect(() => { if (!isLoading) localStorage.setItem('ls_chat_sessions', JSON.stringify(chatSessions)); }, [chatSessions, isLoading]);
  useEffect(() => { if (!isLoading) { if (activeChatId) localStorage.setItem('ls_active_chat_id', activeChatId); else localStorage.removeItem('ls_active_chat_id'); } }, [activeChatId, isLoading]);
  useEffect(() => { if (!isLoading) { if (virtualDate) localStorage.setItem('ls_virtual_date', virtualDate); else localStorage.removeItem('ls_virtual_date'); } }, [virtualDate, isLoading]);

  const captureGoalSnapshot = useCallback((): GoalSnapshot[] => {
    const now = getNow();
    const todayStr = now.toISOString().split('T')[0];

    return goals.map(g => {
      const current = g.type === GoalType.CHECKLIST ? g.subtasks.filter(s => s.completed).length : g.current;
      const target = g.type === GoalType.CHECKLIST ? Math.max(1, g.subtasks.length) : g.target;
      const isCompleted = g.status === 'completed';
      
      let dailyProgress = g.dailyProgress || 0;
      if (g.type === GoalType.CHECKLIST) {
        dailyProgress = g.subtasks.filter(s => s.completed && s.completedAt?.startsWith(todayStr)).length;
      }
      const isDailyDone = (g.dailyTarget || 0) > 0 && dailyProgress >= (g.dailyTarget || 0);

      return { goalId: g.id, title: g.title, current, target, dailyProgress, dailyTarget: g.dailyTarget || 0, isCompleted, isDailyDone, completedAt: g.completedAt };
    });
  }, [goals, getNow]);

  useEffect(() => {
    if (isLoading) return;
    const now = getNow();
    const todayStr = now.toISOString().split('T')[0];
    
    // Activate scheduled goals
    setGoals(prev => prev.map(g => (g.status === 'scheduled' && g.startDate <= todayStr) ? { ...g, status: 'active' } : g));

    // Reset daily progress
    const lastResetDate = localStorage.getItem('ls_last_reset_date');
    if (lastResetDate !== todayStr) {
      setGoals(prev => prev.map(g => ({ ...g, dailyProgress: 0 })));
      localStorage.setItem('ls_last_reset_date', todayStr);
    }
  }, [getNow, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    localStorage.setItem('ls_goals', JSON.stringify(goals));
    const todayStr = getNow().toISOString().split('T')[0];
    setEntries(prev => prev.map(e => e.date.startsWith(todayStr) ? { ...e, goalSnapshots: captureGoalSnapshot() } : e));
  }, [goals, getNow, captureGoalSnapshot, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    localStorage.setItem('ls_journal', JSON.stringify(entries));
  }, [entries, isLoading]);

  const handleSetEntries = (updatedEntries: React.SetStateAction<JournalEntry[]>) => {
    setEntries(prev => {
      const newEntries = typeof updatedEntries === 'function' ? updatedEntries(prev) : updatedEntries;
      return newEntries.map((e, idx) => {
        if (idx === 0 && !e.goalSnapshots) {
          return { ...e, goalSnapshots: captureGoalSnapshot() };
        }
        return e;
      });
    });
  };

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#020617]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-indigo-600 animate-spin" />
          <p className="mt-4 font-bold text-slate-700 dark:text-slate-300">{t('app.loading')}</p>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (view) {
      case 'dashboard': return <Dashboard goals={goals} entries={entries} onNavigate={setView} getNow={getNow} />;
      case 'goals': return <GoalsList goals={goals} setGoals={setGoals} getNow={getNow} />;
      case 'journal': return <Journal entries={entries} setEntries={handleSetEntries} getNow={getNow} apiKey={apiKey} />;
      case 'analytics': return <Analytics goals={goals} entries={entries} getNow={getNow} preferredModel={preferredModel} apiKey={apiKey} />;
      case 'streaks': return <Streaks goals={goals} entries={entries} getNow={getNow} />;
      case 'consultation': return <Consultation goals={goals} entries={entries} chatSessions={chatSessions} setChatSessions={setChatSessions} activeChatId={activeChatId} setActiveChatId={setActiveChatId} getNow={getNow} preferredModel={preferredModel} apiKey={apiKey} />;
      case 'settings': return <Settings virtualDate={virtualDate} setVirtualDate={setVirtualDate} theme={theme} setTheme={setTheme} preferredModel={preferredModel} setPreferredModel={setPreferredModel} apiKey={apiKey} setApiKey={setApiKey} />;
      default: return <Dashboard goals={goals} entries={entries} onNavigate={setView} getNow={getNow} />;
    }
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { id: 'goals', icon: Target, label: t('nav.goals') },
    { id: 'streaks', icon: Flame, label: t('nav.streaks') },
    { id: 'journal', icon: BookOpen, label: t('nav.journal') },
    { id: 'analytics', icon: BarChart3, label: t('nav.analytics') },
    { id: 'consultation', icon: Sparkles, label: t('nav.coach') },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800 transition-all duration-300 lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
                <Target className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight dark:text-white">LifeSync</span>
            </div>
            <button onClick={toggleSidebar} className="lg:hidden"><X className="w-6 h-6 text-slate-500" /></button>
          </div>
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => { setView(item.id as AppView); setSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all ${view === item.id ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-200 dark:shadow-none' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={() => { setView('settings'); setSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all ${view === 'settings' ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-200 dark:shadow-none' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <SettingsIcon className="w-5 h-5" />
              {t('nav.settings')}
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-30">
          <button onClick={toggleSidebar} className="lg:hidden p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"><Menu className="w-6 h-6 text-slate-600 dark:text-slate-400" /></button>
          <div className="flex-1 max-w-md mx-4 relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder={t('app.searchPlaceholder')} className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-all dark:text-slate-200" />
          </div>
          <div className="flex items-center gap-4">
            {virtualDate && <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg text-[10px] font-black uppercase">{t('app.testMode')}: {new Date(virtualDate).toLocaleDateString()}</div>}
            <button className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg relative">
              <Bell className="w-5 h-5" /><span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#0f172a]"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 cursor-pointer shadow-sm"></div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="h-full p-4 md:p-8">{renderView()}</div>
        </div>
      </main>
    </div>
  );
};

export default App;
