import { validatePass } from '@/utils/validatePass'
import type { APIRoute } from 'astro'

export const post: APIRoute = async(context) => {
  const { EdgeVM } = await import('@edge-runtime/vm')
  const { createFormat } = await import('@edge-runtime/format')
  const { pass, script } = await context.request.json()
  const format = createFormat()

  const r = validatePass(pass)

  if (r)
    return r

  try {
    const stdOutputs = []
    const vm = new EdgeVM({
      extend: (ctx) => {
        ctx.console.log = (...args: any[]) => {
          stdOutputs.push(args.map(a => format(a)).join(' '))
          ctx.console.debug('SCRIPT output', ...args)
        }
        return ctx
      },
    })
    const s = await vm.evaluate(script)
    return new Response(
      JSON.stringify({
        result: s ?? stdOutputs.join('\n'),
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
