const { query } = require('../config/db');

/** GET /teams – list all teams */
const listTeams = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, name, short_code, badge_color, city, country FROM teams ORDER BY name'
    );
    res.json({ teams: rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { listTeams };
