import process from 'process'
import { writeFileSync } from 'fs'

writeFileSync(
  '.env',
  Object.entries(process.env).filter(([key]) => key.startsWith('EV_')).map(([k, v]) => `${k.substring(3)}=${v}`).join('\n'),
)
