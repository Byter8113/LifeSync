
import React, { useState, useEffect, useMemo } from 'react';
import { Goal, JournalEntry, GoalType } from '../types';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, LabelList } from 'recharts';
import { Brain, RefreshCw, LayoutGrid, LineChart as LineChartIcon, CheckCircle2, PlayCircle, Target, Cpu, Sparkles } from 'lucide-react';
import { getAIAnalytics } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

interface AnalyticsProps {
  goals: Goal[];
  entries: JournalEntry[];
  getNow: () => Date;
  preferredModel: string;
  apiKey: string;
}

interface AICorrelation {
  title: string;
  val: string;
  desc: string;
  color: string;
}

interface AIResponse {
  insight: string;
  correlations: AICorrelation[];
}

const Analytics: React.FC<AnalyticsProps> = ({ goals, entries, getNow, preferredModel, apiKey }) => {
  const { t, language } = useLanguage();
  const [aiData, setAiData] = useState<AIResponse | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isDeepAnalysis, setIsDeepAnalysis] = useState(false);
  const [chartMode, setChartMode] = useState<'combined' | 'individual'>('combined');
  const [goalMomentumStatus, setGoalMomentumStatus] = useState<'active' | 'completed'>('active');

  const fetchAIInsights = async (deep = false) => {
    setIsLoadingAi(true);
    setIsDeepAnalysis(deep);
    const result = await getAIAnalytics(goals, entries, preferredModel, deep, language, apiKey);
    if (result) {
      result.insight = result.insight.replace(/\*\*/g, '');
      result.correlations = result.correlations.map((c: any) => ({
        ...c,
        desc: c.desc.replace(/\*\*/g, '')
      }));
      setAiData(result);
    }
    setIsLoadingAi(false);
  };

  useEffect(() => {
    fetchAIInsights();
  }, [goals.length, entries.length, preferredModel, language, apiKey]);

  const dailyChartData = useMemo(() => {
    const days = 10;
    const result = [];
    const baseNow = getNow();
    
    const wellnessEntries = entries.filter(e => !!e.wellness);

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(baseNow);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayEntries = wellnessEntries.filter(e => e.date.startsWith(dateStr));
      
      if (dayEntries.length === 0) {
        result.push({
          date: d.toLocaleDateString('uk-UA', { month: 'short', day: 'numeric' }),
          [t('analytics.mood')]: null,
          [t('analytics.energy')]: null,
          [t('analytics.sleep')]: null,
          [t('analytics.focus')]: null,
          [t('analytics.stress')]: null,
        });
      } else {
        const avg = (key: 'mood' | 'energy' | 'sleep' | 'concentration' | 'stress') => 
          dayEntries.reduce((acc, e) => acc + (e.wellness ? e.wellness[key] : 0), 0) / dayEntries.length;
        
        result.push({
          date: d.toLocaleDateString('uk-UA', { month: 'short', day: 'numeric' }),
          [t('analytics.mood')]: avg('mood'),
          [t('analytics.energy')]: avg('energy'),
          [t('analytics.sleep')]: avg('sleep'),
          [t('analytics.focus')]: avg('concentration'),
          [t('analytics.stress')]: avg('stress'),
        });
      }
    }
    return result;
  }, [entries, getNow, t]);

  const goalSummary = useMemo(() => {
    const filtered = goals.filter(g => {
        return goalMomentumStatus === 'completed' ? g.status === 'completed' : g.status === 'active';
    });

    return filtered.map(g => {
      const progress = g.type === GoalType.QUANTITATIVE 
          ? (g.target > 0 ? Math.round((g.current / g.target) * 100) : 0)
          : (g.subtasks.length > 0 ? Math.round((g.subtasks.filter(s => s.completed).length / g.subtasks.length) * 100) : 0);
      return { 
        name: g.title.length > 15 ? g.title.substring(0, 12) + '...' : g.title, 
        progress: Math.min(100, progress), 
        rawProgress: progress,
        fullProgressLabel: `${g.type === GoalType.QUANTITATIVE ? `${g.current}/${g.target}` : `${progress}%`}`
      };
    });
  }, [goals, goalMomentumStatus]);

  const cleanInsight = aiData?.insight || t('analytics.defaultInsight');
  
  const currentModelForDisplay = isDeepAnalysis ? 'Gemini 3 Pro (Deep)' : (preferredModel.includes('pro') ? 'Gemini 3 Pro' : 'Gemini 3 Flash');


  const renderChart = (dataKey: string, color: string, title?: string) => (
    <div className={`h-64 ${title ? 'mt-4' : ''}`} key={dataKey}>
      {title && <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase mb-2 tracking-widest">{title}</h4>}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dailyChartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e120" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} domain={[0, 10]} />
          <Tooltip 
            contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#f1f5f9'}} 
            itemStyle={{color: '#f1f5f9'}}
          />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} fillOpacity={0.1} fill={color} connectNulls />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('analytics.title')}</h1>

      <section className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-3xl shadow-2xl relative overflow-hidden text-white border border-indigo-500/30">
        <div className="relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20">
                    <Brain className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold">{t('analytics.geminiTitle')}</h2>
                </div>
                <div className="sm:ml-auto flex items-center gap-2 w-full sm:w-auto">
                    <button onClick={() => fetchAIInsights(false)} disabled={isLoadingAi && !isDeepAnalysis} className="flex-1 sm:flex-none p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-xs font-bold"><Sparkles className={`w-4 h-4 ${isLoadingAi && !isDeepAnalysis ? 'animate-spin' : ''}`} /> {t('analytics.quick')}</button>
                    <button onClick={() => fetchAIInsights(true)} disabled={isLoadingAi && isDeepAnalysis} className="flex-1 sm:flex-none p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-xs font-bold"><Brain className={`w-4 h-4 ${isLoadingAi && isDeepAnalysis ? 'animate-spin' : ''}`} /> {t('analytics.deep')}</button>
                </div>
            </div>

            <div className="min-h-[100px]">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase bg-white/10 px-2 py-1 rounded-md border border-white/10 mb-3 w-fit tracking-widest"><Cpu className="w-3 h-3" />{currentModelForDisplay}</div>
                {isLoadingAi ? <div className="animate-pulse space-y-4 w-full"><div className="h-3 bg-white/20 rounded w-3/4"></div><div className="h-3 bg-white/20 rounded w-1/2"></div><div className="h-3 bg-white/20 rounded w-2/3"></div></div> : 
                <p className="text-lg leading-relaxed text-indigo-50 font-medium whitespace-pre-wrap">{cleanInsight}</p>}
            </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold dark:text-slate-100">{t('analytics.wellnessTrends')}</h3>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg gap-1">
                <button 
                  onClick={() => setChartMode('combined')}
                  className={`p-1.5 rounded-md transition-all ${chartMode === 'combined' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
                  title={t('analytics.combined')}
                >
                  <LineChartIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setChartMode('individual')}
                  className={`p-1.5 rounded-md transition-all ${chartMode === 'individual' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
                  title={t('analytics.individual')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 text-[10px] font-black mb-6 uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-indigo-500"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div> {t('analytics.mood')}</span>
                <span className="flex items-center gap-1.5 text-amber-500"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> {t('analytics.energy')}</span>
                <span className="flex items-center gap-1.5 text-blue-500"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> {t('analytics.sleep')}</span>
                <span className="flex items-center gap-1.5 text-emerald-500"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> {t('analytics.focus')}</span>
                <span className="flex items-center gap-1.5 text-rose-500"><div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div> {t('analytics.stress')}</span>
            </div>

            {chartMode === 'combined' ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e120" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} domain={[0, 10]} />
                        <Tooltip 
                            contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#f1f5f9'}} 
                            itemStyle={{color: '#f1f5f9'}}
                        />
                        <Area type="monotone" dataKey={t('analytics.mood')} stroke="#6366f1" strokeWidth={3} fillOpacity={0.1} fill="#6366f1" connectNulls />
                        <Area type="monotone" dataKey={t('analytics.energy')} stroke="#f59e0b" strokeWidth={2} fill="none" connectNulls />
                        <Area type="monotone" dataKey={t('analytics.sleep')} stroke="#3b82f6" strokeWidth={2} fill="none" connectNulls />
                        <Area type="monotone" dataKey={t('analytics.focus')} stroke="#10b981" strokeWidth={2} fill="none" connectNulls />
                        <Area type="monotone" dataKey={t('analytics.stress')} stroke="#f43f5e" strokeWidth={2} fill="none" connectNulls />
                    </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="space-y-6 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                {renderChart(t('analytics.mood'), '#6366f1', t('analytics.mood'))}
                {renderChart(t('analytics.energy'), '#f59e0b', t('analytics.energy'))}
                {renderChart(t('analytics.sleep'), '#3b82f6', t('analytics.sleep'))}
                {renderChart(t('analytics.focus'), '#10b981', t('analytics.focus'))}
                {renderChart(t('analytics.stress'), '#f43f5e', t('analytics.stress'))}
              </div>
            )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-bold dark:text-slate-100">{t('analytics.goalMomentum')}</h3>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button 
                  onClick={() => setGoalMomentumStatus('active')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${goalMomentumStatus === 'active' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
                >
                  <PlayCircle className="w-3.5 h-3.5" /> {t('analytics.inProgress')}
                </button>
                <button 
                  onClick={() => setGoalMomentumStatus('completed')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${goalMomentumStatus === 'completed' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('analytics.completed')}
                </button>
              </div>
            </div>
            
            <div className="h-64">
              {goalSummary.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                    <Target className="w-6 h-6 text-slate-300 dark:text-slate-700" />
                  </div>
                  <p className="text-sm text-slate-400 dark:text-slate-600 font-bold uppercase tracking-tighter">{t('analytics.noGoals')}</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={goalSummary} layout="vertical" margin={{ left: 10, right: 60 }} barGap={-24}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e120" />
                        <XAxis type="number" hide domain={[0, 100]} />
                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} width={100} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#f1f5f9'}} />
                        <Bar dataKey={() => 100} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 4" className="dark:fill-slate-800 dark:stroke-slate-700" radius={[0, 10, 10, 0]} barSize={24} isAnimationActive={false} />
                        <Bar dataKey="progress" radius={[0, 10, 10, 0]} barSize={24}>
                            <LabelList dataKey="fullProgressLabel" position="right" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#6366f1' }} offset={10} />
                            {goalSummary.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.rawProgress >= 100 ? '#10b981' : '#6366f1'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
              )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {aiData && aiData.correlations && aiData.correlations.length > 0 ? (
            aiData.correlations.map((corr, idx) => (
              <CorrelationCard 
                key={idx} 
                title={corr.title} 
                val={corr.val} 
                desc={corr.desc} 
                color={corr.color} 
              />
            ))
          ) : (
            <>
              <CorrelationCard title={t('analytics.correlation.title1')} val={t('analytics.correlation.val1')} desc={t('analytics.correlation.desc1')} color="blue" />
              <CorrelationCard title={t('analytics.correlation.title2')} val={t('analytics.correlation.val2')} desc={t('analytics.correlation.desc2')} color="emerald" />
              <CorrelationCard title={t('analytics.correlation.title3')} val={t('analytics.correlation.val3')} desc={t('analytics.correlation.desc3')} color="purple" />
            </>
          )}
      </div>
    </div>
  );
};

const CorrelationCard = ({ title, val, desc, color }: any) => {
    const { t } = useLanguage();
    const colorClasses: Record<string, string> = { 
      blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30 shadow-blue-100/50', 
      emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30 shadow-emerald-100/50', 
      purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-900/30 shadow-purple-100/50' 
    };
    const activeClass = colorClasses[color] || colorClasses.blue;
    return (
        <div className={`p-6 rounded-3xl border-2 ${activeClass} shadow-lg transition-all hover:-translate-y-1`}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">{title}</p>
            <h4 className="text-xl font-bold mb-2">{val} {t('analytics.correlation.title')}</h4>
            <p className="text-sm font-medium opacity-80 leading-relaxed">{desc}</p>
        </div>
    );
};

export default Analytics;
