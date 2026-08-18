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

/**
 * Hard per-file cap on Supabase storage for the current plan. Raising the bucket
 * limit above this is rejected by the API, so anything longer than a short clip
 * belongs on YouTube. Bump this if the project moves to Supabase Pro.
 */
export const STORAGE_FILE_LIMIT = 50 * 1024 * 1024

/** Buckets the app is allowed to write to. */
export const STORAGE_BUCKETS = {
  courseThumbnails: 'course-thumbnails',
  lessonMedia: 'lesson-media',
  productAudio: 'product-audio',
  productCovers: 'product-covers',
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

/**
 * Course categories — built around Prophet Joshua's actual teaching lanes
 * (Kingdom Culture, the new creation, the mind, the Watchmen's Wall, sons and
 * daughters, loyalty and honour, provision, marriage, global missions) rather
 * than generic seminary subject headings.
 *
 * Order matters: this is the order disciples see, and the dashboard builds its
 * learning path from it — so it runs foundations first, outworking later.
 */
export const COURSE_CATEGORIES = [
  'Foundational Teachings',
  'Kingdom Culture',
  'The New Creation & Identity',
  'Secrets of the Mind',
  'Faith & the Creative Power of the Word',
  'Prayer & Intercession',
  'Prophetic Training',
  'Spiritual Warfare & Deliverance',
  'Sons & Daughters',
  'Loyalty, Honour & Character',
  'Divine Health & Wholeness',
  'Provision & Stewardship',
  'Marriage, Family & Covenant',
  'Worship & the Presence of God',
  'Evangelism & Global Missions',
  'Leadership & Ministry Training',
]

/**
 * One line per category, shown under the heading when browsing. Written in the
 * voice of the teaching, not as a course-catalogue blurb.
 */
export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'Foundational Teachings': 'Where every disciple begins — the ground floor of the faith, laid properly.',
  'Kingdom Culture': 'How heaven does things, and how a citizen of that Kingdom carries themselves on earth.',
  'The New Creation & Identity': 'Who you actually became at the new birth, and how to stop living below it.',
  'Secrets of the Mind': 'The imagination, the images you carry, and the inner world where change begins.',
  'Faith & the Creative Power of the Word': 'Faith has a voice. Learning to speak, and to remain until the promise manifests.',
  'Prayer & Intercession': "The Watchmen's Wall — standing in the gap, morning and evening, for families and nations.",
  'Prophetic Training': 'Hearing, discerning, and delivering what God is saying, with accountability.',
  'Spiritual Warfare & Deliverance': 'The unseen conflict of Ephesians 6, and authority to stand in it.',
  'Sons & Daughters': 'Discipleship, spiritual parenting, and growing up into maturity.',
  'Loyalty, Honour & Character': 'The things that decide whether a gift survives — covenant, honour, and disloyalty.',
  'Divine Health & Wholeness': 'Healing, wellness, and stewarding the body as a temple.',
  'Provision & Stewardship': 'Giving, honour, money as a defence, and the mindset of provision.',
  'Marriage, Family & Covenant': 'Covenant love, godly relationships, and building a home on the Word.',
  'Worship & the Presence of God': 'Coming near, staying near, and learning the culture of His presence.',
  'Evangelism & Global Missions': 'Reaching the lost — locally, and through the nations OGN is sent to.',
  'Leadership & Ministry Training': 'Equipping leaders, ministers and workers to carry the work well.',
}

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

/**
 * The `vimeo_url` column carries two different things: a real Vimeo link, or
 * the URL of a video file uploaded straight to Supabase storage. They cannot be
 * played the same way — a storage URL pushed through the Vimeo player produces
 * a dead iframe — so callers must branch on this.
 */
export function isDirectVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false
  if (/(?:^|\.)vimeo\.com/i.test(url)) return false
  return /\.(mp4|webm|mov|m4v|mkv|ogv)(\?|#|$)/i.test(url) || url.includes('/storage/v1/object/')
}

/** Vimeo player URL, or null when the value isn't a Vimeo link we recognise. */
export function vimeoEmbedUrl(url: string | null | undefined): string | null {
  if (!url || isDirectVideoUrl(url)) return null
  const id = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1]
  return id ? `https://player.vimeo.com/video/${id}` : null
}
