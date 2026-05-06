import { randomBytes } from 'node:crypto'

process.env['NEXUS_MEMORY_ENCRYPTION_KEY'] = randomBytes(32).toString('base64')
process.env['NEXUS_AGENT_SECRET'] = randomBytes(32).toString('hex')
process.env['NEXUS_SKIP_CVE2026_CHECK'] = 'true'
