
import React, { useState, useEffect } from 'react';
import { Flashcard } from '../types';

interface Props {
  cards: Flashcard[];
}

const MatchingGame: React.FC<Props> = ({ cards }) => {
  const [gameCards, setGameCards] = useState<{id: number, content: string, pairId: number, isFlipped: boolean, isMatched: boolean}[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [matchesFound, setMatchesFound] = useState(0);

  useEffect(() => {
    if (gameStarted && selectedCards.length === 2) {
      const [first, second] = selectedCards;
      const firstCard = gameCards.find(c => c.id === first);
      const secondCard = gameCards.find(c => c.id === second);
      
      if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
        // Match found!
        setTimeout(() => {
          setGameCards(prev => prev.map(c => 
            c.id === first || c.id === second ? {...c, isMatched: true} : c
          ));
          setScore(prev => prev + 10);
          setMatchesFound(prev => prev + 1);
          setSelectedCards([]);
        }, 300);
      } else {
        // No match - flip back
        setTimeout(() => {
          setGameCards(prev => prev.map(c => 
            c.id === first || c.id === second ? {...c, isFlipped: false} : c
          ));
          setSelectedCards([]);
        }, 800);
      }
    }
  }, [selectedCards, gameCards, gameStarted]);

  useEffect(() => {
    if (gameStarted && matchesFound === cards.length && cards.length > 0) {
      setGameOver(true);
    }
  }, [matchesFound, cards.length, gameStarted]);

  const startGame = () => {
    if (cards.length < 2) return;
    
    // Create pairs - each card has a pair with its match
    const pairs: {id: number, content: string, pairId: number, isFlipped: boolean, isMatched: boolean}[] = [];
    let id = 0;
    
    cards.forEach((card, index) => {
      // Add front
      pairs.push({
        id: id++,
        content: card.front,
        pairId: index,
        isFlipped: false,
        isMatched: false
      });
      // Add back
      pairs.push({
        id: id++,
        content: card.back,
        pairId: index,
        isFlipped: false,
        isMatched: false
      });
    });
    
    // Shuffle
    const shuffled = pairs.sort(() => Math.random() - 0.5);
    setGameCards(shuffled);
    setMatchesFound(0);
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    setSelectedCards([]);
  };

  const handleCardClick = (id: number) => {
    if (gameOver) return;
    const card = gameCards.find(c => c.id === id);
    if (!card || card.isFlipped || card.isMatched) return;
    if (selectedCards.includes(id)) return;
    if (selectedCards.length >= 2) return;

    setGameCards(prev => prev.map(c => 
      c.id === id ? {...c, isFlipped: true} : c
    ));
    setSelectedCards(prev => [...prev, id]);
  };

  if (!gameStarted || cards.length < 2) {
    return (
      <div className="max-w-2xl mx-auto py-8 text-center">
        <div className="bg-white rounded-3xl p-12 border border-slate-200">
          <div className="text-6xl mb-6">🎯</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Memory Match</h2>
          <p className="text-slate-500 mb-6">Flip cards to find matching pairs. Match front with back!</p>
          <p className="text-sm text-amber-500 mb-6">Need at least 2 flashcards to play</p>
          <button 
            onClick={startGame}
            disabled={cards.length < 2}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50"
          >
            Start Game
          </button>
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="max-w-2xl mx-auto py-8 text-center">
        <div className="bg-white rounded-3xl p-12 border border-slate-200">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">You Won!</h2>
          <p className="text-slate-500 mb-4">You found all {matchesFound} pairs!</p>
          <p className="text-3xl font-black text-indigo-600 mb-6">Score: {score}</p>
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

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">🎯 Memory Match</h2>
        <div className="bg-white px-6 py-2 rounded-xl border border-slate-200">
          <span className="text-slate-500 text-sm">Score:</span>
          <span className="font-bold ml-2 text-indigo-600">{score}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {gameCards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            disabled={card.isMatched}
            className={`h-24 rounded-xl font-medium transition-all cursor-pointer ${
              card.isMatched 
                ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300 opacity-50' 
                : card.isFlipped 
                  ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-500' 
                  : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-2 border-transparent hover:from-indigo-600 hover:to-purple-700'
            }`}
          >
            {card.isFlipped || card.isMatched ? card.content.substring(0, 20) + '...' : '?'}
          </button>
        ))}
      </div>

      <div className="mt-6 text-center text-slate-500">
        <p>Click two cards to find matching pairs. Match front of flashcard with back!</p>
      </div>
    </div>
  );
};

export default MatchingGame;
