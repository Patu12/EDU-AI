
import React, { useState } from 'react';
import { QuizQuestion } from '../types';

interface QuizViewProps {
  questions: QuizQuestion[];
  onRestart: () => void;
  onComplete?: (score: number, total: number) => void;
  onGenerateMore?: () => void;
}

const QuizView: React.FC<QuizViewProps> = ({ questions, onRestart, onComplete, onGenerateMore }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  // Handle empty questions
  if (!questions || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white rounded-3xl p-12 text-center shadow-xl border border-slate-100">
          <div className="text-6xl mb-6">📝</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">No Quiz Available</h2>
          <p className="text-slate-500 mb-8">Please select study materials first and try again.</p>
          <button 
            onClick={onRestart}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Calculate score for current answer
  const calculateCurrentScore = (selectedIdx: number, correctIdx: number, currentScore: number) => {
    return selectedIdx === correctIdx ? currentScore + 1 : currentScore;
  };

  const handleOptionSelect = (index: number) => {
    if (showExplanation) return;
    setSelectedOption(index);
    setShowExplanation(true);
    if (index === questions[currentIndex].correctAnswerIndex) {
      setScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    const currentScore = selectedOption === questions[currentIndex].correctAnswerIndex ? score + 1 : score;
    
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
      // Keep the score updated for next question
      if (selectedOption === questions[currentIndex].correctAnswerIndex) {
        setScore(prev => prev + 1);
      }
    } else {
      // Calculate final score including the last question
      const finalScoreValue = selectedOption === questions[currentIndex].correctAnswerIndex ? score + 1 : score;
      setFinalScore(finalScoreValue);
      setIsFinished(true);
      // Use setTimeout to ensure state is updated before calling onComplete
      setTimeout(() => {
        onComplete?.(finalScoreValue, questions.length);
      }, 100);
    }
  };

  if (isFinished) {
    const percentage = Math.round((finalScore / questions.length) * 100);
    const emoji = percentage >= 80 ? '🏆' : percentage >= 60 ? '🎉' : '💪';
    const message = percentage >= 80 ? 'Excellent!' : percentage >= 60 ? 'Good Job!' : 'Keep Practicing!';
    const points = score * 10 + (percentage >= 80 ? 50 : percentage >= 60 ? 25 : 0);
    
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white rounded-3xl p-12 text-center shadow-xl border border-slate-100 animate-in zoom-in duration-500">
          <div className="text-8xl mb-6 animate-bounce">{emoji}</div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">{message}</h2>
          <p className="text-slate-500 mb-2">You scored <span className="font-bold text-indigo-600">{finalScore}</span> out of {questions.length}</p>
          <p className="text-amber-500 font-bold mb-8">+{points} points earned!</p>
          
          <div className="w-full bg-slate-100 h-4 rounded-full mb-8 overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${percentage >= 80 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : percentage >= 60 ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gradient-to-r from-rose-400 to-orange-400'}`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Progress Stars */}
          <div className="flex justify-center gap-2 mb-8">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={`text-2xl ${i < Math.ceil(percentage / 20) ? 'text-amber-400' : 'text-slate-200'}`}>⭐</span>
            ))}
          </div>
          
          <button 
            onClick={onRestart}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            Try Another Topic
          </button>
          {onGenerateMore && (
            <button 
              onClick={onGenerateMore}
              className="ml-4 bg-emerald-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
            >
              🔄 Generate More Questions
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">
          Question {currentIndex + 1} of {questions.length}
        </span>
        <span className="text-sm font-medium text-slate-400">Score: {score}</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
        <h3 className="text-xl font-bold text-slate-800 mb-8">{currentQ.question}</h3>
        <div className="space-y-3">
          {currentQ.options.map((option, idx) => {
            let bgColor = 'bg-white border-slate-200 hover:border-indigo-300';
            if (showExplanation) {
              if (idx === currentQ.correctAnswerIndex) bgColor = 'bg-emerald-50 border-emerald-500 text-emerald-700';
              else if (idx === selectedOption) bgColor = 'bg-rose-50 border-rose-500 text-rose-700';
              else bgColor = 'bg-slate-50 border-slate-100 opacity-50';
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                disabled={showExplanation}
                className={`w-full p-4 text-left border-2 rounded-xl font-medium transition-all flex justify-between items-center ${bgColor}`}
              >
                {option}
                {showExplanation && idx === currentQ.correctAnswerIndex && <span>✅</span>}
                {showExplanation && idx === selectedOption && idx !== currentQ.correctAnswerIndex && <span>❌</span>}
              </button>
            );
          })}
        </div>
      </div>

      {showExplanation && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <h4 className="font-bold text-indigo-900 mb-2">Explanation</h4>
          <p className="text-indigo-800 text-sm leading-relaxed">{currentQ.explanation}</p>
          <button 
            onClick={nextQuestion}
            className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all"
          >
            {currentIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizView;
