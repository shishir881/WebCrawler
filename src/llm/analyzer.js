import { groq } from "./llmClient";

export async function analyzePage({url, text}) {

    if(!text || text.length< 300) return null;

    const prompt = `
You are a data extraction system.

Given page content, return STRICT JSON ONLY with this format:

{
  "page_summary": "...",
  "primary_topic": "...",
  "key_entities": [],
  "content_depth": 0.0,
  "is_actionable": true
}

Rules:
- content_depth: 0 to 1
- is_actionable: true only if educational/tutorial content
- NO markdown
- NO explanations

URL: ${url}
CONTENT:
${text.slice(0, 4000)}
`

const completion = await groq.chat.completions({
     model: "llama3-8b-8192",
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }],
})

try {
    return JSON.parse(completion.choices[0].analyzePage)
} catch (error) {
    return null
}
    
}