-- =====================================================
-- WHATSAPP CRM EXTENSION - ESQUEMA CORREGIDO
-- Versión simplificada y corregida para evitar errores
-- =====================================================

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
-- 3. TABLAS DE AUTOMATIZACIÓN
-- =====================================================

-- Tabla de automatizaciones
CREATE TABLE IF NOT EXISTS automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  last_executed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de ejecuciones de automatización
CREATE TABLE IF NOT EXISTS automation_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID REFERENCES automations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  result JSONB,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. TABLAS DE ANALYTICS
-- =====================================================

-- Tabla de métricas diarias
CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Tabla de eventos de usuario
CREATE TABLE IF NOT EXISTS user_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. TABLAS DE PAGOS
-- =====================================================

-- Tabla de transacciones de pago
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL,
  payment_method TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de facturas
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. TABLAS DE CONFIGURACIÓN
-- =====================================================

-- Tabla de configuraciones de usuario
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, setting_key)
);

-- Tabla de integraciones
CREATE TABLE IF NOT EXISTS integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. TABLA DE AUDITORÍA
-- =====================================================

-- Tabla de logs de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. ÍNDICES
-- =====================================================

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_contacts_user_whatsapp ON contacts(user_id, whatsapp_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_contact ON messages(user_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_tags_user_category ON tags(user_id, category);
CREATE INDEX IF NOT EXISTS idx_templates_user_category ON templates(user_id, category);
CREATE INDEX IF NOT EXISTS idx_user_events_user_type ON user_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_user_date ON daily_metrics(user_id, date);

-- =====================================================
-- 9. POLÍTICAS DE SEGURIDAD RLS
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para subscription_plans (lectura pública)
CREATE POLICY "Anyone can view active subscription plans" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- Políticas para user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para todas las tablas de usuario
CREATE POLICY "Users can manage own data" ON tags
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own data" ON templates
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own data" ON contacts
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own data" ON conversations
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own data" ON messages
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own data" ON automations
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own data" ON automation_executions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own data" ON daily_metrics
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own data" ON user_events
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own data" ON payment_transactions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own data" ON invoices
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own data" ON user_settings
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own data" ON integrations
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own data" ON audit_logs
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 10. FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automations_updated_at BEFORE UPDATE ON automations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. DATOS INICIALES
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