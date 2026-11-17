import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { api } from '../services/api'
import { clearGameSession, gameSession, updateGameSession } from '../services/gameSession'
import { session, updateSessionUser } from '../services/session'

const gameRoutes = {
  1: '/game/easy',
  2: '/game/normal',
  3: '/game/hard',
}

export function useGameJourney(difficulty) {
  const $q = useQuasar()
  const router = useRouter()
  const actionBusy = ref(false)
  const eventLoading = ref(false)
  const profileLoading = ref(false)
  const profileLoaded = ref(false)
  const giveUpDialog = ref(false)

  const currentEvent = computed(() => gameSession.currentEvent)
  const currentEventType = computed(() => gameSession.currentEventType)
  const lastCombat = computed(() => currentEvent.value?.lastCombat ?? null)
  const progress = computed(() =>
    gameSession.events.length
      ? Math.min((gameSession.eventIndex + 1) / gameSession.events.length, 1)
      : 0,
  )
  const actionLabel = computed(() => {
    if (eventLoading.value || profileLoading.value) return 'CARREGANDO'
    if (!profileLoaded.value) return 'TENTAR NOVAMENTE'
    if (!currentEvent.value) return 'TENTAR NOVAMENTE'
    if (gameSession.currentEventType === 'reward') {
      return currentEvent.value.status === 'Resgatado' ? 'PROXIMO' : 'RECOMPENSA'
    }
    if (currentEvent.value.status === 'Vencido') return 'PROXIMO'
    if (currentEvent.value.status === 'Perdido') return 'VOLTAR'
    return 'ATACAR'
  })

  function notifyError(error) {
    if (error.status === 401) return
    $q.notify({
      type: 'negative',
      message: error.message || 'Não foi possível concluir a ação.',
      position: 'top',
    })
  }

  function updateStats(data) {
    if (!session.user) return

    const nextUser = { ...session.user }
    const fields = {
      vida: 'userHealth',
      vida_total: 'userTotalHealth',
      xp: 'userXP',
      nivel: 'userLevel',
      ataque: 'userAttack',
      defesa: 'userDefense',
    }
    for (const [userField, responseField] of Object.entries(fields)) {
      if (data[responseField] !== undefined) {
        nextUser[userField] = data[responseField]
      }
    }
    updateSessionUser(nextUser)
  }

  async function loadProfile() {
    profileLoading.value = true
    try {
      const response = await api.getProfile()
      if (!response?.data || typeof response.data !== 'object') {
        throw new Error('A API não retornou os dados do perfil.')
      }
      updateSessionUser(response.data)
      profileLoaded.value = true
      return true
    } catch (error) {
      notifyError(error)
      return false
    } finally {
      profileLoading.value = false
    }
  }

  async function loadEvent(index) {
    if (index < 0 || index >= gameSession.events.length) return

    updateGameSession({ eventIndex: index, currentEventType: '', currentEvent: null })
    eventLoading.value = true
    try {
      const eventOrder = gameSession.events[index]
      const response = await api.registerEvent({
        eventType: eventOrder.type,
        eventID: eventOrder.data.id,
        choiceID: gameSession.choiceID,
      })
      const event = response.data?.[0]
      if (!event?.id) {
        throw new Error('A API não retornou os dados do encontro.')
      }
      const currentEventData =
        eventOrder.type === 'enemy' ? { ...event, vida_total: event.vida } : event
      updateGameSession({
        eventIndex: index,
        currentEventType: eventOrder.type,
        currentEvent: currentEventData,
      })
    } catch (error) {
      notifyError(error)
    } finally {
      eventLoading.value = false
    }
  }

  async function endJourney(message) {
    if (!gameSession.choiceID) {
      clearGameSession()
      await router.replace('/dificuldade')
      return
    }

    actionBusy.value = true
    try {
      const response = await api.giveUpChoice(gameSession.choiceID)
      if (!response?.data) {
        throw new Error('A API não confirmou o encerramento da jornada.')
      }
      updateStats(response.data)
      clearGameSession()
      giveUpDialog.value = false
      $q.notify({ type: 'positive', message, position: 'top' })
      await router.replace('/dificuldade')
    } catch (error) {
      if ([404, 409].includes(error.status)) {
        clearGameSession()
        giveUpDialog.value = false
        $q.notify({
          type: 'info',
          message: 'Esta jornada já foi encerrada.',
          position: 'top',
        })
        await router.replace('/dificuldade')
      } else {
        notifyError(error)
      }
    } finally {
      actionBusy.value = false
    }
  }

  async function attack() {
    if (!currentEvent.value) return

    actionBusy.value = true
    try {
      const response = await api.attack(currentEvent.value.id)
      const result = response.data
      if (!result || !['Andamento', 'Vencido', 'Perdido'].includes(result.gameStatus)) {
        throw new Error('A API não retornou o resultado do combate.')
      }
      updateStats(result)
      updateGameSession({
        currentEvent: {
          ...currentEvent.value,
          vida: result.enemyHealth,
          status: result.gameStatus,
          lastCombat: {
            userRoll: result.userRoll,
            enemyRoll: result.enemyRoll,
            userHit: result.userHit,
            enemyHit: result.enemyHit,
            enemyAttackResolved: result.enemyAttackResolved,
            userDefense: result.userDefense,
            enemyDefense: result.enemyDefense,
          },
        },
      })

      if (result.gameStatus === 'Vencido') {
        $q.notify({
          type: 'positive',
          message: `Inimigo derrotado. +${result.xpGained} XP.`,
          position: 'top',
        })
      } else if (result.gameStatus === 'Perdido') {
        $q.notify({
          type: 'negative',
          message:
            'Você foi derrotado. Clique novamente em VOLTAR para ir ao menu e recuperar sua vida.',
          position: 'top',
          timeout: 8000,
        })
      }
    } catch (error) {
      notifyError(error)
    } finally {
      actionBusy.value = false
    }
  }

  async function claimReward() {
    if (!currentEvent.value) return

    actionBusy.value = true
    try {
      const response = await api.claimReward(currentEvent.value.id)
      if (!response?.data?.eventStatus) {
        throw new Error('A API não confirmou o resgate da recompensa.')
      }
      updateStats(response.data)
      updateGameSession({
        currentEvent: { ...currentEvent.value, status: response.data.eventStatus },
      })
      $q.notify({ type: 'positive', message: 'Recompensa resgatada.', position: 'top' })
    } catch (error) {
      notifyError(error)
    } finally {
      actionBusy.value = false
    }
  }

  async function nextEvent() {
    const nextIndex = gameSession.eventIndex + 1
    if (nextIndex >= gameSession.events.length) {
      await endJourney('Jornada concluída.')
      return
    }
    await loadEvent(nextIndex)
  }

  async function performPrimaryAction() {
    if (actionBusy.value || eventLoading.value || profileLoading.value) return
    if (!profileLoaded.value && !(await loadProfile())) return
    if (!currentEvent.value) {
      await loadEvent(gameSession.eventIndex)
      return
    }

    if (currentEvent.value.status === 'Perdido') {
      await endJourney('Você recuperou toda a sua vida.')
    } else if (
      currentEvent.value.status === 'Vencido' ||
      currentEvent.value.status === 'Resgatado'
    ) {
      await nextEvent()
    } else if (gameSession.currentEventType === 'reward') {
      await claimReward()
    } else {
      await attack()
    }
  }

  function wasPageRefreshed() {
    return window.performance.getEntriesByType('navigation')[0]?.type === 'reload'
  }

  function markGiveUpOnRefresh() {
    if (gameSession.choiceID) {
      updateGameSession({ abandonOnRefresh: true })
    }
  }

  onMounted(async () => {
    if (!session.token) {
      await router.replace('/')
      return
    }
    if (!gameSession.choiceID || gameSession.events.length === 0) {
      await router.replace('/dificuldade')
      return
    }
    if (gameSession.difficulty !== difficulty) {
      await router.replace(gameRoutes[gameSession.difficulty] || '/dificuldade')
      return
    }

    if (gameSession.abandonOnRefresh) {
      if (wasPageRefreshed()) {
        await endJourney('A jornada foi encerrada porque a página foi atualizada.')
        return
      }
      updateGameSession({ abandonOnRefresh: false })
    }

    window.addEventListener('pagehide', markGiveUpOnRefresh)
    if (!(await loadProfile())) return
    if (!currentEvent.value) {
      await loadEvent(gameSession.eventIndex)
    }
  })

  onUnmounted(() => {
    window.removeEventListener('pagehide', markGiveUpOnRefresh)
  })

  return {
    actionBusy,
    actionLabel,
    currentEvent,
    currentEventType,
    eventLoading,
    giveUpDialog,
    lastCombat,
    profileLoading,
    progress,
    performPrimaryAction,
    endJourney: () => endJourney('A jornada foi encerrada.'),
  }
}
