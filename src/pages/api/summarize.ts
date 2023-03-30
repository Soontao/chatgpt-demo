import { ProxyAgent, fetch } from 'undici'
import { extractMarkdown } from '@/utils/extract'
import { generatePayload } from '@/utils/openAI'
import { validatePass } from '@/utils/validatePass'
import type { APIRoute } from 'astro'

const apiKey = import.meta.env.OPENAI_API_KEY
const httpsProxy = import.meta.env.HTTPS_PROXY
const baseUrl = (import.meta.env.OPENAI_API_BASE_URL || 'https://api.openai.com').trim().replace(/\/$/, '')

export const post: APIRoute = async(context) => {
  const { url, pass, question } = await context.request.json()
  const r = validatePass(pass)
  if (r)
    return r

  const md = await extractMarkdown(url)

  const initOptions = generatePayload(apiKey, [
    { role: 'system', content: 'You are the best text processor, you can extract the most relevant information from text, you only need to output the information, use as less as works as possible' },
    // TODO: use vector to search large text
    { role: 'user', content: `The text is:\n${md.substring(0, 1000)}\nplease based on keywords '${question}' give me the summary` },
  ])

  if (httpsProxy)
    initOptions.dispatcher = new ProxyAgent(httpsProxy)

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const response = await fetch(`${baseUrl}/v1/chat/completions`, initOptions)

  const { error, choices } = await response.json() as any

  if (error) {
    return new Response(JSON.stringify({ error }), {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  return new Response(JSON.stringify({ message: choices?.[0]?.message }), {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
