-- Create user profiles table
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_study_hours INTEGER DEFAULT 2,
  deadline_date DATE,
  xp INTEGER DEFAULT 0,
  last_visited_screen TEXT DEFAULT 'home',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create topics table
CREATE TABLE public.topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  priority_score NUMERIC DEFAULT 50,
  last_studied TIMESTAMP WITH TIME ZONE,
  performance_score INTEGER DEFAULT 50,
  confidence_level INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create study sessions table
CREATE TABLE public.study_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('Intense', 'Focused', 'Passive Review')),
  scheduled_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assessments table
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  confidence_level INTEGER NOT NULL CHECK (confidence_level >= 0 AND confidence_level <= 100),
  xp_earned INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create XP logs table
CREATE TABLE public.xp_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for subjects
CREATE POLICY "Users can view own subjects" ON public.subjects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subjects" ON public.subjects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subjects" ON public.subjects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own subjects" ON public.subjects FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for topics
CREATE POLICY "Users can view own topics" ON public.topics FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.subjects WHERE subjects.id = topics.subject_id AND subjects.user_id = auth.uid())
);
CREATE POLICY "Users can insert own topics" ON public.topics FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.subjects WHERE subjects.id = topics.subject_id AND subjects.user_id = auth.uid())
);
CREATE POLICY "Users can update own topics" ON public.topics FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.subjects WHERE subjects.id = topics.subject_id AND subjects.user_id = auth.uid())
);
CREATE POLICY "Users can delete own topics" ON public.topics FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.subjects WHERE subjects.id = topics.subject_id AND subjects.user_id = auth.uid())
);

-- RLS Policies for study_sessions
CREATE POLICY "Users can view own sessions" ON public.study_sessions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.topics 
    JOIN public.subjects ON topics.subject_id = subjects.id 
    WHERE topics.id = study_sessions.topic_id AND subjects.user_id = auth.uid()
  )
);
CREATE POLICY "Users can insert own sessions" ON public.study_sessions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.topics 
    JOIN public.subjects ON topics.subject_id = subjects.id 
    WHERE topics.id = study_sessions.topic_id AND subjects.user_id = auth.uid()
  )
);
CREATE POLICY "Users can update own sessions" ON public.study_sessions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.topics 
    JOIN public.subjects ON topics.subject_id = subjects.id 
    WHERE topics.id = study_sessions.topic_id AND subjects.user_id = auth.uid()
  )
);
CREATE POLICY "Users can delete own sessions" ON public.study_sessions FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.topics 
    JOIN public.subjects ON topics.subject_id = subjects.id 
    WHERE topics.id = study_sessions.topic_id AND subjects.user_id = auth.uid()
  )
);

-- RLS Policies for assessments
CREATE POLICY "Users can view own assessments" ON public.assessments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assessments" ON public.assessments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for xp_logs
CREATE POLICY "Users can view own xp logs" ON public.xp_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own xp logs" ON public.xp_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_profiles
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();