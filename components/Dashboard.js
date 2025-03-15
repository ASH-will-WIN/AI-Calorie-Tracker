import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfWeek, addDays } from 'date-fns';

export default function Dashboard() {
  const [todayStats, setTodayStats] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [weeklyData, setWeeklyData] = useState([]);

  const fetchData = () => {
    fetchTodayStats();
    fetchWeeklyData();
  };

  useEffect(() => {
    fetchData();
    
    // Listen for new meals
    window.addEventListener('mealAdded', fetchData);
    
    return () => {
      window.removeEventListener('mealAdded', fetchData);
    };
  }, []);

  async function fetchTodayStats() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('meals')
      .select('calories, protein, carbs, fat')
      .gte('created_at', today);

    if (error) {
      console.error('Error fetching today stats:', error);
      return;
    }

    const stats = data.reduce((acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fat: acc.fat + meal.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    setTodayStats(stats);
  }

  async function fetchWeeklyData() {
    const startDate = startOfWeek(new Date()).toISOString();
    const { data, error } = await supabase
      .from('meals')
      .select('calories, created_at')
      .gte('created_at', startDate)
      .order('created_at');

    if (error) {
      console.error('Error fetching weekly data:', error);
      return;
    }

    // Group by day
    const dailyTotals = data.reduce((acc, meal) => {
      const day = meal.created_at.split('T')[0];
      acc[day] = (acc[day] || 0) + meal.calories;
      return acc;
    }, {});

    // Create array for last 7 days
    const weekData = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(startOfWeek(new Date()), i);
      const day = format(date, 'yyyy-MM-dd');
      return {
        date: format(date, 'EEE'),
        calories: dailyTotals[day] || 0
      };
    });

    setWeeklyData(weekData);
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm hover:shadow transition-shadow">
          <h3 className="text-sm text-gray-500">Calories</h3>
          <p className="text-2xl font-semibold">{Math.round(todayStats.calories)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm hover:shadow transition-shadow">
          <h3 className="text-sm text-gray-500">Protein</h3>
          <p className="text-2xl font-semibold">{Math.round(todayStats.protein)}g</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm hover:shadow transition-shadow">
          <h3 className="text-sm text-gray-500">Carbs</h3>
          <p className="text-2xl font-semibold">{Math.round(todayStats.carbs)}g</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm hover:shadow transition-shadow">
          <h3 className="text-sm text-gray-500">Fat</h3>
          <p className="text-2xl font-semibold">{Math.round(todayStats.fat)}g</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Weekly Calories</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="calories" 
                stroke="#4F46E5" 
                strokeWidth={2}
                dot={{ fill: '#4F46E5' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
