import { createClient } from '@supabase/supabase-js'

// Ces deux valeurs sont des identifiants publics prévus pour une application web.
// La sécurité des données repose sur les politiques RLS configurées dans Supabase.
const DEFAULT_SUPABASE_URL = 'https://cbgxfacrfcblckrwciuh.supabase.co'
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Twd4c4RPZPLJMiQ4eepx7g_3hCwf2mM'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_PUBLISHABLE_KEY

export const supabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
