-- Training Academy Tables for Commercial Team

-- Training materials/library table
CREATE TABLE public.training_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  material_type TEXT NOT NULL,
  file_url TEXT,
  external_url TEXT,
  thumbnail_url TEXT,
  duration_minutes INTEGER,
  difficulty_level TEXT DEFAULT 'beginner',
  xp_reward INTEGER DEFAULT 10,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- User progress on materials
CREATE TABLE public.training_material_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.training_materials(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  progress_percent INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, material_id)
);

-- Quiz/assessments table
CREATE TABLE public.training_quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  difficulty_level TEXT DEFAULT 'beginner',
  time_limit_minutes INTEGER,
  passing_score INTEGER DEFAULT 70,
  xp_reward INTEGER DEFAULT 50,
  max_attempts INTEGER,
  questions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Quiz attempts and scores
CREATE TABLE public.training_quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.training_quizzes(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '[]',
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  time_taken_seconds INTEGER,
  xp_earned INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Simulation scenarios
CREATE TABLE public.training_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  scenario_type TEXT NOT NULL,
  difficulty_level TEXT DEFAULT 'beginner',
  context JSONB NOT NULL,
  xp_reward INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Simulation attempts with AI evaluation
CREATE TABLE public.training_simulation_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  simulation_id UUID NOT NULL REFERENCES public.training_simulations(id) ON DELETE CASCADE,
  conversation JSONB NOT NULL DEFAULT '[]',
  ai_feedback JSONB,
  score INTEGER,
  xp_earned INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Onboarding tracks/paths
CREATE TABLE public.training_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  target_role TEXT,
  total_xp INTEGER DEFAULT 0,
  badge_name TEXT,
  badge_icon TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User track progress
CREATE TABLE public.training_track_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.training_tracks(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0,
  completed_steps JSONB DEFAULT '[]',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  certificate_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id)
);

-- User XP and level tracking
CREATE TABLE public.training_user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  materials_completed INTEGER DEFAULT 0,
  quizzes_passed INTEGER DEFAULT 0,
  simulations_completed INTEGER DEFAULT 0,
  tracks_completed INTEGER DEFAULT 0,
  current_streak_days INTEGER DEFAULT 0,
  best_streak_days INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  badges JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- XP history for analytics
CREATE TABLE public.training_xp_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_amount INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.training_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_material_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_simulation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_track_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_xp_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_materials
CREATE POLICY "Anyone can view active materials" ON public.training_materials
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage materials" ON public.training_materials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- RLS Policies for user progress tables
CREATE POLICY "Users can view own material progress" ON public.training_material_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own material progress" ON public.training_material_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active quizzes" ON public.training_quizzes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage quizzes" ON public.training_quizzes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can view own quiz attempts" ON public.training_quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz attempts" ON public.training_quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view active simulations" ON public.training_simulations
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage simulations" ON public.training_simulations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can view own simulation attempts" ON public.training_simulation_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own simulation attempts" ON public.training_simulation_attempts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active tracks" ON public.training_tracks
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage tracks" ON public.training_tracks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can view own track progress" ON public.training_track_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own track progress" ON public.training_track_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own stats" ON public.training_user_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own stats" ON public.training_user_stats
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view leaderboard stats" ON public.training_user_stats
  FOR SELECT USING (true);

CREATE POLICY "Users can view own XP history" ON public.training_xp_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own XP history" ON public.training_xp_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to add XP
CREATE OR REPLACE FUNCTION public.add_training_xp(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_source_type TEXT,
  p_source_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_total INTEGER;
  v_new_level INTEGER;
BEGIN
  INSERT INTO training_user_stats (user_id, total_xp, last_activity_at)
  VALUES (p_user_id, p_xp_amount, now())
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = training_user_stats.total_xp + p_xp_amount,
    last_activity_at = now(),
    updated_at = now()
  RETURNING total_xp INTO v_new_total;

  v_new_level := GREATEST(1, (v_new_total / 500) + 1);
  
  UPDATE training_user_stats 
  SET current_level = v_new_level
  WHERE user_id = p_user_id;

  INSERT INTO training_xp_history (user_id, xp_amount, source_type, source_id, description)
  VALUES (p_user_id, p_xp_amount, p_source_type, p_source_id, p_description);

  RETURN v_new_total;
END;
$$;

-- Indexes for performance
CREATE INDEX idx_training_material_progress_user ON public.training_material_progress(user_id);
CREATE INDEX idx_training_quiz_attempts_user ON public.training_quiz_attempts(user_id);
CREATE INDEX idx_training_simulation_attempts_user ON public.training_simulation_attempts(user_id);
CREATE INDEX idx_training_track_progress_user ON public.training_track_progress(user_id);
CREATE INDEX idx_training_xp_history_user ON public.training_xp_history(user_id);
CREATE INDEX idx_training_user_stats_xp ON public.training_user_stats(total_xp DESC);