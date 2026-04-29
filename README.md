# Overcomers Global Network University - Custom LMS

A full-featured Learning Management System built with Next.js, Supabase, Stripe, and Mux.

## Features

### Student Features
- **Course Enrollment** - Free signup, purchase courses, membership access
- **Interactive Video Learning** - Mux-powered video with progress tracking
- **Quizzes & Assessments** - Automated grading with pass/fail rules
- **Certificates** - Auto-generated PDF certificates upon course completion
- **Drip Content** - Time-based module unlocking
- **Progress Tracking** - Track completion across all courses
- **Community Discussions** - Course-specific discussion forums
- **Direct Messaging** - 1-on-1 messaging with instructors
- **Q&A System** - Ask questions, get answers from instructors and peers
- **Meeting Requests** - Book 1-on-1 sessions with instructors
- **Announcements** - Receive course updates from instructors

### Instructor Features
- **Course Management** - Create and edit courses, modules, lessons
- **Content Upload** - Upload videos (to Mux), PDFs, audio files
- **Quiz Builder** - Create quizzes with multiple question types
- **Student Communication** - Message students, post announcements
- **Q&A Moderation** - Answer student questions
- **Office Hours** - Set availability and approve meeting requests
- **Progress Monitoring** - View student progress and completion rates

### Admin Features
- **Full Platform Control** - Manage users, courses, enrollments
- **Certificate Templates** - Configure certificate designs
- **Pricing Management** - Set course prices, membership tiers
- **Analytics Dashboard** - Platform-wide metrics
- **Role Management** - Assign instructor/admin roles

### Monetization
- **Single Course Purchase** - Stripe integration for one-time purchases
- **Membership Subscription** - Unlock multiple courses with membership
- **Mentoring Subscription** - Recurring subscription for 1-on-1 access

## Tech Stack

- **Frontend**: Next.js 15, React, TailwindCSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Video**: Mux (video hosting, streaming, analytics)
- **Payments**: Stripe (subscriptions, one-time payments)
- **Certificates**: jsPDF + html2canvas

## Prerequisites

1. **Supabase Account** - [supabase.com](https://supabase.com)
2. **Stripe Account** - [stripe.com](https://stripe.com)
3. **Mux Account** - [mux.com](https://mux.com)
4. **Bun** - [bun.sh](https://bun.sh) or Node.js 18+

## Setup Instructions

### 1. Clone and Install

```bash
cd overcomers-lms
bun install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Project Settings → API
3. Copy your project URL and anon key
4. Run the database migration:
   - Go to SQL Editor in Supabase Dashboard
   - Run `.same/database-schema.sql`
   - Run `.same/messaging-schema.sql`
5. Create Storage Buckets:
   - Go to Storage in Supabase Dashboard
   - Create these buckets (all public):
     - `mux-uploads` (videos to be uploaded to Mux)
     - `course-materials` (PDFs)
     - `course-audio` (audio files)
     - `certificates` (generated certificates)
     - `avatars` (user profile pictures)
     - `course-thumbnails` (course images)

### 3. Set Up Stripe

1. Go to [stripe.com/dashboard](https://dashboard.stripe.com)
2. Get your API keys from Developers → API keys
3. Create products:
   - **Membership**: Recurring monthly subscription
   - **Mentoring**: Recurring monthly subscription
   - **Courses**: One-time payment products (create as needed)
4. Set up webhook endpoint:
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

### 4. Set Up Mux

1. Go to [dashboard.mux.com](https://dashboard.mux.com)
2. Create an API access token
3. Copy your Token ID and Token Secret

### 5. Environment Variables

Create `.env.local` from `.env.example`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Mux
MUX_TOKEN_ID=your_token_id
MUX_TOKEN_SECRET=your_token_secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Run Development Server

```bash
bun run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Database Schema

### Core Tables
- `profiles` - User profiles (extends Supabase auth.users)
- `courses` - Course metadata
- `modules` - Course modules with drip scheduling
- `lessons` - Individual lessons (video, text, quiz, etc.)
- `enrollments` - Student course enrollments
- `lesson_progress` - Lesson completion tracking
- `quizzes` - Quiz definitions
- `quiz_questions` - Quiz questions
- `quiz_attempts` - Student quiz attempts
- `certificates` - Generated certificates

### Communication Tables
- `conversations` - Direct messaging threads
- `messages` - Individual messages
- `announcements` - Course announcements
- `course_questions` - Q&A questions
- `question_answers` - Q&A answers
- `notifications` - User notifications
- `meeting_requests` - 1-on-1 meeting requests
- `office_hours` - Instructor availability

### Subscription Tables
- `subscriptions` - Stripe subscription records
- `membership_courses` - Courses unlocked by membership

## API Routes

### Authentication
- `/api/auth/callback` - OAuth callback handler

### Stripe
- `/api/webhooks/stripe` - Stripe webhook handler
- `/api/checkout/course` - Course purchase
- `/api/checkout/membership` - Membership subscription
- `/api/checkout/mentoring` - Mentoring subscription

### Mux
- `/api/mux/upload` - Create Mux upload URL
- `/api/mux/asset/[id]` - Get asset status
- `/api/mux/webhook` - Mux webhook handler

### Certificates
- `/api/certificates/generate` - Generate certificate PDF
- `/api/certificates/[id]` - Download certificate

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

Update these values:
- `NEXT_PUBLIC_APP_URL` → Your production URL
- All Stripe keys → Use live keys (not test)
- Update Stripe webhook URL to production

## Project Structure

```
overcomers-lms/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── (auth)/            # Auth routes
│   │   ├── admin/             # Admin dashboard
│   │   ├── courses/           # Course pages
│   │   ├── dashboard/         # Student dashboard
│   │   ├── messages/          # Direct messaging
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── header.tsx         # Site header
│   │   ├── footer.tsx         # Site footer
│   │   ├── auth-modal.tsx     # Authentication modal
│   │   └── ...                # Other components
│   └── lib/                   # Utilities
│       ├── supabase/          # Supabase clients
│       └── utils.ts           # Helper functions
├── .same/                     # Documentation
│   ├── database-schema.sql    # Main database schema
│   ├── messaging-schema.sql   # Communication schema
│   └── todos.md              # Development checklist
└── public/                    # Static assets
```

## Next Steps

1. **Set up Supabase**: Run SQL migrations
2. **Create first admin user**: Sign up and update role in Supabase
3. **Create courses**: Use admin panel to add courses
4. **Upload content**: Add videos, PDFs, and other materials
5. **Configure Stripe**: Set up products and prices
6. **Test enrollment flow**: Purchase a course or subscribe
7. **Test completion**: Complete lessons, quizzes, earn certificate

## Support

For issues or questions:
- Check `.same/todos.md` for development status
- Review database schema in `.same/` directory
- Check Supabase logs for backend errors
- Check browser console for frontend errors

## License

MIT License - feel free to use for your own projects.
