/**
 * Cliente de Supabase para la extensión de Chrome (sin módulos ESM)
 * Requiere que vendor/supabase.js esté cargado previamente y window.SUPABASE_CONFIG definido
 */

(function() {
	if (!window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.url || !window.SUPABASE_CONFIG.anonKey) {
		console.error('[Supabase] Configuración no encontrada en window.SUPABASE_CONFIG');
		return;
	}

	const supabaseConfig = {
		auth: {
			persistSession: true,
			storage: {
				getItem: async (key) => {
					try {
						const result = await chrome.storage.local.get([key]);
						return result[key] || null;
					} catch (error) {
						console.error('[Supabase] Error getting item from storage:', error);
						return null;
					}
				},
				setItem: async (key, value) => {
					try {
						await chrome.storage.local.set({ [key]: value });
					} catch (error) {
						console.error('[Supabase] Error setting item in storage:', error);
					}
				},
				removeItem: async (key) => {
					try {
						await chrome.storage.local.remove([key]);
					} catch (error) {
						console.error('[Supabase] Error removing item from storage:', error);
					}
				}
			},
			autoRefreshToken: true,
			detectSessionInUrl: false
		},
		realtime: {
			params: { eventsPerSecond: 10 }
		}
	};

	// window.supabase viene de vendor/supabase.js → window.supabase.createClient
	try {
		window.supabaseClient = window.supabase.createClient(
			window.SUPABASE_CONFIG.url,
			window.SUPABASE_CONFIG.anonKey,
			supabaseConfig
		);
		window.isSupabaseConfigured = function() {
			return !!(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.anonKey);
		};
		window.testSupabaseConnection = async function() {
			try {
				const { error } = await window.supabaseClient.from('subscription_plans').select('count').limit(1);
				if (error) {
					console.error('[Supabase] Error de conexión:', error);
					return false;
				}
				return true;
			} catch (e) {
				console.error('[Supabase] Error probando conexión:', e);
				return false;
			}
		};
	} catch (e) {
		console.error('[Supabase] Error creando cliente:', e);
	}
})(); 