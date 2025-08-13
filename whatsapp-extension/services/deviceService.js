(function() {
	class DeviceService {
		constructor() {
			this.supabase = null;
			this.deviceId = null;
			this.currentDeviceRow = null;
			this.heartbeatIntervalId = null;
		}

		async init() {
			if (!window.isSupabaseConfigured || !window.isSupabaseConfigured()) {
				throw new Error('Supabase no está configurado');
			}
			this.supabase = window.supabaseClient;
			this.deviceId = await this.ensureDeviceId();
			return this.deviceId;
		}

		async isAuthenticated() {
			try {
				const { data } = await this.supabase.auth.getUser();
				return !!data?.user;
			} catch (_) { return false; }
		}

		async ensureDeviceId() {
			const key = 'wa_crm_device_id';
			try {
				const result = await chrome.storage.local.get([key]);
				if (result[key]) return result[key];
				const newId = crypto.randomUUID();
				await chrome.storage.local.set({ [key]: newId });
				return newId;
			} catch (e) {
				// Fallback si crypto.randomUUID no existiera
				const newId = 'dev-' + Math.random().toString(36).slice(2) + Date.now();
				await chrome.storage.local.set({ [key]: newId });
				return newId;
			}
		}

		async registerCurrentDevice() {
			if (!this.supabase) await this.init();
			if (!(await this.isAuthenticated())) throw new Error('Not authenticated');
			const userAgent = navigator.userAgent;
			const platform = navigator.platform || navigator.userAgentData?.platform || null;
			const { data, error } = await this.supabase.rpc('register_device', {
				p_device_id: this.deviceId,
				p_user_agent: userAgent,
				p_platform: platform
			});
			if (error) throw new Error(error.message || 'No se pudo registrar el dispositivo');
			this.currentDeviceRow = data;
			return data;
		}

		startHeartbeat(everyMs = 120000) {
			if (this.heartbeatIntervalId) clearInterval(this.heartbeatIntervalId);
			this.heartbeatIntervalId = setInterval(async () => {
				try {
					if (!this.supabase || !this.deviceId || !(await this.isAuthenticated())) return;
					await this.supabase.from('user_devices')
						.update({ last_seen: new Date().toISOString() })
						.eq('device_id', this.deviceId);
				} catch (_) {}
			}, everyMs);
		}

		async getDeviceRow() {
			if (!this.supabase) await this.init();
			if (!(await this.isAuthenticated())) return null;
			const { data, error } = await this.supabase
				.from('user_devices')
				.select('*')
				.eq('device_id', this.deviceId)
				.maybeSingle();
			if (error) return null;
			this.currentDeviceRow = data || null;
			return data || null;
		}

		async ensureDeviceRowRegistered() {
			if (!(await this.isAuthenticated())) return null;
			let row = await this.getDeviceRow();
			if (!row) {
				try { row = await this.registerCurrentDevice(); }
				catch (e) { /* puede fallar si no autenticado aún */ }
			}
			return row || null;
		}

		async setNickname(nickname) {
			if (!this.supabase) await this.init();
			if (!(await this.isAuthenticated())) return null;
			await this.ensureDeviceRowRegistered();
			const { data, error } = await this.supabase
				.from('user_devices')
				.update({ nickname })
				.eq('device_id', this.deviceId)
				.select('*')
				.maybeSingle();
			if (error) throw new Error(error.message || 'No se pudo actualizar el nickname');
			this.currentDeviceRow = data || this.currentDeviceRow;
			return data || this.currentDeviceRow;
		}

		async getPreferences() {
			const row = this.currentDeviceRow || await this.getDeviceRow();
			return row?.preferences || {};
		}

		async updatePreferences(patch) {
			if (!this.supabase) await this.init();
			if (!(await this.isAuthenticated())) return { ...(await this.getPreferences()), ...patch };
			const current = (await this.getPreferences()) || {};
			const updated = { ...current, ...patch };
			await this.ensureDeviceRowRegistered();
			const { data, error } = await this.supabase
				.from('user_devices')
				.update({ preferences: updated })
				.eq('device_id', this.deviceId)
				.select('*')
				.maybeSingle();
			if (error) throw new Error(error.message || 'No se pudo actualizar preferencias');
			this.currentDeviceRow = data || this.currentDeviceRow;
			return (data?.preferences) || updated;
		}

		async logOutgoingMessage({ waChatId, waMessageId = null, content, agentNickname = null, metadata = {} }) {
			if (!this.supabase) await this.init();
			if (!(await this.isAuthenticated())) return false;
			await this.ensureDeviceRowRegistered();
			const { data: userData } = await this.supabase.auth.getUser();
			const { error } = await this.supabase
				.from('messages_log')
				.insert({
					user_id: userData?.user?.id || null,
					device_id: this.deviceId,
					agent_nickname: agentNickname,
					wa_chat_id: waChatId || null,
					wa_message_id: waMessageId || null,
					content: content,
					metadata: metadata || {}
				});
			if (error) throw new Error(error.message || 'No se pudo registrar el mensaje');
			return true;
		}
	}

	window.DeviceService = DeviceService;
})(); 