import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

// Check if environment variables are set
if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase environment variables are not set. Please create a .env.local file with:')
  console.warn('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
  console.warn('NEXT_PUBLIC_SUPABASE_KEY=your_supabase_anon_key')
  console.warn('OPENROUTER_KEY=your_openrouter_api_key')
}

// Create a mock client for development if env vars are missing
const createMockClient = () => ({
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: (callback) => ({
      data: { subscription: { unsubscribe: () => {} } }
    }),
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    signUp: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    signOut: () => Promise.resolve({ error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null })
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: null })
        })
      }),
      gte: () => ({
        order: () => Promise.resolve({ data: [], error: null })
      }),
      order: () => ({
        limit: () => Promise.resolve({ data: [], error: null })
      })
    }),
    insert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    upsert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    delete: () => ({
      eq: () => Promise.resolve({ error: null })
    })
  })
})

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : createMockClient()
