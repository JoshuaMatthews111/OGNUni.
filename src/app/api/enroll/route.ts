import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { courseId } = await req.json()
    if (!courseId) return NextResponse.json({ error: 'Course ID required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: course } = await supabase
      .from('courses')
      .select('id, is_free, title')
      .eq('id', courseId)
      .single()

    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    if (!course.is_free) return NextResponse.json({ error: 'This course requires payment' }, { status: 400 })

    const { data: existing } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single()

    if (existing) return NextResponse.json({ message: 'Already enrolled', enrollmentId: existing.id })

    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .insert({
        user_id: user.id,
        course_id: courseId,
        enrollment_type: 'free',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, enrollmentId: enrollment.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
