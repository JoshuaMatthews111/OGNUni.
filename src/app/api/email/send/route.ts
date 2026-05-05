import { NextResponse } from 'next/server'
import { sendEmail, emailTemplates, ADMIN_EMAIL } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { trigger, data } = await request.json()

    switch (trigger) {
      case 'new_signup': {
        // Notify admin
        const tpl = emailTemplates.adminNotification(
          'New Student Signup',
          `<strong>${data.name}</strong> (${data.email}) has created an account.`
        )
        await sendEmail({ to: ADMIN_EMAIL, ...tpl, templateType: 'new_signup', metadata: data })
        // Welcome email to student
        const welcome = emailTemplates.welcomeStudent(data.name)
        await sendEmail({ to: data.email, toName: data.name, ...welcome, templateType: 'welcome', metadata: data })
        break
      }

      case 'new_enrollment': {
        // Notify admin
        const adminTpl = emailTemplates.newEnrollment(data.studentName, data.courseName)
        await sendEmail({ to: ADMIN_EMAIL, ...adminTpl, templateType: 'enrollment_admin', metadata: data })
        // Notify teacher if provided
        if (data.teacherEmail) {
          await sendEmail({ to: data.teacherEmail, toName: data.teacherName, ...adminTpl, templateType: 'enrollment_teacher', metadata: data })
        }
        // Confirm to student
        const studentTpl = emailTemplates.enrollmentConfirmation(data.studentName, data.courseName)
        await sendEmail({ to: data.studentEmail, toName: data.studentName, ...studentTpl, templateType: 'enrollment_confirm', metadata: data })
        break
      }

      case 'new_message': {
        const msgTpl = emailTemplates.newMessage(data.senderName, data.preview)
        await sendEmail({ to: data.recipientEmail, toName: data.recipientName, ...msgTpl, templateType: 'new_message', metadata: data })
        break
      }

      case 'course_published': {
        const pubTpl = emailTemplates.coursePublished(data.courseName, data.teacherName)
        await sendEmail({ to: ADMIN_EMAIL, ...pubTpl, templateType: 'course_published', metadata: data })
        break
      }

      case 'assignment_submitted': {
        const subTpl = emailTemplates.assignmentSubmitted(data.studentName, data.lessonName, data.courseName)
        if (data.teacherEmail) {
          await sendEmail({ to: data.teacherEmail, ...subTpl, templateType: 'assignment', metadata: data })
        }
        await sendEmail({ to: ADMIN_EMAIL, ...subTpl, templateType: 'assignment', metadata: data })
        break
      }

      case 'custom': {
        await sendEmail({
          to: data.to,
          toName: data.toName,
          subject: data.subject,
          htmlBody: data.htmlBody,
          templateType: 'custom',
          metadata: data,
        })
        break
      }

      default:
        return NextResponse.json({ error: 'Unknown trigger' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Email trigger error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
