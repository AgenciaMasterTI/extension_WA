-- ============================================================================
-- SUPABASE SCHEMA FOR WHATSAPP CRM EXTENSION
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE (extends auth.users)
-- ============================================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'expired')),
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  preferences JSONB DEFAULT '{}',
  usage_stats JSONB DEFAULT '{}'
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- TAGS TABLE
-- ============================================================================
CREATE TABLE public.tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  description TEXT DEFAULT '',
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_tag_name_per_user UNIQUE(user_id, name)
);

-- Enable RLS on tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Tags policies
CREATE POLICY "Users can view own tags"
  ON public.tags
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags"
  ON public.tags
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags"
  ON public.tags
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags"
  ON public.tags
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TEMPLATES TABLE
-- ============================================================================
CREATE TABLE public.templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  variables TEXT[] DEFAULT ARRAY[]::TEXT[],
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT unique_template_name_per_user UNIQUE(user_id, name)
);

-- Enable RLS on templates
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Templates policies
CREATE POLICY "Users can view own templates"
  ON public.templates
  FOR SELECT
  USING (auth.uid() = user_id OR is_shared = true);

CREATE POLICY "Users can insert own templates"
  ON public.templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON public.templates
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON public.templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- CHAT_TAGS TABLE (Many-to-Many relationship)
-- ============================================================================
CREATE TABLE public.chat_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  chat_name TEXT NOT NULL,
  chat_phone TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_chat_tag_assignment UNIQUE(user_id, tag_id, chat_name)
);

-- Enable RLS on chat_tags
ALTER TABLE public.chat_tags ENABLE ROW LEVEL SECURITY;

-- Chat tags policies
CREATE POLICY "Users can view own chat tags"
  ON public.chat_tags
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat tags"
  ON public.chat_tags
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat tags"
  ON public.chat_tags
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- ANALYTICS TABLE
-- ============================================================================
CREATE TABLE public.analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- 'template_used', 'tag_assigned', 'chat_opened', etc.
  event_data JSONB DEFAULT '{}',
  chat_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on analytics
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- Analytics policies
CREATE POLICY "Users can view own analytics"
  ON public.analytics
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics"
  ON public.analytics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated_at triggers
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to increment tag usage
CREATE OR REPLACE FUNCTION public.increment_tag_usage(tag_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.tags 
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = tag_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment template usage
CREATE OR REPLACE FUNCTION public.increment_template_usage(template_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.templates 
  SET usage_count = usage_count + 1,
      last_used_at = NOW(),
      updated_at = NOW()
  WHERE id = template_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- Daily usage stats view
CREATE VIEW public.daily_usage_stats AS
SELECT 
  user_id,
  DATE(created_at) as date,
  event_type,
  COUNT(*) as count
FROM public.analytics
GROUP BY user_id, DATE(created_at), event_type
ORDER BY date DESC;

-- Template usage ranking view  
CREATE VIEW public.template_usage_ranking AS
SELECT 
  t.id,
  t.name,
  t.category,
  t.usage_count,
  t.last_used_at,
  p.email as user_email
FROM public.templates t
JOIN public.profiles p ON t.user_id = p.id
WHERE t.is_active = true
ORDER BY t.usage_count DESC;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Tags indexes
CREATE INDEX idx_tags_user_id ON public.tags(user_id);
CREATE INDEX idx_tags_name ON public.tags(name);
CREATE INDEX idx_tags_usage_count ON public.tags(usage_count DESC);

-- Templates indexes
CREATE INDEX idx_templates_user_id ON public.templates(user_id);
CREATE INDEX idx_templates_category ON public.templates(category);
CREATE INDEX idx_templates_usage_count ON public.templates(usage_count DESC);
CREATE INDEX idx_templates_last_used ON public.templates(last_used_at DESC);

-- Chat tags indexes
CREATE INDEX idx_chat_tags_user_id ON public.chat_tags(user_id);
CREATE INDEX idx_chat_tags_tag_id ON public.chat_tags(tag_id);
CREATE INDEX idx_chat_tags_chat_name ON public.chat_tags(chat_name);

-- Analytics indexes
CREATE INDEX idx_analytics_user_event ON public.analytics(user_id, event_type);
CREATE INDEX idx_analytics_created_at ON public.analytics(created_at DESC);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Las plantillas compartidas se pueden crear después con un usuario administrador
-- Por ahora dejamos las tablas vacías para evitar problemas con user_id NULL

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================

-- 1. RLS is enabled on all tables
-- 2. Users can only access their own data
-- 3. Shared templates are visible to everyone
-- 4. Analytics are private per user
-- 5. All foreign key constraints are properly set
-- 6. Indexes are created for performance
-- 7. Triggers handle automated tasks (updated_at, user creation) 