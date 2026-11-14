import { useState } from 'react'
import type { FormEvent } from 'react'
import { agents, flows, selectionLimit } from './agents'
import type { Agent } from './agents'
import { createRequest, decideRequest } from './game'
import type { FlowRequest, Game, GameChange } from './game'

type Props = {
  agent: Agent
  game: Game
  busy: boolean
  change: GameChange
}

const statusNames = { pending: 'En attente', accepted: 'Acceptée', refused: 'Refusée' }

function agentName(id: string) {
  return agents.find((agent) => agent.id === id)?.name ?? id
}

function RequestCard({ request, received, agent, game, busy, change }: Props & { request: FlowRequest; received: boolean }) {
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const flow = flows.find((item) => item.id === request.flowId)

  async function decide(status: 'accepted' | 'refused') {
    if (!reason.trim()) {
      setReasonError('Une justification est obligatoire.')
      return
    }
    setReasonError('')
    await change(game.epoch, (current) => decideRequest(current, request.id, agent.id, status, reason))
  }

  return (
    <article className="request-card">
      <div className="request-card-heading">
        <h3>{flow?.label ?? request.flowId}</h3>
        <span className={`request-status status-${request.status}`}>{statusNames[request.status]}</span>
      </div>
      <dl className="request-details">
        <div><dt>Expéditeur</dt><dd>{agentName(request.sender)}</dd></div>
        <div><dt>Destinataire</dt><dd>{agentName(request.recipient)}</dd></div>
        <div><dt>Nature proposée</dt><dd>{request.nature === 'reel' ? 'Flux réel' : 'Flux monétaire'}</dd></div>
      </dl>
      {request.justification && <p className="request-reason"><strong>Justification :</strong> {request.justification}</p>}
      {received && request.status === 'pending' && (
        <div className="decision-form">
          <label htmlFor={`reason-${request.id}`}>Justification de votre décision</label>
          <textarea
            id={`reason-${request.id}`}
            value={reason}
            onChange={(event) => { setReason(event.target.value); setReasonError('') }}
            rows={3}
            aria-describedby={reasonError ? `reason-error-${request.id}` : undefined}
          />
          {reasonError && <p className="form-error" id={`reason-error-${request.id}`} role="alert">{reasonError}</p>}
          <div className="decision-actions">
            <button type="button" className="small-button" disabled={busy} onClick={() => void decide('accepted')}>Accepter</button>
            <button type="button" className="small-button secondary-button" disabled={busy} onClick={() => void decide('refused')}>Refuser</button>
          </div>
        </div>
      )}
    </article>
  )
}

export default function Requests({ agent, game, busy, change }: Props) {
  const [flowId, setFlowId] = useState('')
  const [recipient, setRecipient] = useState('')
  const [nature, setNature] = useState('')
  const [notice, setNotice] = useState('')
  const [formError, setFormError] = useState('')
  const validated = game.validated[agent.id] ?? []
  const complete = validated.length === selectionLimit
  const sent = game.requests.filter((request) => request.sender === agent.id)
  const received = game.requests.filter((request) => request.recipient === agent.id)

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (nature !== 'reel' && nature !== 'monetaire') {
      setFormError('Choisissez une nature de flux.')
      return
    }
    setFormError('')
    setNotice('')
    const saved = await change(game.epoch, (current) => createRequest(current, {
      sender: agent.id, recipient, flowId, nature,
    }), setFormError)
    if (saved) {
      setFlowId('')
      setRecipient('')
      setNature('')
      setNotice('Votre demande a été envoyée et est en attente.')
    }
  }

  return (
    <>
      <section className="flow-section" id="envoyer-demandes" aria-labelledby="send-title">
        <p className="section-kicker">Étape 02</p>
        <h2 className="requests-title" id="send-title">Envoyer des demandes</h2>
        {!complete ? (
          <p className="section-description">Validez vos huit flux sortants pour envoyer une demande.</p>
        ) : (
          <>
            <p className="section-description">Choisissez un flux, puis proposez son destinataire et sa nature.</p>
            <form className="request-form" onSubmit={(event) => void send(event)}>
              <label htmlFor="request-flow">Flux sortant</label>
              <select id="request-flow" value={flowId} onChange={(event) => setFlowId(event.target.value)} required>
                <option value="">Sélectionner un flux</option>
                {flows.filter((flow) => validated.includes(flow.id)).map((flow) => (
                  <option value={flow.id} key={flow.id}>{flow.label}</option>
                ))}
              </select>
              <label htmlFor="request-recipient">Destinataire proposé</label>
              <select id="request-recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)} required>
                <option value="">Sélectionner un destinataire</option>
                {agents.filter((item) => item.id !== agent.id).map((item) => (
                  <option value={item.id} key={item.id}>{item.name}</option>
                ))}
              </select>
              <label htmlFor="request-nature">Nature proposée</label>
              <select id="request-nature" value={nature} onChange={(event) => setNature(event.target.value)} required>
                <option value="">Sélectionner une nature</option>
                <option value="reel">Flux réel</option>
                <option value="monetaire">Flux monétaire</option>
              </select>
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <button className="primary-button check-button" type="submit" disabled={busy}>Envoyer la demande <span aria-hidden="true">→</span></button>
            </form>
            <p className="flow-feedback" role="status">{notice}</p>
          </>
        )}
        <h3 className="request-list-title">Demandes envoyées</h3>
        {sent.length === 0 ? <p className="section-description">Aucune demande envoyée pour le moment.</p> : (
          <div className="request-list">
            {sent.map((request) => <RequestCard key={request.id} request={request} received={false} agent={agent} game={game} busy={busy} change={change} />)}
          </div>
        )}
      </section>
      <section className="flow-section" id="demandes-recues" aria-labelledby="received-title">
        <p className="section-kicker">Étape 03</p>
        <h2 className="requests-title" id="received-title">Demandes reçues</h2>
        {received.length === 0 ? <p className="section-description">Aucune demande reçue pour le moment.</p> : (
          <div className="request-list">
            {received.map((request) => <RequestCard key={request.id} request={request} received agent={agent} game={game} busy={busy} change={change} />)}
          </div>
        )}
      </section>
    </>
  )
}
