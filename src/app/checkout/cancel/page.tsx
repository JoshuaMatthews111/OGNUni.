'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'
import Link from 'next/link'

export default function CheckoutCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <Card className="max-w-md w-full">
        <CardContent className="p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-gray-400" />
          </div>

          <h1 className="text-3xl font-serif mb-4 text-[#2a2e35]">
            Checkout Canceled
          </h1>

          <p className="text-gray-600 mb-8">
            Your payment was not processed. If you experienced any issues, please contact support.
          </p>

          <div className="space-y-3">
            <Link href="/courses" className="block">
              <Button className="w-full bg-[#003d82] hover:bg-[#0052ad]">
                Browse Courses
              </Button>
            </Link>
            <Link href="/dashboard" className="block">
              <Button variant="outline" className="w-full">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
