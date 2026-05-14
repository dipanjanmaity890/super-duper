// ─── routes/auth.js ───────────────────────────────────────────────────────────
const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', ctrl.register);
router.post('/login',    ctrl.login);
router.get ('/me',       authenticate, ctrl.getMe);

module.exports = router;
