
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import FlashcardView from './components/FlashcardView';
import QuizView from './components/QuizView';
import ResearchView from './components/ResearchView';
import VisualizerView from './components/VisualizerView';
import LiveTutorView from './components/LiveTutorView';
import StudyMaterialManager from './components/StudyMaterialManager';
import CoursePlannerView from './components/CoursePlannerView';
import StudyTimer from './components/StudyTimer';
import ProgressDashboard from './components/ProgressDashboard';
import StudyGames from './components/StudyGames';
import { 
  AppRoute, 
  Flashcard, 
  QuizQuestion, 
  Message,
  StudyMaterial,
  Course,
  Topic,
  UserStats,
  CourseProgress,
  TopicProgress,
  Badge
} from './types';
import { 
  generateFlashcards, 
  generateQuiz, 
  summarizeText,
  speakText
} from './services/geminiService';

const App: React.FC = () => {
  const [route, setRoute] = useState<AppRoute>(AppRoute.DASHBOARD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topicInput, setTopicInput] = useState('');
  const [quizCount, setQuizCount] = useState('10');
  
  // UI Sub-states
  const [showNotes, setShowNotes] = useState(false);
  
  // Focused study state
  const [focusedTopic, setFocusedTopic] = useState<Topic | null>(null);
  
  // Global States
  const [materials, setMaterials] = useState<StudyMaterial[]>(() => {
    const saved = localStorage.getItem('studyMaterials');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('selectedMaterialIds');
    return saved ? JSON.parse(saved) : [];
  });
  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem('courses');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Tool specific states
  const [flashcards, setFlashcards] = useState<Flashcard[]>(() => {
    const saved = localStorage.getItem('flashcards');
    return saved ? JSON.parse(saved) : [];
  });
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(() => {
    const saved = localStorage.getItem('quizQuestions');
    return saved ? JSON.parse(saved) : [];
  });
  const [summary, setSummary] = useState('');
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);

  // ============ NEW: Progress Tracking States ============
  const [userStats, setUserStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('userStats');
    if (saved) return JSON.parse(saved);
    return {
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalStudyTime: 0,
      totalQuizzesTaken: 0,
      totalFlashcardsReviewed: 0,
      badges: [],
      dailyGoal: { targetMinutes: 60, completedMinutes: 0, date: new Date().toDateString() },
      lastStudyDate: '',
      level: 1,
      xp: 0
    };
  });

  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>(() => {
    const saved = localStorage.getItem('courseProgress');
    return saved ? JSON.parse(saved) : [];
  });

  // Save to localStorage on changes
  useEffect(() => {
    localStorage.setItem('userStats', JSON.stringify(userStats));
  }, [userStats]);

  useEffect(() => {
    localStorage.setItem('courseProgress', JSON.stringify(courseProgress));
  }, [courseProgress]);

  useEffect(() => {
    localStorage.setItem('studyMaterials', JSON.stringify(materials));
  }, [materials]);

  useEffect(() => {
    localStorage.setItem('selectedMaterialIds', JSON.stringify(selectedMaterialIds));
  }, [selectedMaterialIds]);

  useEffect(() => {
    localStorage.setItem('courses', JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem('flashcards', JSON.stringify(flashcards));
  }, [flashcards]);

  useEffect(() => {
    localStorage.setItem('quizQuestions', JSON.stringify(quizQuestions));
  }, [quizQuestions]);

  // Track study time and update streak
  const trackStudyTime = (seconds: number) => {
    const today = new Date().toDateString();
    setUserStats(prev => {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      let newStreak = prev.currentStreak;
      
      if (prev.lastStudyDate === yesterday) {
        newStreak = prev.currentStreak + 1;
      } else if (prev.lastStudyDate !== today) {
        newStreak = 1;
      }

      return {
        ...prev,
        totalStudyTime: prev.totalStudyTime + seconds,
        currentStreak: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
        dailyGoal: {
          ...prev.dailyGoal,
          completedMinutes: prev.dailyGoal.date === today 
            ? prev.dailyGoal.completedMinutes + Math.floor(seconds / 60)
            : Math.floor(seconds / 60),
          date: today
        },
        lastStudyDate: today,
        totalPoints: prev.totalPoints + Math.floor(seconds / 60) * 10
      };
    });
  };

  // Award badges based on achievements
  const checkAndAwardBadges = () => {
    const newBadges: Badge[] = [];
    
    if (userStats.totalQuizzesTaken >= 1 && !userStats.badges.find(b => b.id === 'first-quiz')) {
      newBadges.push({ id: 'first-quiz', name: 'Quiz Starter', description: 'Complete your first quiz', icon: '🎯', earnedAt: Date.now(), type: 'milestone' });
    }
    if (userStats.currentStreak >= 3 && !userStats.badges.find(b => b.id === 'streak-3')) {
      newBadges.push({ id: 'streak-3', name: '3 Day Streak', description: 'Study 3 days in a row', icon: '🔥', earnedAt: Date.now(), type: 'streak' });
    }
    if (userStats.currentStreak >= 7 && !userStats.badges.find(b => b.id === 'streak-7')) {
      newBadges.push({ id: 'streak-7', name: 'Week Warrior', description: 'Study 7 days in a row', icon: '⚡', earnedAt: Date.now(), type: 'streak' });
    }
    if (userStats.totalStudyTime >= 36000 && !userStats.badges.find(b => b.id === 'hours-10')) {
      newBadges.push({ id: 'hours-10', name: 'Dedicated', description: 'Study for 10 hours total', icon: '⏰', earnedAt: Date.now(), type: 'milestone' });
    }
    if (userStats.totalFlashcardsReviewed >= 100 && !userStats.badges.find(b => b.id === 'master-flashcards')) {
      newBadges.push({ id: 'master-flashcards', name: 'Memory Master', description: 'Review 100 flashcards', icon: '📇', earnedAt: Date.now(), type: 'achievement' });
    }

    if (newBadges.length > 0) {
      setUserStats(prev => ({
        ...prev,
        badges: [...prev.badges, ...newBadges],
        totalPoints: prev.totalPoints + newBadges.length * 100
      }));
    }
  };

  // Calculate level from XP
  const getLevelFromXP = (xp: number) => {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  };

  // Get XP required for next level
  const getXPForNextLevel = (level: number) => {
    return level * level * 100;
  };

  // Add XP and check for level up
  const addXP = (amount: number) => {
    setUserStats(prev => {
      const newXP = prev.xp + amount;
      const newLevel = getLevelFromXP(newXP);
      const leveledUp = newLevel > prev.level;
      
      return {
        ...prev,
        xp: newXP,
        level: newLevel,
        totalPoints: prev.totalPoints + (leveledUp ? 500 : 0)
      };
    });
  };

  // Track quiz completion
  const trackQuizCompletion = (score: number, maxScore: number) => {
    const percentage = Math.round((score / maxScore) * 100);
    setUserStats(prev => ({
      ...prev,
      totalQuizzesTaken: prev.totalQuizzesTaken + 1,
      totalPoints: prev.totalPoints + percentage * 2
    }));
    checkAndAwardBadges();
  };

  // Track flashcard review
  const trackFlashcardReview = () => {
    setUserStats(prev => ({
      ...prev,
      totalFlashcardsReviewed: prev.totalFlashcardsReviewed + 1,
      totalPoints: prev.totalPoints + 5
    }));
    checkAndAwardBadges();
  };

  // Update topic progress
  const updateTopicProgress = (topicId: string, quizScore?: number, timeSpent?: number) => {
    setCourseProgress(prev => {
      const existingIndex = prev.findIndex(cp => cp.courseId === focusedTopic?.id);
      let updated = [...prev];
      
      if (existingIndex === -1) {
        // Create new progress entry
        const newProgress: CourseProgress = {
          courseId: focusedTopic?.id || '',
          topicsProgress: [],
          totalTimeSpent: timeSpent || 0,
          quizzesTaken: quizScore ? 1 : 0,
          averageQuizScore: quizScore || 0,
          flashcardsReviewed: 0,
          lastStudied: Date.now()
        };
        updated.push(newProgress);
      } else {
        // Update existing
        const cp = { ...updated[existingIndex] };
        cp.totalTimeSpent += timeSpent || 0;
        if (quizScore) {
          cp.quizzesTaken += 1;
          cp.averageQuizScore = Math.round((cp.averageQuizScore * (cp.quizzesTaken - 1) + quizScore) / cp.quizzesTaken);
        }
        cp.lastStudied = Date.now();
        updated[existingIndex] = cp;
      }
      return updated;
    });
  };

  // ============ End New States ============

  const currentContextMaterials = focusedTopic 
    ? materials.filter(m => focusedTopic.linkedMaterialIds.includes(m.id))
    : materials.filter(m => selectedMaterialIds.includes(m.id));

  const activeContext = currentContextMaterials.length > 0 
    ? currentContextMaterials.map(m => `--- ${m.title} (${m.type}) ---\n${m.content}`).join('\n\n')
    : materials.map(m => `--- ${m.title} (${m.type}) ---\n${m.content}`).join('\n\n');

  const toggleMaterialSelection = (id: string) => {
    setSelectedMaterialIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleGenerateFlashcards = async (customTopic?: string) => {
    setLoading(true);
    setError(null);
    try {
      const topicName = customTopic || topicInput || focusedTopic?.title || "Summary of Selection";
      const cards = await generateFlashcards(topicName, activeContext || "No context provided.");
      setFlashcards(cards);
      setRoute(AppRoute.FLASHCARDS);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to generate flashcards');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFlashcardsForTopic = async (topic: Topic) => {
    setFocusedTopic(topic);
    const topicMaterials = materials.filter(m => topic.linkedMaterialIds.includes(m.id));
    const topicContext = topicMaterials.length > 0 
      ? topicMaterials.map(m => `--- ${m.title} (${m.type}) ---\n${m.content}`).join('\n\n')
      : "No context provided.";
    
    setLoading(true);
    try {
      const cards = await generateFlashcards(topic.title, topicContext);
      setFlashcards(cards);
      setRoute(AppRoute.FLASHCARDS);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setLoading(true);
    try {
      const topicName = focusedTopic?.title || topicInput || "General Review";
      const questions = await generateQuiz(topicName, activeContext || "No context provided.", parseInt(quizCount));
      setQuizQuestions(questions);
      setRoute(AppRoute.QUIZ);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (materials.length === 0) return alert("Upload materials to the Vault first!");
    setLoading(true);
    try {
      const result = await summarizeText(activeContext);
      setSummary(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStudyTopic = async (topic: Topic) => {
    setFocusedTopic(topic);
    setActiveQuestion(null);
    setRoute(AppRoute.TUTOR);
  };

  const renderTutor = () => (
    <div className="flex flex-col h-full gap-4 animate-in fade-in duration-700">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 rounded-lg">🤖</span> Unified Tutor Workspace
          </h2>
          <div className="h-6 w-[1px] bg-slate-200 mx-2" />
          <button 
            onClick={() => setShowNotes(!showNotes)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${showNotes ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}
          >
            📚 {showNotes ? 'Hide Notes' : 'Peek Notes'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-2xl border border-indigo-100 text-[10px] font-black uppercase tracking-widest">
            {focusedTopic ? focusedTopic.title : `${selectedMaterialIds.length || materials.length} Sources Selected`}
          </div>
          {focusedTopic && (
            <button onClick={() => setFocusedTopic(null)} className="text-rose-500 hover:scale-110 transition-transform p-2 bg-rose-50 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 relative min-h-0 flex gap-4">
        {/* Main Workspace */}
        <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col relative">
          <LiveTutorView 
            context={activeContext} 
            onQuestionDetected={(q) => setActiveQuestion(q)}
          />

          {/* Question Challenge Overlay */}
          {activeQuestion && (
            <div className="absolute inset-0 z-50 p-8 flex items-center justify-center animate-in fade-in zoom-in duration-500 bg-white/20 backdrop-blur-sm">
              <div className="bg-white w-full max-w-xl rounded-[3rem] border-4 border-amber-100 shadow-2xl p-12 text-center space-y-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                  <span className="text-9xl">💡</span>
                </div>
                <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner">🤔</div>
                <div className="space-y-4">
                  <h3 className="text-amber-600 text-xs font-black uppercase tracking-[0.3em]">Knowledge Check</h3>
                  <p className="text-slate-900 text-2xl font-bold leading-tight">{activeQuestion}</p>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest leading-loose">
                      Respond via voice or chat to continue.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveQuestion(null)}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                  >
                    Got it! Return to Workspace
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* References Peek Drawer */}
        {showNotes && (
          <div className="w-80 bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right-8 duration-500">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-[0.2em]">Source Materials</h3>
              <button onClick={() => setShowNotes(false)} className="text-slate-400 hover:text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {currentContextMaterials.length > 0 ? (
                currentContextMaterials.map((m) => (
                  <div key={m.id} className="space-y-2">
                    <h4 className="text-indigo-600 font-black text-[9px] uppercase tracking-widest">{m.title}</h4>
                    <div className="text-slate-600 text-[11px] leading-relaxed bg-white/50 p-4 rounded-2xl border border-slate-100 shadow-sm whitespace-pre-wrap">
                      {m.content}
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 px-8">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-loose">No materials<br/>selected for focus</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Banner */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[3rem] p-6 text-white flex items-center justify-between">
        <div>
          <div className="text-sm font-medium opacity-80">Level {userStats.level} Student</div>
          <div className="text-2xl font-black">{userStats.totalPoints} points</div>
          {/* XP Bar */}
          <div className="mt-2 w-32 bg-white/20 rounded-full h-2">
            <div 
              className="bg-amber-400 h-2 rounded-full" 
              style={{ width: `${Math.min(100, (userStats.xp / getXPForNextLevel(userStats.level)) * 100)}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-2xl font-black">🔥 {userStats.currentStreak}</div>
            <div className="text-xs opacity-80">Day Streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black">⏱️ {Math.floor(userStats.totalStudyTime / 60)}m</div>
            <div className="text-xs opacity-80">Study Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black">🎯 {userStats.totalQuizzesTaken}</div>
            <div className="text-xs opacity-80">Quizzes</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] p-12 border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Study Smart, Not Hard. 👋</h2>
          <p className="text-slate-500 max-w-lg font-medium leading-relaxed">
            {materials.length > 0 
              ? `Your vault is active with ${materials.length} items. Ready to master ${courses.length} courses?`
              : "Welcome to EduBoost! Let's transform your study materials into interactive knowledge."}
          </p>
          <button 
            onClick={() => setRoute(AppRoute.MATERIALS)}
            className="mt-8 bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
          >
            Open Study Vault
          </button>
        </div>
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none select-none group-hover:scale-110 group-hover:rotate-6 transition-transform duration-700">
          <span className="text-[12rem]">📘</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
        {[
          { id: AppRoute.TUTOR, label: 'Multimodal Tutor', desc: 'Combined voice and chat workspace for rapid learning.', icon: '🤖', color: 'indigo' },
          { id: AppRoute.PLANNER, label: 'Course Units', desc: 'Detect topics from syllabi and link notes.', icon: '🧭', color: 'slate' },
          { id: AppRoute.MATERIALS, label: 'Study Vault', desc: 'Central hub for your course materials.', icon: '📦', color: 'slate' },
          { id: AppRoute.FLASHCARDS, label: 'Flashcard Factory', desc: 'Recall cards from selected notes.', icon: '📇', color: 'violet' },
          { id: AppRoute.QUIZ, label: 'Quiz Generator', desc: 'Test yourself on chosen materials.', icon: '📝', color: 'sky' },
          { id: AppRoute.VISUALS, label: 'Visual Aid Gen', desc: 'Create study diagrams & mnemonics.', icon: '🎨', color: 'emerald' },
          { id: AppRoute.TIMER, label: 'Study Timer', desc: 'Stay focused with Pomodoro technique.', icon: '⏱️', color: 'rose' },
          { id: AppRoute.GAMES, label: 'Study Games', desc: 'Fun games to learn while playing!', icon: '🎮', color: 'amber' },
          { id: AppRoute.PROGRESS, label: 'My Progress', desc: 'Track your learning journey & achievements.', icon: '📊', color: 'amber' },
        ].map((feat) => (
          <div 
            key={feat.id}
            onClick={() => setRoute(feat.id as AppRoute)}
            className="group cursor-pointer bg-white p-8 rounded-[2.5rem] border border-slate-200 hover:border-indigo-400 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
          >
            <div className={`bg-slate-50 text-slate-800 w-16 h-16 rounded-3xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-inner`}>{feat.icon}</div>
            <h3 className="font-black text-slate-900 mb-2 tracking-tight">{feat.label}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Layout currentRoute={route} setRoute={setRoute}>
      {route === AppRoute.DASHBOARD && renderDashboard()}
      {route === AppRoute.MATERIALS && (
        <StudyMaterialManager 
          materials={materials}
          selectedIds={selectedMaterialIds}
          onToggleSelect={toggleMaterialSelection}
          onAdd={m => {
            setMaterials(prev => [m, ...prev]);
            setSelectedMaterialIds(prev => [...prev, m.id]); 
          }} 
          onDelete={id => {
            setMaterials(prev => prev.filter(m => m.id !== id));
            setSelectedMaterialIds(prev => prev.filter(i => i !== id));
          }}
          onUpdateType={(id, newType) => {
            setMaterials(prev => prev.map(m => m.id === id ? { ...m, type: newType } : m));
          }}
        />
      )}
      {route === AppRoute.PLANNER && (
        <CoursePlannerView 
          materials={materials} 
          courses={courses} 
          setCourses={setCourses} 
          onStudyTopic={handleStudyTopic}
          onGenerateFlashcardsForTopic={handleGenerateFlashcardsForTopic}
        />
      )}
      {route === AppRoute.TUTOR && renderTutor()}
      {route === AppRoute.RESEARCH && <ResearchView />}
      {route === AppRoute.VISUALS && <VisualizerView />}
      {route === AppRoute.TIMER && <StudyTimer onSessionComplete={trackStudyTime} />}
      {route === AppRoute.GAMES && (
        <StudyGames flashcards={flashcards} quizQuestions={quizQuestions} />
      )}
      {route === AppRoute.PROGRESS && (
        <ProgressDashboard 
          userStats={userStats} 
          courseProgress={courseProgress} 
          courses={courses} 
        />
      )}
      {route === AppRoute.FLASHCARDS && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h2 className="text-2xl font-black text-slate-800 mb-2 text-center tracking-tight">Flashcard Factory</h2>
            <div className="flex gap-4">
              <input 
                type="text" value={topicInput} onChange={e => setTopicInput(e.target.value)} 
                placeholder="Targeted sub-topic or concept..."
                className="flex-1 p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
              />
              <button onClick={() => handleGenerateFlashcards()} disabled={loading} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all">
                {loading ? '...' : 'Generate Cards'}
              </button>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}
          </div>
          <FlashcardView cards={flashcards} onCardReview={() => {
              trackFlashcardReview();
              addXP(5);
            }} />
        </div>
      )}
      {route === AppRoute.QUIZ && (
        <div className="space-y-6">
          <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-sm text-center space-y-4">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Ready for a Quiz?</h2>
            <p className="text-slate-500 max-w-sm mx-auto">I'll generate a custom assessment based on your selected materials.</p>
            
            {/* Question Count Selector */}
            <div className="flex items-center justify-center gap-4">
              <label className="text-sm font-medium text-slate-600">Number of Questions:</label>
              <select 
                value={quizCount} 
                onChange={(e) => setQuizCount(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium"
              >
                <option value="5">5 Questions</option>
                <option value="10">10 Questions</option>
                <option value="15">15 Questions</option>
                <option value="20">20 Questions</option>
                <option value="25">25 Questions</option>
                <option value="30">30 Questions</option>
              </select>
            </div>
            
            <button onClick={handleGenerateQuiz} disabled={loading} className="w-full max-w-xs bg-indigo-600 text-white py-5 rounded-[2rem] font-bold shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 mt-4 active:scale-95">
              {loading ? 'Analyzing Content...' : '🚀 Start Knowledge Check'}
            </button>
          </div>
          <QuizView questions={quizQuestions} onRestart={() => setQuizQuestions([])} onGenerateMore={() => handleGenerateQuiz()} onComplete={(score, total) => {
              const percentage = Math.round((score / total) * 100);
              trackQuizCompletion(score, total);
              // Add XP based on performance
              const xpEarned = score * 10 + (percentage >= 80 ? 50 : percentage >= 60 ? 25 : 0);
              addXP(xpEarned);
              // Add bonus points for good scores
              if (percentage >= 80) {
                setUserStats(prev => ({ ...prev, totalPoints: prev.totalPoints + 50 }));
              } else if (percentage >= 60) {
                setUserStats(prev => ({ ...prev, totalPoints: prev.totalPoints + 25 }));
              }
            }} />
        </div>
      )}
      {route === AppRoute.SUMMARIZER && (
        <div className="space-y-6">
          <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-sm text-center">
            <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Selection Summarizer</h2>
            <button onClick={handleSummarize} disabled={loading} className="w-full bg-emerald-600 text-white py-5 rounded-[2rem] font-bold shadow-xl shadow-emerald-100 hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-95">
              {loading ? 'Synthesizing...' : '📋 Generate Study Guide'}
            </button>
          </div>
          {summary && (
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 group relative animate-in slide-in-from-bottom-8 duration-700">
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                <h3 className="font-black text-slate-800 uppercase tracking-[0.2em] text-[10px]">Study Guide Output</h3>
                <div className="flex gap-2">
                  <button onClick={() => speakText(summary)} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">🔊 Play Audio</button>
                </div>
              </div>
              <div className="prose prose-indigo max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap text-sm font-medium">{summary}</div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};

export default App;
