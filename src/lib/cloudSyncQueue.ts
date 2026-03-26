import {
  deleteCardById,
  deleteDeckById,
  recordQuizAttempt,
  recordStudySession,
  upsertCard,
  upsertDeck,
  upsertUserProgress,
} from './db'
import { useCloudSyncStore } from '../store/useCloudSyncStore'

const QUEUE_KEY = 'tuto-cloud-sync-queue'
const MAX_ATTEMPTS = 5

type CloudAction =
  | { type: 'upsertDeck'; payload: Parameters<typeof upsertDeck>[0]; attempts: number }
  | { type: 'deleteDeck'; payload: { deckId: string }; attempts: number }
  | { type: 'upsertCard'; payload: Parameters<typeof upsertCard>[0]; attempts: number }
  | { type: 'deleteCard'; payload: { cardId: string }; attempts: number }
  | { type: 'recordStudySession'; payload: Parameters<typeof recordStudySession>[0]; attempts: number }
  | { type: 'recordQuizAttempt'; payload: Parameters<typeof recordQuizAttempt>[0]; attempts: number }
  | { type: 'upsertUserProgress'; payload: Parameters<typeof upsertUserProgress>[0]; attempts: number }

function loadQueue(): CloudAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? (JSON.parse(raw) as CloudAction[]) : []
  } catch {
    return []
  }
}

function saveQueue(queue: CloudAction[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  useCloudSyncStore.getState().setPendingCount(queue.length)
}

async function runAction(action: CloudAction): Promise<void> {
  switch (action.type) {
    case 'upsertDeck':
      await upsertDeck(action.payload)
      return
    case 'deleteDeck':
      await deleteDeckById(action.payload.deckId)
      return
    case 'upsertCard':
      await upsertCard(action.payload)
      return
    case 'deleteCard':
      await deleteCardById(action.payload.cardId)
      return
    case 'recordStudySession':
      await recordStudySession(action.payload)
      return
    case 'recordQuizAttempt':
      await recordQuizAttempt(action.payload)
      return
    case 'upsertUserProgress':
      await upsertUserProgress(action.payload)
      return
  }
}

async function withRetry(action: CloudAction, retries = 2): Promise<void> {
  let lastError: unknown = null
  for (let i = 0; i <= retries; i++) {
    try {
      await runAction(action)
      return
    } catch (e) {
      lastError = e
      await new Promise((r) => window.setTimeout(r, 250 * (i + 1)))
    }
  }
  throw lastError
}

export async function executeOrQueue(action: Omit<CloudAction, 'attempts'>): Promise<void> {
  const actionWithAttempts = { ...action, attempts: 0 } as CloudAction
  useCloudSyncStore.getState().setSyncing()
  try {
    await withRetry(actionWithAttempts)
    useCloudSyncStore.getState().setSuccess()
  } catch (e) {
    const queue = loadQueue()
    queue.push(actionWithAttempts)
    saveQueue(queue)
    useCloudSyncStore.getState().setError((e as Error).message)
  }
}

export async function flushCloudQueue(): Promise<void> {
  const queue = loadQueue()
  if (queue.length === 0) {
    useCloudSyncStore.getState().setPendingCount(0)
    return
  }

  useCloudSyncStore.getState().setSyncing()
  const nextQueue: CloudAction[] = []

  for (const action of queue) {
    try {
      await withRetry(action, 1)
    } catch (e) {
      const retried = { ...action, attempts: action.attempts + 1 }
      if (retried.attempts < MAX_ATTEMPTS) {
        nextQueue.push(retried)
      }
      useCloudSyncStore.getState().setError((e as Error).message)
    }
  }

  saveQueue(nextQueue)
  if (nextQueue.length === 0) {
    useCloudSyncStore.getState().setSuccess()
  }
}

export function initCloudQueueState() {
  useCloudSyncStore.getState().setPendingCount(loadQueue().length)
}

export function clearCloudQueue() {
  saveQueue([])
  useCloudSyncStore.getState().setPendingCount(0)
}
