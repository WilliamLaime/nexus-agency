# AGENTS.md — Nexus Agency

Documentation des 38 agents implémentés du framework Nexus.

Chaque agent respecte le pattern `AgentDefinition` défini dans `plugins/nexus-core/index.ts`.
Tous les agents sont accessibles via le registre centralisé : `agents/registry.ts`.

**Règles universelles** :
- `pii_check: true` — obligatoire pour tous
- `audit_log: true` — obligatoire pour tous
- `secret_scan_output: true` — obligatoire pour tous
- `memory_hooks.before` — recherche en mémoire avant chaque tâche
- `memory_hooks.after` — stockage des patterns réussis après chaque tâche

**Niveaux de confiance** :
- `TRUSTED` — agents à accès élevé : sécurité, DevOps, direction
- `VERIFIED` — agents standard : design, dev, QA, contenu, data, client

---

## Vue d'ensemble

| Domaine | Agents | Trust | Fichiers |
|---------|--------|-------|---------|
| Stratégie | project-director, project-manager, product-owner, business-analyst, scrum-master | TRUSTED (director) / VERIFIED | `agents/strategy/` |
| Design | ux-designer ⚠️, ui-designer ⚠️, motion-designer, art-director | VERIFIED | `agents/design/` |
| Contenu | copywriter, content-strategist, seo-specialist, social-media-manager, translator | VERIFIED | `agents/content/` |
| Développement | frontend-dev ⚠️, backend-dev, mobile-dev, fullstack-dev, integrator | VERIFIED | `agents/dev/` |
| QA & Qualité | qa-lead, manual-tester, automation-tester, a11y-auditor, performance-auditor, ux-tester, **rgaa-wcag-auditor**, **rgesn-auditor** | VERIFIED | `agents/qa/` |
| Data & Analytics | data-analyst, analytics-specialist, cro-specialist | VERIFIED | `agents/data/` |
| DevOps & Infra | devops-engineer, cloud-architect, sre | TRUSTED | `agents/devops/` |
| Sécurité | security-architect, security-auditor, compliance-officer | TRUSTED | `agents/security/` |
| Relation Client | account-manager, customer-success | VERIFIED | `agents/client/` |

⚠️ = agent avec checklist accessibilité intégrée (à compléter avant envoi au développement / QA)

---

## Stratégie & Produit

### `project-director` ← `agents/strategy/project-director.ts`
- **Trust** : TRUSTED
- **Rôle** : Vision globale du projet, arbitrages stratégiques, reporting client C-level
- **Reçoit de** : account-manager, business-analyst
- **Envoie à** : project-manager, product-owner
- **Output** : markdown (vision doc, compte-rendu de direction)

### `project-manager` ← `agents/strategy/project-manager.ts`
- **Trust** : VERIFIED
- **Rôle** : Planning sprints, gestion des risques, suivi des livrables, coordination inter-équipes
- **Reçoit de** : project-director, product-owner
- **Envoie à** : scrum-master, tech-lead, account-manager
- **Output** : yaml (plan de projet, planning sprint)

### `product-owner` ← `agents/strategy/product-owner.ts`
- **Trust** : VERIFIED
- **Rôle** : Backlog, user stories (As a/I want/So that), acceptance criteria, priorisation MoSCoW
- **Reçoit de** : account-manager, business-analyst
- **Envoie à** : project-manager, ux-researcher, architect
- **Output** : markdown

### `business-analyst` ← `agents/strategy/business-analyst.ts`
- **Trust** : VERIFIED
- **Rôle** : Benchmark concurrentiel, étude de marché, ROI, KPIs, cadrage fonctionnel
- **Reçoit de** : account-manager
- **Envoie à** : project-director, product-owner
- **Output** : markdown (étude, rapport)

### `scrum-master` ← `agents/strategy/scrum-master.ts`
- **Trust** : VERIFIED
- **Rôle** : Facilitation agile, vélocité d'équipe, rétrospectives (Start/Stop/Continue), levée des blocages
- **Reçoit de** : project-manager
- **Envoie à** : project-manager, tech-lead
- **Output** : markdown (CR rétrospective, rapport vélocité)

---

## Design & UX

