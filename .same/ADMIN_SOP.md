# Admin SOP: How to Create a Course End-to-End

## Overview
This guide walks you through creating a complete course from scratch in the Overcomers Global Network University LMS.

## Prerequisites
- Admin or Instructor account
- Content prepared (videos, PDFs, quizzes)
- Mux account configured (for videos)
- Stripe products created (if paid course)

## Step 1: Create the Course

1. Navigate to **Admin Panel** → **Courses**
2. Click **"Create Course"** button
3. Fill in the form:
   - **Course Title**: Full course name (e.g., "Foundational Teachings Every Believer Needs")
   - **Slug**: URL-friendly version (auto-generated, e.g., "foundational-teachings")
   - **Short Description**: One-line summary (shows in catalog)
   - **Long Description**: Full course description (shows on course page)
   - **Price**: Course price in USD (or check "Free Course")
   - **Free Course**: Check if course should be free
4. Click **"Create Course"**

> **Note**: Course is created as a DRAFT. Students cannot see it until published.

## Step 2: Add Modules

1. Click **"Edit"** on your newly created course
2. In the **Modules** section, click **"Add Module"**
3. Fill in module details:
   - **Module Title**: (e.g., "Week 1: Introduction to Faith")
   - **Description**: What students will learn
   - **Order**: Numeric order (1, 2, 3...)
   - **Drip Delay (Days)**: How many days after enrollment to unlock
     - Set to 0 for immediate access
     - Set to 7 for week 2, 14 for week 3, etc.
4. Click **"Create Module"**
5. Repeat for all modules

> **Example Drip Schedule**:
> - Module 1: 0 days (immediate)
> - Module 2: 7 days
> - Module 3: 14 days
> - Module 4: 21 days

## Step 3: Add Lessons to Modules

For each module, add lessons:

### 3A. Video Lessons

1. Click **"Add Lesson"** under a module
2. Select **"Video"** as content type
3. Fill in:
   - **Lesson Title**: (e.g., "What is Faith?")
   - **Description**: Brief overview
   - **Order**: Numeric order within module
   - **Required**: Check if students must complete this
4. **Upload Video**:
   - Click **"Upload Video"**
   - Select video file from your computer
   - Video uploads to Supabase Storage, then to Mux
   - Wait for processing (shows progress)
   - Mux assigns a Playback ID (saved automatically)
5. Click **"Create Lesson"**

> **Video Requirements**:
> - Format: MP4, MOV, AVI
> - Max size: 5GB
> - Recommended: 1080p, H.264 codec

### 3B. PDF/Document Lessons

1. Click **"Add Lesson"** under a module
2. Select **"PDF"** as content type
3. Fill in lesson details
4. **Upload PDF**:
   - Click **"Upload File"**
   - Select PDF from your computer
   - File uploads to Supabase Storage
   - URL saved automatically
5. Click **"Create Lesson"**

### 3C. Text Lessons

1. Click **"Add Lesson"** under a module
2. Select **"Text"** as content type
3. Fill in lesson details
4. In **"Content"** field, write or paste your lesson text
5. Click **"Create Lesson"**

### 3D. Quiz Lessons

1. Click **"Add Lesson"** under a module
2. Select **"Quiz"** as content type
3. Fill in lesson details
4. Click **"Create Lesson"**
5. Then click **"Add Quiz Questions"** (see Step 4)

## Step 4: Create Quizzes

1. Click **"Manage Quiz"** for a quiz lesson
2. Set quiz settings:
   - **Passing Score**: Percentage needed to pass (e.g., 70%)
   - **Max Attempts**: How many times students can retake
   - **Time Limit**: Minutes allowed (optional)
3. Click **"Add Question"**
4. For each question:
   - **Question Text**: The question
   - **Question Type**: Multiple Choice, True/False, or Short Answer
   - **Options** (for multiple choice): List all answer choices
   - **Correct Answer**: The right answer
   - **Points**: Points awarded (usually 1)
   - **Order**: Numeric order
5. Click **"Save Question"**
6. Repeat for all quiz questions
7. Click **"Save Quiz"**

> **Quiz Best Practices**:
> - 5-10 questions per quiz
> - Mix question types
> - 70% passing score is standard
> - Allow 2-3 attempts
> - 15-30 minute time limit

## Step 5: Configure Drip Schedule

Drip scheduling controls when modules unlock for students.

**Example Schedule**:
```
Module 1: Day 0 (immediate)
Module 2: Day 7 (1 week later)
Module 3: Day 14 (2 weeks later)
Module 4: Day 21 (3 weeks later)
```

1. Edit each module
2. Set **"Drip Delay Days"**
3. Students see locked modules with unlock date

## Step 6: Set Up Certificates

