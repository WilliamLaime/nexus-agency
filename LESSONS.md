# LESSONS.md — Nexus Agency

Erreurs passées à ne jamais reproduire. Mise à jour à chaque incident ou correction notable.

Format d'entrée :
```
### [YYYY-MM-DD] Titre court
**Catégorie** : TypeScript | ESM | Sécurité | Architecture | Tests
**Erreur** : ce qui s'est passé
**Impact** : ce qui a cassé
**Fix** : la solution correcte
**Source** : commit ou contexte
```

---

## TypeScript strict

### [2026-05-06] Import statique d'agent avant `initSecurity()`
**Catégorie** : Sécurité  
**Erreur** : Importer un agent via `import { X } from './agents/...'` au top-level, avant l'appel à `initSecurity()`  
**Impact** : L'agent s'exécute sans couche sécurité — PII non filtrés, audit log absent, secrets non scannés  
**Fix** : Toujours utiliser des dynamic imports après `await initSecurity()` :
```typescript
await initSecurity()
const { MyAgent } = await import('./agents/domain/my-agent.js')
```
**Source** : CLAUDE.md règle absolue n°1

---

### [2026-05-06] Extension `.js` manquante dans les imports relatifs
**Catégorie** : ESM  
**Erreur** : Écrire `import { foo } from './bar'` sans extension  
**Impact** : `ERR_MODULE_NOT_FOUND` au runtime (Node ESM ne résout pas sans extension)  
**Fix** : Toujours écrire `import { foo } from './bar.js'`  
**Source** : tsconfig `"module": "nodenext"` + `"type": "module"` dans package.json

---

### [2026-05-06] `undefined` passé explicitement sur un champ optionnel (`exactOptionalPropertyTypes`)
**Catégorie** : TypeScript  
**Erreur** : `auditLog({ ..., metadata: undefined })` — passer `undefined` sur un champ `metadata?: X`  
**Impact** : Erreur de compilation TypeScript avec `exactOptionalPropertyTypes: true`  
**Fix** : Omettre le champ optionnel plutôt que de passer `undefined` :
```typescript
auditLog({ agentName: 'x', action: 'y', namespace: 'z', outcome: 'ALLOWED' })
```
**Source** : tsconfig strict

---

### [2026-05-06] Accès tableau non gardé (`noUncheckedIndexedAccess`)
**Catégorie** : TypeScript  
**Erreur** : Utiliser `match[0]` directement après `text.match(/pattern/)` sans vérification  
**Impact** : Erreur TypeScript — `match[0]` est `string | undefined`, pas `string`  
**Fix** :
```typescript
const match = text.match(/pattern/)
if (!match) return
const value = match[0]
if (!value) return
```
**Source** : tsconfig strict

---

### [2026-05-06] Mélanger imports runtime et imports type-seulement (`verbatimModuleSyntax`)
**Catégorie** : TypeScript  
**Erreur** : `import { z, ZodSchema } from 'zod'` quand `ZodSchema` est une interface (type seulement)  
**Impact** : Erreur de compilation avec `verbatimModuleSyntax: true`  
**Fix** :
```typescript
import { z } from 'zod'
import type { ZodSchema } from 'zod'
```
**Source** : tsconfig strict

---

## Architecture

### [2026-05-06] `ANTHROPIC_BASE_URL` défini dans les fichiers de config
**Catégorie** : Sécurité  
**Erreur** : Ajouter `ANTHROPIC_BASE_URL` dans `.env`, `.env.example` ou tout fichier de config du repo  
**Impact** : Nexus bloque au démarrage (CVE-2026-21852) si la valeur n'est pas l'URL officielle Anthropic  
**Fix** : Ne jamais définir cette variable dans les fichiers versionnés  
**Source** : CVE-2026-21852, `security/index.ts`
