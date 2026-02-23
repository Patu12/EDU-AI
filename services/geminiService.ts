
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Flashcard, QuizQuestion, Topic, StudyMaterial } from "../types";

// API Configuration - Check Gemini first, then OpenRouter
const getAPIConfig = () => {
  // Check Gemini API first
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  if (geminiKey) {
    return { type: 'gemini' as const, apiKey: geminiKey };
  }
  
  // Fall back to OpenRouter
  const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    return { type: 'openrouter' as const, apiKey: openRouterKey };
  }
  
  console.error('No API Key found! Set VITE_GEMINI_API_KEY or VITE_OPENROUTER_API_KEY in .env.local');
  return { type: 'gemini' as const, apiKey: '' };
};

const getHeaders = (apiConfig: ReturnType<typeof getAPIConfig>) => {
  if (apiConfig.type === 'openrouter') {
    return {
      'Authorization': `Bearer ${apiConfig.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin || 'http://localhost:3000',
      'X-Title': 'EduBoost AI'
    };
  }
  return {};
};

const getBaseUrl = (apiConfig: ReturnType<typeof getAPIConfig>) => {
  if (apiConfig.type === 'openrouter') {
    return 'https://openrouter.ai/api/v1';
  }
  return 'https://generativelanguage.googleapis.com';
};

// Helper to decode base64 for audio
const decode = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

// Audio decoding helper
const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
};

export const parseOutline = async (outlineText: string): Promise<Partial<Topic>[]> => {
  const apiConfig = getAPIConfig();
  const truncatedText = outlineText.length > 8000 ? outlineText.substring(0, 8000) : outlineText;
  
  console.log('parseOutline called with text length:', truncatedText.length);
  
  if (!truncatedText || truncatedText.length < 20) {
    console.log('Text too short');
    return [];
  }
  
  try {
    if (apiConfig.type === 'openrouter') {
      console.log('Using OpenRouter API');
      const res = await fetch(`https://openrouter.ai/api/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiConfig.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin || 'http://localhost:3000',
          'X-Title': 'EduBoost AI'
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat',
          messages: [{
            role: 'user',
            content: `Extract all study topics from this syllabus. Return ONLY a JSON array of objects with "title" and "description" fields. 

Example: [{"title":"Introduction","description":"Basic concepts"},{"title":"Chapter 1","description":"First topic"}]

Syllabus:
${truncatedText}`
          }],
          response_format: { type: 'json_object' }
        })
      });
      
      console.log('Response status:', res.status);
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('API error:', errorData);
        throw new Error(errorData.error?.message || 'API request failed with status ' + res.status);
      }
      
      const data = await res.json();
      console.log('API response:', data);
      
      const content = data.choices?.[0]?.message?.content;
      console.log('Content:', content);
      
      if (!content) {
        console.log('No content in response');
        return [];
      }
      
      const result = JSON.parse(content);
      console.log('Parsed result:', result);
      
      const topics = Array.isArray(result) ? result : result.topics || result.topicList || [];
      console.log('Extracted topics:', topics);
      return topics;
    } else {
      const ai = new GoogleGenAI({ apiKey: apiConfig.apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Extract all study topics from this syllabus. Return a JSON array with "title" and "description" for each topic.

Syllabus:
${truncatedText}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["title", "description"]
            }
          }
        }
      });
      return JSON.parse(response.text || "[]");
    }
  } catch (error) {
    console.error('parseOutline error:', error);
    return [];
  }
};

export const autoMapMaterialsToTopics = async (topics: Topic[], materials: StudyMaterial[]): Promise<{ topicId: string, materialIds: string[] }[]> => {
  const apiConfig = getAPIConfig();
  
  const materialSummaries = materials
    .filter(m => m.type !== 'outline')
    .map(m => `ID: ${m.id} | Title: ${m.title} | Content Snippet: ${m.content.substring(0, 1000)}...`)
    .join('\n\n') || "No materials provided.";

  const topicList = topics.map(t => `ID: ${t.id} | Title: ${t.title}`).join('\n') || "No topics provided.";

  const prompt = `Perform a deep scan of the following study materials and match them to the most relevant learning topics. 
  Only link materials if they contain significant content related to the topic ID provided.
  
  TOPICS TO MATCH:
  ${topicList}
  
  MATERIALS TO SCAN:
  ${materialSummaries}`;

  try {
    if (apiConfig.type === 'openrouter') {
      const res = await fetch(`${getBaseUrl(apiConfig)}/chat/completions`, {
        method: 'POST',
        headers: getHeaders(apiConfig),
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        })
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '[]';
      return JSON.parse(content);
    } else {
      const ai = new GoogleGenAI({ apiKey: apiConfig.apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topicId: { type: Type.STRING },
                materialIds: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["topicId", "materialIds"],
              propertyOrdering: ["topicId", "materialIds"]
            }
          }
        }
      });
      return JSON.parse(response.text || "[]");
    }
  } catch (error) {
    console.error('autoMapMaterialsToTopics error:', error);
    return [];
  }
};

