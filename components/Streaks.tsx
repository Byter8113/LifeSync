import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Goal, JournalEntry, GoalType, GoalSnapshot } from '../types';
import { 
  Flame, Calendar, Trophy, XCircle, History, Target, RefreshCw, 
  ChevronLeft, ChevronRight, Zap, Smile, PenLine, X, CheckCircle2, ChevronDown, 
  TrendingUp, Target as TargetIcon, BarChart3, LineChart, Filter, Activity
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot, Legend, Line, ComposedChart } from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';

interface StreaksProps {
  goals: Goal[];
  entries: JournalEntry[];
  getNow: () => Date;
}

const Streaks: React.FC<StreaksProps> = ({ goals, entries, getNow }) => {
  const now = getNow();
  const { t } = useLanguage();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [currentCalDate, setCurrentCalDate] = useState(new Date(now));
  
  // New States for Advanced Analytics
  const [selectedGoalId, setSelectedGoalId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed' | 'failed'>('active');
  const [showMoodCorrelation, setShowMoodCorrelation] = useState(false);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    data: { date: string; entry: JournalEntry | null } | null;
    position: { x: number; y: number };
  }>({ visible: false, data: null, position: { x: 0, y: 0 } });

  // Stats Logic
  const streakStats = useMemo(() => {
    if (entries.length === 0) return { current: 0, longest: 0 };
    const entryDates: string[] = Array.from(new Set(entries.map(e => e.date.split('T')[0])));
    entryDates.sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());
    let current = 0;
    let longest = 0;
    let tempLongest = 1;
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (entryDates.length > 0 && (entryDates[0] === today || entryDates[0] === yesterdayStr)) {
        const sortedAsc = [...entryDates];
        sortedAsc.sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime());
        for (let j = 0; j < sortedAsc.length - 1; j++) {
            const d1 = new Date(sortedAsc[j]);
            const d2 = new Date(sortedAsc[j+1]);
            const diff = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
            if (diff <= 1.1) tempLongest++;
            else { longest = Math.max(longest, tempLongest); tempLongest = 1; }
        }
        longest = Math.max(longest, tempLongest);
        let streak = 0;
        let d = new Date(now);
        if (!entryDates.includes(today)) d.setDate(d.getDate() - 1);
        while (entryDates.includes(d.toISOString().split('T')[0])) {
            streak++;
            d.setDate(d.getDate() - 1);
        }
        current = streak;
    }
    return { current, longest };
  }, [entries, now]);

  const allHistoricalGoals = useMemo(() => {
    const historical = new Map<string, { title: string, id: string, type: GoalType, status: string, endDate?: string, completedAt?: string }>();
    
    goals.forEach(g => {
        historical.set(g.id, { 
            id: g.id, 
            title: g.title, 
            type: g.type, 
            status: g.status,
            endDate: g.endDate,
            completedAt: g.completedAt
        });
    });

    entries.forEach(e => {
        e.goalSnapshots?.forEach(s => {
            if (!historical.has(s.goalId)) {
                historical.set(s.goalId, { 
                    id: s.goalId, 
                    title: s.title, 
                    type: GoalType.QUANTITATIVE,
                    status: s.isCompleted ? 'completed' : 'failed'
                });
            }
        });
    });

    return Array.from(historical.values());
  }, [goals, entries]);

  const filteredGoalsForSelector = useMemo(() => {
    return allHistoricalGoals.filter(g => g.status === statusFilter);
  }, [allHistoricalGoals, statusFilter]);

  const chartData = useMemo(() => {
    const daysWindow = 14;
    const data = [];
    const todayStr = now.toISOString().split('T')[0];

    for (let i = daysWindow - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        const entry = entries.find(e => e.date.startsWith(dateKey));
        
        const dayPoint: any = {
            date: d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }),
            rawDate: dateKey
        };

        if (showMoodCorrelation && entry?.wellness) {
            dayPoint[t('streaks.moodChartLabel')] = entry.wellness.mood * 10;
        }

        if (selectedGoalId === 'all') {
            const snapshotsSource = entry?.goalSnapshots || (dateKey === todayStr ? goals.map(g => ({
                goalId: g.id,
                title: g.title,
                current: g.current,
                target: g.target,
                dailyTarget: g.dailyTarget || 0,
                dailyProgress: g.dailyProgress || 0,
                isCompleted: g.status === 'completed',
                isDailyDone: !!(g.dailyTarget && g.dailyTarget > 0 && (g.dailyProgress || 0) >= g.dailyTarget),
                completedAt: g.completedAt,
            })) : []);
            
            const relevantSnapshots = snapshotsSource.filter(s => {
                if (s.isCompleted && s.completedAt) {
                    return s.completedAt.split('T')[0] >= dateKey;
                }
                return true;
            });

            const activeTargets = relevantSnapshots.filter(s => s.dailyTarget > 0);
            if (activeTargets.length > 0) {
                const avg = activeTargets.reduce((acc, s) => acc + (s.dailyProgress / s.dailyTarget), 0) / activeTargets.length;
                dayPoint[t('streaks.progressChartLabel')] = Math.round(avg * 100);
            } else {
                dayPoint[t('streaks.progressChartLabel')] = entry ? 0 : null;
            }
        } else {
            const snapshot = entry?.goalSnapshots?.find(s => s.goalId === selectedGoalId);
            const activeGoal = goals.find(g => g.id === selectedGoalId);
            const historicalGoal = allHistoricalGoals.find(g => g.id === selectedGoalId);

            const wasCompletedBeforeThisDay = historicalGoal?.status === 'completed' && historicalGoal.completedAt && historicalGoal.completedAt.split('T')[0] < dateKey;

            if (wasCompletedBeforeThisDay) {
              dayPoint[t('streaks.progressChartLabel')] = 100;
            } else if (snapshot) {
                dayPoint[t('streaks.progressChartLabel')] = snapshot.dailyTarget > 0 
                    ? Math.round((snapshot.dailyProgress / snapshot.dailyTarget) * 100)
                    : (snapshot.isCompleted ? 100 : 0);
            } else if (dateKey === todayStr && activeGoal) {
                dayPoint[t('streaks.progressChartLabel')] = activeGoal.dailyTarget && activeGoal.dailyTarget > 0
                    ? Math.round(((activeGoal.dailyProgress || 0) / activeGoal.dailyTarget) * 100)
                    : (activeGoal.status === 'completed' ? 100 : 0);
            } else {
                dayPoint[t('streaks.progressChartLabel')] = null;
            }
        }
        data.push(dayPoint);
    }
    return data;
  }, [selectedGoalId, goals, entries, now, showMoodCorrelation, allHistoricalGoals, t]);

  const markers = useMemo(() => {
    if (selectedGoalId === 'all') return [];
    const goal = allHistoricalGoals.find(g => g.id === selectedGoalId);
    if (!goal) return [];

    const lastDataPoint = [...chartData].reverse().find(d => d[t('streaks.progressChartLabel')] !== null);
    if (!lastDataPoint) return [];

    const result = [];
    if (goal.status === 'completed') {
        result.push({ x: lastDataPoint.date, y: lastDataPoint[t('streaks.progressChartLabel')], type: 'check' });
    } else if (goal.status === 'failed') {
        result.push({ x: lastDataPoint.date, y: lastDataPoint[t('streaks.progressChartLabel')], type: 'fail' });
    }
    return result;
  }, [selectedGoalId, chartData, allHistoricalGoals, t]);

  const calendarDays = useMemo(() => {
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    const todayStr = now.toISOString().split('T')[0];
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const entry = entries.find(e => e.date.startsWith(dateKey));
      let colorClass = 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
      const isToday = dateKey === todayStr;
      if (entry || isToday) {
        colorClass = 'bg-indigo-600 text-white shadow-lg';
      }
      days.push({ day: i, dateKey, hasEntry: !!entry, colorClass });
    }
    return days;
  }, [currentCalDate, entries, now]);

  const changeMonth = (dir: number) => {
    const d = new Date(currentCalDate);
    d.setMonth(d.getMonth() + dir);
    setCurrentCalDate(d);
  };
  
  const handleMouseEnterDay = (day: any, e: React.MouseEvent) => {
    if (!day) return;
    const entry = entries.find(entry => entry.date.startsWith(day.dateKey));
    setTooltip({
      visible: true,
      data: { date: day.dateKey, entry: entry || null },
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const handleMouseLeaveDay = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const marker = markers.find(m => m.x === payload.date);
    if (!marker) return null;

    if (marker.type === 'check') {
        return <g transform={`translate(${cx - 10}, ${cy - 25})`}>
            <circle cx="10" cy="10" r="10" fill="#10b981" />
            <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="2" fill="none" />
        </g>;
    }
    return <g transform={`translate(${cx - 10}, ${cy - 25})`}>
        <circle cx="10" cy="10" r="10" fill="#f43f5e" />
        <path d="M7 7l6 6M13 7l-6 6" stroke="white" strokeWidth="2" fill="none" />
    </g>;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24">
      {tooltip.visible && tooltip.data && (
        <CalendarTooltip
          date={tooltip.data.date}
          entry={tooltip.data.entry}
          position={tooltip.position}
        />
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex items-center gap-4">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-950/30 rounded-3xl flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-xl shadow-orange-100 dark:shadow-none">
            <Flame className="w-8 h-8 fill-orange-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('streaks.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400">{t('streaks.subtitle')}</p>
          </div>
        </div>
        <div className="flex gap-4">
            <div className="flex-1 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 text-center">
                <p className="text-[10px] font-black uppercase text-slate-400">{t('streaks.current')}</p>
                <p className="text-2xl font-bold dark:text-white">{streakStats.current} {t('streaks.days')}</p>
            </div>
            <div className="flex-1 bg-indigo-600 p-4 rounded-3xl text-white text-center shadow-lg shadow-indigo-200 dark:shadow-none">
                <p className="text-[10px] font-black uppercase text-indigo-100">{t('streaks.record')}</p>
                <p className="text-2xl font-bold">{streakStats.longest} {t('streaks.days')}</p>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        
        <div className="flex flex-col lg:flex-row gap-6 mb-8 justify-between items-start">
            <div className="space-y-4 w-full lg:w-auto">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full sm:w-80">
                    <button 
                        onClick={() => setStatusFilter('active')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${statusFilter === 'active' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                    >{t('streaks.statusFilters.active')}</button>
                    <button 
                        onClick={() => setStatusFilter('completed')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${statusFilter === 'completed' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                    >{t('streaks.statusFilters.completed')}</button>
                    <button 
                        onClick={() => setStatusFilter('failed')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${statusFilter === 'failed' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-slate-500'}`}
                    >{t('streaks.statusFilters.failed')}</button>
                </div>

                <div className="relative group w-full">
                    <select 
                        value={selectedGoalId} 
                        onChange={(e) => setSelectedGoalId(e.target.value)}
                        className="w-full appearance-none px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer pr-12"
                    >
                        <option value="all">📊 {t('streaks.goalSelectAll')}</option>
                        {filteredGoalsForSelector.map(g => (
                            <option key={g.id} value={g.id}>🎯 {g.title}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none transition-transform group-hover:translate-y-[-40%]" />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                    <span className="text-xs font-black uppercase text-slate-400 group-hover:text-indigo-500 transition-colors tracking-widest">{t('streaks.moodCorrelation')}</span>
                    <div 
                        onClick={() => setShowMoodCorrelation(!showMoodCorrelation)}
                        className={`w-12 h-6 rounded-full transition-all relative ${showMoodCorrelation ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showMoodCorrelation ? 'left-7' : 'left-1 shadow-sm'}`} />
                    </div>
                </label>
            </div>
        </div>

        <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                    <defs>
                        <linearGradient id="colorProg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e130" />
                    <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} 
                        dy={10} 
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} 
                        domain={[0, 110]} 
                    />
                    <Tooltip 
                        contentStyle={{ borderRadius: '24px', border: 'none', backgroundColor: '#1e293b', color: '#fff', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }} 
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }}
                    />
                    
                    {showMoodCorrelation && (
                        <Area 
                            type="monotone" 
                            dataKey={t('streaks.moodChartLabel')}
                            stroke="#f59e0b" 
                            strokeWidth={2} 
                            strokeDasharray="5 5"
                            fill="url(#colorMood)" 
                            name={t('streaks.moodChartLabel')}
                        />
                    )}

                    <Area 
                        type="monotone" 
                        dataKey={t('streaks.progressChartLabel')}
                        stroke="#6366f1" 
                        strokeWidth={4} 
                        fill="url(#colorProg)" 
                        name={t('streaks.progressChartLabel')}
                        dot={<CustomDot />}
                        activeDot={{ r: 8, fill: '#6366f1', stroke: '#fff', strokeWidth: 3 }}
                        connectNulls
                    />
                    
                    <ReferenceLine y={100} stroke="#cbd5e1" strokeDasharray="3 3" />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold dark:text-white flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-indigo-500" />
                    {t('streaks.activityLog')}
                </h2>
                <div className="flex gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="px-2 py-2 text-[10px] font-black uppercase tracking-widest dark:text-white min-w-[120px] text-center">
                        {currentCalDate.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all"><ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>
            
            <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">
                {t('streaks.daysOfWeek').split(',').map(d => <div key={d}>{d}</div>)}
            </div>
            
            <div className="grid grid-cols-7 gap-3">
                {calendarDays.map((d, i) => (
                    !d ? <div key={i} /> : (
                        <button 
                            key={i} 
                            onClick={() => setSelectedDay(d.dateKey)}
                            onMouseEnter={(e) => handleMouseEnterDay(d, e)}
                            onMouseLeave={handleMouseLeaveDay}
                            className={`aspect-square rounded-2xl flex items-center justify-center text-sm font-bold transition-all relative ${d.dateKey === selectedDay ? 'ring-4 ring-indigo-500/20 scale-110 z-10' : ''} ${d.colorClass} hover:scale-105 active:scale-95`}
                        >
                            {d.day}
                            {d.hasEntry && <div className="absolute bottom-2 w-1 h-1 bg-white/60 rounded-full" />}
                        </button>
                    )
                ))}
            </div>
        </div>

        <div className="space-y-6">
            <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden group">
                <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
                    <Activity className="w-6 h-6" />
                    {t('streaks.correlationAnalysis')}
                </h3>
                <p className="text-indigo-100 text-sm leading-relaxed font-medium">
                    {t('streaks.correlationDesc')}
                </p>
                <div className="mt-6 flex gap-4">
                    <div className="px-4 py-2 bg-white/10 rounded-2xl border border-white/20 text-[10px] font-black uppercase tracking-widest">
                        {t('streaks.correlationLabel')}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-900/40">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-3" />
                    <p className="text-[10px] font-black uppercase text-emerald-600/60 tracking-widest">{t('streaks.completedGoals')}</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">
                        {allHistoricalGoals.filter(g => g.status === 'completed').length} {t('streaks.goalsSuffix')}
                    </p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-950/20 p-6 rounded-[32px] border border-rose-100 dark:border-rose-900/40">
                    <XCircle className="w-8 h-8 text-rose-500 mb-3" />
                    <p className="text-[10px] font-black uppercase text-rose-600/60 tracking-widest">{t('streaks.failedGoals')}</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">
                        {allHistoricalGoals.filter(g => g.status === 'failed').length} {t('streaks.goalsSuffix')}
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

interface CalendarTooltipProps {
  date: string;
  entry: JournalEntry | null;
  position: { x: number; y: number };
}

const CalendarTooltip: React.FC<CalendarTooltipProps> = ({ date, entry, position }) => {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    opacity: 0,
    position: 'fixed'
  });

  useEffect(() => {
    if (ref.current) {
      const { innerWidth, innerHeight } = window;
      const { clientWidth, clientHeight } = ref.current;
      
      let top = position.y + 20;
      let left = position.x + 20;

      if (left + clientWidth > innerWidth - 16) {
        left = position.x - clientWidth - 20;
      }
      if (top + clientHeight > innerHeight - 16) {
        top = position.y - clientHeight - 20;
      }
      if (left < 16) left = 16;
      if (top < 16) top = 16;


      setStyle({
        opacity: 1,
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
      });
    }
  }, [position]);

  const snapshots = entry?.goalSnapshots || [];
  
  const relevantSnapshotsForNorms = snapshots.filter(s => {
    if (!s.dailyTarget || s.dailyTarget <= 0) {
      return false;
    }
    if (s.isCompleted && s.completedAt) {
      if (s.completedAt.split('T')[0] < date) {
        return false;
      }
    }
    return true;
  });

  const normsDone = relevantSnapshotsForNorms.filter(s => s.isDailyDone).length;
  const totalNorms = relevantSnapshotsForNorms.length;

  return (
    <div
      ref={ref}
      style={style}
      className="z-[999] p-4 bg-slate-900/90 backdrop-blur-sm text-white rounded-2xl shadow-2xl w-64 animate-in fade-in zoom-in-95 duration-200 border border-slate-700/50"
    >
      <p className="font-bold text-sm mb-2">{new Date(date + 'T12:00:00').toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      {!entry ? (
        <p className="text-xs text-slate-400">{t('streaks.tooltip.noEntry')}</p>
      ) : (
        <>
          <div className="py-2 mb-2 border-y border-slate-700">
            <p className="text-[10px] font-black uppercase text-slate-400">{t('streaks.tooltip.dailyNorms')}</p>
            <p className="font-bold text-lg">{normsDone} / {totalNorms}</p>
          </div>
          <p className="text-[10px] font-black uppercase text-slate-400 mb-2">{t('streaks.tooltip.activeGoals')}</p>
          <ul className="space-y-2 text-xs max-h-40 overflow-y-auto custom-scrollbar">
            {relevantSnapshotsForNorms.length > 0 ? relevantSnapshotsForNorms.map(s => (
              <li key={s.goalId} className="flex items-center justify-between">
                <span className="truncate pr-2 text-slate-300">{s.title}</span>
                <span className={`font-bold flex-shrink-0 ${s.isDailyDone ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {s.dailyProgress}/{s.dailyTarget}
                </span>
              </li>
            )) : <p className="text-slate-400 text-xs italic">{t('streaks.tooltip.noDailyGoals')}</p>}
          </ul>
        </>
      )}
    </div>
  );
};


export default Streaks;
