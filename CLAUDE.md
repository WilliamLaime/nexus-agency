# CLAUDE.md — Nexus Agency

Instructions pour Claude Code dans ce projet.

## Vue d'ensemble

Nexus est un framework TypeScript d'orchestration multi-agents pour agences digitales.
La couche sécurité (`security/`) est la fondation — elle doit être initialisée avant tout agent.

## Commandes essentielles

```bash
npm run lint           # TypeScript type check (tsc --noEmit)
npm run build          # Compilation vers dist/
npm run security:audit # Scan CVE des dépendances npm
```

## Règle absolue n°1 — Sécurité avant tout

`initSecurity()` DOIT être appelé avant tout code agent. Utiliser des imports dynamiques :

```typescript
import { initSecurity } from './security/index.js'

async function main() {
  await initSecurity()
  // Seulement après : imports dynamiques des agents
  const { ProductOwner } = await import('./agents/strategy/product-owner.js')
}
```

Ne jamais importer les agents en static import avant `initSecurity()`.

## Module system — ESM strict

Ce projet utilise `"type": "module"` (ESM) avec `"module": "nodenext"` dans tsconfig.

**Toujours** utiliser l'extension `.js` dans les imports relatifs :
```typescript
import { foo } from './bar.js'        // ✓
import { foo } from './bar'           // ✗ erreur au runtime
```

## TypeScript strict — pièges courants

### verbatimModuleSyntax
Séparer les imports runtime des imports type-seulement :
```typescript
import { z } from 'zod'                    // runtime (valeur)
import type { ZodSchema } from 'zod'       // type seulement
```

### noUncheckedIndexedAccess
```typescript
const match = text.match(/pattern/)
if (!match) return           // obligatoire
const value = match[0]       // string | undefined
if (!value) return           // obligatoire
```

### exactOptionalPropertyTypes
```typescript
// ✗ Interdit — passer undefined explicitement
auditLog({ ..., metadata: undefined })

// ✓ Correct — omettre le champ optionnel
auditLog({ agentName: 'x', action: 'y', namespace: 'z', outcome: 'ALLOWED' })
```

## Pattern obligatoire pour les agents

Chaque agent est un objet TypeScript de type `AgentDefinition` :

```typescript
import type { AgentDefinition } from '../../plugins/nexus-core/index.js'

export const MyAgent: AgentDefinition = {
  name: 'my-agent',
  domain: 'strategy',  // strategy|design|content|dev|qa|data|devops|security|client
  system_prompt: `...`,
  security_rules: {
    pii_check: true,            // toujours true
    audit_log: true,            // toujours true
    secret_scan_output: true,   // toujours true
    trust_level_required: 'VERIFIED',
  },
  memory_hooks: {
    before: 'memory_search(query="...", namespace="{client}-{domain}")',
    after: 'memory_store(key="pattern-...", value="...", namespace="{client}-{domain}")',
  },
  quality_criteria: ['...'],
  collaboration: {
    receives_from: ['agent-a'],
    sends_to: ['agent-b'],
  },
  output_format: 'markdown',
  tools: ['memory_search', 'memory_store', 'audit_log'],
}
```

## Contexte bancaire — politiques renforcées

Ce projet est utilisé en contexte CACD2 / Crédit Agricole. Activer le mode bancaire :
```env
NEXUS_BANKING_MODE=true
```

En mode bancaire, les types PII suivants sont **BLOCK** (pas REDACT) :
- IBAN, NIR, CREDIT_CARD, PASSWORD, API_KEY, TOKEN, IP_ADDRESS, CONTRACT_NUMBER, HEALTH_DATA

## Ajouter un nouvel agent

1. Créer `agents/{domaine}/{nom-agent}.ts`
2. Implémenter le pattern `AgentDefinition` complet
3. Enregistrer dans `plugins/nexus-core/index.ts` si nécessaire
4. Documenter dans `AGENTS.md`
5. Mettre à jour les `collaboration.receives_from` / `sends_to` des agents voisins

## Structure des namespaces mémoire

Format : `{client-slug}-{domaine}`

```
acme-corp-strategy
acme-corp-design
acme-corp-security
```

Un agent ne peut accéder qu'aux namespaces de son client (enforced par `assertNamespaceAccess()`).

## Variables d'environnement requises

```env
ANTHROPIC_API_KEY=              # Clé API Anthropic
NEXUS_MEMORY_ENCRYPTION_KEY=    # openssl rand -base64 32
NEXUS_AGENT_SECRET=             # openssl rand -hex 32
```

Ne jamais committer ces valeurs. Le `secret-scanner` bloque les outputs contenant des secrets.

## Sécurité CVE-2026-21852

Nexus bloque au démarrage si `ANTHROPIC_BASE_URL` est défini avec une valeur non-officielle.
Ne jamais ajouter `ANTHROPIC_BASE_URL` dans les fichiers de config du repo.
