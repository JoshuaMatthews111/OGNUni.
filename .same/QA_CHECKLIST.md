# QA Checklist: Testing Guide for Overcomers Global Network University LMS

## Testing Phases

This checklist ensures all features work correctly before going live.

---

## Phase 1: User Registration & Authentication

### Sign Up Flow
- [ ] User can create account with email/password
- [ ] Password requirements enforced (8+ chars, uppercase, lowercase, number, special)
- [ ] Email verification sent
- [ ] Cannot login before email verification
- [ ] Google OAuth sign-up works
- [ ] Facebook OAuth sign-up works
- [ ] Profile created in database with correct role (default: student)
- [ ] User redirected to dashboard after verification

### Sign In Flow
- [ ] User can log in with email/password
- [ ] Google OAuth sign-in works
- [ ] Invalid credentials show error message
- [ ] "Forgot Password" sends reset email
- [ ] Password reset link works
- [ ] User stays logged in across page refreshes

### User Profile
- [ ] Can view own profile
- [ ] Can update name
- [ ] Can upload avatar image
- [ ] Can update email (requires re-verification)
- [ ] Cannot change role (security)

---

## Phase 2: Course Browsing & Enrollment

### Course Catalog
- [ ] All published courses visible
- [ ] Draft courses not visible to students
- [ ] Course cards show: title, description, price, instructor, thumbnail
- [ ] Free courses show "Free" badge
- [ ] "Special Offer" badge shows for discounted courses
- [ ] Filter courses by: free, paid, instructor, newest
- [ ] Search courses by title/description works

### Course Details Page
- [ ] Course title and full description display
- [ ] Instructor name shows
- [ ] Module list visible (titles only, no content)
- [ ] Lesson count displayed
- [ ] Duration estimate shown
- [ ] Price displayed correctly
- [ ] "Enroll Now" button present
- [ ] Already enrolled students see "Continue Learning"

### Free Course Enrollment
- [ ] Click "Enroll Now" on free course
- [ ] Enrollment created instantly
- [ ] No payment required
- [ ] Student redirected to course player
- [ ] Enrollment record in database

---

## Phase 3: Paid Course Purchase Flow

### Single Course Purchase
- [ ] Click "Enroll Now" on paid course
- [ ] Redirected to Stripe Checkout
- [ ] Checkout shows correct course name
- [ ] Checkout shows correct price
- [ ] Can pay with test card: `4242 4242 4242 4242`
- [ ] Payment succeeds
- [ ] Redirected to success page
- [ ] Enrollment created in database
- [ ] Stripe Payment Intent ID saved
- [ ] Student can access course

### Payment Failure Handling
- [ ] Declined card shows error (test: `4000 0000 0000 0002`)
- [ ] Student not enrolled on failure
- [ ] Can retry payment
- [ ] No duplicate enrollments

### Stripe Webhook
- [ ] Webhook receives `checkout.session.completed`
- [ ] Enrollment created/updated correctly
- [ ] Email confirmation sent (if configured)

---

## Phase 4: Membership Subscription

### Membership Purchase
- [ ] Click "Get Membership" button
- [ ] Redirected to Stripe Checkout (subscription mode)
- [ ] Shows monthly recurring price
- [ ] Payment succeeds with test card
- [ ] Subscription record created
- [ ] Stripe Subscription ID saved
- [ ] Status = "active"
- [ ] All membership courses unlocked

### Membership Access
- [ ] Student with active membership can enroll in membership courses
- [ ] No additional payment required
- [ ] Enrollment type = "membership"
- [ ] Can access all membership course content

### Membership Cancellation
- [ ] Can cancel from student dashboard
- [ ] Stripe subscription canceled
- [ ] Access continues until period end
- [ ] After period end, cannot access new content
- [ ] Previously enrolled courses still accessible

---

## Phase 5: Mentoring Subscription

### Mentoring Purchase
- [ ] Click "Get Mentoring" button
- [ ] Redirected to Stripe Checkout
- [ ] Shows recurring monthly price
- [ ] Payment succeeds
- [ ] Subscription record created
- [ ] Can request 1-on-1 meetings

### Mentoring Features
- [ ] Can request meetings with instructors
- [ ] Priority support access
- [ ] Direct messaging unlocked

---

## Phase 6: Course Player & Learning Experience

### Module Access
- [ ] Enrolled students see all modules
- [ ] Modules locked by drip schedule show lock icon
- [ ] Unlock date displayed for locked modules
- [ ] Unlocked modules can be accessed
- [ ] Cannot skip ahead to locked modules

### Video Lessons
- [ ] Video player loads and displays correctly
- [ ] Play/pause works
- [ ] Volume control works
- [ ] Fullscreen works
- [ ] Video progress saves (can resume where left off)
- [ ] Completing video (watch 90%+) marks as complete
- [ ] Progress bar updates
- [ ] "Next Lesson" button appears after completion

### PDF Lessons
- [ ] PDF displays in viewer
- [ ] Can download PDF
- [ ] Can zoom in/out
- [ ] "Mark as Complete" button works
- [ ] Completion saves to database

