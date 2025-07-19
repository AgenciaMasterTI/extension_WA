#!/bin/bash

echo "🔍 DIAGNÓSTICO COMPLETO DE LA EXTENSIÓN"
echo "========================================"

# Verificar sistema
echo "📋 INFORMACIÓN DEL SISTEMA:"
echo "Sistema operativo: $(uname -s)"
echo "Versión: $(uname -r)"
echo "Usuario: $(whoami)"
echo "Directorio actual: $(pwd)"
echo ""

# Verificar Chrome
echo "🌐 VERIFICANDO CHROME:"
if command -v google-chrome &> /dev/null; then
    echo "✅ Google Chrome instalado: $(google-chrome --version)"
elif command -v chromium-browser &> /dev/null; then
    echo "✅ Chromium instalado: $(chromium-browser --version)"
else
    echo "❌ Chrome/Chromium no encontrado"
fi
echo ""

# Verificar archivos críticos
echo "📄 VERIFICANDO ARCHIVOS CRÍTICOS:"
files=("manifest.json" "popup/simple-test.html" "popup/popup.css" "assets/icon16.png" "assets/icon32.png" "assets/icon48.png" "assets/icon128.png")

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file existe"
    else
        echo "❌ $file NO existe"
    fi
done
echo ""

# Verificar sintaxis JSON
echo "🔧 VERIFICANDO MANIFEST.JSON:"
if python3 -m json.tool manifest.json > /dev/null 2>&1; then
    echo "✅ Sintaxis JSON válida"
else
    echo "❌ Error en sintaxis JSON"
    echo "Contenido del manifest:"
    cat manifest.json
fi
echo ""

# Verificar permisos
echo "🔐 VERIFICANDO PERMISOS:"
if [ -r "manifest.json" ]; then
    echo "✅ manifest.json es legible"
else
    echo "❌ manifest.json no es legible"
fi

if [ -r "popup/simple-test.html" ]; then
    echo "✅ simple-test.html es legible"
else
    echo "❌ simple-test.html no es legible"
fi
echo ""

# Verificar contenido del popup simple
echo "🧪 VERIFICANDO POPUP SIMPLE:"
if grep -q "WhatsApp CRM" popup/simple-test.html; then
    echo "✅ Contiene 'WhatsApp CRM'"
else
    echo "❌ NO contiene 'WhatsApp CRM'"
fi

if grep -q "console.log" popup/simple-test.html; then
    echo "✅ Contiene JavaScript"
else
    echo "❌ NO contiene JavaScript"
fi
echo ""

# Verificar iconos
echo "🎨 VERIFICANDO ICONOS:"
icon_sizes=(16 32 48 128)
for size in "${icon_sizes[@]}"; do
    if [ -f "assets/icon${size}.png" ]; then
        file_size=$(stat -c%s "assets/icon${size}.png")
        echo "✅ icon${size}.png existe (${file_size} bytes)"
    else
        echo "❌ icon${size}.png NO existe"
    fi
done
echo ""

# Verificar estructura de directorios
echo "📁 VERIFICANDO ESTRUCTURA:"
directories=("popup" "assets" "services" "config" "database")
for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir/ existe"
    else
        echo "❌ $dir/ NO existe"
    fi
done
echo ""

# Verificar que estamos en el directorio correcto
echo "📍 VERIFICANDO UBICACIÓN:"
if [[ $(pwd) == *"whatsapp-extension" ]]; then
    echo "✅ Estamos en el directorio correcto"
else
    echo "❌ NO estamos en el directorio correcto"
    echo "   Deberías estar en: .../whatsapp-extension"
fi
echo ""

# Mostrar instrucciones específicas
echo "🎯 INSTRUCCIONES ESPECÍFICAS:"
echo "=============================="
echo ""
echo "1. Ve a chrome://extensions/"
echo "2. Activa 'Modo desarrollador'"
echo "3. Si ya tienes la extensión instalada:"
echo "   • Haz clic en 'ELIMINAR' (no solo desactivar)"
echo "   • Confirma la eliminación"
echo "4. Haz clic en 'Cargar extensión sin empaquetar'"
echo "5. Selecciona esta carpeta: $(pwd)"
echo "6. Haz clic en 'Seleccionar carpeta'"
echo ""
echo "7. Busca el icono de la extensión"
echo "8. Haz clic en el icono"
echo "9. Deberías ver un popup simple con:"
echo "   • Header verde con 'WhatsApp CRM'"
echo "   • Texto '¡El popup funciona!'"
echo "   • Botón 'Probar Botón'"
echo ""

# Preguntar si quiere abrir Chrome
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
fi

echo ""
echo "🔧 SI AÚN NO FUNCIONA:"
echo "======================"
echo "1. Verifica errores en chrome://extensions/"
echo "2. Revisa la consola del popup (clic derecho → Inspeccionar)"
echo "3. Comparte cualquier error que veas"
echo "4. Verifica que Chrome esté actualizado"
echo ""
echo "📞 PARA SOPORTE, COMPARTE:"
echo "=========================="
echo "• La salida completa de este script"
echo "• Captura de pantalla de chrome://extensions/"
echo "• Errores en la consola del popup"
echo "• Versión de Chrome (chrome://version/)" 