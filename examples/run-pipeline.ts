import { initSecurity } from '../security/index.js'
import type { AgentFn } from '../security/index.js'
import { orchestrator } from '../plugins/nexus-core/index.js'
import type { AgentContext } from '../plugins/nexus-core/index.js'

await initSecurity()

const { ProductOwner } = await import('../agents/strategy/product-owner.js')
const { UXDesigner } = await import('../agents/design/ux-designer.js')
const { FrontendDev } = await import('../agents/dev/frontend-dev.js')

orchestrator.register(ProductOwner)
orchestrator.register(UXDesigner)
orchestrator.register(FrontendDev)
orchestrator['initialized'] = true

// Mock AgentFn — remplacer par un vrai appel LLM si besoin
const mockImpl: AgentFn = async (input, ctx) => {
  return `[${ctx.agentName}] a traité :\n${input.slice(0, 120)}${input.length > 120 ? '...' : ''}`
}

const implementations = new Map<string, AgentFn>([
  ['product-owner', mockImpl],
  ['ux-designer', mockImpl],
  ['frontend-dev', mockImpl],
])

const context: AgentContext = {
  namespace: 'demo-client/dev',
  trustLevel: 'VERIFIED',
  sessionId: 'demo-session-001',
}

// --- Construction du pipeline ---
const pipeline = orchestrator.buildPipeline([
  'product-owner',
  'ux-designer',
  'frontend-dev',
])

console.log('\nPipeline prévu :')
console.log(' ', pipeline.describe())

// Démonstration du skip
pipeline.skip('ux-designer')

console.log('\nAprès skip de ux-designer :')
console.log(' ', pipeline.describe())

// --- Exécution ---
console.log('\nExécution...\n')
const results = await pipeline.run(
  'Créer une page de login sécurisée pour une application bancaire',
  context,
  implementations
)

for (const result of results) {
  console.log(`── ${result.agentName} (${result.durationMs}ms) ──`)
  console.log(result.output)
  console.log()
}
