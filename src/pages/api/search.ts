import type { APIRoute } from 'astro'
import { fetch } from "undici";

export const post: APIRoute = async (context) => {
  const { q } = await context.request.json()

  const response = await fetch('https://google.serper.dev/search', {
    method: 'post',
    headers: {
      'X-API-KEY': process.env.SERPER_KEY,
      'Content-Type': 'application/json'
    } as any,
    body: JSON.stringify({ q })
  })

  return new Response(await response.text(), {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
