-- Overcomers Global Network University - Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  role text check (role in ('student', 'admin', 'instructor')) default 'student',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Courses
create table public.courses (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  slug text unique not null,
  description text,
  long_description text,
  instructor_id uuid references public.profiles(id),
  thumbnail_url text,
  is_published boolean default false,
  is_free boolean default false,
  price decimal(10,2) default 0,
  stripe_price_id text,
  duration_weeks integer,
  requires_membership boolean default false,
  certificate_template_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Modules
create table public.modules (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  title text not null,
  description text,
  order_index integer not null,
  drip_delay_days integer default 0, -- Days after enrollment to unlock
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Lessons
create table public.lessons (
  id uuid default uuid_generate_v4() primary key,
  module_id uuid references public.modules(id) on delete cascade not null,
  title text not null,
  description text,
  content_type text check (content_type in ('video', 'text', 'pdf', 'audio', 'quiz')) not null,
  video_mux_id text,
  video_playback_id text,
  content_url text, -- For PDF, audio files
  text_content text,
  order_index integer not null,
  duration_minutes integer,
  is_required boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Quizzes
create table public.quizzes (
  id uuid default uuid_generate_v4() primary key,
  lesson_id uuid references public.lessons(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  title text not null,
  description text,
  passing_score integer default 70,
  max_attempts integer default 3,
  time_limit_minutes integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Quiz Questions
create table public.quiz_questions (
  id uuid default uuid_generate_v4() primary key,
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  question_text text not null,
  question_type text check (question_type in ('multiple_choice', 'true_false', 'short_answer')) not null,
  options jsonb, -- Array of options for multiple choice
  correct_answer text not null,
  points integer default 1,
  order_index integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enrollments
create table public.enrollments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  enrollment_type text check (enrollment_type in ('purchase', 'membership', 'free', 'admin_granted')) not null,
  stripe_payment_intent_id text,
  enrolled_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone,
  certificate_issued_at timestamp with time zone,
  unique(user_id, course_id)
);

-- Lesson Progress
create table public.lesson_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  enrollment_id uuid references public.enrollments(id) on delete cascade not null,
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone,
  video_progress_seconds integer default 0,
  is_completed boolean default false,
  unique(user_id, lesson_id)
);

-- Quiz Attempts
create table public.quiz_attempts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  enrollment_id uuid references public.enrollments(id) on delete cascade not null,
  score integer not null,
  passed boolean not null,
  answers jsonb not null, -- Store user answers
  started_at timestamp with time zone not null,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Certificates
create table public.certificates (
  id uuid default uuid_generate_v4() primary key,
  enrollment_id uuid references public.enrollments(id) on delete cascade not null unique,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  certificate_number text unique not null,
  issued_at timestamp with time zone default timezone('utc'::text, now()) not null,
  pdf_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Discussions / Community
create table public.discussion_topics (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) on delete cascade,
  title text not null,
  is_pinned boolean default false,
  is_locked boolean default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.discussion_posts (
  id uuid default uuid_generate_v4() primary key,
  topic_id uuid references public.discussion_topics(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  parent_post_id uuid references public.discussion_posts(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Subscriptions
create table public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  subscription_type text check (subscription_type in ('membership', 'mentoring')) not null,
  stripe_subscription_id text unique not null,
  stripe_customer_id text not null,
  status text check (status in ('active', 'canceled', 'past_due', 'incomplete')) not null,
  current_period_start timestamp with time zone not null,
  current_period_end timestamp with time zone not null,
  cancel_at_period_end boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Membership Unlocked Courses
create table public.membership_courses (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) on delete cascade not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security Policies

-- Profiles
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Courses
alter table public.courses enable row level security;
create policy "Published courses are viewable by everyone" on public.courses for select using (is_published = true);
create policy "Admins can do anything with courses" on public.courses for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'instructor'))
);

-- Modules
alter table public.modules enable row level security;
create policy "Modules viewable if course is published" on public.modules for select using (
  exists (select 1 from public.courses where id = course_id and is_published = true)
);
create policy "Admins can manage modules" on public.modules for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'instructor'))
);

-- Lessons
alter table public.lessons enable row level security;
create policy "Lessons viewable if enrolled" on public.lessons for select using (
  exists (
    select 1 from public.modules m
    join public.courses c on c.id = m.course_id
    join public.enrollments e on e.course_id = c.id
    where m.id = module_id and e.user_id = auth.uid()
  )
  or
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'instructor'))
);
create policy "Admins can manage lessons" on public.lessons for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'instructor'))
);

