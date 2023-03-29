/* eslint-disable no-console */
import vm from 'vm'
// #vercel-disable-blocks
import { inspect } from 'util'
import { fetch } from 'undici'
// #vercel-end
import { validatePass } from '@/utils/validatePass'
import type { APIRoute } from 'astro'

export const post: APIRoute = async(context) => {
  const { pass, script } = await context.request.json()

  const r = validatePass(pass)

  if (r)
    return r

  try {
    const s = new vm.Script(script, { filename: '__user_script.js' })
    const stdOutputs = []
    const r = s.runInNewContext(
      {
        fetch,
        console: {
          ...console,
          log: (...args: any[]) => {
            stdOutputs.push(args.map(a => inspect(a)).join(' '))
            console.debug('SCRIPT output', ...args)
          },
        },
      },
      {
        timeout: 10000,
      },
    )

    if (r instanceof Promise) {
      return new Response(
        JSON.stringify({
          result: await r ?? stdOutputs.join('\n'),
        }),
      )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      { status: 500 },
    )
  }
}
