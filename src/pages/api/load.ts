import { fetch } from 'undici'
import { NodeHtmlMarkdown } from 'node-html-markdown'
import cheerio from 'cheerio'
import { validatePass } from '@/utils/validatePass'
import type { APIRoute } from 'astro'

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

export const post: APIRoute = async(context) => {
  const { url, pass } = await context.request.json()
  // TODO: give summary for specific query if content is long
  const r = validatePass(pass)

  if (r)
    return r

  const response = await fetch(url)

  if (response.status !== 200)
    return new Response(await response.text(), { status: response.status })

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

  return new Response(JSON.stringify({ content: md }), {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
