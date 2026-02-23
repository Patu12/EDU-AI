
import React, { useState } from 'react';
import { generateVisualAid } from '../services/geminiService';

const VisualizerView: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setImage(null);
    try {
      const url = await generateVisualAid(topic);
      setImage(url);
    } catch (e) {
      console.error(e);
      alert("Failed to generate image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Visual Study Aid</h2>
        <p className="text-slate-500">Generate mnemonic illustrations or diagrams to help you remember complex concepts visually.</p>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder="e.g. Structure of an Atom, Carbon Cycle, Python Memory Model"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-xl shadow-indigo-100"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin text-2xl">⏳</span> Generating Image...
              </span>
            ) : '🎨 Generate Illustration'}
          </button>
        </div>
      </div>

      {image && (
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in duration-500">
          <img src={image} alt={topic} className="w-full h-auto rounded-2xl" />
          <div className="mt-4 p-4 bg-slate-50 rounded-xl text-center">
            <p className="text-sm font-medium text-slate-600">Visual aid for: <span className="text-indigo-600 font-bold">{topic}</span></p>
            <button 
              onClick={() => {
                const link = document.createElement('a');
                link.href = image;
                link.download = `visual-aid-${topic.replace(/\s+/g, '-').toLowerCase()}.png`;
                link.click();
              }}
              className="mt-2 text-xs text-indigo-500 hover:underline font-semibold"
            >
              Download Image
            </button>
          </div>
        </div>
      )}

      {loading && !image && (
        <div className="aspect-square w-full bg-slate-100 rounded-3xl flex items-center justify-center border-2 border-dashed border-slate-300">
          <div className="text-center">
            <div className="text-4xl animate-bounce mb-2">💡</div>
            <p className="text-slate-400 font-medium">Imagining your visual aid...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualizerView;
