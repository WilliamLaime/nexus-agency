# ARCHITECTURE.md

## Trois couches conceptuelles

### 1. Couche Runtime (TypeScript exécutable)

| Dossier | Rôle |
|---------|------|
| `security/` | PII detector, prompt injection guard, audit logger (hash chain), namespace isolator (AES-256-GCM), trust policy, secret scanner, CVE monitor |
| `memory/` | Mémoire chiffrée par namespace, persistée sur disque (`memory/store/`) avec registry JSON |
| `plugins/nexus-core/` | `AgentRunner` + `NexusOrchestrator` — exécute des agents via `withSecurityContext()` |
| `plugins/nexus-security/` | Wrapper de sécurité supplémentaire |
| `workers/` | Processus background (audit rotation, CVE scan, PII sweep, pattern optimizer, SEO monitor...) |
| `scripts/` | Outils de validation (graphe de collaboration) |
| `index.ts` | Point d'entrée bibliothèque — exporte les types et helpers |

### 2. Couche Agents (Data + System Prompts)

- `agents/{domaine}/*.ts` — chaque agent est un objet `AgentDefinition` TypeScript
- Le `system_prompt` est destiné à être injecté comme system prompt LLM lors d'un appel via `withSecurityContext()`
- Les `collaboration.receives_from / sends_to` forment un graphe documentaire validé par `scripts/validate-graph.ts`
- Les checklists a11y dans les system prompts sont des consignes au LLM, pas des gates programmables
- **40 agents** organisés en 9 domaines : strategy, design, content, dev, qa, data, devops, security, client

### 3. Couche Documentation

| Fichier | Rôle |
|---------|------|
| `README.md` | Vision, installation, comparatif |
| `AGENTS.md` | Registre des 40 agents avec leurs responsabilités |
| `CLAUDE.md` | Instructions pour Claude Code (règles TypeScript, sécurité, patterns) |
| `LESSONS.md` | Pièges TypeScript stricts à éviter (historique des erreurs) |
| `SECURITY.md` | Politique sécurité et description des composants |
| `ARCHITECTURE.md` | Ce document |
| `WORKFLOWS.md` | Index des workflows |
| `docs/workflows/*.yml` | Workflows de référence (pas exécutés — runner non implémenté) |

---

## Flux d'exécution typique

```
1. await initSecurity()          // init audit logger + memory registry
2. const { MyAgent } = await import('./agents/domain/my-agent.js')
3. await withSecurityContext(
     async (input, ctx) => monAppelLLM(MyAgent.system_prompt, input),
     userInput,
     { agentName: MyAgent.name, namespace: 'client/domain', trustLevel: 'VERIFIED' }
   )
   // Le pipeline interne :
   //   sanitizePrompt → guardPrompt → validateInput → detectPII(input)
   //   → agentFn(cleanInput) → detectPII(output) → scanOutput → auditLog
```

---

## Ce qui n'est PAS dans Nexus

- **Pas de runtime LLM intégré** — tu fournis ta propre `AgentFn` qui appelle Anthropic, OpenAI, ou autre
- **Pas de runner YAML** — les workflows dans `docs/workflows/` sont documentaires
- **Pas d'UI / CLI interactive** — bibliothèque TypeScript uniquement
- **Pas de stockage distribué** — la mémoire est local-disk (fichiers `.enc.json` chiffrés)
- **Pas de chaînage autonome d'agents** — `NexusOrchestrator.runWorkflow()` enchaîne des steps fournis en TypeScript, mais le graphe `sends_to/receives_from` est documentaire

---

## Format des namespaces

`{clientId}/{domaine}` — le slash est le délimiteur garanti.

```
acme-corp/strategy
acme-corp/design
acme-corp/security
```

`assertNamespaceAccess()` isole les clients par le segment avant le premier slash.
