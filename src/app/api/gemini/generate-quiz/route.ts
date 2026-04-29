import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: Request) {
  try {
    const { lessonTitle, lessonNotes, scriptureReferences, videoDescription, pdfText } = await request.json()

    if (!lessonTitle) {
      return NextResponse.json({ error: 'Lesson title is required' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `You are a Christian seminary professor at Overcomers Global Network University. Generate a quiz for the following lesson.

LESSON TITLE: ${lessonTitle}
${lessonNotes ? `LESSON NOTES: ${lessonNotes}` : ''}
${scriptureReferences ? `SCRIPTURE REFERENCES: ${scriptureReferences}` : ''}
${videoDescription ? `VIDEO DESCRIPTION: ${videoDescription}` : ''}
${pdfText ? `PDF CONTENT (excerpt): ${pdfText.substring(0, 3000)}` : ''}

Generate a quiz in VALID JSON format with EXACTLY this structure:
{
  "title": "Quiz: [lesson title]",
  "description": "Brief quiz description",
  "passing_score": 70,
  "questions": [
    {
      "question_text": "...",
      "question_type": "multiple_choice",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A) ...",
      "points": 2,
      "teacher_review_required": false
    },
    {
      "question_text": "...",
      "question_type": "short_answer",
      "options": null,
      "correct_answer": "Expected key points...",
      "points": 5,
      "teacher_review_required": true
    },
    {
      "question_text": "...",
      "question_type": "spiritual_application",
      "options": null,
      "correct_answer": "Guidance for teacher review...",
      "points": 5,
      "teacher_review_required": true
    }
  ]
}

REQUIREMENTS:
- Generate exactly 5 multiple choice questions (auto-graded, 2 points each)
- Generate exactly 3 short answer questions (teacher reviewed, 5 points each)
- Generate exactly 2 spiritual application questions (teacher reviewed, 5 points each)
- All questions must be biblically sound and theologically accurate
- Multiple choice must have 4 options labeled A) B) C) D)
- Short answer correct_answer should contain key points for teacher reference
- Spiritual application questions should ask students to apply the lesson to their life/ministry
- Return ONLY valid JSON, no markdown, no code fences`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    // Clean potential markdown code fences
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const quiz = JSON.parse(cleaned)

    return NextResponse.json({ quiz })
  } catch (error: any) {
    console.error('Gemini quiz generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate quiz' },
      { status: 500 }
    )
  }
}
