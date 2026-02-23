import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';

interface Props {
  questions: QuizQuestion[];
}

const SpeedQuiz: React.FC<Props> = ({ questions }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    if (gameStarted && !gameOver && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !gameOver) {
      handleTimeout();
    }
  }, [timeLeft, gameStarted, gameOver]);

  const handleTimeout = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setStreak(0);
      setTimeLeft(10);
      setSelectedOption(null);
    } else {
      setGameOver(true);
      if (score > highScore) setHighScore(score);
    }
  };

  const startGame = () => {
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setTimeLeft(10);
    setGameOver(false);
    setGameStarted(true);
    setSelectedOption(null);
  };

  const handleAnswer = (index: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(index);
    
    if (index === questions[currentIndex].correctAnswerIndex) {
      const points = 10 + (streak * 2) + (timeLeft > 5 ? 5 : 0);
      setScore(prev => prev + points);
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setTimeLeft(10);
        setSelectedOption(null);
      } else {
        setGameOver(true);
        if (score > highScore) setHighScore(score);
      }
    }, 800);
  };

  if (!gameStarted) {
    return (
      <div className="max-w-2xl mx-auto py-8 text-center">
        <div className="bg-white rounded-3xl p-12 border border-slate-200">
          <div className="text-6xl mb-6">⚡</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Speed Quiz</h2>
          <p className="text-slate-500 mb-4">Answer as many questions as you can in 10 seconds each!</p>
          <p className="text-amber-500 font-bold mb-6">High Score: {highScore}</p>
          <button 
            onClick={startGame}
            disabled={questions.length === 0}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50"
          >
            Start Speed Quiz
          </button>
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="max-w-2xl mx-auto py-8 text-center">
        <div className="bg-white rounded-3xl p-12 border border-slate-200">
          <div className="text-6xl mb-6">{score > highScore * 0.8 ? '🏆' : '🎯'}</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Game Over!</h2>
          <p className="text-3xl font-black text-indigo-600 mb-2">Score: {score}</p>
          {score === highScore && <p className="text-amber-500 font-bold mb-4">🏆 New High Score!</p>}
          <button 
            onClick={startGame}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200">
          <span className="text-slate-500 text-sm">Question:</span>
          <span className="font-bold ml-2">{currentIndex + 1}/{questions.length}</span>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200">
          <span className="text-slate-500 text-sm">Score:</span>
          <span className="font-bold ml-2 text-indigo-600">{score}</span>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200">
          <span className="text-slate-500 text-sm">Streak:</span>
          <span className="font-bold ml-2 text-amber-500">🔥 {streak}</span>
        </div>
        <div className={`px-4 py-2 rounded-xl border ${timeLeft <= 3 ? 'bg-rose-100 border-rose-500' : 'bg-white border-slate-200'}`}>
          <span className={`font-bold ${timeLeft <= 3 ? 'text-rose-500' : 'text-slate-800'}`}>{timeLeft}s</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
        <h3 className="text-xl font-bold text-slate-800 mb-8">{currentQ.question}</h3>
        <div className="space-y-3">
          {currentQ.options.map((option, idx) => {
            let bgColor = 'bg-white border-slate-200';
            if (selectedOption !== null) {
              if (idx === currentQ.correctAnswerIndex) bgColor = 'bg-emerald-50 border-emerald-500';
              else if (idx === selectedOption) bgColor = 'bg-rose-50 border-rose-500';
            }

            return (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={selectedOption !== null}
                className={`w-full p-4 text-left border-2 rounded-xl font-medium transition-all ${bgColor}`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SpeedQuiz;
