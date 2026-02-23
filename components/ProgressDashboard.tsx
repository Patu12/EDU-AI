
import React from 'react';
import { UserStats, CourseProgress, Course, Badge } from '../types';

interface Props {
  userStats: UserStats;
  courseProgress: CourseProgress[];
  courses: Course[];
}

const ProgressDashboard: React.FC<Props> = ({ userStats, courseProgress, courses }) => {
  
  const getBadgeIcon = (badgeId: string) => {
    const icons: Record<string, string> = {
      'first-quiz': '🎯',
      'streak-3': '🔥',
      'streak-7': '⚡',
      'streak-30': '🌟',
      'hours-10': '⏰',
      'hours-50': '🏆',
      'master-flashcards': '📇',
      'perfect-quiz': '💯',
      'early-bird': '🌅',
      'night-owl': '🦉'
    };
    return icons[badgeId] || '🏅';
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const getCourseProgressPercent = (courseId: string) => {
    const cp = courseProgress.find(c => c.courseId === courseId);
    if (!cp) return 0;
    const totalTopics = courses.find(c => c.id === courseId)?.topics.length || 1;
    const masteredTopics = courses.find(c => c.id === courseId)?.topics.filter(
      t => cp.topicsProgress.find(tp => tp.topicId === t.id && tp.quizScore >= 80)?.quizScore
    ).length || 0;
    return Math.round((masteredTopics / totalTopics) * 100);
  };

  const getTodayProgress = () => {
    const goalMinutes = userStats.dailyGoal.targetMinutes;
    const completedMinutes = userStats.dailyGoal.completedMinutes;
    return Math.min(100, Math.round((completedMinutes / goalMinutes) * 100));
  };

  const availableBadges = [
    { id: 'first-quiz', name: 'Quiz Starter', desc: 'Complete your first quiz', icon: '🎯', earned: userStats.badges.some(b => b.id === 'first-quiz') },
    { id: 'streak-3', name: '3 Day Streak', desc: 'Study 3 days in a row', icon: '🔥', earned: userStats.badges.some(b => b.id === 'streak-3') },
    { id: 'streak-7', name: 'Week Warrior', desc: 'Study 7 days in a row', icon: '⚡', earned: userStats.badges.some(b => b.id === 'streak-7') },
    { id: 'hours-10', name: 'Dedicated', desc: 'Study for 10 hours total', icon: '⏰', earned: userStats.badges.some(b => b.id === 'hours-10') },
    { id: 'master-flashcards', name: 'Memory Master', desc: 'Review 100 flashcards', icon: '📇', earned: userStats.badges.some(b => b.id === 'master-flashcards') },
    { id: 'perfect-quiz', name: 'Perfect Score', desc: 'Get 100% on a quiz', icon: '💯', earned: userStats.badges.some(b => b.id === 'perfect-quiz') },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Your Progress</h2>
        <p className="text-slate-500">Track your learning journey</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center">
          <div className="text-3xl mb-1">⭐</div>
          <div className="text-2xl font-black text-slate-800">Level {userStats.level}</div>
          <div className="text-xs font-bold text-slate-400 uppercase">Current Level</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center">
          <div className="text-3xl mb-1">🔥</div>
          <div className="text-2xl font-black text-slate-800">{userStats.currentStreak}</div>
          <div className="text-xs font-bold text-slate-400 uppercase">Day Streak</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center">
          <div className="text-3xl mb-1">⏱️</div>
          <div className="text-2xl font-black text-slate-800">{formatTime(userStats.totalStudyTime)}</div>
          <div className="text-xs font-bold text-slate-400 uppercase">Study Time</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center">
          <div className="text-3xl mb-1">📝</div>
          <div className="text-2xl font-black text-slate-800">{userStats.totalQuizzesTaken}</div>
          <div className="text-xs font-bold text-slate-400 uppercase">Quizzes</div>
        </div>
      </div>

      {/* Daily Goal */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">Today's Goal</h3>
          <span className="text-sm font-bold text-slate-500">
            {userStats.dailyGoal.completedMinutes} / {userStats.dailyGoal.targetMinutes} min
          </span>
        </div>
        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
            style={{ width: `${getTodayProgress()}%` }}
          />
        </div>
        <div className="mt-2 text-center">
          <span className={`text-sm font-bold ${getTodayProgress() >= 100 ? 'text-emerald-500' : 'text-indigo-600'}`}>
            {getTodayProgress() >= 100 ? '🎉 Goal Complete!' : `${100 - getTodayProgress()} minutes to go`}
          </span>
        </div>
      </div>

      {/* Course Progress */}
      {courses.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4">Course Progress</h3>
          <div className="space-y-4">
            {courses.map(course => {
              const percent = getCourseProgressPercent(course.id);
              return (
                <div key={course.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{course.name}</span>
                    <span className="font-bold text-indigo-600">{percent}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-4">Achievements</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {availableBadges.map(badge => (
            <div 
              key={badge.id}
              className={`p-4 rounded-xl text-center transition-all ${
                badge.earned 
                  ? 'bg-gradient-to-br from-amber-50 to-yellow-100 border-2 border-amber-300' 
                  : 'bg-slate-50 border-2 border-slate-100 opacity-40'
              }`}
            >
              <div className="text-3xl mb-1">{badge.icon}</div>
              <div className="text-xs font-bold text-slate-700">{badge.name}</div>
              {badge.earned && <div className="text-[10px] text-emerald-600">✓ Earned</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Study Tips */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <h3 className="font-bold mb-3">💡 Study Tips</h3>
        <ul className="space-y-2 text-sm opacity-90">
          <li>• Use the Pomodoro timer to stay focused - 25 min study, 5 min break!</li>
          <li>• Review flashcards daily for better retention</li>
          <li>• Take quizzes after studying to test your understanding</li>
          <li>• Link your materials to course topics for organized learning</li>
        </ul>
      </div>
    </div>
  );
};

export default ProgressDashboard;
