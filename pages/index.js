import MealForm from "../components/MealForm";
import Dashboard from "../components/Dashboard";
import MealHistory from "../components/MealHistory";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto py-6 px-6">
          <h1 className="text-3xl font-bold text-gray-900">Calorie Tracker</h1>
          <p className="mt-1 text-sm text-gray-500">Track your meals and nutrition with natural language input</p>
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