import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, TrendingUp, ArrowRightLeft, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import { fetchExchangeRates, convertAccountsToBase, CURRENCY_INFO, formatCurrencyAmount } from '../utils/currencyHelper.js';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

// ─── State / Region Tax & COL Data ───────────────────────────────────
// taxRate = top marginal state income tax rate (%)
// col     = cost-of-living index (1.00 = US national average)

const STATE_GROUPS = [
  {
    country: '🇺🇸 United States',
    states: [
      { code: 'AL', name: 'Alabama',        taxRate: 5.0,  col: 0.87 },
      { code: 'AK', name: 'Alaska',         taxRate: 0,    col: 1.27 },
      { code: 'AZ', name: 'Arizona',        taxRate: 2.5,  col: 0.97 },
      { code: 'AR', name: 'Arkansas',       taxRate: 4.4,  col: 0.86 },
      { code: 'CA', name: 'California',     taxRate: 13.3, col: 1.42 },
      { code: 'CO', name: 'Colorado',       taxRate: 4.4,  col: 1.05 },
      { code: 'CT', name: 'Connecticut',    taxRate: 6.99, col: 1.21 },
      { code: 'DE', name: 'Delaware',       taxRate: 6.6,  col: 1.00 },
      { code: 'FL', name: 'Florida',        taxRate: 0,    col: 1.00 },
      { code: 'GA', name: 'Georgia',        taxRate: 5.49, col: 0.93 },
      { code: 'HI', name: 'Hawaii',         taxRate: 11.0, col: 1.70 },
      { code: 'ID', name: 'Idaho',          taxRate: 5.8,  col: 0.95 },
      { code: 'IL', name: 'Illinois',       taxRate: 4.95, col: 0.95 },
      { code: 'IN', name: 'Indiana',        taxRate: 3.05, col: 0.90 },
      { code: 'IA', name: 'Iowa',           taxRate: 5.7,  col: 0.89 },
      { code: 'KS', name: 'Kansas',         taxRate: 5.7,  col: 0.89 },
      { code: 'KY', name: 'Kentucky',       taxRate: 4.0,  col: 0.87 },
      { code: 'LA', name: 'Louisiana',      taxRate: 4.25, col: 0.91 },
      { code: 'ME', name: 'Maine',          taxRate: 7.15, col: 1.02 },
      { code: 'MD', name: 'Maryland',       taxRate: 5.75, col: 1.09 },
      { code: 'MA', name: 'Massachusetts',  taxRate: 5.0,  col: 1.35 },
      { code: 'MI', name: 'Michigan',       taxRate: 4.05, col: 0.90 },
      { code: 'MN', name: 'Minnesota',      taxRate: 9.85, col: 0.97 },
      { code: 'MS', name: 'Mississippi',    taxRate: 5.0,  col: 0.84 },
      { code: 'MO', name: 'Missouri',       taxRate: 4.95, col: 0.88 },
      { code: 'MT', name: 'Montana',        taxRate: 6.75, col: 0.96 },
      { code: 'NE', name: 'Nebraska',       taxRate: 5.84, col: 0.91 },
      { code: 'NV', name: 'Nevada',         taxRate: 0,    col: 1.00 },
      { code: 'NH', name: 'New Hampshire',  taxRate: 0,    col: 1.12 },
      { code: 'NJ', name: 'New Jersey',     taxRate: 10.75,col: 1.21 },
      { code: 'NM', name: 'New Mexico',     taxRate: 5.9,  col: 0.93 },
      { code: 'NY', name: 'New York',       taxRate: 10.9, col: 1.39 },
      { code: 'NC', name: 'North Carolina', taxRate: 4.5,  col: 0.95 },
      { code: 'ND', name: 'North Dakota',   taxRate: 1.95, col: 0.91 },
      { code: 'OH', name: 'Ohio',           taxRate: 3.5,  col: 0.90 },
      { code: 'OK', name: 'Oklahoma',       taxRate: 4.75, col: 0.87 },
      { code: 'OR', name: 'Oregon',         taxRate: 9.9,  col: 1.10 },
      { code: 'PA', name: 'Pennsylvania',   taxRate: 3.07, col: 0.97 },
      { code: 'RI', name: 'Rhode Island',   taxRate: 5.99, col: 1.05 },
      { code: 'SC', name: 'South Carolina', taxRate: 6.4,  col: 0.95 },
      { code: 'SD', name: 'South Dakota',   taxRate: 0,    col: 0.93 },
      { code: 'TN', name: 'Tennessee',      taxRate: 0,    col: 0.90 },
      { code: 'TX', name: 'Texas',          taxRate: 0,    col: 0.93 },
      { code: 'UT', name: 'Utah',           taxRate: 4.65, col: 0.97 },
      { code: 'VT', name: 'Vermont',        taxRate: 8.75, col: 1.07 },
      { code: 'VA', name: 'Virginia',       taxRate: 5.75, col: 1.04 },
      { code: 'WA', name: 'Washington',     taxRate: 0,    col: 1.10 },
      { code: 'WV', name: 'West Virginia',  taxRate: 5.12, col: 0.84 },
      { code: 'WI', name: 'Wisconsin',      taxRate: 7.65, col: 0.93 },
      { code: 'WY', name: 'Wyoming',        taxRate: 0,    col: 0.95 },
    ],
  },
  {
    country: '🇮🇳 India',
    states: [
      { code: 'IN-AP', name: 'Andhra Pradesh',     taxRate: 30.0, col: 0.35 },
      { code: 'IN-AR', name: 'Arunachal Pradesh',   taxRate: 30.0, col: 0.38 },
      { code: 'IN-AS', name: 'Assam',               taxRate: 30.0, col: 0.34 },
      { code: 'IN-BR', name: 'Bihar',               taxRate: 30.0, col: 0.30 },
      { code: 'IN-CT', name: 'Chhattisgarh',        taxRate: 30.0, col: 0.31 },
      { code: 'IN-DL', name: 'Delhi',               taxRate: 30.0, col: 0.45 },
      { code: 'IN-GA', name: 'Goa',                 taxRate: 30.0, col: 0.42 },
      { code: 'IN-GJ', name: 'Gujarat',             taxRate: 30.0, col: 0.36 },
      { code: 'IN-HR', name: 'Haryana',             taxRate: 30.0, col: 0.38 },
      { code: 'IN-HP', name: 'Himachal Pradesh',    taxRate: 30.0, col: 0.36 },
      { code: 'IN-JK', name: 'Jammu & Kashmir',     taxRate: 30.0, col: 0.37 },
      { code: 'IN-JH', name: 'Jharkhand',           taxRate: 30.0, col: 0.31 },
      { code: 'IN-KA', name: 'Karnataka',           taxRate: 30.0, col: 0.40 },
      { code: 'IN-KL', name: 'Kerala',              taxRate: 30.0, col: 0.38 },
      { code: 'IN-MP', name: 'Madhya Pradesh',      taxRate: 30.0, col: 0.30 },
      { code: 'IN-MH', name: 'Maharashtra',         taxRate: 30.0, col: 0.45 },
      { code: 'IN-MN', name: 'Manipur',             taxRate: 30.0, col: 0.35 },
      { code: 'IN-ML', name: 'Meghalaya',           taxRate: 30.0, col: 0.36 },
      { code: 'IN-MZ', name: 'Mizoram',             taxRate: 30.0, col: 0.37 },
      { code: 'IN-NL', name: 'Nagaland',            taxRate: 30.0, col: 0.37 },
      { code: 'IN-OD', name: 'Odisha',              taxRate: 30.0, col: 0.31 },
      { code: 'IN-PB', name: 'Punjab',              taxRate: 30.0, col: 0.35 },
      { code: 'IN-RJ', name: 'Rajasthan',           taxRate: 30.0, col: 0.32 },
      { code: 'IN-SK', name: 'Sikkim',              taxRate: 0,    col: 0.36 },
      { code: 'IN-TN', name: 'Tamil Nadu',          taxRate: 30.0, col: 0.37 },
      { code: 'IN-TS', name: 'Telangana',           taxRate: 30.0, col: 0.38 },
      { code: 'IN-TR', name: 'Tripura',             taxRate: 30.0, col: 0.33 },
      { code: 'IN-UP', name: 'Uttar Pradesh',       taxRate: 30.0, col: 0.29 },
      { code: 'IN-UK', name: 'Uttarakhand',         taxRate: 30.0, col: 0.34 },
      { code: 'IN-WB', name: 'West Bengal',         taxRate: 30.0, col: 0.33 },
    ],
  },
];

