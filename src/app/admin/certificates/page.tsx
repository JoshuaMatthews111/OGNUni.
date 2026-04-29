'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Award, Download, Eye } from 'lucide-react'

export default function AdminCertificatesPage() {
  const supabase = createClient()
  const [certificates, setCertificates] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadCertificates() }, [])

  const loadCertificates = async () => {
    const { data } = await supabase
      .from('certificates')
      .select('*, user:user_id(full_name, email), course:course_id(title)')
      .order('issued_at', { ascending: false })
    setCertificates(data || [])
    setLoading(false)
  }

  const filtered = certificates.filter((c) =>
    c.user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.course?.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.certificate_number?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0a1628]">Certificates</h1>
        <p className="text-sm text-gray-500">{certificates.length} certificates issued</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#0a1628] to-[#1a3a5c] rounded-xl p-4 text-white">
          <p className="text-xs text-gray-300">Total Issued</p>
          <p className="text-3xl font-bold text-[#c9a227]">{certificates.length}</p>
        </div>
        <div className="bg-gradient-to-br from-[#0a1628] to-[#1a3a5c] rounded-xl p-4 text-white">
          <p className="text-xs text-gray-300">This Month</p>
          <p className="text-3xl font-bold text-[#c9a227]">
            {certificates.filter((c) => new Date(c.issued_at) > new Date(Date.now() - 30 * 86400000)).length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-[#0a1628] to-[#1a3a5c] rounded-xl p-4 text-white">
          <p className="text-xs text-gray-300">Unique Courses</p>
          <p className="text-3xl font-bold text-[#c9a227]">
            {new Set(certificates.map((c) => c.course_id)).size}
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search certificates..." className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Award className="w-12 h-12 mx-auto mb-3" />
              <p>No certificates found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-gray-500">
                    <th className="p-4 font-medium">Student</th>
                    <th className="p-4 font-medium">Course</th>
                    <th className="p-4 font-medium">Certificate #</th>
                    <th className="p-4 font-medium">Issued</th>
                    <th className="p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((cert) => (
                    <tr key={cert.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#0a1628] text-[#c9a227] flex items-center justify-center text-xs font-bold">
                            {cert.user?.full_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-[#0a1628]">{cert.user?.full_name}</p>
                            <p className="text-xs text-gray-500">{cert.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">{cert.course?.title}</td>
                      <td className="p-4"><Badge variant="outline" className="font-mono text-xs">{cert.certificate_number}</Badge></td>
                      <td className="p-4 text-xs text-gray-500">{new Date(cert.issued_at).toLocaleDateString()}</td>
                      <td className="p-4">
                        {cert.pdf_url && (
                          <a href={cert.pdf_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm"><Download className="w-4 h-4 text-[#c9a227]" /></Button>
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
