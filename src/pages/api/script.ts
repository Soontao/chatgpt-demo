import { randomUUID } from 'crypto'
import fs from 'fs/promises'
import { Worker } from 'worker_threads'
import path from 'path'
import { validatePass } from '@/utils/validatePass'
import type { APIRoute } from 'astro'
import type { Readable } from 'stream'

async function collectStream(stream: Readable) {
  const chunks = []

  for await (const chunk of stream)
    chunks.push(Buffer.from(chunk))

  return Buffer.concat(chunks).toString('utf-8').trim()
}

export const post: APIRoute = async(context) => {
  const { pass, script } = await context.request.json()

  const r = validatePass(pass)

  if (r)
    return r

  const tmpJsFile = path.join(process.cwd(), 'tmp', `tmp_ai_script_${randomUUID()}.js`)

  try {
    const stdOutputs = []
    await fs.writeFile(tmpJsFile, script, { encoding: 'utf-8' })
    // TODO: timeout
    const r = await new Promise((resolve, reject) => {
      const w = new Worker(tmpJsFile, { stdout: true, stderr: true })
      w.on('exit', async(code) => {
        const [stdOut, errOut] = await Promise.all([
          collectStream(w.stdout),
          collectStream(w.stderr),
        ])
        if (code !== 0)
          reject(errOut)
        else
          resolve(stdOut)
      })
      w.on('error', (err) => {
        reject(err)
      })
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
  } finally {
    await fs.unlink(tmpJsFile)
  }
}
