'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { canAccessAdmin, ROLE_LABELS } from '@/lib/constants'
import { useRole } from '@/lib/role-context'
import { OnboardingTour } from '@/components/onboarding-tour'
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
  Send,
  Eye,
  ShieldCheck,
  GraduationCap as StudentIcon,
  Wand2,
  UserCircle,
  ChevronRight,
  PanelLeftClose,
  Layers,
} from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, viewMode, setViewMode, availableViews, viewLabel, canAdmin } = useRole()
  const [localLoading, setLocalLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [coursesExpanded, setCoursesExpanded] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      if (!canAdmin) {
        router.push('/dashboard')
      } else {
        setLocalLoading(false)
        // Force admin mode when on admin pages
        if (viewMode === 'student') {
          setViewMode('admin')
        }
        // Show onboarding for first-time admins
        const onboardingDone = user.onboarding_completed || (typeof window !== 'undefined' && localStorage.getItem(`ogn-onboarding-${user.id}`) === 'done')
        if (!onboardingDone) setShowOnboarding(true)
      }
    }
  }, [user, canAdmin])

  useEffect(() => {
    // If role context loaded with no user, redirect
    if (user === null && !localLoading) {
      router.push('/')
    }
  }, [user])

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    const saved = localStorage.getItem('ogn-admin-sidebar-collapsed')
    if (saved === 'true') setSidebarCollapsed(true)
    // Auto-expand courses sub-nav when on courses pages
    if (pathname.startsWith('/admin/courses') || pathname.startsWith('/admin/lessons')) setCoursesExpanded(true)
  }, [])

  useEffect(() => {
    localStorage.setItem('ogn-admin-sidebar-collapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setViewMode('student')
    router.push('/')
  }

  const handleSwitchView = (mode: 'admin' | 'teacher' | 'student') => {
    setViewMode(mode)
    setUserMenuOpen(false)
    if (mode === 'student') {
      router.push('/dashboard')
    }
  }

  const isSuperAdmin = user?.role === 'super_admin'

  const coursesSubItems = [
    { href: '/admin/courses', label: 'Course Management', icon: Layers },
    { href: '/admin/lessons', label: 'Sections & Lessons', icon: FileText },
    { href: '/admin/lessons/new', label: 'Content Creator', icon: Wand2 },
  ]

  const navSections = [
    {
      items: [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/users', label: 'Users', icon: Users },
        { href: '__courses__', label: 'Courses', icon: BookOpen, hasChildren: true },
        { href: '/admin/enrollments', label: 'Enrollments', icon: FileCheck },
        { href: '/admin/quizzes', label: 'Quizzes & Tests', icon: ClipboardList },
        { href: '/admin/community', label: 'Discussions', icon: MessagesSquare },
        { href: '/admin/certificates', label: 'Certificates', icon: Award },
        { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
        { href: '/admin/content', label: 'Content Sharing', icon: Send },
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
    { label: 'Create Content', href: '/admin/lessons/new', icon: Wand2 },
    { label: 'Create Announcement', href: '/admin/community/new', icon: Megaphone },
    { label: 'Generate AI Quiz', href: '/admin/quizzes/generate', icon: Sparkles },
  ]

  if (localLoading || !user) {
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

  const viewModeLabels: Record<string, { label: string; icon: any; color: string }> = {
    admin: { label: 'Administrator Mode', icon: ShieldCheck, color: 'bg-[#c9a227] text-[#0a1628]' },
    teacher: { label: 'Teacher Mode', icon: GraduationCap, color: 'bg-blue-500 text-white' },
    student: { label: 'Student View', icon: Eye, color: 'bg-green-500 text-white' },
  }

  const currentMode = viewModeLabels[viewMode] || viewModeLabels.admin

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {showOnboarding && user && (
        <OnboardingTour userId={user.id} role="admin" onComplete={() => setShowOnboarding(false)} />
      )}
      <div className="flex">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-0 left-0 z-50 ${sidebarCollapsed ? 'lg:w-[68px]' : 'lg:w-[260px]'} w-[260px] h-screen overflow-y-auto bg-[#0a1628] text-white transition-all duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Logo */}
          <div className={`p-4 flex flex-col items-center border-b border-[#1a3a5c] ${sidebarCollapsed ? 'px-2' : ''}`}>
            <Image src="/assets/ogn-logo-small.png" alt="OGN University" width={sidebarCollapsed ? 36 : 80} height={sidebarCollapsed ? 28 : 64} className="mb-2 object-contain" />
            {!sidebarCollapsed && <>
              <h2 className="text-sm font-bold text-[#c9a227] tracking-wide">OGN UNIVERSITY</h2>
              <p className="text-[10px] text-gray-400 tracking-widest">OVERCOMERS GLOBAL NETWORK</p>
            </>}
          </div>

          {/* Mode badge */}
          {!sidebarCollapsed && (
            <div className="mx-4 mt-4 mb-2">
              <div className={`${currentMode.color} text-xs font-bold text-center py-1.5 rounded-md tracking-wide`}>
                {currentMode.label.toUpperCase()}
              </div>
            </div>
          )}

          {/* Nav */}
          <nav className={`${sidebarCollapsed ? 'px-1' : 'px-2'} mt-2 space-y-0.5`}>
            {navSections.map((section, si) => (
              <div key={si}>
                {si > 0 && <div className="border-t border-[#1a3a5c] my-3 mx-2" />}
                {section.items.map((item: any) => {
                  const Icon = item.icon
                  if (item.hasChildren) {
                    const isCoursesActive = pathname.startsWith('/admin/courses') || pathname.startsWith('/admin/lessons')
                    return (
                      <div key={item.href}>
                        <button
                          onClick={() => { if (sidebarCollapsed) { setSidebarCollapsed(false); setCoursesExpanded(true) } else setCoursesExpanded(!coursesExpanded) }}
                          className={`w-full flex items-center gap-3 ${sidebarCollapsed ? 'px-2 justify-center' : 'px-4'} py-2.5 rounded-lg text-sm transition-all ${
                            isCoursesActive
                              ? 'bg-[#c9a227] text-[#0a1628] font-semibold shadow-lg shadow-[#c9a227]/20'
                              : 'text-gray-300 hover:bg-[#1a3a5c] hover:text-white'
                          }`}
                          title={sidebarCollapsed ? item.label : undefined}
                        >
                          <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                          {!sidebarCollapsed && <><span className="flex-1 text-left">{item.label}</span><ChevronRight className={`w-3.5 h-3.5 transition-transform ${coursesExpanded ? 'rotate-90' : ''}`} /></>}
                        </button>
                        {coursesExpanded && !sidebarCollapsed && (
                          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-[#1a3a5c] pl-3">
                            {coursesSubItems.map((sub) => {
                              const SubIcon = sub.icon
                              const subActive = pathname === sub.href || (sub.href !== '/admin/courses' && pathname.startsWith(sub.href))
                              return (
                                <Link key={sub.href} href={sub.href}
                                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                                    subActive ? 'bg-[#c9a227] text-[#0a1628] font-semibold' : 'text-gray-400 hover:bg-[#1a3a5c] hover:text-white'
                                  }`}>
                                  <SubIcon className="w-3.5 h-3.5" /><span>{sub.label}</span>
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  }
                  const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 ${sidebarCollapsed ? 'px-2 justify-center' : 'px-4'} py-2.5 rounded-lg text-sm transition-all ${
                        isActive
                          ? 'bg-[#c9a227] text-[#0a1628] font-semibold shadow-lg shadow-[#c9a227]/20'
                          : 'text-gray-300 hover:bg-[#1a3a5c] hover:text-white'
                      }`}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>

          {/* Quick Actions */}
          {!sidebarCollapsed && (
            <div className="px-4 mt-6">
              <p className="text-[11px] text-gray-500 font-semibold tracking-wider mb-2 px-1">QUICK ACTIONS</p>
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <Link key={action.href} href={action.href} className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-[#c9a227] transition-colors">
                    <Icon className="w-3.5 h-3.5" /><span>{action.label}</span>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Collapse toggle (desktop) */}
          <div className="hidden lg:block px-3 mt-4">
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-[#c9a227] hover:bg-[#1a3a5c] rounded-lg transition-colors" title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <PanelLeftClose className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
              {!sidebarCollapsed && <span>Collapse</span>}
            </button>
          </div>

          {/* User profile at bottom */}
          <div className={`absolute bottom-0 left-0 right-0 ${sidebarCollapsed ? 'p-2' : 'p-4'} border-t border-[#1a3a5c] bg-[#0a1628]`}>
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className={`${sidebarCollapsed ? 'w-8 h-8' : 'w-10 h-10'} rounded-full object-cover`} />
              ) : (
                <div className={`${sidebarCollapsed ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'} rounded-full bg-[#1a3a5c] flex items-center justify-center text-[#c9a227] font-bold`}>
                  {user?.full_name?.charAt(0) || 'A'}
                </div>
              )}
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user?.full_name || 'Admin'}</p>
                  <p className="text-[10px] text-[#c9a227]">{currentMode.label}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-[10px] text-green-400">Online</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="pb-24" />
        </aside>

        {/* Main area */}
        <div className="flex-1 min-w-0 transition-all duration-300">
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

              <div className="flex items-center gap-2 sm:gap-3">
                <button className="relative p-2 rounded-lg hover:bg-gray-100">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </button>

                {/* Profile + Role Switcher Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100"
                  >
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#0a1628] flex items-center justify-center text-[#c9a227] font-bold text-xs">
                        {user?.full_name?.charAt(0) || 'A'}
                      </div>
                    )}
                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-semibold text-[#0a1628] leading-tight">{user?.full_name}</p>
                      <p className="text-[10px] text-[#c9a227]">{currentMode.label}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-xl border z-50 py-2 overflow-hidden">
                        {/* User info header */}
                        <div className="px-4 py-3 border-b bg-gray-50">
                          <p className="text-sm font-bold text-[#0a1628]">{user?.full_name}</p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                          <p className="text-[10px] text-[#c9a227] font-semibold mt-1">{ROLE_LABELS[user?.role] || user?.role}</p>
                        </div>

                        {/* Role Switch Section */}
                        <div className="px-3 py-2 border-b">
                          <p className="text-[10px] text-gray-400 font-semibold tracking-wider mb-1.5 px-1">SWITCH VIEW</p>
                          {availableViews.map((mode) => {
                            const modeInfo = viewModeLabels[mode]
                            const ModeIcon = modeInfo.icon
                            const isActive = viewMode === mode
                            return (
                              <button
                                key={mode}
                                onClick={() => handleSwitchView(mode)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all mb-0.5 ${
                                  isActive
                                    ? 'bg-[#0a1628] text-[#c9a227] font-semibold'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                <ModeIcon className="w-4 h-4" />
                                <span>{modeInfo.label}</span>
                                {isActive && <span className="ml-auto text-[9px] bg-[#c9a227] text-[#0a1628] px-1.5 py-0.5 rounded-full font-bold">ACTIVE</span>}
                              </button>
                            )
                          })}
                        </div>

                        {/* Actions */}
                        <div className="py-1">
                          <Link href="/admin/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                            <Settings className="w-4 h-4" />
                            Account Settings
                          </Link>
                          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
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
            <p className="text-[10px] text-gray-400 mt-1">7519 Mentor Ave, Suite A106, Mentor, Ohio 44060</p>
            <p className="text-[10px] text-gray-400 mt-0.5">&copy; {new Date().getFullYear()} Overcomers Global Network University. All Rights Reserved.</p>
          </footer>
        </div>
      </div>
    </div>
  )
}
