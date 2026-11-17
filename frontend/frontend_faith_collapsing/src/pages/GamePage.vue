<template>
  <q-page class="game-page">
    <main class="game-shell">
      <section v-if="abandonLoading" class="abandon-state">
        <q-spinner-orbit color="primary" size="42px" />
        <span>Encerrando a jornada após a atualização…</span>
      </section>

      <q-banner v-else-if="abandonError" rounded class="abandon-error">
        {{ abandonError }}
        <template #action>
          <q-btn flat no-caps label="Tentar novamente" @click="abandonAfterRefresh" />
        </template>
      </q-banner>

      <template v-else-if="hasGame">
        <header class="game-heading">
          <q-btn
            flat
            round
            icon="arrow_back"
            aria-label="Voltar ao painel"
            class="back-button"
            :disable="actionBusy"
            to="/"
          />
          <div>
            <div class="eyebrow">JORNADA {{ difficultyName.toUpperCase() }}</div>
            <h1>Encontro {{ gameSession.eventIndex + 1 }} de {{ gameSession.events.length }}</h1>
          </div>
          <q-space />
          <q-btn
            v-if="currentEventType === 'enemy' && currentEvent?.status === 'Andamento'"
            flat
            no-caps
            icon="flag"
            label="Desistir"
            class="give-up-button"
            :disable="actionBusy"
            @click="giveUpDialog = true"
          />
        </header>

        <q-linear-progress
          rounded
          size="5px"
          :value="(gameSession.eventIndex + 1) / gameSession.events.length"
          color="primary"
          track-color="grey-9"
          class="progress-bar"
        />

        <section class="game-content">
          <q-card flat class="player-card">
            <div v-if="profileLoading" class="profile-loading">
              <q-spinner-orbit color="primary" size="30px" />
              <span>Carregando seus atributos…</span>
            </div>
            <template v-else-if="session.user">
              <div class="eyebrow">PERSONAGEM</div>
              <h2>{{ className(session.user.classe) }}</h2>
              <div class="level-label">
                <q-icon name="military_tech" />
                Nível {{ session.user.nivel }}
              </div>

              <div class="player-stat">
                <div class="stat-heading">
                  <span><q-icon name="favorite" /> Vida</span>
                  <strong
                    >{{ session.user.vida }} <small>/ {{ session.user.vida_total }}</small></strong
                  >
                </div>
                <q-linear-progress
                  rounded
                  size="8px"
                  :value="healthRatio"
                  color="negative"
                  track-color="grey-9"
                />
              </div>

              <div class="player-stat">
                <div class="stat-heading">
                  <span><q-icon name="auto_awesome" /> Experiência</span>
                  <strong>{{ session.user.xp }} <small>/ 1000 XP</small></strong>
                </div>
                <q-linear-progress
                  rounded
                  size="6px"
                  :value="xpRatio"
                  color="warning"
                  track-color="grey-9"
                />
              </div>

              <div class="player-combat-stats">
                <div>
                  <q-icon name="swords" /><span>Ataque</span
                  ><strong>{{ session.user.ataque }}</strong>
                </div>
                <div>
                  <q-icon name="shield" /><span>Defesa</span
                  ><strong>{{ session.user.defesa }}</strong>
                </div>
              </div>

              <q-btn
                unelevated
                no-caps
                icon="favorite"
                label="Trocar XP por vida"
                class="heal-button full-width"
                :loading="healing"
                :disable="healing || Number(session.user.vida) >= Number(session.user.vida_total)"
                @click="convertXPToHealth"
              />
            </template>
            <div v-else class="profile-loading">Não foi possível carregar os atributos.</div>
          </q-card>

          <q-card flat class="event-card">
            <div v-if="eventLoading" class="loading-state">
              <q-spinner-orbit color="primary" size="40px" />
              <span>Preparando o encontro…</span>
            </div>

            <template v-else-if="currentEvent">
              <q-badge
                :class="currentEventType === 'enemy' ? 'enemy-badge' : 'reward-badge'"
                :label="currentEventType === 'enemy' ? 'INIMIGO' : 'RECOMPENSA'"
              />
              <h2>{{ currentEvent.nome }}</h2>

              <template v-if="currentEventType === 'enemy'">
                <div class="enemy-health">
                  <div class="stat-heading">
                    <span><q-icon name="favorite" /> Vida do inimigo</span>
                    <strong>
                      {{ currentEvent.vida }}
                      <small>/ {{ currentEvent.vida_total ?? currentEvent.vida }}</small>
                    </strong>
                  </div>
                  <q-linear-progress
                    rounded
                    size="9px"
                    :value="enemyHealthRatio"
                    color="negative"
                    track-color="grey-9"
                  />
                </div>
                <div class="enemy-stats">
                  <div>
                    <span>Ataque</span><strong>{{ currentEvent.ataque }}</strong>
                  </div>
                  <div>
                    <span>Defesa</span><strong>{{ currentEvent.defesa }}</strong>
                  </div>
                </div>

                <div v-if="currentEvent.lastCombat" class="combat-rolls" aria-live="polite">
                  <div class="rolls-heading">Rolagens desta rodada</div>
                  <div class="roll-row">
                    <span>Seu ataque</span>
                    <strong>D20: {{ currentEvent.lastCombat.userRoll }}</strong>
                    <span>Defesa inimiga: {{ currentEvent.lastCombat.enemyDefense }}</span>
                    <span
                      class="roll-result"
                      :class="currentEvent.lastCombat.userHit ? 'hit' : 'miss'"
                    >
                      {{ currentEvent.lastCombat.userHit ? 'Acertou' : 'Errou' }}
                    </span>
                  </div>
                  <div class="roll-row">
                    <span>Contra-ataque do inimigo</span>
                    <strong>D20: {{ currentEvent.lastCombat.enemyRoll }}</strong>
                    <span>Sua defesa: {{ currentEvent.lastCombat.userDefense }}</span>
                    <span
                      class="roll-result"
                      :class="
                        !currentEvent.lastCombat.enemyAttackResolved
                          ? 'skipped'
                          : currentEvent.lastCombat.enemyHit
                            ? 'hit'
                            : 'miss'
                      "
                    >
                      {{
                        !currentEvent.lastCombat.enemyAttackResolved
                          ? 'Interrompido: inimigo derrotado'
                          : currentEvent.lastCombat.enemyHit
                            ? 'Acertou'
                            : 'Errou'
                      }}
                    </span>
                  </div>
                </div>

                <q-banner
                  v-if="currentEvent.status === 'Vencido'"
                  rounded
                  class="result-banner victory"
                >
                  <template #avatar><q-icon name="check_circle" /></template>
                  Inimigo derrotado. Você pode seguir em frente.
                </q-banner>
                <q-banner
                  v-else-if="currentEvent.status === 'Perdido'"
                  rounded
                  class="result-banner defeat"
                >
                  <template #avatar><q-icon name="heart_broken" /></template>
                  Você foi derrotado neste encontro.
                </q-banner>

                <div class="event-actions">
                  <q-btn
                    v-if="currentEvent.status === 'Andamento'"
                    unelevated
                    no-caps
                    icon="sports_martial_arts"
                    label="Atacar"
                    class="primary-button"
                    :loading="actionBusy"
                    @click="attack"
                  />
                  <q-btn
                    v-else-if="currentEvent.status === 'Vencido'"
                    unelevated
                    no-caps
                    icon-right="arrow_forward"
                    label="Próximo encontro"
                    class="primary-button"
                    :loading="eventLoading"
                    @click="nextEvent"
                  />
                  <q-btn
                    v-else
                    flat
                    no-caps
                    label="Voltar ao painel"
                    class="secondary-button"
                    :loading="actionBusy"
                    :disable="actionBusy"
                    @click="returnHome"
                  />
                </div>
              </template>

              <template v-else>
                <p class="reward-description">
                  Uma oportunidade para recuperar forças e seguir adiante.
                </p>
                <div class="reward-values">
                  <div>
                    <q-icon name="favorite" /><span>+{{ currentEvent.vida }} vida</span>
                  </div>
                  <div>
                    <q-icon name="auto_awesome" /><span>+{{ currentEvent.xp }} XP</span>
                  </div>
                </div>
                <q-banner
                  v-if="currentEvent.status === 'Resgatado'"
                  rounded
                  class="result-banner victory"
                >
                  <template #avatar><q-icon name="check_circle" /></template>
                  Recompensa resgatada.
                </q-banner>
                <div class="event-actions">
                  <q-btn
                    v-if="currentEvent.status === 'Andamento'"
                    unelevated
                    no-caps
                    icon="redeem"
                    label="Resgatar recompensa"
                    class="primary-button"
                    :loading="actionBusy"
                    @click="claimReward"
                  />
                  <q-btn
                    v-else
                    unelevated
                    no-caps
                    icon-right="arrow_forward"
                    label="Próximo encontro"
                    class="primary-button"
                    :loading="eventLoading"
                    @click="nextEvent"
                  />
                </div>
              </template>
            </template>

            <div v-else class="loading-state">
              <q-icon name="error_outline" size="34px" color="warning" />
              <span>Não foi possível carregar este encontro.</span>
              <q-btn
                flat
                no-caps
                label="Tentar novamente"
                @click="loadEvent(gameSession.eventIndex)"
              />
            </div>
          </q-card>
        </section>
      </template>

      <q-card v-else flat class="empty-card">
        <q-icon name="explore_off" size="42px" color="warning" />
        <h1>Esta jornada não está disponível.</h1>
        <p>Escolha uma dificuldade no painel principal para gerar uma nova jornada.</p>
        <q-btn unelevated no-caps label="Voltar ao painel" to="/" class="primary-button" />
      </q-card>
    </main>

    <q-dialog v-model="giveUpDialog">
      <q-card class="confirmation-card">
        <q-card-section>
          <div class="eyebrow">ENCERRAR ENCONTRO</div>
          <div class="dialog-title">Tem certeza de que deseja desistir?</div>
          <p>
            A escolha será finalizada e a vida perdida até aqui será mantida. Você não receberá XP
            por este encontro.
          </p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Continuar lutando" class="secondary-button" v-close-popup />
          <q-btn
            unelevated
            no-caps
            label="Sim, desistir"
            class="danger-button"
            :loading="actionBusy"
            @click="giveUp"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { api } from '@/services/api'
