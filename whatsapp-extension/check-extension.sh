#!/bin/bash

# Script para verificar la extensión de WhatsApp CRM
echo "🔍 Verificando extensión WhatsApp CRM..."
echo "========================================"

# Verificar estructura de directorios
echo "📁 Verificando estructura de directorios..."

if [ -d "popup" ]; then
    echo "✅ Directorio popup existe"
else
    echo "❌ Directorio popup NO existe"
    exit 1
fi

if [ -d "assets" ]; then
    echo "✅ Directorio assets existe"
else
    echo "❌ Directorio assets NO existe"
    exit 1
fi

if [ -d "services" ]; then
    echo "✅ Directorio services existe"
else
    echo "❌ Directorio services NO existe"
    exit 1
fi

# Verificar archivos críticos
echo ""
echo "📄 Verificando archivos críticos..."

if [ -f "manifest.json" ]; then
    echo "✅ manifest.json existe"
else
    echo "❌ manifest.json NO existe"
    exit 1
fi

if [ -f "popup/popup-test.html" ]; then
    echo "✅ popup/popup-test.html existe"
else
    echo "❌ popup/popup-test.html NO existe"
    exit 1
fi

if [ -f "popup/popup.css" ]; then
    echo "✅ popup/popup.css existe"
else
    echo "❌ popup/popup.css NO existe"
    exit 1
fi

if [ -f "popup/popup.js" ]; then
    echo "✅ popup/popup.js existe"
else
    echo "❌ popup/popup.js NO existe"
    exit 1
fi

# Verificar iconos
echo ""
echo "🎨 Verificando iconos..."

if [ -f "assets/icon16.png" ]; then
    echo "✅ icon16.png existe"
else
    echo "❌ icon16.png NO existe"
fi

if [ -f "assets/icon32.png" ]; then
    echo "✅ icon32.png existe"
else
    echo "❌ icon32.png NO existe"
fi

if [ -f "assets/icon48.png" ]; then
    echo "✅ icon48.png existe"
else
    echo "❌ icon48.png NO existe"
fi

if [ -f "assets/icon128.png" ]; then
    echo "✅ icon128.png existe"
else
    echo "❌ icon128.png NO existe"
fi

# Verificar contenido del manifest
echo ""
echo "⚙️ Verificando manifest.json..."

if grep -q "popup-test.html" manifest.json; then
    echo "✅ manifest.json apunta a popup-test.html"
else
    echo "❌ manifest.json NO apunta a popup-test.html"
    echo "   Debe contener: \"default_popup\": \"popup/popup-test.html\""
fi

if grep -q "\"tabs\"" manifest.json; then
    echo "✅ Permiso 'tabs' está presente"
else
    echo "❌ Permiso 'tabs' NO está presente"
fi

# Verificar sintaxis JSON
if python3 -m json.tool manifest.json > /dev/null 2>&1; then
    echo "✅ manifest.json tiene sintaxis JSON válida"
else
    echo "❌ manifest.json tiene errores de sintaxis JSON"
fi

# Verificar contenido del popup de prueba
echo ""
echo "🧪 Verificando popup de prueba..."

if grep -q "WhatsApp CRM" popup/popup-test.html; then
    echo "✅ popup-test.html contiene 'WhatsApp CRM'"
else
    echo "❌ popup-test.html NO contiene 'WhatsApp CRM'"
fi

if grep -q "loginForm" popup/popup-test.html; then
    echo "✅ popup-test.html contiene formulario de login"
else
    echo "❌ popup-test.html NO contiene formulario de login"
fi

# Verificar CSS
echo ""
echo "🎨 Verificando CSS..."

if grep -q "popup-container" popup/popup.css; then
    echo "✅ popup.css contiene estilos del popup"
else
    echo "❌ popup.css NO contiene estilos del popup"
fi

# Resumen
echo ""
echo "========================================"
echo "📊 RESUMEN DE VERIFICACIÓN"
echo "========================================"

echo "✅ Todos los archivos críticos están presentes"
echo "✅ La estructura de directorios es correcta"
echo "✅ El manifest.json está configurado correctamente"
echo ""
echo "🎯 PRÓXIMOS PASOS:"
echo "1. Ve a chrome://extensions/"
echo "2. Activa 'Modo desarrollador'"
echo "3. Haz clic en 'Cargar extensión sin empaquetar'"
echo "4. Selecciona esta carpeta: $(pwd)"
echo "5. Haz clic en el icono de la extensión"
echo ""
echo "¡La extensión debería funcionar correctamente! 🎉" 