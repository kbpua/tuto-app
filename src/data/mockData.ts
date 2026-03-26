type QuizQuestion =
  | {
      id: string
      type: 'mcq'
      question: string
      options: string[]
      answer: string
      explanation: string
    }
  | {
      id: string
      type: 'written'
      question: string
      answer: string
      explanation: string
    }
  | {
      id: string
      type: 'matching'
      question: string
      pairs: [string, string][]
      explanation: string
    }

type TutorMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
}

export const dashboardData = {
  streak: 14,
  level: 12,
  xp: 1840,
  xpToNext: 2400,
  cardsReviewedToday: 126,
  accuracy: 87,
  studyTimeMinutes: 74,
  upcomingReviews: 46,
  continueDeck: {
    id: 'deck-physics',
    title: 'AP Physics: Motion & Forces',
    progress: 68,
    due: 17,
  },
}

export const heatmapData = [
  1, 0, 2, 3, 1, 0, 4, 2, 2, 1, 0, 1, 3, 4, 0, 2, 3, 1, 2, 0, 4, 1, 2, 3, 1,
  0, 2, 1, 4, 3, 2, 1, 0, 2, 3, 4, 1, 0, 2, 1, 3, 2,
]

export const decks = [
  {
    id: 'deck-chem',
    title: 'Organic Chemistry Reactions',
    cards: 132,
    lastStudied: '2h ago',
    mastery: 81,
    folder: 'Science',
    tags: ['Chemistry', 'Finals'],
  },
  {
    id: 'deck-history',
    title: 'World War II Key Events',
    cards: 96,
    lastStudied: 'Yesterday',
    mastery: 59,
    folder: 'Humanities',
    tags: ['History', 'Essay Prep'],
  },
  {
    id: 'deck-physics',
    title: 'AP Physics: Motion & Forces',
    cards: 118,
    lastStudied: '20m ago',
    mastery: 68,
    folder: 'Science',
    tags: ['Physics', 'AP'],
  },
  {
    id: 'deck-japanese',
    title: 'Japanese N4 Vocabulary',
    cards: 242,
    lastStudied: '3d ago',
    mastery: 46,
    folder: 'Languages',
    tags: ['Japanese', 'Vocabulary'],
  },
]

export const folders = ['All Decks', 'Science', 'Humanities', 'Languages', 'Custom']

export const importSources = [
  'YouTube',
  'PDF',
  'Notes',
  'PowerPoint',
  'Audio',
]

export const studyCards = [
  {
    id: 'card-1',
    front: 'What is Newton\'s Second Law?',
    back: 'Force equals mass times acceleration (F = ma).',
  },
  {
    id: 'card-2',
    front: 'Define kinetic friction in one sentence.',
    back: 'A resistive force opposing sliding motion between surfaces.',
  },
  {
    id: 'card-3',
    front: 'When does static friction reach its maximum?',
    back: 'Right before the object begins to move.',
  },
]

export const quizQuestions: QuizQuestion[] = [
  {
    id: 'q1',
    type: 'mcq',
    question: 'Which organelle is known as the powerhouse of the cell?',
    options: ['Nucleus', 'Mitochondria', 'Golgi apparatus', 'Ribosome'],
    answer: 'Mitochondria',
    explanation: 'Mitochondria generate most of the ATP used by cells.',
  },
  {
    id: 'q2',
    type: 'written',
    question: 'Explain photosynthesis in one or two sentences.',
    answer: 'Plants convert light, carbon dioxide, and water into glucose and oxygen.',
    explanation: 'Chlorophyll captures light energy to power this conversion.',
  },
  {
    id: 'q3',
    type: 'matching',
    question: 'Match the term to the correct definition.',
    pairs: [
      ['Velocity', 'Speed with direction'],
      ['Acceleration', 'Rate of change of velocity'],
      ['Momentum', 'Mass times velocity'],
    ],
    explanation: 'These concepts are foundational to mechanics and kinematics.',
  },
]

export const tutorPrompts = ['Explain this concept', 'Quiz me', 'Help with homework']

export const tutorMessages: TutorMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    text: 'Yo! Ready for a quick study sprint? Pick a topic and I\'ll break it down.',
  },
  {
    id: 'm2',
    role: 'user',
    text: 'Can you simplify entropy for me?',
  },
  {
    id: 'm3',
    role: 'assistant',
    text: 'Entropy is how spread out energy is. More spread = higher entropy. Think messy room vibes.',
  },
]

export const leaderboardUsers = [
  { rank: 1, name: 'LunaPark', xp: 4820 },
  { rank: 2, name: 'ByteRider', xp: 4590 },
  { rank: 3, name: 'KurtNova', xp: 4210 },
  { rank: 4, name: 'Atomix', xp: 4032 },
  { rank: 5, name: 'SketchMind', xp: 3920 },
  { rank: 6, name: 'NeoFlash', xp: 3711 },
  { rank: 7, name: 'MapleZen', xp: 3524 },
  { rank: 8, name: 'EchoPilot', xp: 3388 },
  { rank: 9, name: 'HexaLeaf', xp: 3315 },
  { rank: 10, name: 'RiftCoda', xp: 3199 },
]
