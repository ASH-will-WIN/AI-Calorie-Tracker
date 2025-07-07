import { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Search, 
  Clock, 
  Coffee, 
  Utensils, 
  Cookie, 
  Apple,
  X,
  Check,
  Loader2,
  ArrowLeft
} from "lucide-react";

export default function MealForm({ onBack }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);

  // Common food suggestions
  const commonFoods = [
    { text: "2 eggs and toast", category: "breakfast" },
    { text: "chicken breast with rice", category: "lunch" },
    { text: "salmon with vegetables", category: "dinner" },
    { text: "apple and almonds", category: "snack" },
    { text: "oatmeal with berries", category: "breakfast" },
    { text: "greek yogurt with honey", category: "snack" },
    { text: "grilled cheese sandwich", category: "lunch" },
    { text: "pasta with tomato sauce", category: "dinner" },
    { text: "banana and peanut butter", category: "snack" },
    { text: "scrambled eggs with spinach", category: "breakfast" },
  ];

  const quickAddOptions = [
    { text: "Coffee", icon: Coffee, category: "breakfast" },
    { text: "Apple", icon: Apple, category: "snack" },
    { text: "Lunch", icon: Utensils, category: "lunch" },
    { text: "Snack", icon: Cookie, category: "snack" },
  ];

  useEffect(() => {
    if (text.length > 2) {
      const filtered = commonFoods.filter(food => 
        food.text.toLowerCase().includes(text.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
    setSelectedSuggestion(-1);
  }, [text]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/parse-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        throw new Error('Failed to parse meal');
      }

      const { calories, protein, carbs, fat } = await res.json();

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      const { error: supabaseError } = await supabase
        .from("meals")
        .insert([{ 
          food_description: text, 
          calories, 
          protein, 
          carbs, 
          fat,
          user_id: user.id 
        }]);

      if (supabaseError) throw supabaseError;

      setText("");
      setSuccess(true);
      
      // Trigger a refresh by dispatching a custom event
      window.dispatchEvent(new CustomEvent('mealAdded'));
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (error) {
      console.error("Error saving meal:", error);
      setError("Failed to add meal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setText(suggestion.text);
    setShowSuggestions(false);
  };

  const handleQuickAdd = (option) => {
    setText(option.text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestion(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestion(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedSuggestion >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[selectedSuggestion]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const clearInput = () => {
    setText("");
    setShowSuggestions(false);
    setError("");
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        {/* Back Button */}
        <div className="mb-4 flex items-center">
          <button
            type="button"
            onClick={() => (onBack ? onBack() : window.history.back())}
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 font-medium mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Add Your Meal</h2>
          <p className="text-neutral-600">Describe what you ate in natural language</p>
        </div>

        {/* Quick Add Buttons */}
        <div className="mb-6">
          <p className="text-sm font-medium text-neutral-700 mb-3">Quick Add:</p>
          <div className="flex flex-wrap gap-3">
            {quickAddOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <motion.button
                  key={option.text}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleQuickAdd(option)}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors duration-200"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{option.text}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What did you eat? (e.g., '2 eggs and toast')"
                className="input-field pl-10 pr-12"
                disabled={loading}
              />
              {text && (
                <button
                  type="button"
                  onClick={clearInput}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Autocomplete Suggestions */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-10 w-full mt-2 bg-white border border-neutral-200 rounded-lg shadow-medium max-h-60 overflow-y-auto"
                >
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={`w-full px-4 py-3 text-left hover:bg-neutral-50 transition-colors duration-200 flex items-center justify-between ${
                        index === selectedSuggestion ? 'bg-neutral-50' : ''
                      } ${index === 0 ? 'rounded-t-lg' : ''} ${index === suggestions.length - 1 ? 'rounded-b-lg' : ''}`}
                    >
                      <div>
                        <div className="font-medium text-neutral-900">{suggestion.text}</div>
                        <div className="text-sm text-neutral-500 capitalize">{suggestion.category}</div>
                      </div>
                      <Clock className="w-4 h-4 text-neutral-400" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Error and Success Messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded-lg"
              >
                <div className="flex items-center gap-2 text-red-700">
                  <X className="w-4 h-4" />
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
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">Meal added successfully!</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <div className="flex gap-3">
            <motion.button
              type="submit"
              disabled={loading || !text.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary flex items-center gap-2 flex-1 justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding Meal...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Meal
                </>
              )}
            </motion.button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-neutral-50 rounded-lg">
          <h3 className="text-sm font-medium text-neutral-900 mb-2">💡 Tips for better results:</h3>
          <ul className="text-sm text-neutral-600 space-y-1">
            <li>• Be specific: "2 large eggs" instead of "eggs"</li>
            <li>• Include portions: "1 cup of rice" or "200g chicken"</li>
            <li>• Add cooking methods: "grilled salmon" or "baked potato"</li>
            <li>• Include sides: "chicken with broccoli and rice"</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}