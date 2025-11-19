const UserFinancials = require('../models/UserFinancials');

/**
 * GET /api/financials
 * Get the authenticated user's financial data.
 */
exports.getFinancials = async (req, res) => {
  try {
    let financials = await UserFinancials.findOne({ userId: req.user._id });

    if (!financials) {
      // Create empty record for new users
      financials = await UserFinancials.create({
        userId: req.user._id,
        accounts: [],
        scenarios: [],
      });
    }

    res.json({ success: true, data: financials });
  } catch (err) {
    console.error('[GET FINANCIALS] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to load financial data' });
  }
};

// ─── ACCOUNTS ────────────────────────────────────────────────────────────────

/**
 * POST /api/financials/accounts
 * Add a new account.
 */
exports.addAccount = async (req, res) => {
  try {
    const { name, type, balance, annualGrowthRate, standardDeviation, taxTreatment, interestRate, minimumPayment, currency } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, message: 'Name and type are required' });
    }

    let financials = await UserFinancials.findOne({ userId: req.user._id });
    if (!financials) {
      financials = await UserFinancials.create({ userId: req.user._id, accounts: [], scenarios: [] });
    }

    financials.accounts.push({
      name,
      type,
      balance: balance || 0,
      annualGrowthRate: annualGrowthRate || 0,
      standardDeviation: standardDeviation || 0,
      taxTreatment: taxTreatment || 'taxable',
      interestRate: interestRate || 0,
      minimumPayment: minimumPayment || 0,
      currency: currency || 'USD',
    });

    await financials.save();

    res.status(201).json({ success: true, data: financials });
  } catch (err) {
    console.error('[ADD ACCOUNT] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to add account' });
  }
};

/**
 * PUT /api/financials/accounts/:accountId
 * Update an existing account.
 */
exports.updateAccount = async (req, res) => {
  try {
    const { accountId } = req.params;
    const financials = await UserFinancials.findOne({ userId: req.user._id });

    if (!financials) {
      return res.status(404).json({ success: false, message: 'No financial data found' });
    }

    const account = financials.accounts.id(accountId);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const fields = ['name', 'type', 'balance', 'annualGrowthRate', 'standardDeviation', 'taxTreatment', 'interestRate', 'minimumPayment', 'currency'];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        account[field] = req.body[field];
      }
    });

    await financials.save();
    res.json({ success: true, data: financials });
  } catch (err) {
    console.error('[UPDATE ACCOUNT] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update account' });
  }
};

/**
 * DELETE /api/financials/accounts/:accountId
 * Remove an account.
 */
exports.deleteAccount = async (req, res) => {
  try {
    const { accountId } = req.params;
    const financials = await UserFinancials.findOne({ userId: req.user._id });

    if (!financials) {
      return res.status(404).json({ success: false, message: 'No financial data found' });
    }

    const account = financials.accounts.id(accountId);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    account.deleteOne();
    await financials.save();
    res.json({ success: true, data: financials });
  } catch (err) {
    console.error('[DELETE ACCOUNT] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete account' });
  }
};

// ─── SCENARIOS ───────────────────────────────────────────────────────────────

/**
 * POST /api/financials/scenarios
 * Add a new scenario.
 */
exports.addScenario = async (req, res) => {
  try {
    const { label, type, amount, startYear, isRecurring, frequency } = req.body;

    if (!label || !type || amount === undefined || !startYear) {
      return res.status(400).json({ success: false, message: 'Label, type, amount, and startYear are required' });
    }

    let financials = await UserFinancials.findOne({ userId: req.user._id });
    if (!financials) {
      financials = await UserFinancials.create({ userId: req.user._id, accounts: [], scenarios: [] });
    }

    financials.scenarios.push({
      label,
      type,
      amount,
      startYear,
      isRecurring: isRecurring || false,
      frequency: frequency || 'annually',
    });

    await financials.save();
    res.status(201).json({ success: true, data: financials });
  } catch (err) {
    console.error('[ADD SCENARIO] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to add scenario' });
  }
};

/**
 * PUT /api/financials/scenarios/:scenarioId
 * Update a scenario.
 */
exports.updateScenario = async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const financials = await UserFinancials.findOne({ userId: req.user._id });

    if (!financials) {
      return res.status(404).json({ success: false, message: 'No financial data found' });
    }

    const scenario = financials.scenarios.id(scenarioId);
    if (!scenario) {
      return res.status(404).json({ success: false, message: 'Scenario not found' });
    }

    const fields = ['label', 'type', 'amount', 'startYear', 'isRecurring', 'frequency'];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        scenario[field] = req.body[field];
      }
    });

    await financials.save();
    res.json({ success: true, data: financials });
  } catch (err) {
    console.error('[UPDATE SCENARIO] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update scenario' });
  }
};

/**
 * DELETE /api/financials/scenarios/:scenarioId
 * Remove a scenario.
 */
exports.deleteScenario = async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const financials = await UserFinancials.findOne({ userId: req.user._id });

    if (!financials) {
      return res.status(404).json({ success: false, message: 'No financial data found' });
    }

    const scenario = financials.scenarios.id(scenarioId);
    if (!scenario) {
      return res.status(404).json({ success: false, message: 'Scenario not found' });
    }

    scenario.deleteOne();
    await financials.save();
    res.json({ success: true, data: financials });
  } catch (err) {
    console.error('[DELETE SCENARIO] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete scenario' });
  }
};