### `ux-researcher`
- **Trust** : VERIFIED
- **Rôle** : Personas, parcours utilisateurs, tests utilisateurs, insights UX
- **Reçoit de** : product-owner
- **Envoie à** : ux-designer, product-owner
- **Output** : markdown (rapport recherche, personas)
- *(pas de fichier .ts — agent documenté, non implémenté)*

### `ux-designer` ← `agents/design/ux-designer.ts` ⚠️
- **Trust** : VERIFIED
- **Rôle** : Wireframes textuels, arborescence, zoning, prototypes fonctionnels, accessibilité WCAG dès la conception
- **Checklist a11y** : 24 points (structure, navigation, formulaires, images, couleurs, animations) — à compléter avant envoi au dev
- **Reçoit de** : ux-researcher, product-owner
- **Envoie à** : ui-designer, frontend-dev, copywriter
- **Output** : markdown

### `ui-designer` ← `agents/design/ui-designer.ts` ⚠️
- **Trust** : VERIFIED
- **Rôle** : Design system, composants visuels, design tokens (couleurs, typographie, espacement), specs pour développeurs
- **Checklist a11y** : 30 points (contrastes chiffrés, typographie, focus ring, zones 44×44px, responsive) — à compléter avant envoi au dev
- **Reçoit de** : ux-designer
- **Envoie à** : frontend-dev, motion-designer
- **Output** : spec (JSON design tokens, specs composants)

### `motion-designer` ← `agents/design/motion-designer.ts`
- **Trust** : VERIFIED
- **Rôle** : Specs d'animation CSS/JS, micro-interactions, transitions, `prefers-reduced-motion`
- **Reçoit de** : ui-designer
- **Envoie à** : frontend-dev
- **Output** : spec (specs animations JSON)

### `art-director` ← `agents/design/art-director.ts`
- **Trust** : VERIFIED
- **Rôle** : Direction créative, charte graphique, cohérence visuelle globale, validation des assets
- **Reçoit de** : ui-designer, motion-designer
- **Envoie à** : account-manager, ui-designer
- **Output** : markdown (brief créatif, rapport de cohérence)

---

## Contenu & SEO

### `copywriter` ← `agents/content/copywriter.ts`
- **Trust** : VERIFIED
- **Rôle** : Textes UI (UX writing), landing pages, microcopy, CTAs, tone of voice
- **Reçoit de** : ux-designer, content-strategist
- **Envoie à** : frontend-dev, seo-specialist
- **Output** : markdown

### `content-strategist` ← `agents/content/content-strategist.ts`
- **Trust** : VERIFIED
- **Rôle** : Stratégie éditoriale, piliers de contenu, tone of voice, storytelling de marque, calendrier éditorial
- **Reçoit de** : account-manager, business-analyst
- **Envoie à** : copywriter, social-media-manager
- **Output** : markdown (stratégie éditoriale)

### `seo-specialist` ← `agents/content/seo-specialist.ts`
- **Trust** : VERIFIED
- **Rôle** : Audit SEO technique, recherche de mots-clés (intention + clustering), optimisation on-page, Core Web Vitals
- **Reçoit de** : copywriter, performance-auditor
- **Envoie à** : frontend-dev, copywriter
- **Output** : markdown (rapport SEO, recommandations)

### `social-media-manager` ← `agents/content/social-media-manager.ts`
- **Trust** : VERIFIED
- **Rôle** : Posts réseaux sociaux (LinkedIn, Instagram, X), calendrier éditorial multi-canal, engagement
- **Reçoit de** : content-strategist
- **Envoie à** : account-manager
- **Output** : markdown (calendrier éditorial, posts)

### `translator` ← `agents/content/translator.ts`
- **Trust** : VERIFIED
- **Rôle** : Localisation, i18n (ICU Message Format), adaptation culturelle, glossaire terminologique
- **Reçoit de** : copywriter, frontend-dev
- **Envoie à** : frontend-dev
- **Output** : json (fichiers i18n)

---

## Développement

