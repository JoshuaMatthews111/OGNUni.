'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { canAccessAdmin, ROLE_LABELS } from '@/lib/constants'

type ViewMode = 'admin' | 'teacher' | 'student'

interface RoleContextType {
  user: any | null
  actualRole: string
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  availableViews: ViewMode[]
  viewLabel: string
  isViewingAsStudent: boolean
  canAdmin: boolean
  loading: boolean
  refreshUser: () => Promise<void>
}

const RoleContext = createContext<RoleContextType>({
  user: null,
  actualRole: 'student',
  viewMode: 'student',
  setViewMode: () => {},
  availableViews: ['student'],
  viewLabel: 'Student',
  isViewingAsStudent: true,
  canAdmin: false,
  loading: true,
  refreshUser: async () => {},
})

export function useRole() {
  return useContext(RoleContext)
}

function getAvailableViews(role: string): ViewMode[] {
  if (role === 'super_admin' || role === 'prophet') {
    return ['admin', 'teacher', 'student']
  }
  if (role === 'teacher') {
    return ['teacher', 'student']
  }
  if (role === 'minister') {
    return ['admin', 'student']
  }
  return ['student']
}

function getViewLabel(mode: ViewMode): string {
  switch (mode) {
    case 'admin': return 'Administrator Mode'
    case 'teacher': return 'Teacher Mode'
    case 'student': return 'Student View'
  }
}

const STORAGE_KEY = 'ogn_view_mode'

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [viewMode, setViewModeState] = useState<ViewMode>('student')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      setUser(null)
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (profile) {
      setUser(profile)
      // Restore saved view mode from localStorage
      const saved = localStorage.getItem(STORAGE_KEY)
      const available = getAvailableViews(profile.role)
      if (saved && available.includes(saved as ViewMode)) {
        setViewModeState(saved as ViewMode)
      } else {
        // Default: admin-capable users start in admin, others in student
        setViewModeState(canAccessAdmin(profile.role) ? 'admin' : 'student')
      }
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }

  const actualRole = user?.role || 'student'
  const availableViews = getAvailableViews(actualRole)
  const isViewingAsStudent = viewMode === 'student'
  const canAdmin = canAccessAdmin(actualRole)

  return (
    <RoleContext.Provider value={{
      user,
      actualRole,
      viewMode,
      setViewMode,
      availableViews,
      viewLabel: getViewLabel(viewMode),
      isViewingAsStudent,
      canAdmin,
      loading,
      refreshUser: loadUser,
    }}>
      {children}
    </RoleContext.Provider>
  )
}
