import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { format, isToday, isYesterday, startOfWeek, endOfWeek } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Coffee,
  Utensils,
  Cookie,
  Apple,
  ArrowLeft
} from 'lucide-react';

export default function MealHistory({ onBack }) {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [expandedDays, setExpandedDays] = useState(new Set());
  const [sortBy, setSortBy] = useState('date');

  const filters = [
    { value: 'all', label: 'All Meals' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this-week', label: 'This Week' },
  ];

  const mealIcons = {
    breakfast: Coffee,
    lunch: Utensils,
    dinner: Utensils,
    snack: Cookie,
    default: Apple
  };

  useEffect(() => {
    fetchMeals();
    window.addEventListener('mealAdded', fetchMeals);
    return () => window.removeEventListener('mealAdded', fetchMeals);
  }, []);

  async function fetchMeals() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMeals(data);
    } catch (error) {
      console.error('Error fetching meals:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteMeal(id) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      fetchMeals();
      window.dispatchEvent(new CustomEvent('mealAdded'));
    } catch (error) {
      console.error('Error deleting meal:', error);
    }
  }

  const getMealCategory = (meal) => {
    const hour = new Date(meal.created_at).getHours();
    if (hour < 11) return 'breakfast';
    if (hour < 16) return 'lunch';
    if (hour < 21) return 'dinner';
    return 'snack';
  };

  const getMealIcon = (meal) => {
    const category = getMealCategory(meal);
    return mealIcons[category] || mealIcons.default;
  };

  const filterMeals = (meals) => {
    let filtered = meals;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(meal =>
        meal.food_description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply date filter
    switch (selectedFilter) {
      case 'today':
        filtered = filtered.filter(meal => isToday(new Date(meal.created_at)));
        break;
      case 'yesterday':
        filtered = filtered.filter(meal => isYesterday(new Date(meal.created_at)));
        break;
      case 'this-week':
        const weekStart = startOfWeek(new Date());
        const weekEnd = endOfWeek(new Date());
        filtered = filtered.filter(meal => {
          const mealDate = new Date(meal.created_at);
          return mealDate >= weekStart && mealDate <= weekEnd;
        });
        break;
      default:
        break;
    }

    return filtered;
  };

  const sortMeals = (meals) => {
    const sorted = [...meals];
    switch (sortBy) {
      case 'calories-high':
        return sorted.sort((a, b) => b.calories - a.calories);
      case 'calories-low':
        return sorted.sort((a, b) => a.calories - b.calories);
      case 'date':
      default:
        return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  };

  const groupMealsByDay = (meals) => {
    const grouped = {};
    meals.forEach(meal => {
      const date = format(new Date(meal.created_at), 'yyyy-MM-dd');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(meal);
    });
    return grouped;
  };

  const getDayStats = (dayMeals) => {
    return dayMeals.reduce((stats, meal) => ({
      calories: stats.calories + meal.calories,
      protein: stats.protein + meal.protein,
      carbs: stats.carbs + meal.carbs,
      fat: stats.fat + meal.fat,
      count: stats.count + 1
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 });
  };

  const toggleDayExpansion = (date) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  const filteredAndSortedMeals = sortMeals(filterMeals(meals));
  const groupedMeals = groupMealsByDay(filteredAndSortedMeals);

  const MealItem = ({ meal, showDate = false }) => {
    const Icon = getMealIcon(meal);
    const category = getMealCategory(meal);

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="p-4 hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-b-0"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-lg ${
              category === 'breakfast' ? 'bg-orange-100' :
              category === 'lunch' ? 'bg-blue-100' :
              category === 'dinner' ? 'bg-purple-100' :
              'bg-green-100'
            }`}>
              <Icon className={`w-4 h-4 ${
                category === 'breakfast' ? 'text-orange-600' :
                category === 'lunch' ? 'text-blue-600' :
                category === 'dinner' ? 'text-purple-600' :
                'text-green-600'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-neutral-900 truncate">{meal.food_description}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-900">
                    {Math.round(meal.calories)} cal
                  </span>
                  <button
                    onClick={() => deleteMeal(meal.id)}
                    className="p-1 text-neutral-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {showDate && (
                <p className="text-xs text-neutral-500 mb-2">
                  {format(new Date(meal.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              )}
              <div className="flex gap-4 text-xs text-neutral-600">
                <span>P: {Math.round(meal.protein)}g</span>
                <span>C: {Math.round(meal.carbs)}g</span>
                <span>F: {Math.round(meal.fat)}g</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const DayGroup = ({ date, meals }) => {
    const isExpanded = expandedDays.has(date);
    const dayStats = getDayStats(meals);
    const isTodayDate = isToday(new Date(date));
    const isYesterdayDate = isYesterday(new Date(date));
    
    let dayLabel = format(new Date(date), 'EEEE, MMM d');
    if (isTodayDate) dayLabel = 'Today';
    if (isYesterdayDate) dayLabel = 'Yesterday';

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        <button
          onClick={() => toggleDayExpansion(date)}
          className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-neutral-500" />
            <div className="text-left">
              <h3 className="font-semibold text-neutral-900">{dayLabel}</h3>
              <p className="text-sm text-neutral-600">
                {meals.length} meal{meals.length !== 1 ? 's' : ''} • {Math.round(dayStats.calories)} calories
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-neutral-900">
                {Math.round(dayStats.calories)} cal
              </div>
              <div className="text-xs text-neutral-600">
                P: {Math.round(dayStats.protein)}g • C: {Math.round(dayStats.carbs)}g • F: {Math.round(dayStats.fat)}g
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-neutral-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-500" />
            )}
          </div>
        </button>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-neutral-100"
            >
              {meals.map((meal) => (
                <MealItem key={meal.id} meal={meal} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-neutral-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Back Button */}
      <div className="mb-2 flex items-center">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : window.history.back())}
          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 font-medium mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Meal History</h2>
          <p className="text-neutral-600 mt-1">Track your eating patterns over time</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search meals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          {/* Date Filter */}
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="input-field max-w-xs"
          >
            {filters.map(filter => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-field max-w-xs"
          >
            <option value="date">Sort by Date</option>
            <option value="calories-high">Most Calories</option>
            <option value="calories-low">Least Calories</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {Object.keys(groupedMeals).length === 0 ? (
          <div className="card p-8 text-center">
            <Calendar className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No meals found</h3>
            <p className="text-neutral-600">
              {searchTerm || selectedFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Start by adding your first meal'
              }
            </p>
          </div>
        ) : (
          Object.entries(groupedMeals).map(([date, dayMeals]) => (
            <DayGroup key={date} date={date} meals={dayMeals} />
          ))
        )}
      </div>
    </div>
  );
} 