import { clearGameSession, gameSession, updateGameSession } from '@/services/gameSession'
import { clearSession, session, updateSessionUser } from '@/services/session'

const props = defineProps({
  difficulty: {
    type: Number,
    required: true,
  },
})

const $q = useQuasar()
const router = useRouter()
const eventLoading = ref(false)
const actionBusy = ref(false)
const giveUpDialog = ref(false)
const profileLoading = ref(false)
const healing = ref(false)
const abandonLoading = ref(false)
const abandonError = ref('')

const difficultyLabels = {
  1: 'Fácil',
  2: 'Médio',
  3: 'Difícil',
}

const difficultyName = computed(() => difficultyLabels[props.difficulty])
const hasGame = computed(
  () =>
    gameSession.difficulty === props.difficulty &&
    Boolean(gameSession.choiceID) &&
    gameSession.events.length > 0,
)
const currentEvent = computed(() => gameSession.currentEvent)
const currentEventType = computed(() => gameSession.currentEventType)
const enemyHealthRatio = computed(() => {
  const total = Number(currentEvent.value?.vida_total ?? currentEvent.value?.vida) || 0
  const health = Number(currentEvent.value?.vida) || 0
  return total > 0 ? Math.max(0, Math.min(health / total, 1)) : 0
})
const healthRatio = computed(() => {
  const total = Number(session.user?.vida_total) || 0
  const health = Number(session.user?.vida) || 0
  return total > 0 ? Math.min(health / total, 1) : 0
})
const xpRatio = computed(() => Math.min((Number(session.user?.xp) || 0) / 1000, 1))

