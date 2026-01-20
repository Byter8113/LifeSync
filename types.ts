export enum GoalType {
  QUANTITATIVE = 'QUANTITATIVE',
  CHECKLIST = 'CHECKLIST',
  SCHEDULED = 'SCHEDULED'
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string; // ISO string
}

export interface Goal {
  id: string;
  title: string;
  type: GoalType;
  status: 'active' | 'scheduled' | 'completed' | 'failed';
  
  target: number;
  current: number;
  
  dailyTarget?: number;
  dailyProgress?: number;
  
  subtasks: SubTask[];
  
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  
  createdAt: string; // ISO string
  completedAt?: string; // ISO string
  extensionCount?: number;
}

export interface WellnessMetrics {
  mood: number;
  energy: number;
  stress: number;
  sleep: number;
  concentration: number;
}

export interface GoalSnapshot {
  goalId: string;
  title: string;
  current: number;
  target: number;
  dailyProgress: number;
  dailyTarget: number;
  isCompleted: boolean;
  isDailyDone: boolean;
  completedAt?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  tags: string[];
  wellness?: WellnessMetrics; 
  goalSnapshots?: GoalSnapshot[]; // Snapshot of this day
  media: {
    type: 'image' | 'audio' | 'video';
    url: string;
  }[];
}

export interface Message {
  role: 'user' | 'bot';
  text: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
}

export type AppView = 'dashboard' | 'goals' | 'journal' | 'analytics' | 'consultation' | 'settings' | 'streaks';