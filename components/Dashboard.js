import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { format, startOfWeek, addDays, isToday, isYesterday } from 'date-fns';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Apple,
  Coffee,
  Utensils,
  Cookie,
  Lightbulb,
  ChevronRight,
  Calendar,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import GoalSettings from './GoalSettings';

function getLocalDayStartISO() {
  const localMidnight = new Date();
  localMidnight.setHours(0, 0, 0, 0);
  return localMidnight.toISOString();
}

export default function Dashboard({ onTabChange }) {
  const [todayStats, setTodayStats] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [weeklyData, setWeeklyData] = useState([]);
  const [macroData, setMacroData] = useState([]);
  const [mealDistribution, setMealDistribution] = useState([]);
  const [userGoals, setUserGoals] = useState({ calories: 2000, protein: 150, carbs: 250, fat: 65 });
  const [aiInsights, setAiInsights] = useState([]);
  const [insightsGeneratedAt, setInsightsGeneratedAt] = useState(null);
  const [insightsStale, setInsightsStale] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showGoalSettings, setShowGoalSettings] = useState(false);

  const COLORS = ['#22c55e', '#f97316', '#3b82f6', '#8b5cf6'];

  const fetchData = () => {
    fetchTodayStats();
    fetchWeeklyData();
    fetchMacroData();
    fetchMealDistribution();
    fetchUserGoals();
    loadCachedInsights();
  };

  useEffect(() => {
    fetchData();

    window.addEventListener('mealAdded', fetchData);

    return () => {
      window.removeEventListener('mealAdded', fetchData);
    };
  }, []);

  async function fetchTodayStats() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('meals')
        .select('calories, protein, carbs, fat')
        .eq('user_id', user.id)
        .gte('created_at', getLocalDayStartISO());

      if (error) throw error;

      const stats = data.reduce((acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fat: acc.fat + meal.fat,
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      setTodayStats(stats);
    } catch (error) {
      console.error('Error fetching today stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchWeeklyData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get local start of week
    const startDate = startOfWeek(new Date()).toISOString();
    const { data, error } = await supabase
      .from('meals')
      .select('calories, created_at')
      .eq('user_id', user.id)
      .gte('created_at', startDate)
      .order('created_at');

    if (error) {
      console.error('Error fetching weekly data:', error);
      return;
    }

    // Group by day (converting UTC to local time)
    const dailyTotals = data.reduce((acc, meal) => {
      const day = format(new Date(meal.created_at), 'yyyy-MM-dd');
      acc[day] = (acc[day] || 0) + meal.calories;
      return acc;
    }, {});

    const weekData = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(startOfWeek(new Date()), i);
      const day = format(date, 'yyyy-MM-dd');
      return {
        date: format(date, 'EEE'),
        calories: dailyTotals[day] || 0,
        day: format(date, 'MMM d')
      };
    });

    setWeeklyData(weekData);
  }

  async function fetchMacroData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = getLocalDayStartISO();
    const { data, error } = await supabase
      .from('meals')
      .select('protein, carbs, fat')
      .eq('user_id', user.id)
      .gte('created_at', today);

    if (error) return;

    const totals = data.reduce((acc, meal) => ({
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fat: acc.fat + meal.fat,
    }), { protein: 0, carbs: 0, fat: 0 });

    const total = totals.protein + totals.carbs + totals.fat;
    if (total === 0) {
      setMacroData([]);
      return;
    }

    setMacroData([
      { name: 'Protein', value: Math.round((totals.protein / total) * 100), grams: totals.protein },
      { name: 'Carbs', value: Math.round((totals.carbs / total) * 100), grams: totals.carbs },
      { name: 'Fat', value: Math.round((totals.fat / total) * 100), grams: totals.fat },
    ]);
  }

  async function fetchMealDistribution() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = getLocalDayStartISO();
    const { data, error } = await supabase
      .from('meals')
      .select('calories, created_at')
      .eq('user_id', user.id)
      .gte('created_at', today);

    if (error) return;

    const hourlyDistribution = data.reduce((acc, meal) => {
      const hour = new Date(meal.created_at).getHours();
      const timeSlot = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
      acc[timeSlot] = (acc[timeSlot] || 0) + meal.calories;
      return acc;
    }, {});

    setMealDistribution([
      { name: 'Morning', calories: hourlyDistribution.Morning || 0, icon: Coffee },
      { name: 'Afternoon', calories: hourlyDistribution.Afternoon || 0, icon: Utensils },
      { name: 'Evening', calories: hourlyDistribution.Evening || 0, icon: Cookie },
    ]);
  }

  async function fetchUserGoals() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setUserGoals(data);
    }
  }

  async function getInsightsToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }

  function getInsightsHeaders(token) {
    return {
      Authorization: `Bearer ${token}`,
      'X-Time-Zone': Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  async function loadCachedInsights() {
    const token = await getInsightsToken();
    if (!token) return;

    try {
      const response = await fetch('/api/insights', {
        headers: getInsightsHeaders(token),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load saved insights.');
      setAiInsights(result.insights || []);
      setInsightsGeneratedAt(result.generatedAt || null);
      setInsightsStale(Boolean(result.stale));
      setInsightsError('');
    } catch (error) {
      console.error('Could not load cached insights:', error);
      setInsightsError(error.message);
    }
  }

  async function refreshInsights() {
    const token = await getInsightsToken();
    if (!token) {
      setInsightsError('Sign in again to refresh your insights.');
      return;
    }

    setInsightsLoading(true);
    setInsightsError('');
    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: {
          ...getInsightsHeaders(token),
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not refresh insights.');
      setAiInsights(result.insights || []);
      setInsightsGeneratedAt(result.generatedAt || null);
      setInsightsStale(false);
    } catch (error) {
      console.error('Could not refresh insights:', error);
      setInsightsError(error.message);
    } finally {
      setInsightsLoading(false);
    }
  }

  const calorieProgress = (todayStats.calories / userGoals.calories) * 100;
  const remainingCalories = Math.max(0, userGoals.calories - todayStats.calories);

  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'primary' }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-600">{title}</p>
          <p className="text-2xl font-bold text-neutral-900">{value}</p>
          {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </motion.div>
  );

  const ProgressRing = ({ progress, size = 120, strokeWidth = 8 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="progress-ring">
          <circle
            className="progress-ring-circle"
            stroke="rgb(var(--neutral-200))"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            className="progress-ring-circle"
            stroke={progress > 100 ? '#ef4444' : '#22c55e'}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        <div className="absolute text-center">
          <div className="text-2xl font-bold text-neutral-900">{Math.round(progress)}%</div>
          <div className="text-sm text-neutral-600">Goal</div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-neutral-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Dashboard</h1>
          <p className="text-neutral-600 mt-1">Track your nutrition and get personalized insights</p>
        </div>
        <button
          onClick={() => setShowGoalSettings(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Target className="w-4 h-4" />
          Set Goals
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Today's Calories"
          value={Math.round(todayStats.calories)}
          subtitle={`${remainingCalories} remaining`}
          icon={Activity}
          color="primary"
        />
        <StatCard
          title="Protein"
          value={`${Math.round(todayStats.protein)}g`}
          subtitle={`${Math.round((todayStats.protein / userGoals.protein) * 100)}% of goal`}
          icon={Apple}
          color="secondary"
        />
        <StatCard
          title="Carbs"
          value={`${Math.round(todayStats.carbs)}g`}
          subtitle={`${Math.round((todayStats.carbs / userGoals.carbs) * 100)}% of goal`}
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="Fat"
          value={`${Math.round(todayStats.fat)}g`}
          subtitle={`${Math.round((todayStats.fat / userGoals.fat) * 100)}% of goal`}
          icon={TrendingDown}
          color="purple"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Progress and Charts */}
        <div className="lg:col-span-2 space-y-8">
          {/* Calorie Progress */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-neutral-900">Daily Progress</h3>
              <div className="text-sm text-neutral-600">
                {format(new Date(), 'MMM d, yyyy')}
              </div>
            </div>
            <div className="flex items-center justify-center">
              <ProgressRing progress={calorieProgress} />
            </div>
            <div className="mt-6 text-center">
              <p className="text-sm text-neutral-600">
                {remainingCalories > 0
                  ? `${remainingCalories} calories remaining today`
                  : `${Math.abs(remainingCalories)} calories over goal`
                }
              </p>
            </div>
          </div>

          {/* Weekly Trend */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-6">Weekly Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--neutral-200))" />
                  <XAxis
                    dataKey="date"
                    stroke="rgb(var(--neutral-500))"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="rgb(var(--neutral-500))"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgb(var(--surface-color))',
                      border: '1px solid rgb(var(--neutral-200))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="calories"
                    stroke="#22c55e"
                    strokeWidth={3}
                    dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#22c55e', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Macro Distribution */}
          {macroData.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-6">Macro Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={macroData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {macroData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  {macroData.map((macro, index) => (
                    <div key={macro.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium text-neutral-900">{macro.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-neutral-900">{macro.value}%</div>
                        <div className="text-sm text-neutral-600">{Math.round(macro.grams)}g</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Insights and Meal Distribution */}
        <div className="space-y-8">
          {/* AI Insights */}
          <div className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-secondary-600" />
                <h3 className="text-lg font-semibold text-neutral-900">AI Insights</h3>
              </div>
              <button
                type="button"
                onClick={refreshInsights}
                disabled={insightsLoading}
                className="btn-secondary px-3 py-2 text-sm disabled:opacity-60"
              >
                {insightsLoading ? 'Thinking…' : 'Refresh insights'}
              </button>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              {insightsGeneratedAt && <span>Updated {format(new Date(insightsGeneratedAt), 'MMM d, h:mm a')}</span>}
              {insightsStale && <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">New data since last refresh</span>}
            </div>
            {insightsError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{insightsError}</p>}
            <div className="space-y-4">
              {aiInsights.length > 0 ? (
                aiInsights.map((insight, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border-l-4 ${insight.type === 'warning'
                        ? 'bg-red-50 border-red-400'
                        : 'bg-blue-50 border-blue-400'
                      }`}
                  >
                    <h4 className="font-medium text-neutral-900 mb-1">{insight.title}</h4>
                    <p className="text-sm text-neutral-600 mb-2">{insight.message}</p>
                    <p className="text-sm font-medium text-neutral-700"><span className="font-semibold">Try:</span> {insight.suggestion}</p>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Lightbulb className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-sm text-neutral-500">
                    {insightsGeneratedAt
                      ? 'No clear pattern stood out in this week’s logged meals yet.'
                      : 'Refresh to get a few practical ideas based on your recent meals and goals.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Meal Distribution */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-6">Today's Meal Distribution</h3>
            <div className="space-y-4">
              {mealDistribution.map((meal, index) => {
                const Icon = meal.icon;
                const totalCalories = mealDistribution.reduce((sum, m) => sum + m.calories, 0);
                const percentage = totalCalories > 0 ? (meal.calories / totalCalories) * 100 : 0;

                return (
                  <div key={meal.name} className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-neutral-100">
                      <Icon className="w-4 h-4 text-neutral-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-neutral-900">{meal.name}</span>
                        <span className="text-sm text-neutral-600">{Math.round(meal.calories)} cal</span>
                      </div>
                      <div className="w-full bg-neutral-200 rounded-full h-2">
                        <div
                          className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => onTabChange && onTabChange('add-meal')}
                className="w-full btn-primary flex items-center justify-between hover:bg-primary-700 transition-colors"
              >
                <span>Add Meal</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onTabChange && onTabChange('history')}
                className="w-full btn-secondary flex items-center justify-between hover:bg-neutral-100 transition-colors"
              >
                <span>View History</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowGoalSettings(true)}
                className="w-full btn-secondary flex items-center justify-between hover:bg-neutral-100 transition-colors"
              >
                <span>Set Goals</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Goal Settings Modal */}
      <GoalSettings
        isOpen={showGoalSettings}
        onClose={() => setShowGoalSettings(false)}
        onGoalsUpdated={(newGoals) => {
          setUserGoals(newGoals);
          fetchData(); // Refresh all data with new goals
        }}
      />
    </div>
  );
}