function className(value) {
  return (
    {
      guerreiro: 'Guerreiro',
      mago: 'Mago',
      bandido: 'Bandido',
    }[value] || 'Aventureiro'
  )
}

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
  if (!session.token) return

  profileLoading.value = true
  try {
    const response = await api.getProfile()
    updateSessionUser(response.data)
  } catch (error) {
    if (error.status === 401) {
      clearSession()
      await router.replace('/login')
      return
    }
    notifyError(error)
  } finally {
    profileLoading.value = false
  }
}

async function convertXPToHealth() {
  healing.value = true
  try {
    const response = await api.convertXPToHealth()
    updateStats(response.data)
    $q.notify({
      type: 'positive',
      message: `Vida restaurada. ${response.data.xpSpent} XP utilizado(s).`,
      position: 'top',
    })
  } catch (error) {
    notifyError(error)
  } finally {
    healing.value = false
  }
}

async function loadEvent(index) {
  if (!hasGame.value || index < 0 || index >= gameSession.events.length) return

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

async function attack() {
  if (!currentEvent.value) return

  actionBusy.value = true
  try {
    const response = await api.attack(currentEvent.value.id)
    updateStats(response.data)
    updateGameSession({
      currentEvent: {
        ...currentEvent.value,
        vida: response.data.enemyHealth,
        status: response.data.gameStatus,
        lastCombat: {
          userRoll: response.data.userRoll,
          enemyRoll: response.data.enemyRoll,
          userHit: response.data.userHit,
          enemyHit: response.data.enemyHit,
          enemyAttackResolved: response.data.enemyAttackResolved,
          userDefense: response.data.userDefense,
          enemyDefense: response.data.enemyDefense,
        },
      },
    })
    if (response.data.gameStatus === 'Vencido') {
      $q.notify({
        type: 'positive',
        message: `Inimigo derrotado. +${response.data.xpGained} XP.`,
        position: 'top',
      })
    } else if (response.data.gameStatus === 'Perdido') {
      $q.notify({
        type: 'negative',
        message: 'Você foi derrotado. Volte ao painel para recuperar sua vida.',
        position: 'top',
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
    clearGameSession()
    $q.notify({ type: 'positive', message: 'Jornada concluída.', position: 'top' })
    await router.push('/')
    return
  }
  await loadEvent(nextIndex)
}

async function giveUp() {
  if (!currentEvent.value) return

  actionBusy.value = true
  try {
    const response = await api.giveUp(currentEvent.value.id)
    updateStats(response.data)
    giveUpDialog.value = false
    clearGameSession()
    $q.notify({
      type: 'positive',
      message: 'Escolha finalizada. Você voltou ao painel principal.',
      position: 'top',
    })
    await router.push('/')
  } catch (error) {
    notifyError(error)
  } finally {
    actionBusy.value = false
  }
}

function markGiveUpOnRefresh() {
  if (hasGame.value && gameSession.choiceID) {
    updateGameSession({ abandonOnRefresh: true })
  }
}

function wasPageRefreshed() {
  return performance.getEntriesByType('navigation')[0]?.type === 'reload'
}

async function abandonAfterRefresh() {
  if (!gameSession.choiceID) {
    clearGameSession()
    await router.replace('/')
    return
  }

  abandonLoading.value = true
  abandonError.value = ''
  try {
    await api.giveUpChoice(gameSession.choiceID)
    clearGameSession()
    $q.notify({
      type: 'positive',
      message: 'A jornada foi encerrada porque a página foi atualizada.',
      position: 'top',
    })
    await router.replace('/')
  } catch (error) {
    if ([404, 409].includes(error.status)) {
      clearGameSession()
      await router.replace('/')
      return
    }
    abandonError.value = error.message || 'Não foi possível encerrar a jornada.'
  } finally {
    abandonLoading.value = false
  }
}

function returnHome() {
  router.push('/')
}

onBeforeRouteLeave(async (to) => {
  if (to.path !== '/' || currentEvent.value?.status !== 'Perdido') return

  actionBusy.value = true
  try {
    const response = await api.giveUpChoice(gameSession.choiceID)
    updateStats(response.data)
    clearGameSession()
    $q.notify({
      type: 'positive',
      message: 'Você recuperou toda a sua vida.',
      position: 'top',
    })
  } catch (error) {
    notifyError(error)
    return false
  } finally {
    actionBusy.value = false
  }
})

onMounted(() => {
  if (!hasGame.value) return
  if (gameSession.abandonOnRefresh) {
    if (wasPageRefreshed()) {
      abandonAfterRefresh()
      return
    }
    updateGameSession({ abandonOnRefresh: false })
  }

  window.addEventListener('pagehide', markGiveUpOnRefresh)
  loadProfile()
  if (!currentEvent.value) loadEvent(gameSession.eventIndex)
})

onUnmounted(() => {
  window.removeEventListener('pagehide', markGiveUpOnRefresh)
})
</script>

<style scoped>
.game-page {
  min-height: calc(100vh - 76px);
  padding: clamp(32px, 6vw, 70px) 0;
}

.game-shell {
  width: min(100% - 40px, 900px);
  margin: 0 auto;
}

.game-heading {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.back-button {
  color: #d4c6b3;
}

.eyebrow {
  color: #c69b66;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.18em;
}

.game-heading h1,
.empty-card h1 {
  margin: 8px 0 0;
  color: #f4ede2;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(28px, 4vw, 38px);
  font-weight: 500;
}

.give-up-button {
  color: #d58e79;
}

.progress-bar {
  margin-bottom: 18px;
}

.game-content {
  display: grid;
  grid-template-columns: minmax(235px, 0.72fr) minmax(0, 1.28fr);
  align-items: start;
  gap: 18px;
}

.player-card,
.event-card,
.empty-card,
.confirmation-card {
  border: 1px solid rgba(224, 193, 149, 0.14);
  border-radius: 18px;
  background: linear-gradient(150deg, rgba(32, 35, 29, 0.96), rgba(24, 25, 21, 0.98));
  color: #eee5d8;
}

.player-card {
  padding: 22px;
}

.player-card h2 {
  margin: 8px 0 0;
  color: #f1e8db;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 24px;
  font-weight: 500;
}

.level-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 7px;
  color: #d6aa6d;
  font-size: 12px;
}

.player-stat {
  display: grid;
  gap: 9px;
  margin-top: 23px;
}

.player-combat-stats {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin: 23px 0 19px;
}

.player-combat-stats > div {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 6px;
  color: #9c988c;
  font-size: 11px;
}

.player-combat-stats .q-icon {
  color: #d8a361;
}

.player-combat-stats strong {
  color: #f0e5d4;
  font-size: 13px;
}

.heal-button {
  min-height: 40px;
  color: #f0c77f;
  border: 1px solid rgba(240, 199, 127, 0.25);
  border-radius: 9px;
  background: rgba(205, 151, 77, 0.1);
  font-size: 11px;
}

.profile-loading,
.abandon-state {
  display: grid;
  min-height: 180px;
  place-content: center;
  justify-items: center;
  gap: 12px;
  color: #b0aa9c;
  text-align: center;
}

.abandon-state {
  min-height: 50vh;
}

.abandon-error {
  color: #e4cbb8;
  border: 1px solid rgba(207, 129, 101, 0.22);
  background: rgba(151, 67, 45, 0.12);
}

.event-card {
  min-height: 360px;
  padding: clamp(20px, 5vw, 36px);
}

.event-card h2 {
  margin: 16px 0 0;
  color: #f1e8db;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 32px;
  font-weight: 500;
}

.enemy-badge,
.reward-badge {
  padding: 5px 8px;
  border-radius: 5px;
  background: rgba(205, 111, 84, 0.15);
  color: #e8a08b;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
}

.reward-badge {
  background: rgba(224, 183, 103, 0.13);
  color: #e4bd7a;
}

.enemy-health {
  display: grid;
  gap: 9px;
  margin-top: 28px;
}

.stat-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #aaa597;
  font-size: 13px;
}

.stat-heading span {
  display: flex;
  align-items: center;
  gap: 7px;
}

.stat-heading .q-icon {
  color: #d79675;
}

.stat-heading strong {
  color: #f0e5d4;
}

.enemy-stats,
.reward-values {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
}

.enemy-stats > div,
.reward-values > div {
  display: grid;
  min-width: 105px;
  gap: 5px;
  padding: 12px 14px;
  border: 1px solid rgba(224, 193, 149, 0.12);
  border-radius: 10px;
  background: rgba(5, 6, 5, 0.18);
}

.enemy-stats span {
  color: #8f8b80;
  font-size: 11px;
}

.enemy-stats strong {
  color: #f0e5d4;
  font-size: 16px;
}

.combat-rolls {
  display: grid;
  gap: 12px;
  margin-top: 20px;
  padding: 14px;
  border: 1px solid rgba(224, 193, 149, 0.14);
  border-radius: 12px;
  background: rgba(15, 16, 13, 0.35);
}

.rolls-heading {
  color: #d6aa6d;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.roll-row {
  display: grid;
  grid-template-columns: minmax(100px, 1fr) auto minmax(115px, 1fr) auto;
  align-items: center;
  gap: 9px;
  color: #aaa597;
  font-size: 11px;
}

.roll-row strong {
  color: #f0e5d4;
  font-size: 12px;
}

.roll-result {
  font-weight: 700;
}

.roll-result.hit {
  color: #a8c18a;
}

.roll-result.miss {
  color: #d58e79;
}

.roll-result.skipped {
  color: #d6aa6d;
}

.reward-description {
  margin: 18px 0 0;
  color: #aaa597;
  font-size: 14px;
}

.reward-values > div {
  display: flex;
  align-items: center;
  color: #e7d8bd;
  font-size: 13px;
}

.reward-values .q-icon {
  margin-right: 8px;
  color: #dfab66;
}

.result-banner {
  margin-top: 22px;
  border: 1px solid rgba(224, 193, 149, 0.14);
  background: rgba(226, 190, 143, 0.06);
  color: #d8d0c3;
}

.victory {
  color: #b7d1aa;
}

.defeat {
  color: #e0a194;
}

.event-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 25px;
}

.primary-button {
  min-height: 44px;
  padding: 0 18px;
  color: #211a12;
  border-radius: 10px;
  background: linear-gradient(135deg, #edc27f, #d99a54);
  font-weight: 800;
}

.secondary-button {
  color: #e4d8c6;
}

.loading-state {
  display: grid;
  min-height: 300px;
  place-content: center;
  justify-items: center;
  gap: 14px;
  color: #b0aa9c;
}

.empty-card {
  display: grid;
  min-height: 330px;
  place-content: center;
  justify-items: center;
  padding: 24px;
  text-align: center;
}

.empty-card h1 {
  font-size: 30px;
}

.empty-card p {
  max-width: 430px;
  color: #a7a092;
  line-height: 1.6;
}

.confirmation-card {
  width: min(100%, 440px);
  padding: 8px;
}

.dialog-title {
  margin-top: 12px;
  color: #f4eadc;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 24px;
}

.confirmation-card p {
  margin: 11px 0 0;
  color: #a7a092;
  font-size: 13px;
  line-height: 1.65;
}

.danger-button {
  color: #f4e4dc;
  border-radius: 9px;
  background: #914d3e;
}

@media (max-width: 600px) {
  .game-shell {
    width: calc(100% - 28px);
  }

  .game-content {
    grid-template-columns: 1fr;
  }

  .roll-row {
    grid-template-columns: 1fr auto;
  }

  .roll-row > span:nth-child(3) {
    grid-column: 1;
  }

  .roll-result {
    grid-column: 2;
    grid-row: 2;
  }
}
</style>
