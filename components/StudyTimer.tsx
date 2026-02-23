
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { StudyTimer } from '../types';

interface Props {
  onSessionComplete?: (duration: number) => void;
}

const StudyTimer: React.FC<Props> = ({ onSessionComplete }) => {
  const [timer, setTimer] = useState<StudyTimer>({
    isRunning: false,
    mode: 'focus',
    timeRemaining: 25 * 60, // 25 minutes
    sessionsCompleted: 0
  });

  const [customMinutes, setCustomMinutes] = useState(25);
  const intervalRef = useRef<number | null>(null);

  const playNotification = useCallback(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = timer.mode === 'focus' ? 880 : 440;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  }, [timer.mode]);

  useEffect(() => {
    if (timer.isRunning && timer.timeRemaining > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimer(prev => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1
        }));
      }, 1000);
    } else if (timer.timeRemaining === 0) {
      playNotification();
      if (timer.mode === 'focus') {
        onSessionComplete?.(25 * 60);
        setTimer(prev => ({
          ...prev,
          mode: 'break',
          timeRemaining: 5 * 60,
          sessionsCompleted: prev.sessionsCompleted + 1,
          isRunning: false
        }));
      } else {
        setTimer(prev => ({
          ...prev,
          mode: 'focus',
          timeRemaining: customMinutes * 60,
          isRunning: false
        }));
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timer.isRunning, timer.timeRemaining, timer.mode, customMinutes, onSessionComplete, playNotification]);

  const toggleTimer = () => {
    setTimer(prev => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const resetTimer = () => {
    setTimer(prev => ({
      ...prev,
      isRunning: false,
      timeRemaining: prev.mode === 'focus' ? customMinutes * 60 : 5 * 60
    }));
  };

  const switchMode = (mode: 'focus' | 'break') => {
    setTimer(prev => ({
      ...prev,
      mode,
      isRunning: false,
      timeRemaining: mode === 'focus' ? customMinutes * 60 : 5 * 60
    }));
  };

  const setCustomTime = (mins: number) => {
    setCustomMinutes(mins);
    if (!timer.isRunning && timer.mode === 'focus') {
      setTimer(prev => ({ ...prev, timeRemaining: mins * 60 }));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = timer.mode === 'focus' 
    ? ((customMinutes * 60 - timer.timeRemaining) / (customMinutes * 60)) * 100
    : ((5 * 60 - timer.timeRemaining) / (5 * 60)) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Study Timer</h2>
        <p className="text-slate-500">Stay focused with the Pomodoro technique</p>
      </div>

      {/* Mode Switcher */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => switchMode('focus')}
          className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${
            timer.mode === 'focus' 
              ? 'bg-indigo-600 text-white shadow-lg' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          🎯 Focus
        </button>
        <button
          onClick={() => switchMode('break')}
          className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${
            timer.mode === 'break' 
              ? 'bg-emerald-500 text-white shadow-lg' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          ☕ Break
        </button>
      </div>

      {/* Timer Display */}
      <div className="relative bg-white rounded-[3rem] p-12 shadow-xl border border-slate-200">
        <div className="relative w-64 h-64 mx-auto">
          {/* Progress Ring */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="#e2e8f0"
              strokeWidth="12"
              fill="none"
            />
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke={timer.mode === 'focus' ? '#4f46e5' : '#10b981'}
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 120}
              strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
              className="transition-all duration-1000"
            />
          </svg>
          
          {/* Time Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-black text-slate-800">
              {formatTime(timer.timeRemaining)}
            </span>
            <span className={`text-sm font-bold mt-2 ${
              timer.mode === 'focus' ? 'text-indigo-500' : 'text-emerald-500'
            }`}>
              {timer.mode === 'focus' ? 'Focus Time' : 'Break Time'}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        <button
          onClick={toggleTimer}
          className={`w-20 h-20 rounded-full font-bold text-lg shadow-lg transition-all active:scale-95 ${
            timer.isRunning 
              ? 'bg-rose-500 text-white hover:bg-rose-600' 
              : timer.mode === 'focus'
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
        >
          {timer.isRunning ? '⏸️' : '▶️'}
        </button>
        <button
          onClick={resetTimer}
          className="w-16 h-16 rounded-full bg-slate-100 text-slate-600 font-bold shadow-md hover:bg-slate-200 transition-all active:scale-95"
        >
          🔄
        </button>
      </div>

      {/* Focus Duration Selector */}
      {timer.mode === 'focus' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 text-center">
            Focus Duration
          </h3>
          <div className="flex justify-center gap-3">
            {[15, 25, 45, 60].map(mins => (
              <button
                key={mins}
                onClick={() => setCustomTime(mins)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                  customMinutes === mins
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sessions Counter */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white text-center">
        <div className="text-3xl font-black mb-1">{timer.sessionsCompleted}</div>
        <div className="text-sm font-medium opacity-80">Sessions Completed Today</div>
      </div>
    </div>
  );
};

export default StudyTimer;
