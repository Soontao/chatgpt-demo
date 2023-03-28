// #vercel-disable-blocks
import { fetch } from 'undici'
// #vercel-end
import { NodeHtmlMarkdown } from 'node-html-markdown'
import { validatePass } from '@/utils/validatePass'
import type { APIRoute } from 'astro'

export const post: APIRoute = async(context) => {
  const { url, pass } = await context.request.json()

  const r = validatePass(pass)

  if (r)
    return r

  const response = await fetch(url)

  if (response.status !== 200)
    return new Response('', { status: 404 })

  const text = await response.text()

  const md = NodeHtmlMarkdown.translate(text)

  return new Response(JSON.stringify({ md }), {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
