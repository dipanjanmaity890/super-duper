const express = require('express');
const router  = express.Router();
const { listTeams } = require('../controllers/teamsController');
const { optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, listTeams);

module.exports = router;
