#!/bin/bash

echo "⚡ PRUEBA RÁPIDA - POPUP MÍNIMO"
echo "================================"

# Verificar archivo mínimo
if [ -f "popup/minimal.html" ]; then
    echo "✅ popup/minimal.html existe"
    echo "Contenido:"
    cat popup/minimal.html
else
    echo "❌ popup/minimal.html NO existe"
    exit 1
fi

echo ""
echo "🔧 VERIFICANDO MANIFEST:"
if grep -q "minimal.html" manifest.json; then
    echo "✅ manifest.json apunta a minimal.html"
else
    echo "❌ manifest.json NO apunta a minimal.html"
fi

echo ""
echo "🎯 INSTRUCCIONES RÁPIDAS:"
echo "1. Ve a chrome://extensions/"
echo "2. Busca 'WhatsApp Web CRM Extension'"
echo "3. Haz clic en 'ELIMINAR' si existe"
echo "4. Haz clic en 'Cargar extensión sin empaquetar'"
echo "5. Selecciona: $(pwd)"
echo "6. Haz clic en el icono de la extensión"
echo "7. Deberías ver: 'WhatsApp CRM' y un botón 'Test'"

echo ""
read -p "¿Abrir Chrome? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    google-chrome chrome://extensions/ &
    echo "✅ Chrome abierto"
fi

echo ""
echo "🔍 SI NO FUNCIONA:"
echo "1. Verifica errores en chrome://extensions/"
echo "2. Comparte captura de pantalla"
echo "3. Verifica que el icono aparezca en la barra" 