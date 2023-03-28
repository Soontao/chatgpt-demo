// #vercel-disable-blocks
import { fetch } from 'undici'
// #vercel-end
import { validatePass } from '@/utils/validatePass'
import type { APIRoute } from 'astro'

const apiKey = import.meta.env.SERPER_KEY

export const post: APIRoute = async(context) => {
  const { q, pass } = await context.request.json()

  const r = validatePass(pass)

  if (r)
    return r

  const response = await fetch(
    'https://google.serper.dev/search',
    {
      method: 'post',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      } as any,
      body: JSON.stringify({ q }),
    },
  )

  return new Response(await response.text(), {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
