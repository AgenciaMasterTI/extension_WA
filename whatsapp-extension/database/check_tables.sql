-- =====================================================
-- SCRIPT PARA VERIFICAR TABLAS Y COLUMNAS
-- =====================================================

-- Verificar qué tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('subscription_plans', 'user_profiles', 'tags', 'templates', 'contacts', 'conversations', 'messages')
ORDER BY table_name;

-- Verificar columnas de la tabla messages
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar columnas de la tabla contacts
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'contacts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar columnas de la tabla conversations
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'conversations' 
AND table_schema = 'public'
ORDER BY ordinal_position; 