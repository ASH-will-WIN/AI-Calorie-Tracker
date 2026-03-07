import { useEffect, useState } from 'react';
import { supabase } from "../utils/supabaseClient";
import MealForm from "../components/MealForm";
import Dashboard from "../components/Dashboard";
import MealHistory from "../components/MealHistory";
import AuthForm from "../components/AuthForm";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, 
  User, 
  Activity, 
  Calendar,
  Settings,
  Menu,
  X
} from 'lucide-react';

export default function Home() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Handle URL parameters for tab navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam && ['dashboard', 'add-meal', 'history'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSidebarOpen(false);
    // Update URL without page reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.set('tab', tabId);
      window.history.pushState({}, '', url);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'add-meal', label: 'Add Meal', icon: Calendar },
    { id: 'history', label: 'History', icon: Calendar },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthForm />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onTabChange={handleTabChange} />;
      case 'add-meal':
        return <MealForm onBack={() => handleTabChange('dashboard')} />;
      case 'history':
        return <MealHistory onBack={() => handleTabChange('dashboard')} />;
      default:
        return <Dashboard onTabChange={handleTabChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: sidebarOpen ? 0 : -300 }}
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-medium transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-900">Calorie Tracker</h1>
                <p className="text-sm text-neutral-600">AI-Powered Nutrition</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {session.user.email}
                </p>
                <p className="text-xs text-neutral-600">Active</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => handleTabChange(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors duration-200 ${
                        activeTab === tab.id
                          ? 'bg-primary-50 text-primary-700 border border-primary-200'
                          : 'text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-neutral-200">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Header */}
        <header className="bg-white border-b border-neutral-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">
                  {tabs.find(tab => tab.id === activeTab)?.label}
                </h2>
                <p className="text-sm text-neutral-600">
                  {activeTab === 'dashboard' && 'Track your nutrition and get insights'}
                  {activeTab === 'add-meal' && 'Log your meals with AI assistance'}
                  {activeTab === 'history' && 'View your meal history and patterns'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-screen">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-neutral-200 py-6">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center">
              <p className="text-sm text-neutral-600">
                Built with Next.js, Tailwind CSS, and OpenRouter.ai
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                AI-powered nutrition tracking for better health
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}