import { createClient } from '@supabase/supabase-js'

const supabaseUrl = https://pdhbslkdpmdvpcwtedum.supabase.co
const supabaseAnonKey =eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkaGJzbGtkcG1kdnBjd3RlZHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3ODg3MzksImV4cCI6MjA5OTM2NDczOX0.sBNmgbYcWYWmGSE-C42gTcipAoR0rL7aIngTRSegeNg

if (!supabaseUrl || !supabaseAnonKey) {
  // Doesn't throw — lets the app render a helpful message instead of a blank screen.
  console.error(
    'Missing Supabase env vars. Copy .env.example to .env and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
