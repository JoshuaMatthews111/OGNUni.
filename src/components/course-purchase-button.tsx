'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface CoursePurchaseButtonProps {
  courseId: string
  isFree: boolean
  price: number
  isEnrolled?: boolean
}

export function CoursePurchaseButton({
  courseId,
  isFree,
  price,
  isEnrolled = false
}: CoursePurchaseButtonProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleEnroll = async () => {
    setLoading(true)

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Please sign in to enroll')
      setLoading(false)
      return
    }

    if (isFree) {
      // Free enrollment
      const { error } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
          enrollment_type: 'free',
        })

      if (error) {
        if (error.code === '23505') {
          toast.error('You are already enrolled in this course')
        } else {
          toast.error('Failed to enroll')
        }
      } else {
        toast.success('Enrolled successfully!')
        window.location.href = '/dashboard'
      }
      setLoading(false)
    } else {
      // Paid enrollment - redirect to Stripe checkout
      try {
        const response = await fetch('/api/checkout/course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId }),
        })

        const data = await response.json()

        if (response.ok && data.url) {
          window.location.href = data.url
        } else {
          toast.error(data.error || 'Failed to start checkout')
          setLoading(false)
        }
      } catch (error) {
        toast.error('Failed to start checkout')
        setLoading(false)
      }
    }
  }

  if (isEnrolled) {
    return (
      <Button
        className="w-full bg-green-600 hover:bg-green-700"
        onClick={() => window.location.href = '/dashboard'}
      >
        Continue Learning
      </Button>
    )
  }

  return (
    <Button
      onClick={handleEnroll}
      disabled={loading}
      className="w-full bg-[#003d82] hover:bg-[#0052ad]"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          {isFree ? 'Enroll Free' : `Enroll Now - $${price}`}
        </>
      )}
    </Button>
  )
}
