
import React, { useState } from 'react';
import { Flashcard } from '../types';

interface FlashcardViewProps {
  cards: Flashcard[];
  onCardReview?: () => void;
}

const FlashcardView: React.FC<FlashcardViewProps> = ({ cards, onCardReview }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  // Handle empty cards
  if (!cards || cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-6xl mb-4">📇</div>
        <p className="text-slate-500">No flashcards generated yet.</p>
        <p className="text-sm text-slate-400">Go back and generate flashcards from your study materials.</p>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  const nextCard = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
    setReviewedCount(prev => prev + 1);
    onCardReview?.();
  };

  const prevCard = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    setReviewedCount(prev => prev + 1);
    onCardReview?.();
  };

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="w-full max-w-lg perspective-1000">
        <div 
          onClick={() => setIsFlipped(!isFlipped)}
          className={`relative w-full h-80 transition-transform duration-500 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
        >
          {/* Front */}
          <div className="absolute inset-0 bg-white border-2 border-indigo-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-xl backface-hidden">
            <span className="text-indigo-400 text-xs font-bold uppercase mb-4">Question</span>
            <p className="text-xl md:text-2xl font-semibold text-slate-800">{currentCard.front}</p>
          </div>
          {/* Back */}
          <div className="absolute inset-0 bg-indigo-600 text-white rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-xl backface-hidden rotate-y-180">
            <span className="text-indigo-200 text-xs font-bold uppercase mb-4">Answer</span>
            <p className="text-xl md:text-2xl font-medium">{currentCard.back}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button 
          onClick={prevCard}
          className="p-3 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
        >
          ⬅️
        </button>
        <span className="text-slate-500 font-medium">
          {currentIndex + 1} / {cards.length}
        </span>
        <button 
          onClick={nextCard}
          className="p-3 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
        >
          ➡️
        </button>
      </div>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
};

export default FlashcardView;
