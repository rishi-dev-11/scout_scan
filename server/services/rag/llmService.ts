import axios from 'axios';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'meta-llama/llama-3.2-3b-instruct:free';

export async function askWithContext(question: string, context: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not set in .env');
  }

  const systemPrompt =
    'You are a security assistant. Use only the provided context from OWASP, CWE, cheat sheets, and secure coding guides. ' +
    'Explain clearly and give practical, secure steps. If something is not in the context, say you are not sure.';

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content:
        `Question:\n${question}\n\n` +
        `Context:\n${context}\n\n` +
        'Answer based only on the context above. Provide explanation and concrete remediation steps.'
    }
  ];

  const res = await axios.post(
    OPENROUTER_URL,
    {
      model: MODEL,
      messages
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      timeout: 60000
    }
  );

  const text = res.data.choices?.[0]?.message?.content?.trim() || '';
  return text;
}
