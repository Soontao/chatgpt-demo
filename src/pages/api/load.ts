import { fetch } from 'undici'
import { NodeHtmlMarkdown } from 'node-html-markdown'
import { validatePass } from '@/utils/validatePass'
import type { APIRoute } from 'astro'

export const post: APIRoute = async(context) => {
  const { url, pass } = await context.request.json()
  // TODO: give summary for specific query if content is long
  const r = validatePass(pass)

  if (r)
    return r

  const response = await fetch(url)

  if (response.status !== 200)
    return new Response(await response.text(), { status: response.status })

  const text = await response.text()

  const md = NodeHtmlMarkdown.translate(text)

  return new Response(JSON.stringify({ content: md }), {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
