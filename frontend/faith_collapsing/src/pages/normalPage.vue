<template>
  <q-page
    :style="{ backgroundImage: `url(${bgForest})` }"
    class="game-background flex column justify-between"
  >
    <div class="q-pa-md progress-container q-pt-xl">
      <q-linear-progress
        :value="progress"
        color="green-6"
        track-color="green-10"
        size="24px"
        rounded
        stripe
      />
    </div>

    <div class="battle-area row justify-around items-end">
      <BattleCharacter :image="warriorSprite" name="Guerreiro" :roll="lastCombat?.userRoll" />

      <BattleCharacter
        :image="currentEventType === 'reward' ? chestSprite : bizarroSprite"
        :ready="!!currentEvent"
        :loading="eventLoading"
        :name="currentEvent?.nome || 'Inimigo'"
        :roll="lastCombat?.enemyRoll"
        :is-enemy="currentEventType === 'enemy'"
        :is-reward="currentEventType === 'reward'"
        :health="currentEvent?.vida"
        :max-health="currentEvent?.vida_total ?? currentEvent?.vida"
        :defense="currentEvent?.defesa"
        :attack="currentEvent?.ataque"
        :xp="currentEvent?.xp"
      />
    </div>

    <div class="actions-container row justify-center q-pb-lg q-gutter-md">
      <q-btn
        color="red-10"
        :label="actionLabel"
        push
        class="game-btn text-weight-bolder text-h6"
        :loading="actionBusy || eventLoading || profileLoading"
        :disable="eventLoading || profileLoading"
        @click="performPrimaryAction"
      />

      <q-btn
        color="deep-purple-10"
        label="FUGIR"
        icon="directions_run"
        push
        class="game-btn text-weight-bolder text-h6"
        :disable="actionBusy || eventLoading || !currentEvent"
        @click="giveUpDialog = true"
      />
    </div>

    <q-dialog v-model="giveUpDialog">
      <q-card class="give-up-card">
        <q-card-section class="text-h6">Desistir da jornada?</q-card-section>
        <q-card-section>Os desafios restantes serão abandonados.</q-card-section>
        <q-card-actions align="right">
          <q-btn label="CONTINUAR" flat no-caps v-close-popup />
          <q-btn
            label="DESISTIR"
            color="red-9"
            unelevated
            no-caps
            :loading="actionBusy"
            @click="endJourney"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import BattleCharacter from '../components/battleCharacter.vue'
import { useGameJourney } from '../composables/useGameJourney'
import bgForest from '../assets/backgrounds/jogo/Dungeon.png'
import bizarroSprite from '../assets/jogo/sprites/Bizarro.png'
import chestSprite from '../assets/jogo/sprites/WoodChest.png'
import warriorSprite from '../assets/jogo/sprites/Guerreiro.png'

const {
  actionBusy,
  actionLabel,
  currentEvent,
  currentEventType,
  endJourney,
  eventLoading,
  giveUpDialog,
  lastCombat,
  profileLoading,
  performPrimaryAction,
  progress,
} = useGameJourney(2)
</script>

<style scoped>
.game-background {
  background-color: #202020;
  background-size: cover;
  background-position: center bottom;
  position: relative;
  overflow: hidden;
}

.progress-container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.battle-area {
  flex-grow: 1;
  padding-bottom: 2rem;
  padding-inline: 10%;
}

.actions-container {
  width: 100%;
  padding-bottom: 30px;
}

.game-btn {
  width: 160px;
  height: 55px;
  border-radius: 8px;
  letter-spacing: 2px;
}

.give-up-card {
  min-width: min(90vw, 360px);
  background-color: #fff4cf;
  color: #594632;
}
</style>
