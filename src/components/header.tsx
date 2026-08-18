'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AuthModal } from './auth-modal'
import { Menu, X, User, BookOpen, LayoutDashboard, Settings, LogOut, Shield, ChevronDown, Library } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function Header() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    checkAuth()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { checkAuth() })
    return () => { subscription.unsubscribe() }
  }, [])

  const checkAuth = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    setUser(authUser)
    if (authUser) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
      setProfile(prof)
    } else {
      setProfile(null)
    }
    setAuthChecked(true)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setShowProfileMenu(false)
    window.location.href = '/'
  }

  const handleSignIn = () => { setAuthMode('signin'); setShowAuthModal(true); setMobileMenuOpen(false) }
  const handleSignUp = () => { setAuthMode('signup'); setShowAuthModal(true); setMobileMenuOpen(false) }

  const isAdmin = profile && ['super_admin', 'prophet', 'teacher', 'minister'].includes(profile.role)
  const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '?'

  return (
    <>
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/assets/ogn-logo-small.png" alt="Overcomers Global Network University" width={56} height={56} className="h-10 w-10 sm:h-14 sm:w-14 object-contain" />
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-[#0a1628] leading-tight">OGN University</p>
                <p className="text-[10px] tracking-[2px] text-[#c9a227] font-semibold">EDUCATE • EQUIP • EVOLVE</p>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-[#0a1628] hover:text-[#c9a227] font-medium">HOME</Link>
              <Link href="/courses" className="text-[#0a1628] hover:text-[#c9a227] font-medium">COURSES</Link>
              <Link href="/store" className="text-[#0a1628] hover:text-[#c9a227] font-medium">STORE</Link>
              <Link href="/contact" className="text-[#0a1628] hover:text-[#c9a227] font-medium">CONTACT</Link>
              <Link href="/about" className="text-[#0a1628] hover:text-[#c9a227] font-medium">ABOUT US</Link>

              {/* Auth-aware buttons */}
              {authChecked && !user && (
                <>
                  <button onClick={handleSignIn} className="text-[#0a1628] hover:text-[#c9a227] font-medium">SIGN IN</button>
                  <Button onClick={handleSignUp} className="bg-[#c9a227] border-2 border-[#c9a227] text-[#0a1628] hover:bg-[#0a1628] hover:text-[#c9a227] rounded-full px-8 font-semibold">SIGN UP</Button>
                </>
              )}

              {/* Profile dropdown for logged-in users */}
              {authChecked && user && (
                <div className="relative">
                  <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-gray-100 transition-colors">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-[#c9a227]" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#0a1628] text-[#c9a227] flex items-center justify-center text-xs font-bold border-2 border-[#c9a227]">{initials}</div>
                    )}
                    <span className="text-sm font-medium text-[#0a1628] hidden lg:inline">{profile?.full_name?.split(' ')[0] || 'Account'}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>

                  {showProfileMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border z-50 py-2">
                        <div className="px-4 py-3 border-b">
                          <p className="text-sm font-semibold text-[#0a1628]">{profile?.full_name}</p>
                          <p className="text-xs text-gray-400">{user?.email}</p>
                          <p className="text-[10px] text-[#c9a227] font-semibold mt-0.5 capitalize">{profile?.role?.replace('_', ' ')}</p>
                        </div>
                        <div className="py-1">
                          <Link href="/dashboard" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                            <LayoutDashboard className="w-4 h-4" /> Dashboard
                          </Link>
                          <Link href="/courses" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                            <BookOpen className="w-4 h-4" /> My Courses
                          </Link>
                          <Link href="/library" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                            <Library className="w-4 h-4" /> My Library
                          </Link>
                          {isAdmin && (
                            <Link href="/admin" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#c9a227] hover:bg-[#c9a227]/5 font-medium">
                              <Shield className="w-4 h-4" /> Admin Panel
                            </Link>
                          )}
                        </div>
                        <div className="border-t py-1">
                          <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left">
                            <LogOut className="w-4 h-4" /> Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </nav>

            {/* Mobile */}
            <div className="flex items-center gap-2 md:hidden">
              {authChecked && !user && (
                <>
                  <Button onClick={handleSignIn} variant="ghost" size="sm" className="text-[#0a1628] font-semibold text-xs">SIGN IN</Button>
                  <Button onClick={handleSignUp} size="sm" className="bg-[#c9a227] text-[#0a1628] font-semibold text-xs rounded-full px-4">SIGN UP</Button>
                </>
              )}
              {authChecked && user && (
                <Link href="/dashboard" className="flex items-center gap-1.5 px-2 py-1.5 rounded-full bg-[#0a1628] text-[#c9a227]">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#c9a227]/20 flex items-center justify-center text-[10px] font-bold">{initials}</div>
                  )}
                  <span className="text-xs font-semibold pr-1">{profile?.full_name?.split(' ')[0] || 'Me'}</span>
                </Link>
              )}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-[#0a1628] hover:bg-gray-100 rounded-lg">
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <nav className="container mx-auto px-4 py-3 flex flex-col gap-1">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-[#0a1628] hover:bg-[#c9a227]/10 hover:text-[#c9a227] font-medium rounded-lg">HOME</Link>
              <Link href="/courses" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-[#0a1628] hover:bg-[#c9a227]/10 hover:text-[#c9a227] font-medium rounded-lg">COURSES</Link>
              <Link href="/store" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-[#0a1628] hover:bg-[#c9a227]/10 hover:text-[#c9a227] font-medium rounded-lg">STORE</Link>
              <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-[#0a1628] hover:bg-[#c9a227]/10 hover:text-[#c9a227] font-medium rounded-lg">CONTACT</Link>
              <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-[#0a1628] hover:bg-[#c9a227]/10 hover:text-[#c9a227] font-medium rounded-lg">ABOUT US</Link>
              <div className="border-t my-2" />
              {authChecked && !user && (
                <div className="flex gap-2 px-4 py-2">
                  <Button onClick={handleSignIn} variant="outline" className="flex-1 font-semibold border-[#0a1628] text-[#0a1628]">SIGN IN</Button>
                  <Button onClick={handleSignUp} className="flex-1 bg-[#c9a227] text-[#0a1628] font-semibold">SIGN UP</Button>
                </div>
              )}
              {authChecked && user && (
                <div className="px-4 py-2 space-y-1">
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-[#0a1628] hover:bg-gray-50 rounded-lg font-medium">
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-[#c9a227] hover:bg-[#c9a227]/5 rounded-lg font-medium">
                      <Shield className="w-4 h-4" /> Admin Panel
                    </Link>
                  )}
                  <button onClick={() => { setMobileMenuOpen(false); handleSignOut() }} className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium w-full">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} mode={authMode} onModeChange={setAuthMode} />
    </>
  )
}
