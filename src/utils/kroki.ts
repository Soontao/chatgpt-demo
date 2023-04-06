import pako from 'pako'

function _arrayBufferToBase64(buffer: Uint8Array) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++)
    binary += String.fromCharCode(bytes[i])

  return window.btoa(binary)
}
export function createKrokiParam(diagramSource: string) {
  const compressed = pako.deflate(diagramSource, { level: 9 })
  return _arrayBufferToBase64(compressed).replace(/\+/g, '-').replace(/\//g, '_')
}

export function createKrokiLink(type: string, diagramDefinition: string) {
  return `https://kroki.io/${type}/svg/${createKrokiParam(diagramDefinition)}`
}
