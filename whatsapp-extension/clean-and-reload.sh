#!/bin/bash

# Script para limpiar y recargar la extensión de WhatsApp CRM
echo "🧹 Limpieza y recarga de extensión WhatsApp CRM"
echo "================================================"

# Verificar que estamos en el directorio correcto
if [ ! -f "manifest.json" ]; then
    echo "❌ Error: No estás en el directorio de la extensión"
    echo "   Ejecuta este script desde la carpeta whatsapp-extension"
    exit 1
fi

echo "✅ Directorio correcto detectado"

# Verificar que Chrome esté instalado
if ! command -v google-chrome &> /dev/null && ! command -v chromium-browser &> /dev/null; then
    echo "❌ Error: Chrome no está instalado o no está en el PATH"
    echo "   Instala Chrome o asegúrate de que esté disponible"
    exit 1
fi

echo "✅ Chrome detectado"

# Mostrar instrucciones paso a paso
echo ""
echo "📋 INSTRUCCIONES PASO A PASO:"
echo "=============================="
echo ""
echo "1️⃣ DESINSTALAR EXTENSIÓN ACTUAL:"
echo "   • Ve a chrome://extensions/"
echo "   • Busca 'WhatsApp Web CRM Extension'"
echo "   • Haz clic en 'ELIMINAR' (no solo desactivar)"
echo "   • Confirma la eliminación"
echo ""
echo "2️⃣ LIMPIAR CACHE DE CHROME:"
echo "   • Ve a chrome://settings/clearBrowserData"
echo "   • Selecciona:"
echo "     ✅ Historial de navegación"
echo "     ✅ Cookies y otros datos de sitios"
echo "     ✅ Imágenes y archivos en caché"
echo "   • Haz clic en 'Borrar datos'"
echo ""
echo "3️⃣ REINICIAR CHROME:"
echo "   • Cierra completamente Chrome"
echo "   • Abre Chrome nuevamente"
echo ""
echo "4️⃣ CARGAR EXTENSIÓN:"
echo "   • Ve a chrome://extensions/"
echo "   • Activa 'Modo desarrollador' (esquina superior derecha)"
echo "   • Haz clic en 'Cargar extensión sin empaquetar'"
echo "   • Selecciona esta carpeta: $(pwd)"
echo "   • Haz clic en 'Seleccionar carpeta'"
echo ""
echo "5️⃣ VERIFICAR FUNCIONAMIENTO:"
echo "   • Busca el icono de la extensión en la barra de herramientas"
echo "   • Si no aparece, haz clic en el icono de extensiones (puzzle piece)"
echo "   • Busca 'WhatsApp CRM' y haz clic en el pin"
echo "   • Haz clic en el icono de la extensión"
echo "   • Deberías ver el popup con formulario de login"
echo ""

# Preguntar si quiere abrir Chrome automáticamente
read -p "¿Quieres que abra Chrome automáticamente? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Abriendo Chrome..."
    if command -v google-chrome &> /dev/null; then
        google-chrome chrome://extensions/ &
    elif command -v chromium-browser &> /dev/null; then
        chromium-browser chrome://extensions/ &
    fi
    echo "✅ Chrome abierto en chrome://extensions/"
    echo "   Sigue los pasos 1-5 arriba"
fi

echo ""
echo "🎯 VERIFICACIÓN FINAL:"
echo "======================"
echo ""
echo "Después de seguir todos los pasos, deberías ver:"
echo "✅ Extensión 'WhatsApp Web CRM Extension' en la lista"
echo "✅ Estado 'Activa' (sin errores en rojo)"
echo "✅ Icono visible en la barra de herramientas"
echo "✅ Popup se abre al hacer clic"
echo "✅ Formulario de login visible"
echo "✅ Botón 'Usar sin cuenta' funciona"
echo ""
echo "🔧 SI AÚN NO FUNCIONA:"
echo "======================"
echo "1. Verifica errores en chrome://extensions/"
echo "2. Revisa la consola del popup (clic derecho → Inspeccionar)"
echo "3. Prueba en modo incógnito"
echo "4. Verifica que Chrome esté actualizado"
echo ""
echo "📞 SOPORTE:"
echo "==========="
echo "Si tienes problemas, comparte:"
echo "• Captura de pantalla de chrome://extensions/"
echo "• Errores en la consola del popup"
echo "• Versión de Chrome (chrome://version/)"
echo ""
echo "¡La limpieza completa debería resolver el problema! 🎉" 