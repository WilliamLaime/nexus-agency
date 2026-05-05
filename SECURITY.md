# Security Policy — Nexus Agency

## Overview

Nexus implémente une architecture de sécurité défense-en-profondeur conçue pour les environnements d'agences digitales, avec des exigences renforcées pour les contextes bancaires (CACD2 / Crédit Agricole).

La couche sécurité (`security/`) doit être initialisée **avant** tout agent. Aucun contournement n'est acceptable.

---

## Architecture de sécurité

```
Input → [prompt-injection-guard] → [input-validator] → [pii-detector]
     → Agent execution
     → [pii-detector] → [secret-scanner] → Output

Transversaux : [audit-logger] (toutes les actions) · [trust-policy] (inter-agents)
Infrastructure : [namespace-isolator] (mémoire) · [cve-monitor] (dépendances)
```

---

## Composants de sécurité

### `security/prompt-injection-guard.ts`
Détecte et bloque les tentatives d'injection de prompt avant toute exécution agent :
- Override direct : `ignore previous instructions`, `[SYSTEM]`, `<|system|>`
- Role hijacking : `you are now`, `act as`, `pretend to be`
- Jailbreak : `DAN mode`, `developer mode`, `bypass filter`
- Context injection : blocs système en backticks, `<!-- override -->`, `[INST]`
- Injection encodée : décodage base64 et re-scan

### `security/input-validator.ts`
Validation Zod sur 100% des inputs. Tout input hors schéma est rejeté avec log d'audit.

### `security/pii-detector.ts`
Détection de 14 types de données sensibles avec politiques configurables :

| Type | Politique défaut | Politique bancaire |
|---|---|---|
| EMAIL | REDACT | REDACT |
| PHONE_FR | REDACT | REDACT |
| IBAN | BLOCK | BLOCK |
| CREDIT_CARD | BLOCK | BLOCK |
| SIRET | REDACT | REDACT |
| NIR (sécu sociale) | BLOCK | BLOCK |
| PASSWORD | BLOCK | BLOCK |
| API_KEY | BLOCK | BLOCK |
| TOKEN / JWT | BLOCK | BLOCK |
| IP_ADDRESS | HASH | BLOCK |
| FULL_NAME | REDACT | REDACT |
| BIRTH_DATE | REDACT | REDACT |
| CONTRACT_NUMBER | BLOCK | BLOCK |
| HEALTH_DATA | BLOCK | BLOCK |

Active le mode bancaire via `NEXUS_BANKING_MODE=true`.

### `security/namespace-isolator.ts`
- Isolation stricte par couple (clientId, projectId)
- Chiffrement AES-256-GCM avec clés dérivées par HKDF
- Un agent sur le client A ne peut jamais lire la mémoire du client B
- Rotation de clés via `rotateNamespaceKey()`

### `security/audit-logger.ts`
- Log append-only de toutes les actions agents (jamais de suppression)
- Format JSON structuré, exportable
- Anonymisation RGPD automatique (PII jamais en clair dans les logs)
- Rétention configurable (`NEXUS_AUDIT_LOG_RETENTION_DAYS`, défaut : 90 jours)

### `security/trust-policy.ts`
- Niveaux : `TRUSTED` > `VERIFIED` > `UNTRUSTED`
- Downgrade automatique sur comportement anormal
- Validation mTLS pour la fédération inter-machines

### `security/secret-scanner.ts`
- Scan de tous les outputs avant livraison
- Détecte clés API, tokens, credentials dans le code généré
- Entropie de Shannon pour la détection de secrets génériques

### `security/cve-monitor.ts`
- Scan hebdomadaire `npm audit` via `execFile` (pas `exec` — protection injection shell)
- Rapport JSON dans `reports/security/cve-YYYY-MM-DD.json`
- Blocage si vulnérabilité critique détectée

---

## Variables d'environnement obligatoires

```env
NEXUS_MEMORY_ENCRYPTION_KEY=   # 32+ bytes, base64, OBLIGATOIRE
NEXUS_AGENT_SECRET=            # Secret JWT inter-agents, OBLIGATOIRE
ANTHROPIC_API_KEY=             # Clé API Anthropic, OBLIGATOIRE
```

Variables optionnelles mais recommandées :
```env
NEXUS_BANKING_MODE=true        # Active politiques strictes bancaires
NEXUS_TRUST_LEVEL=VERIFIED     # Niveau de confiance par défaut
NEXUS_AUDIT_LOG_RETENTION_DAYS=90
NEXUS_PII_POLICY=REDACT        # BLOCK | REDACT | HASH | PASS
```

**Règle absolue** : aucune clé API ne doit apparaître dans le code source ou les commits. Le `secret-scanner` bloque automatiquement tout output contenant un secret.

---

## Conformité CVE-2026-21852

Cette vulnérabilité permet à un repo malveillant de surcharger `ANTHROPIC_BASE_URL` via un fichier de config pour rediriger les appels API vers un serveur tiers.

**Protection Nexus** :
- Le fichier `.claude/settings.json` est scanné au démarrage
- Si `ANTHROPIC_BASE_URL` est présent dans un fichier de config repo, Nexus refuse de démarrer
- L'audit logger enregistre la tentative

---

## Politique de démarrage

Avant tout lancement de swarm :
1. `SECURITY.md` doit être présent et valide
2. `NEXUS_MEMORY_ENCRYPTION_KEY` doit être définie (32+ bytes)
3. Le répertoire `reports/security/` doit être accessible en écriture
4. Aucune vulnérabilité CVE critique dans les dépendances

---

## Conformité RGPD

- Données personnelles jamais stockées en clair en mémoire vectorielle
- Logs anonymisés automatiquement (PII → `[REDACTED:TYPE]`)
- Droit à l'effacement : `pruneNamespace(namespace)` supprime toutes les données chiffrées d'un namespace
- Rétention configurable et auditée

---

## Reporting de vulnérabilités

Pour signaler une vulnérabilité de sécurité dans Nexus :

1. **Ne pas** ouvrir d'issue GitHub publique
2. Envoyer un email à : laimewilliam@gmail.com
3. Inclure : description, étapes de reproduction, impact potentiel
4. Délai de réponse : 48h ouvrées

Les vulnérabilités confirmées seront corrigées en priorité et créditées dans le CHANGELOG.

---

## Checklist sécurité avant PR

- [ ] Aucun secret dans le code ou les tests
- [ ] `npm run lint` passe sans erreur
- [ ] Nouveaux inputs validés via Zod
- [ ] Nouveaux outputs passent par `secret-scanner`
- [ ] Actions loguées via `audit-logger`
- [ ] Accès mémoire via `namespace-isolator` uniquement
- [ ] `NEXUS_BANKING_MODE` testé si données financières impliquées
