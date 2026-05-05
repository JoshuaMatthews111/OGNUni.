import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Models to try in order (fallback chain)
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']

export async function generateWithRetry(
  prompt: string,
  options?: { maxRetries?: number; delayMs?: number }
): Promise<string> {
  const maxRetries = options?.maxRetries ?? 3
  const baseDelay = options?.delayMs ?? 2000

  for (const modelName of MODELS) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent(prompt)
        const response = result.response
        const text = response.text()
        if (text) return text
      } catch (error: any) {
        const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED')
        const isOverloaded = error?.status === 503 || error?.message?.includes('overloaded') || error?.message?.includes('unavailable')

        if (isRateLimit || isOverloaded) {
          // Exponential backoff
          const delay = baseDelay * Math.pow(2, attempt)
          console.warn(`AI ${modelName} attempt ${attempt + 1} failed (${isRateLimit ? 'rate limit' : 'overloaded'}), retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        // For other errors on last attempt of this model, try next model
        if (attempt === maxRetries - 1) {
          console.warn(`AI ${modelName} failed after ${maxRetries} attempts, trying next model...`)
          break
        }

        // Wait briefly before retry for non-rate-limit errors
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  throw new Error('All AI models are currently unavailable. Please try again in a few minutes.')
}
