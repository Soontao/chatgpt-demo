import { extractMarkdown } from '@/utils/extract'
import { validatePass } from '@/utils/validatePass'
import type { APIRoute } from 'astro'

export const post: APIRoute = async(context) => {
  const { url, pass } = await context.request.json()
  // TODO: give summary for specific query if content is long
  const r = validatePass(pass)

  if (r)
    return r

  const md = await extractMarkdown(url)

  return new Response(JSON.stringify({ content: md }), {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
