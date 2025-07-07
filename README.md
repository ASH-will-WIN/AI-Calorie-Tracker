# AI Calorie Tracker - Enhanced Version

A modern, AI-powered nutrition tracking application built with Next.js, featuring natural language meal input, intelligent insights, and comprehensive analytics.

## 🚀 New Features & Enhancements

### ✨ Modern UI/UX Redesign
- **Fresh Color Palette**: Modern green and orange theme with neutral accents
- **Typography**: Inter and Poppins fonts for better readability
- **Card-Based Layout**: Clean, organized content with subtle shadows and rounded corners
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Smooth Animations**: Framer Motion animations for enhanced user experience

### 🎯 AI Insights & Actionable Suggestions
- **Pattern Analysis**: AI analyzes eating patterns over time
- **Smart Insights**: Identifies calorie sources, meal timing, and macro imbalances
- **Actionable Recommendations**: Provides specific, easy-to-implement suggestions
- **Real-time Analysis**: Continuously updates insights as you log meals

### 📊 Enhanced Dashboard
- **Progress Indicators**: Circular progress rings showing daily goal completion
- **Quick Stats**: Prominent display of current day's nutrition data
- **Goal Setting**: Comprehensive goal management with preset options
- **Real-time Updates**: Instant feedback when meals are added or goals change

### 📈 Advanced Analytics
- **Multiple Chart Types**: Line charts, pie charts, and progress bars
- **Macro Distribution**: Visual breakdown of protein, carbs, and fat ratios
- **Meal Timing Analysis**: Distribution of calories throughout the day
- **Trend Analysis**: Weekly and monthly calorie intake patterns

### 🍽️ Smart Meal Input
- **Autocomplete**: Intelligent suggestions based on common foods
- **Quick Add Buttons**: One-click options for common meals
- **Natural Language Processing**: Describe meals in plain English
- **AI-Powered Parsing**: Automatic nutrition calculation from text descriptions

### 📱 Enhanced Meal History
- **Search & Filter**: Find specific meals or filter by date ranges
- **Meal Categories**: Automatic categorization by meal type
- **Collapsible Groups**: Organized by day with expandable details
- **Sorting Options**: Sort by date, calories, or other criteria

### 🎨 Design System
- **Consistent Components**: Reusable UI components with standardized styling
- **Color System**: Semantic color palette with primary, secondary, and neutral tones
- **Icon Library**: Lucide React icons throughout the interface
- **Animation System**: Smooth transitions and micro-interactions

## 🛠️ Technical Improvements

### Frontend Enhancements
- **Modern React Patterns**: Hooks, context, and functional components
- **State Management**: Efficient local state with proper data flow
- **Performance Optimization**: Lazy loading, memoization, and efficient re-renders
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support

### Backend Improvements
- **Enhanced API**: New endpoints for goal management and user preferences
- **Better Error Handling**: Comprehensive error messages and fallbacks
- **Data Validation**: Input validation and sanitization
- **Security**: Proper authentication and authorization checks

### Database Schema
```sql
-- Enhanced meals table
CREATE TABLE meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  food_description TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein DECIMAL(5,1) NOT NULL,
  carbs DECIMAL(5,1) NOT NULL,
  fat DECIMAL(5,1) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- New user_goals table
CREATE TABLE user_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  calories INTEGER NOT NULL DEFAULT 2000,
  protein INTEGER NOT NULL DEFAULT 150,
  carbs INTEGER NOT NULL DEFAULT 250,
  fat INTEGER NOT NULL DEFAULT 65,
  fiber INTEGER DEFAULT 25,
  sodium INTEGER DEFAULT 2300,
  sugar INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Supabase account
- OpenRouter.ai API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AI-Calorie-Tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENROUTER_KEY=your_openrouter_api_key
   ```

4. **Database Setup**
   - Create a Supabase project
   - Run the SQL schema above in your Supabase SQL editor
   - Enable Row Level Security (RLS) on tables

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## 🎯 Key Features

### AI-Powered Meal Parsing
- Natural language input: "2 eggs and toast"
- Automatic nutrition calculation
- Smart suggestions and autocomplete
- Error handling and validation

### Intelligent Insights
- Pattern recognition in eating habits
- Personalized recommendations
- Goal-based suggestions
- Progress tracking and motivation

### Comprehensive Analytics
- Daily, weekly, and monthly views
- Macro nutrient breakdowns
- Meal timing analysis
- Trend identification

### Goal Management
- Customizable nutrition targets
- Preset goal templates
- Progress tracking
- Achievement system

## 🎨 Design Philosophy

### User-Centered Design
- **Simplicity**: Clean, uncluttered interface
- **Intuitiveness**: Logical navigation and workflows
- **Feedback**: Clear success/error states
- **Accessibility**: Inclusive design for all users

### Modern Aesthetics
- **Color Psychology**: Green for health, orange for energy
- **Typography**: Readable, professional fonts
- **Spacing**: Generous whitespace for breathing room
- **Visual Hierarchy**: Clear information architecture

## 🔧 Customization

### Styling
The app uses Tailwind CSS with a custom design system:
- Primary colors: Green palette for health/wellness
- Secondary colors: Orange palette for energy/motivation
- Neutral colors: Gray palette for text and backgrounds

### Components
All components are modular and reusable:
- `Dashboard.js`: Main analytics and insights
- `MealForm.js`: Smart meal input with AI
- `MealHistory.js`: Comprehensive meal tracking
- `GoalSettings.js`: Goal management interface
- `AuthForm.js`: Modern authentication

## 📱 Mobile Optimization

- **Touch-Friendly**: Large touch targets and gestures
- **Responsive Layout**: Adapts to all screen sizes
- **Performance**: Optimized for mobile devices
- **Offline Support**: Basic offline functionality

## 🔒 Security & Privacy

- **Authentication**: Supabase Auth with email/password
- **Data Protection**: Row-level security in database
- **Privacy**: User data isolation and protection
- **Validation**: Input sanitization and validation

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically on push

### Other Platforms
- Netlify
- Railway
- DigitalOcean App Platform

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **OpenRouter.ai** for AI meal parsing
- **Supabase** for backend services
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Lucide React** for icons

---

**Built with ❤️ for better nutrition tracking and health awareness** 