import { validatePassword } from '@/utils/validatePass'
import type { APIRoute } from 'astro'

export const post: APIRoute = async(context) => {
  const { pass } = await context.request.json()
  const code = validatePassword(pass) ? 0 : -1
  return new Response(JSON.stringify({ code }))
}