-- Enrollments
alter table public.enrollments enable row level security;
create policy "Users can view own enrollments" on public.enrollments for select using (user_id = auth.uid());
create policy "Admins can view all enrollments" on public.enrollments for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "System can insert enrollments" on public.enrollments for insert with check (true);

-- Lesson Progress
alter table public.lesson_progress enable row level security;
create policy "Users can view own progress" on public.lesson_progress for select using (user_id = auth.uid());
create policy "Users can update own progress" on public.lesson_progress for insert with check (user_id = auth.uid());
create policy "Users can modify own progress" on public.lesson_progress for update using (user_id = auth.uid());

-- Quiz Attempts
alter table public.quiz_attempts enable row level security;
create policy "Users can view own quiz attempts" on public.quiz_attempts for select using (user_id = auth.uid());
create policy "Users can insert own quiz attempts" on public.quiz_attempts for insert with check (user_id = auth.uid());

-- Certificates
alter table public.certificates enable row level security;
create policy "Users can view own certificates" on public.certificates for select using (user_id = auth.uid());

-- Discussions
alter table public.discussion_topics enable row level security;
create policy "Topics viewable if enrolled in course" on public.discussion_topics for select using (
  exists (
    select 1 from public.enrollments
    where course_id = discussion_topics.course_id and user_id = auth.uid()
  ) or course_id is null
);
create policy "Enrolled users can create topics" on public.discussion_topics for insert with check (
  exists (
    select 1 from public.enrollments
    where course_id = discussion_topics.course_id and user_id = auth.uid()
  )
);

alter table public.discussion_posts enable row level security;
create policy "Posts viewable if can view topic" on public.discussion_posts for select using (
  exists (
    select 1 from public.discussion_topics dt
    left join public.enrollments e on e.course_id = dt.course_id
    where dt.id = topic_id and (e.user_id = auth.uid() or dt.course_id is null)
  )
);
create policy "Users can create posts" on public.discussion_posts for insert with check (user_id = auth.uid());

-- Subscriptions
alter table public.subscriptions enable row level security;
create policy "Users can view own subscriptions" on public.subscriptions for select using (user_id = auth.uid());

-- Functions

-- Function to check if user has access to course
create or replace function has_course_access(p_user_id uuid, p_course_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.enrollments
    where user_id = p_user_id and course_id = p_course_id
  );
end;
$$ language plpgsql security definer;

-- Function to check if module is unlocked for user
create or replace function is_module_unlocked(p_user_id uuid, p_module_id uuid)
returns boolean as $$
declare
  v_enrollment_date timestamp with time zone;
  v_drip_delay_days integer;
  v_unlock_date timestamp with time zone;
begin
  select e.enrolled_at, m.drip_delay_days
  into v_enrollment_date, v_drip_delay_days
  from public.modules m
  join public.courses c on c.id = m.course_id
  join public.enrollments e on e.course_id = c.id
  where m.id = p_module_id and e.user_id = p_user_id;

  if not found then
    return false;
  end if;

  v_unlock_date := v_enrollment_date + (v_drip_delay_days || ' days')::interval;

  return now() >= v_unlock_date;
end;
$$ language plpgsql security definer;

-- Function to calculate course completion percentage
create or replace function get_course_completion(p_user_id uuid, p_course_id uuid)
returns integer as $$
declare
  v_total_lessons integer;
  v_completed_lessons integer;
begin
  select count(*)
  into v_total_lessons
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where m.course_id = p_course_id and l.is_required = true;

  if v_total_lessons = 0 then
    return 0;
  end if;

  select count(*)
  into v_completed_lessons
  from public.lesson_progress lp
  join public.lessons l on l.id = lp.lesson_id
  join public.modules m on m.id = l.module_id
  where m.course_id = p_course_id
    and lp.user_id = p_user_id
    and lp.is_completed = true
    and l.is_required = true;

  return (v_completed_lessons * 100) / v_total_lessons;
end;
$$ language plpgsql security definer;

-- Triggers for updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on public.profiles
  for each row execute procedure update_updated_at_column();

create trigger update_courses_updated_at before update on public.courses
  for each row execute procedure update_updated_at_column();

create trigger update_modules_updated_at before update on public.modules
  for each row execute procedure update_updated_at_column();

create trigger update_lessons_updated_at before update on public.lessons
  for each row execute procedure update_updated_at_column();

-- Create storage buckets (run in Supabase Dashboard > Storage)
-- Videos: mux-uploads (videos get uploaded to Mux from here)
-- PDFs: course-materials
-- Audio: course-audio
-- Certificates: certificates
-- Avatars: avatars
-- Course Thumbnails: course-thumbnails
