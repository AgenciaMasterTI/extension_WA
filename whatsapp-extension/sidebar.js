class WhatsAppCRM {
	groupNameEl = null;
	async loadGroupName() {
		try {
			this.groupNameEl = this.groupNameEl || document.getElementById('groupName');
			const user = this.authService?.getCurrentUser?.();
			const name = user?.user_metadata?.company || user?.user_metadata?.organization || (user?.email ? user.email.split('@')[1] : null) || 'Mi organización';
			if (this.groupNameEl) this.groupNameEl.textContent = name;
		} catch (_) {}
	}

	async loadTeamList() {
		try {
			if (!window.deviceService) window.deviceService = new window.DeviceService();
			await window.deviceService.init();
			const { data, error } = await window.supabaseClient
				.from('user_devices')
				.select('device_id, nickname, platform, user_agent, last_seen, revoked')
				.order('last_seen', { ascending: false });
			if (error) throw error;
			const container = document.getElementById('teamList');
			if (!container) return;
			container.innerHTML = '';
			(data || []).forEach(d => {
				const row = document.createElement('div');
				row.style.cssText = 'display:grid; grid-template-columns: 1fr auto; gap:8px; align-items:center; padding:8px; border:1px solid #30363d; border-radius:10px; background:#0b0f14;';
				row.innerHTML = `
					<div>
						<div style="font-weight:600;">${d.nickname || '(sin nickname)'} <span style="color:#8b949e; font-weight:400;">· ${d.platform || 'web'}</span></div>
						<div style="color:#8b949e; font-size:12px;">${(d.user_agent||'').slice(0,64)}${(d.user_agent||'').length>64?'…':''}</div>
					</div>
					<div style="display:flex; gap:6px; align-items:center;">
						<span style="font-size:11px; color:${d.revoked?'#f85149':'#58a6ff'};">${d.revoked?'revocado':'activo'}</span>
						<button class="btn-edit" data-device="${d.device_id}" style="background:#21262d; border:1px solid #30363d; color:#e6edf3; padding:6px 10px; border-radius:8px; cursor:pointer;">Editar</button>
					</div>`;
				row.querySelector('.btn-edit').addEventListener('click', () => this.promptEditNickname(d.device_id, d.nickname||''));
				row.addEventListener('dblclick', () => this.promptEditNickname(d.device_id, d.nickname||''));
				container.appendChild(row);
			});
		} catch (e) { console.warn('loadTeamList error:', e); }
	}

	async promptEditNickname(deviceId, current) {
		try {
			const nick = prompt('Nuevo nickname para este dispositivo', current || '');
			if (nick == null) return;
			if (!window.deviceService) window.deviceService = new window.DeviceService();
			await window.deviceService.init();
			await window.supabaseClient.from('user_devices').update({ nickname: nick.trim() }).eq('device_id', deviceId);
			await this.loadTeamList();
		} catch (e) { this.showNotification('No se pudo actualizar nickname', 'error'); }
	}

    constructor() {
        console.log('🚀 WhatsApp CRM Professional (Modo Oscuro) - Iniciando...');
        
        // Inicializar datos con valores por defecto
        this.contacts = this.loadData('contacts', []);
        
        // Inicializar TagsService de manera segura
        try {
            this.tagsService = new TagsService();
            this.tags = [];
            this.tagsService.loadTags().then(tags => {
                this.tags = tags;
                this.bindTagsEvents(); // Vincular eventos después de cargar etiquetas
            }).catch(error => {
                console.error('Error al cargar etiquetas:', error);
            });
        } catch (error) {
            console.error('Error al inicializar TagsService:', error);
            this.tags = [];
        }
        this.templates = this.loadData('templates', []);
        this.reminders = this.loadData('reminders', []);
        this.settings = this.loadData('settings', {
            theme: 'dark', // Solo modo oscuro
            language: 'es',
            autoSync: true,
            notifications: true,
            compactMode: false
        });
        
        // Estados de la aplicación
        this.currentEditingTag = null;
        this.currentEditingTemplate = null;
        this.currentEditingContact = null;
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.isCollapsed = false;
        this.currentSection = 'dashboard';
        
        // Contadores de debug
        this.debugStats = {
            initTime: Date.now(),
            eventsbound: 0,
            lastError: null
        };
        
        this.init();
    }

    // ===========================================
    // INICIALIZACIÓN Y CONFIGURACIÓN

    setupAuthUI() {
        try {
            if (!window.AuthService) return;
            if (!this.authService) this.authService = new window.AuthService();
            this.authService.init().then((isAuth) => {
                if (!isAuth) this.showLoginOverlay();
                try { this.syncContactsWithSupabase?.(); } catch(_) {}
            });
            // Sincronizar cuando cambie el estado de autenticación
            try {
                this.authService.onAuthStateChange?.((event, session) => {
                    try { this.loadGroupName(); } catch(_) {}
                    if (event === 'SIGNED_IN') {
                        try { this.syncContactsWithSupabase?.(); } catch(_) {}
                    }
                });
            } catch (_) {}
        } catch (e) { console.error('Auth UI error:', e); }
    }

    showLoginOverlay() {
        this.renderAuthOverlay({ mode: 'login' });
    }

    showSignupOverlay() {
        this.renderAuthOverlay({ mode: 'signup' });
    }

    renderAuthOverlay({ mode = 'login' } = {}) {
        if (document.getElementById('crmLoginOverlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'crmLoginOverlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 999999999;
            display: flex; align-items: center; justify-content: center;
            background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
        `;
        const isSignup = mode === 'signup';
        overlay.innerHTML = `
            <div style="width: 380px; background: #0b0f14; color: #e6edf3; border: 1px solid #30363d; border-radius: 16px; padding: 22px; box-shadow: 0 16px 48px rgba(0,0,0,.6);">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
                    <h3 style="margin:0; font-size:18px; display:flex; gap:8px; align-items:center;">${isSignup ? 'Crear cuenta' : 'Iniciar sesión'}</h3>
                    <button id="crmLoginClose" style="background:none; border:none; color:#8b949e; font-size:18px; cursor:pointer">✕</button>
                </div>
                <div style="display:grid; gap:12px;">
                    ${isSignup ? '<input id="crmLoginName" type="text" placeholder="Nombre" style="padding:12px; border-radius:10px; border:1px solid #30363d; background:#06090f; color:#e6edf3;">' : ''}
                    <input id="crmLoginEmail" type="email" placeholder="Email" style="padding:12px; border-radius:10px; border:1px solid #30363d; background:#06090f; color:#e6edf3;">
                    <input id="crmLoginPassword" type="password" placeholder="Contraseña" style="padding:12px; border-radius:10px; border:1px solid #30363d; background:#06090f; color:#e6edf3;">
                    <button id="crmLoginBtn" class="btn-primary" style="padding:12px; border-radius:10px; cursor:pointer;">${isSignup ? 'Crear cuenta' : 'Entrar'}</button>
                    <div style="display:flex; justify-content:space-between; font-size:12px; color:#8b949e;">
                        <button id="crmToggleAuthMode" style="background:none; border:none; color:#58a6ff; cursor:pointer;">${isSignup ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Crea una'}</button>
                        <button id="crmForgotPassword" style="background:none; border:none; color:#8b949e; cursor:pointer;">Olvidé mi contraseña</button>
                    </div>
                    <div id="crmLoginError" style="display:none; color:#f85149; font-size:12px;"></div>
                    <div id="crmNicknamePanel" style="display:none; border-top:1px solid #30363d; padding-top:12px; gap:8px;">
                        <label style="display:block; font-size:12px; color:#8b949e;">Nickname de esta sesión</label>
                        <input id="crmNicknameInput" type="text" placeholder="Ej: Juan" style="padding:10px; border-radius:8px; border:1px solid #30363d; background:#06090f; color:#e6edf3;">
                        <div style="display:flex; gap:8px; align-items:center; font-size:12px; color:#8b949e;">
                            <label><input type="radio" name="crmNickFmt" value="prefix" checked> Prefijo [Juan] Hola…</label>
                            <label><input type="radio" name="crmNickFmt" value="suffix"> Sufijo Hola… — Juan</label>
                            <label><input type="checkbox" id="crmNickOn" checked> Activar firma</label>
                            <button id="crmNickTest" style="margin-left:auto; background:#21262d; border:1px solid #30363d; color:#e6edf3; padding:6px 10px; border-radius:8px; cursor:pointer;">Enviar prueba a mí</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const close = () => overlay.remove();
        overlay.querySelector('#crmLoginClose').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        const submit = async () => {
            const email = overlay.querySelector('#crmLoginEmail').value.trim();
            const password = overlay.querySelector('#crmLoginPassword').value;
            const name = overlay.querySelector('#crmLoginName')?.value?.trim();
            const errorEl = overlay.querySelector('#crmLoginError');
            errorEl.style.display = 'none';
            try {
                
                let res;
                if (isSignup) {
                    res = await this.authService.register({ email, password, name });
                } else {
                    res = await this.authService.login(email, password);
                }
                if (!res.success) throw new Error(res.error || 'Error de autenticación');
                try {
                    if (!window.deviceService) window.deviceService = new window.DeviceService();
                    await window.deviceService.init();
                    await window.deviceService.registerCurrentDevice();
                    window.deviceService.startHeartbeat(120000);
                    const deviceRow = await window.deviceService.getDeviceRow();
                    const user = this.authService?.getCurrentUser?.() || null;
                    const defaultNickname = deviceRow?.nickname || user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : '') || 'Agente';
                    if (!deviceRow?.nickname && defaultNickname) {
                        await window.deviceService.setNickname(defaultNickname);
                    }
                    try { await window.deviceService.registerCurrentDevice(); } catch (_) {}
                    const prefs = await window.deviceService.updatePreferences({ nicknameOn: true, nicknameFormat: 'prefix' });
                    // Mostrar panel nickname
                    const panel = document.getElementById('crmNicknamePanel');
                    if (panel) {
                        panel.style.display = 'block';
                        const inputNick = document.getElementById('crmNicknameInput');
                        const cbOn = document.getElementById('crmNickOn');
                        const fmtRadios = overlay.querySelectorAll('input[name="crmNickFmt"]');
                        inputNick.value = (await window.deviceService.getDeviceRow())?.nickname || defaultNickname;
                        cbOn.checked = !!prefs.nicknameOn;
                        Array.from(fmtRadios).forEach(r => { r.checked = (r.value === (prefs.nicknameFormat || 'prefix')); });
                        inputNick.addEventListener('change', async () => { try { await window.deviceService.setNickname(inputNick.value.trim()); this.showNotification('Nickname actualizado', 'success'); } catch (e) { this.showNotification('No se pudo guardar nickname', 'error'); } });
                        cbOn.addEventListener('change', async () => { try { await window.deviceService.updatePreferences({ nicknameOn: cbOn.checked }); } catch (_) {} });
                        fmtRadios.forEach(r => r.addEventListener('change', async () => { const sel = overlay.querySelector('input[name="crmNickFmt"]:checked')?.value || 'prefix'; try { await window.deviceService.updatePreferences({ nicknameFormat: sel }); } catch (_) {} }));
                        document.getElementById('crmNickTest').addEventListener('click', async () => {
                            try {
                                const nick = (await window.deviceService.getDeviceRow())?.nickname || defaultNickname;
                                const cfg = await window.deviceService.getPreferences();
                                const msg = cfg.nicknameFormat === 'suffix' ? `Mensaje de prueba — ${nick}` : `[${nick}] Mensaje de prueba`;
                                const selfItem = window.DOMUtils.findSelfChatItem();
                                if (selfItem) { window.DOMUtils.openChatElement(selfItem); }
                                setTimeout(async () => {
                                    await window.DOMUtils.sendMessageToCurrentChat(msg);
                                    this.showNotification('Mensaje de prueba enviado', 'success');
                                }, 400);
                            } catch (e) { this.showNotification('No se pudo enviar prueba', 'error'); }
                        });
                    }
                } catch (e) {
                    console.warn('Device registration failed:', e);
                }
                // Forzar configuración de nickname
                try {
                    const panel = document.getElementById('crmNicknamePanel');
                    if (panel) {
                        panel.style.display = 'block';
                        const inputNick = document.getElementById('crmNicknameInput');
                        inputNick?.focus();
                        inputNick?.select();
                        // Bloquear cierre hasta guardar un nickname
                        const saveNickname = async () => {
                            const val = inputNick.value.trim();
                            if (!val) { this.showNotification('El nickname es obligatorio', 'warning'); return false; }
                            try { await window.deviceService.setNickname(val); return true; } catch (_) { this.showNotification('No se pudo guardar nickname', 'error'); return false; }
                        };
                        // Reemplazar botón de login por Guardar nickname si no hay nickname
                        const userRow = await window.deviceService.getDeviceRow();
                        if (!userRow?.nickname) {
                            const loginBtn = overlay.querySelector('#crmLoginBtn');
                            if (loginBtn) {
                                loginBtn.textContent = 'Guardar nickname y continuar';
                                loginBtn.onclick = async () => { if (await saveNickname()) { overlay.remove(); this.showNotification(isSignup ? 'Cuenta creada' : 'Sesión iniciada', 'success'); this.updateDashboard(); } };
                                return;
                            }
                        }
                    }
                } catch (_) {}

                overlay.remove();
                this.showNotification(isSignup ? 'Cuenta creada' : 'Sesión iniciada', 'success');
                this.updateDashboard();
            } catch (err) {
                errorEl.textContent = err.message || (isSignup ? 'Error creando cuenta' : 'Error iniciando sesión');
                errorEl.style.display = 'block';
            }
        };
        overlay.querySelector('#crmLoginBtn').addEventListener('click', submit);
        overlay.querySelector('#crmToggleAuthMode').addEventListener('click', () => {
            overlay.remove();
            this.renderAuthOverlay({ mode: isSignup ? 'login' : 'signup' });
        });
        overlay.querySelector('#crmForgotPassword').addEventListener('click', async () => {
            overlay.querySelector('#crmLoginError').style.display = 'none';
            const email = overlay.querySelector('#crmLoginEmail').value.trim();
            if (!email) {
                overlay.querySelector('#crmLoginError').textContent = 'Ingresa tu email para continuar';
                overlay.querySelector('#crmLoginError').style.display = 'block';
                return;
            }
            try {
                // Supabase: reset password email
                await window.supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: chrome.runtime.getURL('popup/popup.html') });
                this.showNotification('Revisa tu correo para recuperar tu contraseña', 'info');
            } catch (e) {
                overlay.querySelector('#crmLoginError').textContent = 'No se pudo enviar el correo de recuperación';
                overlay.querySelector('#crmLoginError').style.display = 'block';
            }
        });
    }
    // ===========================================

    init() {
        try {
            console.log('🎯 Inicializando CRM Professional...');
            
            // Verificar si estamos listos para inicializar
            if (!this.waitForHTMLElements()) {
                console.log('⏳ Esperando a que el HTML esté disponible...');
                setTimeout(() => this.init(), 500);
                return;
            }
            
            console.log('✅ HTML elements disponibles, continuando inicialización...');
            
            // Datos de ejemplo deshabilitados
            this.migrateOldStatusToTags();
            // Nueva migración: normalizar teléfonos existentes y evitar teléfonos no válidos en contactos previos
            this.migrateContactsPhoneNormalization();
            // Remover contactos demo conocidos si existen
            this.removeKnownDemoContacts();
            
            // Cargar configuraciones
            this.loadSettings();
            
            // Vincular todos los eventos
            this.bindAllEvents();
            
            // Cargar contenido inicial
            this.loadInitialData();
            
            // Iniciar sincronización automática
            this.startPeriodicSync();
            // Iniciar observador de etiquetas de WhatsApp Business para sincronización en vivo
            try { 
                // Esperar a que DOMUtils esté disponible antes de iniciar el observador
                this.waitForDOMUtils().then(() => {
                    this.startBusinessLabelsObserver();
                });
            } catch (_) {}
            this.setupAuthUI();
            this.loadGroupName();
            // Disparar sincronización con Supabase en background (no bloqueante)
            setTimeout(() => { try { this.syncContactsWithSupabase?.(); } catch(_) {} }, 0);
            const teamNav = document.querySelector('.nav-item[data-section="team"]');
            if (teamNav) teamNav.addEventListener('click', () => this.loadTeamList());
            const btnRefreshTeam = document.getElementById('refreshTeam');
            if (btnRefreshTeam) btnRefreshTeam.addEventListener('click', () => this.loadTeamList());
            
            console.log('✅ CRM Professional iniciado correctamente');
            console.log('📊 Stats:', {
                contacts: this.contacts.length,
                tags: this.tags.length,
                templates: this.templates.length,
                events: this.debugStats.eventsbound
            });
            
        } catch (error) {
            console.error('❌ Error en inicialización:', error);
            this.debugStats.lastError = error;
            this.showNotification('Error al inicializar CRM', 'error');
        }
    }
    
    waitForHTMLElements() {
        const criticalElements = [
            'sidebarToggle',
            'addTagBtn', 
            'tagsContainer',
            'addTemplateBtn',
            'templatesContainer',
            'tagModal',
            'templateModal'
        ];
        
        const missingElements = criticalElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            console.log('⏳ Elementos faltantes:', missingElements);
            return false;
        }
        
        console.log('✅ Todos los elementos críticos encontrados');
        return true;
    }

    waitForDOMUtils() {
        return new Promise((resolve) => {
            const checkDOMUtils = () => {
                if (window.DOMUtils && typeof window.DOMUtils.openLabelsAndList === 'function') {
                    console.log('✅ DOMUtils disponible para sidebar');
                    resolve();
                } else {
                    console.log('⏳ Esperando DOMUtils...');
                    setTimeout(checkDOMUtils, 500);
                }
            };
            checkDOMUtils();
        });
    }

    createSampleDataIfEmpty() {
        // Crear etiquetas de ejemplo si no existen
        window.TagsService.loadTags().then(tags => {
            
        });

        // Crear plantillas de ejemplo si no existen
        if (this.templates.length === 0) {
            console.log('📄 Creando plantillas de ejemplo...');
            this.templates = [
                {
                    id: this.generateId(),
                    name: 'Saludo inicial',
                    category: 'general',
                    content: 'Hola {{nombre}}! 👋\n\nEspero que tengas un excelente {{dia_semana}}.\n\n¿En qué puedo ayudarte hoy?',
                    createdAt: new Date().toISOString()
                },
                {
                    id: this.generateId(),
                    name: 'Seguimiento comercial',
                    category: 'ventas',
                    content: 'Hola {{nombre}}! 💼\n\nTe contacto para hacer seguimiento a nuestra propuesta comercial.\n\n¿Tienes alguna pregunta o necesitas información adicional?\n\nFecha: {{fecha}}',
                    createdAt: new Date().toISOString()
                },
                {
                    id: this.generateId(),
                    name: 'Soporte técnico',
                    category: 'soporte',
                    content: 'Hola {{nombre}}! 🛠️\n\nHe recibido tu consulta de soporte.\n\nEstoy aquí para ayudarte a resolver cualquier inconveniente.\n\n¿Podrías describir el problema con más detalle?',
                    createdAt: new Date().toISOString()
                }
            ];
            this.saveTemplates();
        }

        // Crear contactos de ejemplo si no existen (como en las imágenes del kanban)
        if (this.contacts.length === 0) {
            console.log('👥 Creando contactos de ejemplo basados en las imágenes...');
            
            // Crear algunos contactos sin etiquetas para "Todos os contatos"
            this.contacts = [
                // Contactos como en las imágenes
                {
                    id: this.generateId(),
                    name: 'Amor',
                    phone: '+57 300 1234567',
                    status: 'lead',
                    tags: [],
                    notes: 'Contacto activo',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastChat: new Date(Date.now() - 30 * 60000).toISOString() // 30 min ago
                },
                {
                    id: this.generateId(),
                    name: 'ArcaTec',
                    phone: '+57 310 9876543',
                    status: 'client',
                    tags: [],
                    notes: '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastChat: new Date(Date.now() - 45 * 60000).toISOString() // 45 min ago
                },
                {
                    id: this.generateId(),
                    name: 'Mamá',
                    phone: '+57 320 5555555',
                    status: 'client',
                    tags: [],
                    notes: 'Dímelo',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastChat: new Date(Date.now() - 60 * 60000).toISOString() // 1 hour ago
                },
                {
                    id: this.generateId(),
                    name: 'IA 🤖 - De Boyaca ...',
                    phone: '+57 315 7777777',
                    status: 'lead',
                    tags: [],
                    notes: '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastChat: new Date(Date.now() - 2 * 3600000).toISOString() // 2 hours ago
                },
                // Contacto para la etiqueta "test"
                {
                    id: this.generateId(),
                    name: 'Contacto Test',
                    phone: '+57 311 1111111',
                    status: 'process',
                    tags: [this.tags[1]?.id], // Asignar a etiqueta "Prospecto" que se renombrará a "test"
                    notes: 'Contacto de prueba para kanban',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastChat: new Date(Date.now() - 15 * 60000).toISOString() // 15 min ago
                }
            ];
            
            // Renombrar la etiqueta "Prospecto" a "test" para coincidir con las imágenes
            if (this.tags[1]) {
                this.tags[1].name = 'test';
                this.tags[1].color = '#7c3aed'; // Color morado como en la imagen
                this.saveTags();
            }
            
            this.saveContacts();
        }
    }

    // Migrar contactos con status antiguo a etiquetas
    migrateOldStatusToTags() {
        try {
            console.log('🔄 Iniciando migración de status a etiquetas...');
            
            let migrated = 0;
            
            // Crear etiquetas para los status antiguos si no existen
            const statusToTagMap = {
                'lead': { name: 'Lead', color: '#f59e0b' },
                'process': { name: 'En Proceso', color: '#3b82f6' },
                'client': { name: 'Cliente', color: '#10b981' }
            };
            
            // Crear etiquetas de status si no existen
            for (const [statusKey, tagInfo] of Object.entries(statusToTagMap)) {
                let tag = this.tags.find(t => t.name === tagInfo.name);
                if (!tag) {
                    tag = {
                        id: this.generateId(),
                        name: tagInfo.name,
                        color: tagInfo.color,
                        description: `Migrado automáticamente desde status "${statusKey}"`,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    this.tags.push(tag);
                    console.log(`✅ Etiqueta creada: ${tag.name}`);
                }
                statusToTagMap[statusKey].id = tag.id;
            }
            
            // Migrar contactos
            this.contacts.forEach(contact => {
                // Si el contacto tiene status pero no etiquetas (o etiquetas vacías)
                if (contact.status && (!contact.tags || contact.tags.length === 0)) {
                    const statusInfo = statusToTagMap[contact.status];
                    if (statusInfo && statusInfo.id) {
                        contact.tags = [statusInfo.id];
                        migrated++;
                        console.log(`🏷️ ${contact.name}: ${contact.status} → ${statusInfo.name}`);
                    }
                }
            });
            
            if (migrated > 0) {
                this.saveTags();
                this.saveContacts();
                console.log(`✅ Migración completada: ${migrated} contactos migrados`);
            } else {
                console.log('ℹ️ No hay contactos para migrar');
            }
            
        } catch (error) {
            console.error('❌ Error en migración de status a etiquetas:', error);
        }
    }

    loadSettings() {
        try {
            // Forzar modo oscuro
            this.settings.theme = 'dark';
            document.documentElement.setAttribute('data-theme', 'dark');
            
            // Aplicar configuraciones de UI
            this.updateSettingsUI();
            
            console.log('⚙️ Configuraciones cargadas:', this.settings);
        } catch (error) {
            console.error('Error cargando configuraciones:', error);
        }
    }

    updateSettingsUI() {
        try {
            const elements = {
                themeSelect: document.getElementById('themeSelect'),
                languageSelect: document.getElementById('languageSelect'),
                autoSyncChk: document.getElementById('autoSyncChk'),
                notificationsChk: document.getElementById('notificationsChk'),
                compactModeChk: document.getElementById('compactModeChk')
            };

            if (elements.themeSelect) elements.themeSelect.value = 'dark';
            if (elements.languageSelect) elements.languageSelect.value = this.settings.language;
            if (elements.autoSyncChk) elements.autoSyncChk.checked = this.settings.autoSync;
            if (elements.notificationsChk) elements.notificationsChk.checked = this.settings.notifications;
            if (elements.compactModeChk) elements.compactModeChk.checked = this.settings.compactMode;
            
        } catch (error) {
            console.error('Error actualizando UI de configuraciones:', error);
        }
    }

    bindAllEvents() {
        try {
            console.log('🔗 Vinculando todos los eventos...');
            
            // Esperar a que el DOM esté completamente cargado
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.bindEventsInternal();
                });
            } else {
                this.bindEventsInternal();
            }
            
        } catch (error) {
            console.error('Error vinculando eventos:', error);
            this.debugStats.lastError = error;
        }
    }

    bindEventsInternal() {
        try {
            console.log('🔗 Iniciando bindEventsInternal...');
            
            // Verificar que el contenedor del sidebar existe antes de vincular eventos
            const sidebarContainer = document.getElementById('whatsapp-crm-sidebar');
            if (!sidebarContainer) {
                console.warn('⚠️ Contenedor del sidebar no encontrado, esperando...');
                setTimeout(() => this.bindEventsInternal(), 500);
                return;
            }
            
            console.log('✅ Contenedor del sidebar encontrado, vinculando eventos...');
            
            // Toggle sidebar
            this.bindToggleEvents();
            
            // Navegación
            this.bindNavigationEvents();
            
            // Pestañas dinámicas (reemplaza filtros)
            this.bindTabEvents();
            
            // Tags
            this.bindTagEvents();
            
            // Templates
            this.bindTemplateEvents();
            
            // Contacts
            this.bindContactEvents();
            
            // Kanban
            this.bindKanbanEvents();
            
            // Settings
            this.bindSettingsEvents();
            
            // Dashboard
            this.bindDashboardEvents();
            
            console.log(`✅ ${this.debugStats.eventsbound} eventos vinculados correctamente`);
            
        } catch (error) {
            console.error('Error en bindEventsInternal:', error);
            this.debugStats.lastError = error;
        }
    }

    bindToggleEvents() {
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleSidebar());
            this.debugStats.eventsbound++;
            console.log('✓ Toggle sidebar event bound');
        } else {
            console.error('❌ Toggle button (#sidebarToggle) not found - verificar que el HTML está cargado');
        }
    }

    bindNavigationEvents() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                if (section) {
                    // Si es kanban, abrir directamente en pantalla completa
                    if (section === 'kanban') {
                        console.log('📋 KANBAN CLICKED - Abriendo directamente en pantalla completa...');
                        this.openKanbanFullscreen();
                        return;
                    }
                    
                    console.log(`🧭 Navegando a: ${section}`);
                    this.showSection(section);
                }
            });
            this.debugStats.eventsbound++;
        });
        console.log(`✓ ${navItems.length} navigation events bound`);
        
        // Log adicional para debug
        const kanbanNavItem = document.querySelector('.nav-item[data-section="kanban"]');
        console.log('🎯 Kanban nav item encontrado:', kanbanNavItem);
    }

    bindTabEvents() {
        // Generar pestañas dinámicas al inicializar
        this.generateDynamicTabs();
        
        // Vincular eventos de búsqueda
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.trim();
                console.log(`🔍 Búsqueda: ${this.searchQuery}`);
                this.applyCurrentFilter();
            });
            this.debugStats.eventsbound++;
        }

        // Botón para agregar nueva etiqueta
        const addTabBtn = document.getElementById('addTabBtn');
        if (addTabBtn) {
            addTabBtn.addEventListener('click', () => {
                console.log('➕ Abriendo modal de nueva etiqueta desde pestañas...');
                this.openTagModal();
            });
            this.debugStats.eventsbound++;
        }

        console.log(`✓ Dynamic tabs system initialized`);

        // Botones auth en settings
        const openLoginBtn = document.getElementById('openLoginOverlayBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const authStatus = document.getElementById('authStatusText');
        if (openLoginBtn) openLoginBtn.addEventListener('click', () => this.showLoginOverlay());
        const openSignupBtn = document.getElementById('openSignupOverlayBtn');
        if (openSignupBtn) openSignupBtn.addEventListener('click', () => this.showSignupOverlay());
        if (logoutBtn) logoutBtn.addEventListener('click', async () => {
            if (!this.authService) this.authService = new window.AuthService();
            await this.authService.init();
            const res = await this.authService.logout();
            if (res.success) {
                this.showNotification('Sesión cerrada', 'info');
                authStatus && (authStatus.textContent = 'Sesión cerrada');
                this.setupAuthUI();
            }
        });
        if (authStatus && this.authService?.isUserAuthenticated()) authStatus.textContent = `Conectado: ${this.authService.getCurrentUser()?.email || ''}`;
    }

    // Generar pestañas dinámicas basadas en etiquetas
    generateDynamicTabs() {
        try {
            const tabsContainer = document.getElementById('tabsScroll');
            if (!tabsContainer) {
                console.warn('⚠️ Contenedor de pestañas no encontrado');
                return;
            }

            // Contar contactos por categoría
            const counts = this.getContactCounts();
            
            // Limpiar pestañas existentes
            tabsContainer.innerHTML = '';

            // Pestaña "Todos"
            const allTab = this.createTabElement('all', 'Todos', counts.all, true);
            tabsContainer.appendChild(allTab);

            // Pestañas por etiquetas
            this.tags.forEach(tag => {
                const count = counts.tags[tag.id] || 0;
                const tabElement = this.createTabElement(`tag_${tag.id}`, tag.name, count, false, tag.color);
                tabsContainer.appendChild(tabElement);
            });

            // Pestaña "Sin etiqueta" si hay contactos sin etiquetar
            if (counts.untagged > 0) {
                const untaggedTab = this.createTabElement('untagged', 'Sin etiqueta', counts.untagged, false, '#6b7280');
                tabsContainer.appendChild(untaggedTab);
            }

            // Pestaña "Multi" para contactos con varias etiquetas (opcional)
            if (counts.multi > 0) {
                const multiTab = this.createTabElement('multi', 'Multi', counts.multi, false, '#f59e0b');
                tabsContainer.appendChild(multiTab);
            }

            console.log(`📋 ${this.tags.length + 2} pestañas dinámicas generadas`);
            
        } catch (error) {
            console.error('Error generating dynamic tabs:', error);
        }
    }

    // Crear elemento de pestaña individual
    createTabElement(id, text, count, isActive = false, color = null) {
        const tabElement = document.createElement('button');
        tabElement.className = `tab-item ${isActive ? 'active' : ''}`;
        tabElement.dataset.filter = id;
        
        // Aplicar color si está disponible
        if (color && !isActive) {
            tabElement.style.borderColor = color;
            tabElement.style.color = color;
        }
        
        tabElement.innerHTML = `
            <span class="tab-text">${this.escapeHtml(text)}</span>
            <span class="tab-count">${count}</span>
        `;
        
        // Vincular evento click
        tabElement.addEventListener('click', () => {
            this.switchTab(id);
        });
        
        return tabElement;
    }

    // Cambiar pestaña activa
    switchTab(filterId) {
        try {
            // Actualizar clases active
            document.querySelectorAll('.tab-item').forEach(tab => {
                tab.classList.remove('active');
            });
            
            const activeTab = document.querySelector(`[data-filter="${filterId}"]`);
            if (activeTab) {
                activeTab.classList.add('active');
            }

            // Actualizar filtro actual
            this.currentFilter = filterId;
            console.log(`📋 Pestaña cambiada a: ${filterId}`);
            
            // Aplicar filtro
            this.applyCurrentFilter();
            
        } catch (error) {
            console.error('Error switching tab:', error);
        }
    }

    // Contar contactos por categorías
    getContactCounts() {
                    const counts = {
                all: this.contacts.length,
                tags: {},
                untagged: 0,
                multi: this.contacts.filter(c => Array.isArray(c.tags) && c.tags.length > 1).length
            };

        // Contar por etiquetas
        this.tags.forEach(tag => {
            counts.tags[tag.id] = this.contacts.filter(contact => 
                contact.tags && contact.tags.includes(tag.id)
            ).length;
        });

        // Contar sin etiqueta
        counts.untagged = this.contacts.filter(contact => 
            !contact.tags || contact.tags.length === 0
        ).length;

        return counts;
    }

    // Actualizar conteos de pestañas
    updateTabCounts() {
        try {
            const counts = this.getContactCounts();
            
            // Actualizar pestaña "Todos"
            const allTab = document.querySelector('[data-filter="all"] .tab-count');
            if (allTab) allTab.textContent = counts.all;

            // Actualizar pestañas de etiquetas
            this.tags.forEach(tag => {
                const tagTab = document.querySelector(`[data-filter="tag_${tag.id}"] .tab-count`);
                if (tagTab) tagTab.textContent = counts.tags[tag.id] || 0;
            });

            // Actualizar pestaña "Sin etiqueta"
            const untaggedTab = document.querySelector('[data-filter="untagged"] .tab-count');
            if (untaggedTab) untaggedTab.textContent = counts.untagged;

            // Actualizar pestaña "Multi"
            const multiTab = document.querySelector('[data-filter="multi"] .tab-count');
            if (multiTab) multiTab.textContent = counts.multi;

            console.log('📊 Conteos de pestañas actualizados');
            
        } catch (error) {
            console.error('Error updating tab counts:', error);
        }
    }

    bindDashboardEvents() {
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('🔄 Actualizando dashboard...');
                this.updateDashboard();
                this.showNotification('Dashboard actualizado', 'success');
            });
            this.debugStats.eventsbound++;
            console.log('✓ Dashboard refresh event bound');
        }
    }

    bindTagEvents() {
        try {
            // Verificar elementos críticos antes de vincular
            const requiredElements = [
                { id: 'addTagBtn', name: 'Add tag button' },
                { id: 'tagModal', name: 'Tag modal' },
                { id: 'tagsContainer', name: 'Tags container' }
            ];

            const missingElements = requiredElements.filter(element => !document.getElementById(element.id));
            if (missingElements.length > 0) {
                console.error('❌ Elementos faltantes para tags:', missingElements.map(e => e.name).join(', '));
                return;
            }

            // Botón agregar etiqueta
            const addTagBtn = document.getElementById('addTagBtn');
            addTagBtn.addEventListener('click', () => {
                console.log('🏷️ Abriendo modal de nueva etiqueta...');
                this.openTagModal();
            });
            this.debugStats.eventsbound++;
            console.log('✓ Add tag button event bound');

            // Modal de etiquetas
            const tagModal = document.getElementById('tagModal');
            const closeTagModal = document.getElementById('closeTagModal');
            const cancelTagBtn = document.getElementById('cancelTagBtn');
            const saveTagBtn = document.getElementById('saveTagBtn');

            if (closeTagModal) {
                closeTagModal.addEventListener('click', () => this.closeTagModal());
                this.debugStats.eventsbound++;
            }

            if (cancelTagBtn) {
                cancelTagBtn.addEventListener('click', () => this.closeTagModal());
                this.debugStats.eventsbound++;
            }

            if (saveTagBtn) {
                saveTagBtn.addEventListener('click', () => {
                    console.log('💾 Guardando etiqueta...');
                    this.saveTag();
                });
                this.debugStats.eventsbound++;
            }

            // Eventos globales de teclado
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeTagModal();
                    this.closeTemplateModal();
                    this.closeContactModal();
                }
            });
            this.debugStats.eventsbound++;

            console.log('✓ Tag events bound');
            
        } catch (error) {
            console.error('Error binding tag events:', error);
        }
    }

    bindTemplateEvents() {
        try {
            // Verificar elementos críticos antes de vincular
            const requiredElements = [
                { id: 'addTemplateBtn', name: 'Add template button' },
                { id: 'templateModal', name: 'Template modal' },
                { id: 'templatesContainer', name: 'Templates container' }
            ];

            const missingElements = requiredElements.filter(element => !document.getElementById(element.id));
            if (missingElements.length > 0) {
                console.error('❌ Elementos faltantes para templates:', missingElements.map(e => e.name).join(', '));
                return;
            }

            const addTemplateBtn = document.getElementById('addTemplateBtn');
            addTemplateBtn.addEventListener('click', () => {
                console.log('📄 Abriendo modal de nueva plantilla...');
                this.openTemplateModal();
            });
            this.debugStats.eventsbound++;

            const closeTemplateModal = document.getElementById('closeTemplateModal');
            const cancelTemplateBtn = document.getElementById('cancelTemplateBtn');
            const saveTemplateBtn = document.getElementById('saveTemplateBtn');
            const templateContent = document.getElementById('templateContent');

            if (closeTemplateModal) {
                closeTemplateModal.addEventListener('click', () => this.closeTemplateModal());
                this.debugStats.eventsbound++;
            }

            if (cancelTemplateBtn) {
                cancelTemplateBtn.addEventListener('click', () => this.closeTemplateModal());
                this.debugStats.eventsbound++;
            }

            if (saveTemplateBtn) {
                saveTemplateBtn.addEventListener('click', () => {
                    console.log('💾 Guardando plantilla...');
                    this.saveTemplate();
                });
                this.debugStats.eventsbound++;
            }

            if (templateContent) {
                templateContent.addEventListener('input', () => this.updateTemplatePreview());
                this.debugStats.eventsbound++;
            }

            console.log('✓ Template events bound');
            
        } catch (error) {
            console.error('Error binding template events:', error);
        }
    }

    bindContactEvents() {
        try {
            const addContactBtn = document.getElementById('addContactBtn');
            const importContactsBtn = document.getElementById('importContactsBtn');

            if (addContactBtn) {
                addContactBtn.addEventListener('click', () => {
                    console.log('👥 Abriendo modal de nuevo contacto...');
                    this.openContactModal();
                });
                this.debugStats.eventsbound++;
            }

            if (importContactsBtn) {
                importContactsBtn.addEventListener('click', () => {
                    console.log('📥 Importando contactos...');
                    this.importContacts();
                });
                this.debugStats.eventsbound++;
            }

            const closeContactModal = document.getElementById('closeContactModal');
            const cancelContactBtn = document.getElementById('cancelContactBtn');
            const saveContactBtn = document.getElementById('saveContactBtn');

            if (closeContactModal) {
                closeContactModal.addEventListener('click', () => this.closeContactModal());
                this.debugStats.eventsbound++;
            }

            if (cancelContactBtn) {
                cancelContactBtn.addEventListener('click', () => this.closeContactModal());
                this.debugStats.eventsbound++;
            }

            if (saveContactBtn) {
                saveContactBtn.addEventListener('click', () => {
                    console.log('💾 Guardando contacto...');
                    this.saveContact();
                });
                this.debugStats.eventsbound++;
            }

            console.log('✓ Contact events bound');
            
        } catch (error) {
            console.error('Error binding contact events:', error);
        }
    }

    bindKanbanEvents() {
        try {
            const refreshKanbanBtn = document.getElementById('refreshKanban');
            const expandKanbanBtn = document.getElementById('expandKanbanBtn');
            const closeKanbanFullscreen = document.getElementById('closeKanbanFullscreen');
            const refreshKanbanFullscreen = document.getElementById('refreshKanbanFullscreen');
            const addContactBtnFullscreen = document.getElementById('addContactBtnFullscreen');
            const addTagBtnFullscreen = document.getElementById('addTagBtnFullscreen');
            const backToSidebar = document.getElementById('backToSidebar');
            
            if (refreshKanbanBtn) {
                refreshKanbanBtn.addEventListener('click', () => {
                    console.log('🔄 Refrescando Kanban...');
                    this.loadKanban();
                });
                this.debugStats.eventsbound++;
            }

            if (expandKanbanBtn) {
                expandKanbanBtn.addEventListener('click', () => {
                    console.log('⛶ Abriendo Kanban en pantalla completa...');
                    this.openKanbanFullscreen();
                });
                this.debugStats.eventsbound++;
            }

            if (closeKanbanFullscreen) {
                closeKanbanFullscreen.addEventListener('click', () => {
                    console.log('✕ Cerrando Kanban fullscreen...');
                    this.closeKanbanFullscreen();
                });
                this.debugStats.eventsbound++;
            }

            if (refreshKanbanFullscreen) {
                refreshKanbanFullscreen.addEventListener('click', () => {
                    console.log('🔄 Refrescando Kanban fullscreen...');
                    this.renderKanbanFullscreen();
                });
                this.debugStats.eventsbound++;
            }

            if (addContactBtnFullscreen) {
                addContactBtnFullscreen.addEventListener('click', () => {
                    console.log('➕ Agregando contacto desde fullscreen...');
                    this.openContactModal();
                });
                this.debugStats.eventsbound++;
            }

            if (addTagBtnFullscreen) {
                addTagBtnFullscreen.addEventListener('click', () => {
                    console.log('🏷️ Abriendo modal de nueva etiqueta desde kanban...');
                    this.openTagModal();
                });
                this.debugStats.eventsbound++;
            }

            if (backToSidebar) {
                backToSidebar.addEventListener('click', () => {
                    console.log('← Volviendo al sidebar...');
                    this.closeKanbanFullscreen();
                });
                this.debugStats.eventsbound++;
            }

            // También hacer que al hacer clic en kanban nav abra fullscreen
            const kanbanNavItem = document.querySelector('[data-section="kanban"]');
            if (kanbanNavItem) {
                kanbanNavItem.addEventListener('dblclick', () => {
                    console.log('📋 Doble click en Kanban - Abriendo fullscreen...');
                    this.openKanbanFullscreen();
                });
            }

            // Cerrar con tecla Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const fullscreenContainer = document.getElementById('kanbanFullscreen');
                    if (fullscreenContainer && fullscreenContainer.classList.contains('active')) {
                        this.closeKanbanFullscreen();
                    }
                }
            });

            // Prevenir scroll del body cuando kanban está abierto
            document.addEventListener('wheel', (e) => {
                if (document.body.classList.contains('kanban-fullscreen-mode')) {
                    const kanbanContainer = e.target.closest('.kanban-fullscreen-container, .kanban-fullscreen-cards');
                    if (!kanbanContainer) {
                        e.preventDefault();
                    }
                }
            }, { passive: false });

        } catch (error) {
            console.error('Error binding kanban events:', error);
        }
    }

    bindKanbanFullscreenEvents() {
        try {
            console.log('🔗 Vinculando eventos de kanban fullscreen...');
            
            // Obtener elementos del fullscreen
            const closeKanbanFullscreen = document.getElementById('closeKanbanFullscreen');
            const refreshKanbanFullscreen = document.getElementById('refreshKanbanFullscreen');
            const backToSidebar = document.getElementById('backToSidebar');
            const addTagBtnFullscreen = document.getElementById('addTagBtnFullscreen');
            const addContactBtnFullscreen = document.getElementById('addContactBtnFullscreen');

            // Button to close fullscreen (in fullscreen mode)  
            if (closeKanbanFullscreen) {
                closeKanbanFullscreen.addEventListener('click', () => {
                    console.log('✖️ Cerrando kanban fullscreen...');
                    this.closeKanbanFullscreen();
                });
                this.debugStats.eventsbound++;
            }

            // Button to refresh kanban (in fullscreen mode)
            if (refreshKanbanFullscreen) {
                refreshKanbanFullscreen.addEventListener('click', () => {
                    console.log('🔄 Actualizando kanban fullscreen...');
                    this.renderKanbanFullscreen();
                });
                this.debugStats.eventsbound++;
            }

            // Back button
            if (backToSidebar) {
                backToSidebar.addEventListener('click', () => {
                    console.log('⬅️ Volviendo al sidebar...');
                    this.closeKanbanFullscreen();
                });
                this.debugStats.eventsbound++;
            }

            // Add tag button in fullscreen
            if (addTagBtnFullscreen) {
                addTagBtnFullscreen.addEventListener('click', () => {
                    console.log('🏷️ Abriendo modal de nueva etiqueta...');
                    this.openTagModal();
                });
                this.debugStats.eventsbound++;
            }

            // Add contact button in fullscreen
            if (addContactBtnFullscreen) {
                addContactBtnFullscreen.addEventListener('click', () => {
                    console.log('➕ Abriendo modal de nuevo contacto...');
                    this.openContactModal();
                });
                this.debugStats.eventsbound++;
            }

            console.log(`✅ ${this.debugStats.eventsbound} kanban fullscreen events bound`);
        } catch (error) {
            console.error('❌ Error binding kanban fullscreen events:', error);
        }
    }

    // ===========================================
    // KANBAN FULLSCREEN
    // ===========================================

    // Asegurar que el contenedor kanban fullscreen existe
    ensureKanbanFullscreenExists() {
        try {
            let fullscreenContainer = document.getElementById('kanbanFullscreen');
            
            if (!fullscreenContainer) {
                console.log('🔧 Creando contenedor kanban fullscreen...');
                
                // Crear el contenedor fullscreen si no existe
                fullscreenContainer = document.createElement('div');
                fullscreenContainer.id = 'kanbanFullscreen';
                fullscreenContainer.className = 'kanban-fullscreen';
                
                fullscreenContainer.innerHTML = `
                    <div class="kanban-fullscreen-header">
                        <div class="kanban-fullscreen-title">
                            <button class="kanban-back-btn" id="backToSidebar">← Volver</button>
                            <span style="font-size: 20px;">📋</span>
                            <h1>CRM Kanban</h1>
                        </div>
                        <div class="kanban-fullscreen-actions">
                            <button class="btn-secondary btn-sm" id="addTagBtnFullscreen">🏷️ Nueva Etiqueta</button>
                            <button class="btn-primary btn-sm" id="addContactBtnFullscreen">➕ Nuevo Contacto</button>
                            <button class="btn-secondary btn-sm" id="refreshKanbanFullscreen">🔄 Actualizar</button>
                            <button class="kanban-close-btn" id="closeKanbanFullscreen" title="Cerrar">✕</button>
                        </div>
                    </div>
                    
                    <div class="kanban-fullscreen-content">
                        <div class="kanban-fullscreen-container" id="kanbanFullscreenContainer">
                            <!-- Las columnas se generan dinámicamente -->
                        </div>
                    </div>
                `;
                
                // Agregar al body
                document.body.appendChild(fullscreenContainer);
                
                // Vincular eventos de los botones del fullscreen
                this.bindKanbanFullscreenEvents();
                
                console.log('✅ Contenedor kanban fullscreen creado');
            }
            
            return fullscreenContainer;
            
        } catch (error) {
            console.error('❌ Error creating kanban fullscreen container:', error);
            return null;
        }
    }

    openKanbanFullscreen() {
        try {
            console.log('🚀 === INICIANDO KANBAN FULLSCREEN COMPLETO ===');
            
            // 1. Ocultar WhatsApp y CRM
            console.log('1️⃣ Ocultando interfaces...');
            const whatsappApp = document.querySelector('#app');
            const crmSidebar = document.querySelector('.wa-crm-sidebar');
            
            if (whatsappApp) {
                whatsappApp.style.display = 'none';
                console.log('✅ WhatsApp Web ocultado');
            }
            
            if (crmSidebar) {
                crmSidebar.style.display = 'none';
                console.log('✅ CRM Sidebar ocultado');
            }
            
            // 2. Crear/mostrar overlay fullscreen con kanban completo
            console.log('2️⃣ Creando kanban fullscreen completo...');
            let overlay = document.getElementById('kanban-overlay-full');
            
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'kanban-overlay-full';
                overlay.style.cssText = `
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    background: #0d1117 !important;
                    z-index: 999999999 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    color: #e6edf3 !important;
                    font-family: system-ui, -apple-system, sans-serif !important;
                `;
                
                // Header del kanban fullscreen
                const headerHTML = `
                    <div class="kanban-fullscreen-header-custom" style="padding: 20px; background: #161b22; border-bottom: 1px solid #21262d; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <button id="kanban-back-btn-full" style="background: #00a884; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px;">← Volver</button>
                            <h1 style="margin: 0; color: #e6edf3; font-size: 24px;">📋 CRM Kanban</h1>
                        </div>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <button id="add-contact-fullscreen" style="background: #238636; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">➕ Nuevo Contacto</button>
                            <button id="add-tag-fullscreen" style="background: #7c3aed; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">🏷️ Nueva Etiqueta</button>
                            <button id="kanban-close-btn-full" style="background: rgba(255,255,255,0.1); color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 18px;">✕</button>
                        </div>
                    </div>
                `;
                
                // Container del kanban
                const kanbanHTML = `
                    <div class="kanban-fullscreen-content-custom" style="flex: 1; overflow: hidden; padding: 20px; background: #0d1117;">
                        <div class="kanban-fullscreen-container-custom" id="kanbanFullscreenContainerCustom" style="display: flex; gap: 20px; height: 100%; overflow-x: auto; overflow-y: hidden;">
                            <!-- Las columnas se generan aquí -->
                        </div>
                    </div>
                `;
                
                overlay.innerHTML = headerHTML + kanbanHTML;
                document.body.appendChild(overlay);
                console.log('✅ Overlay fullscreen creado');
                
                // Vincular eventos
                this.bindKanbanFullscreenCustomEvents();
            } else {
                overlay.style.display = 'flex';
                console.log('✅ Overlay fullscreen existente mostrado');
            }
            
            // 3. Renderizar kanban con datos reales
            this.renderKanbanFullscreenCustom();
            
            console.log('🎉 === KANBAN FULLSCREEN COMPLETO ACTIVO ===');
            
        } catch (error) {
            console.error('❌ Error opening kanban fullscreen:', error);
            alert('Error abriendo kanban: ' + error.message);
        }
    }
    
    bindKanbanSimpleEvents() {
        try {
            console.log('🔗 Vinculando eventos del kanban simple...');
            
            const backBtn = document.getElementById('kanban-back-btn');
            const closeBtn = document.getElementById('kanban-close-btn');
            
            if (backBtn) {
                // Remover listeners anteriores si existen
                backBtn.replaceWith(backBtn.cloneNode(true));
                const newBackBtn = document.getElementById('kanban-back-btn');
                
                newBackBtn.addEventListener('click', () => {
                    console.log('🔙 Botón volver clickeado');
                    this.closeKanbanSimple();
                });
                console.log('✅ Botón volver vinculado');
            }
            
            if (closeBtn) {
                // Remover listeners anteriores si existen
                closeBtn.replaceWith(closeBtn.cloneNode(true));
                const newCloseBtn = document.getElementById('kanban-close-btn');
                
                newCloseBtn.addEventListener('click', () => {
                    console.log('❌ Botón cerrar clickeado');
                    this.closeKanbanSimple();
                });
                console.log('✅ Botón cerrar vinculado');
            }
            
            // También permitir cerrar con tecla Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const overlay = document.getElementById('kanban-overlay-simple');
                    if (overlay && overlay.style.display !== 'none') {
                        console.log('⌨️ Escape presionado - cerrando kanban');
                        this.closeKanbanSimple();
                    }
                }
            });
            
            console.log('🎯 Eventos del kanban simple vinculados correctamente');
            
        } catch (error) {
            console.error('❌ Error vinculando eventos kanban simple:', error);
        }
    }

    closeKanbanSimple() {
        try {
            console.log('🔄 Cerrando kanban fullscreen...');
            
            // Mostrar WhatsApp y CRM de nuevo
            const whatsappApp = document.querySelector('#app');
            const crmSidebar = document.querySelector('.wa-crm-sidebar');
            const overlayOld = document.getElementById('kanban-overlay-simple');
            const overlayNew = document.getElementById('kanban-overlay-full');
            
            if (whatsappApp) {
                whatsappApp.style.display = '';
                console.log('✅ WhatsApp Web restaurado');
            }
            
            if (crmSidebar) {
                crmSidebar.style.display = '';
                console.log('✅ CRM Sidebar restaurado');
            }
            
            if (overlayOld) {
                overlayOld.style.display = 'none';
                console.log('✅ Overlay viejo ocultado');
            }
            
            if (overlayNew) {
                overlayNew.style.display = 'none';
                console.log('✅ Overlay nuevo ocultado');
            }
            
            console.log('🎉 Kanban cerrado correctamente');
            
        } catch (error) {
            console.error('❌ Error closing kanban:', error);
        }
    }

    // Vincular eventos del kanban fullscreen personalizado
    bindKanbanFullscreenCustomEvents() {
        try {
            console.log('🔗 Vinculando eventos del kanban fullscreen personalizado...');
            
            const backBtn = document.getElementById('kanban-back-btn-full');
            const closeBtn = document.getElementById('kanban-close-btn-full');
            const addContactBtn = document.getElementById('add-contact-fullscreen');
            const addTagBtn = document.getElementById('add-tag-fullscreen');
            
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    console.log('🔙 Botón volver clickeado');
                    this.closeKanbanSimple();
                });
                console.log('✅ Botón volver vinculado');
            }
            
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    console.log('❌ Botón cerrar clickeado');
                    this.closeKanbanSimple();
                });
                console.log('✅ Botón cerrar vinculado');
            }
            
            if (addContactBtn) {
                addContactBtn.addEventListener('click', () => {
                    console.log('➕ Abriendo modal de nuevo contacto desde kanban fullscreen');
                    this.openContactModal();
                });
                console.log('✅ Botón nuevo contacto vinculado');
            }
            
            if (addTagBtn) {
                addTagBtn.addEventListener('click', () => {
                    console.log('🏷️ Abriendo modal de nueva etiqueta desde kanban fullscreen');
                    this.openTagModal();
                });
                console.log('✅ Botón nueva etiqueta vinculado');
            }
            
            // También permitir cerrar con tecla Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const overlay = document.getElementById('kanban-overlay-full');
                    if (overlay && overlay.style.display !== 'none') {
                        console.log('⌨️ Escape presionado - cerrando kanban');
                        this.closeKanbanSimple();
                    }
                }
            });
            
            console.log('🎯 Eventos del kanban fullscreen vinculados correctamente');
            
        } catch (error) {
            console.error('❌ Error vinculando eventos kanban fullscreen:', error);
        }
    }

    // Renderizar kanban fullscreen con datos reales
    renderKanbanFullscreenCustom() {
        try {
            console.log('🎨 Renderizando kanban fullscreen con datos reales...');
            
            const container = document.getElementById('kanbanFullscreenContainerCustom');
            if (!container) {
                console.error('❌ Container del kanban fullscreen no encontrado');
                return;
            }
            
            // Generar columnas usando el mismo sistema que el sidebar
            const columns = this.generateKanbanColumnsFromImages();
            
            // Limpiar contenedor
            container.innerHTML = '';
            
            columns.forEach(column => {
                // Filtrar contactos para esta columna
                const columnContacts = this.getContactsForColumn(this.contacts, column);
                
                // Crear elemento de columna para fullscreen
                const columnElement = document.createElement('div');
                columnElement.className = 'kanban-column-fullscreen';
                columnElement.setAttribute('data-column-id', column.id);
                
                // Hacer que la primera columna (Todos os contatos) sea sticky
                const isFirstColumn = column.type === 'all';
                const stickyStyles = isFirstColumn ? `
                    position: sticky;
                    left: 0;
                    z-index: 1000;
                    box-shadow: 2px 0 8px rgba(0,0,0,0.3);
                ` : '';
                
                columnElement.style.cssText = `
                    min-width: 350px;
                    max-width: 400px;
                    background: #161b22;
                    border-radius: 12px;
                    border: 1px solid #21262d;
                    display: flex;
                    flex-direction: column;
                    height: calc(100vh - 140px);
                    overflow: hidden;
                    ${stickyStyles}
                `;
                
                columnElement.innerHTML = `
                    <div class="kanban-header-fullscreen" style="padding: 20px; background: ${column.color}; color: white; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 18px; font-weight: 700;">${column.title}</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 6px; font-weight: 700; min-width: 30px; text-align: center;">${columnContacts.length}</span>
                            <span style="font-size: 14px; opacity: 0.8;">itens</span>
                        </div>
                    </div>
                    <div class="kanban-cards-fullscreen" 
                         data-tag-id="${column.tagId || 'untagged'}"
                         style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; position: relative;">
                        ${this.renderContactCardsForKanbanFullscreen(columnContacts)}
                    </div>
                `;
                
                container.appendChild(columnElement);
            });
            
            this.bindKanbanDndEvents(container);
            console.log(`✅ Kanban fullscreen renderizado: ${columns.length} columnas, ${this.contacts.length} contactos total`);
            
        } catch (error) {
            console.error('❌ Error renderizando kanban fullscreen:', error);
        }
    }

    // Renderizar tarjetas para kanban fullscreen (más grandes)
    renderContactCardsForKanbanFullscreen(contacts) {
        if (contacts.length === 0) {
            return `
                <div style="text-align: center; padding: 40px; color: #8b949e; border: 2px dashed #30363d; border-radius: 8px; margin: 20px 0;">
                    <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">👤</div>
                    <div style="font-size: 16px;">Sem contatos</div>
                </div>
            `;
        }

        return contacts.map(contact => {
            const avatar = this.getContactInitials(contact.name || contact.phone);
            const avatarColor = this.getContactColor(contact.phone);
            const timeDisplay = contact.lastChat ? this.formatTime(contact.lastChat) : '19:43';
            
            return `
                <div class="contact-card-fullscreen" 
                     draggable="true"
                     data-contact-id="${contact.id}"
                     style="background: #21262d; border: 1px solid #30363d; border-radius: 12px; padding: 16px; transition: all 0.2s ease; cursor: grab;">
                    
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; flex: 1; min-width: 0;">
                            <div style="width: 48px; height: 48px; border-radius: 50%; background: ${avatarColor}; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 600; color: white; margin-right: 12px; flex-shrink: 0;">
                                ${avatar}
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-size: 16px; font-weight: 600; color: #e6edf3; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    ${this.escapeHtml(contact.name || contact.phone)}
                                </div>
                                <div style="font-size: 14px; color: #8b949e; font-family: monospace;">
                                    ${timeDisplay}
                                </div>
                            </div>
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 8px;">
                            ${contact.tags && contact.tags.length > 0 ? `
                                <button onclick="event.stopPropagation(); whatsappCRM.removeContactTag('${contact.id}')" 
                                        style="background: none; border: none; cursor: pointer; padding: 8px; border-radius: 6px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center;"
                                        onmouseover="this.style.background='rgba(248,81,73,0.1)'; this.style.transform='scale(1.1)';"
                                        onmouseout="this.style.background='none'; this.style.transform='scale(1)';"
                                        title="Remover etiqueta">
                                    <span style="color: #f85149; font-size: 18px;">🗑️</span>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding-top: 12px; border-top: 1px solid #30363d;">
                        <button onclick="event.stopPropagation(); whatsappCRM.callContact('${contact.phone}')" 
                                style="background: #30363d; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; color: #e6edf3;"
                                onmouseover="this.style.background='#0891b2'; this.style.transform='scale(1.1)';"
                                onmouseout="this.style.background='#30363d'; this.style.transform='scale(1)';"
                                title="Acciones">
                            ⏰
                        </button>
                        <button onclick="event.stopPropagation(); whatsappCRM.openWhatsApp('${contact.phone}')" 
                                style="background: #30363d; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; color: #e6edf3;"
                                onmouseover="this.style.background='#25d366'; this.style.transform='scale(1.1)';"
                                onmouseout="this.style.background='#30363d'; this.style.transform='scale(1)';"
                                title="WhatsApp">
                            📋
                        </button>
                        <button onclick="event.stopPropagation(); whatsappCRM.openContactModal('${contact.id}')" 
                                style="background: #30363d; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; color: #e6edf3;"
                                onmouseover="this.style.background='#238636'; this.style.transform='scale(1.1)';"
                                onmouseout="this.style.background='#30363d'; this.style.transform='scale(1)';"
                                title="Editar">
                            💬
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Actualizar todas las vistas de kanban que estén activas
    updateAllKanbanViews() {
        try {
            console.log('🔄 Actualizando todas las vistas de kanban...');
            
            // Verificar si el kanban fullscreen está activo
            const fullscreenOverlay = document.getElementById('kanban-overlay-full');
            console.log('🔍 Estado del overlay fullscreen:', {
                existe: !!fullscreenOverlay,
                display: fullscreenOverlay?.style.display,
                clases: fullscreenOverlay?.className
            });
            
            // Actualizar kanban fullscreen si está activo
            if (fullscreenOverlay && (fullscreenOverlay.style.display === 'flex' || fullscreenOverlay.style.display !== 'none')) {
                console.log('📋 Actualizando kanban fullscreen...');
                this.renderKanbanFullscreenCustom();
            }
            
            // Actualizar kanban del sidebar si es la sección activa
            if (this.currentSection === 'kanban') {
                console.log('📋 Actualizando kanban del sidebar...');
                this.renderKanbanCards();
            }
            
            console.log('✅ Todas las vistas de kanban actualizadas');
            
        } catch (error) {
            console.error('❌ Error actualizando vistas de kanban:', error);
        }
    }

    // Función de prueba para el drag and drop
    testDragAndDrop() {
        console.log('🧪 === PRUEBA DE DRAG AND DROP ===');
        console.log('📊 Contactos actuales:', this.contacts.length);
        console.log('🏷️ Etiquetas actuales:', this.tags.length);
        
        // Mostrar estado de cada contacto
        this.contacts.forEach(contact => {
            console.log(`👤 ${contact.name}:`, {
                id: contact.id,
                tags: contact.tags,
                tagNames: contact.tags?.map(tagId => {
                    const tag = this.tags.find(t => t.id === tagId);
                    return tag?.name || 'Etiqueta no encontrada';
                })
            });
        });
        
        // Verificar estado del kanban
        const overlay = document.getElementById('kanban-overlay-full');
        console.log('🎯 Estado del kanban fullscreen:', {
            existe: !!overlay,
            visible: overlay?.style.display !== 'none',
            display: overlay?.style.display
        });
        
                 console.log('✅ === FIN PRUEBA ===');
     }

     // Función para simular movimiento de contacto programáticamente
     simularMovimientoContacto(contactoNombre, etiquetaNombre) {
         console.log(`🧪 === SIMULANDO MOVIMIENTO PROGRAMÁTICO ===`);
         
         // Buscar contacto por nombre
         const contact = this.contacts.find(c => 
             c.name.toLowerCase().includes(contactoNombre.toLowerCase())
         );
         
         if (!contact) {
             console.error(`❌ Contacto "${contactoNombre}" no encontrado`);
             return;
         }
         
         // Buscar etiqueta por nombre
         let targetTagId = null;
         if (etiquetaNombre && etiquetaNombre.toLowerCase() !== 'todos') {
             const tag = this.tags.find(t => 
                 t.name.toLowerCase().includes(etiquetaNombre.toLowerCase())
             );
             
             if (!tag) {
                 console.error(`❌ Etiqueta "${etiquetaNombre}" no encontrada`);
                 return;
             }
             
             targetTagId = tag.id;
         }
         
         console.log(`📋 Simulando movimiento de "${contact.name}" a "${etiquetaNombre || 'Todos os contatos'}"`);
         
         // Ejecutar el movimiento
         this.moveContactToTag(contact.id, targetTagId);
         
         console.log(`✅ === SIMULACIÓN COMPLETADA ===`);
     }







    closeKanbanFullscreen() {
        try {
            const fullscreenContainer = document.getElementById('kanbanFullscreen');
            if (fullscreenContainer) {
                // Ocultar kanban
                fullscreenContainer.classList.remove('active');
                
                // Mostrar WhatsApp Web de nuevo
                this.showWhatsAppInterface();
                
                console.log('✅ Kanban fullscreen cerrado - WhatsApp Web visible');
            }
        } catch (error) {
            console.error('Error closing kanban fullscreen:', error);
        }
    }

    // Ocultar interfaz de WhatsApp Web completamente
    hideWhatsAppInterface() {
        try {
            // Ocultar el contenedor principal de WhatsApp
            const whatsappApp = document.querySelector('#app');
            if (whatsappApp) {
                whatsappApp.style.display = 'none';
            }
            
            // Ocultar el sidebar CRM también
            const crmSidebar = document.querySelector('.wa-crm-sidebar');
            if (crmSidebar) {
                crmSidebar.style.display = 'none';
            }
            
            // Marcar body para CSS
            document.body.classList.add('kanban-fullscreen-mode');
            
            console.log('🙈 WhatsApp Web interface oculta');
            
        } catch (error) {
            console.error('Error hiding WhatsApp interface:', error);
        }
    }

    // Mostrar interfaz de WhatsApp Web de nuevo
    showWhatsAppInterface() {
        try {
            // Mostrar el contenedor principal de WhatsApp
            const whatsappApp = document.querySelector('#app');
            if (whatsappApp) {
                whatsappApp.style.display = '';
            }
            
            // Mostrar el sidebar CRM también
            const crmSidebar = document.querySelector('.wa-crm-sidebar');
            if (crmSidebar) {
                crmSidebar.style.display = '';
            }
            
            // Remover clase del body
            document.body.classList.remove('kanban-fullscreen-mode');
            
            console.log('👁️ WhatsApp Web interface visible');
            
        } catch (error) {
            console.error('Error showing WhatsApp interface:', error);
        }
    }

    renderKanbanFullscreen(contacts = this.contacts) {
        try {
            console.log('🎨 Iniciando renderizado de kanban fullscreen...');
            
            const container = document.getElementById('kanbanFullscreenContainer');
            if (!container) {
                console.error('❌ Fullscreen container not found');
                console.log('🔍 Buscando elementos relacionados:', {
                    kanbanFullscreen: document.getElementById('kanbanFullscreen'),
                    kanbanFullscreenContainer: document.getElementById('kanbanFullscreenContainer'),
                    allKanbanElements: document.querySelectorAll('[id*="kanban"]')
                });
                return;
            }

            console.log('📦 Container encontrado:', container);

            // Generar columnas dinámicamente basadas en las etiquetas
            const columns = this.generateKanbanColumns();
            console.log('📋 Columnas generadas:', columns.length, columns);
            
            // Usar contactos reales del sistema
            let contactsToRender = contacts;
            console.log('👥 Contactos a renderizar:', contactsToRender.length);

            container.innerHTML = columns.map(column => {
                // Filtrar contactos por etiqueta
                let columnContacts = this.getContactsByTag(contactsToRender, column.tagId);

                return `
                    <div class=\"kanban-fullscreen-column\" data-tag-id=\"${column.tagId || 'untagged'}\">
                        <div class=\"kanban-fullscreen-column-header\" style=\"background: ${column.color}\">
                            <span class=\"kanban-fullscreen-column-title\">${column.title}</span>
                            <div style=\"display: flex; align-items: center; gap: 8px;\">
                                <span class=\"kanban-fullscreen-column-count\">${columnContacts.length}</span>
                                <span class=\"kanban-fullscreen-column-subtitle\">contactos</span>
                            </div>
                        </div>
                        <div class=\"kanban-fullscreen-cards\" 
                             data-tag-id=\"${column.tagId || 'untagged'}\" style=\"min-height: 80px;\">
                            ${this.renderKanbanFullscreenCards(columnContacts.map(c => ({...c})))}
                        </div>
                        <div class=\"kanban-add-contact\" onclick=\"whatsappCRM.addContactToTag('${column.tagId || ''}')\">
                            <span>+ Agregar contacto</span>
                        </div>
                    </div>
                `;
            }).join('');

            this.bindKanbanDndEvents(container);
            console.log(`📋 Kanban fullscreen renderizado con ${columns.length} columnas y ${contactsToRender.length} contactos`);
            
            // Verificar que el contenido se ha insertado correctamente
            const insertedColumns = container.querySelectorAll('.kanban-fullscreen-column');
            console.log('✅ Columnas insertadas en DOM:', insertedColumns.length);
            
            // Verificar que las tarjetas se han insertado
            const insertedCards = container.querySelectorAll('.kanban-fullscreen-card');
            console.log('📄 Tarjetas insertadas en DOM:', insertedCards.length);

        } catch (error) {
            console.error('❌ Error rendering kanban fullscreen:', error);
        }
    }

    // Generar columnas basadas en etiquetas
    generateKanbanColumns() {
        const columns = [];
        
        // Columna para contactos sin etiquetas
        columns.push({
            tagId: null,
            title: 'Sin Etiqueta',
            color: '#6B7280',
            description: 'Contactos sin clasificar'
        });

        // Columna por cada etiqueta
        this.tags.forEach(tag => {
            columns.push({
                tagId: tag.id,
                title: tag.name,
                color: tag.color,
                description: tag.description || ''
            });
        });

        return columns;
    }

    // Obtener contactos por etiqueta
    getContactsByTag(contacts, tagId) {
        if (!tagId) {
            // Contactos sin etiquetas o con array de etiquetas vacío
            return contacts.filter(contact => 
                !contact.tags || 
                contact.tags.length === 0
            );
        }

        // Contactos que tienen esta etiqueta
        return contacts.filter(contact => 
            contact.tags && 
            contact.tags.includes(tagId)
        );
    }

    // Agregar contacto a una etiqueta específica
    addContactToTag(tagId) {
        console.log(`➕ Agregando contacto a etiqueta: ${tagId}`);
        // Abrir modal de contacto con etiqueta preseleccionada
        this.openContactModal(null, tagId);
    }

    renderKanbanFullscreenCards(contacts) {
        try {
            if (contacts.length === 0) {
                return `
                    <div class="empty-state">
                        <div class="empty-state-icon">👤</div>
                        <div class="empty-state-text">Sin contactos</div>
                    </div>
                `;
            }

            return contacts.map(contact => {
                const isMulti = Array.isArray(contact.tags) && contact.tags.length > 1;
                const style = isMulti ? 'box-shadow: 0 0 0 2px #f59e0b, 0 0 14px rgba(245,158,11,.35); position: relative;' : '';
                const badge = isMulti ? '<span style="position:absolute; top:-8px; right:-8px; background:#f59e0b; color:#0b0f14; font-weight:700; font-size:10px; padding:2px 6px; border-radius:999px;">×</span>' : '';
                return `
                <div class="kanban-fullscreen-card" 
                     draggable="true" 
                     data-contact-id="${contact.id}" style="${style}">
                    ${badge}
                    <div class="kanban-fullscreen-card-header">
                        <div class="kanban-fullscreen-avatar" style="background: ${this.getContactColor(contact.phone)}">
                            ${this.getContactInitials(contact.name || contact.phone)}
                        </div>
                        <div class="kanban-fullscreen-info">
                            <div class="kanban-fullscreen-name">${this.escapeHtml(contact.name || contact.phone)}</div>
                            <div class="kanban-fullscreen-phone">${contact.phone}</div>
                        </div>
                    </div>
                    <div class="kanban-fullscreen-status">${this.getContactStatusText(contact)}</div>
                    <div class="kanban-fullscreen-actions">
                        <button class="kanban-fullscreen-action-btn call" onclick="event.stopPropagation(); whatsappCRM.promptReminder('${contact.id}')" title="Recordatorio">
                                                         ⏰
                        </button>
                        <button class="kanban-fullscreen-action-btn whatsapp" onclick="event.stopPropagation(); whatsappCRM.openWhatsApp('${contact.phone}')" title="WhatsApp">
                            💬
                        </button>
                        <button class="kanban-fullscreen-action-btn" onclick="event.stopPropagation(); whatsappCRM.openContactDetails('${contact.id}')" title="Ver detalles">
                            👁️
                        </button>
                        <button class="kanban-fullscreen-action-btn" onclick="event.stopPropagation(); whatsappCRM.changeContactStatus('${contact.id}')" title="Cambiar estado">
                            ⚙️
                        </button>
                    </div>
                </div>`;
            }).join('');

        } catch (error) {
            console.error('Error rendering fullscreen cards:', error);
            return '<div class="empty-state"><div class="empty-state-text">Error cargando contactos</div></div>';
        }
    }

    bindSettingsEvents() {
        try {
            // Solo eventos de funcionalidad, no tema (fijo en oscuro)
            const autoSyncChk = document.getElementById('autoSyncChk');
            const notificationsChk = document.getElementById('notificationsChk');
            const compactModeChk = document.getElementById('compactModeChk');
            const syncBtn = document.getElementById('syncBtn');
            const exportBtn = document.getElementById('exportBtn');
            const importBtn = document.getElementById('importBtn');
            const resetSettingsBtn = document.getElementById('resetSettingsBtn');

            if (autoSyncChk) {
                autoSyncChk.addEventListener('change', (e) => {
                    this.settings.autoSync = e.target.checked;
                    this.saveSettings();
                    console.log(`🔄 Auto sync: ${e.target.checked}`);
                });
                this.debugStats.eventsbound++;
            }

            if (notificationsChk) {
                notificationsChk.addEventListener('change', (e) => {
                    this.settings.notifications = e.target.checked;
                    this.saveSettings();
                    console.log(`🔔 Notifications: ${e.target.checked}`);
                });
                this.debugStats.eventsbound++;
            }

            if (compactModeChk) {
                compactModeChk.addEventListener('change', (e) => {
                    this.settings.compactMode = e.target.checked;
                    this.saveSettings();
                    this.applyCompactMode(e.target.checked);
                    console.log(`📱 Compact mode: ${e.target.checked}`);
                });
                this.debugStats.eventsbound++;
            }

            if (syncBtn) {
                syncBtn.addEventListener('click', () => this.syncData());
                this.debugStats.eventsbound++;
            }

            if (exportBtn) {
                exportBtn.addEventListener('click', () => this.exportData());
                this.debugStats.eventsbound++;
            }

            if (importBtn) {
                importBtn.addEventListener('click', () => this.importData());
                this.debugStats.eventsbound++;
            }

            if (resetSettingsBtn) {
                resetSettingsBtn.addEventListener('click', () => this.resetSettings());
                this.debugStats.eventsbound++;
            }

            console.log('✓ Settings events bound');
            
        } catch (error) {
            console.error('Error binding settings events:', error);
        }
    }

    loadInitialData() {
        try {
            console.log('📊 Cargando datos iniciales...');
            
            this.updateDashboard();
            this.loadTags();
            this.loadTemplates();
            this.loadContacts();
            this.updateCurrentChat();
            
            // Cargar kanban si es la sección activa
            if (this.currentSection === 'kanban') {
                this.loadKanban();
            }
            
            console.log('✅ Datos iniciales cargados');
            
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
            this.debugStats.lastError = error;
        }
    }

    // ===========================================
    // NAVEGACIÓN Y UI
    // ===========================================

    toggleSidebar() {
        try {
            const sidebar = document.querySelector('.wa-crm-sidebar');
            if (sidebar) {
                this.isCollapsed = !this.isCollapsed;
                sidebar.classList.toggle('collapsed', this.isCollapsed);
                
                const toggleIcon = document.querySelector('.toggle-icon');
                if (toggleIcon) {
                    toggleIcon.textContent = this.isCollapsed ? '⟩' : '⟨';
                }
                
                console.log(`📐 Sidebar ${this.isCollapsed ? 'collapsed' : 'expanded'}`);
            }
        } catch (error) {
            console.error('Error toggling sidebar:', error);
        }
    }

    showSection(sectionName) {
        try {
            console.log(`📱 Mostrando sección: ${sectionName}`);
            
            // Actualizar navegación
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`);
            if (activeNavItem) {
                activeNavItem.classList.add('active');
            }
            
            // Actualizar contenido
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            
            const activeSection = document.getElementById(sectionName);
            if (activeSection) {
                activeSection.classList.add('active');
                this.currentSection = sectionName;
                
                // Cargar datos específicos de la sección
                this.loadSectionData(sectionName);
            }
            
        } catch (error) {
            console.error('Error showing section:', error);
        }
    }

    loadSectionData(sectionName) {
        try {
            console.log(`📊 Cargando datos para sección: ${sectionName}`);
            
            switch (sectionName) {
                case 'dashboard':
                    this.updateDashboard();
                    break;
                case 'kanban':
                    console.log('📋 Iniciando carga de kanban...');
                    // Pequeño delay para asegurar que el DOM esté listo
                    setTimeout(() => {
                        this.loadKanban();
                    }, 100);
                    break;
                case 'contacts':
                    this.loadContactsList();
                    break;
                case 'tags':
                    this.loadTags();
                    break;
                case 'templates':
                    this.loadTemplates();
                    break;
                case 'analytics':
                    this.loadAnalytics();
                    break;
                default:
                    console.log(`Sección ${sectionName} sin datos específicos`);
            }
        } catch (error) {
            console.error(`Error loading data for section ${sectionName}:`, error);
        }
    }

    applyCompactMode(compact) {
        const sidebar = document.querySelector('.wa-crm-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('compact', compact);
        }
    }

    // ===========================================
    // FILTROS Y BÚSQUEDA
    // ===========================================

    applyCurrentFilter() {
        try {
            const filteredContacts = this.contacts.filter(contact => {
                // Filtro de búsqueda
                const matchesSearch = !this.searchQuery || 
                    contact.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                    contact.phone.includes(this.searchQuery);
                
                // Filtro por pestaña
                let matchesFilter = false;
                
                if (this.currentFilter === 'all') {
                    matchesFilter = true;
                } else if (this.currentFilter === 'untagged') {
                    matchesFilter = !contact.tags || contact.tags.length === 0;
                } else if (this.currentFilter.startsWith('tag_')) {
                    const tagId = this.currentFilter.replace('tag_', '');
                    matchesFilter = Array.isArray(contact.tags) && contact.tags.includes(tagId);
                } else if (this.currentFilter === 'multi') {
                    matchesFilter = Array.isArray(contact.tags) && contact.tags.length > 1;
                } else {
                    // Compatibilidad con filtros antiguos
                    matchesFilter = contact.status === this.currentFilter;
                }
                
                return matchesSearch && matchesFilter;
            });

            console.log(`📋 Filtro aplicado (${this.currentFilter}): ${filteredContacts.length}/${this.contacts.length} contactos`);
            this.renderFilteredContacts(filteredContacts);
            
        } catch (error) {
            console.error('Error applying current filter:', error);
        }
    }

    renderFilteredContacts(contacts) {
        try {
            if (this.currentSection === 'kanban') {
                this.renderKanbanCards(contacts);
            } else if (this.currentSection === 'contacts') {
                this.renderContactsList(contacts);
            }
        } catch (error) {
            console.error('Error rendering filtered contacts:', error);
        }
    }

    // ===========================================
    // DASHBOARD
    // ===========================================

    updateDashboard() {
        try {
            console.log('📊 Actualizando dashboard...');
            
            const elements = {
                totalContacts: document.getElementById('totalContacts'),
                totalTags: document.getElementById('totalTags'),
                totalTemplates: document.getElementById('totalTemplates'),
                todayChats: document.getElementById('todayChats')
            };

            if (elements.totalContacts) elements.totalContacts.textContent = this.contacts.length;
            if (elements.totalTags) elements.totalTags.textContent = this.tags.length;
            if (elements.totalTemplates) elements.totalTemplates.textContent = this.templates.length;
            if (elements.todayChats) elements.todayChats.textContent = this.getTodayChatsCount();

            this.updateRecentActivity();
            
            console.log('✅ Dashboard actualizado');
            
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }

    getTodayChatsCount() {
        try {
            const today = new Date().toDateString();
            return this.contacts.filter(contact => 
                contact.lastChat && new Date(contact.lastChat).toDateString() === today
            ).length;
        } catch (error) {
            console.error('Error getting today chats count:', error);
            return 0;
        }
    }

    updateRecentActivity() {
        try {
            const container = document.getElementById('recentActivityList');
            if (!container) return;

            const recentContacts = this.contacts
                .filter(contact => contact.lastChat)
                .sort((a, b) => new Date(b.lastChat) - new Date(a.lastChat))
                .slice(0, 5);

            if (recentContacts.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📱</div>
                        <div class="empty-state-text">No hay actividad reciente</div>
                        <div class="empty-state-subtext">Los chats aparecerán aquí cuando interactúes con WhatsApp</div>
                    </div>
                `;
                return;
            }

            container.innerHTML = recentContacts.map(contact => `
                <div class="contact-card interactive recent-contact-card" data-contact-id="${contact.id}">
                    <div class="contact-header">
                        <div class="contact-avatar">${this.getContactInitials(contact.name || contact.phone)}</div>
                        <div class="contact-info">
                            <div class="contact-name">${this.escapeHtml(contact.name)}</div>
                            <div class="contact-phone">${contact.phone}</div>
                        </div>
                    </div>
                    ${contact.tags?.length ? `
                        <div class="contact-tags">
                            ${contact.tags.slice(0, 2).map(tagId => {
                                const tag = this.tags.find(t => t.id === tagId);
                                return tag ? `<span class="contact-tag" style="background: ${tag.color}">${tag.name}</span>` : '';
                            }).join('')}
                            ${contact.tags.length > 2 ? `<span class="contact-tag">+${contact.tags.length - 2}</span>` : ''}
                        </div>
                    ` : ''}
                    <div class="contact-meta">
                        <span>${this.formatDate(contact.lastChat)}</span>
                        <span class="badge ${this.getStatusClass(contact.status)}">${this.getStatusLabel(contact.status)}</span>
                    </div>
                </div>
            `).join('');

            // Vincular eventos para actividad reciente
            this.bindRecentActivityEvents();
            
        } catch (error) {
            console.error('Error updating recent activity:', error);
        }
    }

    bindRecentActivityEvents() {
        try {
            const recentCards = document.querySelectorAll('.recent-contact-card');
            recentCards.forEach(card => {
                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    const contactId = card.dataset.contactId;
                    if (contactId) {
                        console.log(`📱 Abriendo detalles del contacto: ${contactId}`);
                        this.openContactDetails(contactId);
                    }
                });
            });

            console.log(`🔗 Eventos actividad reciente vinculados: ${recentCards.length} tarjetas`);

        } catch (error) {
            console.error('Error binding recent activity events:', error);
        }
    }

    // ===========================================
    // VISTA KANBAN - BASADO EN IMÁGENES DE REFERENCIA
    // ===========================================

    loadKanban() {
        try {
            console.log('📋 Cargando vista Kanban basada en imágenes...');
            this.renderKanbanCards();
        } catch (error) {
            console.error('Error loading kanban:', error);
        }
    }

    // Generar columnas basándose en las imágenes de referencia
    generateKanbanColumnsFromImages() {
        const columns = [];
        
        // Columna principal "Todos os contatos" (verde como en la imagen)
        columns.push({
            id: 'all',
            title: 'Todos os contatos',
            color: '#2563eb', // Azul como en la imagen
            type: 'all'
        });
        
        // Columnas por etiquetas (como "test" en la imagen)
        this.tags.forEach(tag => {
            columns.push({
                id: `tag_${tag.id}`,
                title: tag.name,
                color: tag.color || '#7c3aed', // Color de la etiqueta o morado por defecto
                type: 'tag',
                tagId: tag.id
            });
        });
        
        return columns;
    }

    // Filtrar contactos para cada columna
    getContactsForColumn(contacts, column) {
        if (column.type === 'all') {
            // Columna "Todos os contatos" - mostrar todos
            return contacts;
        } else if (column.type === 'tag') {
            // Columnas de etiquetas - mostrar solo contactos con esa etiqueta
            // Sin filtrar duplicados: un contacto con múltiples etiquetas aparecerá en varias columnas
            return contacts.filter(contact => 
                Array.isArray(contact.tags) && contact.tags.includes(column.tagId)
            );
        }
        return [];
    }

    // Renderizar tarjetas de contactos exactamente como en las imágenes
    renderContactCardsForKanban(contacts) {
        // Nota: Los contactos pueden aparecer en múltiples columnas cuando poseen varias etiquetas.
        if (contacts.length === 0) {
            return `
                <div class="empty-state" style="text-align: center; padding: 20px; color: #8b949e;">
                    <div style="font-size: 32px; margin-bottom: 8px;">👤</div>
                    <div style="font-size: 14px;">Sem contatos</div>
                </div>
            `;
        }

        return contacts.map(contact => {
            const avatar = this.getContactInitials(contact.name || contact.phone);
            const avatarColor = this.getContactColor(contact.phone);
            const currentTime = new Date().toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            const multi = !!contact.__multi;
            const multiStyle = multi ? 'box-shadow: 0 0 0 2px #f59e0b, 0 0 10px rgba(245,158,11,.4); position: relative;' : '';
            const multiBadge = multi ? '<span style="position:absolute; top:-8px; right:-8px; background:#f59e0b; color:#0b0f14; font-weight:700; font-size:10px; padding:2px 6px; border-radius:999px;">×</span>' : '';
            
            return `
                <div class="contact-card kanban-contact-card" data-contact-id="${contact.id}" style="${multiStyle}">
                    ${multiBadge}
                    <div class="contact-header">
                        <div class="contact-avatar" style="background: ${avatarColor}">
                            ${avatar}
                        </div>
                        <div class="contact-info">
                            <div class="contact-name">${this.escapeHtml(contact.name || contact.phone)}</div>
                            <div class="contact-time">${contact.lastChat ? this.formatTime(contact.lastChat) : currentTime}</div>
                        </div>
                        <div class="contact-actions-kanban">
                            ${contact.tags && contact.tags.length > 0 ? `
                                <button class="remove-tag-btn" onclick="whatsappCRM.removeContactTag('${contact.id}')" title="Remover etiqueta">
                                    <span style="color: #f85149;">🗑️</span>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="contact-actions">
                        <button class="contact-action-btn call" onclick="whatsappCRM.promptReminder('${contact.id}')" title="Recordatorio">
                            ⏰
                        </button>
                        <button class="contact-action-btn whatsapp" onclick="whatsappCRM.openWhatsApp('${contact.phone}')" title="WhatsApp">
                            📋
                        </button>
                        <button class="contact-action-btn edit" onclick="whatsappCRM.openContactModal('${contact.id}')" title="Editar">
                            💬
                        </button>
                        <button class="contact-action-btn" onclick="whatsappCRM.openContactNotesOverlay('${contact.id}')" title="Notas">
                            📝
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Formatear tiempo como en las imágenes (ej: 19:43)
    formatTime(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch (error) {
            return '19:43'; // Valor por defecto como en las imágenes
        }
    }

    // Remover etiqueta de contacto (funcionalidad del botón de basura)
    removeContactTag(contactId) {
        try {
            const contact = this.contacts.find(c => c.id === contactId);
            if (contact && contact.tags && contact.tags.length > 0) {
                // Remover todas las etiquetas del contacto
                contact.tags = [];
                contact.updatedAt = new Date().toISOString();
                
                this.saveContacts();
                
                // Actualizar kanban en cualquier vista
                this.updateAllKanbanViews();
                this.updateDashboard();
                
                this.showNotification('Etiqueta removida del contacto', 'success');
                console.log(`🗑️ Etiquetas removidas del contacto: ${contact.name}`);
            }
        } catch (error) {
            console.error('Error removing tag from contact:', error);
            this.showNotification('Error al remover etiqueta', 'error');
        }
    }

    renderKanbanCards(contacts = this.contacts) {
        try {
            console.log('📋 Renderizando Kanban basado en las imágenes de referencia...');
            
            // Generar columnas dinámicas basadas en etiquetas + columna "Todos os contatos"
            const columns = this.generateKanbanColumnsFromImages();
            
            // Obtener elementos del DOM
            const container = document.getElementById('kanbanContainer');
            if (!container) {
                console.error('❌ Contenedor kanban no encontrado');
                return;
            }
            
            // Limpiar contenedor y generar columnas
            container.innerHTML = '';
            
            columns.forEach(column => {
                // Filtrar contactos para esta columna
                const columnContacts = this.getContactsForColumn(contacts, column);
                // Marcar contactos multietiqueta para destacar en columnas específicas
                // (multiTagIds reservado por si se requieren cálculos adicionales)
                const multiTagIds = new Set(contacts.filter(c => Array.isArray(c.tags) && c.tags.length > 1).map(c => c.id));
                
                // Crear elemento de columna
                const columnElement = document.createElement('div');
                columnElement.className = 'kanban-column';
                columnElement.setAttribute('data-column-id', column.id);
                
                columnElement.innerHTML = `
                    <div class="kanban-header" style="background: ${column.color};">
                        <span class="kanban-title">${column.title}</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="kanban-count" id="${column.id}Count">${columnContacts.length}</span>
                            <span class="kanban-subtitle">itens</span>
                        </div>
                    </div>
                    <div class="kanban-cards" id="${column.id}Cards">
                        ${this.renderContactCardsForKanban(columnContacts.map(c => ({...c, __multi: Array.isArray(c.tags) && c.tags.length > 1 })))}
                    </div>
                `;
                
                container.appendChild(columnElement);
            });
            
            console.log(`✅ Kanban renderizado: ${columns.length} columnas, ${contacts.length} contactos total`);
            
        } catch (error) {
            console.error('❌ Error renderizando kanban:', error);
        }
    }

    bindKanbanSidebarEvents() {
        try {
            const fullscreenBtn = document.querySelector('.kanban-fullscreen-btn');
            if (fullscreenBtn) {
                fullscreenBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('📋 Abriendo Kanban fullscreen desde sidebar...');
                    this.openKanbanFullscreen();
                });
                console.log('🔗 Botón kanban fullscreen vinculado');
            }
        } catch (error) {
            console.error('Error binding kanban sidebar events:', error);
        }
    }

    generateTagSummary(contacts) {
        const summary = {};
        this.tags.forEach(tag => {
            summary[tag.id] = {
                name: tag.name,
                color: tag.color,
                count: this.getContactsByTag(contacts, tag.id).length
            };
        });
        return summary;
    }

    // Generar contactos de ejemplo para mostrar el diseño
    generateSampleContacts() {
        return [];
    }

    renderContactCards(contacts) {
        try {
            if (contacts.length === 0) {
                return `
                    <div class="empty-state">
                        <div class="empty-state-icon">👤</div>
                        <div class="empty-state-text">Sin contactos</div>
                    </div>
                `;
            }

            return contacts.map(contact => `
                <div class="contact-card" onclick="whatsappCRM.openContactDetails('${contact.id}')">
                    <div class="contact-header">
                        <div class="contact-avatar" style="background: ${this.getContactColor(contact.phone)}">${this.getContactInitials(contact.name || contact.phone)}</div>
                        <div class="contact-info">
                            <div class="contact-name">${this.escapeHtml(contact.name || contact.phone)}</div>
                            <div class="contact-phone">${contact.phone}</div>
                            <div class="contact-status">${this.getContactStatusText(contact)}</div>
                        </div>
                    </div>
                    <div class="contact-actions">
                        <button class="contact-action-btn call" onclick="event.stopPropagation(); whatsappCRM.callContact('${contact.phone}')" title="Llamar">
                            📞
                        </button>
                        <button class="contact-action-btn whatsapp" onclick="event.stopPropagation(); whatsappCRM.openWhatsApp('${contact.phone}')" title="WhatsApp">
                            💬
                        </button>
                        <button class="contact-action-btn" onclick="event.stopPropagation(); whatsappCRM.openContactDetails('${contact.id}')" title="Ver detalles">
                            👁️
                        </button>
                        <button class="contact-action-btn" onclick="event.stopPropagation(); whatsappCRM.changeContactStatus('${contact.id}')" title="Cambiar estado">
                            ⚙️
                        </button>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Error rendering contact cards:', error);
            return '<div class="empty-state"><div class="empty-state-text">Error cargando contactos</div></div>';
        }
    }

    // Helper para obtener color único por contacto
    getContactColor(phone) {
        const colors = [
            '#2563eb', '#7c3aed', '#059669', '#dc2626', 
            '#ea580c', '#0891b2', '#9333ea', '#1d4ed8'
        ];
        const str = (phone ?? '').toString(); const hash = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    }

    // Helper para obtener texto de estado del contacto
    getContactStatusText(contact) {
        const statusTexts = {
            'all': 'Contacto activo',
            'webinar': 'Interesado en webinar',
            'sales': 'En proceso de venta',
            'no-qualify': 'No califica',
            'follow-1': 'Primer seguimiento',
            'follow-3': 'Tercer seguimiento',
            'follow-final': 'Seguimiento final'
        };
        
        return statusTexts[contact.status] || contact.notes?.substring(0, 40) || 'Nuevo contacto';
    }

    // Helper para abrir WhatsApp
    openWhatsApp(phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }

    // Helper para llamar
    callContact(phone) {
        try {
            if (!phone) return;
            window.open(`tel:${phone}`);
        } catch (error) {
            console.error('Error initiating call:', error);
        }
    }

    // ===========================================
    // DRAG & DROP FUNCTIONALITY
    // ===========================================

    handleDragStart(event) {
        try {
            const card = event.target.closest('.contact-card-fullscreen') || event.target.closest('.kanban-fullscreen-card');
            const contactId = card.dataset.contactId;
            
            event.dataTransfer.setData('text/plain', contactId);
            event.dataTransfer.effectAllowed = 'move';
            
            // Agregar clase visual de dragging
            card.classList.add('dragging');
            
            // Hacer que todas las columnas pulsen para indicar que son zonas de drop
            document.querySelectorAll('.kanban-column-fullscreen').forEach(column => {
                column.classList.add('drag-active');
            });
            
            const contact = this.contacts.find(c => c.id === contactId);
            console.log(`🖱️ Iniciando drag de: ${contact?.name || contactId}`);
        } catch (error) {
            console.error('Error in drag start:', error);
        }
    }

    handleDragEnd(event) {
        try {
            const card = event.target.closest('.contact-card-fullscreen') || event.target.closest('.kanban-fullscreen-card');
            if (card) {
                card.classList.remove('dragging');
            }
            
            // Limpiar todas las clases drag-over y drag-active
            document.querySelectorAll('.drag-over').forEach(el => {
                el.classList.remove('drag-over');
            });
            
            document.querySelectorAll('.drag-active').forEach(el => {
                el.classList.remove('drag-active');
            });
            
            console.log(`🏁 Drag terminado - efectos visuales limpiados`);
            
        } catch (error) {
            console.error('Error in drag end:', error);
        }
    }

    handleDragEnter(event) {
        try {
            console.log('🚪 HandleDragEnter ejecutado');
            event.preventDefault();
            
            const targetColumn = event.target.closest('.kanban-cards-fullscreen');
            if (targetColumn) {
                console.log('✅ Entrando a zona de drop');
                // Limpiar otros efectos visuales
                document.querySelectorAll('.drag-over').forEach(el => {
                    el.classList.remove('drag-over');
                });
                targetColumn.classList.add('drag-over');
            }
        } catch (error) {
            console.error('Error in drag enter:', error);
        }
    }

    handleDragOver(event) {
        try {
            console.log('🔄 HandleDragOver ejecutado');
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            
            // Buscar la columna de destino
            const targetColumn = event.target.closest('.kanban-cards-fullscreen');
            console.log('🎯 Target column encontrada:', !!targetColumn);
            console.log('🔍 Element actual:', event.target);
            console.log('🔍 Classes del target:', event.target.className);
            
            if (targetColumn && !targetColumn.classList.contains('drag-over')) {
                console.log('✅ Agregando clase drag-over');
                
                // Limpiar otros efectos visuales
                document.querySelectorAll('.drag-over').forEach(el => {
                    el.classList.remove('drag-over');
                });
                
                targetColumn.classList.add('drag-over');
                console.log('📋 Clase drag-over agregada a columna');
            } else if (!targetColumn) {
                console.log('❌ No se encontró columna de destino válida');
            }
        } catch (error) {
            console.error('Error in drag over:', error);
        }
    }

    handleDragLeave(event) {
        try {
            console.log('🚪 HandleDragLeave ejecutado');
            // Solo remover si realmente sale de la columna
            const targetColumn = event.target.closest('.kanban-cards-fullscreen');
            
            if (targetColumn && !targetColumn.contains(event.relatedTarget)) {
                console.log('🗑️ Removiendo clase drag-over');
                targetColumn.classList.remove('drag-over');
            }
        } catch (error) {
            console.error('Error in drag leave:', error);
        }
    }

    handleDrop(event) {
        try {
            console.log(`🎯 === INICIANDO DROP ===`);
            event.preventDefault();
            
            const contactId = event.dataTransfer.getData('text/plain');
            console.log(`📋 Contacto siendo arrastrado: ${contactId}`);
            
            const targetColumn = event.target.closest('.kanban-cards-fullscreen');
            
            if (!targetColumn) {
                console.warn('⚠️ No se encontró columna de destino');
                console.log('🔍 Target element:', event.target);
                console.log('🔍 Target classList:', event.target.classList);
                console.log('🔍 Parent elements:', {
                    parentElement: event.target.parentElement?.className,
                    grandParent: event.target.parentElement?.parentElement?.className
                });
                
                // Intentar buscar manualmente el contenedor
                let element = event.target;
                while (element && !element.classList.contains('kanban-cards-fullscreen')) {
                    element = element.parentElement;
                    if (element && element.classList.contains('kanban-cards-fullscreen')) {
                        console.log('🎯 Encontrado contenedor manualmente!');
                        break;
                    }
                }
                
                if (!element) {
                    console.error('❌ No se pudo encontrar contenedor de destino');
                    return;
                }
            }
            
            const newTagId = targetColumn.dataset.tagId;
            console.log(`🎯 Columna de destino encontrada con tagId: ${newTagId}`);
            
            // Limpiar efecto visual
            targetColumn.classList.remove('drag-over');
            document.querySelectorAll('.drag-over').forEach(el => {
                el.classList.remove('drag-over');
            });
            
            // Obtener información del contacto para logging
            const contact = this.contacts.find(c => c.id === contactId);
            const contactName = contact?.name || 'Contacto desconocido';
            
            console.log(`📋 Procesando movimiento de "${contactName}" a columna: ${newTagId || 'sin etiqueta'}`);
            
            if (newTagId === 'untagged') {
                console.log(`➡️ Moviendo a "Todos os contatos" (sin etiqueta)`);
                this.moveContactToTag(contactId, null);
            } else if (newTagId && newTagId.startsWith('tag_')) {
                // Extraer el ID real de la etiqueta
                const realTagId = newTagId.replace('tag_', '');
                console.log(`➡️ Moviendo a etiqueta con ID: ${realTagId}`);
                this.moveContactToTag(contactId, realTagId);
            } else {
                console.log(`➡️ Moviendo a etiqueta con ID: ${newTagId}`);
                this.moveContactToTag(contactId, newTagId);
            }
            
            console.log(`✅ === DROP COMPLETADO ===`);
            
        } catch (error) {
            console.error('❌ Error in drop:', error);
        }
    }

    moveContactToTag(contactId, newTagId) {
        try {
            console.log(`🔄 === MOVIENDO CONTACTO ===`);
            console.log(`📋 Contacto ID: ${contactId}`);
            console.log(`🏷️ Nueva etiqueta ID: ${newTagId}`);
            
            const contact = this.contacts.find(c => c.id === contactId);
            if (!contact) {
                console.warn('⚠️ Contacto no encontrado:', contactId);
                this.showNotification('Error: Contacto no encontrado', 'error');
                return;
            }

            console.log(`👤 Contacto encontrado: ${contact.name}`);
            console.log(`🏷️ Etiquetas anteriores:`, contact.tags);

            // Actualizar etiquetas del contacto
            if (newTagId) {
                // Agregar etiqueta sin perder las existentes (multi-etiqueta)
                if (!Array.isArray(contact.tags)) contact.tags = [];
                if (!contact.tags.includes(newTagId)) {
                    contact.tags.push(newTagId);
                    const tag = this.tags.find(t => t.id === newTagId);
                    const tagName = tag?.name || 'etiqueta desconocida';
                    console.log(`✅ Etiqueta añadida a contacto: ${tagName}`);
                    this.showNotification(`📋 ${contact.name} + ${tagName}`, 'success');
                } else {
                    console.log('ℹ️ El contacto ya tiene esta etiqueta, no se duplica');
                }
            } else {
                // Remover todas las etiquetas (mover a "Todos os contatos")
                contact.tags = [];
                console.log(`✅ Etiquetas removidas - contacto movido a "Todos os contatos"`);
                this.showNotification(`📋 ${contact.name} → Todos os contatos`, 'success');
            }

            console.log(`🏷️ Etiquetas nuevas:`, contact.tags);

            // Actualizar timestamp
            contact.updatedAt = new Date().toISOString();

            // Guardar cambios
            this.saveContacts();
            console.log(`💾 Cambios guardados`);
            
            // Forzar actualización del kanban fullscreen
            console.log(`🔄 Forzando actualización del kanban...`);
            setTimeout(() => {
                this.renderKanbanFullscreenCustom();
            }, 100);
            
            console.log(`✅ === MOVIMIENTO COMPLETADO ===`);
            
        } catch (error) {
            console.error('❌ Error moving contact:', error);
            this.showNotification('Error al mover contacto', 'error');
        }
    }

    changeContactStatus(contactId) {
        try {
            const contact = this.contacts.find(c => c.id === contactId);
            if (!contact) return;

            const statuses = ['lead', 'process', 'client'];
            const currentIndex = statuses.indexOf(contact.status);
            const nextIndex = (currentIndex + 1) % statuses.length;
            
            contact.status = statuses[nextIndex];
            contact.updatedAt = new Date().toISOString();
            
            this.saveContacts();
            this.loadKanban();
            this.showNotification(`Estado cambiado a ${this.getStatusLabel(contact.status)}`, 'success');
            
            console.log(`🔄 Estado de ${contact.name} cambiado a ${contact.status}`);
            
        } catch (error) {
            console.error('Error changing contact status:', error);
        }
    }

    // ===========================================
    // GESTIÓN DE CONTACTOS
    // ===========================================

    loadContacts() {
        try {
            console.log(`👥 Cargando ${this.contacts.length} contactos...`);
            this.syncWithWhatsApp();
        } catch (error) {
            console.error('Error loading contacts:', error);
        }
    }

    loadContactsList() {
        try {
            const container = document.getElementById('contactsList');
            if (!container) return;

            if (this.contacts.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">👥</div>
                        <div class="empty-state-text">No hay contactos registrados</div>
                        <div class="empty-state-subtext">Los contactos aparecerán automáticamente cuando chatees en WhatsApp</div>
                    </div>
                `;
                return;
            }

            this.renderContactsList(this.contacts);
            
        } catch (error) {
            console.error('Error loading contacts list:', error);
        }
    }

    renderContactsList(contacts) {
        try {
            const container = document.getElementById('contactsList');
            if (!container) return;

            container.innerHTML = contacts.map(contact => `
                <div class="contact-card">
                    <div class="contact-header">
                        <div class="contact-avatar">${this.getContactInitials(contact.name || contact.phone)}</div>
                        <div class="contact-info">
                            <div class="contact-name">${this.escapeHtml(contact.name)}</div>
                            <div class="contact-phone">${contact.phone}</div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn-secondary contact-edit-btn" data-contact-id="${contact.id}" title="Editar">✏️</button>
                            <button class="btn-secondary contact-delete-btn" data-contact-id="${contact.id}" title="Eliminar">🗑️</button>
                        </div>
                    </div>
                    ${contact.tags?.length ? `
                        <div class="contact-tags">
                            ${contact.tags.map(tagId => {
                                const tag = this.tags.find(t => t.id === tagId);
                                return tag ? `<span class="contact-tag" style="background: ${tag.color}">${tag.name}</span>` : '';
                            }).join('')}
                            ${Array.isArray(contact.tags) && contact.tags.length > 1 ? `<span class="contact-tag" style="background:#f59e0b; color:#0b0f14; font-weight:700;">×</span>` : ''}
                        </div>
                    ` : ''}
                    <div class="contact-meta">
                        <span>${contact.lastChat ? this.formatDate(contact.lastChat) : 'Sin contacto'}</span>
                        <span class="badge ${this.getStatusClass(contact.status)}">${this.getStatusLabel(contact.status)}</span>
                    </div>
                    ${contact.notes ? `
                        <div style="margin-top: 12px; padding: 12px; background: var(--surface-color); border-radius: 8px; border-left: 4px solid var(--primary-color);">
                            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">Notas:</div>
                            <div style="color: var(--text-secondary); line-height: 1.4;">${this.escapeHtml(contact.notes)}</div>
                        </div>
                    ` : ''}
                </div>
            `).join('');

            // Vincular eventos después de crear el HTML
            this.bindContactCardEvents();
            
        } catch (error) {
            console.error('Error rendering contacts list:', error);
        }
    }

    bindContactCardEvents() {
        try {
            // Botones de editar contacto
            const editButtons = document.querySelectorAll('.contact-edit-btn');
            editButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const contactId = btn.dataset.contactId;
                    if (contactId) {
                        console.log(`✏️ Editando contacto: ${contactId}`);
                        this.editContact(contactId);
                    }
                });
            });

            // Botones de eliminar contacto
            const deleteButtons = document.querySelectorAll('.contact-delete-btn');
            deleteButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const contactId = btn.dataset.contactId;
                    if (contactId) {
                        console.log(`🗑️ Eliminando contacto: ${contactId}`);
                        this.deleteContact(contactId);
                    }
                });
            });

            console.log(`🔗 Eventos contactos vinculados: ${editButtons.length} editar, ${deleteButtons.length} eliminar`);

        } catch (error) {
            console.error('Error binding contact card events:', error);
        }
    }

    openContactModal(contactId = null, preselectedTagId = null) {
        try {
            this.currentEditingContact = contactId;
            this.preselectedTagId = preselectedTagId;
            const modal = document.getElementById('contactModal');
            const title = document.getElementById('contactModalTitle');
            
            if (!modal) {
                console.error('❌ Modal de contacto no encontrado');
                return;
            }
            
            // Asegurar que el modal esté en el body para máxima visibilidad
            if (modal.parentElement !== document.body) {
                document.body.appendChild(modal);
            }
            
            // Cargar etiquetas dinámicamente en el select
            this.loadTagsIntoContactModal();
            
            // Limpiar y configurar modal
            if (contactId) {
                const contact = this.contacts.find(c => c.id === contactId);
                if (contact) {
                    title.textContent = 'Editar Contacto';
                    document.getElementById('contactName').value = contact.name;
                    document.getElementById('contactPhone').value = contact.phone;
                    // Seleccionar la primera etiqueta del contacto si tiene alguna
                    document.getElementById('contactTag').value = contact.tags?.[0] || '';
                    document.getElementById('contactNotes').value = contact.notes || '';
                }
            } else {
                title.textContent = 'Nuevo Contacto';
                document.getElementById('contactName').value = '';
                document.getElementById('contactPhone').value = '';
                // Preseleccionar etiqueta si fue especificada
                document.getElementById('contactTag').value = preselectedTagId || '';
                document.getElementById('contactNotes').value = '';
            }
            
            // Forzar estilos para popup centrado
            modal.style.cssText = `
                display: flex !important;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: rgba(0, 0, 0, 0.85) !important;
                z-index: 999999999 !important;
                align-items: center !important;
                justify-content: center !important;
                backdrop-filter: blur(15px) !important;
                margin: 0 !important;
                padding: 20px !important;
                box-sizing: border-box !important;
            `;
            
            modal.classList.add('active');
            
            // Enfocar el primer campo
            setTimeout(() => {
                const firstInput = document.getElementById('contactName');
                if (firstInput) firstInput.focus();
            }, 100);
            
            console.log(`📝 Modal de contacto abierto en pantalla completa (${contactId ? 'editar' : 'nuevo'})${preselectedTagId ? ` con etiqueta preseleccionada: ${preselectedTagId}` : ''}`);
            
        } catch (error) {
            console.error('Error opening contact modal:', error);
        }
    }

    loadTagsIntoContactModal() {
        try {
            const tagSelect = document.getElementById('contactTag');
            if (!tagSelect) return;
            
            // Limpiar opciones existentes (excepto "Sin etiqueta")
            tagSelect.innerHTML = '<option value="">Sin etiqueta</option>';
            
            // Agregar etiquetas dinámicas
            this.tags.forEach(tag => {
                const option = document.createElement('option');
                option.value = tag.id;
                option.textContent = tag.name;
                option.style.color = tag.color;
                tagSelect.appendChild(option);
            });
            
            console.log(`🏷️ ${this.tags.length} etiquetas cargadas en modal de contacto`);
        } catch (error) {
            console.error('Error loading tags into contact modal:', error);
        }
    }

    closeContactModal() {
        try {
            const modal = document.getElementById('contactModal');
            if (modal) {
                // Limpiar estilos inline forzados
                modal.style.cssText = '';
                modal.classList.remove('active');
                
                // Limpiar campos del formulario
                document.getElementById('contactName').value = '';
                document.getElementById('contactPhone').value = '';
                document.getElementById('contactTag').value = '';
                document.getElementById('contactNotes').value = '';
            }
            
            this.currentEditingContact = null;
            this.preselectedTagId = null;
            console.log('❌ Modal de contacto cerrado');
        } catch (error) {
            console.error('Error closing contact modal:', error);
        }
    }

    saveContact() {
        try {
            const name = document.getElementById('contactName').value.trim();
            const phone = document.getElementById('contactPhone').value.trim();
            const selectedTagId = document.getElementById('contactTag').value;
            const notes = document.getElementById('contactNotes').value.trim();

            if (!name || !phone) {
                this.showNotification('Por favor completa nombre y teléfono', 'error');
                return;
            }

            // Preparar etiquetas del contacto (soporta múltiples etiquetas a futuro; por ahora desde el modal llega una principal)
            const contactTags = [];
            if (selectedTagId) {
                contactTags.push(selectedTagId);
            }
            if (this.preselectedTagId && !contactTags.includes(this.preselectedTagId)) {
                contactTags.push(this.preselectedTagId);
            }

            const contactData = {
                name,
                phone,
                notes,
                tags: contactTags,
                status: 'lead', // Mantener por compatibilidad, pero usar etiquetas como principal
                updatedAt: new Date().toISOString()
            };

            if (this.currentEditingContact) {
                const contact = this.contacts.find(c => c.id === this.currentEditingContact);
                if (contact) {
                    Object.assign(contact, contactData);
                    const tagName = selectedTagId ? this.tags.find(t => t.id === selectedTagId)?.name : 'Sin etiqueta';
                    this.showNotification(`Contacto actualizado${tagName ? ` con etiqueta "${tagName}"` : ''}`, 'success');
                    console.log(`✏️ Contacto actualizado: ${contact.name} - Etiqueta: ${tagName || 'Sin etiqueta'}`);
                }
            } else {
                const newContact = {
                    id: this.generateId(),
                    ...contactData,
                    createdAt: new Date().toISOString()
                };
                this.contacts.push(newContact);
                const tagName = contactTags.length > 0 ? this.tags.find(t => t.id === contactTags[0])?.name : 'Sin etiqueta';
                this.showNotification(`Contacto creado${tagName ? ` con etiqueta "${tagName}"` : ''}`, 'success');
                console.log(`➕ Nuevo contacto creado: ${newContact.name} - Etiqueta: ${tagName || 'Sin etiqueta'}`);
            }

            this.saveContacts();
            this.closeContactModal();
            this.loadContactsList();
            
            // Actualizar todas las vistas de kanban
            this.updateAllKanbanViews();
            
            // Actualizar pestañas dinámicas
            this.generateDynamicTabs();
            this.updateTabCounts();
            
            this.updateDashboard();
            
            // Limpiar etiqueta preseleccionada
            this.preselectedTagId = null;
            
        } catch (error) {
            console.error('Error saving contact:', error);
            this.showNotification('Error al guardar contacto', 'error');
        }
    }

    editContact(contactId) {
        this.openContactModal(contactId);
    }

    deleteContact(contactId) {
        try {
            const contact = this.contacts.find(c => c.id === contactId);
            if (!contact) return;

            if (confirm(`¿Estás seguro de que quieres eliminar a ${contact.name}?`)) {
                this.contacts = this.contacts.filter(c => c.id !== contactId);
                this.saveContacts();
                this.loadContactsList();
                this.loadKanban();
                this.updateDashboard();
                this.showNotification('Contacto eliminado', 'success');
                console.log(`🗑️ Contacto eliminado: ${contact.name}`);
            }
            
        } catch (error) {
            console.error('Error deleting contact:', error);
            this.showNotification('Error al eliminar contacto', 'error');
        }
    }

    importContacts() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv,.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.processImportFile(file);
                }
            };
            input.click();
        } catch (error) {
            console.error('Error importing contacts:', error);
        }
    }

    processImportFile(file) {
        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    let importedContacts = [];
                    
                    if (file.name.endsWith('.json')) {
                        importedContacts = JSON.parse(e.target.result);
                    } else if (file.name.endsWith('.csv')) {
                        // Implementar parser CSV básico
                        const lines = e.target.result.split('\n');
                        const headers = lines[0].split(',');
                        importedContacts = lines.slice(1).map(line => {
                            const values = line.split(',');
                            const contact = {};
                            headers.forEach((header, index) => {
                                contact[header.trim()] = values[index]?.trim();
                            });
                            return contact;
                        }).filter(contact => contact.name && contact.phone);
                    }
                    
                    this.processImportedContacts(importedContacts);
                    
                } catch (error) {
                    console.error('Error processing import file:', error);
                    this.showNotification('Error al procesar archivo', 'error');
                }
            };
            reader.readAsText(file);
        } catch (error) {
            console.error('Error processing import file:', error);
        }
    }

    processImportedContacts(importedContacts) {
        try {
            let added = 0;
            importedContacts.forEach(importedContact => {
                if (!this.contacts.find(c => c.phone === importedContact.phone)) {
                    const newContact = {
                        id: this.generateId(),
                        name: importedContact.name,
                        phone: importedContact.phone,
                        status: importedContact.status || 'lead',
                        notes: importedContact.notes || '',
                        tags: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    this.contacts.push(newContact);
                    added++;
                }
            });
            
            this.saveContacts();
            this.loadContactsList();
            this.loadKanban();
            this.updateDashboard();
            this.showNotification(`${added} contactos importados`, 'success');
            console.log(`📥 ${added} contactos importados correctamente`);
            
        } catch (error) {
            console.error('Error processing imported contacts:', error);
        }
    }

    openContactDetails(contactId) {
        const contact = this.contacts.find(c => c.id === contactId);
        if (contact) {
            this.openContactModal(contactId);
        }
    }

    // ===========================================
    // GESTIÓN DE ETIQUETAS
    // ===========================================

  

    // ===========================================
    // GESTIÓN DE PLANTILLAS
    // ===========================================

    loadTemplates() {
        try {
            console.log(`📄 Cargando ${this.templates.length} plantillas...`);
            this.renderTemplates();
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    }

    renderTemplates() {
        try {
            const container = document.getElementById('templatesContainer');
            if (!container) {
                console.error('❌ Templates container (#templatesContainer) not found - verificar que el HTML está cargado');
                return;
            }

            if (this.templates.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📄</div>
                        <div class="empty-state-text">No hay plantillas creadas</div>
                        <div class="empty-state-subtext">Crea plantillas para responder más rápido</div>
                    </div>
                `;
                return;
            }

            const groupedTemplates = this.groupTemplatesByCategory();
            
            container.innerHTML = Object.keys(groupedTemplates).map(category => `
                <div style="margin-bottom: 24px;">
                    <h4 style="margin-bottom: 12px; color: var(--text-primary); font-size: 16px; display: flex; align-items: center; gap: 8px;">
                        ${this.getCategoryIcon(category)} ${this.getCategoryName(category)}
                        <span class="badge">${groupedTemplates[category].length}</span>
                    </h4>
                    <div style="display: grid; gap: 12px;">
                        ${groupedTemplates[category].map(template => this.renderTemplateCard(template)).join('')}
                    </div>
                </div>
            `).join('');

            // Vincular eventos después de crear el HTML
            this.bindTemplateCardEvents();

            console.log(`📄 ${this.templates.length} plantillas renderizadas por categorías`);
            
        } catch (error) {
            console.error('Error rendering templates:', error);
        }
    }

    bindTemplateCardEvents() {
        try {
            // Botones de usar plantilla
            const useButtons = document.querySelectorAll('.template-use-btn');
            useButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const templateId = btn.dataset.templateId;
                    if (templateId) {
                        console.log(`📤 Usando plantilla: ${templateId}`);
                        this.useTemplate(templateId);
                    }
                });
            });

            // Botones de editar plantilla
            const editButtons = document.querySelectorAll('.template-edit-btn');
            editButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const templateId = btn.dataset.templateId;
                    if (templateId) {
                        console.log(`✏️ Editando plantilla: ${templateId}`);
                        this.editTemplate(templateId);
                    }
                });
            });

            // Botones de eliminar plantilla
            const deleteButtons = document.querySelectorAll('.template-delete-btn');
            deleteButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const templateId = btn.dataset.templateId;
                    if (templateId) {
                        console.log(`🗑️ Eliminando plantilla: ${templateId}`);
                        this.deleteTemplate(templateId);
                    }
                });
            });

            console.log(`🔗 Eventos plantillas vinculados: ${useButtons.length} usar, ${editButtons.length} editar, ${deleteButtons.length} eliminar`);

        } catch (error) {
            console.error('Error binding template card events:', error);
        }
    }

    renderTemplateCard(template) {
        try {
            return `
                <div class="contact-card">
                    <div class="contact-header">
                        <div class="contact-avatar" style="background: var(--primary-color)">${template.name.charAt(0).toUpperCase()}</div>
                        <div class="contact-info">
                            <div class="contact-name">${this.escapeHtml(template.name)}</div>
                            <div class="contact-phone">${template.category}</div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn-secondary template-use-btn" data-template-id="${template.id}" title="Usar">📤</button>
                            <button class="btn-secondary template-edit-btn" data-template-id="${template.id}" title="Editar">✏️</button>
                            <button class="btn-secondary template-delete-btn" data-template-id="${template.id}" title="Eliminar">🗑️</button>
                        </div>
                    </div>
                    <div style="margin-top: 12px; padding: 12px; background: var(--surface-color); border-radius: 8px; border-left: 4px solid var(--primary-color);">
                        <div style="color: var(--text-secondary); line-height: 1.4; font-size: 13px;">
                            ${this.escapeHtml(template.content.substring(0, 150))}${template.content.length > 150 ? '...' : ''}
                        </div>
                    </div>
                    <div class="contact-meta">
                        <span>Variables: ${this.countVariables(template.content)}</span>
                        <span>${this.formatDate(template.createdAt)}</span>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error rendering template card:', error);
            return '<div class="contact-card"><div class="contact-name">Error cargando plantilla</div></div>';
        }
    }

    groupTemplatesByCategory() {
        try {
            const grouped = {};
            this.templates.forEach(template => {
                const category = template.category || 'general';
                if (!grouped[category]) {
                    grouped[category] = [];
                }
                grouped[category].push(template);
            });
            return grouped;
        } catch (error) {
            console.error('Error grouping templates:', error);
            return {};
        }
    }

    getCategoryIcon(category) {
        const icons = {
            general: '📝',
            ventas: '💰',
            soporte: '🛠️',
            marketing: '📢'
        };
        return icons[category] || '📝';
    }

    getCategoryName(category) {
        const names = {
            general: 'General',
            ventas: 'Ventas',
            soporte: 'Soporte',
            marketing: 'Marketing'
        };
        return names[category] || 'General';
    }

    countVariables(content) {
        try {
            const matches = content.match(/\{\{[^}]+\}\}/g);
            return matches ? matches.length : 0;
        } catch (error) {
            return 0;
        }
    }

    openTemplateModal(templateId = null) {
        try {
            this.currentEditingTemplate = templateId;
            const modal = document.getElementById('templateModal');
            const title = document.getElementById('templateModalTitle');
            
            if (templateId) {
                const template = this.templates.find(t => t.id === templateId);
                if (template) {
                    title.textContent = 'Editar Plantilla';
                    document.getElementById('templateName').value = template.name;
                    document.getElementById('templateCategory').value = template.category;
                    document.getElementById('templateContent').value = template.content;
                }
            } else {
                title.textContent = 'Nueva Plantilla';
                document.getElementById('templateName').value = '';
                document.getElementById('templateCategory').value = 'general';
                document.getElementById('templateContent').value = '';
            }
            
            this.updateTemplatePreview();
            modal.classList.add('active');
            console.log(`📄 Modal de plantilla abierto (${templateId ? 'editar' : 'nueva'})`);
            
        } catch (error) {
            console.error('Error opening template modal:', error);
        }
    }

    closeTemplateModal() {
        try {
            const modal = document.getElementById('templateModal');
            modal.classList.remove('active');
            this.currentEditingTemplate = null;
            console.log('❌ Modal de plantilla cerrado');
        } catch (error) {
            console.error('Error closing template modal:', error);
        }
    }

    updateTemplatePreview() {
        try {
            const content = document.getElementById('templateContent').value;
            const preview = document.getElementById('templatePreview');
            
            if (content) {
                const processedContent = this.processTemplateVariables(content, {
                    nombre: 'Juan Pérez',
                    fecha: new Date().toLocaleDateString(),
                    hora: new Date().toLocaleTimeString(),
                    dia_semana: new Date().toLocaleDateString('es', { weekday: 'long' })
                });
                preview.innerHTML = this.escapeHtml(processedContent);
            } else {
                preview.innerHTML = 'Vista previa del mensaje...';
            }
        } catch (error) {
            console.error('Error updating template preview:', error);
        }
    }

    saveTemplate() {
        try {
            const name = document.getElementById('templateName').value.trim();
            const category = document.getElementById('templateCategory').value;
            const content = document.getElementById('templateContent').value.trim();

            if (!name || !content) {
                this.showNotification('Nombre y contenido son requeridos', 'error');
                return;
            }

            const templateData = { name, category, content };

            if (this.currentEditingTemplate) {
                const template = this.templates.find(t => t.id === this.currentEditingTemplate);
                if (template) {
                    Object.assign(template, templateData);
                    this.showNotification('Plantilla actualizada', 'success');
                    console.log(`✏️ Plantilla actualizada: ${template.name}`);
                }
            } else {
                if (this.templates.find(t => t.name.toLowerCase() === name.toLowerCase())) {
                    this.showNotification('Ya existe una plantilla con ese nombre', 'error');
                    return;
                }
                
                const newTemplate = {
                    id: this.generateId(),
                    ...templateData,
                    createdAt: new Date().toISOString()
                };
                this.templates.push(newTemplate);
                this.showNotification('Plantilla creada', 'success');
                console.log(`➕ Nueva plantilla creada: ${newTemplate.name}`);
            }

            this.saveTemplates();
            this.closeTemplateModal();
            this.loadTemplates();
            this.updateDashboard();
            
        } catch (error) {
            console.error('Error saving template:', error);
            this.showNotification('Error al guardar plantilla', 'error');
        }
    }

    editTemplate(templateId) {
        this.openTemplateModal(templateId);
    }

    deleteTemplate(templateId) {
        try {
            const template = this.templates.find(t => t.id === templateId);
            if (!template) return;

            if (confirm(`¿Estás seguro de que quieres eliminar la plantilla "${template.name}"?`)) {
                this.templates = this.templates.filter(t => t.id !== templateId);
                this.saveTemplates();
                this.loadTemplates();
                this.updateDashboard();
                this.showNotification('Plantilla eliminada', 'success');
                console.log(`🗑️ Plantilla eliminada: ${template.name}`);
            }
            
        } catch (error) {
            console.error('Error deleting template:', error);
            this.showNotification('Error al eliminar plantilla', 'error');
        }
    }

    saveReminders() {
        try {
            this.saveData('reminders', this.reminders);
        } catch (e) { console.error('Error saving reminders', e); }
    }

    useTemplate(templateId) {
        try {
            const template = this.templates.find(t => t.id === templateId);
            if (!template) return;

            const currentChat = this.getCurrentChatInfo();
            const variables = {
                nombre: currentChat?.name || 'Cliente',
                fecha: new Date().toLocaleDateString(),
                hora: new Date().toLocaleTimeString(),
                dia_semana: new Date().toLocaleDateString('es', { weekday: 'long' })
            };

            const processedContent = this.processTemplateVariables(template.content, variables);
            
            // Insertar en el campo de mensaje de WhatsApp
            this.insertMessageInWhatsApp(processedContent);
            this.showNotification(`Plantilla "${template.name}" insertada`, 'success');
            
            console.log(`📤 Plantilla "${template.name}" usada`);
            
        } catch (error) {
            console.error('Error using template:', error);
            this.showNotification('Error al usar plantilla', 'error');
        }
    }

    processTemplateVariables(content, variables) {
        try {
            let processed = content;
            Object.keys(variables).forEach(key => {
                const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                processed = processed.replace(regex, variables[key]);
            });
            return processed;
        } catch (error) {
            console.error('Error processing template variables:', error);
            return content;
        }
    }

    // ===========================================
    // ANALÍTICAS
    // ===========================================

    loadAnalytics() {
        try {
            console.log('📈 Cargando analíticas...');
            
            const elements = {
                weeklyChats: document.getElementById('weeklyChats'),
                avgResponseTime: document.getElementById('avgResponseTime'),
                conversionRate: document.getElementById('conversionRate')
            };

            if (elements.weeklyChats) elements.weeklyChats.textContent = this.getWeeklyChatsCount();
            if (elements.avgResponseTime) elements.avgResponseTime.textContent = this.getAverageResponseTime();
            if (elements.conversionRate) elements.conversionRate.textContent = this.getConversionRate();
            
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    getWeeklyChatsCount() {
        try {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            return this.contacts.filter(contact => 
                contact.lastChat && new Date(contact.lastChat) >= oneWeekAgo
            ).length;
        } catch (error) {
            return 0;
        }
    }

    getAverageResponseTime() {
        // Simulado - en una implementación real se calcularía desde los datos de chat
        return '2.5h';
    }

    getConversionRate() {
        try {
            const leads = this.contacts.filter(c => c.status === 'lead').length;
            const clients = this.contacts.filter(c => c.status === 'client').length;
            
            if (leads + clients === 0) return '0%';
            
            const rate = (clients / (leads + clients)) * 100;
            return `${Math.round(rate)}%`;
        } catch (error) {
            return '0%';
        }
    }

    // ===========================================
    // INTEGRACIÓN CON WHATSAPP
    // ===========================================

    syncWithWhatsApp() {
        try {
            console.log('🔄 Sincronizando con WhatsApp Web...');
            
            // Múltiples selectores para encontrar chats
            const chatSelectors = [
                '[data-testid="cell-frame-container"]',
                '[data-testid="chat-cell"]', 
                '.zoWT4',
                '[role="listitem"]'
            ];
            
            let chatElements = [];
            for (const selector of chatSelectors) {
                chatElements = document.querySelectorAll(selector);
                if (chatElements.length > 0) {
                    console.log(`📱 Encontrados ${chatElements.length} chats con selector: ${selector}`);
                    break;
                }
            }
            
            if (chatElements.length === 0) {
                console.log('⚠️ No se encontraron chats en WhatsApp Web');
                return;
            }
            
            let newContacts = 0;
            let updatedContacts = 0;
            
            chatElements.forEach((element, index) => {
                try {
                    const contact = this.extractContactFromElement(element);
                    if (contact) {
                        const normalizedIncoming = this.normalizePhone(contact.phone);
                        let existingContact = null;
                        if (normalizedIncoming) {
                            existingContact = this.contacts.find(c => this.normalizePhone(c.phone) === normalizedIncoming);
                        }
                        // Evitar emparejar por nombre salvo que no haya teléfono en ambos
                        if (!existingContact && !normalizedIncoming) {
                            existingContact = this.contacts.find(c => !this.normalizePhone(c.phone) && c.name === contact.name);
                        }
                        
                        if (existingContact) {
                            // Actualizar contacto existente
                            existingContact.name = contact.name || existingContact.name;
                            if (normalizedIncoming && !this.normalizePhone(existingContact.phone)) existingContact.phone = normalizedIncoming;
                            existingContact.lastChat = new Date().toISOString();
                            existingContact.updatedAt = new Date().toISOString();
                            updatedContacts++;
                        } else {
                            // Nuevo contacto
                            this.contacts.push({
                                id: this.generateId(),
                                ...contact,
                                phone: normalizedIncoming || null,
                                status: 'lead',
                                tags: [],
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                                whatsappSync: true
                            });
                            newContacts++;
                        }
                    }
                } catch (elementError) {
                    console.warn(`Error procesando elemento ${index}:`, elementError);
                }
            });
            
            if (newContacts > 0 || updatedContacts > 0) {
                this.saveContacts();
                console.log(`📱 Sincronización completada: ${newContacts} nuevos, ${updatedContacts} actualizados`);
                
                // Actualizar UI
                this.loadContactsList();
                this.loadKanban();
                this.updateDashboard();
                
                // Notificar
                if (newContacts > 0) {
                    this.showNotification(`${newContacts} nuevos contactos sincronizados`, 'success');
                }
            } else {
                console.log('📱 Sin cambios en la sincronización');
            }
            
        } catch (error) {
            console.error('Error syncing with WhatsApp:', error);
        }
    }

    extractContactFromElement(element) {
        try {
            // Múltiples selectores para obtener el nombre
            const nameSelectors = [
                '[data-testid="cell-frame-title"]',
                '[title]',
                '.ggj6brxn',
                'span[title]',
                '._ao3e',
                '.zoWT4 span'
            ];
            
            let nameElement = null;
            let name = null;
            
            for (const selector of nameSelectors) {
                nameElement = element.querySelector(selector);
                if (nameElement) {
                    name = nameElement.textContent?.trim() || nameElement.title?.trim();
                    if (name && name.length > 0) {
                        break;
                    }
                }
            }
            
            if (!name || name.length === 0) {
                return null;
            }
            
            // Limpiar nombre y extraer teléfono
            let cleanName = name;
            let phone = null;
            
            // Si el nombre contiene un número de teléfono
            const phoneMatch = name.match(/\+[\d\s\-()]+/);
            if (phoneMatch) {
                phone = this.normalizePhone(phoneMatch[0]);
                cleanName = name.replace(phoneMatch[0], '').trim();
            }
            
            // Si no hay teléfono detectado, verificar si el nombre completo parece un número de teléfono
            if (!phone && /^[\+\d\s\-()]+$/.test(name)) {
                phone = this.normalizePhone(name);
            }
            
            // Si no hay nombre limpio, usar el nombre original visible (no usar el teléfono como nombre)
            if (!cleanName || cleanName.length === 0) {
                cleanName = name;
            }
            
            // Info adicional del elemento
            const lastMessageTime = this.extractLastMessageTime(element);
            const hasUnread = this.hasUnreadMessages(element);
            
            return {
                name: cleanName,
                phone: phone || null,
                lastChat: lastMessageTime || new Date().toISOString(),
                hasUnread: hasUnread,
                whatsappElement: true
            };
            
        } catch (error) {
            console.error('Error extracting contact:', error);
            return null;
        }
    }

    extractLastMessageTime(element) {
        try {
            // Selectores para encontrar la hora del último mensaje
            const timeSelectors = [
                '[data-testid="cell-frame-secondary"]',
                '.zoWT4 span:last-child',
                '._ao3e:last-child',
                '.ggj6brxn:last-child'
            ];
            
            for (const selector of timeSelectors) {
                const timeElement = element.querySelector(selector);
                if (timeElement) {
                    const timeText = timeElement.textContent?.trim();
                    if (timeText && /\d/.test(timeText)) {
                        // Intentar convertir a fecha/hora
                        return this.parseWhatsAppTime(timeText);
                    }
                }
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }

    parseWhatsAppTime(timeText) {
        try {
            const now = new Date();
            
            // Patrones comunes de WhatsApp
            if (timeText.includes(':')) {
                // Formato HH:MM (hoy)
                const [hours, minutes] = timeText.split(':').map(Number);
                const date = new Date();
                date.setHours(hours, minutes, 0, 0);
                return date.toISOString();
            } else if (timeText.toLowerCase().includes('ayer')) {
                // Ayer
                const date = new Date();
                date.setDate(date.getDate() - 1);
                return date.toISOString();
            } else if (timeText.includes('/')) {
                // Formato DD/MM/YYYY
                const parts = timeText.split('/');
                if (parts.length === 3) {
                    const date = new Date(parts[2], parts[1] - 1, parts[0]);
                    return date.toISOString();
                }
            }
            
            return new Date().toISOString();
        } catch (error) {
            return new Date().toISOString();
        }
    }

    hasUnreadMessages(element) {
        try {
            // Indicadores de mensajes no leídos
            const unreadSelectors = [
                '[data-testid="unread-count"]',
                '.OUeyt',
                '._ao3e[data-testid="unread-count"]',
                '.zoWT4 [style*="background"]'
            ];
            
            for (const selector of unreadSelectors) {
                const unreadElement = element.querySelector(selector);
                if (unreadElement && unreadElement.textContent?.trim()) {
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            return false;
        }
    }

    updateCurrentChat() {
        try {
            const currentChat = this.getCurrentChatInfo();
            const chatNameElement = document.getElementById('currentChatName');
            
            if (chatNameElement) {
                if (currentChat) {
                    chatNameElement.textContent = currentChat.name;
                    chatNameElement.style.color = 'var(--text-primary)';
                    
                    // Actualizar información del contacto actual
                    this.updateCurrentContactInfo(currentChat);
                } else {
                    chatNameElement.textContent = 'Selecciona un chat';
                    chatNameElement.style.color = 'var(--text-secondary)';
                }
            }
            
        } catch (error) {
            console.error('Error updating current chat:', error);
        }
    }

    updateCurrentContactInfo(currentChat) {
        try {
            // Buscar si este contacto existe en nuestro CRM
            let contact = null;
            const normalizedIncoming = this.normalizePhone(currentChat.phone);
            if (normalizedIncoming) {
                contact = this.contacts.find(c => this.normalizePhone(c.phone) === normalizedIncoming);
            }
            // Solo si no hay teléfono en ambos, emparejar por nombre exacto
            if (!contact && !normalizedIncoming) {
                contact = this.contacts.find(c => !this.normalizePhone(c.phone) && c.name === currentChat.name);
            }
            
            // Si no existe, crear uno nuevo automáticamente con teléfono válido si se detectó
            if (!contact && currentChat.name) {
                contact = {
                    id: this.generateId(),
                    name: currentChat.name,
                    phone: normalizedIncoming || null,
                    status: 'lead',
                    tags: [],
                    notes: '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastChat: new Date().toISOString(),
                    currentlyOpen: true
                };
                
                this.contacts.push(contact);
                this.saveContacts();
                console.log(`➕ Nuevo contacto creado automáticamente: ${contact.name}`);
            } else if (contact) {
                // Actualizar último chat y completar teléfono si estaba vacío
                if (normalizedIncoming && !this.normalizePhone(contact.phone)) contact.phone = normalizedIncoming;
                contact.lastChat = new Date().toISOString();
                contact.currentlyOpen = true;
                this.saveContacts();
            }
            
            // Actualizar UI con información del contacto
            this.renderCurrentContactTags(contact);
            const contactNameEl = document.getElementById('currentContactName');
            const contactPhoneEl = document.getElementById('currentContactPhone');
            if (contactNameEl) contactNameEl.textContent = contact?.name || currentChat.name || '—';
            if (contactPhoneEl) contactPhoneEl.textContent = contact?.phone || '—';
            
        } catch (error) {
            console.error('Error updating current contact info:', error);
            this.showNotification('Error al actualizar contacto actual', 'error');
        }
    }

    renderCurrentContactTags(contact) {
        try {
            const chatInfoElement = document.getElementById('currentChatInfo');
            if (!chatInfoElement) return;
            
            if (!contact) {
                chatInfoElement.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="contact-avatar" style="width: 32px; height: 32px; font-size: 14px;">👤</div>
                        <div>
                            <div style="font-weight: 600; color: var(--text-primary);">Chat Actual</div>
                            <div class="chat-name" id="currentChatName">Selecciona un chat</div>
                        </div>
                    </div>
                `;
                return;
            }
            
            chatInfoElement.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                    <div class="contact-avatar" style="width: 32px; height: 32px; font-size: 14px; background: ${this.getContactColor(contact.phone)}">${this.getContactInitials(contact.name)}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: var(--text-primary);">${this.escapeHtml(contact.name)}</div>
                        <div class="chat-name" style="font-size: 12px; color: var(--text-secondary);">${contact.phone}</div>
                    </div>
                    <button class="btn-primary btn-sm" onclick="window.whatsappCRM?.openContactModal('${contact.id}')">✏️</button>
                </div>
                
                ${contact.tags?.length > 0 ? `
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">Etiquetas actuales:</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                            ${contact.tags.map(tagId => {
                                const tag = this.tags.find(t => t.id === tagId);
                                return tag ? `
                                    <span style="background: ${tag.color}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">
                                        ${tag.name}
                                    </span>
                                ` : '';
                            }).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div>
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">Asignar etiqueta rápida:</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        ${this.tags.map(tag => `
                            <button class="quick-tag-btn" 
                                    data-contact-id="${contact.id}" 
                                    data-tag-id="${tag.id}"
                                    style="background: ${tag.color}; color: white; border: none; padding: 4px 8px; border-radius: 12px; font-size: 11px; cursor: pointer; opacity: ${contact.tags?.includes(tag.id) ? '0.5' : '1'};">
                                ${contact.tags?.includes(tag.id) ? '✓ ' : ''}${tag.name}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
            
            // Vincular eventos de etiquetas rápidas
            this.bindQuickTagEvents();
            
        } catch (error) {
            console.error('Error rendering current contact tags:', error);
        }
    }

    bindQuickTagEvents() {
        try {
            const quickTagButtons = document.querySelectorAll('.quick-tag-btn');
            quickTagButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const contactId = btn.dataset.contactId;
                    const tagId = btn.dataset.tagId;
                    
                    if (contactId && tagId) {
                        this.toggleContactTag(contactId, tagId);
                    }
                });
            });
            
            console.log(`🔗 ${quickTagButtons.length} botones de etiqueta rápida vinculados`);
        } catch (error) {
            console.error('Error binding quick tag events:', error);
        }
    }

    toggleContactTag(contactId, tagId) {
        try {
            const contact = this.contacts.find(c => c.id === contactId);
            const tag = this.tags.find(t => t.id === tagId);
            
            if (!contact || !tag) {
                console.error('Contacto o etiqueta no encontrados');
                return;
            }
            
            // Inicializar tags si no existe
            if (!contact.tags) {
                contact.tags = [];
            }
            
            // Toggle etiqueta (multi-etiqueta soportado)
            if (contact.tags.includes(tagId)) {
                // Remover etiqueta
                contact.tags = contact.tags.filter(t => t !== tagId);
                console.log(`🏷️ Etiqueta "${tag.name}" removida de ${contact.name}`);
                this.showNotification(`Etiqueta "${tag.name}" removida`, 'info');
            } else {
                // Agregar etiqueta adicional sin eliminar las existentes
                contact.tags.push(tagId);
                console.log(`🏷️ Etiqueta "${tag.name}" asignada a ${contact.name}`);
                this.showNotification(`Etiqueta "${tag.name}" asignada`, 'success');
            }
            
            // Actualizar datos
            contact.updatedAt = new Date().toISOString();
            this.saveContacts();
            
            // Actualizar UI
            this.renderCurrentContactTags(contact);
            this.loadContactsList();
            this.loadKanban();
            
        } catch (error) {
            console.error('Error toggling contact tag:', error);
            this.showNotification('Error al asignar etiqueta', 'error');
        }
    }

    getCurrentChatInfo() {
        try {
            // Múltiples selectores para el header del chat
            const headerSelectors = [
                '[data-testid="conversation-header"]',
                '[data-testid="chat-header"]',
                'header[data-testid]',
                '._amid',
                '.zoWT4'
            ];
            
            let headerElement = null;
            for (const selector of headerSelectors) {
                headerElement = document.querySelector(selector);
                if (headerElement) break;
            }
            
            if (!headerElement) {
                console.log('⚠️ Header del chat no encontrado');
                return null;
            }
            
            // Múltiples selectores para el nombre del contacto
            const nameSelectors = [
                '[data-testid="conversation-info-header-chat-title"]',
                'span[title]',
                '[title]',
                '._ao3e',
                '.ggj6brxn',
                'span:first-child'
            ];
            
            let displayName = null;
            let phone = null;
            
            for (const selector of nameSelectors) {
                const nameElement = headerElement.querySelector(selector);
                if (nameElement) {
                    const elementText = nameElement.textContent?.trim() || nameElement.title?.trim();
                    if (elementText && elementText.length > 0) {
                        displayName = elementText;
                        break;
                    }
                }
            }
            
            if (!displayName) {
                console.log('⚠️ Nombre del chat no encontrado');
                return null;
            }
            
            // Intentar extraer teléfono si está disponible
            const phoneMatch = displayName.match(/\+[\d\s\-()]+/);
            if (phoneMatch) {
                phone = this.normalizePhone(phoneMatch[0]);
            }
            
            // Si el nombre completo parece un teléfono
            if (!phone && /^[\+\d\s\-()]+$/.test(displayName)) {
                phone = this.normalizePhone(displayName);
            }
            
            console.log(`📱 Chat actual detectado: ${displayName}${phone ? ` (${phone})` : ''}`);
            
            return { 
                name: displayName,
                phone: phone || null,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Error getting current chat info:', error);
            return null;
        }
    }

    insertMessageInWhatsApp(message) {
        try {
            const messageInput = document.querySelector('[data-testid="message-composer"] [contenteditable="true"]');
            if (messageInput) {
                // Limpiar el input actual
                messageInput.focus();
                messageInput.innerHTML = '';
                
                // Insertar el nuevo mensaje
                messageInput.textContent = message;
                
                // Triggear eventos para que WhatsApp detecte el cambio
                const inputEvent = new Event('input', { bubbles: true });
                messageInput.dispatchEvent(inputEvent);
                
                // Foco al final del texto
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(messageInput);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
                
                console.log('✅ Mensaje insertado en WhatsApp');
            } else {
                console.warn('⚠️ No se encontró el campo de mensaje de WhatsApp');
            }
        } catch (error) {
            console.error('Error inserting message in WhatsApp:', error);
        }
    }

    startPeriodicSync() {
        try {
            // Sincronizar cada 30 segundos
            setInterval(() => {
                if (this.settings.autoSync) {
                    this.syncWithWhatsApp();
                    // Sincronizar también etiquetas de WhatsApp Business para mantener la sección de Etiquetas actualizada
                    try { this.syncTagsFromWhatsApp(); } catch (_) {}
                    this.updateCurrentChat();
                }
            }, 30000);
            
            console.log('🔄 Sincronización automática iniciada (30s)');
        } catch (error) {
            console.error('Error starting periodic sync:', error);
        }
    }

    // ===========================================
    // CONFIGURACIÓN Y DATOS
    // ===========================================

    saveSettings() {
        this.saveData('settings', this.settings);
    }

    resetSettings() {
        try {
            if (confirm('¿Restablecer todas las configuraciones a los valores por defecto?')) {
                this.settings = {
                    theme: 'dark',
                    language: 'es',
                    autoSync: true,
                    notifications: true,
                    compactMode: false
                };
                this.saveSettings();
                this.loadSettings();
                this.showNotification('Configuración restablecida', 'success');
                console.log('🔄 Configuración restablecida');
            }
        } catch (error) {
            console.error('Error resetting settings:', error);
        }
    }

    syncData() {
        try {
            this.syncWithWhatsApp();
            this.updateDashboard();
            this.loadKanban();
            this.loadContactsList();
            this.showNotification('Datos sincronizados', 'success');
            console.log('🔄 Sincronización manual completada');
        } catch (error) {
            console.error('Error syncing data:', error);
        }
    }

    exportData() {
        try {
            const data = {
                contacts: this.contacts,
                tags: this.tags,
                templates: this.templates,
                settings: this.settings,
                exportDate: new Date().toISOString(),
                version: '1.0.0'
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `whatsapp-crm-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.showNotification('Datos exportados', 'success');
            console.log('📤 Datos exportados correctamente');
            
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showNotification('Error al exportar datos', 'error');
        }
    }

    importData() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.processImportDataFile(file);
                }
            };
            input.click();
        } catch (error) {
            console.error('Error importing data:', error);
        }
    }

    processImportDataFile(file) {
        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.contacts) this.contacts = data.contacts;
                    if (data.tags) this.tags = data.tags;
                    if (data.templates) this.templates = data.templates;
                    if (data.settings) {
                        this.settings = { ...this.settings, ...data.settings };
                        this.settings.theme = 'dark'; // Forzar modo oscuro
                    }
                    
                    this.saveContacts();
                    this.saveTags();
                    this.saveTemplates();
                    this.saveSettings();
                    
                                this.loadSettings();
            this.updateDashboard();
            
            // Generar pestañas dinámicas al cargar
            setTimeout(() => {
                this.generateDynamicTabs();
                this.updateTabCounts();
            }, 500);
                    this.loadKanban();
                    this.loadContactsList();
                    this.loadTags();
                    this.loadTemplates();
                    
                    this.showNotification('Datos importados correctamente', 'success');
                    console.log('📥 Datos importados correctamente');
                    
                } catch (error) {
                    console.error('Error processing import data file:', error);
                    this.showNotification('Error al importar datos', 'error');
                }
            };
            reader.readAsText(file);
        } catch (error) {
            console.error('Error processing import data file:', error);
        }
    }

    // ===========================================
    // UTILIDADES
    // ===========================================

    generateId() {
        return 'crm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    loadData(key, defaultValue = []) {
        try {
            const data = localStorage.getItem(`whatsapp_crm_${key}`);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error(`Error loading ${key}:`, error);
            return defaultValue;
        }
    }

    saveData(key, data) {
        try {
            localStorage.setItem(`whatsapp_crm_${key}`, JSON.stringify(data));
        } catch (error) {
            console.error(`Error saving ${key}:`, error);
        }
    }

    saveContacts() {
        this.saveData('contacts', this.contacts);
        // Intento de persistencia remota no bloqueante
        try { this.saveContactsToSupabase?.(); } catch (_) {}
    }

    saveTags() {
        this.saveData('tags', this.tags);
    }

    saveTemplates() {
        this.saveData('templates', this.templates);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getContactInitials(name) {
        try {
            const str = (name ?? '').toString().trim();
            if (!str) return '??';
            const parts = str.split(/\s+/).filter(Boolean);
            const initials = (parts[0]?.charAt(0) || '') + (parts[1]?.charAt(0) || '');
            return (initials || str.charAt(0) || '?').substring(0, 2).toUpperCase();
        } catch (_) {
            return '??';
        }
    }

    getStatusLabel(status) {
        const labels = {
            lead: 'Lead',
            process: 'En Proceso',
            client: 'Cliente'
        };
        return labels[status] || status;
    }

    getStatusClass(status) {
        const classes = {
            lead: 'warning',
            process: 'info',
            client: 'success'
        };
        return classes[status] || '';
    }

    getStatusIcon(status) {
        const icons = {
            lead: '🎯',
            process: '⚡',
            client: '✅'
        };
        return icons[status] || '📋';
    }

    formatDate(dateString) {
        try {
            if (!dateString) return 'Sin fecha';
            
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = now - date;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) {
                return 'Hoy ' + date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
            } else if (diffDays === 1) {
                return 'Ayer';
            } else if (diffDays < 7) {
                return `${diffDays} días`;
            } else {
                return date.toLocaleDateString('es');
            }
        } catch (error) {
            return 'Fecha inválida';
        }
    }

    showNotification(message, type = 'info') {
        try {
            console.log(`${type.toUpperCase()}: ${message}`);
            
            // Solo mostrar notificación visual si las notificaciones están habilitadas
            if (!this.settings.notifications) return;
            
            // Crear notificación visual
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed !important;
                top: 20px !important;
                right: 20px !important;
                background: var(--card-background) !important;
                color: var(--text-primary) !important;
                padding: 16px 20px !important;
                border-radius: 12px !important;
                box-shadow: var(--shadow-lg) !important;
                border-left: 4px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'} !important;
                z-index: 10000001 !important;
                max-width: 300px !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                animation: slideInRight 0.3s ease-out !important;
            `;
            
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
            
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }

    // Función de debug para desarrollo
    getDebugInfo() {
        return {
            contacts: this.contacts.length,
            tags: this.tags.length,
            templates: this.templates.length,
            settings: this.settings,
            currentSection: this.currentSection,
            currentFilter: this.currentFilter,
            searchQuery: this.searchQuery,
            isCollapsed: this.isCollapsed,
            debugStats: this.debugStats,
            uptime: Date.now() - this.debugStats.initTime,
            lastError: this.debugStats.lastError
        };
    }

    bindKanbanDndEvents(root = document) {
        try {
            const columns = root.querySelectorAll('.kanban-cards-fullscreen, .kanban-fullscreen-cards');
            const cards = root.querySelectorAll('.contact-card-fullscreen[draggable="true"], .kanban-fullscreen-card[draggable="true"]');

            columns.forEach(col => {
                col.addEventListener('dragover', (e) => this.handleDragOver(e));
                col.addEventListener('dragenter', (e) => this.handleDragEnter(e));
                col.addEventListener('dragleave', (e) => this.handleDragLeave(e));
                col.addEventListener('drop', (e) => this.handleDrop(e));
            });

            cards.forEach(card => {
                card.addEventListener('dragstart', (e) => this.handleDragStart(e));
                card.addEventListener('dragend', (e) => this.handleDragEnd(e));
                card.addEventListener('click', () => this.openContactModal(card.dataset.contactId));
                card.addEventListener('mouseover', () => {
                    card.style.transform = 'translateY(-2px)';
                    card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
                    card.style.borderColor = '#58a6ff';
                });
                card.addEventListener('mouseout', () => {
                    card.style.transform = 'translateY(0)';
                    card.style.boxShadow = 'none';
                    card.style.borderColor = '#30363d';
                });
            });

            console.log('🔗 Eventos de DnD vinculados sin inline handlers');
        } catch (error) {
            console.error('❌ Error vinculando eventos DnD:', error);
        }
    }

    // Helpers de teléfono
    normalizePhone(raw) {
        try {
            if (!raw || typeof raw !== 'string') return null;
            // Convertir 00 prefijo internacional a +
            let value = raw.trim();
            if (value.startsWith('00')) value = '+' + value.slice(2);
            // Eliminar espacios, guiones, paréntesis
            value = value.replace(/[\s\-()]/g, '');
            // Aceptar solo + y dígitos
            if (!/^\+?\d+$/.test(value)) return null;
            // Evitar tratar nombres como teléfonos: requerir al menos 8-10 dígitos
            const digits = value.replace(/\D/g, '');
            if (digits.length < 8) return null;
            // Si no tiene + pero parece válido, mantener como dígitos (no añadimos prefijo por defecto)
            return value;
        } catch (_) { return null; }
    }
    isValidPhone(raw) {
        return !!this.normalizePhone(raw);
    }

    removeKnownDemoContacts() {
        try {
            const stored = this.loadData('contacts', []);
            if (!Array.isArray(stored) || stored.length === 0) return;
            const before = stored.length;
            const blacklistNames = new Set(['Amor','Mamá','Mama','Papá','Papa']);
            const cleaned = stored.filter(c => !(c && typeof c.name === 'string' && blacklistNames.has(c.name.trim())));
            if (cleaned.length !== before) {
                this.saveData('contacts', cleaned);
                console.log(`🧹 Eliminados ${before - cleaned.length} contactos de ejemplo no deseados`);
            }
        } catch (e) { console.warn('No se pudo limpiar contactos de ejemplo', e); }
    }

    migrateContactsPhoneNormalization() {
        try { this.removeKnownDemoContacts(); } catch(_) {}

        try {
            // Cargar contactos actuales de storage local sin sobrescribir this.contacts si aún no se cargan
            let stored = [];
            try { stored = this.loadData('contacts', []); } catch (_) { stored = []; }
            if (!Array.isArray(stored) || stored.length === 0) return;
            let changed = false;
            stored.forEach(c => {
                if (c && typeof c === 'object') {
                    const normalized = this.normalizePhone(c.phone);
                    if (c.phone && !normalized) {
                        // Teléfono inválido previamente guardado (ej: 'Amor', 'Mamá'): lo limpiamos a null
                        c.phone = null;
                        changed = true;
                    } else if (normalized && normalized !== c.phone) {
                        c.phone = normalized;
                        changed = true;
                    }
                    // Guardar nombre visual de WhatsApp si no existe
                    if (!c.waDisplayName && c.name) c.waDisplayName = c.name;
                }
            });
            if (changed) {
                this.saveData('contacts', stored);
                console.log('🔧 Migración: teléfonos normalizados en contactos almacenados');
            }
        } catch (e) { console.warn('Migración de teléfonos falló:', e); }
    }

    // Crear recordatorio local (usa chrome.alarms si está disponible)
    async createReminder({ contactId, whenISO, note = '' }) {
        try {
            const when = new Date(whenISO);
            if (isNaN(when.getTime())) {
                this.showNotification('Fecha de recordatorio inválida', 'error');
                return false;
            }
            const id = this.generateId();
            const reminder = {
                id,
                contactId,
                fireAt: when.toISOString(),
                note,
                createdAt: new Date().toISOString(),
                status: 'scheduled'
            };
            this.reminders.push(reminder);
            this.saveReminders?.();

            // Intentar programar con chrome.alarms en background
            try {
                chrome.runtime.sendMessage({
                    action: 'scheduleReminder',
                    data: {
                        id,
                        fireAt: reminder.fireAt,
                        contactId,
                        note
                    }
                }, (resp) => {
                    if (chrome.runtime.lastError) {
                        console.warn('No se pudo usar background alarms:', chrome.runtime.lastError.message);
                    }
                });
            } catch (_) {}

            this.showNotification('Recordatorio creado', 'success');
            return true;
        } catch (e) {
            console.error('Error creating reminder:', e);
            this.showNotification('No se pudo crear recordatorio', 'error');
            return false;
        }
    }

    // UI para solicitar fecha/hora del recordatorio
    async promptReminder(contactId) {
        try {
            const contact = this.contacts.find(c => c.id === contactId);
            const defaultTime = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0,16); // +1h (sin segundos)
            const whenStr = prompt(`Programar recordatorio para ${contact?.name || 'contacto'} (YYYY-MM-DDTHH:MM)`, defaultTime);
            if (!whenStr) return;
            const note = prompt('Nota del recordatorio (opcional)', '') || '';
            const iso = whenStr.length === 16 ? `${whenStr}:00` : whenStr; // completar segundos si no están
            await this.createReminder({ contactId, whenISO: iso, note });
        } catch (e) {
            console.error('promptReminder error:', e);
        }
    }

    openContactNotesOverlay(contactId) {
        try {
            const modal = document.getElementById('contactNotesOverlay');
            if (!modal) return;
            this.currentNotesContactId = contactId;
            const contact = this.contacts.find(c => c.id === contactId);
            const title = document.getElementById('contactNotesTitle');
            const info = document.getElementById('contactNotesInfo');
            const textarea = document.getElementById('contactNotesTextarea');
            if (title) title.textContent = `Notas de ${contact?.name || 'Contacto'}`;
            if (info) info.textContent = `${contact?.phone || ''}`;
            if (textarea) textarea.value = contact?.notes || '';

            // Mostrar overlay
            modal.style.cssText = `
                display: flex !important;
                position: fixed !important; inset: 0; z-index: 999999999;
                align-items: center; justify-content: center;
                background: rgba(0,0,0,0.85); backdrop-filter: blur(10px);
            `;
            modal.classList.add('active');

            // Bind botones
            const close = () => { try { modal.style.cssText=''; modal.classList.remove('active'); } catch(_){} };
            document.getElementById('closeContactNotesOverlay')?.addEventListener('click', close, { once: true });
            document.getElementById('cancelContactNotesBtn')?.addEventListener('click', close, { once: true });
            document.getElementById('saveContactNotesBtn')?.addEventListener('click', () => {
                try {
                    const c = this.contacts.find(x => x.id === this.currentNotesContactId);
                    if (!c) return close();
                    c.notes = document.getElementById('contactNotesTextarea').value.trim();
                    c.updatedAt = new Date().toISOString();
                    this.saveContacts();
                    this.loadContactsList();
                    this.updateAllKanbanViews?.();
                    this.showNotification('Notas guardadas', 'success');
                } catch(e) { console.error('Error guardando notas', e); this.showNotification('Error al guardar notas', 'error'); }
                close();
            }, { once: true });
        } catch (e) { console.error('openContactNotesOverlay error', e); }
    }

    async saveContactsToSupabase() {
        try {
            if (!window.ContactsService) return;
            this.contactsService = this.contactsService || new window.ContactsService();
            await this.contactsService.init();
            if (!(await this.contactsService.isAuthenticated())) return;
            await this.contactsService.syncLocalToSupabase(this.contacts || []);
        } catch (e) { console.warn('saveContactsToSupabase error:', e); }
    }

    mergeContacts(remoteContacts = [], localContacts = []) {
        try {
            const byKey = (c) => {
                const phone = this.normalizePhone(c?.phone);
                return phone ? `phone:${phone}` : (c?.id ? `id:${c.id}` : (c?.name ? `name:${c.name}` : `rand:${Math.random()}`));
            };
            const map = new Map();
            (localContacts || []).forEach(c => map.set(byKey(c), { ...c }));
            (remoteContacts || []).forEach(rc => {
                const key = byKey(rc);
                if (!map.has(key)) { map.set(key, { ...rc }); return; }
                const lc = map.get(key);
                const lu = new Date(lc.updatedAt || lc.lastChat || lc.createdAt || 0).getTime();
                const ru = new Date(rc.updatedAt || rc.lastChat || rc.createdAt || 0).getTime();
                const newer = ru >= lu ? rc : lc;
                const older = ru >= lu ? lc : rc;
                map.set(key, {
                    ...older,
                    ...newer,
                    id: lc.id || rc.id,
                    _supabaseId: rc._supabaseId || older._supabaseId
                });
            });
            // Orden por última actividad visible
            return Array.from(map.values()).sort((a,b) => new Date(b.lastChat || b.updatedAt || 0) - new Date(a.lastChat || a.updatedAt || 0));
        } catch (_) { return localContacts; }
    }

    async syncContactsWithSupabase() {
        try {
            if (!window.ContactsService) return;
            this.contactsService = this.contactsService || new window.ContactsService();
            await this.contactsService.init();
            if (!(await this.contactsService.isAuthenticated())) return;
            const remote = await this.contactsService.fetchContacts();
            const merged = this.mergeContacts(remote, this.contacts || []);
            this.contacts = merged;
            this.saveData('contacts', this.contacts);
            try { this.contactsService.syncLocalToSupabase(this.contacts); } catch (_) {}
            try { this.loadContactsList?.(); } catch (_) {}
            try { this.loadKanban?.(); } catch (_) {}
            try { this.updateDashboard?.(); } catch (_) {}
            console.log(`☁️ Sincronización de contactos con Supabase completada: ${remote.length} remotos, ${this.contacts.length} totales`);
        } catch (e) {
            console.warn('syncContactsWithSupabase error:', e);
        }
    }
}

// ===========================================
// INICIALIZACIÓN GLOBAL
// ===========================================

let whatsappCRM = null;

// Función de inicialización principal
function initWhatsAppCRM() {
	console.log('🚀 === INICIANDO WHATSAPP CRM PROFESSIONAL (MODO OSCURO) ===');
	console.log('📊 Estado antes de la inicialización:', {
		document_ready: document.readyState,
		whatsappCRM_exists: !!window.whatsappCRM,
		WhatsAppCRM_class_exists: typeof WhatsAppCRM !== 'undefined',
		timestamp: new Date().toISOString()
	});
	
	try {
		console.log('🏗️ Creando instancia de WhatsAppCRM...');
		whatsappCRM = new WhatsAppCRM();
		console.log('✅ WhatsApp CRM Professional iniciado correctamente');
		
		// Hacer disponible globalmente para debugging mínimo necesario
		if (typeof window !== 'undefined') {
			window.whatsappCRM = whatsappCRM;
			console.log('🌐 WhatsAppCRM disponible globalmente en window.whatsappCRM');
		}
		
		console.log('🎉 === INICIALIZACIÓN COMPLETADA ===');
		
	} catch (error) {
		console.error('❌ Error al inicializar WhatsApp CRM:', error);
		console.error('📋 Stack trace:', error.stack);
		
		// Reintentar después de 2 segundos
		setTimeout(() => {
			console.log('🔄 Reintentando inicialización...');
			initWhatsAppCRM();
		}, 2000);
	}
}

// Inicializar cuando el DOM esté listo
console.log('📱 WhatsApp CRM sidebar.js: Script cargado, estado del DOM:', document.readyState);

if (document.readyState === 'loading') {
	console.log('📱 WhatsApp CRM sidebar.js: Esperando DOMContentLoaded...');
	document.addEventListener('DOMContentLoaded', () => {
		console.log('📱 WhatsApp CRM sidebar.js: DOMContentLoaded recibido, iniciando...');
		setTimeout(initWhatsAppCRM, 100);
	});
} else {
	console.log('📱 WhatsApp CRM sidebar.js: DOM ya cargado, iniciando inmediatamente...');
	setTimeout(initWhatsAppCRM, 100);
}

// Agregar estilos para las animaciones de notificaciones
const style = document.createElement('style');
style.textContent = `
@keyframes slideInRight {
	from {
		transform: translateX(100%);
		opacity: 0;
	}
	to {
		transform: translateX(0);
		opacity: 1;
	}
}

@keyframes slideOutRight {
	from {
		transform: translateX(0);
		opacity: 1;
	}
	to {
		transform: translateX(100%);
		opacity: 0;
	}
}
`;
document.head.appendChild(style);

console.log('📱 === WHATSAPP CRM SIDEBAR.JS CARGADO COMPLETAMENTE ===');
console.log('🔧 Funciones disponibles:', {
	WhatsAppCRM: typeof WhatsAppCRM !== 'undefined',
	initWhatsAppCRM: typeof initWhatsAppCRM !== 'undefined'
});

// Verificar inmediatamente si el DOM tiene el container del sidebar
setTimeout(() => {
	const sidebarContainer = document.getElementById('whatsapp-crm-sidebar');
	console.log('🎯 Container del sidebar después de cargar:', !!sidebarContainer);
	if (!sidebarContainer) {
		console.log('⚠️ AVISO: Container del sidebar no encontrado aún, esperando a content.js...');
	}
}, 100);