import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { format, isToday } from 'date-fns';

export default function MealHistory() {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeals();
    // Listen for meal updates
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
        .limit(20);

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
        .eq('user_id', user.id); // Ensure users can only delete their own meals

      if (error) throw error;
      
      // Refresh the meals list and trigger dashboard update
      fetchMeals();
      window.dispatchEvent(new CustomEvent('mealAdded'));
    } catch (error) {
      console.error('Error deleting meal:', error);
    }
  }

  const todayMeals = meals.filter(meal => 
    isToday(new Date(meal.created_at))
  );

  const previousMeals = meals.filter(meal => 
    !isToday(new Date(meal.created_at))
  );

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse bg-white rounded-lg shadow p-4">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded w-3/4"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const MealItem = ({ meal, showDate = true }) => (
    <div className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center">
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">{meal.food_description}</p>
          <button
            onClick={() => deleteMeal(meal.id)}
            className="ml-2 text-red-600 hover:text-red-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        {showDate && (
          <p className="text-xs text-gray-500">
            {format(new Date(meal.created_at), 'MMM d, yyyy h:mm a')}
          </p>
        )}
      </div>
      <div className="flex space-x-4 text-sm text-gray-500">
        <div>
          <span className="font-medium text-gray-900">{Math.round(meal.calories)}</span> cal
        </div>
        <div className="hidden sm:block">
          <span className="font-medium text-gray-900">{Math.round(meal.protein)}g</span> protein
        </div>
        <div className="hidden sm:block">
          <span className="font-medium text-gray-900">{Math.round(meal.carbs)}g</span> carbs
        </div>
        <div className="hidden sm:block">
          <span className="font-medium text-gray-900">{Math.round(meal.fat)}g</span> fat
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Today's Meals */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-indigo-50">
          <h2 className="text-lg font-semibold text-gray-900">Today's Meals</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {todayMeals.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 text-center">No meals logged today</p>
          ) : (
            todayMeals.map((meal) => (
              <MealItem key={meal.id} meal={meal} showDate={false} />
            ))
          )}
        </div>
      </div>

      {/* Previous Meals */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Previous Meals</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {previousMeals.map((meal) => (
            <MealItem key={meal.id} meal={meal} />
          ))}
        </div>
      </div>
    </div>
  );
} 