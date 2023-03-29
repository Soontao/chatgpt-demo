import vm from 'vm'
import { inspect } from 'util'
import { fetch } from 'undici'
import { validatePass } from '@/utils/validatePass'
import type { APIRoute } from 'astro'

export const post: APIRoute = async(context) => {
  const { pass, script } = await context.request.json()

  const r = validatePass(pass)

  if (r)
    return r

  try {
    const stdOutputs = []
    const runtimeScript = new vm.Script(script, {
      filename: '__user_tmp_script.js',
    })

    const r = await runtimeScript.runInNewContext({
      ...globalThis,
      fetch,
      console: {
        ...console,
        log: (...args: any[]) => {
          stdOutputs.push(...args.map(v => inspect(v)))
        },
      },
    })

    return new Response(
      JSON.stringify({
        result: r ?? stdOutputs.join('\n'),
      }),
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      { status: 500 },
    )
  }
}
