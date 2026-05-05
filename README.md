# Nexus Agency

> Framework open-source d'orchestration multi-agents pour agences digitales — de la stratégie au déploiement, avec sécurité enterprise dès la fondation.

![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)
![License](https://img.shields.io/badge/license-MIT-lightgrey)
![Security](https://img.shields.io/badge/security-AES--256--GCM-red?logo=shield)
![Agents](https://img.shields.io/badge/agents-38-purple)
![OWASP](https://img.shields.io/badge/OWASP-Top%2010%20ready-orange)

---

## Pourquoi Nexus ?

Les frameworks multi-agents existants se concentrent sur la technique (swarms, mémoire, MCP) mais ignorent deux problèmes critiques pour les agences professionnelles :

1. **Couverture métier incomplète** — pas d'agents pour le design, le SEO, la relation client, l'accessibilité
2. **Sécurité en afterthought** — PII, injection de prompt, secrets dans les outputs sont des problèmes réels en production

Nexus résout les deux, avec la sécurité comme couche fondatrice.

---

## Comparatif Nexus vs Ruflo

| Fonctionnalité | Ruflo | Nexus |
|---|:---:|:---:|
| Architecture swarm | ✓ | ✓ |
| Mémoire vectorielle (HNSW) | ✓ | ✓ |
| MCP (Model Context Protocol) | ✓ | ✓ |
| Auto-amélioration (workers) | ✓ | ✓ |
| Plugin architecture | ✓ | ✓ |
| **Couche sécurité dédiée** | ✗ | **✓** |
| **Détection PII (14 types)** | ✗ | **✓** |
| **Prompt injection guard** | Partiel | **✓ (5 catégories + encodé)** |
| **Secret scanner sur outputs** | ✗ | **✓** |
| **Namespace isolator (AES-256-GCM)** | ✗ | **✓** |
| **Audit log immuable (RGPD)** | ✗ | **✓** |
| **Trust policy inter-agents** | ✗ | **✓** |
| **CVE monitor hebdomadaire** | ✗ | **✓** |
| **Agents métier agence (38)** | ✗ | **✓** |
| Agents strategy (PO, PM, BA...) | ✗ | **✓ (5 agents)** |
| Agents design (UX, UI, Motion...) | ✗ | **✓ (5 agents)** |
| Agents contenu (SEO, Social...) | ✗ | **✓ (5 agents)** |
| Agents dev (Architect, Lead...) | ✗ | **✓ (7 agents)** |
| Agents QA (a11y, perf, security) | ✗ | **✓ (7 agents)** |
| Agents data & analytics | ✗ | **✓ (3 agents)** |
| Agents DevOps & SRE | ✗ | **✓ (3 agents)** |
| Agents relation client | ✗ | **✓ (2 agents)** |
| Agents sécurité dédiés | ✗ | **✓ (3 agents)** |
| Conformité bancaire (CA/CACD2) | ✗ | **✓** |

---

## Architecture

```
nexus/
├── security/          ← Couche sécurité (initialisée EN PREMIER)
│   ├── index.ts       ← initSecurity() + withSecurityContext()
│   ├── audit-logger.ts
│   ├── input-validator.ts
│   ├── pii-detector.ts        (14 types PII)
│   ├── namespace-isolator.ts  (AES-256-GCM)
│   ├── trust-policy.ts
│   ├── prompt-injection-guard.ts
│   ├── secret-scanner.ts
│   └── cve-monitor.ts
├── agents/            ← 38 agents organisés par domaine
├── plugins/
│   ├── nexus-core/    ← AgentRunner + NexusOrchestrator
│   └── nexus-security/
├── workflows/         ← Orchestration YAML
├── workers/           ← Processus background
└── memory/            ← Mémoire vectorielle chiffrée
```

### Pipeline de sécurité

Chaque appel agent passe par ce pipeline (non contournable) :

```
Input
  ↓ [prompt-injection-guard]  — détecte 20+ patterns d'injection
  ↓ [input-validator]         — validation Zod stricte
  ↓ [pii-detector (input)]    — 14 types PII, politique BLOCK/REDACT/HASH
  ↓ Agent execution
  ↓ [pii-detector (output)]   — scan de sortie
  ↓ [secret-scanner]          — détecte clés API, tokens, credentials
Output
```

---

## Démarrage rapide

### Prérequis
- Node.js 20+
- TypeScript 6+

### Installation

```bash
git clone https://github.com/WilliamLaime/nexus-agency.git
cd nexus-agency
npm install
```

### Configuration

```bash
cp .env.example .env
# Éditer .env avec vos clés
```

Variables obligatoires :
```env
ANTHROPIC_API_KEY=sk-ant-...
NEXUS_MEMORY_ENCRYPTION_KEY=$(openssl rand -base64 32)
NEXUS_AGENT_SECRET=$(openssl rand -hex 32)
```

### Vérification de la configuration

```bash
npm run lint           # TypeScript type check
npm run security:audit # Scan CVE des dépendances
```

---

## Utilisation

### Exécuter un agent

```typescript
import { orchestrator } from './plugins/nexus-core/index.js'
import { ProductOwner } from './agents/strategy/product-owner.js'

await orchestrator.init()
orchestrator.register(ProductOwner)

const result = await orchestrator.runAgent(
  'product-owner',
  'Créer les user stories pour une feature de paiement en ligne',
  {
    namespace: 'acme-corp-strategy',
    trustLevel: 'VERIFIED',
    sessionId: 'session-001',
  },
  async (input, ctx) => {
    // Implémentation avec Anthropic SDK
    return `User story générée pour: ${input}`
  }
)

console.log(result.output)
```

### Scanner les CVE

```bash
npm run security:audit
# Génère reports/security/cve-YYYY-MM-DD.json
```

---

## Sécurité

Nexus est conçu pour des environnements exigeants incluant les banques et institutions financières (CACD2 / Crédit Agricole).

- **PII** : 14 types détectés automatiquement, aucune donnée sensible ne traverse les agents sans traitement
- **Injection** : 20+ patterns de prompt injection détectés et bloqués
- **Secrets** : Scan automatique de tous les outputs avant livraison
- **Isolation** : Chiffrement AES-256-GCM par namespace client/projet
- **Audit** : Log immuable et anonymisé RGPD de toutes les actions
- **CVE** : Surveillance hebdomadaire des vulnérabilités dans les dépendances

Voir [SECURITY.md](./SECURITY.md) pour la politique complète.

---

## Contribution

1. Fork + branche feature
2. `npm run lint` doit passer (0 erreur TypeScript)
3. Checklist sécurité dans [SECURITY.md](./SECURITY.md) complétée
4. PR avec description détaillée

---

## Licence

MIT — Copyright 2026 William Laimé
