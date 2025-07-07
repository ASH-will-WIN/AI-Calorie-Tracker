# Setup Guide - AI Calorie Tracker

## Quick Setup

### 1. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=your_supabase_anon_key

# OpenRouter.ai API Key
OPENROUTER_KEY=your_openrouter_api_key
```

### 2. Get Your API Keys

#### Supabase Setup
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to Settings → API
3. Copy the "Project URL" and "anon public" key
4. Add them to your `.env.local` file

#### OpenRouter.ai Setup
1. Go to [openrouter.ai](https://openrouter.ai) and sign up
2. Go to API Keys section
3. Create a new API key
4. Add it to your `.env.local` file

### 3. Database Setup

Run this SQL in your Supabase SQL editor:

```sql
-- Create meals table
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

-- Create user_goals table
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

-- Enable Row Level Security
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own meals" ON meals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meals" ON meals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meals" ON meals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meals" ON meals
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own goals" ON user_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" ON user_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON user_goals
  FOR UPDATE USING (auth.uid() = user_id);
```

### 4. Start the Application

```bash
npm run dev
```

The application will now be available at `http://localhost:3000`

## Demo Mode

If you don't want to set up Supabase right away, the application will run in demo mode with mock data. You can:

1. See the UI and design
2. Navigate between pages
3. View the enhanced components
4. Test the responsive design

To enable full functionality, follow the setup steps above.

## Troubleshooting

### Common Issues

1. **"supabaseUrl is required" error**
   - Make sure your `.env.local` file exists and has the correct variables
   - Restart the development server after adding environment variables

2. **Authentication not working**
   - Check that your Supabase URL and key are correct
   - Ensure Row Level Security is enabled in Supabase

3. **AI meal parsing not working**
   - Verify your OpenRouter.ai API key is correct
   - Check the API key has sufficient credits

4. **Database errors**
   - Run the SQL setup script in Supabase
   - Check that RLS policies are created correctly

### Getting Help

If you encounter issues:
1. Check the browser console for error messages
2. Verify all environment variables are set correctly
3. Ensure the database tables and policies are created
4. Restart the development server

## Features Available

Once set up, you'll have access to:

- ✅ AI-powered meal parsing
- ✅ Smart insights and recommendations
- ✅ Goal setting and tracking
- ✅ Advanced analytics and charts
- ✅ Modern, responsive design
- ✅ Mobile-optimized interface 