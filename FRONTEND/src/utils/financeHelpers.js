/**
 * Finance helper utilities for Personal Wealth Forecaster
 */
import { quantile } from 'simple-statistics';

/**
 * Generates a year-by-year financial projection based on accounts and scenarios.
 *
 * Tax Logic: If an account's taxTreatment is 'taxable', 15% of that year's
 * gains (not total balance) is subtracted at end-of-year to simulate tax drag.
 *
 * Inflation Logic: For every year n the nominal net worth is divided by
 * (1 + inflationRate)^n to produce a realNetWorth in today's purchasing power.
 *
 * @param {Array}   accounts        - Account objects with balance, annualGrowthRate, type, taxTreatment
 * @param {Array}   scenarios       - Scenario objects with label, type, amount, startYear
 * @param {number}  years           - Years to project (default: 10)
 * @param {string}  debtStrategy    - 'none' | 'avalanche' | 'snowball'
 * @param {number}  extraPayment    - Extra annual payment towards debt (default: 0)
 * @param {boolean} applyTaxDrag    - Master switch – enable per-account taxTreatment logic (default: false)
 * @param {number}  inflationRate   - Annual inflation rate as percentage, e.g. 3 for 3% (default: 0)
 * @returns {Array} Array of { year, nominalNetWorth, realNetWorth, netWorth, assets, debt }
 */
