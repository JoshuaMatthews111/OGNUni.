'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-16 h-16 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" /></div>}>
      <CheckoutSuccess />
    </Suspense>
  )
}

function CheckoutSuccess() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (!sessionId) {
      router.push('/')
      return
    }

    // Give webhook time to process
    setTimeout(() => {
      setLoading(false)
    }, 2000)
  }, [searchParams, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Processing your purchase...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <Card className="max-w-md w-full">
        <CardContent className="p-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          <Image src="/assets/ogn-logo-small.png" alt="OGN" width={60} height={48} className="mx-auto mb-4 object-contain" />
          <h1 className="text-3xl font-bold mb-4 text-[#0a1628]">
            Payment Successful!
          </h1>

          <p className="text-gray-600 mb-8">
            Thank you for your purchase. You now have access to your course. Start learning today!
          </p>

          <div className="space-y-3">
            <Link href="/dashboard" className="block">
              <Button className="w-full bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold">
                Go to Dashboard
              </Button>
            </Link>
            <Link href="/courses" className="block">
              <Button variant="outline" className="w-full">
                Browse More Courses
              </Button>
            </Link>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            A confirmation email has been sent to your inbox.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
