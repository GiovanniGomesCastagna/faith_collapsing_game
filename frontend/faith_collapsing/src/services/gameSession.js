import { reactive } from 'vue'

const STORAGE_KEY = 'activeGame'

function emptyGameSession() {
  return {
    difficulty: null,
    choiceID: null,
    events: [],
    eventIndex: 0,
    currentEventType: '',
    currentEvent: null,
    abandonOnRefresh: false,
  }
}

function readGameSession() {
  if (typeof sessionStorage === 'undefined') return emptyGameSession()

  const storedValue = sessionStorage.getItem(STORAGE_KEY)
  if (!storedValue) return emptyGameSession()

  try {
    const storedGame = JSON.parse(storedValue)
    if (
      ![1, 2, 3].includes(storedGame.difficulty) ||
      !storedGame.choiceID ||
      !Array.isArray(storedGame.events)
    ) {
      return emptyGameSession()
    }
    return { ...emptyGameSession(), ...storedGame }
  } catch (error) {
    console.error('Não foi possível restaurar a jornada salva.', error)
    sessionStorage.removeItem(STORAGE_KEY)
    return emptyGameSession()
  }
}

export const gameSession = reactive(readGameSession())

function persistGameSession() {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(gameSession))
  }
}

export function saveGameSession(gameData) {
  Object.assign(gameSession, emptyGameSession(), gameData)
  persistGameSession()
}

export function updateGameSession(changes) {
  Object.assign(gameSession, changes)
  persistGameSession()
}

export function clearGameSession() {
  Object.assign(gameSession, emptyGameSession())
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEY)
  }
}
