import { supabase } from './supabase'

export type DeckRow = {
  id: string
  user_id: string
  title: string
  folder: string
  tags: string[]
  created_at: string
  last_studied: string | null
}

export type CardRow = {
  id: string
  user_id: string
  deck_id: string
  front: string
  back: string
  interval: number
  repetitions: number
  ease_factor: number
  due_date: string | null
  created_at: string
}

export type StudySessionRow = {
  id: string
  user_id: string
  deck_id: string | null
  cards_reviewed: number
  accuracy: number
  duration_sec: number
  xp_earned: number
  created_at: string
}

export type QuizAttemptRow = {
  id: string
  user_id: string
  total_questions: number
  correct_answers: number
  duration_sec: number
  created_at: string
}

export type UserProgressRow = {
  user_id: string
  total_xp: number
  streak: number
  last_studied_date: string | null
  updated_at: string
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Error('You must be signed in to access cloud data.')
  }
  return data.user.id
}

export async function clearAllDecksForUser(): Promise<void> {
  // Supabase requires a filter for delete(). RLS ensures only your rows are affected.
  const { error } = await supabase
    .from('decks')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw new Error(error.message)
}

export async function upsertDeck(input: {
  id: string
  title: string
  folder: string
  tags: string[]
  createdAt: string
  lastStudied: string | null
}): Promise<void> {
  const userId = await requireUserId()
  const { error } = await supabase.from('decks').upsert(
    {
      id: input.id,
      user_id: userId,
      title: input.title,
      folder: input.folder,
      tags: input.tags,
      created_at: input.createdAt,
      last_studied: input.lastStudied,
    },
    { onConflict: 'id' },
  )
  if (error) throw new Error(error.message)
}

export async function deleteDeckById(deckId: string): Promise<void> {
  const { error } = await supabase.from('decks').delete().eq('id', deckId)
  if (error) throw new Error(error.message)
}

export async function upsertCard(input: {
  id: string
  deckId: string
  front: string
  back: string
  interval: number
  repetitions: number
  easeFactor: number
  dueDate: string | null
  createdAt?: string
}): Promise<void> {
  const userId = await requireUserId()
  const { error } = await supabase.from('cards').upsert(
    {
      id: input.id,
      user_id: userId,
      deck_id: input.deckId,
      front: input.front,
      back: input.back,
      interval: input.interval,
      repetitions: input.repetitions,
      ease_factor: input.easeFactor,
      due_date: input.dueDate,
      created_at: input.createdAt,
    },
    { onConflict: 'id' },
  )
  if (error) throw new Error(error.message)
}

export async function deleteCardById(cardId: string): Promise<void> {
  const { error } = await supabase.from('cards').delete().eq('id', cardId)
  if (error) throw new Error(error.message)
}

export async function fetchDecks(): Promise<DeckRow[]> {
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as DeckRow[]
}

export async function fetchDecksWithCards(): Promise<(DeckRow & { cards: CardRow[] })[]> {
  const { data, error } = await supabase
    .from('decks')
    .select('*, cards(*)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as (DeckRow & { cards: CardRow[] })[]
}

export async function createDeck(input: {
  title: string
  folder?: string
  tags?: string[]
}): Promise<DeckRow> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('decks')
    .insert({
      user_id: userId,
      title: input.title,
      folder: input.folder ?? 'General',
      tags: input.tags ?? [],
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as DeckRow
}

export async function fetchCards(deckId: string): Promise<CardRow[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data as CardRow[]
}

export async function createDeckWithCards(input: {
  title: string
  folder?: string
  tags?: string[]
  cards: Array<{
    front: string
    back: string
    interval: number
    repetitions: number
    easeFactor: number
    dueDate: string | null
  }>
}): Promise<{ deck: DeckRow; cards: CardRow[] }> {
  const userId = await requireUserId()

  const { data: deck, error: deckErr } = await supabase
    .from('decks')
    .insert({
      user_id: userId,
      title: input.title,
      folder: input.folder ?? 'General',
      tags: input.tags ?? [],
    })
    .select('*')
    .single()

  if (deckErr) throw new Error(deckErr.message)

  if (input.cards.length === 0) {
    return { deck: deck as DeckRow, cards: [] }
  }

  const { data: cards, error: cardsErr } = await supabase
    .from('cards')
    .insert(
      input.cards.map((c) => ({
        user_id: userId,
        deck_id: (deck as DeckRow).id,
        front: c.front,
        back: c.back,
        interval: c.interval,
        repetitions: c.repetitions,
        ease_factor: c.easeFactor,
        due_date: c.dueDate,
      })),
    )
    .select('*')

  if (cardsErr) throw new Error(cardsErr.message)
  return { deck: deck as DeckRow, cards: (cards ?? []) as CardRow[] }
}

export async function createCard(input: {
  deckId: string
  front: string
  back: string
  interval?: number
  repetitions?: number
  easeFactor?: number
  dueDate?: string | null
}): Promise<CardRow> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('cards')
    .insert({
      user_id: userId,
      deck_id: input.deckId,
      front: input.front,
      back: input.back,
      interval: input.interval ?? 1,
      repetitions: input.repetitions ?? 0,
      ease_factor: input.easeFactor ?? 2.5,
      due_date: input.dueDate ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as CardRow
}

export async function recordStudySession(input: {
  deckId: string | null
  cardsReviewed: number
  accuracy: number
  durationSec: number
  xpEarned: number
}): Promise<StudySessionRow> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('study_sessions')
    .insert({
      user_id: userId,
      deck_id: input.deckId,
      cards_reviewed: input.cardsReviewed,
      accuracy: input.accuracy,
      duration_sec: input.durationSec,
      xp_earned: input.xpEarned,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as StudySessionRow
}

export async function fetchStudySessions(limit = 40): Promise<StudySessionRow[]> {
  const { data, error } = await supabase
    .from('study_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as StudySessionRow[]
}

export async function recordQuizAttempt(input: {
  totalQuestions: number
  correctAnswers: number
  durationSec: number
}): Promise<QuizAttemptRow> {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id: userId,
      total_questions: input.totalQuestions,
      correct_answers: input.correctAnswers,
      duration_sec: input.durationSec,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as QuizAttemptRow
}

export async function fetchQuizAttempts(limit = 50): Promise<QuizAttemptRow[]> {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as QuizAttemptRow[]
}

export async function fetchUserProgress(): Promise<UserProgressRow | null> {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as UserProgressRow | null) ?? null
}

export async function upsertUserProgress(input: {
  totalXp: number
  streak: number
  lastStudiedDate: string | null
}): Promise<void> {
  const userId = await requireUserId()
  const { error } = await supabase.from('user_progress').upsert(
    {
      user_id: userId,
      total_xp: input.totalXp,
      streak: input.streak,
      last_studied_date: input.lastStudiedDate,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) throw new Error(error.message)
}
