// WhatsApp CRM Extension - Sidebar Professional Functionality (Modo Oscuro)
// Versión Mejorada con Debugging Completo

class WhatsAppCRM {
    constructor() {
        console.log('🚀 WhatsApp CRM Professional (Modo Oscuro) - Iniciando...');
        
        // Inicializar datos con valores por defecto
        this.contacts = this.loadData('contacts', []);
        this.tags = this.loadData('tags', []);
        this.templates = this.loadData('templates', []);
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
            
            // Crear datos de ejemplo si no existen
            this.createSampleDataIfEmpty();
            
            // Cargar configuraciones
            this.loadSettings();
            
            // Vincular todos los eventos
            this.bindAllEvents();
            
            // Cargar contenido inicial
            this.loadInitialData();
            
            // Iniciar sincronización automática
            this.startPeriodicSync();
            
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

    createSampleDataIfEmpty() {
        // Crear etiquetas de ejemplo si no existen
        if (this.tags.length === 0) {
            console.log('📝 Creando etiquetas de ejemplo...');
            this.tags = [
                {
                    id: this.generateId(),
                    name: 'Cliente VIP',
                    color: '#FFD700',
                    description: 'Cliente de alto valor',
                    createdAt: new Date().toISOString()
                },
                {
                    id: this.generateId(),
                    name: 'Prospecto',
                    color: '#3B82F6',
                    description: 'Potencial cliente',
                    createdAt: new Date().toISOString()
                },
                {
                    id: this.generateId(),
                    name: 'Urgente',
                    color: '#EF4444',
                    description: 'Requiere atención inmediata',
                    createdAt: new Date().toISOString()
                }
            ];
            this.saveTags();
        }

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

        // Crear contactos de ejemplo si no existen
        if (this.contacts.length === 0) {
            console.log('👥 Creando contactos de ejemplo...');
            this.contacts = [
                {
                    id: this.generateId(),
                    name: 'Juan Pérez',
                    phone: '+57 300 1234567',
                    status: 'lead',
                    tags: [this.tags[1]?.id], // Prospecto
                    notes: 'Interesado en nuestros servicios de desarrollo web',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastChat: new Date().toISOString()
                },
                {
                    id: this.generateId(),
                    name: 'María González',
                    phone: '+57 310 9876543',
                    status: 'client',
                    tags: [this.tags[0]?.id], // Cliente VIP
                    notes: 'Cliente desde 2023, muy satisfecha con el servicio',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastChat: new Date().toISOString()
                },
                {
                    id: this.generateId(),
                    name: 'Carlos Rodríguez',
                    phone: '+57 320 5555555',
                    status: 'process',
                    tags: [this.tags[2]?.id], // Urgente
                    notes: 'En proceso de negociación, enviar propuesta',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastChat: new Date().toISOString()
                }
            ];
            this.saveContacts();
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
            
            // Filtros
            this.bindFilterEvents();
            
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
                    // Si es kanban, abrir directamente fullscreen
                    if (section === 'kanban') {
                        console.log('📋 CLICK EN KANBAN DETECTADO - Iniciando fullscreen...');
                        console.log('🔍 Estado antes de abrir:', {
                            element: item,
                            section: section,
                            timestamp: new Date().toISOString()
                        });
                        
                        // Test simple - mostrar alert para confirmar que el evento funciona
                        alert('Kanban clickeado! Abriendo fullscreen...');
                        
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

    bindFilterEvents() {
        // Búsqueda
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                console.log(`🔍 Buscando: "${this.searchQuery}"`);
                this.applyFilters();
            });
            this.debugStats.eventsbound++;
        }

        // Filtros por etiqueta
        const filterTags = document.querySelectorAll('.filter-tag');
        filterTags.forEach(tag => {
            tag.addEventListener('click', () => {
                document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
                tag.classList.add('active');
                this.currentFilter = tag.dataset.filter;
                console.log(`🏷️ Filtro activo: ${this.currentFilter}`);
                this.applyFilters();
            });
            this.debugStats.eventsbound++;
        });
        console.log(`✓ Filter events bound (search + ${filterTags.length} tags)`);
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
            console.log('🚀 === INICIANDO KANBAN FULLSCREEN ===');
            
            // MÉTODO DIRECTO Y SIMPLE
            
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
            
            // 2. Crear overlay fullscreen simple
            console.log('2️⃣ Creando overlay fullscreen...');
            let overlay = document.getElementById('kanban-overlay-simple');
            
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'kanban-overlay-simple';
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
                
                overlay.innerHTML = `
                    <div style="padding: 20px; background: #161b22; border-bottom: 1px solid #21262d; display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <button id="kanban-back-btn" style="background: #00a884; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: bold;">← Volver</button>
                            <h1 style="margin: 0; color: #e6edf3;">📋 CRM Kanban</h1>
                        </div>
                        <button id="kanban-close-btn" style="background: rgba(255,255,255,0.1); color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer;">✕</button>
                    </div>
                    <div style="flex: 1; padding: 20px; overflow: auto;">
                        <div style="background: #161b22; padding: 40px; border-radius: 12px; text-align: center;">
                            <h2 style="color: #e6edf3; margin-bottom: 20px;">🎯 Kanban CRM</h2>
                            <p style="color: #8b949e; margin-bottom: 30px;">Vista en pantalla completa del sistema CRM</p>
                            <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
                                <div style="background: #21262d; padding: 20px; border-radius: 8px; min-width: 200px;">
                                    <h3 style="color: #58a6ff; margin-bottom: 10px;">📊 Contactos: ${this.contacts.length}</h3>
                                    <p style="color: #8b949e; font-size: 14px;">Total en el sistema</p>
                                </div>
                                <div style="background: #21262d; padding: 20px; border-radius: 8px; min-width: 200px;">
                                    <h3 style="color: #39d353; margin-bottom: 10px;">🏷️ Etiquetas: ${this.tags.length}</h3>
                                    <p style="color: #8b949e; font-size: 14px;">Para organizar</p>
                                </div>
                                <div style="background: #21262d; padding: 20px; border-radius: 8px; min-width: 200px;">
                                    <h3 style="color: #f85149; margin-bottom: 10px;">📋 Plantillas: ${this.templates.length}</h3>
                                    <p style="color: #8b949e; font-size: 14px;">Mensajes rápidos</p>
                                </div>
                            </div>
                            <div style="margin-top: 30px; padding: 20px; background: #21262d; border-radius: 8px; border-left: 4px solid #00a884;">
                                <h4 style="color: #e6edf3; margin-bottom: 10px;">💡 Información</h4>
                                <p style="color: #8b949e; font-size: 14px; line-height: 1.5;">
                                    Este es el modo kanban fullscreen del CRM. Aquí podrás gestionar todos tus contactos de forma visual y organizada.
                                    <br><br>
                                    <strong style="color: #e6edf3;">Próximamente:</strong> Columnas dinámicas, drag & drop, y gestión completa de leads.
                                </p>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(overlay);
                console.log('✅ Overlay creado y agregado al DOM');
                
                // Vincular eventos de los botones
                this.bindKanbanSimpleEvents();
            } else {
                overlay.style.display = 'flex';
                console.log('✅ Overlay existente mostrado');
                
                // Asegurar que los eventos estén vinculados
                this.bindKanbanSimpleEvents();
            }
            
            console.log('🎉 === KANBAN FULLSCREEN ACTIVO ===');
            
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
            console.log('🔄 Cerrando kanban simple...');
            
            // Mostrar WhatsApp y CRM de nuevo
            const whatsappApp = document.querySelector('#app');
            const crmSidebar = document.querySelector('.wa-crm-sidebar');
            const overlay = document.getElementById('kanban-overlay-simple');
            
            if (whatsappApp) {
                whatsappApp.style.display = '';
                console.log('✅ WhatsApp Web restaurado');
            }
            
            if (crmSidebar) {
                crmSidebar.style.display = '';
                console.log('✅ CRM Sidebar restaurado');
            }
            
            if (overlay) {
                overlay.style.display = 'none';
                console.log('✅ Overlay ocultado');
            }
            
            console.log('🎉 Kanban cerrado correctamente');
            
        } catch (error) {
            console.error('❌ Error closing kanban:', error);
        }
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
                    <div class="kanban-fullscreen-column" data-tag-id="${column.tagId || 'untagged'}">
                        <div class="kanban-fullscreen-column-header" style="background: ${column.color}">
                            <span class="kanban-fullscreen-column-title">${column.title}</span>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span class="kanban-fullscreen-column-count">${columnContacts.length}</span>
                                <span class="kanban-fullscreen-column-subtitle">contactos</span>
                            </div>
                        </div>
                        <div class="kanban-fullscreen-cards" 
                             data-tag-id="${column.tagId || 'untagged'}"
                             ondragover="whatsappCRM.handleDragOver(event)"
                             ondragleave="whatsappCRM.handleDragLeave(event)"
                             ondrop="whatsappCRM.handleDrop(event)">
                            ${this.renderKanbanFullscreenCards(columnContacts)}
                        </div>
                        <div class="kanban-add-contact" onclick="whatsappCRM.addContactToTag('${column.tagId || ''}')">
                            <span>+ Agregar contacto</span>
                        </div>
                    </div>
                `;
            }).join('');

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

