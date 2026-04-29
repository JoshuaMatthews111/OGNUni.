// OGN University Branding Constants
export const OGN = {
  name: 'OGN University',
  fullName: 'Overcomers Global Network University',
  tagline: 'Educate • Equip • Evolve',
  logo: '/assets/ogn-university-logo-transparent.png',
  logoSmall: '/assets/ogn-logo-small.png',
  colors: {
    navy: '#0a1628',
    navyLight: '#0f2341',
    navyMid: '#1a3a5c',
    gold: '#c9a227',
    goldLight: '#d4af37',
    goldMuted: '#b8941f',
    white: '#ffffff',
    offWhite: '#f8f9fa',
    gray: '#6b7280',
    grayLight: '#e5e7eb',
  },
} as const

export const ROLES = ['super_admin', 'prophet', 'teacher', 'minister', 'student'] as const
export type UserRole = (typeof ROLES)[number]

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Administrator',
  prophet: 'Prophet',
  teacher: 'Teacher',
  minister: 'Minister',
  student: 'Student',
}

export const ROLE_PERMISSIONS = {
  super_admin: ['manage_everything', 'view_revenue', 'manage_users', 'manage_courses', 'manage_quizzes', 'manage_certificates', 'manage_payments', 'moderate_comments', 'create_posts', 'publish_courses'],
  prophet: ['manage_courses', 'manage_quizzes', 'manage_certificates', 'publish_courses', 'create_posts', 'moderate_comments'],
  teacher: ['manage_assigned_courses', 'reply_discussions', 'review_quizzes', 'create_posts'],
  minister: ['reply_discussions', 'moderate_comments', 'assist_students', 'create_posts'],
  student: ['view_enrolled', 'take_quizzes', 'comment', 'view_certificates'],
} as const

export const COURSE_CATEGORIES = [
  'Foundational Teachings',
  'Christology',
  'Soteriology',
  'Pneumatology',
  'Prophetic Training',
  'Ministry Leadership',
  'Spiritual Formation',
] as const

export const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'students_only', label: 'Students Only' },
  { value: 'paid_only', label: 'Paid Students Only' },
] as const

export function hasPermission(role: string, permission: string): boolean {
  if (role === 'super_admin') return true
  const perms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] as readonly string[] | undefined
  return perms?.includes(permission) ?? false
}

export function canAccessAdmin(role: string): boolean {
  return ['super_admin', 'prophet', 'teacher', 'minister'].includes(role)
}

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
    /(?:youtu\.be\/)([^?\s]+)/,
    /(?:youtube\.com\/live\/)([^?\s]+)/,
    /(?:youtube\.com\/embed\/)([^?\s]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`
}
