# WORKFLOWS.md — Nexus Agency

Documentation des workflows d'orchestration multi-agents.

---

## `new-feature.yml`

**Déclencheur** : Manuel
**Durée estimée** : 2-5 jours (selon complexité)
**Trust minimum** : VERIFIED (TRUSTED pour sécurité et déploiement)

### Pipeline

```
security-architect (threat model)
  ↓
product-owner (user stories + acceptance criteria)
  ↓
ux-researcher (personas, user journey)
  ↓
ux-designer (wireframes, arborescence)
  ↓
ui-designer (specs visuelles, design tokens)
  + copywriter (textes UI)
  ↓
architect (architecture technique)
  ↓
tech-lead (revue architecture)
  ↓
[PARALLEL] frontend-dev + backend-dev
  ↓
security-auditor (audit OWASP) ← BLOQUANT
  ↓
[PARALLEL] automation-tester + manual-tester + a11y-auditor + performance-auditor
  ↓
devops-engineer (déploiement) ← conditionnel : 0 CVE critique + tests OK
  ↓
data-analyst (setup analytics)
```

### Condition de déploiement
- `security_audit.vulnerabilities.critical == 0`
- `qa_testing.automation_tests.passed == true`

---

## `ux-audit.yml`

**Déclencheur** : Manuel ou mensuel
**Durée estimée** : 1-2 jours

### Pipeline

```
ux-researcher (baseline actuelle)
  ↓
ux-tester (heatmaps, sessions replay)
  ↓
a11y-auditor (WCAG 2.1 AA, RGAA)
  + performance-auditor (Core Web Vitals)
  ↓
cro-specialist (analyse conversion)
  ↓
data-analyst (synthèse KPIs)
  ↓
copywriter (recommandations copy)
  ↓
account-manager (rapport client)
```

---

## `security-audit.yml`

**Déclencheur** : Hebdomadaire (lundi 02h00) + Manuel
**Durée estimée** : 2-4 heures
**Trust minimum** : TRUSTED pour tous les steps

### Pipeline

```
cve-monitor (npm audit --json)
  + secret-scanner (scan codebase)
  ↓
security-auditor (OWASP Top 10)
  + pii-sweep-worker (mémoire vectorielle)
  ↓
compliance-officer (RGPD + bancaire)
  ↓
security-architect (mise à jour threat model)
  ↓
security-architect (rapport final consolidé)
  ↓
tech-lead (tickets de remédiation)
  + devops-engineer (patches non-bloquants)
```

### Condition bloquante
Si `cve_scan.critical_count > 0` → **tous les déploiements sont bloqués** jusqu'à résolution.

---

## `full-project.yml`

**Déclencheur** : Manuel (début de projet)
**Durée** : Multiple sprints

### Pipeline

```
account-manager (brief client)
  ↓
business-analyst (benchmark, cadrage)
  ↓
project-manager (planning projet)
  ↓
scrum-master (setup agile)
  ↓
security-architect (threat model initial) ← DÈS LE DÉPART
  ↓
[N sprints: new-feature.yml × N]
  ↓
compliance-officer (audit final RGPD/RGAA)
  ↓
sre (setup monitoring production)
  ↓
customer-success (onboarding client)
```

---

## Gestion des namespaces

Chaque workflow opère dans un namespace isolé :

```
{client_namespace}-{domaine}

Exemples :
  acme-corp-strategy
  acme-corp-design
  acme-corp-security
  acme-corp-qa
```

La mémoire d'un client A est **physiquement inaccessible** depuis un agent travaillant sur le client B (AES-256-GCM par namespace).

---

## Ajout d'un workflow personnalisé

```yaml
name: mon-workflow
description: Description du workflow
version: "1.0"

trigger:
  type: manual

security:
  init_required: true    # obligatoire
  trust_level: VERIFIED
  audit_all_steps: true  # obligatoire

steps:
  - id: premier_step
    agent: product-owner
    action: write_user_stories
    trust_required: VERIFIED
    outputs:
      - user_stories

memory:
  store_patterns: true
  namespace_template: "{client_namespace}-{domaine}"
```
