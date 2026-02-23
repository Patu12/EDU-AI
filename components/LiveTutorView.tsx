
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

interface Message {
  role: 'AI' | 'You';
  text: string;
  isAudio?: boolean;
}

interface Props {
  context?: string;
  onQuestionDetected?: (text: string) => void;
}

// Manual base64 encoding/decoding for Live API compatibility
const encode = (bytes: Uint8Array) => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const decode = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

// Raw PCM audio decoding for streaming audio out
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Enhanced MathContent component for professional LaTeX rendering.
 * Handles mixed content by splitting and rendering mathematical fragments individually.
 */
const MathContent: React.FC<{ content: string }> = ({ content }) => {
  const renderMathContent = (text: string) => {
    if (!text) return "";
    const katex = (window as any).katex;
    if (!katex) return text;

    const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const math = part.slice(2, -2).trim();
        try {
          return `<div class="math-block-wrapper my-4 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 shadow-inner overflow-x-auto">
            ${katex.renderToString(math, { displayMode: true, throwOnError: false })}
          </div>`;
        } catch (e) {
          return `<pre class="bg-rose-50 p-2 rounded text-xs">${part}</pre>`;
        }
      }
      if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1).trim();
        try {
          return `<span class="inline-math px-0.5 font-medium">${katex.renderToString(math, { displayMode: false, throwOnError: false })}</span>`;
        } catch (e) {
          return part;
        }
      }
      return part.replace(/[&<>"']/g, (m) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      })[m] || m);
    }).join('');
  };

  return (
    <div 
      className="text-sm font-semibold leading-relaxed whitespace-pre-wrap math-rendered-container"
      dangerouslySetInnerHTML={{ __html: renderMathContent(content) }}
    />
  );
};

const LiveTutorView: React.FC<Props> = ({ context = "", onQuestionDetected }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  
  const sessionRef = useRef<any>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const stopAudio = () => {
    audioSourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const handleStartVoice = async () => {
    if (isActive || isConnecting) return;
    setIsConnecting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            analyserRef.current = inputAudioContextRef.current!.createAnalyser();
            analyserRef.current.fftSize = 256;
            source.connect(analyserRef.current);

            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
            drawVisualizer();
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              setIsAiSpeaking(true);
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => {
                audioSourcesRef.current.delete(source);
                if (audioSourcesRef.current.size === 0) setIsAiSpeaking(false);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioSourcesRef.current.add(source);
            }
            if (message.serverContent?.interrupted) stopAudio();
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setChatHistory(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'AI' && last.isAudio) {
                  return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                }
                return [...prev, { role: 'AI', text, isAudio: true }];
              });
            }
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setChatHistory(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'You' && last.isAudio) {
                  return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                }
                return [...prev, { role: 'You', text, isAudio: true }];
              });
            }
          },
          onclose: () => handleStopVoice(),
          onerror: (e) => handleStopVoice()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: `You are the EduBoost Knowledge-First Tutor. 
          CORE MISSION: 
          1. SCAN: Before responding, scan the provided study context thoroughly.
          2. SOURCE: Treat the provided text as your primary source of truth. If the answer is in the context, prioritize it.
          3. RESPONSE: Be conversational, encouraging, and clear.
          4. MATH: ALWAYS use LaTeX (e.g. $E=mc^2$) for formulas, symbols, and technical notation.
          5. BEHAVIOR: Do not make up facts outside the context if the context is specific.
          
          STUDY CONTEXT TO SCAN:
          \n\n${context.substring(0, 25000)}`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      setIsConnecting(false);
    }
  };

  const handleStopVoice = () => {
    setIsActive(false);
    setIsConnecting(false);
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    stopAudio();
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const render = () => {
      animationRef.current = requestAnimationFrame(render);
      analyserRef.current!.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgba(99, 102, 241, ${dataArray[i] / 255 + 0.2})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    render();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/5 overflow-hidden relative rounded-[2.5rem]">
      {/* Scanning Info Bar */}
      {isActive && (
        <div className="absolute top-24 left-8 z-10 flex items-center gap-2 bg-indigo-600/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-indigo-200/50 animate-pulse">
           <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
           <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">Scanning Context ({context.length} chars)</span>
        </div>
      )}

      <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
        <button 
          onClick={isActive ? handleStopVoice : handleStartVoice}
          disabled={isConnecting}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 ${
            isActive ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
          }`}
        >
          <span className="text-sm">{isActive ? '⏹️' : '🎙️'}</span>
          {isConnecting ? 'Initializing...' : isActive ? 'End Voice Session' : 'Start Voice Tutor'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white/40 custom-scrollbar">
        {chatHistory.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
            <div className="w-48 h-48 mb-8 bg-indigo-50 text-indigo-400 rounded-full flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
               {isActive ? <canvas ref={canvasRef} className="w-full h-24 absolute bottom-0" /> : <span className="text-5xl">🎙️</span>}
               <span className="mt-4 font-bold text-xs uppercase tracking-widest">{isActive ? 'Listening...' : 'Mic Ready'}</span>
            </div>
            <h4 className="text-2xl font-black text-slate-800 tracking-tight">Voice AI Workspace</h4>
            <p className="text-sm text-slate-500 max-w-[340px] leading-relaxed mt-2 font-medium">
              Start a live session to ask questions. The AI will scan your provided materials to give accurate, context-aware help.
            </p>
          </div>
        )}
        
        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'You' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] p-5 rounded-3xl relative shadow-sm ${
              msg.role === 'You' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800 border border-slate-100 shadow-lg'
            }`}>
               <div className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">
                 {msg.role} {msg.isAudio && '• Voice'}
               </div>
               <MathContent content={msg.text} />
            </div>
          </div>
        ))}
        
        {isAiSpeaking && (
           <div className="flex justify-start">
             <div className="bg-white p-4 rounded-2xl border border-slate-100 flex gap-1 items-center">
               <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
               <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
               <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
             </div>
           </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {isActive && (
        <div className="p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 flex items-center justify-center gap-4 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Voice Active</span>
          </div>
          <div className="h-4 w-[1px] bg-slate-200" />
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Speak naturally to continue</p>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .math-rendered-container .katex { font-size: 1.1em; line-height: 1.2; }
        .math-block-wrapper .katex-display { margin: 0; }
        .inline-math .katex { font-size: 1.05em; }
      `}</style>
    </div>
  );
};

export default LiveTutorView;
