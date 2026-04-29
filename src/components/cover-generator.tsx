'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles, Search, Image as ImageIcon, Check, X, Download,
  Palette, RefreshCw, Wand2, Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface CoverGeneratorProps {
  courseTitle: string
  courseCategory?: string
  courseDescription?: string
  onSelectCover: (url: string) => void
  currentThumbnail?: string
}

interface CoverConcept {
  name: string
  description: string
  searchKeywords: string
  overlayColor: string
  textPosition: string
  textSize: string
  accentElement: string
}

interface StockImage {
  id: string
  url: string
  thumb: string
  alt: string
  credit: string
}

export default function CoverGenerator({
  courseTitle, courseCategory, courseDescription, onSelectCover, currentThumbnail
}: CoverGeneratorProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'ai' | 'stock'>('ai')
  const [generating, setGenerating] = useState(false)
  const [concepts, setConcepts] = useState<CoverConcept[]>([])
  const [stockImages, setStockImages] = useState<StockImage[]>([])
  const [stockSearch, setStockSearch] = useState(courseTitle)
  const [searchingStock, setSearchingStock] = useState(false)
  const [selectedConcept, setSelectedConcept] = useState<CoverConcept | null>(null)
  const [conceptStockImages, setConceptStockImages] = useState<StockImage[]>([])
  const [rendering, setRendering] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Generate AI concepts
  const generateConcepts = async () => {
    if (!courseTitle) { toast.error('Course title is required'); return }
    setGenerating(true)
    setConcepts([])
    try {
      const res = await fetch('/api/cover-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: courseTitle, category: courseCategory, description: courseDescription }),
      })
      const data = await res.json()
      if (data.concepts) {
        setConcepts(data.concepts)
        toast.success(`${data.concepts.length} cover concepts generated!`)
      } else {
        toast.error(data.error || 'Failed to generate')
      }
    } catch { toast.error('Failed to generate concepts') }
    setGenerating(false)
  }

  // Search stock images
  const searchStock = async (query?: string) => {
    const q = query || stockSearch
    if (!q) return
    setSearchingStock(true)
    try {
      const res = await fetch(`/api/stock-images?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (data.images) setStockImages(data.images)
    } catch { toast.error('Failed to search') }
    setSearchingStock(false)
  }

  // When a concept is selected, search for matching stock images
  const selectConcept = async (concept: CoverConcept) => {
    setSelectedConcept(concept)
    setSearchingStock(true)
    try {
      const res = await fetch(`/api/stock-images?q=${encodeURIComponent(concept.searchKeywords)}`)
      const data = await res.json()
      if (data.images) setConceptStockImages(data.images)
    } catch {}
    setSearchingStock(false)
  }

  // Render final cover with overlay on canvas
  const renderCover = async (imageUrl: string, concept?: CoverConcept) => {
    setRendering(true)
    const canvas = canvasRef.current
    if (!canvas) { setRendering(false); return }
    const ctx = canvas.getContext('2d')
    if (!ctx) { setRendering(false); return }

    canvas.width = 1280
    canvas.height = 720

    try {
      // Load background image
      const img = new window.Image()
      img.crossOrigin = 'anonymous'

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Image load failed'))
        img.src = imageUrl
      })

      // Draw background
      ctx.drawImage(img, 0, 0, 1280, 720)

      // Apply gradient overlay
      const gradient = ctx.createLinearGradient(0, 0, 0, 720)
      gradient.addColorStop(0, 'rgba(11,28,61,0.35)')
      gradient.addColorStop(0.6, 'rgba(11,28,61,0.6)')
      gradient.addColorStop(1, 'rgba(11,28,61,0.9)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 1280, 720)

      // Logo text
      ctx.fillStyle = '#C9A24A'
      ctx.font = 'bold 18px Georgia, serif'
      ctx.letterSpacing = '3px'
      ctx.fillText('OGN UNIVERSITY', 80, 60)
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = '10px Arial, sans-serif'
      ctx.fillText('OVERCOMERS GLOBAL NETWORK', 80, 78)

      // Title
      const pos = concept?.textPosition || 'center'
      const titleSize = courseTitle.length > 30 ? 42 : 56
      ctx.font = `bold ${titleSize}px Georgia, 'Times New Roman', serif`
      ctx.fillStyle = '#FFFFFF'
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetY = 3

      const displayTitle = courseTitle.length > 45 ? courseTitle.substring(0, 45) + '...' : courseTitle

      if (pos === 'center') {
        ctx.textAlign = 'center'
        // Gold accent line
        ctx.shadowBlur = 0
        ctx.fillStyle = '#C9A24A'
        ctx.fillRect(540, 300, 200, 3)
        ctx.fillStyle = '#FFFFFF'
        ctx.shadowBlur = 8
        ctx.fillText(displayTitle, 640, 380)
      } else {
        ctx.textAlign = 'start'
        ctx.shadowBlur = 0
        ctx.fillStyle = '#C9A24A'
        ctx.fillRect(80, 520, 60, 3)
        ctx.fillStyle = '#FFFFFF'
        ctx.shadowBlur = 8
        ctx.fillText(displayTitle, 80, 580)
      }

      // Subtitle / category
      ctx.shadowBlur = 0
      if (courseCategory) {
        ctx.font = '22px Arial, sans-serif'
        ctx.fillStyle = '#C9A24A'
        if (pos === 'center') {
          ctx.textAlign = 'center'
          ctx.fillText(courseCategory, 640, 420)
        } else {
          ctx.textAlign = 'start'
          ctx.fillText(courseCategory, 80, 620)
        }
      }

      // Bottom bar
      ctx.fillStyle = 'rgba(11,28,61,0.9)'
      ctx.fillRect(0, 690, 1280, 30)
      ctx.fillStyle = '#C9A24A'
      ctx.font = '11px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('EDUCATE  •  EQUIP  •  EVOLVE', 640, 710)

      // Get final image
      const finalUrl = canvas.toDataURL('image/jpeg', 0.92)
      setPreviewUrl(finalUrl)
      toast.success('Cover rendered! Click "Apply" to use it.')
    } catch (err) {
      toast.error('Failed to render cover. Try a different image.')
    }
    setRendering(false)
  }

  // Upload the rendered cover to Supabase and apply
  const applyCover = async () => {
    if (!previewUrl) return
    // Convert data URL to blob
    const res = await fetch(previewUrl)
    const blob = await res.blob()

    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const fileName = `cover-${Date.now()}.jpg`
    const { error } = await supabase.storage.from('course-thumbnails').upload(fileName, blob)
    if (error) { toast.error('Upload failed: ' + error.message); return }
    const { data } = supabase.storage.from('course-thumbnails').getPublicUrl(fileName)
    onSelectCover(data.publicUrl)
    toast.success('Cover applied!')
    setOpen(false)
    setPreviewUrl(null)
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227]/10">
        <Wand2 className="w-4 h-4 mr-2" /> Generate Cover
      </Button>
    )
  }

  return (
    <Card className="border-[#c9a227] border-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base text-[#0a1628] flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-[#c9a227]" /> Course Cover Generator
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setPreviewUrl(null) }}><X className="w-4 h-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hidden canvas for rendering */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Preview */}
        {previewUrl && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-[#0a1628]">Preview:</p>
            <img src={previewUrl} alt="Cover preview" className="w-full rounded-lg border shadow-md" />
            <div className="flex gap-2">
              <Button onClick={applyCover} className="flex-1 bg-[#c9a227] hover:bg-[#b8941f] text-[#0a1628] font-semibold">
                <Check className="w-4 h-4 mr-2" /> Apply Cover
              </Button>
              <Button variant="outline" onClick={() => setPreviewUrl(null)}>
                <RefreshCw className="w-4 h-4 mr-2" /> Try Another
              </Button>
            </div>
          </div>
        )}

        {!previewUrl && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button onClick={() => setTab('ai')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tab === 'ai' ? 'bg-[#0a1628] text-[#c9a227]' : 'text-gray-500 hover:bg-gray-200'}`}>
                <Sparkles className="w-4 h-4 inline mr-1" /> AI Generated
              </button>
              <button onClick={() => { setTab('stock'); if (stockImages.length === 0) searchStock() }} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tab === 'stock' ? 'bg-[#0a1628] text-[#c9a227]' : 'text-gray-500 hover:bg-gray-200'}`}>
                <ImageIcon className="w-4 h-4 inline mr-1" /> Stock Images
              </button>
            </div>

            {/* AI Tab */}
            {tab === 'ai' && (
              <div className="space-y-3">
                <Button onClick={generateConcepts} disabled={generating} className="w-full bg-[#0a1628] text-[#c9a227] hover:bg-[#1a3a5c]">
                  {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {generating ? 'Generating Concepts...' : 'Generate AI Cover Concepts'}
                </Button>

                {concepts.length > 0 && !selectedConcept && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[#0a1628]">Select a concept:</p>
                    {concepts.map((c, i) => (
                      <button key={i} onClick={() => selectConcept(c)}
                        className="w-full text-left p-3 rounded-lg border hover:border-[#c9a227] hover:bg-[#c9a227]/5 transition-all">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-[#0a1628] text-[#c9a227] text-[10px]">{i + 1}</Badge>
                          <span className="text-sm font-semibold text-[#0a1628]">{c.name}</span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{c.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Palette className="w-3 h-3 text-gray-400" />
                          <span className="text-[10px] text-gray-500">Keywords: {c.searchKeywords}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedConcept && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-[#0a1628]">
                        Concept: <span className="text-[#c9a227]">{selectedConcept.name}</span>
                      </p>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedConcept(null); setConceptStockImages([]) }}>
                        <X className="w-3 h-3 mr-1" /> Back
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">{selectedConcept.description}</p>
                    {searchingStock ? (
                      <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#c9a227]" /><p className="text-xs text-gray-400 mt-2">Finding matching images...</p></div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {conceptStockImages.map((img) => (
                          <button key={img.id} onClick={() => renderCover(img.url, selectedConcept)} disabled={rendering}
                            className="relative aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-[#c9a227] transition-all group">
                            <img src={img.thumb} alt={img.alt} className="w-full h-full object-cover" loading="lazy" />
                            <div className="absolute inset-0 bg-[#0a1628]/0 group-hover:bg-[#0a1628]/40 transition-all flex items-center justify-center">
                              <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">Use this</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {rendering && (
                      <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#c9a227]" /><p className="text-xs text-gray-400 mt-2">Rendering cover...</p></div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Stock Tab */}
            {tab === 'stock' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input value={stockSearch} onChange={(e) => setStockSearch(e.target.value)} placeholder="Search images..." className="pl-9"
                      onKeyDown={(e) => e.key === 'Enter' && searchStock()} />
                  </div>
                  <Button onClick={() => searchStock()} disabled={searchingStock} variant="outline">
                    {searchingStock ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>

                {searchingStock ? (
                  <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#c9a227]" /></div>
                ) : stockImages.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {stockImages.map((img) => (
                      <button key={img.id} onClick={() => renderCover(img.url)} disabled={rendering}
                        className="relative aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-[#c9a227] transition-all group">
                        <img src={img.thumb} alt={img.alt} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-[#0a1628]/0 group-hover:bg-[#0a1628]/40 transition-all flex items-center justify-center">
                          <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">Apply branding</span>
                        </div>
                        <span className="absolute bottom-1 right-1 text-[8px] text-white/60 bg-black/40 px-1 rounded">{img.credit}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 text-sm py-6">Search for stock images above</p>
                )}
                {rendering && (
                  <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#c9a227]" /><p className="text-xs text-gray-400 mt-2">Applying branding overlay...</p></div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
