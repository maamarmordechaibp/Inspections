import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
	(import.meta.env.VITE_PUBLIC_SUPABASE_URL as string | undefined) ||
	(import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
	'';
const supabaseAnonKey =
	(import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
	(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
	'';

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
	// Keep app booting in mock/offline scenarios instead of crashing at startup.
	console.error(
		'[Supabase] Missing env configuration. Expected VITE_PUBLIC_SUPABASE_URL and VITE_PUBLIC_SUPABASE_ANON_KEY.',
	);
}

export const supabase = createClient(
	supabaseUrl || 'https://example.supabase.co',
	supabaseAnonKey || 'public-anon-key-placeholder',
);