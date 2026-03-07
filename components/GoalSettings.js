import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  Save, 
  X, 
  Calculator,
  TrendingUp,
  Apple,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function GoalSettings({ isOpen, onClose, onGoalsUpdated }) {
  const [goals, setGoals] = useState({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65,
    fiber: 25,
    sodium: 2300,
    sugar: 50
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchGoals();
    }
  }, [isOpen]);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setGoals(data);
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
      setError('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_goals')
        .upsert([{
          user_id: user.id,
          ...goals,
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setSuccess(true);
      if (onGoalsUpdated) {
        onGoalsUpdated(data);
      }

      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 3000);

    } catch (error) {
      console.error('Error saving goals:', error);
      setError('Failed to save goals');
    } finally {
      setSaving(false);
    }
  };

  const calculateMacroCalories = () => {
    const proteinCalories = goals.protein * 4;
    const carbCalories = goals.carbs * 4;
    const fatCalories = goals.fat * 9;
    const total = proteinCalories + carbCalories + fatCalories;
    
    return {
      protein: proteinCalories,
      carbs: carbCalories,
      fat: fatCalories,
      total
    };
  };

  const macroCalories = calculateMacroCalories();
  const calorieDifference = Math.abs(goals.calories - macroCalories.total);

  const handleInputChange = (field, value) => {
    const numValue = parseInt(value) || 0;
    setGoals(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const presetGoals = [
    { name: 'Weight Loss', calories: 1500, protein: 120, carbs: 150, fat: 50 },
    { name: 'Maintenance', calories: 2000, protein: 150, carbs: 250, fat: 65 },
    { name: 'Muscle Gain', calories: 2500, protein: 180, carbs: 300, fat: 80 },
    { name: 'Athlete', calories: 3000, protein: 200, carbs: 400, fat: 100 }
  ];

  const applyPreset = (preset) => {
    setGoals(prev => ({
      ...prev,
      calories: preset.calories,
      protein: preset.protein,
      carbs: preset.carbs,
      fat: preset.fat
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-neutral-900">Set Your Goals</h2>
                  <p className="text-sm text-neutral-600">Customize your daily nutrition targets</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
              <p className="text-neutral-600">Loading your goals...</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Preset Goals */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Quick Presets</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {presetGoals.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      className="p-3 border border-neutral-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
                    >
                      <div className="font-medium text-neutral-900 text-sm">{preset.name}</div>
                      <div className="text-xs text-neutral-600">{preset.calories} cal</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Goals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Calories */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Daily Calories
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Target Calories
                    </label>
                    <input
                      type="number"
                      value={goals.calories}
                      onChange={(e) => handleInputChange('calories', e.target.value)}
                      className="input-field"
                      min="1000"
                      max="5000"
                    />
                  </div>
                </div>

                {/* Macros */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-blue-500" />
                    Macronutrients
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Protein (g)
                      </label>
                      <input
                        type="number"
                        value={goals.protein}
                        onChange={(e) => handleInputChange('protein', e.target.value)}
                        className="input-field"
                        min="20"
                        max="300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Carbs (g)
                      </label>
                      <input
                        type="number"
                        value={goals.carbs}
                        onChange={(e) => handleInputChange('carbs', e.target.value)}
                        className="input-field"
                        min="50"
                        max="600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Fat (g)
                      </label>
                      <input
                        type="number"
                        value={goals.fat}
                        onChange={(e) => handleInputChange('fat', e.target.value)}
                        className="input-field"
                        min="20"
                        max="150"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Macro Breakdown */}
              <div className="bg-neutral-50 rounded-lg p-4">
                <h4 className="font-medium text-neutral-900 mb-3">Macro Breakdown</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-neutral-900">
                      {macroCalories.protein}
                    </div>
                    <div className="text-xs text-neutral-600">Protein cal</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-neutral-900">
                      {macroCalories.carbs}
                    </div>
                    <div className="text-xs text-neutral-600">Carbs cal</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-neutral-900">
                      {macroCalories.fat}
                    </div>
                    <div className="text-xs text-neutral-600">Fat cal</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-neutral-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Total from macros:</span>
                    <span className="font-medium text-neutral-900">{macroCalories.total} cal</span>
                  </div>
                  {calorieDifference > 50 && (
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                      <span className="text-yellow-700">
                        {calorieDifference} cal difference from macro total
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Nutrients */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                  <Apple className="w-5 h-5 text-green-500" />
                  Additional Nutrients
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Fiber (g)
                    </label>
                    <input
                      type="number"
                      value={goals.fiber}
                      onChange={(e) => handleInputChange('fiber', e.target.value)}
                      className="input-field"
                      min="10"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Sodium (mg)
                    </label>
                    <input
                      type="number"
                      value={goals.sodium}
                      onChange={(e) => handleInputChange('sodium', e.target.value)}
                      className="input-field"
                      min="500"
                      max="5000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Sugar (g)
                    </label>
                    <input
                      type="number"
                      value={goals.sugar}
                      onChange={(e) => handleInputChange('sugar', e.target.value)}
                      className="input-field"
                      min="0"
                      max="200"
                    />
                  </div>
                </div>
              </div>

              {/* Messages */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">{error}</span>
                    </div>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Goals saved successfully!</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-neutral-200">
                <button
                  onClick={onClose}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={handleSave}
                  disabled={saving}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-primary flex items-center gap-2 flex-1 justify-center"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Goals
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 