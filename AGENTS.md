# AGENTS.md — Nexus Agency

Documentation des 38 agents du framework Nexus.

Chaque agent respecte le pattern `AgentDefinition` défini dans `plugins/nexus-core/index.ts`.

**Règles universelles** :
- `pii_check: true` — obligatoire pour tous
- `audit_log: true` — obligatoire pour tous
- `secret_scan_output: true` — obligatoire pour tous
- `memory_hooks.before` — recherche en mémoire avant chaque tâche
- `memory_hooks.after` — stockage des patterns réussis après chaque tâche

---

## Stratégie & Produit

### `project-director`
- **Domaine** : strategy
- **Trust** : TRUSTED
- **Rôle** : Vision globale du projet, arbitrages stratégiques, reporting client C-level
- **Reçoit de** : account-manager, business-analyst
- **Envoie à** : project-manager, product-owner
- **Output** : markdown (vision doc, compte-rendu de direction)

### `project-manager`
- **Domaine** : strategy
- **Trust** : VERIFIED
- **Rôle** : Planning, sprints, risques, suivi des livrables, coordination inter-équipes
- **Reçoit de** : project-director, product-owner
- **Envoie à** : scrum-master, tech-lead, account-manager
- **Output** : yaml (plan de projet, planning sprint)

### `product-owner` ← Implémenté dans `agents/strategy/product-owner.ts`
- **Domaine** : strategy
- **Trust** : VERIFIED
- **Rôle** : Backlog, user stories (format As a/I want/So that), acceptance criteria, priorisation MoSCoW
- **Reçoit de** : account-manager, business-analyst
- **Envoie à** : project-manager, ux-researcher, architect
- **Output** : markdown

### `business-analyst`
- **Domaine** : strategy
- **Trust** : VERIFIED
- **Rôle** : Benchmark concurrentiel, étude de marché, ROI, KPIs, cadrage fonctionnel
- **Reçoit de** : account-manager
- **Envoie à** : project-director, product-owner
- **Output** : markdown (étude, rapport)

### `scrum-master`
- **Domaine** : strategy
- **Trust** : VERIFIED
- **Rôle** : Facilitation agile, vélocité d'équipe, retrospectives, levée des blocages
- **Reçoit de** : project-manager
- **Envoie à** : project-manager, tech-lead
- **Output** : markdown (cr rétrospective, rapport vélocité)

---

## Design & UX

### `ux-researcher`
- **Domaine** : design
- **Trust** : VERIFIED
- **Rôle** : Personas, parcours utilisateurs, tests utilisateurs, insights UX
- **Reçoit de** : product-owner
- **Envoie à** : ux-designer, product-owner
- **Output** : markdown (rapport recherche, personas)

### `ux-designer` ← Implémenté dans `agents/design/ux-designer.ts`
- **Domaine** : design
- **Trust** : VERIFIED
- **Rôle** : Wireframes textuels, arborescence, zoning, prototypes fonctionnels, accessibilité WCAG dès la conception
- **Reçoit de** : ux-researcher, product-owner
- **Envoie à** : ui-designer, frontend-dev, copywriter
- **Output** : markdown

### `ui-designer`
- **Domaine** : design
- **Trust** : VERIFIED
- **Rôle** : Design system, composants visuels, specs de design, design tokens (couleurs, typographie, espacement)
- **Reçoit de** : ux-designer
- **Envoie à** : frontend-dev, motion-designer
- **Output** : spec (JSON design tokens, specs composants)

### `motion-designer`
- **Domaine** : design
- **Trust** : VERIFIED
- **Rôle** : Specs d'animation, micro-interactions, transitions, documentation des états animés
- **Reçoit de** : ui-designer
- **Envoie à** : frontend-dev
- **Output** : spec (specs animations CSS/JS)

### `art-director`
- **Domaine** : design
- **Trust** : VERIFIED
- **Rôle** : Cohérence visuelle globale, charte graphique, direction créative, validation des assets
- **Reçoit de** : ui-designer, motion-designer
- **Envoie à** : account-manager, ui-designer
- **Output** : markdown (brief créatif, rapport de cohérence)

---

## Contenu & SEO

### `copywriter`
- **Domaine** : content
- **Trust** : VERIFIED
- **Rôle** : Textes UI, landing pages, microcopy, CTAs, tone of voice cohérent
- **Reçoit de** : ux-designer, content-strategist
- **Envoie à** : frontend-dev, seo-specialist
- **Output** : markdown

