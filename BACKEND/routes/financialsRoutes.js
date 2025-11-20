const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getFinancials,
  addAccount,
  updateAccount,
  deleteAccount,
  addScenario,
  updateScenario,
  deleteScenario,
} = require('../controllers/financialsController');

// All routes require authentication
router.use(protect);

// Main financials
router.get('/', getFinancials);

// Accounts CRUD
router.post('/accounts', addAccount);
router.put('/accounts/:accountId', updateAccount);
router.delete('/accounts/:accountId', deleteAccount);

// Scenarios CRUD
router.post('/scenarios', addScenario);
router.put('/scenarios/:scenarioId', updateScenario);
router.delete('/scenarios/:scenarioId', deleteScenario);

module.exports = router;
