const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Sanitize req.body and req.params to prevent MongoDB operator injection
// (express-mongo-sanitize is incompatible with Express 5's read-only req.query)
function sanitizeMongo(obj) {
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        sanitizeMongo(obj[key]);
      }
    }
  }
  return obj;
}
app.use((req, res, next) => {
  if (req.body) sanitizeMongo(req.body);
  if (req.params) sanitizeMongo(req.params);
  next();
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-personal-wealth')
.then(() => console.log('MongoDB connected successfully'))
.catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Smart Personal Wealth API' });
});

// Import routes here
const authRoutes = require('./routes/authRoutes');
const financialsRoutes = require('./routes/financialsRoutes');
const aiRoutes = require('./routes/aiRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/financials', financialsRoutes);
app.use('/api/ai', aiRoutes);
// const userRoutes = require('./routes/userRoutes');
// app.use('/api/users', userRoutes);

// --- Server-side Monte Carlo Simulation ---

/**
 * Box-Muller transform: generates a random number from N(0,1).
 */
function boxMullerRandom() {
    let u1 = 0, u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Runs a server-side Monte Carlo simulation.
 *
 * @param {Array} accounts - User's accounts (with balance, annualGrowthRate, standardDeviation, type)
 * @param {Object} settings - { inflationRate, iterations, strategy, years }
 * @returns {Object} { yearlyResults: [{ year, median, p10, p90 }], summary }
 */
function runServerMonteCarlo(accounts, settings) {
    const {
        inflationRate = 3,
        iterations = 1000,
        strategy = 'none',   // 'none' | 'avalanche' | 'snowball'
        years = 10,
        extraPayment = 0,
        taxDrag = false,
    } = settings;

    const currentYear = new Date().getFullYear();
    const inflRate = inflationRate / 100;

    // Matrix: iterations × (years+1)
    const netWorthMatrix = [];

    for (let iter = 0; iter < iterations; iter++) {
        const balances = accounts.map((a) => ({ ...a, currentBalance: a.balance }));
        const yearValues = [];

        for (let y = 0; y <= years; y++) {
            if (y > 0) {
                // 1. Apply growth / interest
                balances.forEach((account) => {
                    const meanRate = account.annualGrowthRate / 100;

                    if (account.type === 'investment' || account.type === 'savings') {
                        const sd = (account.standardDeviation || 0) / 100;
                        let sampledRate = meanRate + sd * boxMullerRandom();

                        // Apply 15% LTCG tax drag on investment growth
                        if (taxDrag && account.type === 'investment') {
                            sampledRate = sampledRate * (1 - 0.15);
                        }

                        account.currentBalance = account.currentBalance * (1 + sampledRate);
                    } else if (account.type === 'debt') {
                        const debtRate = (account.interestRate || account.annualGrowthRate || 0) / 100;
                        account.currentBalance = account.currentBalance * (1 + debtRate);
                    }
                });

                // 2. Apply debt strategy extra payments
                if (strategy !== 'none' && extraPayment > 0) {
                    const activeDebts = balances.filter((a) => a.type === 'debt' && a.currentBalance < 0);

                    if (activeDebts.length > 0) {
                        if (strategy === 'avalanche') {
                            activeDebts.sort((a, b) => b.annualGrowthRate - a.annualGrowthRate);
                        } else if (strategy === 'snowball') {
                            activeDebts.sort((a, b) => Math.abs(a.currentBalance) - Math.abs(b.currentBalance));
                        }

                        let remaining = extraPayment;
                        for (const debt of activeDebts) {
                            if (remaining <= 0) break;
                            const owed = Math.abs(debt.currentBalance);
                            const payment = Math.min(remaining, owed);
                            debt.currentBalance += payment;
                            remaining -= payment;
                        }
                    }
                }
            }

            // Calculate net worth for this year
            let assets = 0, debt = 0;
            balances.forEach((account) => {
                if (account.type === 'debt') {
                    debt += Math.abs(account.currentBalance);
                } else {
                    assets += account.currentBalance;
                }
            });

            const rawNetWorth = assets - debt;

            // Discount to today's purchasing power
            const discountFactor = Math.pow(1 + inflRate, y);
            const realNetWorth = rawNetWorth / discountFactor;

            yearValues.push(Math.round(realNetWorth * 100) / 100);
        }

        netWorthMatrix.push(yearValues);
    }

    // Aggregate percentiles
    const yearlyResults = [];
    for (let y = 0; y <= years; y++) {
        const values = netWorthMatrix.map((row) => row[y]).sort((a, b) => a - b);
        const percentile = (p) => {
            const idx = Math.max(0, Math.ceil(p * values.length) - 1);
            return values[idx];
        };

        yearlyResults.push({
            year: currentYear + y,
            p10: Math.round(percentile(0.10) * 100) / 100,
            p25: Math.round(percentile(0.25) * 100) / 100,
            median: Math.round(percentile(0.50) * 100) / 100,
            p75: Math.round(percentile(0.75) * 100) / 100,
            p90: Math.round(percentile(0.90) * 100) / 100,
        });
    }

    const finalValues = netWorthMatrix.map((row) => row[years]);
    const mean = finalValues.reduce((s, v) => s + v, 0) / finalValues.length;

    return {
        yearlyResults,
        summary: {
            iterations,
            years,
            inflationRate,
            strategy,
            taxDrag,
            finalMedian: yearlyResults[yearlyResults.length - 1].median,
            finalMean: Math.round(mean * 100) / 100,
            finalP10: yearlyResults[yearlyResults.length - 1].p10,
            finalP90: yearlyResults[yearlyResults.length - 1].p90,
        },
    };
}

// POST /api/financials/simulate (protected)
const { protect } = require('./middleware/auth');
app.post('/api/financials/simulate', protect, (req, res) => {
    try {
        const { accounts, simulationSettings } = req.body;

        if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'accounts array is required and must not be empty',
            });
        }

        const settings = {
            inflationRate: 3,
            iterations: 1000,
            strategy: 'none',
            years: 10,
            extraPayment: 0,
            taxDrag: false,
            ...simulationSettings,
        };

        // Cap iterations to prevent abuse
        settings.iterations = Math.min(Math.max(settings.iterations, 100), 10000);
        settings.years = Math.min(Math.max(settings.years, 1), 50);

        console.log(`[SIMULATE] Running ${settings.iterations} iterations over ${settings.years} years...`);
        const startTime = Date.now();

        const result = runServerMonteCarlo(accounts, settings);

        const elapsed = Date.now() - startTime;
        console.log(`[SIMULATE] Complete in ${elapsed}ms`);

        res.json({
            success: true,
            data: result,
            meta: { computeTimeMs: elapsed },
        });
    } catch (err) {
        console.error('[SIMULATE] Error:', err);
        res.status(500).json({
            success: false,
            message: 'Simulation failed',
            error: process.env.NODE_ENV === 'development' ? err.message : {},
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
