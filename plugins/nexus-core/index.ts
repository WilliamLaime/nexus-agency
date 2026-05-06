import { withSecurityContext, initSecurity, assertTrustLevel, auditLog } from '../../security/index.js'
import type { TrustLevel, AgentCallContext, AgentFn } from '../../security/index.js'

export type { TrustLevel }

export type AgentDomain =
  | 'strategy'
  | 'design'
  | 'content'
  | 'dev'
  | 'qa'
  | 'data'
  | 'devops'
  | 'security'
  | 'client'

export interface SecurityRules {
  pii_check: boolean
  audit_log: boolean
  secret_scan_output: boolean
  trust_level_required: TrustLevel
}

export interface MemoryHooks {
  before: string
  after: string
}

export interface AgentCollaboration {
  receives_from: string[]
  sends_to: string[]
}

export interface AgentDefinition {
  name: string
  domain: AgentDomain
  system_prompt: string
  security_rules: SecurityRules
  memory_hooks: MemoryHooks
  quality_criteria: string[]
  collaboration: AgentCollaboration
  output_format: 'markdown' | 'json' | 'yaml' | 'spec'
  tools: string[]
}

export interface AgentContext {
  namespace: string
  trustLevel: TrustLevel
  sessionId: string
}

export interface AgentRunResult {
  output: string
  agentName: string
  namespace: string
  durationMs: number
}

export interface PipelineStep {
  agentName: string
  agent: AgentDefinition
  skipped: boolean
}

export class Pipeline {
  readonly steps: PipelineStep[]
  private readonly _runAgent: (agentName: string, input: string, context: AgentContext, impl: AgentFn) => Promise<AgentRunResult>

  constructor(
    steps: PipelineStep[],
    runAgent: (agentName: string, input: string, context: AgentContext, impl: AgentFn) => Promise<AgentRunResult>
  ) {
    this.steps = steps
    this._runAgent = runAgent
  }

  skip(agentName: string): this {
    const step = this.steps.find((s) => s.agentName === agentName)
    if (!step) throw new Error(`Agent "${agentName}" not found in pipeline`)
    step.skipped = true
    return this
  }

  describe(): string {
    return this.steps
      .map((s) => (s.skipped ? `[${s.agentName} SKIPPED]` : s.agentName))
      .join(' → ')
  }

  async run(
    initialInput: string,
    context: AgentContext,
    implementations: Map<string, AgentFn>
  ): Promise<AgentRunResult[]> {
    const results: AgentRunResult[] = []
    let currentInput = initialInput

    for (const step of this.steps) {
      if (step.skipped) continue

      const impl = implementations.get(step.agentName)
      if (!impl) {
        throw new Error(`No implementation provided for agent "${step.agentName}"`)
      }

      const result = await this._runAgent(step.agentName, currentInput, context, impl)
      results.push(result)
      currentInput = result.output
    }

    return results
  }
}

export class AgentRunner {
  async run(
    agent: AgentDefinition,
    input: string,
    context: AgentContext,
    implementation: AgentFn
  ): Promise<AgentRunResult> {
    const start = Date.now()

    const callContext: AgentCallContext = {
      agentName: agent.name,
      namespace: context.namespace,
      trustLevel: context.trustLevel,
      sessionId: context.sessionId,
    }

    const output = await withSecurityContext(implementation, input, callContext)

    return {
      output,
      agentName: agent.name,
      namespace: context.namespace,
      durationMs: Date.now() - start,
    }
  }
}

export class NexusOrchestrator {
  private agents = new Map<string, AgentDefinition>()
  private runner = new AgentRunner()
  private initialized = false

  async init(): Promise<void> {
    if (this.initialized) return
    await initSecurity()
    this.initialized = true
  }

  register(agent: AgentDefinition): void {
    this.agents.set(agent.name, agent)
  }

  get(name: string): AgentDefinition | undefined {
    return this.agents.get(name)
  }

  getByDomain(domain: AgentDomain): AgentDefinition[] {
    return [...this.agents.values()].filter((a) => a.domain === domain)
  }

  async runAgent(
    agentName: string,
    input: string,
    context: AgentContext,
    implementation: AgentFn
  ): Promise<AgentRunResult> {
    if (!this.initialized) {
      throw new Error('NexusOrchestrator not initialized. Call init() first.')
    }

    const agent = this.agents.get(agentName)
    if (!agent) {
      throw new Error(`Agent "${agentName}" not registered`)
    }

    assertTrustLevel(context.trustLevel, agent.security_rules.trust_level_required, agentName)

    return this.runner.run(agent, input, context, implementation)
  }

  async runWorkflow(
    steps: Array<{ agentName: string; getInput: (prevOutput: string) => string }>,
    initialInput: string,
    context: AgentContext,
    implementations: Map<string, AgentFn>
  ): Promise<AgentRunResult[]> {
    if (!this.initialized) {
      throw new Error('NexusOrchestrator not initialized. Call init() first.')
    }

    const results: AgentRunResult[] = []
    let currentInput = initialInput

    for (const step of steps) {
      const impl = implementations.get(step.agentName)
      if (!impl) {
        throw new Error(`No implementation provided for agent "${step.agentName}"`)
      }

      const stepInput = results.length === 0 ? currentInput : step.getInput(results[results.length - 1]?.output ?? '')
      const result = await this.runAgent(step.agentName, stepInput, context, impl)
      results.push(result)
      currentInput = result.output
    }

    return results
  }

  buildPipeline(agentNames: string[]): Pipeline {
    if (agentNames.length === 0) {
      throw new Error('Pipeline must have at least one agent')
    }

    const steps: PipelineStep[] = []

    for (let i = 0; i < agentNames.length; i++) {
      const name = agentNames[i]
      if (!name) throw new Error(`Agent name at index ${i} is undefined`)

      const agent = this.agents.get(name)
      if (!agent) {
        throw new Error(`Agent "${name}" not registered`)
      }

      if (i > 0) {
        const prevName = agentNames[i - 1]
        if (!prevName) throw new Error(`Agent name at index ${i - 1} is undefined`)
        const prevAgent = this.agents.get(prevName)
        if (!prevAgent) throw new Error(`Agent "${prevName}" not registered`)
        if (!prevAgent.collaboration.sends_to.includes(name)) {
          throw new Error(
            `Agent "${prevName}" does not send to "${name}"\n  sends_to: ${prevAgent.collaboration.sends_to.join(', ')}`
          )
        }
      }

      steps.push({ agentName: name, agent, skipped: false })
    }

    return new Pipeline(steps, this.runAgent.bind(this))
  }

  listAgents(): AgentDefinition[] {
    return [...this.agents.values()]
  }
}

export const orchestrator = new NexusOrchestrator()
