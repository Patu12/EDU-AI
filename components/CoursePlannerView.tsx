
import React, { useState } from 'react';
import { Course, Topic, StudyMaterial } from '../types';
import { parseOutline, autoMapMaterialsToTopics } from '../services/geminiService';

interface Props {
  materials: StudyMaterial[];
  courses: Course[];
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  onStudyTopic: (topic: Topic) => void;
  onGenerateFlashcardsForTopic: (topic: Topic) => void;
}

const CoursePlannerView: React.FC<Props> = ({ 
  materials, 
  courses, 
  setCourses, 
  onStudyTopic, 
  onGenerateFlashcardsForTopic 
}) => {
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [selectedOutlineId, setSelectedOutlineId] = useState('');
  const [loading, setLoading] = useState(false);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newTopics, setNewTopics] = useState('');

  const handleDeleteCourse = (courseId: string) => {
    if (confirm('Are you sure you want to delete this course?')) {
      setCourses(prev => prev.filter(c => c.id !== courseId));
      if (activeCourseId === courseId) {
        setActiveCourseId(null);
      }
    }
  };

  const outlines = materials.filter(m => m.type === 'outline');
  const others = materials.filter(m => m.type !== 'outline');

  const handleCreateCourse = async () => {
    if (!newCourseName) return;
    setLoading(true);
    setError(null);
    try {
      let topics: Topic[] = [];
      
      // If outline is selected, try to parse it
      if (selectedOutlineId) {
        const material = materials.find(m => m.id === selectedOutlineId);
        const outlineText = material?.content || "";
        
        if (outlineText && outlineText.length >= 10) {
          const extractedTopics = await parseOutline(outlineText);
          if (extractedTopics && extractedTopics.length > 0) {
            topics = extractedTopics.map((t, idx) => ({
              id: `topic-${idx}-${Math.random().toString(36).substr(2, 4)}`,
              title: t.title || "Untitled Topic",
              description: t.description || "",
              linkedMaterialIds: [],
              status: 'pending' as const
            }));
          }
        }
      }
      
      // If no topics from outline, try to parse from manual input
      if (topics.length === 0 && newTopics.trim()) {
        const topicLines = newTopics.split('\n').filter(line => line.trim());
        topics = topicLines.map((line, idx) => ({
          id: `topic-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          title: line.trim().substring(0, 50),
          description: "",
          linkedMaterialIds: [],
          status: 'pending' as const
        }));
      }
      
      // If still no topics, create empty course
      if (topics.length === 0) {
        topics = [{
          id: `topic-0-${Math.random().toString(36).substr(2, 4)}`,
          title: "Getting Started",
          description: "Start learning this course",
          linkedMaterialIds: [],
          status: 'pending' as const
        }];
      }

      const newCourse: Course = {
        id: Math.random().toString(36).substr(2, 9),
        name: newCourseName,
        outlineMaterialId: selectedOutlineId,
        topics
      };

      setCourses(prev => [...prev, newCourse]);
      setIsAddingCourse(false);
      setNewCourseName('');
      setSelectedOutlineId('');
      setNewTopics('');
      setActiveCourseId(newCourse.id);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to parse outline.");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoMap = async () => {
    const activeCourse = courses.find(c => c.id === activeCourseId);
    if (!activeCourse || materials.length === 0) return;

    setMappingLoading(true);
    try {
      const mappings = await autoMapMaterialsToTopics(activeCourse.topics, materials);
      
      setCourses(prev => prev.map(course => {
        if (course.id !== activeCourseId) return course;
        return {
          ...course,
          topics: course.topics.map(topic => {
            const match = mappings.find(m => m.topicId === topic.id);
            if (!match) return topic;
            const combined = Array.from(new Set([...topic.linkedMaterialIds, ...match.materialIds]));
            return { ...topic, linkedMaterialIds: combined };
          })
        };
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setMappingLoading(false);
    }
  };

  const activeCourse = courses.find(c => c.id === activeCourseId);

  const toggleLinkMaterial = (topicId: string, materialId: string) => {
    setCourses(prev => prev.map(course => {
      if (course.id !== activeCourseId) return course;
      return {
        ...course,
        topics: course.topics.map(topic => {
          if (topic.id !== topicId) return topic;
          const isLinked = topic.linkedMaterialIds.includes(materialId);
          return {
            ...topic,
            linkedMaterialIds: isLinked 
              ? topic.linkedMaterialIds.filter(id => id !== materialId)
              : [...topic.linkedMaterialIds, materialId]
          };
        })
      };
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Course Planner</h2>
          <p className="text-slate-500">Interactive learning paths derived from your syllabi.</p>
        </div>
        <button 
          onClick={() => setIsAddingCourse(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
        >
          <span>➕</span> New Course Unit
        </button>
      </div>

      {isAddingCourse && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl mb-8 animate-in slide-in-from-top-4">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Create Learning Unit</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label htmlFor="courseName" className="text-xs font-bold text-slate-400 uppercase">Unit Name</label>
              <input 
                id="courseName"
                type="text" 
                value={newCourseName}
                onChange={e => setNewCourseName(e.target.value)}
                placeholder="e.g. Intro to Quantum Mechanics"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="outlineSelect" className="text-xs font-bold text-slate-400 uppercase">Select Syllabus from Vault</label>
              <select 
                id="outlineSelect"
                value={selectedOutlineId}
                onChange={e => setSelectedOutlineId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Choose Syllabus (Optional) --</option>
                {outlines.length > 0 && (
                  <optgroup label="Extracted Syllabi">
                    {outlines.map(o => (
                      <option key={o.id} value={o.id}>{o.title}</option>
                    ))}
                  </optgroup>
                )}
                {others.length > 0 && (
                  <optgroup label="Other Documents">
                    {others.map(o => (
                      <option key={o.id} value={o.id}>{o.title}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>
          <div className="space-y-2 mb-6">
            <label htmlFor="manualTopics" className="text-xs font-bold text-slate-400 uppercase">Or enter topics manually (one per line)</label>
            <textarea 
              id="manualTopics"
              value={newTopics}
              onChange={e => setNewTopics(e.target.value)}
              placeholder="Introduction to Physics&#10;Newton's Laws&#10;Kinematics&#10;Thermodynamics"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
            />
          </div>
          <div className="flex gap-3">
            {error && (
              <div className="w-full bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
                {error}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleCreateCourse}
              disabled={loading || !newCourseName}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Processing...' : 'Generate Roadmap'}
            </button>
            <button 
              onClick={() => setIsAddingCourse(false)}
              className="px-6 py-3 border border-slate-200 rounded-xl text-slate-500 font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Your Courses</h3>
          {courses.map(course => (
            <div key={course.id} className={`relative group ${activeCourseId === course.id ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'} rounded-2xl border transition-all`}>
              <button
                onClick={() => setActiveCourseId(course.id)}
                className="w-full text-left p-4 pr-10"
              >
                <div className={`font-bold truncate ${activeCourseId === course.id ? 'text-white' : 'text-slate-800'}`}>{course.name}</div>
                <div className={`text-[10px] mt-1 ${activeCourseId === course.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {course.topics.length} Study Topics
                </div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                  activeCourseId === course.id 
                    ? 'hover:bg-indigo-700 text-indigo-200 hover:text-white' 
                    : 'hover:bg-red-50 text-slate-400 hover:text-red-500'
                }`}
                title="Delete course"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        <div className="lg:col-span-3">
          {activeCourse ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{activeCourse.name}</h3>
                  <p className="text-xs text-slate-400">Interact with topics below to start learning.</p>
                </div>
                <button 
                  onClick={handleAutoMap}
                  disabled={mappingLoading || materials.length < 2}
                  className="bg-white border border-indigo-200 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {mappingLoading ? 'Mapping...' : '✨ Magic Auto-Link'}
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {activeCourse.topics.map((topic, idx) => (
                  <div key={topic.id} className="relative pl-8 border-l-2 border-slate-100 pb-8 last:pb-0">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-indigo-600 z-10"></div>
                    
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-all group">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-800 text-lg">{idx + 1}. {topic.title}</h4>
                          <p className="text-xs text-slate-500 italic">"{topic.description}"</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => onStudyTopic(topic)}
                            disabled={topic.linkedMaterialIds.length === 0}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md disabled:opacity-30 flex items-center gap-2"
                          >
                            <span>🤖</span> Learn with AI
                          </button>
                          <button 
                            onClick={() => onGenerateFlashcardsForTopic(topic)}
                            disabled={topic.linkedMaterialIds.length === 0}
                            className="bg-violet-50 text-violet-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-violet-100 transition-all disabled:opacity-30"
                          >
                            <span>📇</span> Cards
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Linked Materials</h5>
                          {topic.linkedMaterialIds.length === 0 && (
                            <span className="text-[9px] text-amber-500 font-bold animate-pulse">⚠️ No notes linked! Tap notes below to add context.</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {materials.filter(m => m.id !== activeCourse.outlineMaterialId).map(mat => {
                            const isLinked = topic.linkedMaterialIds.includes(mat.id);
                            return (
                              <button
                                key={mat.id}
                                onClick={() => toggleLinkMaterial(topic.id, mat.id)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                  isLinked 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                                    : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-100'
                                }`}
                              >
                                {isLinked ? '✓' : '+'} {mat.title}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-100 h-full rounded-3xl flex flex-col items-center justify-center p-12 text-center opacity-40">
              <div className="text-8xl mb-6">🧭</div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Select a Course Unit</h3>
              <p className="max-w-md text-slate-500">Pick a syllabus-driven roadmap to begin targeted study sessions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursePlannerView;
