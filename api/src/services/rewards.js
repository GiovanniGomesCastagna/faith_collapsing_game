const db = require('../configs');

async function getRewardByID(id, queryExecutor = db) {
    const sql = `
    SELECT * FROM RECOMPENSAS
    WHERE id = $1
    `;

    const result = await queryExecutor.query(sql, [id]);
    return result.rows[0];
}

async function getRewardsByDifficulty(difficulty) {
    const sql = `
    SELECT * FROM RECOMPENSAS
    WHERE dificuldade = $1
    `;

    const result = await db.query(sql, [difficulty]);
    return result.rows
}

module.exports = {
    getRewardByID,
    getRewardsByDifficulty
}