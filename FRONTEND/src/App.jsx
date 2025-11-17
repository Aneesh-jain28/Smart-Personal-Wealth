import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import { Wallet, DollarSign, CreditCard, Moon, Sun, Flame, Globe, Percent, LogOut, PlusCircle, Settings, Zap, MessageSquare, ChevronRight, BarChart3, MapPin, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import AccountList from './components/AccountList.jsx';
import ScenarioToggle from './components/ScenarioToggle.jsx';
import StatCards from './components/StatCards.jsx';
import WealthChart from './components/WealthChart.jsx';
import FireInsights from './components/FireInsights.jsx';

import { generateProjection, runMonteCarlo, calculateInterestSaved } from './utils/financeHelpers.js';
import { fetchExchangeRates, convertAccountsToBase, FIAT_CURRENCIES, CURRENCY_INFO, formatCurrencyAmount } from './utils/currencyHelper.js';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import './App.css';

function App() {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  // Central state management
  const [accounts, setAccounts] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [activeScenarioIds, setActiveScenarioIds] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [annualExpenses, setAnnualExpenses] = useState(50000);
  const [debtStrategy, setDebtStrategy] = useState('none'); // 'none' | 'avalanche' | 'snowball'
  const [extraDebtPayment, setExtraDebtPayment] = useState(500);
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [exchangeRates, setExchangeRates] = useState(null);
  const [rawAccounts, setRawAccounts] = useState([]);
  const [applyTaxDrag, setApplyTaxDrag] = useState(false);
  const [inflationRate, setInflationRate] = useState(3);
  const [adjustForRealValue, setAdjustForRealValue] = useState(false);

  // Ref for PDF export
  const exportRef = useRef(null);

  // Fetch exchange rates on mount and periodically
  useEffect(() => {
    const loadRates = async () => {
      try {
        const rates = await fetchExchangeRates();
        setExchangeRates(rates);
      } catch (err) {
        console.error('Failed to fetch exchange rates:', err);
      }
    };
    loadRates();
    const interval = setInterval(loadRates, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch financial data from the API
  const fetchFinancialData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('http://localhost:5000/api/financials');
      
      if (response.data.success) {
        const fetchedAccounts = response.data.data.accounts || [];
        const fetchedScenarios = response.data.data.scenarios || [];
        setRawAccounts(fetchedAccounts);
        setAccounts(fetchedAccounts);
        setScenarios(fetchedScenarios);
        const initialActive = {};
        fetchedScenarios.forEach((_, index) => {
          initialActive[index] = true;
        });
        setActiveScenarioIds(initialActive);
      } else {
        throw new Error('Failed to fetch financial data');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to connect to the server');
      console.error('Error fetching financial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, []);

  // Convert accounts to base currency
  useEffect(() => {
    if (rawAccounts.length > 0 && exchangeRates) {
      const converted = convertAccountsToBase(rawAccounts, baseCurrency, exchangeRates);
      setAccounts(converted);
    }
  }, [rawAccounts, baseCurrency, exchangeRates]);

  // Net worth
  const netWorth = useMemo(() => {
    return Math.round(accounts.reduce((total, account) => total + account.balance, 0) * 100) / 100;
  }, [accounts]);

  const handleScenarioToggle = useCallback((scenarioId) => {
    setActiveScenarioIds((prev) => ({
      ...prev,
      [scenarioId]: !prev[scenarioId],
    }));
  }, []);

  const handleResetScenarios = useCallback(() => {
    const resetActive = {};
    scenarios.forEach((_, index) => {
      resetActive[index] = false;
    });
    setActiveScenarioIds(resetActive);
  }, [scenarios]);

  // Projections
  const projectionData = useMemo(() => {
    if (accounts.length === 0) return [];
    const activeScenarios = scenarios.filter((_, index) => activeScenarioIds[index]);
    return generateProjection(accounts, activeScenarios, 10, debtStrategy, extraDebtPayment, applyTaxDrag, inflationRate);
  }, [accounts, scenarios, activeScenarioIds, debtStrategy, extraDebtPayment, applyTaxDrag, inflationRate]);

  const interestSaved = useMemo(() => {
    if (accounts.length === 0 || debtStrategy === 'none') return 0;
    return calculateInterestSaved(accounts, debtStrategy, extraDebtPayment, 5);
  }, [accounts, debtStrategy, extraDebtPayment]);

  const monteCarloData = useMemo(() => {
    if (accounts.length === 0) return [];
    return runMonteCarlo(accounts, 10, 1000);
  }, [accounts]);

  const fireNumber = useMemo(() => {
    if (!annualExpenses || annualExpenses <= 0) return 0;
    return Math.round(annualExpenses * 25);
  }, [annualExpenses]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-400 text-sm">Loading your data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-5 rounded-xl max-w-md text-center">
          <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={fetchFinancialData}
            className="bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-5 rounded-lg text-sm transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!loading && !error && accounts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Wallet className="w-8 h-8 text-slate-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No Data Yet</h2>
          <p className="text-slate-400 text-sm mb-6">
            Add your accounts and scenarios to get started with your wealth forecast.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/accounts" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition">
              <PlusCircle className="w-4 h-4" /> Add Accounts
            </Link>
            <Link to="/scenarios" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition">
              <Zap className="w-4 h-4" /> Add Scenarios
            </Link>
          </div>
          <button onClick={logout} className="mt-6 text-red-400 hover:text-red-300 text-xs font-medium transition">
            Logout
          </button>
        </div>
      </div>
    );
  }

  // ─── Main Dashboard ───
  return (
    <div className={`flex min-h-screen transition-colors ${darkMode ? 'dark bg-slate-900' : 'bg-slate-50'}`}>
      {/* ───── Sidebar ───── */}
      <aside className="w-72 sidebar-gradient text-white flex flex-col overflow-y-auto border-r border-slate-700/50">
        {/* Brand */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-extrabold text-sm">$</span>
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">SPW Dashboard</h1>
              <p className="text-slate-400 text-[11px]">Smart Personal Wealth</p>
            </div>
          </div>

          {/* Quick nav links */}
          <div className="flex gap-1.5">
            <Link to="/accounts" className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-[11px] font-medium rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 transition">
              <Settings className="w-3 h-3" /> Accounts
            </Link>
            <Link to="/ai-chat" className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-[11px] font-medium rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 transition">
              <MessageSquare className="w-3 h-3" /> Ask AI
            </Link>
          </div>
          <Link to="/tax-simulator" className="flex items-center justify-center gap-1.5 py-2 px-2 mt-1.5 text-[11px] font-medium rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 transition border border-emerald-500/20">
            <MapPin className="w-3 h-3" /> Tax Simulator
          </Link>
          <Link to="/black-swan" className="flex items-center justify-center gap-1.5 py-2 px-2 mt-1.5 text-[11px] font-medium rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 transition border border-red-500/20">
            <ShieldAlert className="w-3 h-3" /> Black Swan Test
          </Link>
        </div>

        {/* Currency selector */}
        <div className="px-5 pb-4">
          <label className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 mb-2">
            <Globe className="w-3 h-3" /> Base Currency
          </label>
          <div className="flex gap-1 flex-wrap">
            {FIAT_CURRENCIES.map((cur) => (
              <button
                key={cur}
                onClick={() => setBaseCurrency(cur)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  baseCurrency === cur
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700/60 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                }`}
              >
                {CURRENCY_INFO[cur]?.flag} {cur}
              </button>
            ))}
          </div>
          {exchangeRates && (
            <p className="text-slate-600 text-[10px] mt-1.5">Live rates updated</p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-slate-700/50 mx-5" />

        {/* Accounts */}
        <div className="flex-1 px-5 py-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Accounts</h2>
            <span className="text-[10px] text-slate-600">{accounts.length} total</span>
          </div>
          <AccountList accounts={accounts} />
        </div>

        {/* Net Worth */}
        <div className="border-t border-slate-700/50 mx-5" />
        <div className="px-5 py-4">
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-500 text-[11px] font-medium mb-1">Total Net Worth</p>
            <p className="text-2xl font-bold text-emerald-400 font-mono">
              {formatCurrencyAmount(netWorth, baseCurrency)}
            </p>
          </div>
        </div>

        {/* Debt Optimizer */}
        {accounts.some((a) => a.type === 'debt') && (
          <>
            <div className="border-t border-slate-700/50 mx-5" />
            <div className="px-5 py-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <CreditCard className="w-3.5 h-3.5" /> Debt Optimizer
              </h2>

              {/* Strategy buttons */}
              <div className="space-y-1.5 mb-3">
                {[
                  { value: 'none', label: 'None', desc: 'No optimization' },
                  { value: 'avalanche', label: 'Avalanche', desc: 'Highest rate first' },
                  { value: 'snowball', label: 'Snowball', desc: 'Smallest balance first' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDebtStrategy(option.value)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                      debtStrategy === option.value
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                        : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="font-medium text-xs">{option.label}</span>
                    <span className={`block text-[10px] mt-0.5 ${
                      debtStrategy === option.value ? 'text-blue-400/70' : 'text-slate-600'
                    }`}>{option.desc}</span>
                  </button>
                ))}
              </div>

              {/* Extra Payment */}
              {debtStrategy !== 'none' && (
                <div className="mb-3">
                  <label className="text-slate-500 text-[10px] font-medium block mb-1">
                    Extra Annual Payment
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 text-xs">{CURRENCY_INFO[baseCurrency]?.symbol || '$'}</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={extraDebtPayment}
                      onChange={(e) => setExtraDebtPayment(Number(e.target.value))}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border bg-slate-800 border-slate-600 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-slate-600 text-[10px]">/yr</span>
                  </div>
                </div>
              )}

              {/* Interest saved */}
              {debtStrategy !== 'none' && interestSaved > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                  <p className="text-emerald-400 text-[10px] font-medium mb-0.5">Interest Saved (5yr)</p>
                  <p className="text-emerald-300 text-lg font-bold font-mono">
                    {formatCurrencyAmount(interestSaved, baseCurrency)}
                  </p>
                  <p className="text-emerald-500/60 text-[10px] mt-0.5">
                    vs. no extra payments ({debtStrategy === 'avalanche' ? 'Avalanche' : 'Snowball'})
                  </p>
                </div>
              )}
              {debtStrategy !== 'none' && interestSaved === 0 && (
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3">
                  <p className="text-slate-500 text-[10px]">Increase extra payment to see savings</p>
                </div>
              )}
            </div>
          </>
        )}
      </aside>

      {/* ───── Main Content ───── */}
      <main className={`flex-1 overflow-y-auto scroll-smooth transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        {/* Top Bar */}
        <header className={`sticky top-0 z-10 border-b backdrop-blur-sm ${
          darkMode ? 'bg-slate-900/80 border-slate-700/50' : 'bg-slate-50/80 border-slate-200'
        }`}>
          <div className="flex items-center justify-between px-8 py-4">
            <div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                Dashboard
              </h2>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                Your financial overview &middot; {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <span className={`text-xs font-medium mr-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Hi, {user.name}
                </span>
              )}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg border transition-colors ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
                title="Toggle theme"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={logout}
                className={`p-2 rounded-lg border transition-colors ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-red-400 hover:bg-slate-700'
                    : 'bg-white border-slate-200 text-red-400 hover:bg-slate-50'
                }`}
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="px-8 py-6 space-y-6">
          {/* Status Bar */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
            darkMode
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
          }`}>
            <div className="status-dot" />
            <span>API connected</span>
            <span className={`${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>&middot;</span>
            <span className={`${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{accounts.length} accounts, {scenarios.length} scenarios loaded</span>
          </div>

          {/* ── Net Worth Chart ── */}
          <section ref={exportRef} className={`rounded-xl p-6 card-hover ${
            darkMode ? 'bg-slate-800 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Net Worth Projection</h3>
                  <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>10-year forecast with scenarios applied</p>
                </div>
              </div>
            </div>
            
            <WealthChart data={projectionData} monteCarloData={monteCarloData} fireNumber={fireNumber} showRealValues={adjustForRealValue} darkMode={darkMode} baseCurrency={baseCurrency} />

            <div className="mt-5">
              <StatCards projectionData={projectionData} darkMode={darkMode} exportRef={exportRef} baseCurrency={baseCurrency} />
            </div>
          </section>

          {/* ── FIRE Insights ── */}
          <FireInsights
            annualExpenses={annualExpenses}
            projectionData={projectionData}
            darkMode={darkMode}
            baseCurrency={baseCurrency}
          />

          {/* ── Tax & Inflation ── */}
          <section className={`rounded-xl p-6 card-hover ${
            darkMode ? 'bg-slate-800 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                <Percent className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Tax & Inflation</h3>
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Adjust projections for real-world factors</p>
              </div>
            </div>

            {/* Toggle */}
            <div className={`rounded-lg p-4 border mb-5 ${
              darkMode ? 'bg-slate-700/30 border-slate-600/50' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Adjust for Inflation & Taxes</p>
                  <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Show real values after tax drag & inflation</p>
                </div>
                <button
                  onClick={() => {
                    const next = !adjustForRealValue;
                    setAdjustForRealValue(next);
                    setApplyTaxDrag(next);
                  }}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    adjustForRealValue ? 'bg-amber-500' : darkMode ? 'bg-slate-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      adjustForRealValue ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>
              {adjustForRealValue && (
                <p className={`text-[11px] mt-3 px-2.5 py-1.5 rounded-md ${
                  darkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'
                }`}>
                  Taxable gains reduced by 15% &middot; Future values discounted at {inflationRate}%
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tax Drag */}
              <div className={`rounded-lg p-4 border ${
                darkMode ? 'bg-slate-700/30 border-slate-600/50' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Tax Drag (LTCG)</p>
                    <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>15% of gains on taxable accounts</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    applyTaxDrag
                      ? 'bg-amber-500/15 text-amber-400'
                      : darkMode ? 'bg-slate-600 text-slate-400' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {applyTaxDrag ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* Inflation */}
              <div className={`rounded-lg p-4 border ${
                darkMode ? 'bg-slate-700/30 border-slate-600/50' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Expected Inflation</p>
                    <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Discount to today&apos;s value</p>
                  </div>
                  <span className={`text-base font-bold font-mono ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                    {inflationRate}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={inflationRate}
                  onChange={(e) => setInflationRate(Number(e.target.value))}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  style={{
                    background: `${darkMode ? '#334155' : '#cbd5e1'}`,
                    accentColor: '#f59e0b',
                  }}
                />
                <div className="flex justify-between mt-1">
                  <span className={`text-[10px] ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>0%</span>
                  <span className={`text-[10px] ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>10%</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── State Migration Tax Simulator CTA ── */}
          <Link to="/tax-simulator" className={`block rounded-xl p-6 card-hover group transition-all ${
            darkMode
              ? 'bg-gradient-to-r from-emerald-500/5 to-blue-500/5 border border-emerald-500/20 hover:border-emerald-500/40'
              : 'bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 hover:border-emerald-300 shadow-sm'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? 'bg-emerald-500/15' : 'bg-emerald-100'}`}>
                  <MapPin className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>State Migration Tax Simulator</h3>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Compare net worth projections across different tax jurisdictions &middot; Geo-arbitrage analysis</p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
            </div>
          </Link>

          {/* ── Black Swan Resilience Score CTA ── */}
          <Link to="/black-swan" className={`block rounded-xl p-6 card-hover group transition-all ${
            darkMode
              ? 'bg-gradient-to-r from-red-500/5 to-orange-500/5 border border-red-500/20 hover:border-red-500/40'
              : 'bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 hover:border-red-300 shadow-sm'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? 'bg-red-500/15' : 'bg-red-100'}`}>
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Black Swan Resilience Score</h3>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Stress-test your portfolio against catastrophic events &middot; Survival analysis</p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
            </div>
          </Link>

          {/* ── Annual Expenses ── */}
          <section className={`rounded-xl p-6 card-hover ${
            darkMode ? 'bg-slate-800 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? 'bg-orange-500/10' : 'bg-orange-50'}`}>
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Annual Expenses</h3>
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Used for FIRE number calculation (expenses &times; 25)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-base font-medium font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{CURRENCY_INFO[baseCurrency]?.symbol || '$'}</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={annualExpenses}
                onChange={(e) => setAnnualExpenses(Number(e.target.value))}
                className={`flex-1 px-4 py-2.5 rounded-lg border text-base font-medium font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
              <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>/ year</span>
            </div>
          </section>

          {/* ── What-If Scenarios ── */}
          <section className={`rounded-xl p-6 card-hover ${
            darkMode ? 'bg-slate-800 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
                <DollarSign className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>What-If Scenarios</h3>
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Toggle scenarios to see impact on projections</p>
              </div>
              <Link to="/scenarios" className={`ml-auto inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                darkMode ? 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20' : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
              }`}>
                Manage <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <ScenarioToggle
              scenarios={scenarios}
              activeScenarioIds={activeScenarioIds}
              onToggle={handleScenarioToggle}
              onReset={handleResetScenarios}
              darkMode={darkMode}
              baseCurrency={baseCurrency}
            />
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
