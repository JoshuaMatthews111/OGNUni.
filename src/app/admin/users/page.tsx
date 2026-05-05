'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, UserCog, Mail, Calendar, UserPlus, Send, Shield, Pause, Ban, CheckCircle, Copy, MoreVertical, X } from 'lucide-react'
import { toast } from 'sonner'
import { ROLES, ROLE_LABELS } from '@/lib/constants'

interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  status?: string
  is_active?: boolean
  created_at: string
  avatar_url: string | null
}

export default function AdminUsersPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('student')
  const [inviteLink, setInviteLink] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addName, setAddName] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addRole, setAddRole] = useState('student')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    let filtered = users
    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter)
    }
    setFilteredUsers(filtered)
  }, [searchQuery, users, roleFilter])

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load users')
      setLoading(false)
      return
    }

    setUsers(data || [])
    setFilteredUsers(data || [])
    setLoading(false)
  }

  const handleUserAction = async (userId: string, action: string, role?: string) => {
    setActionLoading(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, role }),
      })
      const result = await res.json()
      if (res.ok) {
        toast.success(result.message)
        loadUsers()
      } else {
        toast.error(result.error || 'Action failed')
      }
    } catch {
      toast.error('Something went wrong')
    }
    setActionLoading(null)
    setActiveMenu(null)
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Email is required')
      return
    }
    setActionLoading('invite')
    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole, name: inviteName }),
      })
      const result = await res.json()
      if (res.ok) {
        toast.success(result.message)
        setInviteLink(result.link || '')
      } else {
        toast.error(result.error || 'Invite failed')
      }
    } catch {
      toast.error('Something went wrong')
    }
    setActionLoading(null)
  }

  const handleAddUser = async () => {
    if (!addEmail.trim() || !addPassword.trim()) {
      toast.error('Email and password are required')
      return
    }
    setActionLoading('add')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addEmail, password: addPassword, name: addName }),
      })
      const result = await res.json()
      if (res.ok) {
        // Now update the role if not student
        if (addRole !== 'student') {
          // Need to find the user id - reload users
          await new Promise(r => setTimeout(r, 1000))
          const { data: newProfile } = await supabase.from('profiles').select('id').eq('email', addEmail).single()
          if (newProfile) {
            await handleUserAction(newProfile.id, 'change_role', addRole)
          }
        }
        toast.success('User created successfully!')
        setShowAddUserModal(false)
        setAddEmail('')
        setAddName('')
        setAddPassword('')
        setAddRole('student')
        loadUsers()
      } else {
        toast.error(result.error || 'Failed to create user')
      }
    } catch {
      toast.error('Something went wrong')
    }
    setActionLoading(null)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-700'
      case 'prophet': return 'bg-amber-100 text-amber-700'
      case 'teacher': return 'bg-blue-100 text-blue-700'
      case 'minister': return 'bg-green-100 text-green-700'
      case 'student': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusBadge = (user: User) => {
    if (user.status === 'suspended') return <Badge className="bg-red-100 text-red-700 text-xs">Suspended</Badge>
    if (user.status === 'paused') return <Badge className="bg-yellow-100 text-yellow-700 text-xs">Paused</Badge>
    if (user.is_active === false) return <Badge className="bg-red-100 text-red-700 text-xs">Inactive</Badge>
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">Loading users...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-serif text-[#2a2e35]">Users Management</h1>
          <p className="text-gray-600 mt-1">Manage accounts, roles, invitations & permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowInviteModal(true)} className="bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628]">
            <Send className="w-4 h-4 mr-2" /> Invite User
          </Button>
          <Button onClick={() => setShowAddUserModal(true)} className="bg-[#0a1628] hover:bg-[#1a2c48] text-white">
            <UserPlus className="w-4 h-4 mr-2" /> Add User
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {ROLES.map(role => (
          <Card key={role} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[#0a1628]">{users.filter(u => u.role === role).length}</p>
              <p className="text-xs text-gray-500 mt-1">{ROLE_LABELS[role]}</p>
              {roleFilter === role && <div className="w-full h-0.5 bg-[#c9a227] mt-2 rounded"></div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Roles</option>
              {ROLES.map(role => (
                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
              ))}
            </select>
            <Badge className="px-3 py-1">{filteredUsers.length} users</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-600">No users found</div>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#0a1628] text-white flex items-center justify-center font-semibold text-sm shrink-0">
                      {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">{user.full_name || 'No name'}</h3>
                        <Badge className={`${getRoleBadgeColor(user.role)} text-xs`}>
                          {ROLE_LABELS[user.role] || user.role}
                        </Badge>
                        {getStatusBadge(user)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="truncate">{user.email}</span>
                        <span className="hidden sm:inline">Joined {new Date(user.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Role dropdown */}
                    <select
                      value={user.role}
                      onChange={(e) => handleUserAction(user.id, 'change_role', e.target.value)}
                      className="px-2 py-1.5 border rounded text-xs hidden sm:block"
                      disabled={actionLoading === user.id}
                    >
                      {ROLES.map(role => (
                        <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                      ))}
                    </select>
                    {/* Actions menu */}
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                        className="h-8 w-8 p-0"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                      {activeMenu === user.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-50 w-48 py-1">
                          {user.status !== 'paused' && user.is_active !== false && (
                            <button onClick={() => handleUserAction(user.id, 'pause')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2">
                              <Pause className="w-3.5 h-3.5 text-yellow-600" /> Pause User
                            </button>
                          )}
                          {user.status !== 'suspended' && (
                            <button onClick={() => handleUserAction(user.id, 'suspend')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2">
                              <Ban className="w-3.5 h-3.5 text-red-600" /> Suspend User
                            </button>
                          )}
                          {(user.status === 'paused' || user.status === 'suspended' || user.is_active === false) && (
                            <button onClick={() => handleUserAction(user.id, 'activate')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-green-600" /> Activate User
                            </button>
                          )}
                          <div className="border-t my-1"></div>
                          {/* Mobile role change */}
                          <div className="px-4 py-2 sm:hidden">
                            <p className="text-xs text-gray-500 mb-1">Change Role:</p>
                            <select
                              value={user.role}
                              onChange={(e) => handleUserAction(user.id, 'change_role', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-xs"
                            >
                              {ROLES.map(role => (
                                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                              ))}
                            </select>
                          </div>
                          <div className="border-t my-1"></div>
                          <button onClick={() => { if (confirm('Are you sure you want to delete this user?')) handleUserAction(user.id, 'delete') }} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2">
                            <X className="w-3.5 h-3.5" /> Delete User
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowInviteModal(false); setInviteLink('') }}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#0a1628]">Invite User</h2>
              <button onClick={() => { setShowInviteModal(false); setInviteLink('') }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500">Send a branded invitation email with a role-specific link.</p>
            <div className="space-y-3">
              <div>
                <Label>Email *</Label>
                <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@email.com" />
              </div>
              <div>
                <Label>Name (optional)</Label>
                <Input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <Label>Assign Role *</Label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  {ROLES.map(role => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>
              </div>
            </div>
            {inviteLink && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-700 font-semibold mb-1">Invitation sent! You can also share this link:</p>
                <div className="flex items-center gap-2">
                  <input readOnly value={inviteLink} className="flex-1 text-xs bg-white px-2 py-1 border rounded truncate" />
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Link copied!') }}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
            <Button onClick={handleInvite} disabled={actionLoading === 'invite'} className="w-full bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold">
              {actionLoading === 'invite' ? 'Sending...' : 'Send Invitation Email'}
            </Button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddUserModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#0a1628]">Add New User</h2>
              <button onClick={() => setShowAddUserModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500">Create a new account directly with a set password and role.</p>
            <div className="space-y-3">
              <div>
                <Label>Email *</Label>
                <Input value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="user@email.com" type="email" />
              </div>
              <div>
                <Label>Full Name</Label>
                <Input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <Label>Password *</Label>
                <Input value={addPassword} onChange={e => setAddPassword(e.target.value)} placeholder="Min 6 characters" type="password" />
              </div>
              <div>
                <Label>Role *</Label>
                <select value={addRole} onChange={e => setAddRole(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  {ROLES.map(role => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button onClick={handleAddUser} disabled={actionLoading === 'add'} className="w-full bg-[#0a1628] hover:bg-[#1a2c48] text-white font-semibold">
              {actionLoading === 'add' ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
