import { useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function MealForm() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    setLoading(true);
    setError("");

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

      const { error: supabaseError } = await supabase
        .from("meals")
        .insert([{ food_description: text, calories, protein, carbs, fat }]);

      if (supabaseError) throw supabaseError;

      setText("");
      
      // Trigger a refresh by dispatching a custom event
      window.dispatchEvent(new CustomEvent('mealAdded'));
      
    } catch (error) {
      console.error("Error saving meal:", error);
      setError("Failed to add meal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What did you eat? (e.g., '2 eggs and toast')"
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Adding..." : "Add Meal"}
          </button>
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </form>
    </div>
  );
}