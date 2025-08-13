/**
 * Auth Service - Gestión de autenticación con Supabase (sin ESM)
 */

class AuthService {
	constructor() {
		this.currentUser = null;
		this.authToken = null;
		this.isAuthenticated = false;
		this.supabase = null;
		this.authStateChangeCallback = null;
	}

	/**
	 * Inicializar servicio de autenticación
	 */
	async init() {
		try {
			console.log('[AuthService] Inicializando con Supabase...');
			if (!(window.isSupabaseConfigured && window.isSupabaseConfigured())) {
				throw new Error('Supabase no está configurado correctamente');
			}
			const ok = await (window.testSupabaseConnection ? window.testSupabaseConnection() : Promise.resolve(false));
			if (!ok) throw new Error('No se pudo establecer conexión con Supabase');
			this.supabase = window.supabaseClient;
			const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
			if (sessionError) throw sessionError;
			if (session) {
				// Validar que la sesión sea realmente válida
				const { data: { user }, error: userError } = await this.supabase.auth.getUser();
				if (userError || !user) {
					console.warn('[AuthService] Sesión inválida. Cerrando sesión.');
					try { await this.supabase.auth.signOut(); } catch (_) {}
					this.authToken = null;
					this.currentUser = null;
					this.isAuthenticated = false;
				} else {
					this.authToken = session.access_token;
					this.currentUser = user;
					this.isAuthenticated = true;
				}
			}
			this.supabase.auth.onAuthStateChange((event, session) => {
				if (event === 'SIGNED_IN' && session) {
					this.authToken = session.access_token;
					this.currentUser = session.user;
					this.isAuthenticated = true;
				} else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
					this.authToken = session?.access_token || null;
					this.currentUser = session?.user || null;
					this.isAuthenticated = !!session;
				}
				if (this.authStateChangeCallback) this.authStateChangeCallback(event, session);
			});
			return this.isAuthenticated;
		} catch (error) {
			console.error('[AuthService] Error inicializando auth service:', error);
			return false;
		}
	}

	onAuthStateChange(callback) { this.authStateChangeCallback = callback; }

	async login(email, password) {
		try {
			if (!this.supabase) await this.init();
			const { data, error } = await this.supabase.auth.signInWithPassword({
				email: email.trim().toLowerCase(),
				password
			});
			if (error) throw new Error(error.message);
			if (!data?.user || !data?.session) throw new Error('Respuesta inválida del servidor');
			this.authToken = data.session.access_token;
			this.currentUser = data.user;
			this.isAuthenticated = true;
			return { success: true, user: this.currentUser };
		} catch (error) {
			return { success: false, error: error.message || 'Error de autenticación' };
		}
	}

	async register(userData) {
		try {
			if (!this.supabase) await this.init();
			const { data, error } = await this.supabase.auth.signUp({
				email: userData.email.trim().toLowerCase(),
				password: userData.password,
				options: { data: { name: userData.name?.trim(), plan: userData.plan || 'free' } }
			});
			if (error) throw new Error(error.message);
			if (data.user) {
				if (data.session) {
					this.authToken = data.session.access_token;
					this.currentUser = data.user;
					this.isAuthenticated = true;
				}
				return { success: true, user: data.user };
			}
			throw new Error('No se pudo registrar el usuario');
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	async logout() {
		try {
			if (!this.supabase) await this.init();
			const { error } = await this.supabase.auth.signOut();
			if (error) throw new Error(error.message);
			this.authToken = null;
			this.currentUser = null;
			this.isAuthenticated = false;
			return { success: true };
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	isUserAuthenticated() { return this.isAuthenticated && this.authToken && this.currentUser; }
	getCurrentUser() { return this.currentUser; }
	getAuthToken() { return this.authToken; }

	async validateToken() {
		try {
			if (!this.authToken) return false;
			if (!this.supabase) await this.init();
			const { data: { user }, error } = await this.supabase.auth.getUser();
			if (error) return false;
			return !!user;
		} catch {
			return false;
		}
	}

	async refreshToken() {
		try {
			if (!this.supabase) await this.init();
			const { data, error } = await this.supabase.auth.refreshSession();
			if (error) throw new Error(error.message);
			if (data.session) {
				this.authToken = data.session.access_token;
				this.currentUser = data.user;
				return { success: true, token: this.authToken };
			}
			throw new Error('No se pudo renovar el token');
		} catch (error) {
			return { success: false, error: error.message };
		}
	}

	getUserPlan() { return this.currentUser?.user_metadata?.plan || 'free'; }
}

window.AuthService = AuthService; 