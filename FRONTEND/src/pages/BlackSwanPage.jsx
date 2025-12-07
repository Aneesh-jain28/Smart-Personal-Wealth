import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ShieldAlert, Zap, Clock, DollarSign, TrendingDown,
  AlertTriangle, Heart,
} from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import { fetchExchangeRates, convertAccountsToBase, CURRENCY_INFO, formatCurrencyAmount } from '../utils/currencyHelper.js';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts';

// ─── Scenario Presets ────────────────────────────────────────────────
const SHOCK_PRESETS = [
  { id: 'severe',   label: '2008 Financial Crisis',    marketDrop: -40, inflationSpike: 10, jobLossMonths: 6,  recoveryYears: 3 },
  { id: 'moderate', label: 'COVID-19 Crash (2020)',     marketDrop: -34, inflationSpike: 8,  jobLossMonths: 4,  recoveryYears: 1.5 },
  { id: 'extreme',  label: 'Great Depression (1929)',   marketDrop: -55, inflationSpike: 0,  jobLossMonths: 12, recoveryYears: 7 },
  { id: 'hyper',    label: 'Hyperinflation Spiral',     marketDrop: -20, inflationSpike: 25, jobLossMonths: 3,  recoveryYears: 4 },
  { id: 'custom',   label: 'Custom Scenario',           marketDrop: -40, inflationSpike: 10, jobLossMonths: 6,  recoveryYears: 3 },
];

// ─── Grade thresholds ────────────────────────────────────────────────
function getResilienceGrade(score) {
  if (score >= 90) return { grade: 'A+', label: 'Anti-Fragile',       color: 'emerald', desc: 'Your portfolio thrives under stress. You can buy the dip and come out stronger.' };
  if (score >= 75) return { grade: 'A',  label: 'Highly Resilient',   color: 'emerald', desc: 'You can weather severe storms with minimal forced selling.' };
  if (score >= 60) return { grade: 'B',  label: 'Resilient',          color: 'blue',    desc: 'You can survive most crises but may face some pressure.' };
  if (score >= 45) return { grade: 'C',  label: 'Fragile',            color: 'amber',   desc: 'Warning: a severe shock will force painful decisions.' };
  if (score >= 25) return { grade: 'D',  label: 'Very Fragile',       color: 'orange',  desc: 'Your portfolio has dangerous concentration risk and no buffer.' };
  return               { grade: 'F',  label: 'Critical',           color: 'red',     desc: 'Immediate action needed. You would not survive a major downturn.' };
}