### `content-strategist`
- **Domaine** : content
- **Trust** : VERIFIED
- **Rôle** : Stratégie éditoriale, tone of voice, storytelling de marque, calendrier éditorial
- **Reçoit de** : account-manager, business-analyst
- **Envoie à** : copywriter, social-media-manager
- **Output** : markdown (stratégie éditoriale)

### `seo-specialist`
- **Domaine** : content
- **Trust** : VERIFIED
- **Rôle** : Audit technique SEO, recherche de mots-clés, optimisation on-page, Core Web Vitals
- **Reçoit de** : copywriter, performance-auditor
- **Envoie à** : frontend-dev, copywriter
- **Output** : markdown (rapport SEO, recommandations)

### `social-media-manager`
- **Domaine** : content
- **Trust** : VERIFIED
- **Rôle** : Rédaction posts réseaux sociaux, calendrier éditorial, stratégie d'engagement
- **Reçoit de** : content-strategist
- **Envoie à** : account-manager
- **Output** : markdown (calendrier éditorial, posts)

### `translator`
- **Domaine** : content
- **Trust** : VERIFIED
- **Rôle** : Localisation, i18n, adaptation culturelle, cohérence terminologique
- **Reçoit de** : copywriter, frontend-dev
- **Envoie à** : frontend-dev
- **Output** : json (fichiers i18n)

---

## Développement

