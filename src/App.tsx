import { useEffect, useState } from 'react'
import { agents, flows, selectionLimit } from './agents'
import type { Agent } from './agents'
import { resetGame } from './game'
import type { Game, GameChange } from './game'
import Requests from './Requests'
import { useGame } from './useGame'
import './App.css'

const noCorrectIds: string[] = []

function Home({ onEnter }: { onEnter: (agent: Agent) => void }) {
  const [selectedId, setSelectedId] = useState('')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const agent = agents.find((item) => item.id === selectedId)
    if (agent) onEnter(agent)
  }

  return (
    <main className="home">
      <div className="home-intro">
        <p className="eyebrow"><span className="eyebrow-line" /> Une activité pédagogique</p>
        <h1>Les agents<br />économiques<span className="title-dot">.</span></h1>
        <p className="subtitle">Comprendre les échanges et les relations économiques</p>
        <div className="intro-note">
          <span className="note-number">05</span>
          <span>agents pour explorer<br />l’économie ensemble</span>
        </div>
      </div>

      <section className="selection-card" aria-labelledby="selection-title">
        <span className="card-kicker">Pour commencer</span>
        <h2 id="selection-title">Choisissez votre agent</h2>
        <p>Sélectionnez l’agent économique que vous souhaitez représenter.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="agent">Agent économique</label>
          <select
            id="agent"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            required
          >
            <option value="" disabled>Sélectionner un agent</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
          <button className="primary-button" type="submit">
            Accéder à l’espace agent <span aria-hidden="true">→</span>
          </button>
        </form>
        <p className="card-footnote">Une première approche des relations économiques.</p>
      </section>
    </main>
  )
}

function AgentSpace({ agent, onBack, game, busy, change }: {
  agent: Agent
  onBack: () => void
  game: Game
  busy: boolean
  change: GameChange
}) {
  const [proposals] = useState(() => {
    const shuffled = [...flows]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  })
  const [draftIds, setDraftIds] = useState<string[]>([])
  const [feedback, setFeedback] = useState('')
  const correctIds = game.validated[agent.id] ?? noCorrectIds
  const selectedIds = [...correctIds, ...draftIds.filter((id) => !correctIds.includes(id)).slice(0, selectionLimit - correctIds.length)]
  const complete = correctIds.length === selectionLimit

  useEffect(() => {
    // Shared progress may change in another tab while this tab has an unfinished selection.
    // oxlint-disable-next-line react/set-state-in-effect
    setDraftIds((draft) => {
      const next = draft.filter((id) => !correctIds.includes(id)).slice(0, selectionLimit - correctIds.length)
      return next.length === draft.length && next.every((id, index) => id === draft[index]) ? draft : next
    })
  }, [correctIds])

  async function toggleFlow(id: string) {
    if (correctIds.includes(id)) {
      await change(game.epoch, (current) => {
        current.validated[agent.id] = (current.validated[agent.id] ?? []).filter((correctId) => correctId !== id)
      })
    } else if (selectedIds.includes(id)) {
      setDraftIds(draftIds.filter((selectedId) => selectedId !== id))
    } else if (selectedIds.length < selectionLimit) {
      setDraftIds([...draftIds, id])
    }
    setFeedback('')
  }

  async function checkSelection() {
    const correct = selectedIds.filter((id) =>
      flows.some((flow) => flow.id === id && flow.source === agent.id),
    )
    const incorrectCount = selectedIds.length - correct.length
    const saved = await change(game.epoch, (current) => {
      current.validated[agent.id] = [...new Set([...(current.validated[agent.id] ?? []), ...correct])]
    })
    if (saved) {
      setDraftIds([])
      setFeedback(
        incorrectCount > 0
          ? `${incorrectCount} proposition${incorrectCount > 1 ? 's' : ''} incorrecte${incorrectCount > 1 ? 's ont été désélectionnées' : ' a été désélectionnée'}. Vous pouvez réessayer.`
          : 'Votre sélection est correcte. Continuez si vous n’avez pas encore trouvé les huit flux.',
      )
    }
  }

  return (
    <main className="agent-space">
      <button className="back-button" type="button" onClick={onBack}>
        <span aria-hidden="true">←</span> Retour à l’accueil
      </button>
      <div className="agent-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" /> Espace agent</p>
          <h1>{agent.name}<span className="title-dot">.</span></h1>
          <p className="subtitle">{agent.description}</p>
        </div>
        <span className="agent-badge">Votre agent</span>
      </div>
      <div className="section-heading">
        <div>
          <p className="section-kicker">Votre espace de travail</p>
          <h2>Les étapes de l’activité</h2>
        </div>
        <p>Commencez par identifier les flux sortants de votre agent.</p>
      </div>
      <div className="activity-grid">
        <section className="activity-card">
          <span className="activity-number">01</span>
          <h3>Identifier les flux sortants</h3>
          <p>Choisissez les propositions qui correspondent à votre agent.</p>
          <a className="activity-link" href="#flux-sortants">Accéder à l’activité <span aria-hidden="true">→</span></a>
        </section>
        <section className={`activity-card${complete ? ' activity-card-unlocked' : ''}`}>
          <span className="activity-number">02</span>
          <h3>Envoyer des demandes</h3>
          <p>Proposez un destinataire et une nature pour vos flux validés.</p>
          {complete ? <a className="activity-link" href="#envoyer-demandes">Envoyer une demande <span aria-hidden="true">→</span></a> : <span className="activity-status">À débloquer</span>}
        </section>
        <section className="activity-card">
          <span className="activity-number">03</span>
          <h3>Demandes reçues</h3>
          <p>Consultez et traitez les demandes adressées à votre agent.</p>
          <a className="activity-link" href="#demandes-recues">Voir les demandes <span aria-hidden="true">→</span></a>
        </section>
      </div>
      <section className="flow-section" id="flux-sortants" aria-labelledby="flow-title">
        <div className="flow-heading">
          <div>
            <p className="section-kicker">Étape 01</p>
            <h2 id="flow-title">Identifier les flux sortants</h2>
            <p>Sélectionnez jusqu’à {selectionLimit} propositions correspondant à votre agent, puis vérifiez votre sélection.</p>
          </div>
          <div className="flow-progress" aria-live="polite">
            <strong>{correctIds.length} / {selectionLimit}</strong>
            <span>bonnes réponses trouvées</span>
          </div>
        </div>
        <div className="flow-toolbar">
          <span>{selectedIds.length} / {selectionLimit} sélectionnées</span>
          <span>Choisissez une proposition pour la sélectionner ou la retirer.</span>
        </div>
        <div className="flow-cloud" aria-label="Propositions de flux">
          {proposals.map((flow) => {
            const selected = selectedIds.includes(flow.id)
            const correct = correctIds.includes(flow.id)
            return (
              <button
                className={`flow-option${selected ? ' is-selected' : ''}${correct ? ' is-correct' : ''}`}
                type="button"
                key={flow.id}
                aria-pressed={selected}
                disabled={busy || (!selected && selectedIds.length >= selectionLimit)}
                onClick={() => void toggleFlow(flow.id)}
              >
                {correct && <span aria-hidden="true">✓ </span>}{flow.label}
                {correct && <span className="visually-hidden"> (bonne réponse)</span>}
              </button>
            )
          })}
        </div>
        <div className="flow-actions">
          <button className="primary-button check-button" type="button" onClick={() => void checkSelection()} disabled={busy || selectedIds.length === 0 || complete}>
            Vérifier ma sélection <span aria-hidden="true">→</span>
          </button>
          <div className="flow-feedback" role="status">
            {complete ? 'Bravo ! Vous avez identifié les huit flux sortants. La phase « Envoyer des demandes » est débloquée.' : feedback}
          </div>
        </div>
      </section>
      <Requests agent={agent} game={game} busy={busy} change={change} />
    </main>
  )
}

