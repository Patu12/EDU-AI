import React, { useState } from 'react';
import MatchingGame from './MatchingGame';
import SpeedQuiz from './SpeedQuiz';
import { Flashcard, QuizQuestion } from '../types';

interface Props {
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
}

const StudyGames: React.FC<Props> = ({ flashcards, quizQuestions }) => {
  const [activeGame, setActiveGame] = useState<'menu' | 'matching' | 'speed'>('menu');

  if (activeGame === 'matching') {
    return (
      <div>
        <button 
          onClick={() => setActiveGame('menu')}
          className="mb-4 text-indigo-600 font-medium hover:underline"
        >
          ← Back to Games
        </button>
        <MatchingGame cards={flashcards} />
      </div>
    );
  }

  if (activeGame === 'speed') {
    return (
      <div>
        <button 
          onClick={() => setActiveGame('menu')}
          className="mb-4 text-indigo-600 font-medium hover:underline"
        >
          ← Back to Games
        </button>
        <SpeedQuiz questions={quizQuestions} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">🎮 Study Games</h2>
        <p className="text-slate-500">Learn while having fun! Play games to boost your knowledge.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Matching Game Card */}
        <div 
          onClick={() => flashcards.length >= 2 ? setActiveGame('matching') : null}
          className={`bg-white p-8 rounded-3xl border-2 transition-all cursor-pointer ${
            flashcards.length >= 2 
              ? 'border-indigo-200 hover:border-indigo-500 hover:shadow-2xl' 
              : 'border-slate-100 opacity-50 cursor-not-allowed'
          }`}
        >
          <div className="text-6xl mb-4 text-center">🎯</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">Matching Game</h3>
          <p className="text-slate-500 text-center text-sm mb-4">
            Match terms with their definitions. 60 second time limit!
          </p>
          <div className="text-center">
            <span className="bg-indigo-100 text-indigo-700 px-4 py-1 rounded-full text-xs font-bold">
              {flashcards.length} cards
            </span>
          </div>
          {flashcards.length < 2 && (
            <p className="text-center text-rose-500 text-xs mt-2">Need at least 2 flashcards</p>
          )}
        </div>

        {/* Speed Quiz Card */}
        <div 
          onClick={() => quizQuestions.length > 0 ? setActiveGame('speed') : null}
          className={`bg-white p-8 rounded-3xl border-2 transition-all cursor-pointer ${
            quizQuestions.length > 0 
              ? 'border-amber-200 hover:border-amber-500 hover:shadow-2xl' 
              : 'border-slate-100 opacity-50 cursor-not-allowed'
          }`}
        >
          <div className="text-6xl mb-4 text-center">⚡</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">Speed Quiz</h3>
          <p className="text-slate-500 text-center text-sm mb-4">
            Answer questions against the clock! Build combos for bonus points.
          </p>
          <div className="text-center">
            <span className="bg-amber-100 text-amber-700 px-4 py-1 rounded-full text-xs font-bold">
              {quizQuestions.length} questions
            </span>
          </div>
          {quizQuestions.length === 0 && (
            <p className="text-center text-rose-500 text-xs mt-2">Generate quiz first</p>
          )}
        </div>
      </div>

      {/* How to Play */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6">
        <h3 className="font-bold text-slate-800 mb-4">💡 How to Play</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
          <div className="flex gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <strong>Matching Game:</strong> Select a term, then select its matching definition. Match all pairs before time runs out!
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <strong>Speed Quiz:</strong> You have 10 seconds per question. Build streaks for bonus points. Answer fast for extra points!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyGames;
