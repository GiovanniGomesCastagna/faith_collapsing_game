import { reactive } from 'vue'

function readToken() {
  return typeof localStorage === 'undefined' ? '' : localStorage.getItem('token') || ''
}

export const session = reactive({
  token: readToken(),
  user: null,
})

export function saveSession(token, user = null) {
  session.token = token
  session.user = user
  localStorage.setItem('token', token)
}

export function updateSessionUser(user) {
  session.user = user
}

export function clearSession() {
  session.token = ''
  session.user = null
  localStorage.removeItem('token')
}
