import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
	(import.meta.env.VITE_PUBLIC_SUPABASE_URL as string | undefined) ||
	(import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
	'';
const supabaseAnonKey =
	(import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
	(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
	'';

/**
 * Dedicated Supabase client for the public customer portal.
 *
 * It uses a SEPARATE auth storage key so a customer signing in via email OTP
 * never clobbers (or is clobbered by) a staff member's dashboard session that
 * lives on the default client in `./supabase`. All portal reads run through
 * this client so they carry the customer's authenticated JWT, which lets RLS
 * scope every row to that customer.
 */
export const portalClient = createClient(
	supabaseUrl || 'https://example.supabase.co',
	supabaseAnonKey || 'public-anon-key-placeholder',
	{
		auth: {
			storageKey: 'dousefire_portal_auth',
			autoRefreshToken: true,
			persistSession: true,
			detectSessionInUrl: false,
		},
	},
);
