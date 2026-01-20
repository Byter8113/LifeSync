import React, { useMemo } from 'react';
import { Goal, JournalEntry, AppView, GoalType } from '../types';
import { 
  TrendingUp, 
  Clock, 
  Calendar, 
  PlusCircle, 
  ChevronRight,
  Smile,
  Zap,
  Moon,
  Wind,
  Target as FocusIcon,
  CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardProps {
  goals: Goal[];
  entries: JournalEntry[];
  onNavigate: (view: AppView) => void;
  getNow: () => Date;
}

const Dashboard: React.FC<DashboardProps> = ({ goals, entries, onNavigate, getNow }) => {
  const { t, locale, getGoalTypeName } = useLanguage();
  const now = getNow();
  const todayStr = now.toISOString().split('T')[0];

  const todayEntry = entries.find(e => e.date.startsWith(todayStr));
  const latestMoodValue = todayEntry?.wellness?.mood || 0;
  const metrics = todayEntry?.wellness || { mood: 0, energy: 0, stress: 0, sleep: 0, concentration: 0 };
  
  const dailyNormsDone = goals.filter(g => {
    if (g.status !== 'active' || !g.dailyTarget || g.dailyTarget <= 0) return false;
    return (g.dailyProgress || 0) >= g.dailyTarget;
  }).length;

  const totalProgressPercentage = useMemo(() => {
    const activeGoals = goals.filter(g => g.status === 'active');
    if (activeGoals.length === 0) return 0;
    
    const sumOfProgressFractions = activeGoals.reduce((acc, g) => {
      let progressFraction = 0;
      switch (g.type) {
        case GoalType.QUANTITATIVE:
          progressFraction = g.target > 0 ? (g.current / g.target) : 0;
          break;
        case GoalType.CHECKLIST:
          progressFraction = g.subtasks.length > 0 ? (g.subtasks.filter(s => s.completed).length / g.subtasks.length) : 0;
          break;
        case GoalType.SCHEDULED:
          progressFraction = g.target > 0 ? (g.current / g.target) : 0;
          break;
      }
      return acc + progressFraction;
    }, 0);
    
    if (activeGoals.length === 0) return 0;
    return Math.round((sumOfProgressFractions / activeGoals.length) * 100);
  }, [goals]);

  const streakDays = useMemo(() => {
    if (entries.length === 0) return 0;
    const dates = new Set(entries.map(e => e.date.split('T')[0]));
    let streak = 0;
    let checkDate = new Date(now);
    const todayKey = checkDate.toISOString().split('T')[0];
    if (!dates.has(todayKey)) {
        checkDate.setDate(checkDate.getDate() - 1);
    }
    while (dates.has(checkDate.toISOString().split('T')[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return streak;
  }, [entries, now]);

  const recentGoals = goals.filter(g => g.status === 'active').slice(0, 3);
  
  const getGoalProgressPercent = (goal: Goal) => {
    switch (goal.type) {
      case GoalType.QUANTITATIVE:
        return goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0;
      case GoalType.CHECKLIST:
        return goal.subtasks.length > 0 ? (goal.subtasks.filter(s => s.completed).length / goal.subtasks.length) * 100 : 0;
      case GoalType.SCHEDULED:
        return goal.current >= goal.target ? 100 : 0;
      default:
        return 0;
    }
  };

  const getGoalProgressText = (goal: Goal) => {
    switch (goal.type) {
      case GoalType.QUANTITATIVE:
        return `${goal.current} / ${goal.target}`;
      case GoalType.CHECKLIST:
        return `${goal.subtasks.filter(s => s.completed).length} / ${goal.subtasks.length}`;
      case GoalType.SCHEDULED:
        return goal.current >= goal.target ? t('dashboard.goalCompleted') : t('dashboard.goalAwaiting');
      default:
        return '';
    }
  };


  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white transition-colors">{t('dashboard.greeting')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {t('dashboard.subtitle')} {now.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate('goals')}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg font-bold"
          >
            <PlusCircle className="w-5 h-5" />
            {t('dashboard.newGoal')}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={TrendingUp} label={t('dashboard.statProgress')} value={`${totalProgressPercentage}%`} color="indigo" sub={t('dashboard.statProgressSub')} />
        <StatCard icon={CheckCircle2} label={t('dashboard.statDailyNorms')} value={`${dailyNormsDone}`} color="emerald" sub={t('dashboard.statDailyNormsSub')} />
        <StatCard icon={Smile} label={t('dashboard.statMood')} value={latestMoodValue > 0 ? `${latestMoodValue}/10` : '—'} color="amber" sub={todayEntry && todayEntry.wellness ? t('dashboard.statMoodSubRecorded') : t('dashboard.statMoodSubWaiting')} />
        <StatCard icon={Calendar} label={t('dashboard.statStreak')} value={`${streakDays} ${t('streaks.days')}`} color="purple" sub={t('dashboard.statStreakSub')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('dashboard.currentGoals')}</h2>
            <button onClick={() => onNavigate('goals')} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 text-sm font-bold flex items-center gap-1 transition-all">
              {t('dashboard.fullList')} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {recentGoals.length === 0 ? (
                <div className="p-10 text-center bg-white dark:bg-[#0f172a] rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-slate-400 dark:text-slate-500 font-medium">{t('dashboard.noGoals')}</p>
                    <button onClick={() => onNavigate('goals')} className="mt-4 text-indigo-600 dark:text-indigo-400 font-bold underline">{t('dashboard.addNewGoal')}</button>
                </div>
            ) : (
                recentGoals.map(goal => (
                    <div key={goal.id} className="bg-white dark:bg-[#0f172a] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                               <span className="text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider bg-blue-100 text-blue-600 border border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800">
                                   {new Date(goal.endDate + 'T12:00:00').toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                                </span>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 mt-2 text-lg">{goal.title}</h3>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-slate-400 dark:text-slate-500 block mb-1 uppercase tracking-tighter">{t('dashboard.progress')}</span>
                              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                  {getGoalProgressText(goal)}
                              </span>
                            </div>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
                            <div 
                                className="bg-indigo-600 h-full transition-all duration-1000 shadow-[0_0_8px_rgba(79,70,229,0.3)]" 
                                style={{ width: `${getGoalProgressPercent(goal)}%` }}
                            />
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('dashboard.dayMetrics')}</h2>
          <div className="bg-white dark:bg-[#0f172a] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <MetricItem icon={Zap} label={t('dashboard.metricEnergy')} value={metrics?.energy || 0} color="text-amber-500" />
            <MetricItem icon={FocusIcon} label={t('dashboard.metricFocus')} value={metrics?.concentration || 0} color="text-indigo-500" />
            <MetricItem icon={Wind} label={t('dashboard.metricStress')} value={metrics?.stress || 0} color="text-rose-500" />
            <MetricItem icon={Moon} label={t('dashboard.metricSleep')} value={metrics?.sleep || 0} color="text-blue-500" />
            
            <button 
                onClick={() => onNavigate('journal')}
                className="w-full py-3.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all mt-4 shadow-xl active:scale-95 flex items-center justify-center gap-2"
            >
                {todayEntry ? t('dashboard.updateEntry') : t('dashboard.newNote')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, sub }: any) => {
    const colors: any = { indigo: 'bg-indigo-600', emerald: 'bg-emerald-600', amber: 'bg-amber-600', purple: 'bg-purple-600' };
    return (
        <div className="bg-white dark:bg-[#0f172a] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className={`w-12 h-12 ${colors[color]} rounded-2xl flex items-center justify-center mb-5 shadow-inner`}>
                <Icon className="text-white w-6 h-6" />
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">{label}</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{value}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">{sub}</p>
        </div>
    );
};

const MetricItem = ({ icon: Icon, label, value, color }: any) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="font-bold text-slate-700 dark:text-slate-300 transition-colors">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-24 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className={`bg-indigo-500 h-full transition-all duration-500 ${(value || 0) === 0 ? 'opacity-0' : 'opacity-100'}`} style={{ width: `${(value || 0) * 10}%` }} />
      </div>
      <span className="text-sm font-black text-slate-900 dark:text-slate-100 w-5 text-right">{value || 0}</span>
    </div>
  </div>
);

export default Dashboard;
