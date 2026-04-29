-- OGN University v2 Migration
-- Adds: expanded roles, course categories, community posts, lesson resources, announcements, payments

-- 1. Update profiles role constraint to support new roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'prophet', 'teacher', 'minister', 'student', 'admin', 'instructor'));

-- Add last_login_at to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone;

-- 2. Add new columns to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS subtitle text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public'
  CHECK (visibility IN ('public', 'students_only', 'paid_only'));
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft'
  CHECK (status IN ('draft', 'published', 'archived'));

-- 3. Add new columns to lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS youtube_url text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS youtube_embed_id text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS pdf_url text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS lesson_notes text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS scripture_references text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS quiz_required boolean DEFAULT false;

-- Update lessons content_type constraint
ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_content_type_check;
ALTER TABLE public.lessons ADD CONSTRAINT lessons_content_type_check
  CHECK (content_type IN ('video', 'text', 'pdf', 'audio', 'quiz', 'youtube', 'mixed'));

-- 4. Add teacher_review_required to quiz_questions
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS teacher_review_required boolean DEFAULT false;

-- Drop and re-add question_type constraint for spiritual_application
ALTER TABLE public.quiz_questions DROP CONSTRAINT IF EXISTS quiz_questions_question_type_check;
ALTER TABLE public.quiz_questions ADD CONSTRAINT quiz_questions_question_type_check
  CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'spiritual_application'));

-- 5. Lesson resources table
CREATE TABLE IF NOT EXISTS public.lesson_resources (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  resource_type text CHECK (resource_type IN ('pdf', 'link', 'image', 'document')) NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  file_size integer,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Community posts table
CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  featured_image text,
  category text,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_public boolean DEFAULT true,
  students_only_replies boolean DEFAULT false,
  published_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Community comments table
CREATE TABLE IF NOT EXISTS public.community_comments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,
  status text DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'hidden', 'deleted')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Lesson comments table
CREATE TABLE IF NOT EXISTS public.lesson_comments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES public.lesson_comments(id) ON DELETE CASCADE,
  is_answered boolean DEFAULT false,
  answered_by uuid REFERENCES public.profiles(id),
  status text DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'hidden', 'deleted')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_global boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'usd',
  status text CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
  payment_type text CHECK (payment_type IN ('course_purchase', 'membership', 'mentoring', 'donation')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. RLS for new tables
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lesson resources viewable by enrolled" ON public.lesson_resources FOR SELECT USING (true);
CREATE POLICY "Admins manage lesson resources" ON public.lesson_resources FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'prophet', 'teacher', 'admin'))
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public posts viewable by all" ON public.community_posts FOR SELECT USING (is_public = true);
CREATE POLICY "Admins manage posts" ON public.community_posts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'prophet', 'teacher', 'minister', 'admin'))
);

ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments viewable" ON public.community_comments FOR SELECT USING (status = 'approved');
CREATE POLICY "Users create comments" ON public.community_comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage comments" ON public.community_comments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'prophet', 'teacher', 'minister', 'admin'))
);

ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lesson comments viewable by enrolled" ON public.lesson_comments FOR SELECT USING (status = 'approved');
CREATE POLICY "Users create lesson comments" ON public.lesson_comments FOR INSERT WITH CHECK (user_id = auth.uid());

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Announcements viewable" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Admins manage announcements" ON public.announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'prophet', 'teacher', 'admin'))
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own payments" ON public.payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins view all payments" ON public.payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

-- Triggers
CREATE TRIGGER update_community_posts_updated_at BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_community_comments_updated_at BEFORE UPDATE ON public.community_comments
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
