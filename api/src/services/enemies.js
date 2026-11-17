const db = require('../configs');

const ENEMY_STAT_GROWTH_RATE = 1.2;
const MAX_ENEMY_DEFENSE = 18;

async function getEnemyByID(id, queryExecutor = db) {
    const sql = `
    SELECT * FROM INIMIGOS
    WHERE id = $1
    `;

    const result = await queryExecutor.query(sql, [id]);
    return result.rows[0];
}

async function getEnemiesByDifficulty(difficulty) {
    const sql = `
    SELECT * FROM INIMIGOS
    WHERE dificuldade = $1
    `;

    const result = await db.query(sql, [difficulty]);
    return result.rows;
}

function getEnemyStatsForPlayerLevel(enemyData, playerLevel) {
    const difficulty = Number(enemyData.dificuldade);
    const currentPlayerLevel = Number(playerLevel);

    if (
        !Number.isSafeInteger(difficulty) ||
        !Number.isSafeInteger(currentPlayerLevel) ||
        currentPlayerLevel < 1
    ) {
        throw new Error('Enemy difficulty or player level is invalid.');
    }

    let enemyLevel;
    if (difficulty === 1) {
        enemyLevel =
            currentPlayerLevel > 3 ? currentPlayerLevel - 2 : currentPlayerLevel;
    } else if (difficulty === 2) {
        enemyLevel = currentPlayerLevel;
    } else if (difficulty === 3) {
        enemyLevel = currentPlayerLevel + 2;
    } else {
        throw new Error('Enemy difficulty does not support level scaling.');
    }

    const baseHealth = Number(enemyData.vida);
    const baseAttack = Number(enemyData.ataque);
    const baseDefense = Number(enemyData.defesa);
    if (
        !Number.isSafeInteger(baseHealth) ||
        !Number.isSafeInteger(baseAttack) ||
        !Number.isSafeInteger(baseDefense) ||
        baseHealth < 1 ||
        baseAttack < 0 ||
        baseDefense < 0
    ) {
        throw new Error('Enemy base stats are invalid.');
    }

    const levelMultiplier = Math.pow(
        ENEMY_STAT_GROWTH_RATE,
        enemyLevel - 1,
    );
    const health = Math.ceil(baseHealth * levelMultiplier);
    const attack = Math.ceil(baseAttack * levelMultiplier);
    const defense = Math.min(
        MAX_ENEMY_DEFENSE,
        Math.ceil(baseDefense * levelMultiplier),
    );

    if (
        !Number.isSafeInteger(health) ||
        !Number.isSafeInteger(attack) ||
        !Number.isSafeInteger(defense)
    ) {
        throw new Error('Scaled enemy stats exceed the supported range.');
    }

    return {
        vida: health,
        ataque: attack,
        defesa: defense,
    };
}

module.exports = {
    getEnemyByID,
    getEnemiesByDifficulty,
    getEnemyStatsForPlayerLevel,
}