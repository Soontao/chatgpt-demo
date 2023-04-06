import { ProxyAgent, fetch } from 'undici'
import type { RequestInit } from 'undici'

const httpsProxy = import.meta.env.HTTPS_PROXY

const TRAFILATURA_SRV = import.meta.env.TRAFILATURA_SRV

export async function extractMarkdown(url: string) {
  const initOptions: RequestInit = {
    method: 'post',
    body: JSON.stringify({ url }),
    headers: {
      'Content-Type': 'application/json',
    },
  }

  if (httpsProxy)
    initOptions.dispatcher = new ProxyAgent(httpsProxy)

  const response = await fetch(`${TRAFILATURA_SRV}/extract`, initOptions)

  if (response.status !== 200)
    return `Cannot found information from ${url}, response: ${response.status} ${response.statusText}`

  const { extracted } = await response.json() as any

  return extracted
}
