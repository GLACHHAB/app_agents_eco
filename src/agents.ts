import bank from '../banque_40_flux_agents_economiques_v0_1.json'

export type Agent = {
  id: string
  name: string
  description: string
}

export const agents: Agent[] = Object.entries(bank.agents).map(([id, agent]) => ({
  id,
  ...agent,
}))

export const flows = bank.flows
export const selectionLimit = bank.selection_rules.required_outgoing_flows_per_agent
