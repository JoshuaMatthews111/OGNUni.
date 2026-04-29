'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Award, Download, ArrowLeft, BookOpen } from 'lucide-react'

export default function CertificatesPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [certificates, setCertificates] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { setLoading(false); return }

      const { data } = await supabase
        .from('certificates')
        .select('*, course:course_id(title, thumbnail_url)')
        .eq('user_id', auth.user.id)
        .order('issued_at', { ascending: false })

      setCertificates(data ?? [])
      setLoading(false)
    }
    load()
  }, [supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1628]">
        <div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="bg-[#0a1628] text-white py-10">
        <div className="container mx-auto px-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard"><Button variant="ghost" className="text-gray-400 hover:text-[#c9a227]"><ArrowLeft className="w-4 h-4 mr-1" /> Dashboard</Button></Link>
          </div>
          <div className="flex items-center gap-4">
            <Award className="w-10 h-10 text-[#c9a227]" />
            <div>
              <h1 className="text-2xl font-bold">My Certificates</h1>
              <p className="text-sm text-[#c9a227]">{certificates.length} certificate{certificates.length !== 1 ? 's' : ''} earned</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {certificates.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold mb-2">No certificates yet</h3>
              <p className="text-gray-500 mb-6">Complete a course to earn your first certificate!</p>
              <Link href="/courses"><Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold">Browse Courses</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((c) => (
              <Card key={c.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-4 bg-gradient-to-r from-[#0a1628] via-[#c9a227] to-[#0a1628]" />
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#0a1628] flex items-center justify-center">
                      <Award className="w-6 h-6 text-[#c9a227]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0a1628]">Certificate of Completion</h3>
                      <p className="text-xs text-gray-500">{c.course?.title}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <p><strong>Issued:</strong> {new Date(c.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p><strong>Certificate #:</strong> <Badge variant="outline" className="font-mono text-[10px]">{c.certificate_number}</Badge></p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/certificates/${c.id}`} className="flex-1">
                      <Button className="w-full bg-[#0a1628] text-white hover:bg-[#1a3a5c] text-xs">View Certificate</Button>
                    </Link>
                    {c.pdf_url && (
                      <a href={c.pdf_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm"><Download className="w-4 h-4" /></Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
