// Registre central de tous les agents Nexus
// Import dynamique recommandé après initSecurity() — voir CLAUDE.md

// Stratégie
export { ProjectDirector } from './strategy/project-director.js'
export { ProjectManager } from './strategy/project-manager.js'
export { ProductOwner } from './strategy/product-owner.js'
export { BusinessAnalyst } from './strategy/business-analyst.js'
export { ScrumMaster } from './strategy/scrum-master.js'
export { UXResearcher } from './strategy/ux-researcher.js'

// Design
export { UXDesigner } from './design/ux-designer.js'
export { UIDesigner } from './design/ui-designer.js'
export { MotionDesigner } from './design/motion-designer.js'
export { ArtDirector } from './design/art-director.js'

// Contenu
export { Copywriter } from './content/copywriter.js'
export { ContentStrategist } from './content/content-strategist.js'
export { SEOSpecialist } from './content/seo-specialist.js'
export { SocialMediaManager } from './content/social-media-manager.js'
export { Translator } from './content/translator.js'

// Développement
export { FrontendDev } from './dev/frontend-dev.js'
export { BackendDev } from './dev/backend-dev.js'
export { MobileDev } from './dev/mobile-dev.js'
export { FullstackDev } from './dev/fullstack-dev.js'
export { Integrator } from './dev/integrator.js'
export { Architect } from './dev/architect.js'
export { TechLead } from './dev/tech-lead.js'

// QA & Qualité
export { QALead } from './qa/qa-lead.js'
export { ManualTester } from './qa/manual-tester.js'
export { AutomationTester } from './qa/automation-tester.js'
export { PerformanceAuditor } from './qa/performance-auditor.js'
export { UXTester } from './qa/ux-tester.js'
export { RGAAWCAGAuditor } from './qa/rgaa-wcag-auditor.js'
export { RGESNAuditor } from './qa/rgesn-auditor.js'

// Data & Analytics
export { DataAnalyst } from './data/data-analyst.js'
export { AnalyticsSpecialist } from './data/analytics-specialist.js'
export { CROSpecialist } from './data/cro-specialist.js'

// DevOps & Infra
export { DevopsEngineer } from './devops/devops-engineer.js'
export { CloudArchitect } from './devops/cloud-architect.js'
export { SRE } from './devops/sre.js'

// Sécurité
export { SecurityArchitect } from './security/security-architect.js'
export { SecurityAuditor } from './security/security-auditor.js'
export { ComplianceOfficer } from './security/compliance-officer.js'

// Relation Client
export { AccountManager } from './client/account-manager.js'
export { CustomerSuccess } from './client/customer-success.js'
