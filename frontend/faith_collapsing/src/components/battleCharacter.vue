<template>
  <div class="character-container flex column items-center">
    <div v-if="!ready" class="event-placeholder">
      <q-spinner v-if="loading" color="amber-5" size="36px" />
    </div>
    <template v-else>
      <div v-if="isReward" class="reward-display">
        <q-img :src="image" :alt="name" class="reward-sprite" fit="contain" />
      </div>

      <template v-else>
        <div class="dice-container">
          <q-img :src="diceSprite" alt="Dado de vinte lados" fit="contain" />
          <span v-if="roll !== null && roll !== undefined" class="dice-result">{{ roll }}</span>
        </div>

        <q-img :src="image" :alt="name" class="sprite-img" fit="contain" />
      </template>
    </template>

    <div v-if="ready && isEnemy" class="enemy-info">
      <div class="event-heading">
        <strong>{{ name }}</strong>
        <span>{{ xp }} XP</span>
      </div>
      <div class="enemy-attack">ATAQUE {{ attack }}</div>
      <div class="health-label">
        <span>VIDA</span>
        <strong>{{ health }} / {{ maxHealth }}</strong>
      </div>
      <div class="health-bar-row">
        <q-linear-progress
          :value="healthRatio"
          color="negative"
          track-color="grey-9"
          rounded
          size="9px"
          class="health-progress"
        />
        <div class="enemy-defense" :aria-label="`Defesa do inimigo: ${defense}`">
          <img :src="defenseIcon" alt="" />
          <strong>{{ defense }}</strong>
        </div>
      </div>
    </div>
    <div v-else-if="ready && isReward" class="reward-info">
      <strong>{{ name }}</strong>
      <div class="reward-stats">
        <span>+{{ health }} VIDA</span>
        <span>+{{ xp }} XP</span>
      </div>
    </div>
    <div v-else class="event-info-spacer" aria-hidden="true"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import diceSprite from '../assets/jogo/dado20.png'
import defenseIcon from '../assets/icons/gamelayout/defesaIcon.png'

const props = defineProps({
  image: {
    type: String,
    required: true,
  },
  ready: {
    type: Boolean,
    default: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  name: {
    type: String,
    required: true,
  },
  roll: {
    type: Number,
    default: null,
  },
  isEnemy: {
    type: Boolean,
    default: false,
  },
  isReward: {
    type: Boolean,
    default: false,
  },
  health: {
    type: [Number, String],
    default: 0,
  },
  maxHealth: {
    type: [Number, String],
    default: 0,
  },
  defense: {
    type: [Number, String],
    default: 0,
  },
  attack: {
    type: [Number, String],
    default: 0,
  },
  xp: {
    type: [Number, String],
    default: 0,
  },
})

const healthRatio = computed(() => {
  const total = Number(props.maxHealth)
  const health = Number(props.health)
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(health)) return 0
  return Math.max(0, Math.min(health / total, 1))
})
</script>

<style scoped>
.character-container {
  width: 200px;
  --dice-size: 100px;
  --sprite-height: 250px;
  --event-info-height: 96px;
  --event-info-margin: 12px;
}

.dice-container {
  position: relative;
  width: var(--dice-size);
  height: var(--dice-size);
  margin-bottom: 25px;
  image-rendering: pixelated;
}

.dice-result {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #fff4cf;
  font-size: 30px;
  font-weight: 900;
  line-height: 1;
  pointer-events: none;
  -webkit-text-stroke: 1px #321b12;
  text-shadow: 1px 2px 2px #321b12;
}

.sprite-img {
  width: 100%;
  height: var(--sprite-height);
  image-rendering: pixelated;
}

.event-placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: calc(var(--dice-size) + 25px + var(--sprite-height));
}

.reward-display {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: calc(var(--dice-size) + 25px + var(--sprite-height));
}

.reward-sprite {
  width: 128px;
  height: 128px;
  image-rendering: pixelated;
}

.enemy-info {
  display: grid;
  gap: 3px;
  width: 100%;
  min-height: var(--event-info-height);
  box-sizing: border-box;
  margin-top: var(--event-info-margin);
  padding: 6px 8px;
  border: 1px solid rgba(255, 244, 207, 0.3);
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.38);
  color: #fff4cf;
  font-family: 'The Inquisition', serif;
  text-shadow: 1px 1px 2px #1d1d1d;
}

.event-info-spacer {
  height: var(--event-info-height);
  margin-top: var(--event-info-margin);
}

.event-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 14px;
}

.event-heading strong,
.reward-info > strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-heading span {
  flex-shrink: 0;
}

.enemy-attack {
  font-size: 13px;
}

.health-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.health-label strong {
  white-space: nowrap;
}

.health-bar-row {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  gap: 8px;
}

.health-progress {
  flex: 1;
  min-width: 0;
  width: auto;
  max-width: 100%;
}

.reward-info {
  display: grid;
  align-content: center;
  gap: 6px;
  width: 100%;
  height: var(--event-info-height);
  box-sizing: border-box;
  margin-top: var(--event-info-margin);
  padding: 4px 8px;
  border: 1px solid rgba(255, 244, 207, 0.3);
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.38);
  color: #fff4cf;
  font-family: 'The Inquisition', serif;
  text-align: center;
  text-shadow: 1px 1px 2px #1d1d1d;
}

.reward-stats {
  display: flex;
  justify-content: center;
  gap: 12px;
  font-size: 14px;
}

.enemy-defense {
  display: flex;
  align-items: center;
  gap: 3px;
  min-width: 36px;
  font-size: 14px;
}

.enemy-defense img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  image-rendering: pixelated;
}
</style>
