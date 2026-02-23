
import React, { useState } from 'react';
import { researchTopic } from '../services/geminiService';

const ResearchView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string, sources: { title: string, uri: string }[] } | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await researchTopic(query);
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Research Tool</h2>
        <p className="text-slate-500 mb-6">Search for up-to-date facts and academic information with Google Search grounding.</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for recent events, research, or complex facts..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm leading-relaxed text-slate-700">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Summary</h3>
            <p className="whitespace-pre-wrap">{result.text}</p>
          </div>

          {result.sources.length > 0 && (
            <div className="bg-slate-100 p-6 rounded-3xl">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Sources Found</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.sources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-500 transition-all flex items-center gap-3 group"
                  >
                    <div className="bg-slate-50 w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-slate-400 group-hover:text-indigo-600">{idx + 1}</div>
                    <div className="truncate flex-1">
                      <p className="text-sm font-bold text-slate-800 truncate">{source.title}</p>
                      <p className="text-xs text-slate-500 truncate">{new URL(source.uri).hostname}</p>
                    </div>
                    <span className="text-indigo-500">↗️</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResearchView;