// Flat lookup for quick access by code
const ALL_STATES = STATE_GROUPS.flatMap((g) => g.states);

// ─── Chart Tooltip ───────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, darkMode, baseCurrency }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={`rounded-lg shadow-lg border px-4 py-3 ${
      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    }`}>
      <p className={`text-sm font-bold mb-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Year {label}</p>
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

// ─── Main Page ───────────────────────────────────────────────────────
export default function TaxSimulatorPage() {
  const { darkMode } = useTheme();

  // Financial data
  const [accounts, setAccounts] = useState([]);
  const [annualIncome, setAnnualIncome] = useState(0);
  const [annualExpenses, setAnnualExpenses] = useState(0);
  const [baseCurrency] = useState('USD');

  // State selections
  const [currentStateCode, setCurrentStateCode] = useState('IN-MH');
  const [targetStateCode, setTargetStateCode] = useState('IN-KA');
  const [projectionYears, setProjectionYears] = useState(10);

  // Loading
  const [loading, setLoading] = useState(true);

  // Persist user-edited values
  const updateAnnualIncome = (val) => {
    setAnnualIncome(val);
    localStorage.setItem('spw_tax_income', String(val));
  };
  const updateAnnualExpenses = (val) => {
    setAnnualExpenses(val);
    localStorage.setItem('spw_tax_expenses', String(val));
  };

  // Fetch accounts and derive income/expenses from real data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [finRes, ratesRes] = await Promise.all([
          axios.get('http://localhost:5000/api/financials'),
          fetchExchangeRates(),
        ]);
        if (finRes.data.success) {
          const raw = finRes.data.data.accounts || [];
          const converted = convertAccountsToBase(raw, baseCurrency, ratesRes);
          setAccounts(converted);

          // Derive income/expenses from accounts (or use saved values)
          const savedIncome = localStorage.getItem('spw_tax_income');
          const savedExpenses = localStorage.getItem('spw_tax_expenses');

          if (savedIncome && savedExpenses) {
            setAnnualIncome(Number(savedIncome));
            setAnnualExpenses(Number(savedExpenses));
          } else {
            const totalSavings = converted
              .filter((a) => a.type === 'savings')
              .reduce((s, a) => s + a.balance, 0);
            const totalInvestments = converted
              .filter((a) => a.type === 'investment')
              .reduce((s, a) => s + a.balance, 0);
            const totalAssets = totalSavings + totalInvestments;

            // Heuristic: savings ≈ 6 months expenses → annualExpenses ≈ totalSavings / 6 * 12
            const round1000 = (v) => Math.round(v / 1000) * 1000;
            let estAnnualExpenses;
            if (totalSavings > 0) {
              estAnnualExpenses = round1000(totalSavings * 2); // savings ≈ 6 months
            } else if (totalAssets > 0) {
              estAnnualExpenses = round1000(totalAssets);
            } else {
              estAnnualExpenses = 12000; // minimal fallback
            }
            estAnnualExpenses = Math.max(6000, Math.min(estAnnualExpenses, 500000));
            const estAnnualIncome = Math.max(12000, round1000(estAnnualExpenses * 2));

            setAnnualExpenses(estAnnualExpenses);
            setAnnualIncome(estAnnualIncome);
          }
        }
      } catch (err) {
        console.error('Failed to load financial data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const currentState = ALL_STATES.find((s) => s.code === currentStateCode);
  const targetState = ALL_STATES.find((s) => s.code === targetStateCode);

  // ─── Projection calculation ────────────────────────────────────────
  // This builds a year-by-year net worth comparison based on the user's
  // ACTUAL accounts, income, and expenses — adjusted for each state's
  // tax rate and cost of living. Works even with zero investments.
  const { comparisonData, summary } = useMemo(() => {
    if (!currentState || !targetState) {
      return { comparisonData: [], summary: null };
    }

    const currentTaxRate = currentState.taxRate / 100;
    const targetTaxRate  = targetState.taxRate / 100;

    // Cost of living ratio
    const colRatio        = targetState.col / currentState.col;
    const adjustedExpenses = Math.round(annualExpenses * colRatio);

    // After-tax income in each state
    const currentAfterTaxIncome = annualIncome * (1 - currentTaxRate);
    const targetAfterTaxIncome  = annualIncome * (1 - targetTaxRate);

    // Annual savings (income − expenses) in each state
    const currentAnnualSaving = currentAfterTaxIncome - annualExpenses;
    const targetAnnualSaving  = targetAfterTaxIncome  - adjustedExpenses;

    // Starting net worth from actual accounts
    const startingNetWorth = accounts.reduce((sum, a) => {
      return sum + (a.type === 'debt' ? -Math.abs(a.balance) : a.balance);
    }, 0);

    // Weighted average growth rate across all non-debt accounts
    const growthAccounts = accounts.filter((a) => a.type !== 'debt');
    const totalGrowthBalance = growthAccounts.reduce((s, a) => s + a.balance, 0);
    const weightedGrowthRate = totalGrowthBalance > 0
      ? growthAccounts.reduce((s, a) => s + (a.annualGrowthRate / 100) * (a.balance / totalGrowthBalance), 0)
      : 0;

    // Build year-by-year projection
    const currentYear = new Date().getFullYear();
    let currentNW = startingNetWorth;
    let targetNW  = startingNetWorth;
    const comparison = [];

    for (let i = 0; i <= projectionYears; i++) {
      if (i > 0) {
        // Existing assets grow
        currentNW = currentNW * (1 + weightedGrowthRate);
        targetNW  = targetNW  * (1 + weightedGrowthRate);

        // Add annual savings difference
        currentNW += currentAnnualSaving;
        targetNW  += targetAnnualSaving;
      }

      comparison.push({
        year: currentYear + i,
        currentNetWorth: Math.round(currentNW),
        targetNetWorth: Math.round(targetNW),
        cumulativeSavings: Math.round(targetNW - currentNW),
      });
    }

    const lastYear = comparison[comparison.length - 1];

    // Tax difference breakdown
    const annualTaxSaving = Math.round(annualIncome * (currentTaxRate - targetTaxRate));
    const annualCOLSaving = annualExpenses - adjustedExpenses;

    return {
      comparisonData: comparison,
      summary: {
        annualTaxSaving,
        annualCOLSaving,
        totalAnnualSaving: annualTaxSaving + annualCOLSaving,
        adjustedExpenses,
        totalSavingsOverPeriod: lastYear.cumulativeSavings,
        netWorthDifference: lastYear.targetNetWorth - lastYear.currentNetWorth,
        currentEndNW: lastYear.currentNetWorth,
        targetEndNW: lastYear.targetNetWorth,
        colChangePercent: Math.round((colRatio - 1) * 100),
        taxDifference: (currentState.taxRate - targetState.taxRate).toFixed(1),
        currentAfterTaxIncome: Math.round(currentAfterTaxIncome),
        targetAfterTaxIncome: Math.round(targetAfterTaxIncome),
        currentAnnualSaving: Math.round(currentAnnualSaving),
        targetAnnualSaving: Math.round(targetAnnualSaving),
      },
    };
  }, [accounts, currentState, targetState, annualIncome, annualExpenses, projectionYears]);

  const gridColor = darkMode ? '#334155' : '#e2e8f0';
  const tickColor = darkMode ? '#94a3b8' : '#64748b';
  const axisColor = darkMode ? '#475569' : '#cbd5e1';
  const formatShort = (v) => {
    const sym = (CURRENCY_INFO[baseCurrency] || CURRENCY_INFO.USD).symbol;
    if (Math.abs(v) >= 1e6) return `${sym}${(v / 1e6).toFixed(1)}M`;
    if (Math.abs(v) >= 1e3) return `${sym}${(v / 1e3).toFixed(0)}k`;
    return `${sym}${v}`;
  };

  const isWorthMoving = summary && summary.totalSavingsOverPeriod > 0;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-10 border-b backdrop-blur-sm ${
        darkMode ? 'bg-slate-900/80 border-slate-700/50' : 'bg-white/80 border-slate-200'
      }`}>
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className={`p-2 rounded-lg transition ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
                <MapPin className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <h1 className="font-bold text-sm leading-tight">State Migration Tax Simulator</h1>
                <p className={`text-[10px] leading-tight ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Geo-Arbitrage &middot; Compare US & India tax jurisdictions</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* ── Configuration Panel ── */}
        <section className={`rounded-xl p-6 ${darkMode ? 'bg-slate-800 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`}>
          <h2 className={`text-sm font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Configure Simulation</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Current State */}
            <div>
              <label className={`block text-[11px] font-medium mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Current State
              </label>
              <div className="relative">
                <select
                  value={currentStateCode}
                  onChange={(e) => setCurrentStateCode(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm appearance-none pr-8 ${
                    darkMode
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  {STATE_GROUPS.map((group) => (
                    <optgroup key={group.country} label={group.country}>
                      {group.states.map((s) => (
                        <option key={s.code} value={s.code}>{s.name} ({s.taxRate}%)</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown className={`absolute right-2.5 top-3 w-3.5 h-3.5 pointer-events-none ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
              </div>
            </div>

            {/* Target State */}
            <div>
              <label className={`block text-[11px] font-medium mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Target State
              </label>
              <div className="relative">
                <select
                  value={targetStateCode}
                  onChange={(e) => setTargetStateCode(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm appearance-none pr-8 ${
                    darkMode
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  {STATE_GROUPS.map((group) => (
                    <optgroup key={group.country} label={group.country}>
                      {group.states.map((s) => (
                        <option key={s.code} value={s.code}>{s.name} ({s.taxRate}%)</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown className={`absolute right-2.5 top-3 w-3.5 h-3.5 pointer-events-none ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
              </div>
            </div>

            {/* Annual Income */}
            <div>
              <label className={`block text-[11px] font-medium mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Annual Income
                <span className={`ml-1 text-[9px] font-normal ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>(Estimated from your accounts)</span>
              </label>
              <div className="relative">
                <span className={`absolute left-3 top-2.5 text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{CURRENCY_INFO[baseCurrency]?.symbol || '$'}</span>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={annualIncome}
                  onChange={(e) => updateAnnualIncome(Number(e.target.value))}
                  className={`w-full pl-7 pr-3 py-2.5 rounded-lg border text-sm font-mono ${
                    darkMode
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>

            {/* Annual Expenses */}
            <div>
              <label className={`block text-[11px] font-medium mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Annual Expenses
                <span className={`ml-1 text-[9px] font-normal ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>(Estimated from your accounts)</span>
              </label>
              <div className="relative">
                <span className={`absolute left-3 top-2.5 text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{CURRENCY_INFO[baseCurrency]?.symbol || '$'}</span>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={annualExpenses}
                  onChange={(e) => updateAnnualExpenses(Number(e.target.value))}
                  className={`w-full pl-7 pr-3 py-2.5 rounded-lg border text-sm font-mono ${
                    darkMode
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Projection Years Slider */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Projection Period
              </label>
              <span className={`text-sm font-bold font-mono ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{projectionYears} years</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={projectionYears}
              onChange={(e) => setProjectionYears(Number(e.target.value))}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              style={{ background: darkMode ? '#334155' : '#cbd5e1', accentColor: '#10b981' }}
            />
            <div className="flex justify-between mt-1">
              <span className={`text-[10px] ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>5yr</span>
              <span className={`text-[10px] ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>30yr</span>
            </div>
          </div>
        </section>

        {/* ── State Comparison Banner ── */}
        {currentState && targetState && (
          <section className={`rounded-xl p-5 ${darkMode ? 'bg-slate-800 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`}>
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              {/* Current State */}
              <div className={`flex-1 w-full rounded-lg p-4 text-center border ${
                darkMode ? 'bg-slate-700/40 border-slate-600/50' : 'bg-slate-50 border-slate-200'
              }`}>
                <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Current</p>
                <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{currentState.name}</p>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tax: <strong className="text-red-400">{currentState.taxRate}%</strong></span>
                  <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>COL: <strong>{(currentState.col * 100).toFixed(0)}%</strong></span>
                </div>
              </div>

              {/* Arrow */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                darkMode ? 'bg-emerald-500/15' : 'bg-emerald-50'
              }`}>
                <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
              </div>

              {/* Target State */}
              <div className={`flex-1 w-full rounded-lg p-4 text-center border ${
                darkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-200'
              }`}>
                <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${darkMode ? 'text-emerald-500' : 'text-emerald-600'}`}>Target</p>
                <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{targetState.name}</p>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tax: <strong className="text-emerald-400">{targetState.taxRate}%</strong></span>
                  <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>COL: <strong>{(targetState.col * 100).toFixed(0)}%</strong></span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Summary Cards ── */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: 'Tax Rate Difference',
                value: `${summary.taxDifference}%`,
                sub: `${currentState.taxRate}% → ${targetState.taxRate}%`,
                accent: 'blue',
              },
              {
                label: 'Annual Tax Savings',
                value: formatCurrencyAmount(summary.annualTaxSaving, baseCurrency),
                sub: 'On state income tax',
                accent: summary.annualTaxSaving > 0 ? 'emerald' : 'red',
              },
              {
                label: 'COL Adjustment',
                value: `${summary.colChangePercent > 0 ? '+' : ''}${summary.colChangePercent}%`,
                sub: `$${annualExpenses.toLocaleString()} → $${summary.adjustedExpenses.toLocaleString()}/yr`,
                accent: summary.colChangePercent <= 0 ? 'emerald' : 'amber',
              },
              {
                label: `Total Savings (${projectionYears}yr)`,
                value: formatCurrencyAmount(summary.totalSavingsOverPeriod, baseCurrency),
                sub: `$${summary.totalAnnualSaving.toLocaleString()}/year combined`,
                accent: summary.totalSavingsOverPeriod > 0 ? 'emerald' : 'red',
              },
            ].map((card, i) => {
              const colors = {
                blue:    { dot: 'bg-blue-400',    val: darkMode ? 'text-blue-400'    : 'text-blue-600',    border: darkMode ? 'border-blue-500/20'    : 'border-blue-200' },
                emerald: { dot: 'bg-emerald-400', val: darkMode ? 'text-emerald-400' : 'text-emerald-600', border: darkMode ? 'border-emerald-500/20' : 'border-emerald-200' },
                red:     { dot: 'bg-red-400',     val: darkMode ? 'text-red-400'     : 'text-red-600',     border: darkMode ? 'border-red-500/20'     : 'border-red-200' },
                amber:   { dot: 'bg-amber-400',   val: darkMode ? 'text-amber-400'   : 'text-amber-600',   border: darkMode ? 'border-amber-500/20'   : 'border-amber-200' },
              };
              const c = colors[card.accent];
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
        )}

        {/* ── Verdict Banner ── */}
        {summary && (
          <div className={`rounded-xl p-5 border ${
            isWorthMoving
              ? darkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
              : darkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isWorthMoving
                  ? darkMode ? 'bg-emerald-500/15' : 'bg-emerald-100'
                  : darkMode ? 'bg-red-500/15' : 'bg-red-100'
              }`}>
                <TrendingUp className={`w-5 h-5 ${isWorthMoving ? 'text-emerald-500' : 'text-red-500'}`} />
              </div>
              <div>
                <h3 className={`text-sm font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  {isWorthMoving ? 'Moving could be financially beneficial' : 'Moving may not save money'}
                </h3>
                <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {isWorthMoving ? (
                    <>
                      By relocating from <strong>{currentState.name}</strong> to <strong>{targetState.name}</strong>, you could save approximately{' '}
                      <strong className="text-emerald-400 font-mono">{formatCurrencyAmount(summary.totalSavingsOverPeriod, baseCurrency)}</strong>{' '}
                      over {projectionYears} years, resulting in a projected net worth of{' '}
                      <strong className="font-mono">{formatCurrencyAmount(summary.targetEndNW, baseCurrency)}</strong> vs{' '}
                      <strong className="font-mono">{formatCurrencyAmount(summary.currentEndNW, baseCurrency)}</strong>.
                    </>
                  ) : (
                    <>
                      Moving from <strong>{currentState.name}</strong> to <strong>{targetState.name}</strong> would{' '}
                      {summary.totalSavingsOverPeriod < 0 ? (
                        <>cost you an additional <strong className="text-red-400 font-mono">{formatCurrencyAmount(Math.abs(summary.totalSavingsOverPeriod), baseCurrency)}</strong></>
                      ) : (
                        <>not result in significant savings</>
                      )}{' '}
                      over {projectionYears} years due to the cost of living difference offsetting tax savings.
                    </>
                  )}
                </p>
                <p className={`text-[11px] mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Note: This simulation considers state income tax and cost of living only. It does not account for property taxes, sales tax, quality of life, or moving costs.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Comparison Chart ── */}
        {comparisonData.length > 0 && (
          <section className={`rounded-xl p-6 ${darkMode ? 'bg-slate-800 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Net Worth Comparison</h3>
                <p className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {currentState.name} vs {targetState.name} &middot; {projectionYears}-year projection
                </p>
              </div>
            </div>

            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={comparisonData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="year" tick={{ fill: tickColor, fontSize: 12 }} axisLine={{ stroke: axisColor }} tickLine={{ stroke: axisColor }} />
                  <YAxis tickFormatter={formatShort} tick={{ fill: tickColor, fontSize: 12 }} axisLine={{ stroke: axisColor }} tickLine={{ stroke: axisColor }} width={70} />
                  <Tooltip content={<ChartTooltip darkMode={darkMode} baseCurrency={baseCurrency} />} />
                  <Legend
                    wrapperStyle={{ fontSize: '12px' }}
                    formatter={(value) => <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>{value}</span>}
                  />
                  <Area
                    type="monotone"
                    dataKey="currentNetWorth"
                    name={`Stay in ${currentState.name}`}
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fill="#f43f5e"
                    fillOpacity={0.08}
                  />
                  <Area
                    type="monotone"
                    dataKey="targetNetWorth"
                    name={`Move to ${targetState.name}`}
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="#10b981"
                    fillOpacity={0.08}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ── Year-by-Year Table ── */}
        {comparisonData.length > 0 && (
          <section className={`rounded-xl p-6 ${darkMode ? 'bg-slate-800 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`}>
            <h3 className={`text-sm font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Year-by-Year Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    <th className={`text-left py-2 px-3 text-[11px] font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Year</th>
                    <th className={`text-right py-2 px-3 text-[11px] font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Stay ({currentState.code})</th>
                    <th className={`text-right py-2 px-3 text-[11px] font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Move ({targetState.code})</th>
                    <th className={`text-right py-2 px-3 text-[11px] font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Cumulative Savings</th>
                    <th className={`text-right py-2 px-3 text-[11px] font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, i) => {
                    const diff = row.targetNetWorth - row.currentNetWorth;
                    return (
                      <tr key={row.year} className={`border-b transition-colors ${
                        darkMode ? 'border-slate-700/50 hover:bg-slate-700/30' : 'border-slate-100 hover:bg-slate-50'
                      }`}>
                        <td className={`py-2.5 px-3 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{row.year}</td>
                        <td className={`py-2.5 px-3 text-right font-mono ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          {formatCurrencyAmount(row.currentNetWorth, baseCurrency)}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-mono ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          {formatCurrencyAmount(row.targetNetWorth, baseCurrency)}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-mono ${
                          row.cumulativeSavings > 0 ? 'text-emerald-400' : row.cumulativeSavings < 0 ? 'text-red-400' : darkMode ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          {row.cumulativeSavings > 0 ? '+' : ''}{formatCurrencyAmount(row.cumulativeSavings, baseCurrency)}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-mono font-semibold ${
                          diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : darkMode ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          {diff > 0 ? '+' : ''}{formatCurrencyAmount(diff, baseCurrency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Empty state */}
        {accounts.length === 0 && !loading && (
          <div className={`rounded-xl p-12 text-center border-2 border-dashed ${
            darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-300 bg-slate-50'
          }`}>
            <MapPin className={`w-10 h-10 mx-auto mb-3 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
            <p className={`font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No accounts found</p>
            <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Add accounts on the dashboard first to run the tax migration simulator.
            </p>
            <Link to="/accounts" className="inline-block mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition">
              Add Accounts
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
