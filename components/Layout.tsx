
import React from 'react';
import { AppRoute } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentRoute: AppRoute;
  setRoute: (route: AppRoute) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentRoute, setRoute }) => {
  const navItems = [
    { id: AppRoute.DASHBOARD, label: 'Dashboard', icon: '🏠' },
    { id: AppRoute.PLANNER, label: 'Course Planner', icon: '🧭' },
    { id: AppRoute.MATERIALS, label: 'Study Vault', icon: '📦' },
    { id: AppRoute.TUTOR, label: 'AI Tutor', icon: '🤖' },
    { id: AppRoute.TIMER, label: 'Study Timer', icon: '⏱️' },
    { id: AppRoute.GAMES, label: 'Study Games', icon: '🎮' },
    { id: AppRoute.PROGRESS, label: 'My Progress', icon: '📊' },
    { id: AppRoute.RESEARCH, label: 'Research', icon: '🔍' },
    { id: AppRoute.VISUALS, label: 'Visualizer', icon: '🎨' },
    { id: AppRoute.FLASHCARDS, label: 'Flashcards', icon: '📇' },
    { id: AppRoute.QUIZ, label: 'Quiz Gen', icon: '📝' },
    { id: AppRoute.SUMMARIZER, label: 'Summarizer', icon: '📋' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
            <span className="bg-indigo-600 text-white p-1 rounded-lg shadow-sm">EB</span> EduBoost
          </h1>
        </div>
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setRoute(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                currentRoute === item.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl text-white">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">Study Tip</p>
            <p className="text-sm leading-tight">Use the Study Timer to stay focused with Pomodoro technique!</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-indigo-600">EduBoost</h1>
          <select 
            value={currentRoute} 
            onChange={(e) => setRoute(e.target.value as AppRoute)}
            className="bg-slate-100 border-none rounded-lg p-2 text-sm"
          >
            {navItems.map(item => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
