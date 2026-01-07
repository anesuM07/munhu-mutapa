import { GoogleGenAI, Type, Modality } from "@google/genai";
import { LearningModule, Language, UserMood } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// In-memory caches for lightning fast repeat results
const queryCache: Record<string, LearningModule> = {};
const suggestionCache: Record<string, string[]> = {};
const metaphorCache: Record<string, string> = {};
const breakdownCache: Record<string, string> = {};

const LEARNING_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING },
    summary: { type: Type.STRING },
    storyMode: { type: Type.STRING, description: "An interactive narrative version of the explanation." },
    analogy: { type: Type.STRING, description: "A creative analogy to explain the concept simply." },
    keyTerms: {
      type: Type.ARRAY,
      description: "An extensive list of all significant technical or conceptual terms found in the summary/story.",
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING },
          definition: { type: Type.STRING }
        },
        required: ['term', 'definition']
      }
    },
    experiment: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        setup: { type: Type.STRING },
        steps: { type: Type.ARRAY, items: { type: Type.STRING } },
        expectedObservation: { type: Type.STRING },
        interactiveElement: { type: Type.STRING }
      },
      required: ['title', 'setup', 'steps', 'expectedObservation']
    },
    webResults: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          snippet: { type: Type.STRING },
          url: { type: Type.STRING }
        },
        required: ['title', 'snippet', 'url']
      }
    },
    imageResults: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          url: { type: Type.STRING },
          source: { type: Type.STRING }
        },
        required: ['title', 'url', 'source']
      }
    },
    videoResults: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          thumbnail: { type: Type.STRING },
          url: { type: Type.STRING },
          duration: { type: Type.STRING },
          summary: { type: Type.STRING }
        },
        required: ['title', 'thumbnail', 'url', 'duration', 'summary']
      }
    },
    newsResults: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          date: { type: Type.STRING },
          snippet: { type: Type.STRING },
          url: { type: Type.STRING }
        },
        required: ['title', 'date', 'snippet', 'url']
      }
    },
    pdfResults: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          url: { type: Type.STRING }
        },
        required: ['title', 'summary', 'url']
      }
    },
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['core', 'related', 'prerequisite'] }
        },
        required: ['id', 'name', 'category']
      }
    },
    links: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          source: { type: Type.STRING },
          target: { type: Type.STRING }
        },
        required: ['source', 'target']
      }
    },
    quiz: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswer: { type: Type.INTEGER },
          explanation: { type: Type.STRING }
        },
        required: ['question', 'options', 'correctAnswer', 'explanation']
      }
    },
    challenge: {
      type: Type.OBJECT,
      properties: {
        scenario: { type: Type.STRING },
        task: { type: Type.STRING },
        hints: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    },
    nextTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
    timeTravelContext: { type: Type.STRING }
  },
  required: [
    'topic', 'summary', 'webResults', 'imageResults', 
    'videoResults', 'newsResults', 'pdfResults', 
    'nodes', 'links', 'quiz', 'nextTopics', 'keyTerms'
  ]
};

