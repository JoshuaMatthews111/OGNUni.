'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, Users, Eye, Edit, GraduationCap } from 'lucide-react'
import { ROLE_LABELS, ROLES } from '@/lib/constants'
import { toast } from 'sonner'

export default function AdminStudentsPage() {
  const supabase = createClient()
  const [students, setStudents] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingStudent, setEditingStudent] = useState<any>(null)

  useEffect(() => { loadStudents() }, [])

  const loadStudents = async () => {
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    const { data } = await query
    setStudents(data || [])
    setLoading(false)
  }

  const updateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    if (error) toast.error('Failed to update role')
    else { toast.success('Role updated'); loadStudents(); setEditingStudent(null) }
  }

  const filtered = students.filter((s) => {
    const matchSearch = s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = !roleFilter || s.role === roleFilter
    return matchSearch && matchRole
  })

  const roleCounts = students.reduce((acc: any, s: any) => {
    acc[s.role] = (acc[s.role] || 0) + 1
    return acc
  }, {})

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0a1628]">Students & Users</h1>
        <p className="text-sm text-gray-500">{students.length} total users</p>
      </div>

      {/* Role Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {ROLES.map((role) => (
          <button
            key={role}
            onClick={() => setRoleFilter(roleFilter === role ? '' : role)}
            className={`p-3 rounded-xl text-center transition-all ${
              roleFilter === role ? 'bg-[#0a1628] text-[#c9a227]' : 'bg-white border hover:border-[#c9a227]'
            }`}
          >
            <p className="text-xl font-bold">{roleCounts[role] || 0}</p>
            <p className="text-xs">{ROLE_LABELS[role]}</p>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-gray-500">
                    <th className="p-4 font-medium">User</th>
                    <th className="p-4 font-medium">Email</th>
                    <th className="p-4 font-medium">Role</th>
                    <th className="p-4 font-medium">Joined</th>
                    <th className="p-4 font-medium">Last Login</th>
                    <th className="p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#0a1628] text-[#c9a227] flex items-center justify-center text-xs font-bold">
                            {student.full_name?.charAt(0) || '?'}
                          </div>
                          <span className="font-medium text-[#0a1628]">{student.full_name || 'No name'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">{student.email}</td>
                      <td className="p-4">
                        {editingStudent === student.id ? (
                          <select
                            value={student.role}
                            onChange={(e) => updateRole(student.id, e.target.value)}
                            className="h-8 px-2 border rounded text-xs"
                          >
                            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                          </select>
                        ) : (
                          <Badge className={`text-[10px] ${
                            student.role === 'super_admin' ? 'bg-red-100 text-red-700' :
                            student.role === 'prophet' ? 'bg-purple-100 text-purple-700' :
                            student.role === 'teacher' ? 'bg-blue-100 text-blue-700' :
                            student.role === 'minister' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>{ROLE_LABELS[student.role] || student.role}</Badge>
                        )}
                      </td>
                      <td className="p-4 text-xs text-gray-500">{new Date(student.created_at).toLocaleDateString()}</td>
                      <td className="p-4 text-xs text-gray-500">{student.last_login_at ? new Date(student.last_login_at).toLocaleString() : '—'}</td>
                      <td className="p-4">
                        <Button variant="ghost" size="sm" onClick={() => setEditingStudent(editingStudent === student.id ? null : student.id)}>
                          <Edit className="w-4 h-4 text-[#c9a227]" />
                        </Button>
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
