-- =====================================================
-- 1. TABLAS DE USUARIOS Y PERFILES
-- =====================================================

-- Tabla de planes de suscripción
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  features JSONB NOT NULL DEFAULT '{}',
  limits JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de usuarios extendida
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'es',
  plan_id UUID REFERENCES subscription_plans(id),
  subscription_status TEXT DEFAULT 'inactive',
  subscription_start_date TIMESTAMP WITH TIME ZONE,
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  trial_end_date TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  usage_stats JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- =====================================================
-- 2. TABLAS DE CRM Y GESTIÓN DE CONTACTOS
-- =====================================================

-- Tabla de etiquetas
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  description TEXT,
  icon TEXT,
  category TEXT DEFAULT 'general',
  usage_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Tabla de plantillas
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  category TEXT DEFAULT 'general',
  language TEXT DEFAULT 'es',
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  tags TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de contactos
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_id TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  email TEXT,
  company TEXT,
  position TEXT,
  avatar_url TEXT,
  tags UUID[] DEFAULT '{}',
  notes TEXT,
  status TEXT DEFAULT 'active',
  priority TEXT DEFAULT 'normal',
  source TEXT DEFAULT 'whatsapp',
  last_contact TIMESTAMP WITH TIME ZONE,
  total_messages INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, whatsapp_id)
);
-- =====================================================
-- 3. TABLAS ADICIONALES
-- =====================================================

-- Tabla de conversaciones
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  assigned_to UUID REFERENCES auth.users(id),
  tags UUID[] DEFAULT '{}',
  notes TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  whatsapp_message_id TEXT,
  content TEXT,
  type TEXT DEFAULT 'text',
  direction TEXT DEFAULT 'inbound',
  status TEXT DEFAULT 'sent',
  media_url TEXT,
  media_type TEXT,
  media_size INTEGER,
  reply_to_message_id UUID REFERENCES messages(id),
  template_id UUID REFERENCES templates(id),
  tags UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Insertar planes de suscripción por defecto
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, features, limits, sort_order) VALUES
('free', 'Gratis', 'Plan básico para empezar', 0, 0, 
 '{"tags": true, "templates": true, "basic_analytics": true}', 
 '{"max_tags": 10, "max_templates": 5, "max_contacts": 100, "max_messages_per_month": 1000}', 1),
('pro', 'Profesional', 'Para equipos pequeños y profesionales', 19.99, 199.99, 
 '{"tags": true, "templates": true, "analytics": true, "automations": true, "integrations": true}', 
 '{"max_tags": 100, "max_templates": 50, "max_contacts": 1000, "max_messages_per_month": 10000, "max_automations": 10}', 2),
('business', 'Empresarial', 'Para empresas y equipos grandes', 49.99, 499.99, 
 '{"tags": true, "templates": true, "advanced_analytics": true, "automations": true, "integrations": true, "team_collaboration": true, "api_access": true}', 
 '{"max_tags": 500, "max_templates": 200, "max_contacts": 10000, "max_messages_per_month": 50000, "max_automations": 50}', 3),
('enterprise', 'Enterprise', 'Solución personalizada para grandes empresas', 99.99, 999.99, 
 '{"tags": true, "templates": true, "advanced_analytics": true, "automations": true, "integrations": true, "team_collaboration": true, "api_access": true, "custom_features": true, "priority_support": true}', 
 '{"max_tags": -1, "max_templates": -1, "max_contacts": -1, "max_messages_per_month": -1, "max_automations": -1}', 4)
ON CONFLICT (name) DO NOTHING;
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
-- =====================================================
-- ÍNDICES CORREGIDOS Y SEGUROS
-- =====================================================

-- Índices básicos que sabemos que funcionan
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);

-- Índices adicionales con verificación
DO $$
BEGIN
    -- Verificar si existe la columna whatsapp_id en contacts
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'contacts' AND column_name = 'whatsapp_id') THEN
        CREATE INDEX IF NOT EXISTS idx_contacts_whatsapp_id ON contacts(whatsapp_id);
    END IF;
    
    -- Verificar si existe la columna timestamp en messages
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'messages' AND column_name = 'timestamp') THEN
        CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
    END IF;
    
    -- Verificar si existe la columna category en tags
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'tags' AND column_name = 'category') THEN
        CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
    END IF;
    
    -- Verificar si existe la columna category en templates
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'templates' AND column_name = 'category') THEN
        CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
    END IF;
END $$;