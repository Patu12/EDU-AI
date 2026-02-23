
import React, { useState } from 'react';
import { StudyMaterial } from '../types';
import { extractTextFromImage } from '../services/geminiService';

interface Props {
  materials: StudyMaterial[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onAdd: (m: StudyMaterial) => void;
  onDelete: (id: string) => void;
  onUpdateType?: (id: string, type: 'note' | 'outline' | 'textbook') => void;
}

const StudyMaterialManager: React.FC<Props> = ({ materials, selectedIds, onToggleSelect, onAdd, onDelete, onUpdateType }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [type, setType] = useState<'note' | 'outline' | 'textbook'>('note');
  const [uploadType, setUploadType] = useState<'note' | 'outline' | 'textbook'>('textbook');
  const [isUploading, setIsUploading] = useState(false);

  // Helper to extract text from PDF
  const extractTextFromPDF = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const pdfjsLib = (window as any).pdfjsLib;
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }
    return fullText;
  };

  // Helper to extract text from DOCX
  const extractTextFromDocx = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const mammoth = (window as any).mammoth;
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const fileName = file.name;
    const fileType = file.type;
    const extension = fileName.split('.').pop()?.toLowerCase();

    const defaultTags = [extension || 'file', 'upload'];

    try {
      const reader = new FileReader();

      if (fileType.startsWith('image/')) {
        reader.onload = async (event) => {
          const base64 = event.target?.result as string;
          const text = await extractTextFromImage(base64);
          onAdd({
            id: Math.random().toString(36).substr(2, 9),
            title: fileName,
            content: text,
            type: uploadType,
            tags: [...defaultTags, 'ocr'],
            timestamp: Date.now()
          });
          setIsUploading(false);
        };
        reader.readAsDataURL(file);
      } else if (extension === 'pdf') {
        reader.onload = async (event) => {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const text = await extractTextFromPDF(arrayBuffer);
          onAdd({
            id: Math.random().toString(36).substr(2, 9),
            title: fileName,
            content: text,
            type: uploadType,
            tags: defaultTags,
            timestamp: Date.now()
          });
          setIsUploading(false);
        };
        reader.readAsArrayBuffer(file);
      } else if (extension === 'docx') {
        reader.onload = async (event) => {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const text = await extractTextFromDocx(arrayBuffer);
          onAdd({
            id: Math.random().toString(36).substr(2, 9),
            title: fileName,
            content: text,
            type: uploadType,
            tags: defaultTags,
            timestamp: Date.now()
          });
          setIsUploading(false);
        };
        reader.readAsArrayBuffer(file);
      } else if (extension === 'txt' || extension === 'md') {
        reader.onload = async (event) => {
          const text = event.target?.result as string;
          onAdd({
            id: Math.random().toString(36).substr(2, 9),
            title: fileName,
            content: text,
            type: uploadType,
            tags: defaultTags,
            timestamp: Date.now()
          });
          setIsUploading(false);
        };
        reader.readAsText(file);
      } else {
        alert("Unsupported file type.");
        setIsUploading(false);
      }
    } catch (err) {
      console.error(err);
      alert("Error processing file.");
      setIsUploading(false);
    }
  };

  const handleAddManual = () => {
    if (!title || !content) return;
    const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      title,
      content,
      type,
      tags,
      timestamp: Date.now()
    });
    setTitle('');
    setContent('');
    setTagsInput('');
  };

  const filteredMaterials = materials.filter(m => {
    const search = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(search) ||
      m.tags.some(tag => tag.toLowerCase().includes(search))
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Material Vault</h2>
        <p className="text-slate-500 mb-6">Store your notes and course outlines. Syllabi must be marked as "Outline" to be used in the Planner.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-700">Quick Paste</h3>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase font-bold tracking-tighter">Manual Entry</span>
            </div>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="Title (e.g. Bio 101 Syllabus)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            <div className="flex gap-2">
              <select 
                value={type} 
                onChange={e => setType(e.target.value as any)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              >
                <option value="note">Study Note</option>
                <option value="outline">Course Outline / Syllabus</option>
                <option value="textbook">Textbook Chapter</option>
              </select>
              <input 
                type="text" 
                value={tagsInput} 
                onChange={e => setTagsInput(e.target.value)} 
                placeholder="Tags (comma separated)"
                className="flex-[2] bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <textarea 
              value={content} 
              onChange={e => setContent(e.target.value)}
              placeholder="Paste content here..."
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            <button 
              onClick={handleAddManual}
              disabled={!title || !content}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
            >
              Add to Vault
            </button>
          </div>

          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl p-8 hover:bg-slate-50 transition-all group relative overflow-hidden">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📂</div>
            <h3 className="font-bold text-slate-800 mb-1">Upload Documents</h3>
            <p className="text-xs text-slate-400 mb-4 text-center max-w-[200px]">
              Supports PDF, DOCX, TXT, MD and Images
            </p>
            
            <div className="w-full max-w-[240px] mb-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Treat file as:</label>
              <select 
                value={uploadType}
                onChange={e => setUploadType(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="textbook">Textbook / Content</option>
                <option value="outline">Course Syllabus / Outline</option>
                <option value="note">Study Notes</option>
              </select>
            </div>

            <input 
              type="file" 
              accept=".pdf,.docx,.txt,.md,image/*" 
              onChange={handleFileUpload}
              className="hidden" 
              id="file-upload" 
              disabled={isUploading}
            />
            <label 
              htmlFor="file-upload" 
              className={`cursor-pointer px-8 py-3 rounded-xl font-bold text-sm shadow-md transition-all ${isUploading ? 'bg-slate-200 text-slate-400 scale-95' : 'bg-slate-800 text-white hover:bg-slate-900 active:scale-95'}`}
            >
              {isUploading ? 'AI is reading...' : 'Select File'}
            </label>
            
            {isUploading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[1px]">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800">Your Materials</h3>
          <div className="relative w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search title or tags..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map(m => (
            <div 
              key={m.id} 
              onClick={() => onToggleSelect(m.id)}
              className={`cursor-pointer bg-white p-6 rounded-2xl border-2 transition-all relative group hover:shadow-md ${
                selectedIds.includes(m.id) 
                  ? 'border-indigo-600 shadow-indigo-50' 
                  : 'border-slate-100'
              }`}
            >
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedIds.includes(m.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'
                }`}>
                  {selectedIds.includes(m.id) && <span className="text-white text-xs">✓</span>}
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(m.id);
                  }}
                  className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-125"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <select
                  value={m.type}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    onUpdateType?.(m.id, e.target.value as any);
                  }}
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm border-none cursor-pointer outline-none ${
                    m.type === 'outline' ? 'bg-amber-50 text-amber-600' :
                    m.type === 'textbook' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-indigo-50 text-indigo-600'
                  }`}
                >
                  <option value="note">Note</option>
                  <option value="outline">Outline</option>
                  <option value="textbook">Book</option>
                </select>
                <span className="text-[10px] font-medium text-slate-400">
                  {m.content.length > 1000 ? `${(m.content.length / 1024).toFixed(1)} KB` : `${m.content.length} chars`}
                </span>
              </div>
              <h4 className="font-bold text-slate-800 truncate mb-2 leading-tight pr-14">{m.title}</h4>
              
              {m.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {m.tags.map((tag, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md text-[9px] font-bold border border-slate-200 uppercase">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-500 mb-4 line-clamp-3 leading-relaxed">
                {m.content}
              </p>
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="text-[10px] font-semibold text-slate-300">
                  {new Date(m.timestamp).toLocaleDateString()}
                </div>
                <div className={`text-[10px] font-bold transition-colors ${
                  selectedIds.includes(m.id) ? 'text-indigo-600' : 'text-slate-300'
                }`}>
                  {selectedIds.includes(m.id) ? 'Selected' : 'Unselected'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudyMaterialManager;