### Text Lessons
- [ ] Text content displays correctly
- [ ] Formatting preserved (paragraphs, lists)
- [ ] "Mark as Complete" button works
- [ ] Completion tracked

### Navigation
- [ ] Can navigate between lessons
- [ ] Sidebar shows all modules/lessons
- [ ] Current lesson highlighted
- [ ] Completed lessons show checkmark
- [ ] Can jump to any unlocked lesson

---

## Phase 7: Quizzes & Assessments

### Taking a Quiz
- [ ] Quiz displays all questions
- [ ] Multiple choice options display correctly
- [ ] True/False questions work
- [ ] Short answer input works
- [ ] Can select answers
- [ ] "Submit Quiz" button enabled when all answered
- [ ] Timer counts down (if time limit set)
- [ ] Quiz auto-submits when time expires

### Quiz Grading
- [ ] Quiz graded immediately after submission
- [ ] Score calculated correctly
- [ ] Percentage displayed
- [ ] Pass/fail status shown
- [ ] Correct answers highlighted (if configured)
- [ ] Wrong answers shown
- [ ] Explanation displayed (if configured)

### Quiz Retakes
- [ ] Can retake quiz if attempts remaining
- [ ] Attempt counter increments
- [ ] Cannot exceed max attempts
- [ ] Best score saved
- [ ] Latest attempt shown

### Quiz Passing
- [ ] Passing quiz marks lesson as complete
- [ ] Progress updates
- [ ] Can proceed to next lesson
- [ ] Failing quiz shows message
- [ ] Must retry or contact instructor

---

## Phase 8: Progress Tracking

### Student Dashboard
- [ ] Shows all enrolled courses
- [ ] Displays progress percentage per course
- [ ] Shows completion status
- [ ] Lists certificates earned
- [ ] Shows recent activity

### Course Progress
- [ ] Progress bar accurate (completed/total lessons)
- [ ] Percentage calculated correctly
- [ ] Updates in real-time after completing lessons
- [ ] 100% when all required lessons done

### Completion Requirements
- [ ] Must complete all required lessons
- [ ] Must pass all quizzes
- [ ] Optional lessons don't block completion
- [ ] Locked modules don't prevent completion (if future)

---

## Phase 9: Certificates

### Certificate Generation
- [ ] Auto-generates when course 100% complete
- [ ] Certificate includes student name
- [ ] Certificate includes course title
- [ ] Certificate includes completion date
- [ ] Certificate includes unique certificate number
- [ ] PDF downloads correctly

### Certificate Display
- [ ] Shows in student dashboard
- [ ] Can download PDF
- [ ] Can view in browser
- [ ] Can share link
- [ ] Certificate number is unique

---

## Phase 10: Communication System

### Direct Messaging
- [ ] Can send message to instructor
- [ ] Instructor receives notification
- [ ] Instructor can reply
- [ ] Student receives notification
- [ ] Messages display in chronological order
- [ ] Unread messages highlighted
- [ ] Can send multiple messages (conversation)
- [ ] Real-time updates (WebSocket)

### Course Announcements
- [ ] Instructor can post announcement
- [ ] All enrolled students see announcement
- [ ] Students receive notification
- [ ] Pinned announcements stay at top
- [ ] Can mark as read
- [ ] Unread count displayed

### Q&A System
- [ ] Student can ask question
- [ ] Question appears in course Q&A section
- [ ] Instructor receives notification
- [ ] Instructor can answer
- [ ] Student receives notification
- [ ] Other students can see Q&A
- [ ] Can upvote questions
- [ ] Can upvote answers
- [ ] Instructor answer highlighted
- [ ] Can mark answer as accepted

### Meeting Requests
- [ ] Student can request 1-on-1 meeting
- [ ] Select preferred date/time
- [ ] Add topic and notes
- [ ] Instructor receives notification
- [ ] Instructor can approve/decline
- [ ] Instructor can add meeting link
- [ ] Student receives notification
- [ ] Both parties can access meeting link
- [ ] Can cancel request

### Notifications
- [ ] Notification bell shows unread count
- [ ] Clicking shows notification list
- [ ] Can mark individual as read
- [ ] Can mark all as read
- [ ] Notification links go to correct page
- [ ] Real-time updates

---

## Phase 11: Admin Panel

### Dashboard
- [ ] Shows total students count
- [ ] Shows total courses count
- [ ] Shows enrollment count
- [ ] Shows revenue total
- [ ] Recent enrollments list displays
- [ ] Charts/graphs display (if implemented)

### Course Management
- [ ] Can create new course
- [ ] Can edit existing course
- [ ] Can delete course (with confirmation)
- [ ] Can publish/unpublish course
- [ ] Can add modules
- [ ] Can edit modules
- [ ] Can delete modules
- [ ] Can reorder modules
- [ ] Can set drip delay

### Lesson Management
- [ ] Can add video lesson
- [ ] Can upload video to Mux
- [ ] Video processing status shown
- [ ] Can add PDF lesson
- [ ] Can upload PDF
- [ ] Can add text lesson
- [ ] Can add quiz lesson
- [ ] Can edit lessons
- [ ] Can delete lessons
- [ ] Can reorder lessons

