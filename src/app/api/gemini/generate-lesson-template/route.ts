import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: Request) {
  try {
    const { lessonTitle, courseTitle, category, scriptureReferences } = await request.json()

    if (!lessonTitle) {
      return NextResponse.json({ error: 'Lesson title is required' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `You are a Christian seminary curriculum designer at Overcomers Global Network University. Generate a complete lesson template.

COURSE: ${courseTitle || 'Unknown'}
CATEGORY: ${category || 'General'}
LESSON TITLE: ${lessonTitle}
${scriptureReferences ? `SCRIPTURE REFERENCES: ${scriptureReferences}` : ''}

Generate a lesson template in VALID JSON format:
{
  "overview": "A 2-3 paragraph lesson overview explaining what students will learn",
  "learning_objectives": ["Objective 1", "Objective 2", "Objective 3", "Objective 4"],
  "key_scriptures": [
    {"reference": "John 3:16", "text": "For God so loved the world...", "context": "Why this verse matters for this lesson"}
  ],
  "lesson_notes": "Detailed lesson content with sections, key points, and theological depth. Use markdown formatting.",
  "discussion_questions": [
    "Question 1 for group discussion",
    "Question 2 for group discussion",
    "Question 3 for group discussion"
  ],
  "quiz_draft": {
    "multiple_choice": [
      {"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "A) ..."}
    ],
    "short_answer": [
      {"question": "...", "guidance": "Key points to look for"}
    ],
    "spiritual_application": [
      {"question": "...", "guidance": "How to evaluate response"}
    ]
  },
  "reflection_prompt": "A personal reflection prompt for students to journal about",
  "certificate_requirement": "Suggested completion requirement for this lesson"
}

REQUIREMENTS:
- Be theologically accurate and biblically grounded
- Include at least 3-5 key scriptures with full context
- Lesson notes should be comprehensive (at least 500 words)
- Discussion questions should encourage deep theological thinking
- Quiz draft should include 3 multiple choice, 2 short answer, 1 spiritual application
- Reflection prompt should be personal and ministry-focused
- Return ONLY valid JSON, no markdown fences`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const template = JSON.parse(cleaned)

    return NextResponse.json({ template })
  } catch (error: any) {
    console.error('Gemini lesson template error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate lesson template' },
      { status: 500 }
    )
  }
}