export function generateProjection(accounts, scenarios, years = 10, debtStrategy = 'none', extraPayment = 0, applyTaxDrag = false, inflationRate = 0) {
  const currentYear = new Date().getFullYear();
  const projection = [];
  const inflRate = inflationRate / 100;

  // Create mutable copies of account balances
  const accountBalances = accounts.map((account) => ({
    ...account,
    currentBalance: account.balance,
  }));

  // Track recurring income changes that persist across years
  let recurringIncomeChange = 0;

  for (let i = 0; i <= years; i++) {
    const year = currentYear + i;

    // Apply growth to each account (skip year 0 — that's the starting point)
    if (i > 0) {
      accountBalances.forEach((account) => {
        const previousBalance = account.currentBalance;
        const rate = account.annualGrowthRate / 100;

        if (account.type === 'investment' || account.type === 'savings') {
          const newBalance = previousBalance * (1 + rate);
          const gain = newBalance - previousBalance;

          let taxDeducted = 0;
          if (applyTaxDrag && account.taxTreatment === 'taxable' && gain > 0) {
            taxDeducted = gain * 0.15;
          }

          account.currentBalance = Math.round((newBalance - taxDeducted) * 100) / 100;
        } else if (account.type === 'debt') {
          // Use interestRate for debt if available, fall back to annualGrowthRate
          const debtRate = (account.interestRate || account.annualGrowthRate || 0) / 100;
          account.currentBalance = Math.round(previousBalance * (1 + debtRate) * 100) / 100;
        }
      });

      // Apply debt optimization strategy with extra payments
      if (debtStrategy !== 'none' && extraPayment > 0) {
        const activeDebts = accountBalances.filter(
          (a) => a.type === 'debt' && a.currentBalance < 0
        );

        if (activeDebts.length > 0) {
          if (debtStrategy === 'avalanche') {
            activeDebts.sort((a, b) => b.annualGrowthRate - a.annualGrowthRate);
          } else if (debtStrategy === 'snowball') {
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

    // Apply scenarios for this year
    const matchingScenarios = scenarios.filter((s) => s.startYear === year);

    matchingScenarios.forEach((scenario) => {
      if (scenario.type === 'income-change') {
        // Income changes persist: add to the recurring tracker
        recurringIncomeChange += scenario.amount;
      } else if (scenario.type === 'one-time-expense') {
        // One-time: apply directly to the first savings/investment account balance
        // so it compounds into future years
        const target = accountBalances.find((a) => a.type === 'savings') ||
                       accountBalances.find((a) => a.type === 'investment');
        if (target) {
          target.currentBalance += scenario.amount;
        }
      }
    });

    // Apply recurring income change to savings each year after it starts
    if (i > 0 && recurringIncomeChange !== 0) {
      const savingsAccount = accountBalances.find((a) => a.type === 'savings') ||
                             accountBalances.find((a) => a.type === 'investment');
      if (savingsAccount) {
        savingsAccount.currentBalance += recurringIncomeChange;
      }
    }

    // Calculate totals
    let assets = 0;
    let debt = 0;

    accountBalances.forEach((account) => {
      if (account.type === 'debt') {
        debt += Math.abs(account.currentBalance);
      } else {
        assets += account.currentBalance;
      }
    });

    assets = Math.round(assets * 100) / 100;
    debt = Math.round(debt * 100) / 100;

    const netWorth = Math.round((assets - debt) * 100) / 100;

    // Inflation discount: realValue = nominalValue / (1 + inflationRate)^n
    const discountFactor = inflRate > 0 ? Math.pow(1 + inflRate, i) : 1;
    const realNetWorth = Math.round((netWorth / discountFactor) * 100) / 100;
    const realAssets = Math.round((assets / discountFactor) * 100) / 100;
    const realDebt = Math.round((debt / discountFactor) * 100) / 100;

    projection.push({
      year,
      netWorth: Math.round(netWorth * 100) / 100,
      nominalNetWorth: Math.round(netWorth * 100) / 100,
      realNetWorth,
      assets: Math.round(assets * 100) / 100,
      debt: Math.round(debt * 100) / 100,
      realAssets,
      realDebt,
    });
  }

  return projection;
}

/**
 * Adjusts a projection array for inflation, discounting future values
 * back to today's purchasing power.
 *
 * Formula: adjustedValue = rawValue / (1 + inflationRate)^n
 *
 * @param {Array} projection - Array of projection objects from generateProjection
 * @param {number} inflationRate - Annual inflation rate as percentage (e.g. 3 for 3%)
 * @returns {Array} New projection array with values in today's purchasing power
 */
export function adjustForInflation(projection, inflationRate = 3) {
  if (!projection || projection.length === 0) return [];
  const rate = inflationRate / 100;
  const baseYear = projection[0].year;

  return projection.map((entry) => {
    const n = entry.year - baseYear;
    const discountFactor = Math.pow(1 + rate, n);
    return {
      ...entry,
      netWorth: Math.round((entry.netWorth / discountFactor) * 100) / 100,
      assets: Math.round((entry.assets / discountFactor) * 100) / 100,
      debt: Math.round((entry.debt / discountFactor) * 100) / 100,
    };
  });
}

/**
 * Generates a random number from a standard normal distribution N(0,1)
 * using the Box-Muller transform.
 *
 * @returns {number} A random number from N(0,1)
 */
function boxMullerRandom() {
  let u1 = 0;
  let u2 = 0;
  // Avoid log(0)
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Returns a single random annual return sampled from a normal distribution
 * N(mean, stdDev) using the Box-Muller transform.
 *
 * @param {number} mean   - Expected annual return as a decimal (e.g. 0.08 for 8%)
 * @param {number} stdDev - Standard deviation as a decimal (e.g. 0.12 for 12%)
 * @returns {number} A random return rate (e.g. 0.062)
 */
export function getRandomReturn(mean, stdDev) {
  return mean + stdDev * boxMullerRandom();
}

/**
 * Runs a Monte Carlo simulation across all accounts.
 *
 * For investment/savings accounts, annual returns are sampled from a normal
 * distribution N(annualGrowthRate, standardDeviation). Debt accounts use their
 * fixed annualGrowthRate (no randomness).
 *
 * @param {Array} accounts - Array of account objects. Investment accounts should
 *   include a `standardDeviation` field (percentage, e.g. 12 for 12%).
 * @param {number} years - Number of years to project (default: 10)
 * @param {number} iterations - Number of simulation runs (default: 1000)
 * @returns {Array} Array of objects per year:
 *   { year, median, p10, p90 }
 */
export function runMonteCarlo(accounts, years = 10, iterations = 1000) {
  const currentYear = new Date().getFullYear();

  // Matrix: iterations x (years+1) storing net worth per year per iteration
  const netWorthMatrix = []; // [iteration][yearIndex]

  for (let iter = 0; iter < iterations; iter++) {
    // Fresh copy of balances for this iteration
    const balances = accounts.map((a) => ({ ...a, currentBalance: a.balance }));
    const yearValues = [];

    for (let y = 0; y <= years; y++) {
      if (y > 0) {
        balances.forEach((account) => {
          const meanRate = account.annualGrowthRate / 100;

          if (account.type === 'investment' || account.type === 'savings') {
            // Use standard deviation if provided, otherwise 0 (deterministic)
            const sd = (account.standardDeviation || 0) / 100;
            const sampledRate = getRandomReturn(meanRate, sd);
            account.currentBalance = account.currentBalance * (1 + sampledRate);
          } else if (account.type === 'debt') {
            // Debt: deterministic interest
            account.currentBalance = account.currentBalance * (1 + meanRate);
          }
        });
      }

      // Net worth for this year
      let assets = 0;
      let debt = 0;
      balances.forEach((account) => {
        if (account.type === 'debt') {
          debt += Math.abs(account.currentBalance);
        } else {
          assets += account.currentBalance;
        }
      });

      yearValues.push(Math.round((assets - debt) * 100) / 100);
    }

    netWorthMatrix.push(yearValues);
  }

  // Aggregate percentiles per year
  const result = [];
  for (let y = 0; y <= years; y++) {
    const valuesAtYear = netWorthMatrix.map((row) => row[y]).sort((a, b) => a - b);
    result.push({
      year: currentYear + y,
      median: Math.round(quantile(valuesAtYear, 0.5) * 100) / 100,
      p10: Math.round(quantile(valuesAtYear, 0.1) * 100) / 100,
      p90: Math.round(quantile(valuesAtYear, 0.9) * 100) / 100,
    });
  }

  return result;
}

/**
 * Formats a number as USD currency string.
 *
 * @param {number} amount - The number to format
 * @returns {string} Formatted USD string
 */
export function formatUSD(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculates total assets (non-debt accounts).
 *
 * @param {Array} accounts - Array of account objects
 * @returns {number} Total assets
 */
export function calculateAssets(accounts) {
  return Math.round(
    accounts
      .filter((a) => a.type !== 'debt')
      .reduce((sum, a) => sum + a.balance, 0) * 100
  ) / 100;
}

/**
 * Calculates total debt.
 *
 * @param {Array} accounts - Array of account objects
 * @returns {number} Total debt (positive number)
 */
export function calculateDebt(accounts) {
  return Math.round(
    Math.abs(
      accounts
        .filter((a) => a.type === 'debt')
        .reduce((sum, a) => sum + a.balance, 0)
    ) * 100
  ) / 100;
}

/**
 * Calculates net worth (assets - debt).
 *
 * @param {Array} accounts - Array of account objects
 * @returns {number} Net worth
 */
export function calculateNetWorth(accounts) {
  return Math.round(
    accounts.reduce((total, account) => total + account.balance, 0) * 100
  ) / 100;
}

/**
 * Calculates the total interest paid on debt accounts over N years.
 * Used internally by calculateInterestSaved.
 *
 * @param {Array} accounts - Array of account objects
 * @param {number} years - Number of years
 * @param {string} strategy - 'none' | 'avalanche' | 'snowball'
 * @param {number} extraPayment - Extra annual payment towards debt
 * @returns {number} Total interest paid (positive number)
 */
function simulateDebtInterest(accounts, years, strategy, extraPayment) {
  const debtAccounts = accounts
    .filter((a) => a.type === 'debt')
    .map((a) => ({ ...a, currentBalance: a.balance }));

  if (debtAccounts.length === 0) return 0;

  let totalInterest = 0;

  for (let y = 0; y < years; y++) {
    // 1. Accrue interest
    debtAccounts.forEach((debt) => {
      if (debt.currentBalance < 0) {
        const rate = debt.annualGrowthRate / 100;
        const interest = debt.currentBalance * rate; // negative
        totalInterest += Math.abs(interest);
        debt.currentBalance += interest; // becomes more negative
      }
    });

    // 2. Apply extra payments based on strategy
    if (strategy !== 'none' && extraPayment > 0) {
      const active = debtAccounts.filter((d) => d.currentBalance < 0);
      if (strategy === 'avalanche') {
        active.sort((a, b) => b.annualGrowthRate - a.annualGrowthRate);
      } else if (strategy === 'snowball') {
        active.sort((a, b) => Math.abs(a.currentBalance) - Math.abs(b.currentBalance));
      }

      let remaining = extraPayment;
      for (const debt of active) {
        if (remaining <= 0) break;
        const owed = Math.abs(debt.currentBalance);
        const payment = Math.min(remaining, owed);
        debt.currentBalance += payment;
        remaining -= payment;
      }
    }
  }

  return Math.round(totalInterest * 100) / 100;
}

/**
 * Calculates interest saved by using an optimized debt strategy vs no strategy.
 *
 * @param {Array} accounts - Array of account objects
 * @param {string} strategy - 'avalanche' | 'snowball'
 * @param {number} extraPayment - Extra annual payment towards debt
 * @param {number} years - Number of years to compare (default: 5)
 * @returns {number} Dollar amount saved (positive = savings)
 */
export function calculateInterestSaved(accounts, strategy, extraPayment, years = 5) {
  if (!strategy || strategy === 'none' || extraPayment <= 0) return 0;

  const baselineInterest = simulateDebtInterest(accounts, years, 'none', 0);
  const optimizedInterest = simulateDebtInterest(accounts, years, strategy, extraPayment);

  return Math.round((baselineInterest - optimizedInterest) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Optimised Debt Payoff (Avalanche) — month-by-month simulation
// ---------------------------------------------------------------------------

/**
 * Runs a month-by-month debt-payoff simulation.
 *
 * Each month:
 *   1. Accrue monthly interest on every remaining debt.
 *   2. Apply minimum payments to every debt.
 *   3. Apply the extra bucket to the target debt (determined by strategy sort).
 *   4. When a debt reaches $0 its minimum payment rolls into the extra bucket.
 *
 * @param {Array}  debts            - Debt account objects (balance < 0)
 * @param {number} extraMonthly     - Extra $ added on top of minimums each month
 * @param {string} strategy         - 'avalanche' (default) | 'snowball'
 * @param {number} maxMonths        - Safety cap (default 360 = 30 years)
 * @returns {{ months: number, totalInterest: number, schedule: Array }}
 */
function simulateMonthlyPayoff(debts, extraMonthly, strategy = 'avalanche', maxMonths = 360) {
  // Deep-copy so we don't mutate the caller's array
  const pool = debts.map((d) => ({
    name: d.name,
    balance: Math.abs(d.balance),                          // work with positive balances
    monthlyRate: (d.interestRate || d.annualGrowthRate || 0) / 100 / 12,
    minPayment: d.minimumPayment || 0,
  }));

  let totalInterest = 0;
  let month = 0;
  const schedule = [];  // optional month-by-month log

  while (pool.some((d) => d.balance > 0) && month < maxMonths) {
    month++;

    // 1. Accrue monthly interest
    pool.forEach((d) => {
      if (d.balance > 0) {
        const interest = d.balance * d.monthlyRate;
        d.balance += interest;
        totalInterest += interest;
      }
    });

    // 2. Apply minimum payments
    let freedMinimums = 0;
    pool.forEach((d) => {
      if (d.balance > 0) {
        const payment = Math.min(d.minPayment, d.balance);
        d.balance -= payment;
      } else if (d.minPayment > 0) {
        // Debt already paid off — its minimum rolls over
        freedMinimums += d.minPayment;
      }
    });

    // 3. Build extra bucket (extra monthly + freed minimums)
    let extra = extraMonthly + freedMinimums;

    // Sort active debts by strategy
    const active = pool.filter((d) => d.balance > 0);
    if (strategy === 'avalanche') {
      active.sort((a, b) => b.monthlyRate - a.monthlyRate);   // highest rate first
    } else {
      active.sort((a, b) => a.balance - b.balance);           // smallest balance first
    }

    // 4. Apply extra to target debts with rollover
    for (const debt of active) {
      if (extra <= 0) break;
      const payment = Math.min(extra, debt.balance);
      debt.balance -= payment;
      extra -= payment;
    }

    // Round balances to avoid floating-point dust
    pool.forEach((d) => {
      d.balance = Math.round(d.balance * 100) / 100;
    });

    schedule.push({
      month,
      remaining: pool.reduce((sum, d) => sum + d.balance, 0),
    });
  }

  return {
    months: month,
    totalInterest: Math.round(totalInterest * 100) / 100,
    schedule,
  };
}

/**
 * Compares an optimised (Avalanche) month-by-month debt payoff against a
 * baseline that only applies minimum payments (no extra).
 *
 * @param {Array}  accounts             - All account objects (non-debt are filtered out)
 * @param {number} extraMonthlyPayment  - Extra $ per month on top of minimums
 * @returns {{
 *   totalInterestSaved: number,
 *   monthsSaved: number,
 *   baselineMonths: number,
 *   optimizedMonths: number,
 *   baselineInterest: number,
 *   optimizedInterest: number,
 *   payoffSchedule: Array
 * }}
 */
export function getOptimizedPayoff(accounts, extraMonthlyPayment) {
  const debts = accounts.filter((a) => a.type === 'debt' && a.balance < 0);

  if (debts.length === 0 || extraMonthlyPayment <= 0) {
    return {
      totalInterestSaved: 0,
      monthsSaved: 0,
      baselineMonths: 0,
      optimizedMonths: 0,
      baselineInterest: 0,
      optimizedInterest: 0,
      payoffSchedule: [],
    };
  }

  // Baseline: minimum payments only, no extra, no strategic ordering
  const baseline = simulateMonthlyPayoff(debts, 0, 'avalanche');

  // Optimised: avalanche order + extra monthly payment
  const optimized = simulateMonthlyPayoff(debts, extraMonthlyPayment, 'avalanche');

  return {
    totalInterestSaved: Math.round((baseline.totalInterest - optimized.totalInterest) * 100) / 100,
    monthsSaved: baseline.months - optimized.months,
    baselineMonths: baseline.months,
    optimizedMonths: optimized.months,
    baselineInterest: baseline.totalInterest,
    optimizedInterest: optimized.totalInterest,
    payoffSchedule: optimized.schedule,
  };
}
