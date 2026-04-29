import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: Request) {
  try {
    const { title, category, description } = await request.json()

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `You are a professional graphic design director for a premium Christian university called "OGN University" (Overcomers Global Network).

Generate 4 different creative cover design concepts for a course titled: "${title}"
${category ? `Category: ${category}` : ''}
${description ? `Description: ${description}` : ''}

Brand guidelines:
- Colors: Deep Navy (#0B1C3D), Royal Gold (#C9A24A), White (#FFFFFF)
- Style: Premium, cinematic, ProPresenter-quality, clean hierarchy
- Logo: "OGN University" text in top-left corner
- Typography: Bold, elegant, serif-inspired

For each concept, provide:
1. A descriptive name for the concept
2. A detailed visual description (what the background looks like, imagery, composition)
3. Suggested Unsplash search keywords (3-5 words for finding relevant stock photos)
4. Color overlay suggestion (which brand color to use as overlay)
5. Text layout description (where title goes, size, alignment)

Also suggest the best subject-specific imagery. Examples:
- "Harvest" course → golden wheat fields, sunrise, growth
- "Faith" course → light rays, atmosphere, ethereal glow
- "Leadership" → strong architecture, clarity, commanding views
- "Prayer" → peaceful nature, dawn light, solitude
- "Worship" → music, light effects, celebration

Return as JSON array with exactly 4 objects:
[{
  "name": "Concept Name",
  "description": "Visual description...",
  "searchKeywords": "keyword1 keyword2 keyword3",
  "overlayColor": "rgba(11,28,61,0.7)",
  "textPosition": "center" | "bottom-left" | "bottom-center",
  "textSize": "large" | "medium",
  "accentElement": "gold line below title" | "gold border" | "logo watermark"
}]

Return ONLY the JSON array, no markdown, no explanation.`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    // Parse JSON from response
    let concepts
    try {
      const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      concepts = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
    }

    return NextResponse.json({ concepts })
  } catch (error: any) {
    console.error('Cover generation error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate covers' }, { status: 500 })
  }
}
