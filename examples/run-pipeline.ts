import { initSecurity } from '../security/index.js'
import type { AgentFn } from '../security/index.js'
import { orchestrator } from '../plugins/nexus-core/index.js'
import type { AgentContext } from '../plugins/nexus-core/index.js'

await initSecurity()

const { AccountManager } = await import('../agents/client/account-manager.js')
const { ProjectDirector } = await import('../agents/strategy/project-director.js')
const { ProductOwner } = await import('../agents/strategy/product-owner.js')
const { UXDesigner } = await import('../agents/design/ux-designer.js')
const { FrontendDev } = await import('../agents/dev/frontend-dev.js')

orchestrator.register(AccountManager)
orchestrator.register(ProjectDirector)
orchestrator.register(ProductOwner)
orchestrator.register(UXDesigner)
orchestrator.register(FrontendDev)
orchestrator['initialized'] = true

// Prompt libre — exactement ce qu'un client enverrait par email ou en réunion.
// L'account-manager se charge de le structurer en brief standardisé avant de passer la main.
const CLIENT_BRIEF = `
Bonjour,

On cherche à refaire notre espace client en ligne. Aujourd'hui les utilisateurs se plaignent
que c'est trop compliqué pour consulter leurs relevés et faire des virements.
On voudrait quelque chose de simple, moderne, accessible sur mobile.
Budget autour de 80k€, on aimerait livrer avant fin septembre.
On est une banque régionale donc tout doit être conforme RGPD et accessible (RGAA).

Merci
`.trim()

// Mock AgentFn — chaque agent reformule l'output du précédent en simulant son rôle.
// Remplacer par un vrai appel Anthropic SDK pour une exécution réelle.
const mockImpl: AgentFn = async (input, ctx) => {
  const preview = input.slice(0, 200).replace(/\n/g, ' ')
  return `[${ctx.agentName}] Brief reçu et traité :\n\n${preview}${input.length > 200 ? '...' : ''}\n\n→ Livrable structuré transmis à l'étape suivante.`
}

const implementations = new Map<string, AgentFn>([
  ['account-manager', mockImpl],
  ['project-director', mockImpl],
  ['product-owner', mockImpl],
  ['ux-designer', mockImpl],
  ['frontend-dev', mockImpl],
])

const context: AgentContext = {
  namespace: 'banque-regionale/strategy',
  trustLevel: 'TRUSTED',
  sessionId: 'demo-session-002',
}

// buildPipeline valide les liens sends_to/receives_from au démarrage — plante si un lien est cassé
const pipeline = orchestrator.buildPipeline([
  'account-manager',   // reçoit le brief brut → produit le Brief structuré
  'project-director',  // Brief → Vision stratégique + KPIs
  'product-owner',     // Vision → Backlog + User Stories
  'ux-designer',       // User Stories → Wireframes / UX specs
  'frontend-dev',      // UX specs → Implémentation
])

console.log('Pipeline :')
console.log(' ', pipeline.describe())
console.log()
console.log('Brief client initial :')
console.log(CLIENT_BRIEF)
console.log('\n── Exécution ──\n')

const results = await pipeline.run(CLIENT_BRIEF, context, implementations)

for (const result of results) {
  console.log(`── ${result.agentName} (${result.durationMs}ms) ──`)
  console.log(result.output)
  console.log()
}
