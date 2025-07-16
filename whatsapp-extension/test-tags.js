/**
 * Test específico para funcionalidad de Etiquetas
 * Ejecutar en la consola de WhatsApp Web
 */

function testTagsFunctionality() {
    console.log('🏷️ === TEST DE FUNCIONALIDAD DE ETIQUETAS ===');
    
    const results = {
        htmlElements: {},
        jsClasses: {},
        data: {},
        functions: {},
        events: {}
    };
    
    // 1. Test de elementos HTML
    console.log('\n📋 1. Verificando elementos HTML...');
    const htmlElements = {
        'addTagBtn': document.getElementById('addTagBtn'),
        'tagsContainer': document.getElementById('tagsContainer'),
        'tagModal': document.getElementById('tagModal'),
        'tagName': document.getElementById('tagName'),
        'tagColor': document.getElementById('tagColor'),
        'tagDescription': document.getElementById('tagDescription'),
        'saveTagBtn': document.getElementById('saveTagBtn'),
        'closeTagModal': document.getElementById('closeTagModal'),
        'cancelTagBtn': document.getElementById('cancelTagBtn')
    };
    
    Object.entries(htmlElements).forEach(([name, element]) => {
        const exists = !!element;
        results.htmlElements[name] = exists;
        console.log(`${exists ? '✅' : '❌'} ${name}: ${exists ? 'Encontrado' : 'No encontrado'}`);
    });
    
    // 2. Test de clases JavaScript
    console.log('\n📜 2. Verificando clases JavaScript...');
    const jsChecks = {
        'WhatsAppCRM class': typeof WhatsAppCRM !== 'undefined',
        'whatsappCRM instance': !!window.whatsappCRM,
        'tags array exists': !!(window.whatsappCRM?.tags),
        'tags is array': Array.isArray(window.whatsappCRM?.tags)
    };
    
    Object.entries(jsChecks).forEach(([test, result]) => {
        results.jsClasses[test] = result;
        console.log(`${result ? '✅' : '❌'} ${test}`);
    });
    
    // 3. Test de datos de etiquetas
    console.log('\n💾 3. Verificando datos de etiquetas...');
    if (window.whatsappCRM) {
        const tagsData = window.whatsappCRM.tags || [];
        results.data = {
            tagsCount: tagsData.length,
            sampleTags: tagsData.slice(0, 3),
            localStorageExists: !!localStorage.getItem('whatsapp_crm_tags')
        };
        
        console.log(`📊 Número de etiquetas: ${tagsData.length}`);
        console.log(`💾 LocalStorage existe: ${results.data.localStorageExists ? 'Sí' : 'No'}`);
        
        if (tagsData.length > 0) {
            console.log('🏷️ Etiquetas existentes:');
            tagsData.forEach((tag, index) => {
                console.log(`   ${index + 1}. ${tag.name} (${tag.color})`);
            });
        } else {
            console.log('⚠️ No hay etiquetas creadas aún');
        }
    }
    
    // 4. Test de funciones
    console.log('\n🔧 4. Verificando funciones...');
    if (window.whatsappCRM) {
        const functions = {
            'openTagModal': typeof window.whatsappCRM.openTagModal === 'function',
            'saveTag': typeof window.whatsappCRM.saveTag === 'function',
            'loadTags': typeof window.whatsappCRM.loadTags === 'function',
            'renderTags': typeof window.whatsappCRM.renderTags === 'function',
            'deleteTag': typeof window.whatsappCRM.deleteTag === 'function',
            'editTag': typeof window.whatsappCRM.editTag === 'function'
        };
        
        Object.entries(functions).forEach(([func, exists]) => {
            results.functions[func] = exists;
            console.log(`${exists ? '✅' : '❌'} ${func}: ${exists ? 'Disponible' : 'No disponible'}`);
        });
    }
    
    // 5. Test de eventos (simulado)
    console.log('\n🎯 5. Test de eventos...');
    const addTagBtn = document.getElementById('addTagBtn');
    if (addTagBtn) {
        // Verificar si tiene event listeners
        const hasEventListeners = getEventListeners ? 
            Object.keys(getEventListeners(addTagBtn)).length > 0 : 
            'No se puede verificar (getEventListeners no disponible)';
        
        results.events.addTagBtnHasListeners = hasEventListeners;
        console.log(`🖱️ Botón "Nueva Etiqueta" tiene eventos: ${hasEventListeners}`);
    }
    
    // 6. Resumen final
    console.log('\n📊 === RESUMEN ===');
    const htmlOk = Object.values(results.htmlElements).every(v => v);
    const jsOk = Object.values(results.jsClasses).every(v => v);
    const functionsOk = Object.values(results.functions).every(v => v);
    
    console.log(`📋 HTML Elements: ${htmlOk ? '✅ OK' : '❌ Problemas'}`);
    console.log(`📜 JavaScript: ${jsOk ? '✅ OK' : '❌ Problemas'}`);
    console.log(`🔧 Functions: ${functionsOk ? '✅ OK' : '❌ Problemas'}`);
    console.log(`💾 Data: ${results.data.tagsCount || 0} etiquetas`);
    
    const overallStatus = htmlOk && jsOk && functionsOk ? 'FUNCIONANDO' : 'PROBLEMAS';
    console.log(`\n🎯 ESTADO GENERAL: ${overallStatus}`);
    
    return {
        status: overallStatus,
        details: results,
        recommendations: generateTagsRecommendations(results)
    };
}

