/**
 * Script de prueba para WhatsApp CRM Extension
 * Ejecutar en la consola del desarrollador de WhatsApp Web
 */

function testWhatsAppCRMExtension() {
    console.log('🧪 === INICIANDO TESTS DE WHATSAPP CRM EXTENSION ===');
    
    const tests = {
        'Extension cargada': !!chrome?.runtime?.id,
        'Sidebar container existe': !!document.getElementById('whatsapp-crm-sidebar'),
        'CSS del sidebar cargado': !!document.querySelector('link[href*="sidebar.css"]'),
        'WhatsAppCRM class disponible': typeof WhatsAppCRM !== 'undefined',
        'whatsappCRM instance existe': !!window.whatsappCRM,
        'initWhatsAppCRM function disponible': typeof initWhatsAppCRM === 'function',
        'Nav items encontrados': document.querySelectorAll('.nav-item').length > 0,
        'Content sections encontradas': document.querySelectorAll('.content-section').length > 0,
        'Toggle button existe': !!document.getElementById('sidebarToggle'),
        'Add tag button existe': !!document.getElementById('addTagBtn'),
        'Tags container existe': !!document.getElementById('tagsContainer'),
        'Templates container existe': !!document.getElementById('templatesContainer')
    };
    
    console.log('📋 Resultados de los tests:');
    Object.entries(tests).forEach(([test, result]) => {
        console.log(result ? `✅ ${test}` : `❌ ${test}`);
    });
    
    // Test adicional de funcionalidad
    console.log('\n🔧 Tests de funcionalidad:');
    
    try {
        if (window.whatsappCRM) {
            const debugInfo = window.whatsappCRM.getDebugInfo?.();
            if (debugInfo) {
                console.log('✅ getDebugInfo funciona:', debugInfo);
            } else {
                console.log('⚠️ getDebugInfo no disponible');
            }
        }
    } catch (error) {
        console.log('❌ Error en test de funcionalidad:', error);
    }
    
    // Contar elementos críticos
    const counts = {
        'Nav items': document.querySelectorAll('.nav-item').length,
        'Content sections': document.querySelectorAll('.content-section').length,
        'Buttons': document.querySelectorAll('button[id*="btn"], button[id*="Btn"]').length,
        'Modals': document.querySelectorAll('[id*="Modal"], [id*="modal"]').length
    };
    
    console.log('\n📊 Conteo de elementos:');
    Object.entries(counts).forEach(([element, count]) => {
        console.log(`- ${element}: ${count}`);
    });
    
    // Test detallado de elementos críticos
    console.log('\n🔍 Test detallado de elementos críticos:');
    let criticalElementsResult = null;
    try {
        if (typeof testCriticalElements === 'function') {
            criticalElementsResult = testCriticalElements();
        } else {
            console.log('⚠️ testCriticalElements function no disponible');
        }
    } catch (error) {
        console.error('❌ Error en test de elementos críticos:', error);
    }
    
    console.log('\n🎯 === TESTS COMPLETADOS ===');
    
    return {
        tests,
        counts,
        criticalElements: criticalElementsResult,
        overallStatus: Object.values(tests).every(result => result) ? 'SUCCESS' : 'ISSUES_FOUND'
    };
}

// Función para reinicializar manualmente
function forceInitCRM() {
    console.log('🔄 Forzando reinicialización de CRM...');
    if (typeof initWhatsAppCRM === 'function') {
        initWhatsAppCRM();
    } else {
        console.log('❌ initWhatsAppCRM no disponible');
    }
}

// Función de diagnóstico rápido
function quickDiagnosis() {
    console.log('🩺 === DIAGNÓSTICO RÁPIDO ===');
    
    // Verificar container principal
    const mainContainer = document.getElementById('whatsapp-crm-sidebar');
    console.log('🏠 Container principal:', mainContainer ? '✅ Existe' : '❌ No existe');
    
    if (!mainContainer) {
        console.log('💡 El HTML del sidebar no ha sido inyectado por content.js');
        console.log('🔧 Soluciones:');
        console.log('   1. Esperar unos segundos más');
        console.log('   2. Recargar la página');
        console.log('   3. Verificar que la extensión esté habilitada');
        return { status: 'HTML_NOT_INJECTED' };
    }
    
    // Verificar elementos críticos
    const criticalElements = ['sidebarToggle', 'addTagBtn', 'tagsContainer', 'addTemplateBtn', 'templatesContainer'];
    const missingElements = criticalElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
        console.log('❌ Elementos faltantes:', missingElements);
        console.log('🔧 Esto indica que el HTML está incompleto');
        return { status: 'INCOMPLETE_HTML', missing: missingElements };
    }
    
    // Verificar JavaScript
    const jsStatus = {
        'WhatsAppCRM class': typeof WhatsAppCRM !== 'undefined',
        'whatsappCRM instance': !!window.whatsappCRM,
        'initWhatsAppCRM function': typeof initWhatsAppCRM === 'function'
    };
    
    console.log('📜 Estado JavaScript:');
    Object.entries(jsStatus).forEach(([test, result]) => {
        console.log(`${result ? '✅' : '❌'} ${test}`);
    });
    
    if (!Object.values(jsStatus).every(result => result)) {
        console.log('🔧 Ejecutar: forceInitCRM()');
        return { status: 'JS_NOT_READY' };
    }
    
    console.log('🎉 Todo está listo!');
    return { status: 'ALL_GOOD' };
}

// Hacer disponibles globalmente
window.testWhatsAppCRMExtension = testWhatsAppCRMExtension;
window.forceInitCRM = forceInitCRM;
window.quickDiagnosis = quickDiagnosis;

console.log('🧪 Test script cargado. Funciones disponibles:');
console.log('   - testWhatsAppCRMExtension() - Test completo');
console.log('   - forceInitCRM() - Forzar inicialización');
console.log('   - quickDiagnosis() - Diagnóstico rápido'); 