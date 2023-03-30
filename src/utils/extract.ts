import cheerio from 'cheerio'
import { NodeHtmlMarkdown } from 'node-html-markdown'
import { ProxyAgent, fetch } from 'undici'

const httpsProxy = import.meta.env.HTTPS_PROXY
const CLEAN_SELECTORS = [
  '.nav',
  'video',
  'image',
  'svg',
  'style',
  'navigation',
  'header',
  'footer',
  '.menu',
]

export async function extractMarkdown(url: string) {
  const initOptions: any = {}

  if (httpsProxy)
    initOptions.dispatcher = new ProxyAgent(httpsProxy)

  const response = await fetch(url, initOptions)

  if (response.status !== 200)
    return `Cannot found information from ${url}, response: ${response.status} ${response.statusText}`

  const text = await response.text()
  const html = cheerio.load(text)

  for (const selector of CLEAN_SELECTORS)
    html(selector).remove()

  // remove all attributes
  html('a').removeAttr('href')

  // TODO: try to find the most important part of document,
  // cheerio remove the header/footer and nav
  // cheerio only load article/main
  const md = NodeHtmlMarkdown.translate(html.html())

  return md
}