function generateTagsRecommendations(results) {
    const recommendations = [];
    
    // Verificar problemas HTML
    const missingHtml = Object.entries(results.htmlElements)
        .filter(([_, exists]) => !exists)
        .map(([name, _]) => name);
    
    if (missingHtml.length > 0) {
        recommendations.push(`🔧 Elementos HTML faltantes: ${missingHtml.join(', ')}`);
        recommendations.push('   Solución: Ejecutar quickDiagnosis() para verificar inyección HTML');
    }
    
    // Verificar problemas JS
    if (!results.jsClasses['whatsappCRM instance']) {
        recommendations.push('🔧 Instancia de WhatsAppCRM no disponible');
        recommendations.push('   Solución: Ejecutar forceInitCRM()');
    }
    
    // Verificar datos
    if (results.data.tagsCount === 0) {
        recommendations.push('💡 No hay etiquetas creadas');
        recommendations.push('   Sugerencia: Crear etiquetas de ejemplo con createSampleTags()');
    }
    
    if (recommendations.length === 0) {
        recommendations.push('🎉 ¡Todo está funcionando correctamente!');
    }
    
    return recommendations;
}

// Función para crear etiquetas de ejemplo
function createSampleTags() {
    console.log('🏷️ Creando etiquetas de ejemplo...');
    
    if (!window.whatsappCRM) {
        console.log('❌ WhatsAppCRM no disponible. Ejecutar forceInitCRM() primero');
        return;
    }
    
    const sampleTags = [
        {
            id: 'tag_' + Date.now() + '_1',
            name: 'Cliente VIP',
            color: '#FFD700',
            description: 'Cliente de alto valor',
            createdAt: new Date().toISOString()
        },
        {
            id: 'tag_' + Date.now() + '_2',
            name: 'Prospecto',
            color: '#3B82F6',
            description: 'Potencial cliente',
            createdAt: new Date().toISOString()
        },
        {
            id: 'tag_' + Date.now() + '_3',
            name: 'Urgente',
            color: '#EF4444',
            description: 'Requiere atención inmediata',
            createdAt: new Date().toISOString()
        }
    ];
    
    // Agregar a la instancia de CRM
    window.whatsappCRM.tags = [...(window.whatsappCRM.tags || []), ...sampleTags];
    
    // Guardar en localStorage
    window.whatsappCRM.saveTags();
    
    // Recargar vista
    window.whatsappCRM.loadTags();
    
    console.log(`✅ ${sampleTags.length} etiquetas de ejemplo creadas`);
}

// Función para probar abrir modal de etiquetas
function testOpenTagModal() {
    console.log('🧪 Probando abrir modal de etiquetas...');
    
    if (!window.whatsappCRM) {
        console.log('❌ WhatsAppCRM no disponible');
        return;
    }
    
    try {
        window.whatsappCRM.openTagModal();
        console.log('✅ Modal de etiquetas abierto');
        
        // Verificar que el modal está visible
        const modal = document.getElementById('tagModal');
        if (modal && modal.classList.contains('active')) {
            console.log('✅ Modal está visible');
        } else {
            console.log('⚠️ Modal no está visible (verificar CSS)');
        }
        
    } catch (error) {
        console.log('❌ Error abriendo modal:', error);
    }
}

// Hacer funciones disponibles globalmente
window.testTagsFunctionality = testTagsFunctionality;
window.createSampleTags = createSampleTags;
window.testOpenTagModal = testOpenTagModal;

console.log('🏷️ Test de etiquetas cargado. Funciones disponibles:');
console.log('   - testTagsFunctionality() - Test completo');
console.log('   - createSampleTags() - Crear etiquetas de ejemplo');
console.log('   - testOpenTagModal() - Probar modal de etiquetas'); 