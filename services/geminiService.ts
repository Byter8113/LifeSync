
import { GoogleGenAI, Type } from "@google/genai";
import { Goal, JournalEntry, GoalType } from "../types";
import { getGeminiAnalyticsPrompt, getGeminiJournalPrompt, Language, translations } from "../i18n";

export const getAIAnalytics = async (goals: Goal[], entries: JournalEntry[], modelName: string = 'gemini-3-flash-preview', useThinkingMode: boolean = false, language: Language, apiKey: string) => {
  const finalApiKey = apiKey || process.env.API_KEY;
  if (!finalApiKey) {
    console.error("Gemini API key is not provided in settings or environment.");
    return {
      insight: translations[language].analytics.apiKeyMissing,
      correlations: []
    };
  }
  const ai = new GoogleGenAI({ apiKey: finalApiKey });

  const wellnessEntries = entries.filter(e => !!e.wellness);
  
  const dataContext = {
    totalGoals: goals.length,
    activeGoals: goals.filter(g => g.status === 'active').map(g => ({
        title: g.title,
        progress: g.current,
        target: g.target,
        dailyProgress: g.dailyProgress,
        dailyTarget: g.dailyTarget,
        startDate: g.startDate,
        endDate: g.endDate,
    })),
    completedGoalsCount: goals.filter(g => g.status === 'completed').length,
    averageWellness: wellnessEntries.length > 0 ? {
        mood: wellnessEntries.reduce((acc, e) => acc + (e.wellness?.mood || 0), 0) / wellnessEntries.length,
        energy: wellnessEntries.reduce((acc, e) => acc + (e.wellness?.energy || 0), 0) / wellnessEntries.length,
        sleep: wellnessEntries.reduce((acc, e) => acc + (e.wellness?.sleep || 0), 0) / wellnessEntries.length,
        concentration: wellnessEntries.reduce((acc, e) => acc + (e.wellness?.concentration || 0), 0) / wellnessEntries.length,
        stress: wellnessEntries.reduce((acc, e) => acc + (e.wellness?.stress || 0), 0) / wellnessEntries.length,
    } : null,
    recentEntries: wellnessEntries.slice(-7).map(e => ({ 
        date: e.date, 
        mood: e.wellness?.mood, 
        concentration: e.wellness?.concentration,
        sleep: e.wellness?.sleep,
        energy: e.wellness?.energy,
        stress: e.wellness?.stress,
        content: e.content.substring(0, 100),
        tags: e.tags
    }))
  };

  const finalModel = useThinkingMode ? 'gemini-3-pro-preview' : modelName;
  const config: any = {
    temperature: 0.7,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        insight: { type: Type.STRING, description: "General analysis and advice for the user." },
        correlations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              val: { type: Type.STRING, description: "Correlation level (e.g., Strong, Positive, Low)" },
              desc: { type: Type.STRING },
              color: { type: Type.STRING, description: "One of: blue, emerald, purple" }
            },
            required: ["title", "val", "desc", "color"]
          }
        }
      },
      required: ["insight", "correlations"]
    }
  };

  if (useThinkingMode) {
    config.thinkingConfig = { thinkingBudget: 32768 };
  }


  try {
    const response = await ai.models.generateContent({
      model: finalModel,
      contents: getGeminiAnalyticsPrompt(language, JSON.stringify(dataContext)),
      config: config
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini analytics failed", error);
    return {
      insight: translations[language].analytics.apiError,
      correlations: []
    };
  }
};

export const generateJournalEntry = async (prompt: string, language: Language, apiKey: string) => {
    const finalApiKey = apiKey || process.env.API_KEY;
    if (!finalApiKey) {
      console.error("Gemini API key is not provided in settings or environment.");
      return translations[language].journal.apiKeyMissing;
    }
    
    const ai = new GoogleGenAI({ apiKey: finalApiKey });
    const { systemInstruction, userPrompt, errorMessage } = getGeminiJournalPrompt(language, prompt);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: userPrompt,
            config: {
                systemInstruction,
                temperature: 0.8,
            }
        });
        return response.text;
    } catch (error) {
        console.error("Journal generation failed", error);
        return errorMessage;
    }
}