### Quiz Builder
- [ ] Can create quiz
- [ ] Can add questions
- [ ] Can set question type
- [ ] Can add answer options
- [ ] Can mark correct answer
- [ ] Can set passing score
- [ ] Can set max attempts
- [ ] Can set time limit
- [ ] Can edit questions
- [ ] Can delete questions
- [ ] Can reorder questions

### User Management
- [ ] Can view all users
- [ ] Can filter by role
- [ ] Can change user role
- [ ] Can deactivate user
- [ ] Can view user enrollments
- [ ] Can manually enroll user

### Enrollment Management
- [ ] Can view all enrollments
- [ ] Can filter by course
- [ ] Can view student progress
- [ ] Can manually grant enrollment
- [ ] Can revoke enrollment (with confirmation)
- [ ] Can issue refund (marks enrollment as refunded)

---

## Phase 12: Edge Cases & Error Handling

### Authentication Edge Cases
- [ ] Cannot access admin panel as student
- [ ] Cannot access admin panel without login
- [ ] Session expires after inactivity
- [ ] Refresh token works correctly
- [ ] Logout clears session

### Payment Edge Cases
- [ ] Cannot purchase same course twice
- [ ] Duplicate webhook events handled (idempotency)
- [ ] Failed payments don't create enrollments
- [ ] Partial refunds handled correctly

### Access Control
- [ ] Cannot access locked modules
- [ ] Cannot access non-enrolled courses
- [ ] Cannot see unpublished courses (students)
- [ ] Admins can see all courses
- [ ] Instructors see only their courses

### Data Validation
- [ ] Required fields enforced
- [ ] Email format validated
- [ ] Price cannot be negative
- [ ] Drip delay cannot be negative
- [ ] Quiz scores 0-100

---

## Phase 13: Performance & Security

### Performance
- [ ] Pages load within 3 seconds
- [ ] Videos buffer smoothly
- [ ] Real-time updates don't lag
- [ ] Database queries optimized
- [ ] Images optimized

### Security
- [ ] Passwords hashed (never plain text)
- [ ] Row Level Security (RLS) policies active
- [ ] SQL injection protected
- [ ] XSS attacks prevented
- [ ] CSRF tokens implemented
- [ ] API keys not exposed client-side
- [ ] HTTPS enforced in production

### Data Privacy
- [ ] User data encrypted at rest
- [ ] Payment data handled by Stripe (PCI compliant)
- [ ] Cannot access other users' data
- [ ] GDPR compliance (if applicable)

---

## Phase 14: Mobile Responsiveness

### Tablet (iPad)
- [ ] Layout adjusts correctly
- [ ] Navigation accessible
- [ ] Video player works
- [ ] Forms usable
- [ ] Touch interactions work

### Mobile (iPhone/Android)
- [ ] Layout stacks vertically
- [ ] Text readable without zooming
- [ ] Buttons large enough to tap
- [ ] Video player works
- [ ] Scrolling smooth
- [ ] No horizontal scroll

---

## Phase 15: Cross-Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

---

## Phase 16: Pre-Launch Checklist

### Environment
- [ ] Production environment variables set
- [ ] Supabase production database configured
- [ ] Stripe live keys configured
- [ ] Mux production account active
- [ ] Domain name configured
- [ ] SSL certificate active

### Content
- [ ] At least 1 complete course published
- [ ] Sample free course available
- [ ] Test enrollments cleared
- [ ] Welcome email template configured
- [ ] Certificate templates tested

### Legal & Compliance
- [ ] Privacy Policy page published
- [ ] Terms of Service page published
- [ ] Cookie notice displayed (if required)
- [ ] Refund policy documented

### Support
- [ ] Contact page functional
- [ ] Support email configured
- [ ] FAQ page created
- [ ] Help documentation available

---

## Critical Issues (Showstoppers)

If ANY of these fail, DO NOT launch:

- [ ] **Payment processing broken** - Cannot collect revenue
- [ ] **User authentication broken** - Cannot log in
- [ ] **Course access broken** - Cannot view content after paying
- [ ] **Video playback broken** - Cannot watch lessons
- [ ] **Certificate generation broken** - Students won't complete
- [ ] **Database RLS failure** - Security vulnerability
- [ ] **Stripe webhook failing** - Enrollments won't process

---

## Post-Launch Monitoring

After launch, monitor for 7 days:

- [ ] Daily user signups
- [ ] Course enrollments
- [ ] Payment success rate
- [ ] Video playback errors
- [ ] Customer support requests
- [ ] Server uptime
- [ ] Database performance
- [ ] Error logs

---

## Test Accounts

Create these test accounts:

1. **Student** - student@test.com
2. **Instructor** - instructor@test.com
3. **Admin** - admin@test.com

Use for testing different role permissions.

---

## Reporting Issues

When testing, document issues:

**Format**:
```
Issue: [Brief description]
Steps to Reproduce:
1. ...
2. ...
Expected: [What should happen]
Actual: [What actually happened]
Severity: Critical / High / Medium / Low
Screenshot: [Attach if applicable]
```

---

**Sign-Off**: Only proceed to production when ALL items checked and ZERO critical issues remain.
