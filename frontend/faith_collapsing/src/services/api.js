const API_BASE_URL = (import.meta.env.API_URL || '/api').replace(/\/+$/, '')

const errorMessages = {
  400: 'Confira os dados enviados e tente novamente.',
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Você não tem permissão para realizar esta ação.',
  404: 'O conteúdo solicitado não foi encontrado.',
  409: 'Esta ação não pode ser realizada neste momento.',
}

export class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

function getStoredToken() {
  return typeof localStorage === 'undefined' ? null : localStorage.getItem('token')
}

async function request(path, { method = 'GET', body, authenticated = true } = {}) {
  const headers = { Accept: 'application/json' }
  const token = authenticated ? getStoredToken() : null

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Não foi possível conectar à API. Verifique se o servidor está ativo.')
  }

  if (response.status === 401 && authenticated && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth:expired'))
  }

  const responseText = await response.text()
  let payload = null
  if (responseText) {
    try {
      payload = JSON.parse(responseText)
    } catch {
      throw new ApiError('A API retornou uma resposta inválida.', response.status)
    }
  }

  if (!response.ok) {
    const message =
      (typeof payload?.message === 'string' && payload.message) ||
      errorMessages[response.status] ||
      'Não foi possível concluir a solicitação. Tente novamente.'
    throw new ApiError(message, response.status, payload)
  }

  return payload
}

export const api = {
  login: (email, senha) =>
    request('/auth/login', {
      method: 'POST',
      body: { email, senha },
      authenticated: false,
    }),

  register: (userData) =>
    request('/auth/register', {
      method: 'POST',
      body: userData,
      authenticated: false,
    }),

  getProfile: () => request('/users/me'),

  convertXPToHealth: () =>
    request('/users/me/convert-xp-to-health', {
      method: 'POST',
    }),

  registerChoice: (difficulty) =>
    request('/choices/register', {
      method: 'POST',
      body: { dificuldade: difficulty },
    }),

  generateEvents: (difficulty) =>
    request(`/game?difficulty=${encodeURIComponent(difficulty)}`, {
      authenticated: false,
    }),

  registerEvent: ({ eventType, eventID, choiceID }) =>
    request('/events/register', {
      method: 'POST',
      body: {
        eventType,
        idEvent: eventID,
        id_escolhas: choiceID,
      },
    }),

  attack: (eventID) =>
    request('/events/attack', {
      method: 'POST',
      body: { eventID },
    }),

  giveUpChoice: (choiceID) =>
    request('/events/give-up-choice', {
      method: 'POST',
      body: { choiceID },
    }),

  claimReward: (eventID) =>
    request('/events/rewards/claim', {
      method: 'POST',
      body: { eventID },
    }),
}