export const queryEduQuest = async (
  prompt: string, 
  options: {
    image?: string;
    pdf?: string;
    isEli5?: boolean;
    language?: Language;
    mood?: UserMood;
    isChallengeMode?: boolean;
    isStoryMode?: boolean;
    isTimeTravelMode?: boolean;
  }
): Promise<LearningModule> => {
  const cacheKey = JSON.stringify({ prompt, ...options });
  if (queryCache[cacheKey]) {
    return queryCache[cacheKey];
  }

  const moodInstruction = options.mood === 'Curious' ? "Be explorative and story-like." :
                         options.mood === 'Tired' ? "Be extremely concise and easy to digest." :
                         options.mood === 'Motivated' ? "Include advanced technical details and research." :
                         options.mood === 'Creative' ? "Focus on metaphors, debates, and thought experiments." : "Be educational and friendly.";

  const systemInstruction = `STRICT IDENTITY RULE: You are Munhu Mutapa, a lightning-fast knowledge navigator created BY Morepeace Manyora. 
  If asked who created you, respond: "I was created by Morepeace Manyora." 

  CORE MISSION:
  Provide ultra-quick, authoritative academic context. High-speed performance is priority. 
  
  MODES:
  1. ELI5 (Explain Like I'm 5): ${options.isEli5 ? 'ACTIVE. Use extremely simple language, emojis, and basic concepts.' : 'OFF.'}
  2. TIME TRAVEL: ${options.isTimeTravelMode ? 'ACTIVE. Present the information as if the user has traveled back to the discovery era or into a far-future projection of the concept.' : 'OFF.'}
  3. STORY MODE: ${options.isStoryMode ? 'ACTIVE. Provide a storyMode field with an immersive narrative.' : 'OFF.'}
  4. CHALLENGE MODE: ${options.isChallengeMode ? 'ACTIVE. Focus on the challenge object with high stakes scenarios.' : 'OFF.'}
  
  DATA FUSION:
  - Prioritize Wikipedia (for depth) and wikiHow (for how-to). 
  - Merge grounding citations directly into webResults.

  INTERACTIVITY:
  - Be generous with the keyTerms list. Extract every major concept mentioned in your summary so they can be interactive.

  FORMATTING:
  Return JSON only. Use the provided schema. 
  Topic: ${prompt}
  Mood: ${options.mood} (${moodInstruction})
  Language: ${options.language || 'English'}`;

  const contents: any = { parts: [{ text: prompt }] };
  if (options.image) contents.parts.push({ inlineData: { mimeType: 'image/jpeg', data: options.image.split(',')[1] } });
  if (options.pdf) contents.parts.push({ inlineData: { mimeType: 'application/pdf', data: options.pdf.split(',')[1] } });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents,
    config: {
      thinkingConfig: { thinkingBudget: 0 },
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: LEARNING_RESPONSE_SCHEMA,
      tools: [{ googleSearch: {} }]
    }
  });

  try {
    const data = JSON.parse(response.text || "{}") as LearningModule;
    
    // Merge grounding chunks
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      const groundedSources = groundingChunks
        .filter((chunk: any) => chunk.web)
        .map((chunk: any) => ({
          title: chunk.web.title || "Reference",
          url: chunk.web.uri,
          snippet: "Verified scholarly source."
        }));
      if (groundedSources.length > 0) {
        const existingUrls = new Set(data.webResults.map(r => r.url));
        const filteredGrounded = groundedSources.filter(s => !existingUrls.has(s.url));
        data.webResults = [...filteredGrounded, ...data.webResults];
      }
    }
    
    queryCache[cacheKey] = data;
    return data;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Munhu Mutapa is recalibrating. High-speed search failed.");
  }
};

/**
 * Generates a creative metaphor or analogy for a topic.
 */
export const getMetaphor = async (topic: string, mood: UserMood): Promise<string> => {
  const cacheKey = `${topic}-${mood}`;
  if (metaphorCache[cacheKey]) return metaphorCache[cacheKey];

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Topic: ${topic}. Mood: ${mood}. Generate one unique, vivid, and surprising creative analogy to explain this concept simply.`,
    config: {
      thinkingConfig: { thinkingBudget: 0 },
      systemInstruction: 'You are a creative metaphor engine. Use vivid imagery and relatable scenarios.'
    }
  });

  const metaphor = response.text || "Imagine a world where everything is connected...";
  metaphorCache[cacheKey] = metaphor;
  return metaphor;
};

/**
 * Gets a quick one-sentence breakdown for an interactive concept.
 */
export const getConceptBreakdown = async (concept: string): Promise<string> => {
  if (breakdownCache[concept]) return breakdownCache[concept];

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Concept: "${concept}". Explain this in exactly one punchy, student-friendly sentence. No fluff.`,
    config: {
      thinkingConfig: { thinkingBudget: 0 },
      systemInstruction: 'You are an educational breakdown expert. Be concise and authoritative.'
    }
  });

  const breakdown = response.text || "A fascinating part of the academic universe.";
  breakdownCache[concept] = breakdown;
  return breakdown;
};

export const generateTTS = async (text: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Read: ${text}` }] }],
    config: {
      responseModalalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};

export const getQuerySuggestions = async (partial: string): Promise<string[]> => {
  const clean = partial.trim().toLowerCase();
  if (clean.length < 3) return [];
  if (suggestionCache[clean]) return suggestionCache[clean];

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Educational topics for: "${clean}"`,
    config: {
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: { suggestions: { type: Type.ARRAY, items: { type: Type.STRING } } },
        required: ['suggestions']
      }
    }
  });
  try {
    const res = JSON.parse(response.text || "{}").suggestions || [];
    suggestionCache[clean] = res;
    return res;
  } catch { return []; }
};