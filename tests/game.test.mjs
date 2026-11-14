import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

const bank = JSON.parse(await readFile(new URL('../banque_40_flux_agents_economiques_v0_1.json', import.meta.url), 'utf8'))
let server
let gameModule

before(async () => {
  server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  gameModule = await server.ssrLoadModule('/src/game.ts')
})

after(async () => {
  if (server) await server.close()
})

function gameFor(sender) {
  return {
    epoch: 'test-epoch',
    validated: { [sender]: bank.flows.filter((flow) => flow.source === sender).map((flow) => flow.id) },
    requests: [],
  }
}

function proposal(flow) {
  return { sender: flow.source, flowId: flow.id, recipient: flow.recipient, nature: flow.type }
}

test('une proposition correcte est enregistrée en attente', () => {
  const flow = bank.flows.find((item) => item.id === 'F01')
  const game = gameFor(flow.source)
  gameModule.createRequest(game, proposal(flow))
  assert.equal(game.requests.length, 1)
  assert.deepEqual(
    { sender: game.requests[0].sender, flowId: game.requests[0].flowId, recipient: game.requests[0].recipient, nature: game.requests[0].nature },
    proposal(flow),
  )
  assert.equal(game.requests[0].status, 'pending')
})

test('une proposition incorrecte ne modifie pas la partie et ne révèle pas la réponse', () => {
  const flow = bank.flows.find((item) => item.id === 'F01')
  const incorrectRecipient = Object.keys(bank.agents).find((id) => id !== flow.source && id !== flow.recipient)
  const otherNature = flow.type === 'reel' ? 'monetaire' : 'reel'
  const otherFlow = bank.flows.find((item) => item.source !== flow.source)
  const cases = [
    { ...proposal(flow), recipient: incorrectRecipient },
    { ...proposal(flow), nature: otherNature },
    { ...proposal(flow), recipient: incorrectRecipient, nature: otherNature },
    { ...proposal(flow), flowId: otherFlow.id },
    { ...proposal(flow), flowId: 'inexistant' },
  ]
  for (const candidate of cases) {
    const game = gameFor(flow.source)
    const before = structuredClone(game)
    assert.throws(() => gameModule.createRequest(game, candidate), (error) => {
      assert.match(error.message, /flux|proposition/i)
      assert.ok(!error.message.includes(bank.agents[flow.recipient].name))
      assert.ok(!error.message.includes(flow.type))
      return true
    })
    assert.deepEqual(game, before)
  }
})

test('les anciennes demandes incohérentes restent lisibles et inchangées', async () => {
  const flow = bank.flows.find((item) => item.id === 'F01')
  const nextFlow = bank.flows.find((item) => item.id === 'F02')
  const game = gameFor(flow.source)
  const legacy = {
    id: 'legacy',
    sender: flow.source,
    recipient: Object.keys(bank.agents).find((id) => id !== flow.source && id !== flow.recipient),
    flowId: flow.id,
    nature: flow.type === 'reel' ? 'monetaire' : 'reel',
    status: 'accepted',
    justification: 'Justification enregistrée',
    createdAt: '2026-01-01T10:00:00.000Z',
    decidedAt: '2026-01-01T10:01:00.000Z',
  }
  const pending = { ...legacy, id: 'legacy-pending', status: 'pending', justification: null, decidedAt: null }
  game.requests.push(legacy, pending)
  let stored = JSON.stringify(game)
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => stored, setItem: (_key, value) => { stored = value } },
  })
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { locks: { request: async (_name, callback) => callback() } },
  })
  try {
    assert.deepEqual(gameModule.readGame().requests[0], legacy)
    assert.deepEqual(gameModule.readGame().requests[1], pending)
    const original = stored
    await assert.rejects(gameModule.updateGame(game.epoch, (current) => {
      gameModule.createRequest(current, { ...proposal(nextFlow), nature: nextFlow.type === 'reel' ? 'monetaire' : 'reel' })
    }))
    assert.equal(stored, original)
    await gameModule.updateGame(game.epoch, (current) => gameModule.createRequest(current, proposal(nextFlow)))
    assert.deepEqual(gameModule.readGame().requests[0], legacy)
    assert.deepEqual(gameModule.readGame().requests[1], pending)
    assert.equal(gameModule.readGame().requests.length, 3)
    await gameModule.updateGame(game.epoch, (current) => gameModule.decideRequest(current, pending.id, pending.recipient, 'refused', 'Justification libre'))
    assert.equal(gameModule.readGame().requests[1].justification, 'Justification libre')
    assert.equal(gameModule.readGame().requests[1].status, 'refused')
  } finally {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage)
    else delete globalThis.localStorage
    if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator)
    else delete globalThis.navigator
  }
})