// ─── Chart Tooltip ───────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, darkMode, baseCurrency }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={`rounded-lg shadow-lg border px-4 py-3 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <p className={`text-sm font-bold mb-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Month {label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{entry.name}:</span>
          <span className={`text-sm font-semibold font-mono ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            {formatCurrencyAmount(entry.value, baseCurrency)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// Main Page
// ═════════════════════════════════════════════════════════════════════
export default function BlackSwanPage() {
  const { darkMode } = useTheme();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [baseCurrency] = useState('USD');

  // Shock parameters
  const [presetId, setPresetId] = useState('severe');
  const [marketDrop, setMarketDrop] = useState(-40);
  const [inflationSpike, setInflationSpike] = useState(10);
  const [jobLossMonths, setJobLossMonths] = useState(6);
  const [recoveryYears, setRecoveryYears] = useState(3);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [dataReady, setDataReady] = useState(false);

  // Apply preset
  const applyPreset = (id) => {
    setPresetId(id);
    const p = SHOCK_PRESETS.find((s) => s.id === id);
    if (p && id !== 'custom') {
      setMarketDrop(p.marketDrop);
      setInflationSpike(p.inflationSpike);
      setJobLossMonths(p.jobLossMonths);
      setRecoveryYears(p.recoveryYears);
    }
  };

  // Fetch accounts and derive income/expenses from real data
  useEffect(() => {
    (async () => {
      try {
        const [finRes, ratesRes] = await Promise.all([
          axios.get('http://localhost:5000/api/financials'),
          fetchExchangeRates(),
        ]);
        if (finRes.data.success) {
          const raw = finRes.data.data.accounts || [];
          const converted = convertAccountsToBase(raw, baseCurrency, ratesRes);
          setAccounts(converted);

          // ── Derive monthly income & expenses from actual account data ──
          // Only set if the user hasn't saved custom values previously
          const savedExpenses = localStorage.getItem('spw_blackswan_expenses');
          const savedIncome = localStorage.getItem('spw_blackswan_income');

          if (savedExpenses && savedIncome) {
            setMonthlyExpenses(Number(savedExpenses));
            setMonthlyIncome(Number(savedIncome));
          } else {
            // Calculate from real account data
            const totalSavings = converted
              .filter((a) => a.type === 'savings')
              .reduce((s, a) => s + a.balance, 0);
            const totalInvestments = converted
              .filter((a) => a.type === 'investment')
              .reduce((s, a) => s + a.balance, 0);
            const totalDebt = converted
              .filter((a) => a.type === 'debt')
              .reduce((s, a) => s + Math.abs(a.balance), 0);
            const totalAssets = totalSavings + totalInvestments;
            const netWorth = totalAssets - totalDebt;

            // Heuristic: assume savings ~= 6 months of expenses (emergency fund)
            // → monthlyExpenses ≈ totalSavings / 6
            // Income estimated as expenses × 2 (moderate savings rate)
            // Round to nearest 500 for clean UI values
            const round500 = (v) => Math.round(v / 500) * 500;

            let estExpenses;
            if (totalSavings > 0) {
              estExpenses = round500(totalSavings / 6);
            } else if (totalAssets > 0) {
              estExpenses = round500(totalAssets / 12);
            } else {
              estExpenses = round500(Math.max(netWorth, 1000) / 12);
            }
            // Clamp to reasonable bounds
            estExpenses = Math.max(500, Math.min(estExpenses, 50000));

            const estIncome = Math.max(1000, round500(estExpenses * 2));

            setMonthlyExpenses(estExpenses);
            setMonthlyIncome(estIncome);
          }
          setDataReady(true);
        }
      } catch (err) {
        console.error('Failed to load financial data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Persist user-edited income/expenses so they survive page reloads
  const updateMonthlyIncome = (val) => {
    setMonthlyIncome(val);
    localStorage.setItem('spw_blackswan_income', String(val));
  };
  const updateMonthlyExpenses = (val) => {
    setMonthlyExpenses(val);
    localStorage.setItem('spw_blackswan_expenses', String(val));
  };

  // ─── Simulation Engine (auto-runs when data is ready) ─────────────
  const simulation = useMemo(() => {
    if (!dataReady || accounts.length === 0) return null;

    // ── Classify every account into buckets ──
    // "liquid" = savings accounts (can be spent without selling at a loss)
    // "market" = investment accounts (subject to market crash)
    // "debt"   = liabilities
    const liquidAccounts = accounts.filter((a) => a.type === 'savings');
    const marketAccounts = accounts.filter((a) => a.type === 'investment');
    const debtAccounts   = accounts.filter((a) => a.type === 'debt');

    // Starting balances
    let liquidBalance      = liquidAccounts.reduce((s, a) => s + a.balance, 0);
    let marketBalance      = marketAccounts.reduce((s, a) => s + a.balance, 0);
    let debtBalance        = debtAccounts.reduce((s, a) => s + Math.abs(a.balance), 0);

    // If user has NO market investments, the crash still matters because:
    // - Savings interest rates drop during recessions
    // - Inflation eats purchasing power
    // - Job loss still happens
    // So the simulation is always meaningful.

    const startingLiquid     = liquidBalance;
    const startingMarket     = marketBalance;
    const totalAssets        = liquidBalance + marketBalance;
    const startingNetWorth   = totalAssets - debtBalance;

    // Monthly rates
    const totalMonths          = Math.max(Math.round(recoveryYears * 12), 36);
    const monthlyInflation     = inflationSpike / 100 / 12;
    // Savings interest is slashed during crisis (central banks cut, but real returns go negative)
    const avgSavingsRate       = liquidAccounts.length > 0
      ? liquidAccounts.reduce((s, a) => s + (a.annualGrowthRate || 0), 0) / liquidAccounts.length
      : 0;
    const crisisSavingsMonthly = Math.max((avgSavingsRate * 0.25) / 100 / 12, 0); // savings rate drops to 25% of normal
    const normalSavingsMonthly = avgSavingsRate / 100 / 12;

    // Market recovery: how fast investments recover from the crash
    const crashMultiplier      = 1 + marketDrop / 100; // e.g. 0.60 for -40%
    const monthlyRecoveryRate  = recoveryYears > 0
      ? Math.pow(1 / crashMultiplier, 1 / (recoveryYears * 12)) - 1
      : 0.005;

    // Debt interest
    const avgDebtMonthlyRate = debtAccounts.length > 0
      ? debtAccounts.reduce((s, d) => s + (d.annualGrowthRate || d.interestRate || 0), 0) / debtAccounts.length / 100 / 12
      : 0;

    const timeline           = [];
    let forcedSellTotal      = 0;
    let firstForcedSellMonth = null;
    let liquidDepletedMonth  = null;
    let currentExpenses      = monthlyExpenses;

    for (let m = 0; m <= totalMonths; m++) {
      if (m === 0) {
        timeline.push({
          month: 0,
          liquid: Math.round(liquidBalance),
          investments: Math.round(marketBalance),
          netWorth: Math.round(liquidBalance + marketBalance - debtBalance),
          expenses: Math.round(currentExpenses),
          forcedSell: 0,
          event: 'Start',
        });
        continue;
      }

      // ── Month 1: SYSTEMIC SHOCK ──
      if (m === 1) {
        // Market investments crash instantly
        marketBalance = marketBalance * crashMultiplier;
      }

      // ── Inflation pressure on expenses (first 24 months of crisis) ──
      if (m <= 24) {
        currentExpenses = currentExpenses * (1 + monthlyInflation);
      }

      // ── Growth / recovery ──
      if (m > 1) {
        // Market investments slowly recover
        marketBalance = marketBalance * (1 + monthlyRecoveryRate);
      }
      // Savings earn reduced interest during crisis (first 24 months), then normal
      const savingsGrowth = m <= 24 ? crisisSavingsMonthly : normalSavingsMonthly;
      if (liquidBalance > 0) {
        liquidBalance = liquidBalance * (1 + savingsGrowth);
      }

      // Debt continues accruing interest
      if (debtBalance > 0) {
        debtBalance = debtBalance * (1 + avgDebtMonthlyRate);
      }

      // ── Income (0 during job loss) ──
      const income = m <= jobLossMonths ? 0 : monthlyIncome;

      // ── Monthly cash flow ──
      const netCashFlow = income - currentExpenses;
      liquidBalance += netCashFlow;

      // ── If liquid goes negative → forced selling of investments ──
      let forcedSell = 0;
      if (liquidBalance < 0) {
        const deficit = Math.abs(liquidBalance);
        if (marketBalance > 0) {
          const sellAmount = Math.min(deficit, marketBalance);
          marketBalance -= sellAmount;
          liquidBalance += sellAmount;
          forcedSellTotal += sellAmount;
          forcedSell = sellAmount;
          if (firstForcedSellMonth === null) firstForcedSellMonth = m;
        }
        // If still negative, user is truly bankrupt
        if (liquidBalance < 0 && liquidDepletedMonth === null) {
          liquidDepletedMonth = m;
        }
      }

      const netWorth = liquidBalance + marketBalance - debtBalance;

      timeline.push({
        month: m,
        liquid: Math.round(liquidBalance),
        investments: Math.round(marketBalance),
        netWorth: Math.round(netWorth),
        expenses: Math.round(currentExpenses),
        forcedSell: forcedSell > 0 ? Math.round(forcedSell) : 0,
        event:
          m === 1 ? `Crash: ${marketDrop}% market drop` :
          m === jobLossMonths + 1 && jobLossMonths > 0 ? 'Income resumes' :
          m <= jobLossMonths ? 'No income (job loss)' :
          '',
      });
    }

    // Survival analysis
    const survivalMonths = firstForcedSellMonth ? firstForcedSellMonth - 1 : totalMonths;

    // ── Resilience Score (0-100) ──
    // The scoring adapts based on what the user actually has.

    // 1. Liquid Runway (40 pts): How many months can cash cover expenses during job loss?
    const cashRunwayMonths = monthlyExpenses > 0 ? startingLiquid / monthlyExpenses : 999;
    const runwayTarget = Math.max(jobLossMonths, 6); // need at least 6 months or job-loss duration
    const runwayScore = Math.min((cashRunwayMonths / runwayTarget) * 40, 40);

    // 2. Net Worth Recovery (30 pts): Does net worth recover by end of simulation?
    const endNetWorth = timeline[timeline.length - 1].netWorth;
    const recoveryRatio = startingNetWorth > 0 ? Math.max(endNetWorth / startingNetWorth, 0) : (endNetWorth >= 0 ? 1 : 0);
    const recoveryScore = Math.min(recoveryRatio * 30, 30);

    // 3. Forced selling avoidance (20 pts)
    const sellPenalty = totalAssets > 0 ? forcedSellTotal / totalAssets : 0;
    const sellScore = Math.max((1 - sellPenalty) * 20, 0);

    // 4. Financial structure (10 pts)
    let structureScore = 0;
    if (startingLiquid >= monthlyExpenses * 6) structureScore += 3;     // 6-month emergency fund
    else if (startingLiquid >= monthlyExpenses * 3) structureScore += 1; // 3-month minimum
    if (debtBalance === 0) structureScore += 3;                          // debt-free bonus
    else if (debtBalance < totalAssets * 0.3) structureScore += 1;       // manageable debt
    if (startingMarket > 0) structureScore += 2;                         // has investments
    if (liquidAccounts.length + marketAccounts.length >= 2) structureScore += 2; // diversified accounts

    const totalScore = Math.round(Math.max(0, Math.min(100, runwayScore + recoveryScore + sellScore + structureScore)));

    const netWorthLoss = startingNetWorth - endNetWorth;
    const worstNetWorth = Math.min(...timeline.map((t) => t.netWorth));
    const worstMonth = timeline.find((t) => t.netWorth === worstNetWorth)?.month || 0;

    const scoreBreakdown = [
      { category: 'Liquid Runway', score: Math.round(runwayScore), max: 40, color: '#3b82f6' },
      { category: 'Net Worth Recovery', score: Math.round(recoveryScore), max: 30, color: '#10b981' },
      { category: 'Sell Avoidance', score: Math.round(sellScore), max: 20, color: '#f59e0b' },
      { category: 'Financial Structure', score: Math.round(structureScore), max: 10, color: '#8b5cf6' },
    ];

    return {
      timeline,
      totalScore,
      grade: getResilienceGrade(totalScore),
      survivalMonths,
      firstForcedSellMonth,
      liquidDepletedMonth,
      forcedSellTotal,
      startingNetWorth,
      endNetWorth,
      netWorthLoss,
      worstNetWorth,
      worstMonth,
      startingLiquid,
      startingInvestment: startingMarket,
      scoreBreakdown,
      // Extra context for recommendations
      hasMarketExposure: startingMarket > 0,
      cashRunwayMonths: Math.round(cashRunwayMonths),
      debtToAssetRatio: totalAssets > 0 ? Math.round((debtBalance / totalAssets) * 100) : 0,
    };
  }, [dataReady, accounts, marketDrop, inflationSpike, jobLossMonths, recoveryYears, monthlyExpenses, monthlyIncome]);

  const gridColor = darkMode ? '#334155' : '#e2e8f0';
  const tickColor = darkMode ? '#94a3b8' : '#64748b';
  const axisColor = darkMode ? '#475569' : '#cbd5e1';
  const formatShort = (v) => {
    const sym = (CURRENCY_INFO[baseCurrency] || CURRENCY_INFO.USD).symbol;
    if (Math.abs(v) >= 1e6) return `${sym}${(v / 1e6).toFixed(1)}M`;
    if (Math.abs(v) >= 1e3) return `${sym}${(v / 1e3).toFixed(0)}k`;
    return `${sym}${v}`;
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const gradeColors = {
    emerald: { bg: darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50', ring: 'ring-emerald-500', text: 'text-emerald-400', border: darkMode ? 'border-emerald-500/20' : 'border-emerald-200' },
    blue:    { bg: darkMode ? 'bg-blue-500/10' : 'bg-blue-50',       ring: 'ring-blue-500',    text: 'text-blue-400',    border: darkMode ? 'border-blue-500/20' : 'border-blue-200' },
    amber:   { bg: darkMode ? 'bg-amber-500/10' : 'bg-amber-50',     ring: 'ring-amber-500',   text: 'text-amber-400',   border: darkMode ? 'border-amber-500/20' : 'border-amber-200' },
    orange:  { bg: darkMode ? 'bg-orange-500/10' : 'bg-orange-50',    ring: 'ring-orange-500',  text: 'text-orange-400',  border: darkMode ? 'border-orange-500/20' : 'border-orange-200' },
    red:     { bg: darkMode ? 'bg-red-500/10' : 'bg-red-50',          ring: 'ring-red-500',     text: 'text-red-400',     border: darkMode ? 'border-red-500/20' : 'border-red-200' },
  };

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-10 border-b backdrop-blur-sm ${darkMode ? 'bg-slate-900/80 border-slate-700/50' : 'bg-white/80 border-slate-200'}`}>
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className={`p-2 rounded-lg transition ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-red-500/15' : 'bg-red-50'}`}>
                <ShieldAlert className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h1 className="font-bold text-sm leading-tight">Black Swan Resilience Score</h1>
                <p className={`text-[10px] leading-tight ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Stress Test &middot; Tail-risk survival analysis</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {/* ── Configuration ── */}
        <section className={`rounded-xl p-6 ${darkMode ? 'bg-slate-800 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? 'bg-red-500/10' : 'bg-red-50'}`}>
                <Zap className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Configure Shock Scenario</h2>
                <p className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Select a historical crisis or build your own worst-case scenario
                </p>
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 mb-5">
            {SHOCK_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition border ${
                  presetId === p.id
                    ? darkMode
                      ? 'bg-red-500/15 border-red-500/30 text-red-400'
                      : 'bg-red-50 border-red-200 text-red-700'
                    : darkMode
                      ? 'bg-slate-700/50 border-slate-600/50 text-slate-400 hover:border-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Account Data Summary */}
          {dataReady && accounts.length > 0 && (
            <div className={`rounded-lg p-3 mb-1 flex flex-wrap gap-4 text-[11px] ${darkMode ? 'bg-slate-700/30 border border-slate-700/50' : 'bg-slate-50 border border-slate-200'}`}>
              <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>Your accounts:</span>
              {(() => {
                const sym = (CURRENCY_INFO[baseCurrency] || CURRENCY_INFO.USD).symbol;
                const totalSavings = accounts.filter((a) => a.type === 'savings').reduce((s, a) => s + a.balance, 0);
                const totalInvestments = accounts.filter((a) => a.type === 'investment').reduce((s, a) => s + a.balance, 0);
                const totalDebt = accounts.filter((a) => a.type === 'debt').reduce((s, a) => s + Math.abs(a.balance), 0);
                return (
                  <>
                    <span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>Savings: {sym}{totalSavings.toLocaleString()}</span>
                    <span className={darkMode ? 'text-emerald-400' : 'text-emerald-600'}>Investments: {sym}{totalInvestments.toLocaleString()}</span>
                    {totalDebt > 0 && <span className={darkMode ? 'text-red-400' : 'text-red-600'}>Debt: {sym}{totalDebt.toLocaleString()}</span>}
                  </>
                );
              })()}
            </div>
          )}

          {/* Parameters Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Market Drop */}
            <div>
              <label className={`block text-[10px] font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Market Crash</label>
              <div className="relative">
                <input type="number" max="0" step="5" value={marketDrop}
                  onChange={(e) => { setMarketDrop(Number(e.target.value)); setPresetId('custom'); }}
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-mono ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                />
                <span className={`absolute right-2.5 top-2.5 text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>%</span>
              </div>
            </div>

            {/* Inflation Spike */}
            <div>
              <label className={`block text-[10px] font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Inflation Spike</label>
              <div className="relative">
                <input type="number" min="0" step="1" value={inflationSpike}
                  onChange={(e) => { setInflationSpike(Number(e.target.value)); setPresetId('custom'); }}
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-mono ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                />
                <span className={`absolute right-2.5 top-2.5 text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>%/yr</span>
              </div>
            </div>

            {/* Job Loss Duration */}
            <div>
              <label className={`block text-[10px] font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Job Loss</label>
              <div className="relative">
                <input type="number" min="0" step="1" value={jobLossMonths}
                  onChange={(e) => { setJobLossMonths(Number(e.target.value)); setPresetId('custom'); }}
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-mono ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                />
                <span className={`absolute right-2.5 top-2.5 text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>mo</span>
              </div>
            </div>

            {/* Recovery Period */}
            <div>
              <label className={`block text-[10px] font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Recovery</label>
              <div className="relative">
                <input type="number" min="0.5" step="0.5" value={recoveryYears}
                  onChange={(e) => { setRecoveryYears(Number(e.target.value)); setPresetId('custom'); }}
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-mono ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                />
                <span className={`absolute right-2.5 top-2.5 text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>yrs</span>
              </div>
            </div>

            {/* Monthly Income */}
            <div>
              <label className={`block text-[10px] font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Monthly Income</label>
              <div className="relative">
                <span className={`absolute left-2.5 top-2 text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{(CURRENCY_INFO[baseCurrency] || CURRENCY_INFO.USD).symbol}</span>
                <input type="number" min="0" step="500" value={monthlyIncome}
                  onChange={(e) => updateMonthlyIncome(Number(e.target.value))}
                  className={`w-full pl-6 pr-3 py-2 rounded-lg border text-sm font-mono ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                />
              </div>
              <p className={`text-[9px] mt-0.5 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>Estimated from your accounts</p>
            </div>

            {/* Monthly Expenses */}
            <div>
              <label className={`block text-[10px] font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Monthly Expenses</label>
              <div className="relative">
                <span className={`absolute left-2.5 top-2 text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{(CURRENCY_INFO[baseCurrency] || CURRENCY_INFO.USD).symbol}</span>
                <input type="number" min="0" step="500" value={monthlyExpenses}
                  onChange={(e) => updateMonthlyExpenses(Number(e.target.value))}
                  className={`w-full pl-6 pr-3 py-2 rounded-lg border text-sm font-mono ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                />
              </div>
              <p className={`text-[9px] mt-0.5 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>Estimated from your accounts</p>
            </div>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2 mt-5">
            {dataReady && accounts.length > 0 && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium ${
                darkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live — results update as you change parameters
              </span>
            )}
          </div>
        </section>

        {/* ── Results ── */}
        {simulation && (
          <>
            {/* ── Giant Score Card ── */}
            <section className={`rounded-xl overflow-hidden border ${gradeColors[simulation.grade.color]?.border || ''}`}>
              <div className={`p-8 text-center ${gradeColors[simulation.grade.color]?.bg || ''}`}>
                {/* Grade Ring */}
                <div className="flex justify-center mb-4">
                  <div className={`w-28 h-28 rounded-full flex items-center justify-center ring-4 ${gradeColors[simulation.grade.color]?.ring || ''} bg-opacity-20 ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                    <div>
                      <p className={`text-4xl font-extrabold font-mono ${gradeColors[simulation.grade.color]?.text || ''}`}>{simulation.grade.grade}</p>
                      <p className={`text-lg font-bold font-mono ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{simulation.totalScore}</p>
                    </div>
                  </div>
                </div>
                <h3 className={`text-xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{simulation.grade.label}</h3>
                <p className={`text-sm max-w-lg mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{simulation.grade.desc}</p>
              </div>

              {/* Score Breakdown Bar */}
              <div className={`p-5 ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Score Breakdown</p>
                <div className="space-y-2.5">
                  {simulation.scoreBreakdown.map((item) => (
                    <div key={item.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{item.category}</span>
                        <span className={`text-xs font-bold font-mono ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.score}/{item.max}</span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${(item.score / item.max) * 100}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Key Metrics ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  icon: Clock,
                  label: 'Survival Clock',
                  value: simulation.survivalMonths >= simulation.timeline.length - 1
                    ? `${simulation.timeline.length - 1}+ mo`
                    : `${simulation.survivalMonths} mo`,
                  sub: simulation.firstForcedSellMonth
                    ? `Forced selling starts month ${simulation.firstForcedSellMonth}`
                    : 'No forced selling required',
                  accent: simulation.survivalMonths >= 12 ? 'emerald' : simulation.survivalMonths >= 6 ? 'amber' : 'red',
                },
                {
                  icon: TrendingDown,
                  label: 'Worst Drawdown',
                  value: formatCurrencyAmount(simulation.worstNetWorth, baseCurrency),
                  sub: `Hits bottom at month ${simulation.worstMonth}`,
                  accent: 'red',
                },
                {
                  icon: DollarSign,
                  label: 'Forced Selling',
                  value: formatCurrencyAmount(simulation.forcedSellTotal, baseCurrency),
                  sub: simulation.forcedSellTotal > 0
                    ? `${Math.round(simulation.forcedSellTotal / Math.max(simulation.startingInvestment, 1) * 100)}% of investments liquidated`
                    : 'Portfolio remained intact',
                  accent: simulation.forcedSellTotal === 0 ? 'emerald' : 'red',
                },
                {
                  icon: Heart,
                  label: `Net Worth After ${recoveryYears}yr`,
                  value: formatCurrencyAmount(simulation.endNetWorth, baseCurrency),
                  sub: simulation.netWorthLoss > 0
                    ? `Down ${formatCurrencyAmount(simulation.netWorthLoss, baseCurrency)} from start`
                    : `Up ${formatCurrencyAmount(Math.abs(simulation.netWorthLoss), baseCurrency)} from start`,
                  accent: simulation.netWorthLoss <= 0 ? 'emerald' : 'amber',
                },
              ].map((card, i) => {
                const colors = {
                  emerald: { dot: 'bg-emerald-400', val: darkMode ? 'text-emerald-400' : 'text-emerald-600', border: darkMode ? 'border-emerald-500/20' : 'border-emerald-200' },
                  amber:   { dot: 'bg-amber-400',   val: darkMode ? 'text-amber-400'   : 'text-amber-600',   border: darkMode ? 'border-amber-500/20'   : 'border-amber-200' },
                  red:     { dot: 'bg-red-400',      val: darkMode ? 'text-red-400'     : 'text-red-600',     border: darkMode ? 'border-red-500/20'     : 'border-red-200' },
                };
                const c = colors[card.accent];
                const Icon = card.icon;
                return (
                  <div key={i} className={`border rounded-lg p-4 ${darkMode ? `bg-slate-800/50 ${c.border}` : `bg-white ${c.border}`}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                      <p className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{card.label}</p>
                    </div>
                    <p className={`text-xl font-bold font-mono ${c.val}`}>{card.value}</p>
                    <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{card.sub}</p>
                  </div>
                );
              })}
            </div>

            {/* ── Net Worth Timeline Chart ── */}
            <section className={`rounded-xl p-6 ${darkMode ? 'bg-slate-800 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`}>
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? 'bg-red-500/10' : 'bg-red-50'}`}>
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Stress Test Timeline</h3>
                  <p className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Month-by-month net worth, liquid buffer & investment value during the crisis
                  </p>
                </div>
              </div>

              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={simulation.timeline} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 11 }} axisLine={{ stroke: axisColor }} tickLine={{ stroke: axisColor }} />
                    <YAxis tickFormatter={formatShort} tick={{ fill: tickColor, fontSize: 11 }} axisLine={{ stroke: axisColor }} tickLine={{ stroke: axisColor }} width={65} />
                    <Tooltip content={<ChartTooltip darkMode={darkMode} baseCurrency={baseCurrency} />} />

                    {/* Crash marker */}
                    <ReferenceLine x={1} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'CRASH', fill: '#ef4444', fontSize: 10, position: 'top' }} />
                    {/* Job returns marker */}
                    {jobLossMonths > 0 && (
                      <ReferenceLine x={jobLossMonths} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Job Returns', fill: '#f59e0b', fontSize: 10, position: 'top' }} />
                    )}

                    <Area type="monotone" dataKey="investments" name="Investments" stroke="#f43f5e" strokeWidth={2} fill="#f43f5e" fillOpacity={0.06} />
                    <Area type="monotone" dataKey="liquid" name="Liquid Buffer" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.08} />
                    <Area type="monotone" dataKey="netWorth" name="Net Worth" stroke="#10b981" strokeWidth={2.5} fill="#10b981" fillOpacity={0.05} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* ── Event Log Table ── */}
            <section className={`rounded-xl p-6 ${darkMode ? 'bg-slate-800 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`}>
              <h3 className={`text-sm font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Critical Events Log</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                      <th className={`text-left py-2 px-3 text-[11px] font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Month</th>
                      <th className={`text-left py-2 px-3 text-[11px] font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Event</th>
                      <th className={`text-right py-2 px-3 text-[11px] font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Liquid</th>
                      <th className={`text-right py-2 px-3 text-[11px] font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Investments</th>
                      <th className={`text-right py-2 px-3 text-[11px] font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Net Worth</th>
                      <th className={`text-right py-2 px-3 text-[11px] font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Forced Sell</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulation.timeline
                      .filter((row) => row.month === 0 || row.event || row.forcedSell > 0 || row.month % 6 === 0)
                      .map((row) => (
                        <tr key={row.month} className={`border-b transition-colors ${
                          row.event ? (darkMode ? 'bg-red-500/5' : 'bg-red-50/50') : ''
                        } ${darkMode ? 'border-slate-700/50 hover:bg-slate-700/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                          <td className={`py-2 px-3 font-medium font-mono ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{row.month}</td>
                          <td className="py-2 px-3">
                            {row.event ? (
                              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                row.event.includes('crash') || row.event.includes('Crash')
                                  ? 'bg-red-500/10 text-red-400'
                                  : row.event.includes('resumes')
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : row.event.includes('No income')
                                      ? 'bg-amber-500/10 text-amber-400'
                                      : darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                              }`}>
                                <AlertTriangle className="w-3 h-3" /> {row.event}
                              </span>
                            ) : (
                              <span className={`text-xs ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>—</span>
                            )}
                          </td>
                          <td className={`py-2 px-3 text-right font-mono ${row.liquid < 0 ? 'text-red-400' : darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            {formatCurrencyAmount(row.liquid, baseCurrency)}
                          </td>
                          <td className={`py-2 px-3 text-right font-mono ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {formatCurrencyAmount(row.investments, baseCurrency)}
                          </td>
                          <td className={`py-2 px-3 text-right font-mono font-semibold ${
                            row.netWorth < 0 ? 'text-red-400' : darkMode ? 'text-emerald-400' : 'text-emerald-600'
                          }`}>
                            {formatCurrencyAmount(row.netWorth, baseCurrency)}
                          </td>
                          <td className={`py-2 px-3 text-right font-mono ${row.forcedSell > 0 ? 'text-red-400 font-semibold' : darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                            {row.forcedSell > 0 ? formatCurrencyAmount(row.forcedSell, baseCurrency) : '—'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Recommendations ── */}
            <section className={`rounded-xl p-6 border ${darkMode ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                  <ShieldAlert className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Resilience Recommendations</h3>
                  <p className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Based on your stress test results</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  ...(simulation.survivalMonths < 6 ? [{
                    title: 'Build Emergency Fund',
                    desc: `Your liquid buffer only lasts ${simulation.survivalMonths} months. Aim for at least 6–12 months of expenses (${formatCurrencyAmount(monthlyExpenses * 6, baseCurrency)}+) in cash or money market funds.`,
                    urgency: 'high',
                  }] : []),
                  ...(simulation.forcedSellTotal > 0 ? [{
                    title: 'Reduce Forced-Selling Risk',
                    desc: `You'd be forced to sell ${formatCurrencyAmount(simulation.forcedSellTotal, baseCurrency)} of investments at the worst possible time. Increase your liquid reserve to avoid this.`,
                    urgency: 'high',
                  }] : []),
                  ...(!simulation.hasMarketExposure ? [{
                    title: 'Consider Long-Term Investments',
                    desc: 'You have no market investments. While this protects you from crashes, it also means zero growth beyond savings interest. Consider index funds or PPF/FD for long-term wealth building.',
                    urgency: 'medium',
                  }] : []),
                  ...(simulation.hasMarketExposure && simulation.startingLiquid < monthlyExpenses * 3 ? [{
                    title: 'Rebalance: Cash vs Investments',
                    desc: 'Your ratio of liquid assets to investments is too low. Consider moving 10-15% of investments to a high-yield savings account.',
                    urgency: 'medium',
                  }] : []),
                  ...(simulation.debtToAssetRatio > 50 ? [{
                    title: 'High Debt-to-Asset Ratio',
                    desc: `Your debt is ${simulation.debtToAssetRatio}% of your total assets. In a crisis, interest compounds against you. Prioritize paying down high-interest debt.`,
                    urgency: 'high',
                  }] : []),
                  ...(simulation.cashRunwayMonths >= 12 ? [{
                    title: 'Strong Cash Position',
                    desc: `Your ${simulation.cashRunwayMonths}-month cash runway exceeds the recommended 6-month minimum. This gives you significant crisis resilience.`,
                    urgency: 'positive',
                  }] : []),
                  {
                    title: 'Diversify Income Streams',
                    desc: 'A single income source creates a single point of failure. Consider side projects, dividends, or rental income to reduce job-loss impact.',
                    urgency: 'low',
                  },
                  {
                    title: 'Review Insurance Coverage',
                    desc: 'Ensure you have adequate health, disability, and term life insurance. These are your financial safety nets during personal black swans.',
                    urgency: 'low',
                  },
                  ...(simulation.totalScore >= 75 ? [{
                    title: 'You\'re Well-Protected',
                    desc: 'Your portfolio shows strong anti-fragile characteristics. Consider using crises as buying opportunities with a pre-defined "crash bucket" strategy.',
                    urgency: 'positive',
                  }] : []),
                ].map((rec, i) => {
                  const urgencyStyles = {
                    high:     { bg: darkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200', dot: 'bg-red-400' },
                    medium:   { bg: darkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
                    low:      { bg: darkMode ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200', dot: 'bg-blue-400' },
                    positive: { bg: darkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-400' },
                  };
                  const s = urgencyStyles[rec.urgency];
                  return (
                    <div key={i} className={`rounded-lg p-4 border ${s.bg}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{rec.title}</p>
                      </div>
                      <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{rec.desc}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Disclaimer */}
            <p className={`text-[10px] text-center pb-4 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
              This simulation is for educational purposes only. It uses simplified models and does not constitute financial advice. Actual market behavior may differ significantly.
            </p>
          </>
        )}

        {/* Empty state */}
        {accounts.length === 0 && !loading && (
          <div className={`rounded-xl p-12 text-center border-2 border-dashed ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-300 bg-slate-50'}`}>
            <ShieldAlert className={`w-10 h-10 mx-auto mb-3 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
            <p className={`font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No accounts found</p>
            <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Add accounts on the dashboard first to run the stress test.</p>
            <Link to="/accounts" className="inline-block mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition">
              Add Accounts
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
