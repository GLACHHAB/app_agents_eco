import { agents, flows, selectionLimit } from './agents'

export type FlowNature = 'reel' | 'monetaire'
export type RequestStatus = 'pending' | 'accepted' | 'refused'

export type FlowRequest = {
  id: string
  sender: string
  recipient: string
  flowId: string
  nature: FlowNature
  status: RequestStatus
  justification: string | null
  createdAt: string
  decidedAt: string | null
}

export type Game = {
  epoch: string
  validated: Record<string, string[]>
  requests: FlowRequest[]
}

export type GameChange = (epoch: string, action: (game: Game) => void, onError?: (message: string) => void) => Promise<boolean>

export const storageKey = 'agents-economiques-partie-v1'
export const channelName = 'agents-economiques-partie-v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRequest(value: unknown): value is FlowRequest {
  if (!isRecord(value)) return false
  const flow = flows.find((item) => item.id === value.flowId)
  const validDate = (date: unknown) => typeof date === 'string' && !Number.isNaN(Date.parse(date))
  return typeof value.id === 'string' && value.id.length > 0 &&
    typeof value.sender === 'string' && flow?.source === value.sender &&
    typeof value.recipient === 'string' && agents.some((agent) => agent.id === value.recipient) &&
    value.sender !== value.recipient &&
    (value.nature === 'reel' || value.nature === 'monetaire') &&
    validDate(value.createdAt) &&
    ((value.status === 'pending' && value.justification === null && value.decidedAt === null) ||
      ((value.status === 'accepted' || value.status === 'refused') &&
        typeof value.justification === 'string' && value.justification.trim().length > 0 && validDate(value.decidedAt)))
}

function isGame(value: unknown): value is Game {
  if (!isRecord(value) || typeof value.epoch !== 'string' || !value.epoch ||
      !isRecord(value.validated) || !Array.isArray(value.requests)) return false
  for (const [agentId, ids] of Object.entries(value.validated)) {
    if (!agents.some((agent) => agent.id === agentId) || !Array.isArray(ids) ||
        ids.length > selectionLimit || new Set(ids).size !== ids.length ||
        !ids.every((id) => typeof id === 'string' && flows.some((flow) => flow.id === id && flow.source === agentId))) return false
  }
  if (!value.requests.every(isRequest)) return false
  return new Set(value.requests.map((request) => request.id)).size === value.requests.length
}

function newGame(): Game {
  return { epoch: crypto.randomUUID(), validated: {}, requests: [] }
}

export function readGame(): Game | null {
  const raw = localStorage.getItem(storageKey)
  if (raw === null) return null
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new Error('Les données enregistrées de la partie ne sont pas un JSON valide.')
  }
  if (!isGame(value)) throw new Error('Les données enregistrées de la partie sont invalides.')
  return value
}

function withLock<T>(callback: () => T): Promise<T> {
  if (!navigator.locks || typeof BroadcastChannel === 'undefined' || !crypto.randomUUID) {
    throw new Error('Ce navigateur ne prend pas en charge les fonctions nécessaires à la synchronisation. Utilisez un navigateur récent en HTTPS ou sur localhost.')
  }
  return navigator.locks.request(channelName, callback)
}

export function initializeGame(): Promise<void> {
  return withLock(() => {
    if (!readGame()) localStorage.setItem(storageKey, JSON.stringify(newGame()))
  })
}

export function updateGame(epoch: string, change: (game: Game) => void): Promise<void> {
  return withLock(() => {
    const game = readGame()
    if (!game || game.epoch !== epoch) {
      throw new Error('La partie a été réinitialisée dans un autre onglet. Recommencez cette action.')
    }
    change(game)
    if (!isGame(game)) throw new Error('Impossible d’enregistrer des données de partie invalides.')
    localStorage.setItem(storageKey, JSON.stringify(game))
  })
}

export function resetGame(game: Game) {
  Object.assign(game, newGame())
}

export function createRequest(game: Game, request: Pick<FlowRequest, 'sender' | 'recipient' | 'flowId' | 'nature'>) {
  const { sender, recipient, flowId, nature } = request
  const flow = flows.find((item) => item.id === flowId)
  if (!flow || flow.source !== sender) {
    throw new Error('Ce flux n’existe pas ou ne correspond pas à votre agent.')
  }
  const validated = game.validated[sender] ?? []
  if (validated.length !== selectionLimit || !validated.includes(flowId)) {
    throw new Error('Validez d’abord les huit flux sortants de cet agent.')
  }
  if (recipient === sender || !agents.some((agent) => agent.id === recipient)) {
    throw new Error('Choisissez un autre agent destinataire.')
  }
  if (nature !== 'reel' && nature !== 'monetaire') throw new Error('Choisissez une nature de flux.')
  if (flow.recipient !== recipient || flow.type !== nature) {
    throw new Error('La proposition ne correspond pas aux caractéristiques du flux. Vérifiez le destinataire et la nature.')
  }
  if (game.requests.some((item) => item.sender === sender && item.flowId === flowId &&
      item.recipient === recipient && item.nature === nature)) {
    throw new Error('Cette proposition a déjà été envoyée.')
  }
  game.requests.push({
    id: crypto.randomUUID(),
    ...request,
    status: 'pending',
    justification: null,
    createdAt: new Date().toISOString(),
    decidedAt: null,
  })
}

export function decideRequest(game: Game, id: string, recipient: string, status: 'accepted' | 'refused', justification: string) {
  const request = game.requests.find((item) => item.id === id)
  if (!request || request.recipient !== recipient) throw new Error('Cette demande ne vous est pas adressée.')
  if (request.status !== 'pending') throw new Error('Cette demande a déjà été traitée.')
  const reason = justification.trim()
  if (!reason) throw new Error('Une justification est obligatoire.')
  request.status = status
  request.justification = reason
  request.decidedAt = new Date().toISOString()
}
