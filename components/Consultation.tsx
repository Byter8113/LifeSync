import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Goal, JournalEntry, ChatSession, Message } from '../types';
import { Send, Sparkles, User, Bot, Loader2, Plus, Trash2, MessageSquare, Menu, ChevronLeft, X, Cpu, Brain } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { useLanguage } from '../contexts/LanguageContext';

interface ConsultationProps {
  goals: Goal[];
  entries: JournalEntry[];
  chatSessions: ChatSession[];
  setChatSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  getNow: () => Date;
  preferredModel: string;
  apiKey: string;
}

const Consultation: React.FC<ConsultationProps> = ({ 
  goals, 
  entries, 
  chatSessions, 
  setChatSessions, 
  activeChatId, 
  setActiveChatId,
  getNow,
  preferredModel,
  apiKey
}) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [coachModel, setCoachModel] = useState<'gemini-3-flash-preview' | 'gemini-3-pro-preview'>('gemini-3-flash-preview');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { language, t, getGeminiSystemPrompt } = useLanguage();

  const activeSession = useMemo(() => {
    return chatSessions.find(s => s.id === activeChatId) || null;
  }, [chatSessions, activeChatId]);

  const messages = useMemo(() => {
    if (activeSession) return activeSession.messages;
    return [{ role: 'bot', text: t('consultation.initialBotMessage') } as Message];
  }, [activeSession, t]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const createNewChat = () => {
    const now = getNow();
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: `${t('consultation.defaultTitle')} ${now.toLocaleDateString('uk-UA')}`,
      messages: [{ role: 'bot', text: t('consultation.initialBotMessageNew') }],
      updatedAt: now.toISOString()
    };
    setChatSessions(prev => [newSession, ...prev]);
    setActiveChatId(newSession.id);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const deleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatSessions(prev => prev.filter(s => s.id !== id));
    if (activeChatId === id) setActiveChatId(null);
  };

  const updateSessionMessages = (sessionId: string, newMessages: Message[]) => {
    setChatSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? { ...s, messages: newMessages, updatedAt: getNow().toISOString() } 
        : s
    ));
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    let sessionId = activeChatId;
    let currentMessages = [...messages];

    if (!sessionId) {
      const now = getNow();
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: input.trim().substring(0, 30) + (input.trim().length > 30 ? '...' : ''),
        messages: [],
        updatedAt: now.toISOString()
      };
      setChatSessions(prev => [newSession, ...prev]);
      setActiveChatId(newSession.id);
      sessionId = newSession.id;
      currentMessages = [];
    }

    const userMessage = input.trim();
    setInput('');
    const updatedMessages: Message[] = [...currentMessages, { role: 'user', text: userMessage } as Message];
    
    updateSessionMessages(sessionId, updatedMessages);
    setIsTyping(true);

    try {
      const finalApiKey = apiKey || process.env.API_KEY;
      if (!finalApiKey) {
        throw new Error("API_KEY_MISSING");
      }
      const ai = new GoogleGenAI({ apiKey: finalApiKey });
      
      const goalsContext = goals.map(g => `- ${g.title}: ${g.current}/${g.target} (статус: ${g.status})`).join('\n');
      const recentEntries = entries.slice(0, 5).map(e => {
        const wellnessStr = e.wellness ? `(${t('dashboard.statMood')}: ${e.wellness.mood}/10)` : `(${t('journal.note')})`;
        return `- ${new Date(e.date).toLocaleDateString()}: ${e.content.substring(0, 100)}... ${wellnessStr}`;
      }).join('\n');
      
      const systemPrompt = getGeminiSystemPrompt(language, goalsContext, recentEntries);

      const response = await ai.models.generateContent({
        model: coachModel,
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt,
        }
      });
      
      const botResponse = response.text || t('consultation.error');
      updateSessionMessages(sessionId, [...updatedMessages, { role: 'bot', text: botResponse } as Message]);

      if (updatedMessages.length === 1 && activeSession && activeSession.title.startsWith(t('consultation.defaultTitle'))) {
        setChatSessions(prev => prev.map(s => 
          s.id === sessionId 
            ? { ...s, title: userMessage.substring(0, 30) + (userMessage.length > 30 ? '...' : '') } 
            : s
        ));
      }

    } catch (error: any) {
      console.error('Chat error:', error);
      let errorMsg = t('consultation.error');
      if (error.message === "API_KEY_MISSING" || (error.message && error.message.includes('API key'))) {
        errorMsg = t('consultation.errorApiKey');
      }
      updateSessionMessages(sessionId, [...updatedMessages, { role: 'bot', text: errorMsg } as Message]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-10rem)] flex bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden transition-colors relative">
      
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 lg:w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 transform flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 bg-indigo-600 dark:bg-indigo-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-white/10 rounded-lg lg:hidden"><X className="w-5 h-5" /></button>
            <h3 className="font-bold text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4" />{t('consultation.chatHistory')}</h3>
          </div>
          <button onClick={createNewChat} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors" title={t('consultation.newChat')}><Plus className="w-5 h-5" /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {chatSessions.length === 0 ? (
            <div className="p-8 text-center"><p className="text-xs text-slate-400 font-medium italic">{t('consultation.empty')}</p></div>
          ) : (
            chatSessions.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map(session => (
              <div key={session.id} onClick={() => { setActiveChatId(session.id); if (window.innerWidth < 1024) setSidebarOpen(false); }} className={`group p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-2 border ${activeChatId === session.id ? 'bg-indigo-600 text-white border-indigo-500 shadow-md scale-[1.02]' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-900'}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{session.title}</p>
                  <p className={`text-[9px] mt-0.5 font-medium ${activeChatId === session.id ? 'text-indigo-100' : 'text-slate-400'}`}>{new Date(session.updatedAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}</p>
                </div>
                <button onClick={(e) => deleteChat(session.id, e)} className={`p-1.5 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all ${activeChatId === session.id ? 'text-white/70' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`}><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-[#020617]/50 relative">
        <header className="bg-white dark:bg-[#0f172a] p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm z-10 sticky top-0 transition-colors">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"><Menu className="w-5 h-5" /></button>
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center border border-indigo-200 dark:border-indigo-800 flex-shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate max-w-[150px] md:max-w-md dark:text-white">{activeSession ? activeSession.title : t('consultation.coachTitle')}</h2>
              <div className="flex items-center gap-1.5 mt-0.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div><p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{t('consultation.online')}</p></div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
            <button 
              onClick={() => setCoachModel('gemini-3-flash-preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${coachModel === 'gemini-3-flash-preview' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
              <Sparkles className="w-3 h-3"/> {t('consultation.flash')}
            </button>
             <button 
              onClick={() => setCoachModel('gemini-3-pro-preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${coachModel === 'gemini-3-pro-preview' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm' : 'text-slate-400'}`}
            >
              <Brain className="w-3 h-3"/> {t('consultation.pro')}
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
              <div className={`flex gap-3 max-w-[90%] md:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4 md:w-5 md:h-5" /> : <Bot className="w-4 h-4 md:w-5 md:h-5" />}
                </div>
                <div className={`p-3 md:p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-tl-none'}`}>
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          {isTyping && <div className="flex justify-start animate-in fade-in duration-300"><div className="flex gap-3 items-center bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm"><Loader2 className="w-4 h-4 animate-spin text-indigo-600" /><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('consultation.typing')}</span></div></div>}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 md:p-6 bg-white dark:bg-[#0f172a] border-t border-slate-100 dark:border-slate-800">
          <div className="relative max-w-4xl mx-auto">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={t('consultation.placeholder')} className="w-full pl-6 pr-14 py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-700 dark:text-white shadow-inner" />
            <button onClick={handleSend} disabled={!input.trim() || isTyping} className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl transition-all shadow-md ${!input.trim() || isTyping ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}`}><Send className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Consultation;
