# Nexus Agency

> Framework open-source d'orchestration multi-agents pour agences digitales — de la stratégie au déploiement, avec sécurité entreprise dès la fondation.

![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)
![License](https://img.shields.io/badge/license-MIT-lightgrey)
![Security](https://img.shields.io/badge/security-AES--256--GCM-red?logo=shield)
![Agents](https://img.shields.io/badge/agents-38-purple)
![OWASP](https://img.shields.io/badge/OWASP-Top%2010%20ready-orange)
![RGAA](https://img.shields.io/badge/RGAA-4.1.2-blue)
![RGESN](https://img.shields.io/badge/RGESN-2024-green)

---

## Pourquoi Nexus ?

Les frameworks multi-agents existants se concentrent sur la technique (swarms, mémoire, MCP) mais ignorent deux problèmes critiques pour les agences professionnelles :

1. **Couverture métier incomplète** — pas d'agents pour le design, le SEO, la documentation client, l'accessibilité, l'éco-conception
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
| Agents design (UX, UI, Motion...) | ✗ | **✓ (4 agents)** |
| Agents contenu (SEO, Social, i18n...) | ✗ | **✓ (5 agents)** |
| Agents dev (React+Vue, Node.js+Java...) | ✗ | **✓ (5 agents)** |
| Agents QA (a11y, perf, security, RGAA...) | ✗ | **✓ (8 agents)** |
| Agents data & analytics | ✗ | **✓ (3 agents)** |
| Agents DevOps & SRE | ✗ | **✓ (3 agents)** |
| Agents sécurité dédiés | ✗ | **✓ (3 agents)** |
| Agents documentation client (briefs, CR, onboarding) | ✗ | **✓ (2 agents)** |
| **Audit RGAA 4.1.2 intégré** | ✗ | **✓** |
| **Audit WCAG 2.1/2.2 intégré** | ✗ | **✓** |
| **Audit RGESN 2024 (éco-conception)** | ✗ | **✓** |
| **Checklists a11y design → dev** | ✗ | **✓** |
| Conformité bancaire (CA/CACD2) | ✗ | **✓** |

> **CA/CACD2** : Crédit Agricole et sa filiale [CACD2](https://www.ca-consumerfinance.com) (CA Consumer Finance Digital). Ces environnements bancaires imposent des contraintes spécifiques : détection renforcée des données PII sensibles (IBAN, NIR, numéros de contrat CA), journalisation conforme DSP2 (directive européenne sur les services de paiement), cloisonnement strict des données entre clients, supervision ACPR, et politique de rotation des secrets tous les 30 jours. Activer avec `NEXUS_BANKING_MODE=true`.

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
│   ├── registry.ts    ← point d'entrée centralisé (tous les agents)
│   ├── strategy/      (5 agents)
│   ├── design/        (4 agents — checklists a11y intégrées)
│   ├── content/       (5 agents)
│   ├── dev/           (5 agents — checklist a11y dev intégrée)
│   ├── qa/            (8 agents — RGAA, WCAG, RGESN)
│   ├── data/          (3 agents)
│   ├── devops/        (3 agents)
│   ├── security/      (3 agents)
│   └── client/        (2 agents)
├── plugins/
│   ├── nexus-core/    ← AgentRunner + NexusOrchestrator
│   └── nexus-security/
├── workflows/         ← Orchestration YAML
├── workers/           ← 9 processus background
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

## Numérique Responsable — Plugin intégré

Nexus intègre le plugin [Numérique Responsable](https://github.com/WilliamLaime/numerique-responsable) via l'outil `mcp-numerique-responsable`. Ce plugin Chrome (TypeScript + React) fournit un moteur d'audit automatisé couvrant :

- **RGAA 4.1.2** — 106 critères, 13 thématiques (accessibilité FR obligatoire)
- **WCAG 2.1/2.2** — 4 principes, niveaux A/AA/AAA (standard international)
- **RGESN 2024** — 79 critères, 9 thématiques (éco-conception numérique)

### Agents dédiés numériques responsable

| Agent | Référentiel | Usage |
|-------|-------------|-------|
| [`rgaa-wcag-auditor`](./agents/qa/rgaa-wcag-auditor.ts) | RGAA 4.1.2 / WCAG 2.1 | Sites FR (obligations légales) et international |
| [`rgesn-auditor`](./agents/qa/rgesn-auditor.ts) | RGESN 2024 | Éco-conception, score pondéré, EcoIndex, CO₂ |

### Checklists accessibilité intégrées aux agents

Pour réduire les allers-retours avec le plugin d'audit, trois agents embarquent des checklists à valider **avant** de passer la main :

| Agent | Checklist | Points |
|-------|-----------|--------|
| [`ux-designer`](./agents/design/ux-designer.ts) | Structure, navigation, formulaires, médias | 24 points |
| [`ui-designer`](./agents/design/ui-designer.ts) | Couleurs/contrastes, typographie, composants, responsive | 30 points |
| [`frontend-dev`](./agents/dev/frontend-dev.ts) | HTML sémantique, ARIA, clavier, formulaires, dynamique | 43 points |

---

## Installer Nexus sur ton projet

Nexus est une bibliothèque d'agents — pas une application à faire tourner. Tu l'intègres dans **ton** projet, sous **ton** nom. Voici les trois façons de le faire.

---

### Cas 1 — Tu pars de zéro (nouveau projet)

Tu veux créer `mon-agence`, `studio-x`, ou n'importe quel nom — tu utilises Nexus comme base de départ.

```bash
# Cloner en renommant le dossier directement
git clone https://github.com/WilliamLaime/nexus-agency.git mon-agence
cd mon-agence

# Détacher du repo Nexus et créer ton propre historique git
rm -rf .git
git init
git add .
git commit -m "init: base Nexus"

# Ouvrir dans Claude Code
claude
```

C'est tout. Ton projet s'appelle `mon-agence`, les 38 agents sont là, Claude Code les utilise immédiatement.

---

### Cas 2 — Tu as déjà un projet (intégration dans l'existant)

Tu as déjà `mon-projet/` avec son propre code, et tu veux ajouter les agents Nexus dedans.

```bash
cd mon-projet

# Copier uniquement les agents et la doc
git clone https://github.com/WilliamLaime/nexus-agency.git /tmp/nexus
cp -r /tmp/nexus/agents ./agents
cp /tmp/nexus/AGENTS.md ./AGENTS.md
rm -rf /tmp/nexus
```

Ensuite, ajouter les instructions Nexus à ton `CLAUDE.md` existant (ou le créer s'il n'existe pas) :

```bash
# Ajouter le contenu du CLAUDE.md de Nexus au tien
curl -s https://raw.githubusercontent.com/WilliamLaime/nexus-agency/main/CLAUDE.md >> CLAUDE.md
```

Claude Code lit automatiquement `CLAUDE.md` à l'ouverture du projet — les agents sont immédiatement actifs.

---

### Cas 3 — Tu veux rester synchronisé avec les mises à jour Nexus

Tu veux pouvoir récupérer les nouveaux agents quand ils sortent, sans écraser ton propre code.

```bash
cd mon-projet

# Ajouter Nexus comme remote secondaire
git remote add nexus https://github.com/WilliamLaime/nexus-agency.git
git fetch nexus

# Récupérer uniquement le dossier agents via subtree
git subtree add --prefix=agents nexus main --squash
```

Pour mettre à jour les agents plus tard :
```bash
git subtree pull --prefix=agents nexus main --squash
```

---

### Ce que lit Claude Code

Le fichier `CLAUDE.md` à la racine de ton projet est **la clé**. C'est lui qui dit à Claude Code comment utiliser les agents, quelle stack tu utilises, et quelles règles respecter. Si tu intègres Nexus dans un projet existant, copie ou fusionne son contenu dans ton `CLAUDE.md`.

```
mon-projet/
├── CLAUDE.md        ← Claude Code lit ça en premier à chaque session
├── agents/          ← les 38 agents (system prompts + checklists)
│   ├── registry.ts
│   ├── dev/
│   ├── qa/
│   └── ...
└── [ton code]
```

---

## Démarrage rapide (mode Claude Code)

Une fois installé selon l'une des méthodes ci-dessus :

```bash
claude  # ouvre Claude Code dans ton projet
```

Les 38 agents sont disponibles. Les checklists accessibilité, les system prompts spécialisés et le registre centralisé sont prêts à l'emploi. Aucune clé API supplémentaire requise.

---

### Mode runtime autonome (avancé)

Si tu veux faire tourner la couche sécurité TypeScript comme un serveur Node.js indépendant (PII detector, audit logger, namespace isolator chiffré...) :

**Prérequis** : Node.js 20+, TypeScript 6+

```bash
npm install
cp .env.example .env
```

Variables nécessaires uniquement pour ce mode :
```env
ANTHROPIC_API_KEY=sk-ant-...                          # clé Anthropic pour les appels LLM
NEXUS_MEMORY_ENCRYPTION_KEY=$(openssl rand -base64 32) # chiffrement AES-256-GCM des namespaces
NEXUS_AGENT_SECRET=$(openssl rand -hex 32)             # signature JWT inter-agents
```

```bash
npm run lint           # TypeScript type check (0 erreur attendue)
npm run security:audit # Scan CVE des dépendances
```

---

## Utilisation

### Charger tous les agents via le registre

```typescript
import { initSecurity } from './security/index.js'

async function main() {
  await initSecurity()

  // Import depuis le registre centralisé
  const { FrontendDev, RGAAWCAGAuditor, RGESNAuditor } = await import('./agents/registry.js')

  const { orchestrator } = await import('./plugins/nexus-core/index.js')
  await orchestrator.init()

  orchestrator.register(FrontendDev)
  orchestrator.register(RGAAWCAGAuditor)
  orchestrator.register(RGESNAuditor)
}
```

### Exécuter un agent

```typescript
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

### Lancer un audit accessibilité

```typescript
const auditResult = await orchestrator.runAgent(
  'rgaa-wcag-auditor',
  'Auditer https://mon-site.fr selon RGAA 4.1.2',
  { namespace: 'mon-client-qa', trustLevel: 'VERIFIED', sessionId: 'audit-001' },
  async (input, ctx) => { /* ... */ }
)
```

### Scanner les CVE

```bash
npm run security:audit
# Génère reports/security/cve-YYYY-MM-DD.json
```

---

## Sécurité

Nexus est conçu pour des environnements exigeants incluant les banques et institutions financières. Il a notamment été pensé pour répondre aux contraintes de **CACD2** (CA Consumer Finance Digital, filiale de Crédit Agricole) : réglementation DSP2, supervision ACPR, traitement de données PII bancaires sensibles (IBAN, NIR, numéros de contrat), et exigences de traçabilité non répudiable. Activer le mode bancaire renforcé : `NEXUS_BANKING_MODE=true`.

- **PII** : 14 types détectés automatiquement, aucune donnée sensible ne traverse les agents sans traitement
- **Injection** : 20+ patterns de prompt injection détectés et bloqués (5 catégories + base64)
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
