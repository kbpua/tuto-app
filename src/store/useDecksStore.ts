// ─── Decks & Cards persistent store ──────────────────────────────────────────
// Full CRUD for decks + cards, with SM-2 state per card. Persisted to localStorage.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { applySM2, DEFAULT_SM2, isCardDue } from '../lib/sm2'
import type { ConfidenceRating } from '../lib/sm2'
import { executeOrQueue } from '../lib/cloudSyncQueue'
import {
  clearAllDecksForUser,
  createDeckWithCards,
  fetchDecksWithCards,
} from '../lib/db'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Card = {
  id: string
  front: string
  back: string
  interval: number
  repetitions: number
  easeFactor: number
  dueDate: string | null
}

export type Deck = {
  id: string
  title: string
  folder: string
  tags: string[]
  cards: Card[]
  createdAt: string
  lastStudied: string | null
}

type DecksState = {
  decks: Deck[]
  resetLocalDecks: () => void
  createDeck: (title: string, folder: string, tags: string[]) => string
  deleteDeck: (deckId: string) => void
  addCard: (deckId: string, front: string, back: string) => Card
  deleteCard: (deckId: string, cardId: string) => void
  updateCardSM2: (deckId: string, cardId: string, rating: ConfidenceRating) => void
  markDeckStudied: (deckId: string) => void
  getDueCount: (deckId: string) => number
  getMastery: (deckId: string) => number

  // Cloud sync (Supabase)
  backupDecksToCloud: () => Promise<{ decks: number; cards: number }>
  restoreDecksFromCloud: (opts?: { overwriteLocalIfCloudEmpty?: boolean }) => Promise<{ decks: number; cards: number }>
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useDecksStore = create<DecksState>()(
  persist(
    (set, get) => ({
      decks: [],

      resetLocalDecks() {
        set({ decks: [] })
      },

      createDeck(title, folder, tags) {
        const id = crypto.randomUUID()
        const deck: Deck = {
          id,
          title,
          folder,
          tags,
          cards: [],
          createdAt: new Date().toISOString(),
          lastStudied: null,
        }
        set((s) => ({ decks: [...s.decks, deck] }))
        void executeOrQueue({
          type: 'upsertDeck',
          payload: {
            id: deck.id,
            title: deck.title,
            folder: deck.folder,
            tags: deck.tags,
            createdAt: deck.createdAt,
            lastStudied: deck.lastStudied,
          },
        })
        return id
      },

      deleteDeck(deckId) {
        set((s) => ({ decks: s.decks.filter((d) => d.id !== deckId) }))
        void executeOrQueue({
          type: 'deleteDeck',
          payload: { deckId },
        })
      },

      addCard(deckId, front, back) {
        const card: Card = { id: crypto.randomUUID(), front, back, ...DEFAULT_SM2 }
        set((s) => ({
          decks: s.decks.map((d) =>
            d.id === deckId ? { ...d, cards: [...d.cards, card] } : d,
          ),
        }))
        void executeOrQueue({
          type: 'upsertCard',
          payload: {
            id: card.id,
            deckId,
            front: card.front,
            back: card.back,
            interval: card.interval,
            repetitions: card.repetitions,
            easeFactor: card.easeFactor,
            dueDate: card.dueDate,
          },
        })
        return card
      },

      deleteCard(deckId, cardId) {
        set((s) => ({
          decks: s.decks.map((d) =>
            d.id === deckId
              ? { ...d, cards: d.cards.filter((c) => c.id !== cardId) }
              : d,
          ),
        }))
        void executeOrQueue({
          type: 'deleteCard',
          payload: { cardId },
        })
      },

      updateCardSM2(deckId, cardId, rating) {
        set((s) => ({
          decks: s.decks.map((d) => {
            if (d.id !== deckId) return d
            return {
              ...d,
              cards: d.cards.map((c) => {
                if (c.id !== cardId) return c
                const updated = applySM2(c, rating)
                return { ...c, ...updated }
              }),
            }
          }),
        }))
        const syncedCard = get()
          .decks.find((d) => d.id === deckId)
          ?.cards.find((c) => c.id === cardId)
        if (syncedCard) {
          void executeOrQueue({
            type: 'upsertCard',
            payload: {
              id: syncedCard.id,
              deckId,
              front: syncedCard.front,
              back: syncedCard.back,
              interval: syncedCard.interval,
              repetitions: syncedCard.repetitions,
              easeFactor: syncedCard.easeFactor,
              dueDate: syncedCard.dueDate,
            },
          })
        }
      },

      markDeckStudied(deckId) {
        const lastStudied = new Date().toISOString()
        set((s) => ({
          decks: s.decks.map((d) =>
            d.id === deckId ? { ...d, lastStudied } : d,
          ),
        }))
        const deck = get().decks.find((d) => d.id === deckId)
        if (deck) {
          void executeOrQueue({
            type: 'upsertDeck',
            payload: {
              id: deck.id,
              title: deck.title,
              folder: deck.folder,
              tags: deck.tags,
              createdAt: deck.createdAt,
              lastStudied: deck.lastStudied,
            },
          })
        }
      },

      getDueCount(deckId) {
        const deck = get().decks.find((d) => d.id === deckId)
        if (!deck) return 0
        return deck.cards.filter((c) => isCardDue(c.dueDate)).length
      },

      getMastery(deckId) {
        const deck = get().decks.find((d) => d.id === deckId)
        if (!deck || deck.cards.length === 0) return 0
        const mastered = deck.cards.filter((c) => c.repetitions >= 3).length
        return Math.round((mastered / deck.cards.length) * 100)
      },

      async backupDecksToCloud() {
        const localDecks = get().decks
        const totalCards = localDecks.reduce((acc, d) => acc + d.cards.length, 0)

        // Replace strategy: wipe cloud decks (cards cascade), then re-insert from local.
        await clearAllDecksForUser()

        for (const d of localDecks) {
          await createDeckWithCards({
            title: d.title,
            folder: d.folder,
            tags: d.tags,
            cards: d.cards.map((c) => ({
              front: c.front,
              back: c.back,
              interval: c.interval,
              repetitions: c.repetitions,
              easeFactor: c.easeFactor,
              dueDate: c.dueDate,
            })),
          })
        }

        return { decks: localDecks.length, cards: totalCards }
      },

      async restoreDecksFromCloud(opts) {
        const overwriteLocalIfCloudEmpty = opts?.overwriteLocalIfCloudEmpty ?? false
        const cloud = await fetchDecksWithCards()
        if (!overwriteLocalIfCloudEmpty && cloud.length === 0) {
          const localDecks = get().decks
          const localCards = localDecks.reduce((acc, d) => acc + d.cards.length, 0)
          return { decks: localDecks.length, cards: localCards }
        }
        const restored: Deck[] = cloud.map((d) => ({
          id: d.id,
          title: d.title,
          folder: d.folder,
          tags: d.tags ?? [],
          createdAt: d.created_at,
          lastStudied: d.last_studied,
          cards: (d.cards ?? []).map((c) => ({
            id: c.id,
            front: c.front,
            back: c.back,
            interval: c.interval,
            repetitions: c.repetitions,
            easeFactor: c.ease_factor,
            dueDate: c.due_date,
          })),
        }))

        const totalCards = restored.reduce((acc, d) => acc + d.cards.length, 0)
        set({ decks: restored })
        return { decks: restored.length, cards: totalCards }
      },
    }),
    { name: 'studyforge-decks' },
  ),
)
