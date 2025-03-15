import { useEffect, useState } from 'react';
import { supabase } from "../utils/supabaseClient";
import MealForm from "../components/MealForm";
import Dashboard from "../components/Dashboard";
import MealHistory from "../components/MealHistory";
import AuthForm from "../components/AuthForm";

export default function Home() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto py-6 px-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Calorie Tracker</h1>
              <p className="mt-1 text-sm text-gray-500">Track your meals and nutrition with natural language input</p>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="pb-12">
        <MealForm />
        <Dashboard />
        <MealHistory />
      </main>
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto py-4 px-6">
          <p className="text-sm text-gray-500 text-center">
            Built with Next.js, Tailwind CSS, and OpenRouter.ai
          </p>
        </div>
      </footer>
    </div>
  );
}