import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pdhbslkdpmdvpcwtedum.supabase.co'
const supabaseAnonKey = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkaGJzbGtkcG1kdnBjd3RlZHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3ODg3MzksImV4cCI6MjA5OTM2NDczOX0.sBNmgbYcWYWmGSE-C42gTcipAoR0rL7aIngTRSegeNg

export const supabase = createClient(supabaseUrl, supabaseAnonKey)