export const speakText = async (text: string) => {
  const apiConfig = getAPIConfig();
  
  try {
    if (apiConfig.type === 'openrouter') {
      console.log('Text-to-speech not supported with OpenRouter, skipping audio');
      return;
    }
    
    const ai = new GoogleGenAI({ apiKey: apiConfig.apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read this study content clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    }
  } catch (error) {
    console.error('speakText error:', error);
  }
};

export const extractTextFromImage = async (base64Image: string): Promise<string> => {
  const apiConfig = getAPIConfig();
  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  
  try {
    if (apiConfig.type === 'openrouter') {
      const res = await fetch(`${getBaseUrl(apiConfig)}/chat/completions`, {
        method: 'POST',
        headers: getHeaders(apiConfig),
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
              { type: 'text', text: 'Scan this educational image meticulously. Extract all text, formulas, and structural hierarchy. Use Markdown format.' }
            ]
          }]
        })
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    } else {
      const ai = new GoogleGenAI({ apiKey: apiConfig.apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          role: 'user',
          parts: [
            { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
            { text: "Scan this educational image meticulously. Extract all text, formulas, and structural hierarchy. Use Markdown format." }
          ]
        }
      });
      return response.text || "";
    }
  } catch (error) {
    console.error('extractTextFromImage error:', error);
    return '';
  }
};

export const generateFlashcards = async (topic: string, context: string): Promise<Flashcard[]> => {
  const apiConfig = getAPIConfig();
  const truncatedContext = context.length > 20000 ? context.substring(0, 20000) : context;
  
  if (!truncatedContext || truncatedContext === 'No context provided.') {
    throw new Error('No study materials found. Please add materials to your vault first.');
  }

  try {
    if (apiConfig.type === 'openrouter') {
      const res = await fetch(`${getBaseUrl(apiConfig)}/chat/completions`, {
        method: 'POST',
        headers: getHeaders(apiConfig),
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [{
            role: 'user',
            content: `Identify key concepts by scanning the provided material: \n\n ${truncatedContext} \n\n Generate 5-10 effective study flashcards for: ${topic}. \n\nIMPORTANT: Focus on the actual content provided. Use LaTeX for math. Return ONLY a JSON array with objects having "front" and "back" fields.`
          }],
          response_format: { type: 'json_object' }
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || 'OpenRouter API error');
      }
      
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      const cards = JSON.parse(content);
      const cardArray = Array.isArray(cards) ? cards : cards.flashcards || [];
      
      if (cardArray.length === 0) {
        throw new Error('No flashcards could be generated from the provided materials.');
      }
      return cardArray;
    } else {
      const ai = new GoogleGenAI({ apiKey: apiConfig.apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Identify key concepts by scanning the provided material: \n\n ${truncatedContext} \n\n Generate 5-10 effective study flashcards for: ${topic}. \n\nIMPORTANT: Focus on the actual content provided. Use LaTeX for math, wrapped in $ or $$.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                front: { type: Type.STRING },
                back: { type: Type.STRING }
              },
              required: ['front', 'back'],
              propertyOrdering: ["front", "back"]
            }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    }
  } catch (error: any) {
    console.error('Flashcard generation error:', error);
    if (error.message?.includes('API Key') || error.message?.includes('materials')) {
      throw error;
    }
    throw new Error(`Failed to generate flashcards: ${error.message || 'Unknown error'}`);
  }
};

export const generateQuiz = async (topic: string, context: string, count: number = 10): Promise<QuizQuestion[]> => {
  const apiConfig = getAPIConfig();
  const truncatedContext = context.length > 20000 ? context.substring(0, 20000) : context;
  
  if (!truncatedContext || truncatedContext === 'No context provided.') {
    throw new Error('No study materials found. Please add materials to your vault first.');
  }

  try {
    if (apiConfig.type === 'openrouter') {
      const res = await fetch(`${getBaseUrl(apiConfig)}/chat/completions`, {
        method: 'POST',
        headers: getHeaders(apiConfig),
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [{
            role: 'user',
            content: `Carefully scan the following material to create a high-quality assessment: \n\n ${truncatedContext} \n\n Create a ${count}-question multiple choice quiz about ${topic}. \n\nIMPORTANT: Questions must be derived from the specific details in the text. Use LaTeX for math. Each question should have 4 options with one correct answer. Return ONLY a JSON array with objects having "question", "options" (array of 4 strings), "correctAnswerIndex" (0-3), and "explanation" fields.`
          }],
          response_format: { type: 'json_object' }
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || 'OpenRouter API error');
      }
      
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      const questions = JSON.parse(content);
      return Array.isArray(questions) ? questions : questions.quiz || [];
    } else {
      const ai = new GoogleGenAI({ apiKey: apiConfig.apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Carefully scan the following material to create a high-quality assessment: \n\n ${truncatedContext} \n\n Create a ${count}-question multiple choice quiz about ${topic}. \n\nIMPORTANT: Questions must be derived from the specific details in the text. Use LaTeX for math. Each question should have 4 options with one correct answer.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswerIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "correctAnswerIndex", "explanation"],
              propertyOrdering: ["question", "options", "correctAnswerIndex", "explanation"]
            }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    }
  } catch (error: any) {
    console.error('Quiz generation error:', error);
    if (error.message?.includes('API Key') || error.message?.includes('materials')) {
      throw error;
    }
    throw new Error(`Failed to generate quiz: ${error.message || 'Unknown error'}`);
  }
};