1. Go to **Admin Panel** → **Settings** → **Certificates**
2. Upload certificate template image (optional)
3. Configure certificate text:
   - Student name placement
   - Course name placement
   - Completion date placement
   - Instructor signature
4. Click **"Save Certificate Settings"**

> **Certificate Triggers**:
> - Student completes ALL required lessons
> - Student passes ALL quizzes (if any)
> - Certificate auto-generates as PDF
> - Student can download from dashboard

## Step 7: Configure Pricing & Access

### For Free Courses:
1. Check **"Free Course"** when creating
2. Students can enroll immediately
3. No payment required

### For Paid Courses:
1. Set price when creating course
2. Go to Stripe Dashboard
3. Create a Product for this course
4. Create a Price (one-time payment)
5. Copy the Price ID
6. Paste in course settings → **"Stripe Price ID"**
7. Save course

### For Membership-Unlocked Courses:
1. Set **"Requires Membership"** = true
2. Go to **Admin Panel** → **Settings** → **Membership**
3. Add course to membership unlocked list
4. Students with active membership can enroll free

## Step 8: Publish the Course

1. Review everything:
   - ✅ All modules added
   - ✅ All lessons added with content
   - ✅ Quizzes created (if any)
   - ✅ Drip schedule configured
   - ✅ Pricing set (if paid)
   - ✅ Certificate configured
2. Click **"Publish Course"**
3. Course is now visible to students

> **Warning**: Once published with enrollments, major changes may confuse students. Create a new course version instead.

## Step 9: Create Course Announcements

After publishing:

1. Go to course page
2. Click **"Post Announcement"**
3. Write announcement:
   - **Title**: Brief headline
   - **Content**: Full message
   - **Pin**: Check to keep at top
4. Click **"Post"**
5. All enrolled students receive notification

## Step 10: Monitor Student Progress

1. Go to **Admin Panel** → **Enrollments**
2. Filter by course
3. View for each student:
   - Enrollment date
   - Progress percentage
   - Lessons completed
   - Quiz scores
   - Completion status
   - Certificate issued

## Communication Features

### Direct Messaging
1. Go to **Admin Panel** → **Messages**
2. Start conversation with any student
3. Respond to student questions
4. Use for 1-on-1 support

### Q&A System
1. Students post questions on course pages
2. You receive notification
3. Navigate to **Course → Q&A tab**
4. Answer questions
5. Mark best answers
6. Pin important Q&As

### Office Hours
1. Go to **Admin Panel** → **Settings** → **Office Hours**
2. Set your availability:
   - Days of week
   - Time slots
   - Timezone
3. Students can request 1-on-1 meetings
4. Approve/decline requests
5. Add Zoom/Google Meet link
6. Meet with students

## Best Practices

### Content Organization
- **6-8 modules** per course (ideal)
- **3-5 lessons** per module
- Mix video, text, and quizzes
- Keep videos under 15 minutes each

### Drip Schedule
- Don't drip too fast (overwhelming)
- Don't drip too slow (lose interest)
- 1 module per week is standard
- Consider student time commitment

### Engagement
- Post announcements weekly
- Answer Q&A within 24 hours
- Offer monthly office hours
- Send congratulations on completion

### Quality Checks
- ✅ All videos play correctly
- ✅ PDFs open and are readable
- ✅ Quiz questions are clear
- ✅ Correct answers are correct
- ✅ Certificate displays properly
- ✅ Drip schedule is logical

## Troubleshooting

### "Video won't upload"
- Check file size (max 5GB)
- Check format (MP4 preferred)
- Check internet connection
- Try uploading to Mux directly

### "Students can't access module"
- Check drip delay setting
- Verify enrollment date
- Check if course is published

### "Quiz not working"
- Verify correct answers are set
- Check passing score percentage
- Ensure max attempts > 0

### "Certificate not generating"
- Verify all lessons marked complete
- Check quiz passing scores
- Review certificate template settings

## Support

For technical issues:
- Check Supabase logs
- Check Mux dashboard
- Review browser console errors
- Contact platform administrator

## Checklist: Pre-Launch

Before publishing a course:

- [ ] Course title and description compelling
- [ ] All modules created in logical order
- [ ] All lessons added with complete content
- [ ] All videos uploaded and playing
- [ ] All PDFs uploaded and opening
- [ ] All quizzes created and tested
- [ ] Drip schedule configured
- [ ] Pricing set (free or paid)
- [ ] Stripe product created (if paid)
- [ ] Certificate template configured
- [ ] Course thumbnail uploaded
- [ ] Test enrollment completed
- [ ] Preview as student role
- [ ] Course published

## Ongoing Management

After launch:

- Monitor enrollment numbers
- Track completion rates
- Respond to student questions
- Update content based on feedback
- Post announcements for updates
- Review analytics monthly
- Improve based on data

---

**Remember**: Your course is a living product. Continuously improve based on student feedback and learning outcomes.
