# Workflows de référence

Ces fichiers YAML décrivent les workflows-types pour Nexus Agency.

**Le runner YAML n'est pas implémenté.** Pour orchestrer des agents, utilise `NexusOrchestrator.runWorkflow()` depuis `plugins/nexus-core/index.ts` — il prend des steps en TypeScript.

Ces fichiers servent de documentation sur l'intention d'orchestration, pas de configuration exécutable.

## Workflows disponibles

| Fichier | Description |
|---------|-------------|
| `new-feature.yml` | Pipeline complet pour une nouvelle feature : PO → UX → Dev → QA → Deploy |
| `security-audit.yml` | Audit de sécurité complet : CVE, secrets, OWASP, RGPD, conformité bancaire |

## Roadmap

- `ux-audit.yml` — audit UX/accessibilité autonome
- `full-project.yml` — pipeline projet complet de bout en bout
