
export interface Flashcard {
  front: string;
  back: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  sources?: { title: string; uri: string }[];
}

export interface StudyMaterial {
  id: string;
  title: string;
  content: string; 
  type: 'note' | 'outline' | 'textbook';
  tags: string[];
  timestamp: number;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  linkedMaterialIds: string[];
  status: 'pending' | 'studying' | 'mastered';
}

export interface Course {
  id: string;
  name: string;
  outlineMaterialId: string;
  topics: Topic[];
}

// ============ NEW: Progress Tracking Types ============

export interface StudySession {
  id: string;
  courseId?: string;
  topicId?: string;
  type: 'flashcard' | 'quiz' | 'tutor' | 'reading' | 'visualizer';
  duration: number; // in seconds
  score?: number;
  maxScore?: number;
  timestamp: number;
}

export interface TopicProgress {
  topicId: string;
  flashcardMastery: number; // 0-100
  quizScore: number; // 0-100
  timeSpent: number; // in seconds
  lastStudied: number;
  studyStreak: number;
}

export interface CourseProgress {
  courseId: string;
  topicsProgress: TopicProgress[];
  totalTimeSpent: number;
  quizzesTaken: number;
  averageQuizScore: number;
  flashcardsReviewed: number;
  lastStudied: number;
}

export interface UserStats {
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  totalStudyTime: number; // in seconds
  totalQuizzesTaken: number;
  totalFlashcardsReviewed: number;
  badges: Badge[];
  dailyGoal: DailyGoal;
  lastStudyDate: string;
  level: number;
  xp: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: number;
  type: 'achievement' | 'milestone' | 'streak';
}

export interface DailyGoal {
  targetMinutes: number;
  completedMinutes: number;
  date: string;
}

export interface StudyTimer {
  isRunning: boolean;
  mode: 'focus' | 'break';
  timeRemaining: number;
  sessionsCompleted: number;
}

// ============ End New Types ============

export enum AppRoute {
  DASHBOARD = 'dashboard',
  TUTOR = 'tutor',
  FLASHCARDS = 'flashcards',
  QUIZ = 'quiz',
  SUMMARIZER = 'summarizer',
  RESEARCH = 'research',
  VISUALS = 'visuals',
  MATERIALS = 'materials',
  PLANNER = 'planner',
  PROGRESS = 'progress',
  TIMER = 'timer',
  GAMES = 'games'
}