### `architect`
- **Trust** : VERIFIED
- **Rôle** : Architecture technique, choix de stack, patterns architecturaux, ADRs
- **Reçoit de** : product-owner, security-architect
- **Envoie à** : tech-lead, backend-dev, frontend-dev
- **Output** : markdown (ADR, schémas d'architecture)
- *(pas de fichier .ts — agent documenté, non implémenté)*

### `tech-lead`
- **Trust** : VERIFIED
- **Rôle** : Standards de code, revue d'architecture, gestion de la dette technique, mentoring
- **Reçoit de** : architect, project-manager
- **Envoie à** : frontend-dev, backend-dev, devops-engineer
- **Output** : markdown (guidelines, revue de code)
- *(pas de fichier .ts — agent documenté, non implémenté)*

### `frontend-dev` ← `agents/dev/frontend-dev.ts` ⚠️
- **Trust** : VERIFIED
- **Stack principale** : React 18+ (hooks, RSC, Zustand, React Query, Next.js 14+, Vite)
- **Stack secondaire** : Vue 3 (Composition API, Pinia, Nuxt 3)
- **Rôle** : Composants UI TypeScript strict, accessibilité WCAG 2.1 AA, Core Web Vitals
- **Checklist a11y** : 43 points (HTML sémantique, ARIA, clavier, formulaires, live regions) — à valider avant envoi QA
- **Reçoit de** : ui-designer, ux-designer, tech-lead
- **Envoie à** : qa-lead, devops-engineer
- **Output** : markdown (code, documentation)

### `backend-dev` ← `agents/dev/backend-dev.ts`
- **Trust** : VERIFIED
- **Stack principale** : Node.js (NestJS/Fastify, Prisma/TypeORM, Jest, OpenAPI 3.1)
- **Stack secondaire** : Java (Spring Boot 3, Spring Security 6, JPA/Hibernate, Maven/Gradle)
- **Rôle** : API REST/GraphQL, sécurité OWASP backend, migrations DB, JWT/OAuth2, Docker
- **Reçoit de** : architect, tech-lead, security-architect
- **Envoie à** : qa-lead, devops-engineer
- **Output** : markdown (code, specs API)

### `mobile-dev` ← `agents/dev/mobile-dev.ts`
- **Trust** : VERIFIED
- **Stack** : React Native (Expo SDK 51+, React Navigation, Zustand), PWA (Workbox 7+)
- **Rôle** : Applications iOS/Android, offline-first, sécurité stockage (SecureStore), perf mobile
- **Reçoit de** : ui-designer, tech-lead
- **Envoie à** : qa-lead
- **Output** : markdown (code mobile)

### `fullstack-dev` ← `agents/dev/fullstack-dev.ts`
- **Trust** : VERIFIED
- **Stack** : Next.js 14+ (App Router, Server Actions), tRPC v11, Prisma, Turborepo, Auth.js
- **Rôle** : Prototypage rapide, architecture Server/Client Components, intégrations complexes
- **Reçoit de** : tech-lead, architect
- **Envoie à** : qa-lead
- **Output** : markdown

### `integrator` ← `agents/dev/integrator.ts`
- **Trust** : VERIFIED
- **Stack** : Node.js + SDKs partenaires, CMS headless (Strapi 5, Contentful, Sanity), BullMQ
- **Rôle** : Connecteurs CMS, webhooks signés HMAC, APIs partenaires (Stripe, Shopify), files d'attente
- **Reçoit de** : backend-dev, tech-lead
- **Envoie à** : qa-lead, devops-engineer
- **Output** : markdown (documentation intégration)

---

## QA & Qualité

### `qa-lead` ← `agents/qa/qa-lead.ts`
- **Trust** : VERIFIED
- **Rôle** : Stratégie de test complète, plan de recette, coordination QA
- **Reçoit de** : product-owner, tech-lead
- **Envoie à** : manual-tester, automation-tester, a11y-auditor, rgaa-wcag-auditor, rgesn-auditor, performance-auditor, security-auditor
- **Output** : markdown

### `manual-tester` ← `agents/qa/manual-tester.ts`
- **Trust** : VERIFIED
- **Rôle** : Recette fonctionnelle manuelle, bug reports (sévérité CRITIQUE/MAJEUR/MINEUR/COSMÉTIQUE), régressions
- **Reçoit de** : qa-lead
- **Envoie à** : qa-lead, tech-lead
- **Output** : markdown (bug report, rapport de recette)

### `automation-tester` ← `agents/qa/automation-tester.ts`
- **Trust** : VERIFIED
- **Rôle** : Tests E2E Playwright, tests unitaires Vitest, intégration CI (pyramide 70/20/10)
- **Reçoit de** : qa-lead
- **Envoie à** : devops-engineer, qa-lead
- **Output** : markdown (code de test)

### `a11y-auditor` ← `agents/qa/a11y-auditor.ts`
- **Trust** : VERIFIED
- **Rôle** : Audit accessibilité WCAG 2.1 AA / RGAA 4.1 (audit généraliste, sans plugin dédié)
- **Reçoit de** : qa-lead, frontend-dev
- **Envoie à** : frontend-dev, qa-lead
- **Output** : markdown (rapport RGAA/WCAG)

### `rgaa-wcag-auditor` ← `agents/qa/rgaa-wcag-auditor.ts` 🔌
- **Trust** : VERIFIED
- **Plugin** : [Numérique Responsable](https://github.com/WilliamLaime/numerique-responsable) (`mcp-numerique-responsable`)
- **Rôle** : Audit automatisé via plugin — RGAA 4.1.2 (106 critères, 13 thématiques) pour les sites français, WCAG 2.1/2.2 pour l'international. Tests lecteurs d'écran (NVDA+Chrome, VoiceOver+Safari). Génère la déclaration d'accessibilité officielle.
- **Reçoit de** : qa-lead, frontend-dev, compliance-officer
- **Envoie à** : frontend-dev, qa-lead, compliance-officer
- **Output** : markdown (rapport RGAA/WCAG + déclaration d'accessibilité)

### `rgesn-auditor` ← `agents/qa/rgesn-auditor.ts` 🔌
- **Trust** : VERIFIED
- **Plugin** : [Numérique Responsable](https://github.com/WilliamLaime/numerique-responsable) (`mcp-numerique-responsable`)
- **Rôle** : Audit éco-conception selon RGESN 2024 — 79 critères, 9 thématiques, score pondéré, calcul EcoIndex, plan de remédiation avec estimation CO₂. Parties non-automatisables (Stratégie, Hébergement) complétées par interview client.
- **Reçoit de** : qa-lead, frontend-dev, devops-engineer, compliance-officer
- **Envoie à** : frontend-dev, qa-lead, compliance-officer, cloud-architect
- **Output** : markdown (rapport RGESN + score éco-conception)

### `performance-auditor` ← `agents/qa/performance-auditor.ts`
- **Trust** : VERIFIED
- **Rôle** : Lighthouse CI, Core Web Vitals (LCP < 2.5s, CLS < 0.1, INP < 200ms), WebPageTest, optimisations
- **Reçoit de** : qa-lead, frontend-dev
- **Envoie à** : frontend-dev, seo-specialist
- **Output** : markdown (rapport performance)

### `ux-tester` ← `agents/qa/ux-tester.ts`
- **Trust** : VERIFIED
- **Rôle** : Tests utilisateurs (think-aloud, min. 5 participants Nielsen), heatmaps, session replays, SUS score
- **Reçoit de** : qa-lead, ux-designer
- **Envoie à** : ux-designer, cro-specialist
- **Output** : markdown (rapport tests UX)

### `security-auditor` ← `agents/security/security-auditor.ts`
- **Trust** : TRUSTED
- **Rôle** : Audit OWASP Top 10, scan CVE, pentest (PoC non destructifs), rapport de sécurité
- **Reçoit de** : security-architect, tech-lead
- **Envoie à** : compliance-officer, tech-lead
- **Output** : markdown (rapport sécurité)

---

## Data & Analytics

### `data-analyst` ← `agents/data/data-analyst.ts`
- **Trust** : VERIFIED
- **Rôle** : Dashboards KPIs (Looker Studio, Metabase), analyses statistiques, cohortes, segmentation RFM
- **Reçoit de** : analytics-specialist, product-owner
- **Envoie à** : project-director, account-manager
- **Output** : markdown (rapport analytique)

### `analytics-specialist` ← `agents/data/analytics-specialist.ts`
- **Trust** : VERIFIED
- **Rôle** : GA4 + GTM, plan de taggage, Consent Mode v2 (RGPD), attribution multi-touch
- **Reçoit de** : product-owner, devops-engineer
- **Envoie à** : data-analyst, frontend-dev
- **Output** : spec (plan de taggage JSON)

### `cro-specialist` ← `agents/data/cro-specialist.ts`
- **Trust** : VERIFIED
- **Rôle** : A/B tests (framework ICE), optimisation tunnels de conversion, significativité statistique
- **Reçoit de** : data-analyst, ux-tester
- **Envoie à** : ux-designer, frontend-dev
- **Output** : markdown (rapport CRO, hypothèses de test)

---

## DevOps & Infra

### `devops-engineer` ← `agents/devops/devops-engineer.ts`
- **Trust** : TRUSTED
- **Rôle** : CI/CD (GitHub Actions), Docker multi-stage, déploiements, scan Trivy, secrets management
- **Reçoit de** : tech-lead, qa-lead
- **Envoie à** : sre, account-manager
- **Output** : yaml (pipelines CI/CD, Dockerfile)

### `cloud-architect` ← `agents/devops/cloud-architect.ts`
- **Trust** : TRUSTED
- **Rôle** : Architecture cloud AWS/GCP/Azure, Terraform (IaC 100%), FinOps, haute disponibilité Multi-AZ
- **Reçoit de** : architect, security-architect
- **Envoie à** : devops-engineer, sre
- **Output** : yaml (architecture cloud, IaC Terraform)

### `sre` ← `agents/devops/sre.ts`
- **Trust** : TRUSTED
- **Rôle** : SLI/SLO/SLA, monitoring (Datadog/Grafana), alerting burn rate, gestion incidents, post-mortems blameless
- **Reçoit de** : devops-engineer, cloud-architect
- **Envoie à** : project-manager, account-manager
- **Output** : markdown (rapport SRE, post-mortem)

---

## Sécurité (agents dédiés)

### `security-architect` ← `agents/security/security-architect.ts`
- **Trust** : TRUSTED
- **Rôle** : Threat modeling STRIDE, architecture zero trust, conformité RGPD/DSP2/PCI-DSS, exigences de sécurité
- **Reçoit de** : architect, project-director
- **Envoie à** : security-auditor, compliance-officer, tech-lead
- **Output** : markdown (threat model, exigences sécurité)

### `compliance-officer` ← `agents/security/compliance-officer.ts`
- **Trust** : TRUSTED
- **Rôle** : RGPD (registre traitements, AIPD, droits), RGAA légal, normes bancaires (DSP2, ACPR, PCI-DSS)
- **Reçoit de** : security-architect, security-auditor
- **Envoie à** : project-director, account-manager
- **Output** : markdown (rapport de conformité, plan de remédiation)

---

## Relation Client

### `account-manager` ← `agents/client/account-manager.ts`
- **Trust** : VERIFIED
- **Rôle** : Brief client, comptes-rendus de réunion (CR sous 24h), gestion des attentes, NPS
- **Reçoit de** : project-director, customer-success
- **Envoie à** : project-director, product-owner, business-analyst
- **Output** : markdown (brief, CR réunion)

### `customer-success` ← `agents/client/customer-success.ts`
- **Trust** : VERIFIED
- **Rôle** : Onboarding post-livraison, guides d'utilisation, NPS/CSAT/CES, rétention, Time to Value
- **Reçoit de** : account-manager, devops-engineer
- **Envoie à** : account-manager, project-manager
- **Output** : markdown (plan onboarding, guide d'utilisation)

---

## Workers Background

| Worker | Fréquence | Description |
|---|---|---|
| `audit-worker` | Quotidien | Flush des logs et rotation des fichiers d'audit |
| `pii-sweep-worker` | Quotidien | Scan de la mémoire vectorielle pour PII résiduels |
| `cve-monitor-worker` | Hebdomadaire | Scan `npm audit` et génération de rapport CVE |
| `secret-rotation-reminder-worker` | Quotidien | Alerte si clés API > 30 jours sans rotation |
| `ux-consistency-worker` | Quotidien | Vérification de la cohérence du design system |
| `seo-monitor-worker` | Hebdomadaire | Snapshot SEO et détection de régressions |
| `quality-score-worker` | Après livrable | Calcul du score qualité global du projet |
| `pattern-optimizer-worker` | Nocturne | Distillation des meilleurs patterns en mémoire |
| `retrospective-worker` | Fin de sprint | Génération automatique de la rétrospective |

---

## Ajouter un agent

1. Créer `agents/{domaine}/{nom-agent}.ts` en suivant le pattern `AgentDefinition`
2. Enregistrer dans `agents/registry.ts`
3. Documenter dans ce fichier
4. Mettre à jour les `collaboration.receives_from` / `sends_to` des agents voisins

Voir `CLAUDE.md` pour le pattern complet et les règles TypeScript strictes.