### `architect`
- **Domaine** : dev
- **Trust** : VERIFIED
- **Rôle** : Architecture technique, choix de stack, patterns architecturaux, ADRs (Architecture Decision Records)
- **Reçoit de** : product-owner, security-architect
- **Envoie à** : tech-lead, backend-dev, frontend-dev
- **Output** : markdown (ADR, schémas d'architecture)

### `tech-lead`
- **Domaine** : dev
- **Trust** : VERIFIED
- **Rôle** : Standards de code, revue d'architecture, gestion de la dette technique, mentoring
- **Reçoit de** : architect, project-manager
- **Envoie à** : frontend-dev, backend-dev, devops-engineer
- **Output** : markdown (guidelines, revue de code)

### `frontend-dev` ← Implémenté dans `agents/dev/frontend-dev.ts`
- **Domaine** : dev
- **Trust** : VERIFIED
- **Stack principale** : React 18+ (hooks, RSC, Zustand, React Query, Next.js 14+, Vite)
- **Stack secondaire** : Vue 3 (Composition API, Pinia, Nuxt 3)
- **Rôle** : Composants UI TypeScript strict, accessibilité WCAG 2.1 AA, optimisation Core Web Vitals, tests Vitest/RTL
- **Reçoit de** : ui-designer, ux-designer, tech-lead
- **Envoie à** : qa-lead, devops-engineer
- **Output** : markdown (code, documentation)

### `backend-dev` ← Implémenté dans `agents/dev/backend-dev.ts`
- **Domaine** : dev
- **Trust** : VERIFIED
- **Stack principale** : Node.js (NestJS/Fastify, Prisma/TypeORM, Jest, OpenAPI 3.1)
- **Stack secondaire** : Java (Spring Boot 3, Spring Security 6, JPA/Hibernate, Maven/Gradle)
- **Rôle** : API REST/GraphQL, sécurité OWASP backend, migrations DB, JWT/OAuth2, containerisation Docker
- **Reçoit de** : architect, tech-lead, security-architect
- **Envoie à** : qa-lead, devops-engineer
- **Output** : markdown (code, specs API)

### `mobile-dev` ← Implémenté dans `agents/dev/mobile-dev.ts`
- **Domaine** : dev
- **Trust** : VERIFIED
- **Stack** : React Native (Expo SDK 51+, React Navigation, Zustand), PWA (Workbox 7+)
- **Rôle** : Applications iOS/Android, offline-first, sécurité stockage (SecureStore), optimisation performance mobile
- **Reçoit de** : ui-designer, tech-lead
- **Envoie à** : qa-lead
- **Output** : markdown (code mobile)

### `fullstack-dev` ← Implémenté dans `agents/dev/fullstack-dev.ts`
- **Domaine** : dev
- **Trust** : VERIFIED
- **Stack** : Next.js 14+ (App Router, Server Actions), tRPC v11, Prisma, Turborepo
- **Rôle** : Prototypage rapide, intégrations complexes, architecture Server/Client Components, Auth.js
- **Reçoit de** : tech-lead, architect
- **Envoie à** : qa-lead
- **Output** : markdown

### `integrator` ← Implémenté dans `agents/dev/integrator.ts`
- **Domaine** : dev
- **Trust** : VERIFIED
- **Stack** : Node.js + SDKs partenaires, CMS headless (Strapi 5, Contentful, Sanity), BullMQ
- **Rôle** : Connecteurs CMS, webhooks signés HMAC, APIs partenaires (Stripe, Shopify), file d'attente asynchrone
- **Reçoit de** : backend-dev, tech-lead
- **Envoie à** : qa-lead, devops-engineer
- **Output** : markdown (documentation intégration)

---

## QA & Qualité

### `qa-lead` ← Implémenté dans `agents/qa/qa-lead.ts`
- **Domaine** : qa
- **Trust** : VERIFIED
- **Rôle** : Stratégie de test complète, plan de recette, couverture, coordination QA
- **Reçoit de** : product-owner, tech-lead
- **Envoie à** : manual-tester, automation-tester, a11y-auditor, performance-auditor, security-auditor
- **Output** : markdown

### `manual-tester`
- **Domaine** : qa
- **Trust** : VERIFIED
- **Rôle** : Scénarios de recette manuelle, bug reports détaillés, tests de régression
- **Reçoit de** : qa-lead
- **Envoie à** : qa-lead, tech-lead
- **Output** : markdown (bug report, rapport de recette)

### `automation-tester`
- **Domaine** : qa
- **Trust** : VERIFIED
- **Rôle** : Scripts E2E avec Playwright/Cypress, tests unitaires Jest, intégration CI/CD
- **Reçoit de** : qa-lead
- **Envoie à** : devops-engineer, qa-lead
- **Output** : markdown (code de test)

### `a11y-auditor`
- **Domaine** : qa
- **Trust** : VERIFIED
- **Rôle** : Audit WCAG 2.1 AA, RGAA 4.1, rapport d'accessibilité, recommandations et correctifs
- **Reçoit de** : qa-lead, frontend-dev
- **Envoie à** : frontend-dev, qa-lead
- **Output** : markdown (rapport RGAA/WCAG)

### `performance-auditor`
- **Domaine** : qa
- **Trust** : VERIFIED
- **Rôle** : Lighthouse, Core Web Vitals, WebPageTest, optimisations, métriques de performance
- **Reçoit de** : qa-lead, frontend-dev
- **Envoie à** : frontend-dev, seo-specialist
- **Output** : markdown (rapport performance)

### `security-auditor` ← Implémenté dans `agents/security/security-auditor.ts`
- **Domaine** : security
- **Trust** : TRUSTED
- **Rôle** : Audit OWASP Top 10, scan CVE, pentest (PoC non destructifs), rapport de sécurité
- **Reçoit de** : security-architect, tech-lead
- **Envoie à** : compliance-officer, tech-lead
- **Output** : markdown (rapport sécurité)

### `ux-tester`
- **Domaine** : qa
- **Trust** : VERIFIED
- **Rôle** : Tests utilisateurs, analyse heatmaps, sessions replay, insights UX quantitatifs
- **Reçoit de** : qa-lead, ux-designer
- **Envoie à** : ux-designer, cro-specialist
- **Output** : markdown (rapport tests UX)

### `rgaa-wcag-auditor` ← Implémenté dans `agents/qa/rgaa-wcag-auditor.ts`
- **Domaine** : qa
- **Trust** : VERIFIED
- **Plugin** : [Numérique Responsable](https://github.com/WilliamLaime/numerique-responsable) (`mcp-numerique-responsable`)
- **Rôle** : Audit accessibilité automatisé + manuel — RGAA 4.1.2 pour les sites français (obligations légales), WCAG 2.1/2.2 pour les sites internationaux. 106 critères, 13 thématiques, tests lecteurs d'écran
- **Reçoit de** : qa-lead, frontend-dev, compliance-officer
- **Envoie à** : frontend-dev, qa-lead, compliance-officer
- **Output** : markdown (rapport RGAA/WCAG + déclaration d'accessibilité)

### `rgesn-auditor` ← Implémenté dans `agents/qa/rgesn-auditor.ts`
- **Domaine** : qa
- **Trust** : VERIFIED
- **Plugin** : [Numérique Responsable](https://github.com/WilliamLaime/numerique-responsable) (`mcp-numerique-responsable`)
- **Rôle** : Audit éco-conception automatisé + manuel selon RGESN 2024 — 79 critères, 9 thématiques, score pondéré par thématique, calcul EcoIndex, plan de remédiation avec estimation CO₂
- **Reçoit de** : qa-lead, frontend-dev, devops-engineer, compliance-officer
- **Envoie à** : frontend-dev, qa-lead, compliance-officer, cloud-architect
- **Output** : markdown (rapport RGESN + score éco-conception + déclaration)

---

## Data & Analytics

### `data-analyst`
- **Domaine** : data
- **Trust** : VERIFIED
- **Rôle** : Tableaux de bord KPIs, analyses statistiques, insights métier, visualisations
- **Reçoit de** : analytics-specialist, product-owner
- **Envoie à** : project-director, account-manager
- **Output** : markdown (rapport analytique)

### `analytics-specialist`
- **Domaine** : data
- **Trust** : VERIFIED
- **Rôle** : Configuration GA4/GTM, plan de taggage, attribution, tracking des conversions
- **Reçoit de** : product-owner, devops-engineer
- **Envoie à** : data-analyst, frontend-dev
- **Output** : spec (plan de taggage JSON)

### `cro-specialist`
- **Domaine** : data
- **Trust** : VERIFIED
- **Rôle** : A/B tests, optimisation du tunnel de conversion, hypothèses UX basées sur données
- **Reçoit de** : data-analyst, ux-tester
- **Envoie à** : ux-designer, frontend-dev
- **Output** : markdown (rapport CRO, hypothèses de test)

---

## DevOps & Infra

### `devops-engineer`
- **Domaine** : devops
- **Trust** : TRUSTED
- **Rôle** : CI/CD (GitHub Actions), déploiements, containerisation Docker, automatisation infra
- **Reçoit de** : tech-lead, qa-lead
- **Envoie à** : sre, account-manager
- **Output** : yaml (pipelines CI/CD, Dockerfile)

### `cloud-architect`
- **Domaine** : devops
- **Trust** : TRUSTED
- **Rôle** : Architecture cloud AWS/GCP/Azure, scalabilité, optimisation des coûts, IaC (Terraform)
- **Reçoit de** : architect, security-architect
- **Envoie à** : devops-engineer, sre
- **Output** : yaml (architecture cloud, IaC)

### `sre`
- **Domaine** : devops
- **Trust** : TRUSTED
- **Rôle** : Monitoring (Datadog/Grafana), alerting, SLA/SLO, gestion des incidents, post-mortems
- **Reçoit de** : devops-engineer, cloud-architect
- **Envoie à** : project-manager, account-manager
- **Output** : markdown (rapport SRE, post-mortem)

---

## Sécurité (agents dédiés)

### `security-architect`
- **Domaine** : security
- **Trust** : TRUSTED
- **Rôle** : Conception sécurisée, threat modeling (STRIDE), conformité RGPD, revue d'architecture sécurité
- **Reçoit de** : architect, project-director
- **Envoie à** : security-auditor, compliance-officer, tech-lead
- **Output** : markdown (threat model, exigences sécurité)

### `security-auditor` ← voir section QA ci-dessus

### `compliance-officer`
- **Domaine** : security
- **Trust** : TRUSTED
- **Rôle** : Conformité RGPD, accessibilité RGAA, normes bancaires (DSP2, PCI-DSS), DPO support
- **Reçoit de** : security-architect, security-auditor
- **Envoie à** : project-director, account-manager
- **Output** : markdown (rapport de conformité, plan de remédiation)

---

## Relation Client

### `account-manager`
- **Domaine** : client
- **Trust** : VERIFIED
- **Rôle** : Brief client, comptes-rendus de réunion, suivi de la satisfaction, gestion des attentes
- **Reçoit de** : project-director, customer-success
- **Envoie à** : project-director, product-owner, business-analyst
- **Output** : markdown (brief, CR réunion)

### `customer-success`
- **Domaine** : client
- **Trust** : VERIFIED
- **Rôle** : Onboarding client, formation, rétention, NPS, suivi post-livraison
- **Reçoit de** : account-manager, devops-engineer
- **Envoie à** : account-manager, project-manager
- **Output** : markdown (rapport satisfaction, guide d'utilisation)

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
| `pattern-optimizer-worker` | Noctune | Distillation des meilleurs patterns en mémoire |
| `retrospective-worker` | Fin de sprint | Génération automatique de la rétrospective |
