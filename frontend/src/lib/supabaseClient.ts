import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dosjuatlsvfwyqftniad.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvc2p1YXRsc3Zmd3lxZnRuaWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzc5NjIsImV4cCI6MjA2OTgxMzk2Mn0.C-mokJur39zLW66BQAcAbMrwLnHZVLtlo7FeF09yaNc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);