export const summarizeText = async (text: string): Promise<string> => {
  const apiConfig = getAPIConfig();
  const truncatedContext = text.length > 30000 ? text.substring(0, 30000) : text;
  
  try {
    if (apiConfig.type === 'openrouter') {
      const res = await fetch(`${getBaseUrl(apiConfig)}/chat/completions`, {
        method: 'POST',
        headers: getHeaders(apiConfig),
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [{
            role: 'user',
            content: `Scan the following study material and synthesize a comprehensive summary. Highlight key terminology, core concepts, and formulas (using LaTeX): \n\n ${truncatedContext}`
          }]
        })
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    } else {
      const ai = new GoogleGenAI({ apiKey: apiConfig.apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Scan the following study material and synthesize a comprehensive summary. Highlight key terminology, core concepts, and formulas (using LaTeX): \n\n ${truncatedContext}`,
      });
      return response.text || "";
    }
  } catch (error) {
    console.error('summarizeText error:', error);
    return '';
  }
};

export const researchTopic = async (query: string) => {
  const apiConfig = getAPIConfig();
  
  try {
    if (apiConfig.type === 'openrouter') {
      const res = await fetch(`${getBaseUrl(apiConfig)}/chat/completions`, {
        method: 'POST',
        headers: getHeaders(apiConfig),
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [{
            role: 'user',
            content: `Research this topic and provide an academically rigorous explanation. Use LaTeX for all technical notation: ${query}`
          }]
        })
      });
      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || '', sources: [] };
    } else {
      const ai = new GoogleGenAI({ apiKey: apiConfig.apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Research this topic and provide an academically rigorous explanation. Scan the web for the latest developments. Use LaTeX for all technical notation: ${query}`,
        config: { tools: [{ googleSearch: {} }] },
      });
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter((chunk: any) => chunk.web)
        ?.map((chunk: any) => ({ title: chunk.web.title, uri: chunk.web.uri })) || [];
      return { text: response.text, sources };
    }
  } catch (error) {
    console.error('researchTopic error:', error);
    return { text: '', sources: [] };
  }
};

export const generateVisualAid = async (concept: string): Promise<string | null> => {
  const apiConfig = getAPIConfig();
  
  try {
    if (apiConfig.type === 'openrouter') {
      console.log('Visual aid generation not supported with OpenRouter');
      return null;
    }
    
    const ai = new GoogleGenAI({ apiKey: apiConfig.apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        role: 'user',
        parts: [{ text: `High quality academic diagram for a student explaining: ${concept}. Label key parts clearly. Ensure professional educational aesthetics.` }] 
      },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error) {
    console.error('generateVisualAid error:', error);
    return null;
  }
};

export const chatWithTutor = async (history: { role: 'user' | 'model', parts: { text: string }[] }[], message: string, context: string) => {
  const apiConfig = getAPIConfig();
  const validHistory = history.length > 0 && history[0].role === 'user' ? history : [];
  const truncatedContext = context.length > 25000 ? context.substring(0, 25000) + "..." : context;

  try {
    if (apiConfig.type === 'openrouter') {
      const openRouterHistory = validHistory.map(h => ({
        role: h.role,
        content: h.parts[0]?.text || ''
      }));
      
      const res = await fetch(`${getBaseUrl(apiConfig)}/chat/completions`, {
        method: 'POST',
        headers: getHeaders(apiConfig),
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            {
              role: 'system',
              content: `You are the EduBoost Pro Tutor. 
              DEEP SCAN PROTOCOL:
              1. ANALYZE: Scan the following provided knowledge source before every response.
              2. FIDELITY: Only provide information that aligns with or supplements the provided text.
              3. MATH: Use professional LaTeX for ALL formulas ($inline$, $$block$$).
              4. STYLE: Be direct but encouraging. Use Socratic questioning to help students think.
              
              KNOWLEDGE SOURCE TO SCAN:
              \n\n${truncatedContext}\n\n`
            },
            ...openRouterHistory,
            { role: 'user', content: message }
          ]
        })
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    } else {
      const ai = new GoogleGenAI({ apiKey: apiConfig.apiKey });
      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        history: validHistory,
        config: {
          systemInstruction: `You are the EduBoost Pro Tutor. 
          DEEP SCAN PROTOCOL:
          1. ANALYZE: Scan the following provided knowledge source before every response.
          2. FIDELITY: Only provide information that aligns with or supplements the provided text.
          3. MATH: Use professional LaTeX for ALL formulas ($inline$, $$block$$).
          4. STYLE: Be direct but encouraging. Use Socratic questioning to help students think.
          
          KNOWLEDGE SOURCE TO SCAN:
          \n\n${truncatedContext}\n\n`,
        },
      });
      const response = await chat.sendMessage({ message });
      return response.text;
    }
  } catch (error) {
    console.error('chatWithTutor error:', error);
    return 'Sorry, I encountered an error. Please try again.';
  }
};