            return contacts.map(contact => `
                <div class="kanban-fullscreen-card" 
                     draggable="true" 
                     data-contact-id="${contact.id}"
                     onclick="whatsappCRM.openContactDetails('${contact.id}')"
                     ondragstart="whatsappCRM.handleDragStart(event)"
                     ondragend="whatsappCRM.handleDragEnd(event)">
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
                        <button class="kanban-fullscreen-action-btn call" onclick="event.stopPropagation(); whatsappCRM.callContact('${contact.phone}')" title="Llamar">
                            📞
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
                </div>
            `).join('');

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
            switch (sectionName) {
                case 'dashboard':
                    this.updateDashboard();
                    break;
                case 'kanban':
                    this.loadKanban();
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

    applyFilters() {
        try {
            const filteredContacts = this.contacts.filter(contact => {
                const matchesSearch = !this.searchQuery || 
                    contact.name.toLowerCase().includes(this.searchQuery) ||
                    contact.phone.includes(this.searchQuery);
                
                const matchesFilter = this.currentFilter === 'all' || 
                    contact.tags?.includes(this.currentFilter) ||
                    contact.status === this.currentFilter;
                
                return matchesSearch && matchesFilter;
            });

            console.log(`🔍 Filtros aplicados: ${filteredContacts.length}/${this.contacts.length} contactos`);
            this.renderFilteredContacts(filteredContacts);
            
        } catch (error) {
            console.error('Error applying filters:', error);
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
                        <div class="contact-avatar">${this.getContactInitials(contact.name)}</div>
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
    // VISTA KANBAN
    // ===========================================

    loadKanban() {
        try {
            console.log('📋 Cargando vista Kanban...');
            this.renderKanbanCards();
        } catch (error) {
            console.error('Error loading kanban:', error);
        }
    }

    renderKanbanCards(contacts = this.contacts) {
        try {
            // En el sidebar pequeño, solo mostrar un resumen con las etiquetas principales
            const tagSummary = this.generateTagSummary(contacts);
            
            // Actualizar contadores básicos
            const elements = {
                leadsCards: document.getElementById('leadsCards'),
                processCards: document.getElementById('processCards'),
                clientsCards: document.getElementById('clientsCards'),
                leadsCount: document.getElementById('leadsCount'),
                processCount: document.getElementById('processCount'),
                clientsCount: document.getElementById('clientsCount')
            };

            // Mostrar resumen por etiquetas en el sidebar
            if (elements.leadsCards) {
                elements.leadsCards.innerHTML = `
                    <div class="kanban-summary">
                        <p>Tienes <strong>${this.tags.length}</strong> etiquetas</p>
                        <p>Contactos: <strong>${contacts.length}</strong></p>
                        <button class="btn-primary kanban-fullscreen-btn">
                            Ver Kanban Completo
                        </button>
                    </div>
                `;
            }
            
            if (elements.leadsCount) elements.leadsCount.textContent = this.tags.length;
            if (elements.processCount) elements.processCount.textContent = contacts.length;
            if (elements.clientsCount) elements.clientsCount.textContent = '★';

            // Vincular eventos después de renderizar
            this.bindKanbanSidebarEvents();

            console.log(`📋 Kanban sidebar renderizado - ${this.tags.length} etiquetas, ${contacts.length} contactos`);
            
        } catch (error) {
            console.error('Error rendering kanban cards:', error);
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
        const sampleContacts = [
            { id: '1', name: 'FAMILIA MINDSET', phone: '+57 311 2709204', status: 'all', notes: 'Lanzara que no pueda recibir las llamadas' },
            { id: '2', name: 'Juan Carlos', phone: '+57 302 6560911', status: 'webinar', notes: 'Cuéntame, ¿de qué es tu empresa?' },
            { id: '3', name: 'María González', phone: '+57 316 5765874', status: 'sales', notes: 'Quedó solo 3 cupos y llevo mucho esperando' },
            { id: '4', name: 'Pedro Ramírez', phone: '+57 310 7805470', status: 'no-qualify', notes: 'Edith mirna Aguja con Fina' },
            { id: '5', name: 'Ana López', phone: '+57 312 3864638', status: 'follow-1', notes: 'Uno de nuestros empresarios' },
            { id: '6', name: 'Carlos Ruiz', phone: '+57 311 5580749', status: 'follow-3', notes: 'Hola confirmame si puedo' },
            { id: '7', name: 'Sofia Martín', phone: '+57 320 2738507', status: 'follow-final', notes: 'Hola Marlene, confirmame' },
            { id: '8', name: 'Diego Torres', phone: '+57 304 5380656', status: 'all', notes: 'Regreso pollo a tiempo' },
            { id: '9', name: 'Lucía Herrera', phone: '+57 313 4371882', status: 'webinar', notes: 'Hola dimo que si Carolina' },
            { id: '10', name: 'Roberto Silva', phone: '+57 314 2067971', status: 'sales', notes: 'Entiendo, feliz y bendecido' },
        ];

        return sampleContacts;
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
                        <div class="contact-avatar" style="background: ${this.getContactColor(contact.phone)}">${this.getContactInitials(contact.name)}</div>
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
        const hash = phone.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
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
        window.open(`tel:${phone}`, '_self');
    }

    // ===========================================
    // DRAG & DROP FUNCTIONALITY
    // ===========================================

    handleDragStart(event) {
        try {
            const contactId = event.target.closest('.kanban-fullscreen-card').dataset.contactId;
            event.dataTransfer.setData('text/plain', contactId);
            event.target.style.opacity = '0.5';
            console.log(`🖱️ Iniciando drag de contacto: ${contactId}`);
        } catch (error) {
            console.error('Error in drag start:', error);
        }
    }

    handleDragEnd(event) {
        try {
            event.target.style.opacity = '1';
        } catch (error) {
            console.error('Error in drag end:', error);
        }
    }

    handleDragOver(event) {
        try {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            
            // Agregar efecto visual
            const targetColumn = event.target.closest('.kanban-fullscreen-cards');
            if (targetColumn && !targetColumn.classList.contains('drag-over')) {
                targetColumn.classList.add('drag-over');
            }
        } catch (error) {
            console.error('Error in drag over:', error);
        }
    }

    handleDragLeave(event) {
        try {
            // Remover efecto visual cuando el drag sale de la columna
            const targetColumn = event.target.closest('.kanban-fullscreen-cards');
            if (targetColumn) {
                targetColumn.classList.remove('drag-over');
            }
        } catch (error) {
            console.error('Error in drag leave:', error);
        }
    }

    handleDrop(event) {
        try {
            event.preventDefault();
            const contactId = event.dataTransfer.getData('text/plain');
            const targetColumn = event.target.closest('.kanban-fullscreen-cards');
            const newTagId = targetColumn.dataset.tagId;
            
            // Limpiar efecto visual
            targetColumn.classList.remove('drag-over');
            
            if (newTagId === 'untagged') {
                this.moveContactToTag(contactId, null);
            } else {
                this.moveContactToTag(contactId, newTagId);
            }
            
            console.log(`📋 Contacto ${contactId} movido a columna: ${newTagId || 'sin etiqueta'}`);
            
        } catch (error) {
            console.error('Error in drop:', error);
        }
    }

    moveContactToTag(contactId, newTagId) {
        try {
            const contact = this.contacts.find(c => c.id === contactId);
            if (!contact) {
                console.warn('⚠️ Contacto no encontrado:', contactId);
                return;
            }

            // Actualizar etiquetas del contacto
            if (newTagId) {
                // Mover a una etiqueta específica
                contact.tags = [newTagId];
                const tag = this.tags.find(t => t.id === newTagId);
                this.showNotification(`Contacto movido a "${tag?.name || 'etiqueta'}"`, 'success');
            } else {
                // Remover todas las etiquetas
                contact.tags = [];
                this.showNotification('Etiquetas removidas del contacto', 'success');
            }

            // Guardar cambios
            this.saveContacts();
            
            // Actualizar interfaz
            this.renderKanbanFullscreen();
            
            console.log(`✅ Contacto ${contact.name} actualizado con etiquetas:`, contact.tags);
            
        } catch (error) {
            console.error('Error moving contact:', error);
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
                        <div class="contact-avatar">${this.getContactInitials(contact.name)}</div>
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
            
            if (contactId) {
                const contact = this.contacts.find(c => c.id === contactId);
                if (contact) {
                    title.textContent = 'Editar Contacto';
                    document.getElementById('contactName').value = contact.name;
                    document.getElementById('contactPhone').value = contact.phone;
                    document.getElementById('contactStatus').value = contact.status;
                    document.getElementById('contactNotes').value = contact.notes || '';
                }
            } else {
                title.textContent = 'Nuevo Contacto';
                document.getElementById('contactName').value = '';
                document.getElementById('contactPhone').value = '';
                document.getElementById('contactStatus').value = 'lead';
                document.getElementById('contactNotes').value = '';
            }
            
            modal.classList.add('active');
            console.log(`📝 Modal de contacto abierto (${contactId ? 'editar' : 'nuevo'})${preselectedTagId ? ` con etiqueta preseleccionada: ${preselectedTagId}` : ''}`);
            
        } catch (error) {
            console.error('Error opening contact modal:', error);
        }
    }

    closeContactModal() {
        try {
            const modal = document.getElementById('contactModal');
            modal.classList.remove('active');
            this.currentEditingContact = null;
            console.log('❌ Modal de contacto cerrado');
        } catch (error) {
            console.error('Error closing contact modal:', error);
        }
    }

    saveContact() {
        try {
            const name = document.getElementById('contactName').value.trim();
            const phone = document.getElementById('contactPhone').value.trim();
            const status = document.getElementById('contactStatus').value;
            const notes = document.getElementById('contactNotes').value.trim();

            if (!name || !phone) {
                this.showNotification('Por favor completa nombre y teléfono', 'error');
                return;
            }

            const contactData = {
                name,
                phone,
                status,
                notes,
                updatedAt: new Date().toISOString()
            };

            if (this.currentEditingContact) {
                const contact = this.contacts.find(c => c.id === this.currentEditingContact);
                if (contact) {
                    Object.assign(contact, contactData);
                    this.showNotification('Contacto actualizado', 'success');
                    console.log(`✏️ Contacto actualizado: ${contact.name}`);
                }
            } else {
                const newContact = {
                    id: this.generateId(),
                    ...contactData,
                    createdAt: new Date().toISOString(),
                    tags: this.preselectedTagId ? [this.preselectedTagId] : []
                };
                this.contacts.push(newContact);
                this.showNotification('Contacto creado', 'success');
                console.log(`➕ Nuevo contacto creado: ${newContact.name}${this.preselectedTagId ? ' con etiqueta preseleccionada' : ''}`);
            }

            this.saveContacts();
            this.closeContactModal();
            this.loadContactsList();
            this.loadKanban();
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

    loadTags() {
        try {
            console.log(`🏷️ Cargando ${this.tags.length} etiquetas...`);
            this.renderTags();
        } catch (error) {
            console.error('Error loading tags:', error);
        }
    }

    renderTags() {
        try {
            const container = document.getElementById('tagsContainer');
            if (!container) {
                console.error('❌ Tags container (#tagsContainer) not found - verificar que el HTML está cargado');
                return;
            }

            if (this.tags.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🏷️</div>
                        <div class="empty-state-text">No hay etiquetas creadas</div>
                        <div class="empty-state-subtext">Crea etiquetas para organizar tus contactos</div>
                    </div>
                `;
                return;
            }

            container.innerHTML = this.tags.map(tag => `
                <div class="contact-card" style="border-left: 4px solid ${tag.color}">
                    <div class="contact-header">
                        <div class="contact-avatar" style="background: ${tag.color}">${tag.name.charAt(0).toUpperCase()}</div>
                        <div class="contact-info">
                            <div class="contact-name">${this.escapeHtml(tag.name)}</div>
                            <div class="contact-phone">${tag.description || 'Sin descripción'}</div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn-secondary tag-edit-btn" data-tag-id="${tag.id}" title="Editar">✏️</button>
                            <button class="btn-secondary tag-delete-btn" data-tag-id="${tag.id}" title="Eliminar">🗑️</button>
                        </div>
                    </div>
                    <div class="contact-meta">
                        <span>${this.getTagUsageCount(tag.id)} contactos</span>
                        <span class="badge" style="background: ${tag.color}">${tag.name}</span>
                    </div>
                </div>
            `).join('');

            // Vincular eventos después de crear el HTML
            this.bindTagCardEvents();

            console.log(`🏷️ ${this.tags.length} etiquetas renderizadas`);
            
        } catch (error) {
            console.error('Error rendering tags:', error);
        }
    }

    bindTagCardEvents() {
        try {
            // Botones de editar etiqueta
            const editButtons = document.querySelectorAll('.tag-edit-btn');
            editButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tagId = btn.dataset.tagId;
                    if (tagId) {
                        console.log(`✏️ Editando etiqueta: ${tagId}`);
                        this.editTag(tagId);
                    }
                });
            });

            // Botones de eliminar etiqueta
            const deleteButtons = document.querySelectorAll('.tag-delete-btn');
            deleteButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tagId = btn.dataset.tagId;
                    if (tagId) {
                        console.log(`🗑️ Eliminando etiqueta: ${tagId}`);
                        this.deleteTag(tagId);
                    }
                });
            });

            console.log(`🔗 Eventos vinculados: ${editButtons.length} editar, ${deleteButtons.length} eliminar`);

        } catch (error) {
            console.error('Error binding tag card events:', error);
        }
    }

    openTagModal(tagId = null) {
        try {
            this.currentEditingTag = tagId;
            const modal = document.getElementById('tagModal');
            const title = document.getElementById('tagModalTitle');
            
            if (tagId) {
                const tag = this.tags.find(t => t.id === tagId);
                if (tag) {
                    title.textContent = 'Editar Etiqueta';
                    document.getElementById('tagName').value = tag.name;
                    document.getElementById('tagColor').value = tag.color;
                    document.getElementById('tagDescription').value = tag.description;
                }
            } else {
                title.textContent = 'Nueva Etiqueta';
                document.getElementById('tagName').value = '';
                document.getElementById('tagColor').value = '#00a884';
                document.getElementById('tagDescription').value = '';
            }
            
            modal.classList.add('active');
            console.log(`🏷️ Modal de etiqueta abierto (${tagId ? 'editar' : 'nueva'})`);
            
        } catch (error) {
            console.error('Error opening tag modal:', error);
        }
    }

    closeTagModal() {
        try {
            const modal = document.getElementById('tagModal');
            modal.classList.remove('active');
            this.currentEditingTag = null;
            console.log('❌ Modal de etiqueta cerrado');
        } catch (error) {
            console.error('Error closing tag modal:', error);
        }
    }

    saveTag() {
        try {
            const name = document.getElementById('tagName').value.trim();
            const color = document.getElementById('tagColor').value;
            const description = document.getElementById('tagDescription').value.trim();

            if (!name) {
                this.showNotification('El nombre es requerido', 'error');
                return;
            }

            const tagData = { name, color, description };

            if (this.currentEditingTag) {
                const tag = this.tags.find(t => t.id === this.currentEditingTag);
                if (tag) {
                    Object.assign(tag, tagData);
                    this.showNotification('Etiqueta actualizada', 'success');
                    console.log(`✏️ Etiqueta actualizada: ${tag.name}`);
                }
            } else {
                if (this.tags.find(t => t.name.toLowerCase() === name.toLowerCase())) {
                    this.showNotification('Ya existe una etiqueta con ese nombre', 'error');
                    return;
                }
                
                const newTag = {
                    id: this.generateId(),
                    ...tagData,
                    createdAt: new Date().toISOString()
                };
                this.tags.push(newTag);
                this.showNotification('Etiqueta creada', 'success');
                console.log(`➕ Nueva etiqueta creada: ${newTag.name}`);
            }

            this.saveTags();
            this.closeTagModal();
            this.loadTags();
            this.updateDashboard();
            
            // Actualizar kanban si está abierto
            if (document.getElementById('kanbanFullscreen')?.classList.contains('active')) {
                this.renderKanbanFullscreen();
            } else {
                this.loadKanban();
            }
            
        } catch (error) {
            console.error('Error saving tag:', error);
            this.showNotification('Error al guardar etiqueta', 'error');
        }
    }

    editTag(tagId) {
        this.openTagModal(tagId);
    }

    deleteTag(tagId) {
        try {
            const tag = this.tags.find(t => t.id === tagId);
            if (!tag) return;

            const usageCount = this.getTagUsageCount(tagId);
            if (usageCount > 0) {
                if (!confirm(`Esta etiqueta está asignada a ${usageCount} contactos. ¿Continuar?`)) {
                    return;
                }
            }

            this.tags = this.tags.filter(t => t.id !== tagId);
            
            // Remover de contactos
            this.contacts.forEach(contact => {
                if (contact.tags) {
                    contact.tags = contact.tags.filter(tId => tId !== tagId);
                }
            });

            this.saveTags();
            this.saveContacts();
            this.loadTags();
            this.updateDashboard();
            this.showNotification('Etiqueta eliminada', 'success');
            
            // Actualizar kanban si está abierto
            if (document.getElementById('kanbanFullscreen')?.classList.contains('active')) {
                this.renderKanbanFullscreen();
            } else {
                this.loadKanban();
            }
            console.log(`🗑️ Etiqueta eliminada: ${tag.name}`);
            
        } catch (error) {
            console.error('Error deleting tag:', error);
            this.showNotification('Error al eliminar etiqueta', 'error');
        }
    }

    getTagUsageCount(tagId) {
        try {
            return this.contacts.filter(contact => 
                contact.tags && contact.tags.includes(tagId)
            ).length;
        } catch (error) {
            console.error('Error getting tag usage count:', error);
            return 0;
        }
    }

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
                        const existingContact = this.contacts.find(c => 
                            c.phone === contact.phone || c.name === contact.name
                        );
                        
                        if (existingContact) {
                            // Actualizar contacto existente
                            existingContact.name = contact.name || existingContact.name;
                            existingContact.lastChat = new Date().toISOString();
                            existingContact.updatedAt = new Date().toISOString();
                            updatedContacts++;
                        } else {
                            // Nuevo contacto
                            this.contacts.push({
                                id: this.generateId(),
                                ...contact,
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
                phone = phoneMatch[0].replace(/[\s\-()]/g, '');
                cleanName = name.replace(phoneMatch[0], '').trim();
            }
            
            // Si no hay nombre limpio, usar el teléfono como nombre
            if (!cleanName || cleanName.length === 0) {
                cleanName = phone || name;
            }
            
            // Si no hay teléfono detectado, usar el nombre como teléfono (puede ser un número)
            if (!phone) {
                // Verificar si el nombre parece un número de teléfono
                if (/^[\+\d\s\-()]+$/.test(name)) {
                    phone = name.replace(/[\s\-()]/g, '');
                } else {
                    phone = name; // Usar como identificador único
                }
            }
            
            // Intentar extraer información adicional del elemento
            const lastMessageTime = this.extractLastMessageTime(element);
            const hasUnread = this.hasUnreadMessages(element);
            
            return {
                name: cleanName,
                phone: phone,
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
            let contact = this.contacts.find(c => 
                c.name === currentChat.name || 
                c.phone === currentChat.phone ||
                c.phone === currentChat.name
            );
            
            // Si no existe, crear uno nuevo automáticamente
            if (!contact && currentChat.name) {
                contact = {
                    id: this.generateId(),
                    name: currentChat.name,
                    phone: currentChat.phone || currentChat.name,
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
                // Actualizar último chat
                contact.lastChat = new Date().toISOString();
                contact.currentlyOpen = true;
                this.saveContacts();
            }
            
            // Actualizar UI con información del contacto
            this.renderCurrentContactTags(contact);
            
        } catch (error) {
            console.error('Error updating current contact info:', error);
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
            
            // Toggle etiqueta
            if (contact.tags.includes(tagId)) {
                // Remover etiqueta
                contact.tags = contact.tags.filter(t => t !== tagId);
                console.log(`🏷️ Etiqueta "${tag.name}" removida de ${contact.name}`);
                this.showNotification(`Etiqueta "${tag.name}" removida`, 'info');
            } else {
                // Agregar etiqueta
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
            
            let name = null;
            let phone = null;
            
            for (const selector of nameSelectors) {
                const nameElement = headerElement.querySelector(selector);
                if (nameElement) {
                    const elementText = nameElement.textContent?.trim() || nameElement.title?.trim();
                    if (elementText && elementText.length > 0) {
                        name = elementText;
                        break;
                    }
                }
            }
            
            if (!name) {
                console.log('⚠️ Nombre del chat no encontrado');
                return null;
            }
            
            // Intentar extraer teléfono si está disponible
            const phoneMatch = name.match(/\+[\d\s\-()]+/);
            if (phoneMatch) {
                phone = phoneMatch[0].replace(/[\s\-()]/g, '');
            }
            
            // Si el nombre completo parece un teléfono
            if (/^[\+\d\s\-()]+$/.test(name)) {
                phone = name.replace(/[\s\-()]/g, '');
            }
            
            console.log(`📱 Chat actual detectado: ${name}${phone ? ` (${phone})` : ''}`);
            
            return { 
                name: name,
                phone: phone || name,
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
        return name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
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
        
        // Hacer disponible globalmente para debugging
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

// Función de depuración para desarrollo
function debugWhatsAppCRM() {
    if (!whatsappCRM) {
        console.log('❌ WhatsApp CRM no inicializado');
        return null;
    }
    
    const info = whatsappCRM.getDebugInfo();
    console.log('🔍 WhatsApp CRM Debug Info:');
    console.table(info);
    
    // Tests funcionales
    console.log('🧪 Tests funcionales:');
    console.log('- Botón agregar etiqueta:', !!document.getElementById('addTagBtn'));
    console.log('- Modal etiquetas:', !!document.getElementById('tagModal'));
    console.log('- Contenedor etiquetas:', !!document.getElementById('tagsContainer'));
    console.log('- Datos cargados:', info.contacts > 0, info.tags > 0, info.templates > 0);
    
    return info;
}

// Test de elementos críticos
function testCriticalElements() {
    const criticalElements = [
        { id: 'sidebarToggle', description: 'Toggle button del sidebar' },
        { id: 'addTagBtn', description: 'Botón agregar etiqueta' },
        { id: 'addTemplateBtn', description: 'Botón agregar plantilla' },
        { id: 'addContactBtn', description: 'Botón agregar contacto' },
        { id: 'tagModal', description: 'Modal de etiquetas' },
        { id: 'templateModal', description: 'Modal de plantillas' },
        { id: 'contactModal', description: 'Modal de contactos' },
        { id: 'tagsContainer', description: 'Contenedor de etiquetas' },
        { id: 'templatesContainer', description: 'Contenedor de plantillas' },
        { id: 'contactsList', description: 'Lista de contactos' }
    ];
    
    console.log('🔍 === TESTING CRITICAL ELEMENTS ===');
    
    const missing = [];
    const found = [];
    
    criticalElements.forEach(item => {
        const element = document.getElementById(item.id);
        if (element) {
            found.push(item);
            console.log(`✅ ${item.id}: ${item.description}`);
        } else {
            missing.push(item);
            console.error(`❌ ${item.id}: ${item.description}`);
        }
    });
    
    console.log(`\n📊 Resumen: ${found.length}/${criticalElements.length} elementos encontrados`);
    
    if (missing.length > 0) {
        console.log('🚨 Elementos faltantes:');
        missing.forEach(item => {
            console.log(`- ${item.id}: ${item.description}`);
        });
        
        // Verificar si el contenedor principal existe
        const mainContainer = document.getElementById('whatsapp-crm-sidebar');
        if (!mainContainer) {
            console.error('🚨 PROBLEMA PRINCIPAL: El contenedor del sidebar (#whatsapp-crm-sidebar) no existe!');
            console.log('💡 Esto indica que content.js no ha inyectado el HTML aún.');
        }
    }
    
    return { found: found.length, total: criticalElements.length, missing };
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

// Exponer funciones globalmente para uso en HTML y debugging
if (typeof window !== 'undefined') {
    window.debugWhatsAppCRM = debugWhatsAppCRM;
    window.initWhatsAppCRM = initWhatsAppCRM;
    window.testCriticalElements = testCriticalElements;
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
    initWhatsAppCRM: typeof initWhatsAppCRM !== 'undefined', 
    debugWhatsAppCRM: typeof debugWhatsAppCRM !== 'undefined',
    testCriticalElements: typeof testCriticalElements !== 'undefined'
});

// TEST RÁPIDO DE ETIQUETAS - Integrado directamente
window.quickTestTags = function() {
    console.log('🏷️ === TEST RÁPIDO DE ETIQUETAS (CSP FIXED) ===');
    
    // 1. Verificar elementos HTML
    const elements = {
        addTagBtn: !!document.getElementById('addTagBtn'),
        tagsContainer: !!document.getElementById('tagsContainer'),
        tagModal: !!document.getElementById('tagModal'),
        tagNameField: !!document.getElementById('tagName'),
        tagColorField: !!document.getElementById('tagColor'),
        saveTagBtn: !!document.getElementById('saveTagBtn')
    };
    
    console.log('📋 Elementos HTML:');
    Object.entries(elements).forEach(([name, exists]) => {
        console.log(`${exists ? '✅' : '❌'} ${name}`);
    });
    
    // 2. Verificar JavaScript
    const js = {
        whatsappCRM: !!window.whatsappCRM,
        hasTags: !!(window.whatsappCRM?.tags),
        openTagModal: typeof window.whatsappCRM?.openTagModal === 'function',
        saveTag: typeof window.whatsappCRM?.saveTag === 'function',
        renderTags: typeof window.whatsappCRM?.renderTags === 'function'
    };
    
    console.log('📜 JavaScript:');
    Object.entries(js).forEach(([name, exists]) => {
        console.log(`${exists ? '✅' : '❌'} ${name}`);
    });
    
    // 3. Verificar CSP (sin onclick)
    const csp = {
        noOnclickInDOM: document.querySelectorAll('[onclick]').length === 0,
        hasEventButtons: document.querySelectorAll('.tag-edit-btn, .tag-delete-btn').length > 0
    };
    
    console.log('🔒 CSP Status:');
    Object.entries(csp).forEach(([test, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${test}`);
    });
    
    // 4. Mostrar etiquetas actuales
    if (window.whatsappCRM?.tags) {
        console.log(`💾 Etiquetas actuales: ${window.whatsappCRM.tags.length}`);
        if (window.whatsappCRM.tags.length > 0) {
            window.whatsappCRM.tags.forEach((tag, i) => {
                console.log(`   ${i+1}. ${tag.name} (${tag.color})`);
            });
        } else {
            console.log('   📝 Usa createTestTags() para crear ejemplos');
        }
    }
    
    // 5. Estado general
    const allOk = Object.values(elements).every(v => v) && Object.values(js).every(v => v) && Object.values(csp).every(v => v);
    console.log(`\n🎯 ESTADO FINAL: ${allOk ? '✅ FUNCIONANDO CORRECTAMENTE' : '❌ HAY PROBLEMAS'}`);
    
    if (allOk) {
        console.log('💡 ¡Las etiquetas están listas! Usa el botón "➕ Nueva Etiqueta" o createTestTags()');
    }
    
    return allOk;
};

// CREAR ETIQUETAS DE EJEMPLO
window.createTestTags = function() {
    console.log('🏷️ === CREANDO ETIQUETAS DE EJEMPLO ===');
    
    if (!window.whatsappCRM) {
        console.log('❌ whatsappCRM no disponible. Ejecuta forceInitCRM() primero');
        return false;
    }
    
    const currentTags = window.whatsappCRM.tags || [];
    console.log(`📊 Etiquetas existentes: ${currentTags.length}`);
    
    const sampleTags = [
        { 
            id: `tag_${Date.now()}_1`, 
            name: 'Cliente VIP', 
            color: '#FFD700', 
            description: 'Cliente de alto valor',
            createdAt: new Date().toISOString()
        },
        { 
            id: `tag_${Date.now()}_2`, 
            name: 'Prospecto', 
            color: '#3B82F6', 
            description: 'Potencial cliente',
            createdAt: new Date().toISOString()
        },
        { 
            id: `tag_${Date.now()}_3`, 
            name: 'Urgente', 
            color: '#EF4444', 
            description: 'Requiere atención inmediata',
            createdAt: new Date().toISOString()
        }
    ];
    
    // Evitar duplicados
    const existingNames = currentTags.map(tag => tag.name.toLowerCase());
    const newTags = sampleTags.filter(tag => !existingNames.includes(tag.name.toLowerCase()));
    
    if (newTags.length === 0) {
        console.log('⚠️ Las etiquetas de ejemplo ya existen');
        return true;
    }
    
    // Agregar nuevas etiquetas
    window.whatsappCRM.tags = [...currentTags, ...newTags];
    window.whatsappCRM.saveTags();
    window.whatsappCRM.loadTags();
    
    console.log(`✅ ${newTags.length} etiquetas nuevas creadas:`);
    newTags.forEach((tag, i) => {
        console.log(`   ${i+1}. ${tag.name} (${tag.color})`);
    });
    
    console.log(`📊 Total etiquetas ahora: ${window.whatsappCRM.tags.length}`);
    console.log('💡 Ve a la sección "🏷️ Etiquetas" para verlas');
    
    return true;
};

// Verificar inmediatamente si el DOM tiene el container del sidebar
setTimeout(() => {
    const sidebarContainer = document.getElementById('whatsapp-crm-sidebar');
    console.log('🎯 Container del sidebar después de cargar:', !!sidebarContainer);
    if (!sidebarContainer) {
        console.log('⚠️ AVISO: Container del sidebar no encontrado aún, esperando a content.js...');
    }
}, 100);

// PROBAR ABRIR MODAL DE ETIQUETAS
window.testTagModal = function() {
    console.log('🧪 Probando modal de etiquetas...');
    
    if (!window.whatsappCRM) {
        console.log('❌ whatsappCRM no disponible');
        return false;
    }
    
    try {
        window.whatsappCRM.openTagModal();
        
        setTimeout(() => {
            const modal = document.getElementById('tagModal');
            const isVisible = modal && modal.classList.contains('active');
            console.log(`${isVisible ? '✅' : '❌'} Modal ${isVisible ? 'abierto' : 'no visible'}`);
        }, 100);
        
        return true;
    } catch (error) {
        console.log('❌ Error:', error.message);
        return false;
    }
};

// SINCRONIZACIÓN MANUAL CON WHATSAPP
window.syncWithWhatsAppNow = function() {
    console.log('🔄 === SINCRONIZACIÓN MANUAL CON WHATSAPP ===');
    
    if (!window.whatsappCRM) {
        console.log('❌ whatsappCRM no disponible');
        return false;
    }
    
    console.log('📱 Iniciando sincronización...');
    window.whatsappCRM.syncWithWhatsApp();
    
    setTimeout(() => {
        const contactCount = window.whatsappCRM.contacts.length;
        console.log(`✅ Sincronización completada. Total contactos: ${contactCount}`);
        
        // Mostrar contactos sincronizados
        const syncedContacts = window.whatsappCRM.contacts.filter(c => c.whatsappSync);
        if (syncedContacts.length > 0) {
            console.log(`📱 Contactos sincronizados de WhatsApp (${syncedContacts.length}):`);
            syncedContacts.forEach((contact, i) => {
                console.log(`   ${i+1}. ${contact.name} - ${contact.phone} ${contact.hasUnread ? '🔴' : ''}`);
            });
        }
    }, 1000);
    
    return true;
};

// DETECTAR CHAT ACTUAL
window.detectCurrentChat = function() {
    console.log('👁️ === DETECTANDO CHAT ACTUAL ===');
    
    if (!window.whatsappCRM) {
        console.log('❌ whatsappCRM no disponible');
        return null;
    }
    
    const currentChat = window.whatsappCRM.getCurrentChatInfo();
    
    if (currentChat) {
        console.log(`✅ Chat actual: ${currentChat.name}`);
        console.log(`📞 Teléfono: ${currentChat.phone}`);
        
        // Buscar en nuestros contactos
        const contact = window.whatsappCRM.contacts.find(c => 
            c.name === currentChat.name || 
            c.phone === currentChat.phone ||
            c.phone === currentChat.name
        );
        
        if (contact) {
            console.log(`📋 Contacto en CRM: ${contact.name}`);
            console.log(`🏷️ Etiquetas: ${contact.tags?.length || 0}`);
            if (contact.tags?.length > 0) {
                contact.tags.forEach(tagId => {
                    const tag = window.whatsappCRM.tags.find(t => t.id === tagId);
                    if (tag) {
                        console.log(`   - ${tag.name} (${tag.color})`);
                    }
                });
            }
        } else {
            console.log('⚠️ Contacto no está en el CRM aún');
            console.log('💡 Se creará automáticamente al actualizar');
        }
        
        return currentChat;
    } else {
        console.log('❌ No hay chat activo o no se pudo detectar');
        return null;
    }
};

// ASIGNAR ETIQUETA AL CHAT ACTUAL
window.tagCurrentChat = function(tagName) {
    console.log(`🏷️ === ASIGNANDO ETIQUETA "${tagName}" AL CHAT ACTUAL ===`);
    
    if (!window.whatsappCRM) {
        console.log('❌ whatsappCRM no disponible');
        return false;
    }
    
    // Detectar chat actual
    const currentChat = window.whatsappCRM.getCurrentChatInfo();
    if (!currentChat) {
        console.log('❌ No hay chat actual');
        return false;
    }
    
    // Buscar etiqueta
    const tag = window.whatsappCRM.tags.find(t => 
        t.name.toLowerCase() === tagName.toLowerCase()
    );
    
    if (!tag) {
        console.log(`❌ Etiqueta "${tagName}" no encontrada`);
        console.log('🏷️ Etiquetas disponibles:');
        window.whatsappCRM.tags.forEach(t => {
            console.log(`   - ${t.name}`);
        });
        return false;
    }
    
    // Actualizar contacto actual
    window.whatsappCRM.updateCurrentContactInfo(currentChat);
    
    // Buscar contacto
    setTimeout(() => {
        const contact = window.whatsappCRM.contacts.find(c => 
            c.name === currentChat.name || 
            c.phone === currentChat.phone ||
            c.phone === currentChat.name
        );
        
        if (contact) {
            window.whatsappCRM.toggleContactTag(contact.id, tag.id);
            console.log(`✅ Etiqueta "${tag.name}" asignada a ${contact.name}`);
        } else {
            console.log('❌ Error: Contacto no encontrado');
        }
    }, 500);
    
    return true;
};

// LISTAR CONTACTOS CON ETIQUETAS
window.listContactsWithTags = function() {
    console.log('📋 === CONTACTOS CON ETIQUETAS ===');
    
    if (!window.whatsappCRM) {
        console.log('❌ whatsappCRM no disponible');
        return;
    }
    
    const contactsWithTags = window.whatsappCRM.contacts.filter(c => c.tags && c.tags.length > 0);
    
    if (contactsWithTags.length === 0) {
        console.log('⚠️ No hay contactos con etiquetas asignadas');
        return;
    }
    
    console.log(`📊 ${contactsWithTags.length} contactos con etiquetas:`);
    
    contactsWithTags.forEach((contact, i) => {
        const tagNames = contact.tags.map(tagId => {
            const tag = window.whatsappCRM.tags.find(t => t.id === tagId);
            return tag ? tag.name : 'Etiqueta eliminada';
        });
        
        console.log(`${i+1}. ${contact.name} (${contact.phone})`);
        console.log(`   🏷️ ${tagNames.join(', ')}`);
    });
};

console.log('🧪 === FUNCIONES DISPONIBLES ===');
console.log('');
console.log('🏷️ ETIQUETAS:');
console.log('   quickTestTags() - Test rápido de etiquetas');
console.log('   createTestTags() - Crear etiquetas de ejemplo');
console.log('   testTagModal() - Probar modal de etiquetas');
console.log('');
console.log('📱 SINCRONIZACIÓN:');
console.log('   syncWithWhatsAppNow() - Sincronizar contactos');
console.log('   detectCurrentChat() - Ver chat actual');
console.log('   tagCurrentChat("NombreEtiqueta") - Etiquetar chat actual');
console.log('   listContactsWithTags() - Ver contactos etiquetados');
console.log('');
console.log('💡 EJEMPLO DE USO:');
console.log('   1. createTestTags()');
console.log('   2. syncWithWhatsAppNow()');
console.log('   3. detectCurrentChat()');
console.log('   4. tagCurrentChat("Cliente VIP")'); 