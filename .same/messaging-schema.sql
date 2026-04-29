-- Messaging System for Instructor-Student Communication
-- Add this to your Supabase database

-- Direct Messages (1-on-1 between instructor and student)
create table public.conversations (
  id uuid default uuid_generate_v4() primary key,
  participant_1_id uuid references public.profiles(id) on delete cascade not null,
  participant_2_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete set null,
  last_message_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(participant_1_id, participant_2_id, course_id),
  check (participant_1_id != participant_2_id)
);

create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  is_read boolean default false,
  attachment_url text,
  attachment_type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Announcements (instructor -> all students in a course)
create table public.announcements (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  instructor_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  content text not null,
  is_pinned boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Announcement Read Status
create table public.announcement_reads (
  id uuid default uuid_generate_v4() primary key,
  announcement_id uuid references public.announcements(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  read_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(announcement_id, user_id)
);

-- Q&A / Course Questions (students can ask, instructors answer, others can see)
create table public.course_questions (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete set null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  question text not null,
  is_answered boolean default false,
  is_featured boolean default false,
  upvotes integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.question_answers (
  id uuid default uuid_generate_v4() primary key,
  question_id uuid references public.course_questions(id) on delete cascade not null,
  answerer_id uuid references public.profiles(id) on delete cascade not null,
  answer text not null,
  is_instructor_answer boolean default false,
  is_accepted boolean default false,
  upvotes integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Notifications
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null, -- 'message', 'announcement', 'question_answered', 'course_update', etc.
  title text not null,
  content text,
  link text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Instructor Availability / Office Hours
create table public.office_hours (
  id uuid default uuid_generate_v4() primary key,
  instructor_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  timezone text default 'UTC',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Meeting Requests / 1-on-1 Sessions
create table public.meeting_requests (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.profiles(id) on delete cascade not null,
  instructor_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade,
  requested_date timestamp with time zone not null,
  duration_minutes integer default 30,
  topic text not null,
  student_notes text,
  status text check (status in ('pending', 'approved', 'declined', 'completed', 'canceled')) default 'pending',
  instructor_notes text,
  meeting_link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security Policies

-- Conversations
alter table public.conversations enable row level security;
create policy "Users can view their own conversations" on public.conversations for select using (
  auth.uid() = participant_1_id or auth.uid() = participant_2_id
);
create policy "Users can create conversations" on public.conversations for insert with check (
  auth.uid() = participant_1_id or auth.uid() = participant_2_id
);

-- Messages
alter table public.messages enable row level security;
create policy "Users can view messages in their conversations" on public.messages for select using (
  exists (
    select 1 from public.conversations
    where id = conversation_id
    and (participant_1_id = auth.uid() or participant_2_id = auth.uid())
  )
);
create policy "Users can send messages" on public.messages for insert with check (
  sender_id = auth.uid()
);
create policy "Users can update their own messages" on public.messages for update using (
  sender_id = auth.uid()
);

-- Announcements
alter table public.announcements enable row level security;
create policy "Students can view course announcements" on public.announcements for select using (
  exists (
    select 1 from public.enrollments
    where course_id = announcements.course_id and user_id = auth.uid()
  )
  or
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'instructor'))
);
create policy "Instructors can create announcements" on public.announcements for insert with check (
  exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'instructor')
  )
);
create policy "Instructors can update their announcements" on public.announcements for update using (
  instructor_id = auth.uid()
);

-- Course Questions
alter table public.course_questions enable row level security;
create policy "Enrolled students can view questions" on public.course_questions for select using (
  exists (
    select 1 from public.enrollments
    where course_id = course_questions.course_id and user_id = auth.uid()
  )
  or
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'instructor'))
);
create policy "Students can ask questions" on public.course_questions for insert with check (
  student_id = auth.uid()
);
create policy "Students can update their questions" on public.course_questions for update using (
  student_id = auth.uid()
);

-- Question Answers
alter table public.question_answers enable row level security;
create policy "Anyone can view answers" on public.question_answers for select using (
  exists (
    select 1 from public.course_questions cq
    join public.enrollments e on e.course_id = cq.course_id
    where cq.id = question_id and e.user_id = auth.uid()
  )
  or
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'instructor'))
);
create policy "Users can post answers" on public.question_answers for insert with check (
  answerer_id = auth.uid()
);

-- Notifications
alter table public.notifications enable row level security;
create policy "Users can view own notifications" on public.notifications for select using (
  user_id = auth.uid()
);
create policy "Users can update own notifications" on public.notifications for update using (
  user_id = auth.uid()
);
create policy "System can create notifications" on public.notifications for insert with check (true);

-- Office Hours
alter table public.office_hours enable row level security;
create policy "Anyone can view office hours" on public.office_hours for select using (is_active = true);
create policy "Instructors can manage office hours" on public.office_hours for all using (
  instructor_id = auth.uid()
);

-- Meeting Requests
alter table public.meeting_requests enable row level security;
create policy "Users can view their meeting requests" on public.meeting_requests for select using (
  student_id = auth.uid() or instructor_id = auth.uid()
);
create policy "Students can create meeting requests" on public.meeting_requests for insert with check (
  student_id = auth.uid()
);
create policy "Participants can update meeting requests" on public.meeting_requests for update using (
  student_id = auth.uid() or instructor_id = auth.uid()
);

-- Functions

-- Function to create notification
create or replace function create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_content text,
  p_link text
)
returns uuid as $$
declare
  v_notification_id uuid;
begin
  insert into public.notifications (user_id, type, title, content, link)
  values (p_user_id, p_type, p_title, p_content, p_link)
  returning id into v_notification_id;

  return v_notification_id;
end;
$$ language plpgsql security definer;

-- Trigger to update conversation last_message_at
create or replace function update_conversation_timestamp()
returns trigger as $$
begin
  update public.conversations
  set last_message_at = now()
  where id = new.conversation_id;

  -- Create notification for recipient
  perform create_notification(
    (select case when participant_1_id = new.sender_id then participant_2_id else participant_1_id end
     from public.conversations where id = new.conversation_id),
    'message',
    'New Message',
    substring(new.content from 1 for 100),
    '/messages/' || new.conversation_id::text
  );

  return new;
end;
$$ language plpgsql;

create trigger on_new_message
  after insert on public.messages
  for each row execute procedure update_conversation_timestamp();

-- Trigger to mark question as answered
create or replace function mark_question_answered()
returns trigger as $$
begin
  update public.course_questions
  set is_answered = true
  where id = new.question_id;

  -- Notify student
  perform create_notification(
    (select student_id from public.course_questions where id = new.question_id),
    'question_answered',
    'Your Question Was Answered',
    substring(new.answer from 1 for 100),
    '/courses/questions/' || new.question_id::text
  );

  return new;
end;
$$ language plpgsql;

create trigger on_new_answer
  after insert on public.question_answers
  for each row execute procedure mark_question_answered();

-- Indexes for performance
create index idx_messages_conversation on public.messages(conversation_id);
create index idx_messages_sender on public.messages(sender_id);
create index idx_conversations_participants on public.conversations(participant_1_id, participant_2_id);
create index idx_notifications_user on public.notifications(user_id, is_read);
create index idx_course_questions_course on public.course_questions(course_id);
create index idx_announcements_course on public.announcements(course_id);
