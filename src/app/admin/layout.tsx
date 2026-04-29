'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { canAccessAdmin, ROLE_LABELS } from '@/lib/constants'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Settings,
  MessageSquare,
  FileCheck,
  DollarSign,
  GraduationCap,
  Award,
  CreditCard,
  PenSquare,
  MessagesSquare,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Plus,
  Sparkles,
  Megaphone,
  Menu,
  X,
  ClipboardList,
  FileText,
  BarChart3,
  Shield,
} from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const checkUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      router.push('/')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (!profile || !canAccessAdmin(profile.role)) {
      router.push('/')
      return
    }

    setUser(profile)
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const isSuperAdmin = user?.role === 'super_admin'

  const navSections = [
    {
      items: [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/users', label: 'Users', icon: Users },
        { href: '/admin/courses', label: 'Courses', icon: BookOpen },
        { href: '/admin/lessons', label: 'Lessons', icon: FileText },
        { href: '/admin/enrollments', label: 'Enrollments', icon: FileCheck },
        { href: '/admin/quizzes', label: 'Quizzes & Tests', icon: ClipboardList },
        { href: '/admin/community', label: 'Discussions', icon: MessagesSquare },
        { href: '/admin/certificates', label: 'Certificates', icon: Award },
        { href: '/admin/comments', label: 'Messages', icon: MessageSquare },
      ],
    },
    ...(isSuperAdmin ? [{
      items: [
        { href: '/admin/payments', label: 'Payments', icon: CreditCard },
        { href: '/admin/revenue', label: 'Reports & Analytics', icon: BarChart3 },
        { href: '/admin/settings', label: 'Settings', icon: Settings },
        { href: '/admin/system', label: 'System Logs', icon: Shield },
      ],
    }] : []),
  ]

  const quickActions = [
    { label: 'Create New Course', href: '/admin/courses/new', icon: Plus },
    { label: 'Add New Lesson', href: '/admin/lessons/new', icon: FileText },
    { label: 'Create Announcement', href: '/admin/community/new', icon: Megaphone },
    { label: 'Generate AI Quiz', href: '/admin/quizzes/generate', icon: Sparkles },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1628]">
        <div className="text-center">
          <Image src="/assets/ogn-logo-small.png" alt="OGN" width={100} height={80} className="mx-auto mb-4 object-contain" />
          <div className="w-12 h-12 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#c9a227] font-medium">Loading Admin Portal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="flex">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-0 left-0 z-50 w-[260px] h-screen overflow-y-auto bg-[#0a1628] text-white transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Logo */}
          <div className="p-4 flex flex-col items-center border-b border-[#1a3a5c]">
            <Image src="/assets/ogn-logo-small.png" alt="OGN University" width={80} height={64} className="mb-2 object-contain" />
            <h2 className="text-sm font-bold text-[#c9a227] tracking-wide">OGN UNIVERSITY</h2>
            <p className="text-[10px] text-gray-400 tracking-widest">OVERCOMERS GLOBAL NETWORK</p>
          </div>

          {/* Admin Portal badge */}
          <div className="mx-4 mt-4 mb-2">
            <div className="bg-[#c9a227] text-[#0a1628] text-xs font-bold text-center py-1.5 rounded-md tracking-wide">
              ADMIN PORTAL
            </div>
          </div>

          {/* Nav */}
          <nav className="px-2 mt-2 space-y-0.5">
            {navSections.map((section, si) => (
              <div key={si}>
                {si > 0 && <div className="border-t border-[#1a3a5c] my-3 mx-2" />}
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
                        isActive
                          ? 'bg-[#c9a227] text-[#0a1628] font-semibold shadow-lg shadow-[#c9a227]/20'
                          : 'text-gray-300 hover:bg-[#1a3a5c] hover:text-white'
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>

          {/* Quick Actions */}
          <div className="px-4 mt-6">
            <p className="text-[11px] text-gray-500 font-semibold tracking-wider mb-2 px-1">QUICK ACTIONS</p>
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-[#c9a227] transition-colors"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{action.label}</span>
                </Link>
              )
            })}
          </div>

          {/* User profile at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#1a3a5c] bg-[#0a1628]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1a3a5c] flex items-center justify-center text-[#c9a227] font-bold text-sm">
                {user?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.full_name || 'Admin'}</p>
                <p className="text-[10px] text-[#c9a227]">{ROLE_LABELS[user?.role] || user?.role}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-[10px] text-green-400">Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pb-24" />
        </aside>

        {/* Main area */}
        <div className="flex-1 min-w-0">
          {/* Top header */}
          <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-lg font-bold text-[#0a1628]">Admin Dashboard</h1>
                  <p className="text-xs text-gray-500">
                    Welcome back, <span className="text-[#c9a227] font-medium">{user?.full_name}</span>!
                  </p>
                </div>
              </div>

              <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users, courses, lessons, etc..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="relative p-2 rounded-lg hover:bg-gray-100">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </button>

                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#0a1628] flex items-center justify-center text-[#c9a227] font-bold text-xs">
                      {user?.full_name?.charAt(0) || 'A'}
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border z-50 py-1">
                        <Link href="/dashboard" className="block px-4 py-2 text-sm hover:bg-gray-50">Student View</Link>
                        <Link href="/admin/settings" className="block px-4 py-2 text-sm hover:bg-gray-50">Settings</Link>
                        <hr className="my-1" />
                        <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2">
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="p-4 lg:p-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-gray-200 bg-white px-8 py-4 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Image src="/assets/ogn-logo-small.png" alt="" width={20} height={16} className="object-contain" />
              <span className="font-semibold text-[#0a1628]">OGN UNIVERSITY</span>
              <span>•</span>
              <span className="text-[#c9a227]">Educate • Equip • Evolve</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">&copy; {new Date().getFullYear()} Overcomers Global Network University. All Rights Reserved.</p>
          </footer>
        </div>
      </div>
    </div>
  )
}
