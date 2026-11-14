import { useCallback, useEffect, useRef, useState } from 'react'
import { channelName, initializeGame, readGame, storageKey, updateGame } from './game'
import type { Game } from './game'

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur de stockage est survenue.'
}

export function useGame() {
  const [game, setGame] = useState<Game | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const channel = useRef<BroadcastChannel | null>(null)

  const refresh = useCallback(() => {
    try {
      const current = readGame()
      if (!current) throw new Error('Les données de la partie sont introuvables. Rechargez la page.')
      setGame(current)
    } catch (problem) {
      setGame(null)
      setError(message(problem))
    }
  }, [])

  useEffect(() => {
    let active = true
    let instance: BroadcastChannel | null = null
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) refresh()
    }
    Promise.resolve().then(() => {
      if (!active) return
      if (typeof BroadcastChannel === 'undefined') throw new Error('La synchronisation entre onglets n’est pas disponible dans ce navigateur.')
      instance = new BroadcastChannel(channelName)
      channel.current = instance
      instance.onmessage = refresh
      window.addEventListener('storage', onStorage)
      return initializeGame()
    }).then(() => {
      if (active) refresh()
    }).catch((problem: unknown) => {
      if (active) setError(message(problem))
    })
    return () => {
      active = false
      window.removeEventListener('storage', onStorage)
      instance?.close()
      if (channel.current === instance) channel.current = null
    }
  }, [refresh])

  const change = useCallback(async (epoch: string, action: (current: Game) => void, onError?: (message: string) => void): Promise<boolean> => {
    setBusy(true)
    setError('')
    try {
      await updateGame(epoch, action)
      refresh()
      channel.current?.postMessage('updated')
      return true
    } catch (problem) {
      refresh()
      const detail = message(problem)
      setError(detail)
      onError?.(detail)
      return false
    } finally {
      setBusy(false)
    }
  }, [refresh])

  return { game, error, busy, change }
}
