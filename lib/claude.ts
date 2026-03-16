// lib/claude.ts  –  AI Block Customizer
export interface CustomizationResult {
  modifiedCode: string
  explanation: string
}

export async function customizeBlock(
  blockName: string,
  originalCode: string,
  instruction: string
): Promise<CustomizationResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 8096,
      system: `You are a senior TypeScript/Next.js developer. You receive production code blocks and customization instructions.
Return ONLY a JSON object (no markdown fences) with two fields:
- "modifiedCode": the complete modified TypeScript/TSX code as a string
- "explanation": a single sentence describing what you changed

Rules:
- Preserve TypeScript types and Next.js patterns
- Keep the same file structure and exports
- If instruction is unclear, make a reasonable assumption
- Always return valid JSON`,
      messages: [{
        role: 'user',
        content: `Block: ${blockName}\n\nInstruction: ${instruction}\n\nOriginal code:\n\`\`\`typescript\n${originalCode.slice(0, 6000)}\n\`\`\`\n\nReturn JSON only.`,
      }],
    }),
  })

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data.content[0].text.trim()
  const clean = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(clean)
}