function App() {
  const [initial] = useState(() => {
    try {
      const id = sessionStorage.getItem('agents-economiques-agent')
      return { agent: agents.find((item) => item.id === id) ?? null, error: '' }
    } catch {
      return { agent: null, error: 'Impossible de lire la sélection de cet onglet.' }
    }
  })
  const [agent, setAgent] = useState<Agent | null>(initial.agent)
  const [sessionError, setSessionError] = useState(initial.error)
  const { game, error, busy, change } = useGame()

  function chooseAgent(next: Agent | null) {
    try {
      if (next) sessionStorage.setItem('agents-economiques-agent', next.id)
      else sessionStorage.removeItem('agents-economiques-agent')
      setAgent(next)
      setSessionError('')
    } catch {
      setSessionError('Impossible d’enregistrer la sélection de cet onglet.')
    }
  }

  async function reset() {
    if (game && window.confirm('Réinitialiser la partie ? Les sélections validées et toutes les demandes seront supprimées dans tous les onglets.')) {
      await change(game.epoch, resetGame)
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <div className="brand"><span className="brand-mark" aria-hidden="true">é</span> Les agents économiques</div>
          <button className="reset-button" type="button" onClick={() => void reset()} disabled={!game || busy}>Réinitialiser la partie</button>
        </div>
      </header>
      {(error || sessionError) && <div className="global-error" role="alert">{error || sessionError}</div>}
      {agent && game ? <AgentSpace key={`${game.epoch}-${agent.id}`} agent={agent} onBack={() => chooseAgent(null)} game={game} busy={busy} change={change} /> :
        agent ? <main className="loading-message">Chargement de la partie…</main> : <Home onEnter={chooseAgent} />}
      <footer className="site-footer">
        <span>Les agents économiques</span>
        <span>Prototype pédagogique</span>
      </footer>
    </div>
  )
}

export default App
