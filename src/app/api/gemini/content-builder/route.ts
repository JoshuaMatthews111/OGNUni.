import { NextResponse } from 'next/server'
import { generateWithRetry } from '@/lib/ai'

export async function POST(request: Request) {
  try {
    const { transcript, title, outputType, courseTitle } = await request.json()

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 })
    }

    let prompt = ''

    switch (outputType) {
      case 'summary':
        prompt = `You are a Christian seminary content writer for OGN University (Overcomers Global Network). 

Create a comprehensive lesson summary from this transcript. Include:
- **Overview** (2-3 sentences)
- **Key Points** (5-8 bullet points)
- **Key Scriptures** (list all referenced scriptures)
- **Application** (practical takeaways for ministry students)

Title: ${title || 'Untitled'}
${courseTitle ? `Course: ${courseTitle}` : ''}

Transcript:
${transcript.substring(0, 15000)}

Format using clean markdown headings and bullet points.`
        break

      case 'student_guide':
        prompt = `You are a Christian seminary professor at OGN University (Overcomers Global Network).

Create a detailed Student Study Guide from this transcript. Structure it as:

# ${title || 'Study Guide'}
${courseTitle ? `**Course:** ${courseTitle}` : ''}

## Introduction
Brief overview of the teaching

## Learning Objectives
- List 3-5 clear learning objectives

## Key Teachings
Organize the main teachings into clear sections with explanations

## Scripture References
List and briefly explain each scripture mentioned

## Key Vocabulary
Define important theological terms used

## Discussion Questions
5-7 discussion questions for group study

## Personal Application
3-5 reflection prompts for personal growth

## Notes Section
[Leave blank lines for student notes]

Transcript:
${transcript.substring(0, 15000)}

Format using clean markdown.`
        break

      case 'quiz':
        prompt = `You are a Christian seminary professor at OGN University. Generate a quiz from this transcript.

Create exactly 10 questions:
- 6 multiple choice (4 options each, mark correct answer)
- 2 short answer  
- 2 application/reflection questions

Title: ${title || 'Quiz'}

Transcript:
${transcript.substring(0, 15000)}

Return as JSON:
{
  "title": "Quiz: ${title || 'Lesson'}",
  "questions": [
    {"type": "multiple_choice", "question": "...", "options": ["A","B","C","D"], "correct_answer": "A", "explanation": "..."},
    {"type": "short_answer", "question": "...", "sample_answer": "..."},
    {"type": "application", "question": "...", "guidance": "..."}
  ]
}

Return ONLY the JSON.`
        break

      case 'discussion':
        prompt = `You are a Christian seminary facilitator at OGN University.

Generate 10 rich discussion questions from this transcript for small group or classroom use.

Include a mix of:
- Knowledge/comprehension questions (3)
- Analysis/application questions (4)  
- Spiritual reflection questions (3)

For each, include a brief facilitator note on what to look for in answers.

Title: ${title || 'Discussion'}

Transcript:
${transcript.substring(0, 15000)}

Format as numbered list with facilitator notes in italics.`
        break

      case 'blog':
        prompt = `You are a Christian writer and content creator for OGN University.

Transform this transcript into a polished, engaging blog article suitable for the OGN University website. 

Guidelines:
- Write in an accessible, inspiring tone
- Use compelling headings and subheadings
- Include scripture references naturally
- Add a strong introduction and conclusion
- Keep paragraphs short for mobile reading
- Include a call-to-action at the end pointing to OGN University courses
- Target 800-1200 words

Title: ${title || 'Blog Post'}

Transcript:
${transcript.substring(0, 15000)}

Format using clean markdown.`
        break

      default:
        prompt = `Summarize the following transcript into a well-structured document:\n\n${transcript.substring(0, 15000)}`
    }

    const content = await generateWithRetry(prompt)

    return NextResponse.json({
      content,
      outputType,
      title: title || 'Generated Content',
    })
  } catch (error: any) {
    console.error('Content builder error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate content' }, { status: 500 })
  }
}
