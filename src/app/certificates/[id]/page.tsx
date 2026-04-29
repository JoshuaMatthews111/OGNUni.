'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Award, ArrowLeft, Download, Printer } from 'lucide-react'

export default function CertificateDetailPage() {
  const params = useParams<{ id: string }>()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [cert, setCert] = useState<any>(null)
  const certRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { setLoading(false); return }

      const { data } = await supabase
        .from('certificates')
        .select('*, course:course_id(title), user:user_id(full_name)')
        .eq('id', params.id)
        .eq('user_id', auth.user.id)
        .single()

      setCert(data)
      setLoading(false)
    }
    load()
  }, [params.id, supabase])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1628]">
        <div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!cert) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-10 text-center space-y-4">
            <Award className="w-12 h-12 mx-auto text-gray-300" />
            <p className="text-gray-700">Certificate not found.</p>
            <Link href="/certificates"><Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628]">Back</Button></Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Top actions */}
      <div className="container mx-auto px-6 py-4 flex items-center justify-between print:hidden">
        <Link href="/certificates">
          <Button variant="ghost" className="text-gray-400 hover:text-[#c9a227]">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Certificates
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227] hover:text-[#0a1628]">
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          {cert.pdf_url && (
            <a href={cert.pdf_url} target="_blank" rel="noopener noreferrer">
              <Button className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628]">
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Certificate */}
      <div className="container mx-auto px-6 pb-16">
        <div ref={certRef} className="max-w-[850px] mx-auto bg-white p-12 md:p-16 relative" style={{ border: '8px solid #c9a227', boxShadow: '0 0 0 4px #0a1628, 0 0 0 12px #c9a227' }}>
          {/* Corner accents */}
          <div className="absolute top-4 left-4 w-10 h-10 border-t-[3px] border-l-[3px] border-[#c9a227]" />
          <div className="absolute top-4 right-4 w-10 h-10 border-t-[3px] border-r-[3px] border-[#c9a227]" />
          <div className="absolute bottom-4 left-4 w-10 h-10 border-b-[3px] border-l-[3px] border-[#c9a227]" />
          <div className="absolute bottom-4 right-4 w-10 h-10 border-b-[3px] border-r-[3px] border-[#c9a227]" />

          {/* Header */}
          <div className="text-center mb-8">
            <Image src="/assets/ogn-university-logo-transparent.png" alt="OGN" width={100} height={80} className="mx-auto mb-3 object-contain" />
            <p className="text-xs tracking-[4px] text-[#c9a227] font-bold">OGN UNIVERSITY</p>
            <p className="text-[10px] tracking-[3px] text-[#0a1628] mt-1">OVERCOMERS GLOBAL NETWORK</p>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#0a1628]">Certificate of Completion</h1>
            <p className="text-gray-500 mt-3 text-lg">This is to certify that</p>
          </div>

          {/* Recipient */}
          <div className="text-center mb-8">
            <p className="text-3xl md:text-4xl font-serif font-bold text-[#0a1628] border-b-[3px] border-[#c9a227] inline-block px-12 py-3">
              {cert.user?.full_name || 'Student'}
            </p>
          </div>

          {/* Course */}
          <div className="text-center mb-12">
            <p className="text-gray-500 text-lg">has successfully completed the course</p>
            <p className="text-2xl font-bold text-[#0a1628] mt-3">{cert.course?.title}</p>
          </div>

          {/* Signatures */}
          <div className="flex justify-between items-end px-8">
            <div className="text-center">
              <div className="w-48 border-t-2 border-[#0a1628] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#0a1628]">Prophet Joshua Matthews</p>
              <p className="text-xs text-gray-500">President & Founder</p>
            </div>
            <div className="text-center">
              <div className="w-48 border-t-2 border-[#0a1628] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#0a1628]">
                {new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-xs text-gray-500">Date of Completion</p>
            </div>
          </div>

          {/* Certificate Number */}
          <p className="text-center mt-8 text-xs text-gray-400 tracking-wider">
            Certificate #: {cert.certificate_number}
          </p>
          <p className="text-center mt-3 text-sm font-bold text-[#c9a227] tracking-[3px]">
            EDUCATE • EQUIP • EVOLVE
          </p>
        </div>
      </div>
    </div>
  )
}
