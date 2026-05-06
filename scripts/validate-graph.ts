import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

interface AgentGraph {
  name: string
  receives_from: string[]
  sends_to: string[]
  file: string
}

async function parseAgents(): Promise<AgentGraph[]> {
  const AGENTS_DIR = join(process.cwd(), 'agents')
  const agents: AgentGraph[] = []

  async function walkDir(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        await walkDir(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.ts') && entry.name !== 'registry.ts') {
        const content = await readFile(fullPath, 'utf8')

        const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/)?.[1]
        if (!nameMatch) continue

        const receivesMatch = content.match(/receives_from:\s*\[([^\]]*)\]/s)?.[1] ?? ''
        const sendsMatch = content.match(/sends_to:\s*\[([^\]]*)\]/s)?.[1] ?? ''

        const parseList = (raw: string): string[] =>
          [...raw.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1] ?? '').filter(Boolean)

        agents.push({
          name: nameMatch,
          receives_from: parseList(receivesMatch),
          sends_to: parseList(sendsMatch),
          file: fullPath.replace(process.cwd(), ''),
        })
      }
    }
  }

  await walkDir(AGENTS_DIR)
  return agents
}

async function main(): Promise<void> {
  const agents = await parseAgents()
  const nameSet = new Set(agents.map((a) => a.name))
  const violations: string[] = []

  for (const agent of agents) {
    for (const target of agent.sends_to) {
      if (!nameSet.has(target)) {
        violations.push(`MISSING AGENT: "${agent.name}" sends_to "${target}" — no file found`)
        continue
      }
      const targetAgent = agents.find((a) => a.name === target)
      if (!targetAgent) continue
      if (!targetAgent.receives_from.includes(agent.name)) {
        violations.push(
          `ASYMMETRIC: "${agent.name}" sends_to "${target}" but "${target}" does not list "${agent.name}" in receives_from`
        )
      }
    }

    for (const source of agent.receives_from) {
      if (!nameSet.has(source)) {
        violations.push(`MISSING AGENT: "${agent.name}" receives_from "${source}" — no file found`)
        continue
      }
      const sourceAgent = agents.find((a) => a.name === source)
      if (!sourceAgent) continue
      if (!sourceAgent.sends_to.includes(agent.name)) {
        violations.push(
          `ASYMMETRIC: "${agent.name}" receives_from "${source}" but "${source}" does not list "${agent.name}" in sends_to`
        )
      }
    }
  }

  // Deduplicate (each edge is reported from both sides)
  const unique = [...new Set(violations)]

  if (unique.length === 0) {
    console.log(`✅ Agent graph valid — ${agents.length} agents, 0 violations`)
    process.exit(0)
  } else {
    console.error(`❌ Agent graph has ${unique.length} violation(s):\n`)
    for (const v of unique) {
      console.error(`  • ${v}`)
    }
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
