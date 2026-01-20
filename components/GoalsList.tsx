import React, { useState, useMemo } from 'react';
import { Goal, GoalType, SubTask } from '../types';
import { 
  Plus, Trash2, CheckCircle2, Circle, ChevronDown, ChevronUp, Target, Clock, Layers, X, Star, Zap, CalendarDays, Edit3, Trophy, AlertCircle, RefreshCw, XCircle, Hourglass, Calendar as CalendarIcon, ArrowRight
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface GoalsListProps {
  goals: Goal[];
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  getNow: () => Date;
}

type GoalFilter = 'active' | 'scheduled' | 'completed' | 'failed';

const GoalsList: React.FC<GoalsListProps> = ({ goals, setGoals, getNow }) => {
  const { t, getGoalTypeName } = useLanguage();
  const [activeTab, setActiveTab] = useState<GoalFilter>('active');
  const [isAdding, setIsAdding] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; date?: string; target?: string }>({});

  const getTodayString = () => getNow().toISOString().split('T')[0];
  
  const initialNewGoalState: Partial<Goal> = {
    title: '',
    type: GoalType.QUANTITATIVE,
    startDate: getTodayString(),
    endDate: (() => {
      const tomorrow = new Date(getNow());
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    })(),
    target: 10,
    current: 0,
    dailyTarget: 0,
    dailyProgress: 0,
    subtasks: [],
  };

  const [newGoal, setNewGoal] = useState<Partial<Goal>>(initialNewGoalState);

  const filteredGoals = goals.filter(g => g.status === activeTab);

  const validateGoal = (): boolean => {
    const newErrors: { title?: string; date?: string; target?: string; } = {};

    if (!newGoal.title?.trim()) {
      newErrors.title = t('goals.newGoalModal.nameError');
    }

    if (newGoal.startDate && newGoal.endDate && newGoal.startDate > newGoal.endDate) {
      newErrors.date = t('goals.newGoalModal.dateError');
    }

    if (newGoal.type === GoalType.QUANTITATIVE && (!newGoal.target || newGoal.target <= 0)) {
      newErrors.target = t('goals.newGoalModal.quantitativeError');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const type = e.target.value as GoalType;
      setNewGoal(prev => {
          const base = { ...prev, type };
          switch(type) {
              case GoalType.SCHEDULED:
                  return { ...base, target: 1, dailyTarget: 0, subtasks: [] };
              case GoalType.CHECKLIST:
                  return { ...base, target: prev.subtasks?.length || 0 };
              case GoalType.QUANTITATIVE:
              default:
                  return { ...base, target: 10, subtasks: [] };
          }
      });
  };

  const addGoal = () => {
    if (!validateGoal()) {
        return;
    }

    const now = getNow();
    const todayStr = getTodayString();
    
    const goal: Goal = { 
      ...newGoal,
      id: Date.now().toString(),
      createdAt: now.toISOString(),
      status: newGoal.startDate! > todayStr ? 'scheduled' : 'active',
      subtasks: newGoal.type === GoalType.CHECKLIST ? newGoal.subtasks || [] : [],
      target: newGoal.type === GoalType.CHECKLIST ? (newGoal.subtasks || []).length : newGoal.target || 1,
      current: 0,
      dailyProgress: 0,
    } as Goal;

    setGoals([goal, ...goals]);
    setIsAdding(false);
    setErrors({});
    setNewGoal(initialNewGoalState);
  };

  const updateGoalProgress = (id: string, newVal: number) => {
    const now = getNow();
    setGoals(prev => prev.map(g => {
      if (g.id !== id) return g;
      const clampedVal = Math.max(0, Math.min(newVal, g.target));
      const diff = clampedVal - g.current;
      const updatedDaily = Math.max(0, (g.dailyProgress || 0) + diff);
      const isFinishing = clampedVal >= g.target && g.status !== 'completed';

      return { 
        ...g, 
        current: clampedVal,
        dailyProgress: updatedDaily,
        status: isFinishing ? 'completed' : g.status,
        completedAt: isFinishing ? now.toISOString() : g.completedAt
      };
    }));
  };

  const toggleSubtask = (goalId: string, subtaskId: string) => {
    const now = getNow();
    const todayStr = now.toISOString().split('T')[0];
    setGoals(prev => prev.map(g => {
        if (g.id !== goalId) return g;
        const newSubtasks = g.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed, completedAt: !s.completed ? now.toISOString() : undefined } : s);
        const finishedToday = newSubtasks.filter(s => s.completed && s.completedAt?.startsWith(todayStr)).length;
        const isFinishing = newSubtasks.every(s => s.completed) && g.status !== 'completed';
        
        return { 
          ...g, 
          subtasks: newSubtasks, 
          dailyProgress: finishedToday, 
          status: isFinishing ? 'completed' : g.status,
          completedAt: isFinishing ? now.toISOString() : g.completedAt 
        };
    }));
  };

  const deleteGoal = (id: string) => setGoals(prev => prev.filter(g => g.id !== id));

  const handleGoalAction = (id: string, action: 'extend' | 'fail', extensionDays: number = 0) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== id) return g;
      if (action === 'fail') return { ...g, status: 'failed' };
      const newEndDate = new Date(g.endDate);
      newEndDate.setDate(newEndDate.getDate() + extensionDays);
      return { 
        ...g, 
        endDate: newEndDate.toISOString().split('T')[0],
        status: 'active',
        extensionCount: (g.extensionCount || 0) + 1
      };
    }));
  };

  const tabs: { key: GoalFilter, label: string }[] = [
    { key: 'active', label: t('goals.tabs.active') },
    { key: 'scheduled', label: t('goals.tabs.scheduled') },
    { key: 'completed', label: t('goals.tabs.completed') },
    { key: 'failed', label: t('goals.tabs.failed') },
  ];

  const closeModal = () => {
    setIsAdding(false);
    setErrors({});
    setNewGoal(initialNewGoalState);
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('goals.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400">{t('goals.subtitle')}</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"><Plus className="w-5 h-5" />{t('goals.createGoal')}</button>
      </div>

      <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto no-scrollbar shadow-sm">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.key ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{tab.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredGoals.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <Target className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold dark:text-slate-300">{t('goals.noGoals')} "{tabs.find(t => t.key === activeTab)?.label}"</h3>
            <p className="text-slate-400 mt-2">{t('goals.challengeYourself')}</p>
          </div>
        ) : (
          filteredGoals.map(goal => <GoalCard key={goal.id} goal={goal} onUpdate={updateGoalProgress} onToggleSubtask={toggleSubtask} onDelete={deleteGoal} onAction={handleGoalAction} getNow={getNow} />)
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-300 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('goals.newGoalModal.title')}</h2>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="text-slate-400" /></button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('goals.newGoalModal.nameLabel')}</label>
                <input type="text" value={newGoal.title} onChange={(e) => { setNewGoal({...newGoal, title: e.target.value}); if(errors.title) setErrors(p => ({...p, title: undefined})); }} placeholder={t('goals.newGoalModal.namePlaceholder')} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                {errors.title && <p className="text-rose-500 text-xs mt-2 font-semibold">{errors.title}</p>}
              </div>
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('goals.newGoalModal.startDate')}</label>
                      <input type="date" value={newGoal.startDate} min={getTodayString()} onChange={(e) => { setNewGoal({...newGoal, startDate: e.target.value}); if(errors.date) setErrors(p => ({...p, date: undefined})); }} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('goals.newGoalModal.endDate')}</label>
                      <input type="date" value={newGoal.endDate} min={newGoal.startDate} onChange={(e) => { setNewGoal({...newGoal, endDate: e.target.value}); if(errors.date) setErrors(p => ({...p, date: undefined})); }} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                {errors.date && <p className="text-rose-500 text-xs mt-2 font-semibold text-center">{errors.date}</p>}
              </div>
              <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('goals.newGoalModal.type')}</label>
                  <select value={newGoal.type} onChange={handleTypeChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                    {Object.values(GoalType).map(typeKey => <option key={typeKey} value={typeKey}>{getGoalTypeName(typeKey)}</option>)}
                  </select>
              </div>
              <div className="space-y-4">
                {newGoal.type === GoalType.QUANTITATIVE && (
                  <div className="animate-in fade-in duration-300">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('goals.newGoalModal.quantitativeTarget')}</label>
                    <input type="number" min="1" value={newGoal.target} onChange={(e) => { setNewGoal({...newGoal, target: Math.max(1, Number(e.target.value))}); if(errors.target) setErrors(p => ({...p, target: undefined})); }} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                    {errors.target && <p className="text-rose-500 text-xs mt-2 font-semibold">{errors.target}</p>}
                  </div>
                )}
                {newGoal.type !== GoalType.SCHEDULED && (
                    <div className="animate-in fade-in duration-300"><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('goals.newGoalModal.dailyNorm')} {newGoal.type === GoalType.CHECKLIST && t('goals.newGoalModal.dailyNormChecklist')}</label><input type="number" min="0" value={newGoal.dailyTarget} onChange={(e) => setNewGoal({...newGoal, dailyTarget: Math.max(0, Number(e.target.value))})} placeholder={newGoal.type === GoalType.QUANTITATIVE ? t('goals.newGoalModal.dailyNormQuantitativePlaceholder') : t('goals.newGoalModal.dailyNormChecklistPlaceholder')} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                )}
              </div>
              {newGoal.type === GoalType.CHECKLIST && (
                <div className="animate-in fade-in duration-300"><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('goals.newGoalModal.addSteps')}</label><input type="text" placeholder={t('goals.newGoalModal.addStepsPlaceholder')} onKeyDown={(e) => { if (e.key === 'Enter') { const val = (e.target as HTMLInputElement).value; if (val) { setNewGoal({ ...newGoal, subtasks: [...(newGoal.subtasks || []), { id: Date.now().toString(), title: val, completed: false }] }); (e.target as HTMLInputElement).value = ''; } } }} className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" /><div className="flex flex-wrap gap-2 mt-3">{newGoal.subtasks?.map(s => <span key={s.id} className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100 dark:border-indigo-800">{s.title}</span>)}</div></div>
              )}
              <button onClick={addGoal} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-xl hover:bg-indigo-700 transition-all active:scale-95">{t('goals.newGoalModal.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const GoalCard: React.FC<{ goal: Goal, onUpdate: any, onToggleSubtask: any, onDelete: any, onAction: any, getNow: () => Date }> = ({ goal, onUpdate, onToggleSubtask, onDelete, onAction, getNow }) => {
    const { t, getGoalTypeName } = useLanguage();
    const [isExpanded, setIsExpanded] = useState(false);
    const [manualValue, setManualValue] = useState(goal.current.toString());
    const [isExtending, setIsExtending] = useState(false);
    const [extensionDays, setExtensionDays] = useState(1);
    
    const isCompleted = goal.status === 'completed';
    const isFrozen = goal.status === 'active' && getNow().toISOString().split('T')[0] > goal.endDate;
    
    const totalProgress = useMemo(() => {
        switch(goal.type) {
            case GoalType.QUANTITATIVE:
                return goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
            case GoalType.CHECKLIST:
                return goal.subtasks.length > 0 ? (goal.subtasks.filter(s => s.completed).length / goal.subtasks.length) * 100 : (goal.status === 'completed' ? 100 : 0);
            case GoalType.SCHEDULED:
                return goal.current >= goal.target ? 100 : 0;
            default:
                return 0;
        }
    }, [goal]);

    const dailyProgressPercent = (goal.dailyTarget || 0) > 0 ? Math.min(100, ((goal.dailyProgress || 0) / goal.dailyTarget!) * 100) : 0;
    const isDailyDone = (goal.dailyTarget || 0) > 0 && (goal.dailyProgress || 0) >= goal.dailyTarget!;

    const timeInfo = useMemo(() => {
        const now = getNow();
        const start = new Date(goal.startDate).getTime();
        const end = new Date(goal.endDate + "T23:59:59").getTime();
        if (start > end) return { percent: 100, label: t('goals.goalCard.timeInvalid'), isCritical: true };
        const total = end - start;
        const nowMs = now.getTime();
        if (total <= 0) return { percent: 100, label: t('goals.goalCard.timeUp') };
        const elapsed = nowMs - start;
        const percent = Math.min(100, Math.max(0, (elapsed / total) * 100));
        const remainingMs = end - nowMs;
        if (nowMs < start) return { percent: 0, label: t('goals.goalCard.timeStartsIn').replace('{days}', String(Math.ceil((start - nowMs) / (1000 * 60 * 60 * 24)))) };
        const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
        let label = remainingDays > 0 ? t('goals.goalCard.timeDaysLeft').replace('{days}', String(remainingDays)) : (remainingMs > 0 ? t('goals.goalCard.timeLastDay') : t('goals.goalCard.timeUp'));
        return { percent, label, isCritical: remainingDays <= 1 && remainingMs > 0 && !isCompleted };
    }, [goal.startDate, goal.endDate, getNow, isCompleted, t]);

    const handleManualChange = (val: string) => {
      if (isFrozen || goal.status !== 'active') return;
      setManualValue(val);
      const num = Number(val);
      if (!isNaN(num)) onUpdate(goal.id, Math.max(0, num));
    };
    
    const statusConfig = {
      active: { color: 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500', icon: <Target className="w-6 h-6"/>, cardBg: '' },
      scheduled: { color: 'bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400', icon: <CalendarIcon className="w-6 h-6"/>, cardBg: 'bg-blue-50/10 dark:bg-blue-900/5 border-blue-500/10' },
      completed: { color: 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 scale-110 shadow-[0_0_12px_rgba(16,185,129,0.2)]', icon: <Trophy className="w-6 h-6"/>, cardBg: 'bg-emerald-50/20 dark:bg-emerald-900/10 shadow-emerald-100/50 border-emerald-500/30' },
      failed: { color: 'bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400', icon: <XCircle className="w-6 h-6"/>, cardBg: 'bg-rose-50/20 dark:bg-rose-950/20 border-rose-500/30 grayscale' },
    };
    const currentStatus = statusConfig[goal.status];

    return (
        <div className={`relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all hover:shadow-md ${currentStatus.cardBg}`}>
            {isFrozen && goal.status === 'active' && <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300"><AlertCircle className="w-10 h-10 text-amber-500 mb-4" /><h4 className="text-white font-bold text-lg mb-2">{t('goals.goalCard.frozenTitle')}</h4><p className="text-slate-300 text-sm mb-6 max-w-xs">{t('goals.goalCard.frozenSubtitle')}</p>{isExtending ? <div className="w-full max-w-xs space-y-4 animate-in zoom-in duration-200"><div className="bg-white/10 p-4 rounded-2xl border border-white/20"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('goals.goalCard.extendPrompt')}</label><div className="flex items-center gap-4"><input type="number" min="1" max="365" value={extensionDays} onChange={(e) => setExtensionDays(Math.max(1, Number(e.target.value)))} className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500" /><button onClick={() => onAction(goal.id, 'extend', extensionDays)} className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl font-bold transition-all active:scale-95">{t('goals.goalCard.ok')}</button></div></div><button onClick={() => setIsExtending(false)} className="text-slate-400 text-xs font-bold hover:text-white transition-colors">{t('goals.goalCard.cancel')}</button></div> : <div className="flex flex-col gap-3 w-full max-w-xs"><button onClick={() => setIsExtending(true)} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"><RefreshCw className="w-4 h-4" /> {t('goals.goalCard.extendButton')}</button><button onClick={() => onAction(goal.id, 'fail')} className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"><XCircle className="w-4 h-4" /> {t('goals.goalCard.failButton')}</button></div>}</div>}
            <div className="p-6">
                <div className="flex items-start justify-between mb-5"><div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${currentStatus.color}`}>{currentStatus.icon}</div><div><h3 className={`font-bold text-lg leading-tight transition-all ${isCompleted ? 'text-slate-400 dark:text-slate-600' : goal.status === 'failed' ? 'text-rose-600 dark:text-rose-400 line-through' : 'text-slate-900 dark:text-white'}`}>{goal.title}</h3><div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest"><span className="flex items-center gap-1.5 bg-slate-100/50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-800/50"><CalendarIcon className="w-2.5 h-2.5" />{new Date(goal.startDate).toLocaleDateString('uk-UA', {day:'2-digit', month:'2-digit'})} <ArrowRight className="w-2 h-2" /> {new Date(goal.endDate).toLocaleDateString('uk-UA', {day:'2-digit', month:'2-digit'})}</span><span className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-800/50"><Layers className="w-2.5 h-2.5" />{getGoalTypeName(goal.type)}</span>{goal.extensionCount && goal.extensionCount > 0 && <span className="flex items-center gap-1 bg-amber-100/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md border border-amber-200/30"><RefreshCw className="w-2 h-2" /> +{goal.extensionCount}</span>}</div></div></div><div className="flex items-center gap-2">{isDailyDone && !isCompleted && goal.status === 'active' && <div className="flex items-center gap-1 text-[10px] font-black uppercase text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded-lg border border-amber-100 dark:border-amber-900/50 animate-pulse"><Star className="w-3 h-3 fill-amber-500" /> {t('goals.goalCard.norm')}</div>}<button onClick={() => onDelete(goal.id)} className="p-2 text-slate-300 dark:text-slate-700 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button></div></div>
                <div className="space-y-4">
                  {timeInfo && goal.status !== 'completed' && goal.status !== 'failed' && <div className="animate-in fade-in slide-in-from-top-1 duration-500"><div className="flex justify-between items-center mb-1.5 px-1"><span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-wider flex items-center gap-1"><Hourglass className={`w-2.5 h-2.5 ${timeInfo.isCritical ? 'text-amber-500 animate-pulse' : ''}`} /> {t('goals.goalCard.time')}</span><span className={`text-[10px] font-black ${timeInfo.isCritical ? 'text-amber-500' : 'text-slate-400 dark:text-slate-600'}`}>{timeInfo.label}</span></div><div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${timeInfo.isCritical ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.2)]' : 'bg-slate-300 dark:bg-slate-700'}`} style={{ width: `${Math.min(100, timeInfo.percent)}%` }} /></div></div>}
                  {goal.type !== GoalType.SCHEDULED && <div><div className="flex justify-between items-center mb-1.5 px-1"><span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-wider">{t('goals.goalCard.totalProgress')}</span><span className="text-xs font-black text-slate-600 dark:text-slate-400">{Math.round(totalProgress)}%</span></div><div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-800/50"><div className={`h-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : goal.status === 'failed' ? 'bg-rose-500' : 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.3)]'}`} style={{ width: `${Math.min(100, Math.max(1, totalProgress))}%` }} /></div></div>}
                  {(goal.dailyTarget || 0) > 0 && !isCompleted && goal.status === 'active' && <div className="bg-white dark:bg-slate-800/40 p-3 rounded-2xl border border-amber-100 dark:border-amber-950/30 shadow-sm"><div className="flex justify-between items-center mb-1.5"><span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500" /> {t('goals.goalCard.dailyProgress')}</span><span className="text-xs font-black text-amber-600 dark:text-amber-400 tracking-tighter">{goal.dailyProgress || 0} / {goal.dailyTarget}</span></div><div className="h-1.5 w-full bg-amber-50 dark:bg-amber-950/20 rounded-full overflow-hidden border border-amber-100 dark:border-amber-950/30"><div className={`h-full transition-all duration-700 ${isDailyDone ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.3)]' : 'bg-amber-300'}`} style={{ width: `${Math.max(2, dailyProgressPercent)}%` }} /></div></div>}
                </div>
                {goal.status === 'active' && <div className="mt-5">{goal.type === GoalType.QUANTITATIVE ? <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-800"><div className="flex items-center gap-3"><input type="range" min="0" max={goal.target} value={goal.current} disabled={isFrozen} onChange={(e) => handleManualChange(e.target.value)} className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50" /><div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-lg shadow-sm min-w-[85px] justify-center"><Edit3 className="w-3 h-3 text-slate-300 dark:text-slate-600" /><input type="number" min="0" value={manualValue} disabled={isFrozen} onChange={(e) => handleManualChange(e.target.value)} className="font-bold text-xs text-indigo-600 dark:text-indigo-400 w-10 outline-none bg-transparent text-right disabled:opacity-50" /><span className="text-[10px] text-slate-400 dark:text-slate-600 font-bold">/&nbsp;{goal.target}</span></div></div></div> : goal.type === GoalType.CHECKLIST ? <button onClick={() => setIsExpanded(!isExpanded)} className={`w-full flex items-center justify-between text-xs font-black uppercase tracking-widest bg-indigo-50/50 dark:bg-indigo-950/20 px-4 py-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors shadow-sm text-indigo-600 dark:text-indigo-400`}><span className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" /> {t('goals.goalCard.steps').replace('{completed}', String(goal.subtasks.filter(s => s.completed).length)).replace('{total}', String(goal.subtasks.length))}</span>{isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</button> : goal.type === GoalType.SCHEDULED ? <button onClick={() => onUpdate(goal.id, goal.target)} disabled={isFrozen} className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"><CheckCircle2 className="w-4 h-4" />{t('goals.goalCard.markDone')}</button> : null}</div>}
            </div>
            {isExpanded && goal.type === GoalType.CHECKLIST && <div className="px-6 pb-6 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800 pt-4 animate-in slide-in-from-top duration-300">{goal.subtasks.map(s => <button key={s.id} onClick={() => { if (!isFrozen && goal.status === 'active') onToggleSubtask(goal.id, s.id); }} disabled={isFrozen || goal.status !== 'active'} className="w-full flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 mb-2 text-left hover:border-indigo-300 dark:hover:border-indigo-500 transition-all shadow-sm disabled:opacity-50">{s.completed ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-300 dark:text-slate-700" />}<span className={`text-sm font-medium ${s.completed ? 'text-slate-400 dark:text-slate-600 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{s.title}</span></button>)}</div>}
        </div>
    );
};

export default GoalsList;