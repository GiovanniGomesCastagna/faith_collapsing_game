import { clearSession } from '../services/session'

export default ({ router }) => {
  if (typeof window === 'undefined') return

  window.addEventListener('auth:expired', () => {
    clearSession()
    if (router.currentRoute.value.path !== '/') {
      router.replace('/')
    }
  })
}
