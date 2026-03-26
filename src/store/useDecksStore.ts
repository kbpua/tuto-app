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

// ── Seed data ─────────────────────────────────────────────────────────────────

const seed = (id: string, front: string, back: string): Card => ({
  id,
  front,
  back,
  ...DEFAULT_SM2,
})

const SEED_DECKS: Deck[] = [
  {
    id: 'deck-physics',
    title: 'AP Physics: Motion & Forces',
    folder: 'Science',
    tags: ['Physics', 'AP'],
    createdAt: new Date().toISOString(),
    lastStudied: null,
    cards: [
      seed('phy-1', "What is Newton's First Law?", 'An object stays at rest or in uniform motion unless acted upon by a net force.'),
      seed('phy-2', "What is Newton's Second Law?", 'F = ma — force equals mass times acceleration.'),
      seed('phy-3', "What is Newton's Third Law?", 'For every action there is an equal and opposite reaction.'),
      seed('phy-4', 'Define momentum.', 'p = mv — mass multiplied by velocity.'),
      seed('phy-5', 'What is kinetic energy?', 'KE = ½mv² — energy an object has due to its motion.'),
      seed('phy-6', 'What is gravitational potential energy?', 'PE = mgh — energy stored due to height above a reference point.'),
      seed('phy-7', 'Define velocity.', 'Speed with direction — a vector quantity measured in m/s.'),
      seed('phy-8', 'Define acceleration.', 'The rate of change of velocity over time (m/s²).'),
      seed('phy-9', 'What is work in physics?', 'W = Fd — force applied over a distance.'),
      seed('phy-10', 'State the law of conservation of energy.', 'Energy cannot be created or destroyed, only converted between forms.'),
    ],
  },
  {
    id: 'deck-chem',
    title: 'Organic Chemistry Reactions',
    folder: 'Science',
    tags: ['Chemistry', 'Finals'],
    createdAt: new Date().toISOString(),
    lastStudied: null,
    cards: [
      seed('chem-1', 'What is an alkene?', 'A hydrocarbon containing one or more carbon–carbon double bonds.'),
      seed('chem-2', 'What is a nucleophile?', 'An electron-rich species that donates electrons to an electrophile.'),
      seed('chem-3', 'What is SN2?', 'Bimolecular nucleophilic substitution with inversion of configuration (Walden inversion).'),
      seed('chem-4', 'What is SN1?', 'Unimolecular nucleophilic substitution proceeding through a carbocation intermediate.'),
      seed('chem-5', "What is Markovnikov's rule?", 'In electrophilic addition, the nucleophile adds to the more substituted carbon atom.'),
      seed('chem-6', 'Define oxidation in organic chemistry.', 'Loss of electrons, gain of oxygen, or loss of hydrogen.'),
      seed('chem-7', 'What is a chiral center?', 'A carbon atom bonded to four different substituents.'),
      seed('chem-8', 'What are enantiomers?', 'Non-superimposable mirror images of a chiral molecule.'),
    ],
  },
  {
    id: 'deck-japanese',
    title: 'Japanese N4 Vocabulary',
    folder: 'Languages',
    tags: ['Japanese', 'Vocabulary'],
    createdAt: new Date().toISOString(),
    lastStudied: null,
    cards: [
      seed('jp-1', '食べる (taberu)', 'To eat'),
      seed('jp-2', '飲む (nomu)', 'To drink'),
      seed('jp-3', '行く (iku)', 'To go'),
      seed('jp-4', '来る (kuru)', 'To come'),
      seed('jp-5', '見る (miru)', 'To see / to watch'),
      seed('jp-6', '聞く (kiku)', 'To hear / to listen'),
      seed('jp-7', '話す (hanasu)', 'To speak / to talk'),
      seed('jp-8', '読む (yomu)', 'To read'),
    ],
  },
  {
    id: 'deck-history',
    title: 'World War II Key Events',
    folder: 'Humanities',
    tags: ['History', 'Essay Prep'],
    createdAt: new Date().toISOString(),
    lastStudied: null,
    cards: [
      seed('ww2-1', 'When did World War II begin?', 'September 1, 1939, when Germany invaded Poland.'),
      seed('ww2-2', 'What was the significance of D-Day?', 'June 6, 1944 — Allied forces landed in Normandy, opening the Western Front.'),
      seed('ww2-3', 'What was Operation Barbarossa?', "Germany's invasion of the Soviet Union, launched June 22, 1941."),
      seed('ww2-4', 'When did Japan attack Pearl Harbor?', 'December 7, 1941 — bringing the USA into the war.'),
      seed('ww2-5', 'What ended the war in the Pacific?', "The atomic bombings of Hiroshima (Aug 6) and Nagasaki (Aug 9, 1945) and Japan's surrender."),
      seed('ww2-6', 'What was the Holocaust?', 'The systematic genocide of six million Jews and millions of others by the Nazi regime.'),
    ],
  },
]

// ── Store ─────────────────────────────────────────────────────────────────────

export const useDecksStore = create<DecksState>()(
  persist(
    (set, get) => ({
      decks: SEED_DECKS,

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
