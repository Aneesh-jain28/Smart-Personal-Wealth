import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Flame, Target, CalendarCheck } from 'lucide-react';
import { formatCurrencyAmount } from '../utils/currencyHelper.js';

/**
 * Calculates the FIRE number and estimates when projections cross it.
 *
 * FIRE Number = Annual Expenses × 25  (based on 4% safe withdrawal rule)
 *
 * The "freedom date" is interpolated from the projection data — the point
 * where net worth first meets or exceeds the FIRE number.
 */

/**
 * Linearly interpolate the fractional year when net worth crosses the target
 * between two data points.
 */
function interpolateCrossingYear(prev, curr, target) {
  const fraction = (target - prev.netWorth) / (curr.netWorth - prev.netWorth);
  return prev.year + fraction;
}

/**
 * Convert a fractional year (e.g. 2029.4) into "Month, Year" string.
 */
function fractionalYearToDate(fractionalYear) {
  const year = Math.floor(fractionalYear);
  const monthIndex = Math.round((fractionalYear - year) * 12);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const month = months[Math.min(monthIndex, 11)];
  return `${month}, ${year}`;
}

function FireInsights({ annualExpenses, projectionData, darkMode = false, baseCurrency = 'USD' }) {
  const fireNumber = useMemo(() => {
    if (!annualExpenses || annualExpenses <= 0) return 0;
    return Math.round(annualExpenses * 25);
  }, [annualExpenses]);

  const safeWithdrawal = useMemo(() => {
    if (!annualExpenses || annualExpenses <= 0) return 0;
    return Math.round(annualExpenses); // 4% of fireNumber === annualExpenses
  }, [annualExpenses]);

  const freedomDate = useMemo(() => {
    if (!fireNumber || !projectionData || projectionData.length < 2) return null;

    // Check if already at FIRE at year 0
    if (projectionData[0].netWorth >= fireNumber) {
      return { label: fractionalYearToDate(projectionData[0].year), year: projectionData[0].year };
    }

    for (let i = 1; i < projectionData.length; i++) {
      const prev = projectionData[i - 1];
      const curr = projectionData[i];

      if (curr.netWorth >= fireNumber && prev.netWorth < fireNumber) {
        const crossingYear = interpolateCrossingYear(prev, curr, fireNumber);
        return { label: fractionalYearToDate(crossingYear), year: crossingYear };
      }
    }

    return null; // never crosses within projection window
  }, [fireNumber, projectionData]);

  if (!annualExpenses || annualExpenses <= 0) {
    return null;
  }

  const currentNetWorth = projectionData?.[0]?.netWorth ?? 0;
  const progressPercent = fireNumber > 0 ? Math.min((currentNetWorth / fireNumber) * 100, 100) : 0;

  return (
    <div className={`rounded-xl shadow-md p-6 mb-6 transition-colors ${
      darkMode ? 'bg-slate-800' : 'bg-white'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className={`p-2.5 rounded-lg transition-colors ${darkMode ? 'bg-orange-500/10' : 'bg-orange-50'}`}>
          <Flame className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h3 className={`text-base font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            FIRE Insights
          </h3>
          <p className={`text-xs transition-colors ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Financial Independence, Retire Early
          </p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {/* FIRE Number */}
        <div className={`rounded-lg p-4 border transition-colors ${
          darkMode ? 'bg-slate-700/40 border-slate-600/50' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Target className={`w-3.5 h-3.5 ${darkMode ? 'text-orange-400' : 'text-orange-500'}`} />
            <p className={`text-[11px] font-medium uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              FIRE Number
            </p>
          </div>
          <p className={`text-xl font-bold font-mono ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
            {formatCurrencyAmount(fireNumber, baseCurrency)}
          </p>
          <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Annual Expenses &times; 25
          </p>
        </div>

        {/* Safe Withdrawal */}
        <div className={`rounded-lg p-4 border transition-colors ${
          darkMode ? 'bg-slate-700/40 border-slate-600/50' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Flame className={`w-3.5 h-3.5 ${darkMode ? 'text-emerald-400' : 'text-emerald-500'}`} />
            <p className={`text-[11px] font-medium uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Safe Withdrawal (4%)
            </p>
          </div>
          <p className={`text-xl font-bold font-mono ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
            {formatCurrencyAmount(safeWithdrawal, baseCurrency)}
          </p>
          <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Per year at 4% rule
          </p>
        </div>

        {/* Freedom Date */}
        <div className={`rounded-lg p-4 border transition-colors ${
          darkMode ? 'bg-slate-700/40 border-slate-600/50' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <CalendarCheck className={`w-3.5 h-3.5 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
            <p className={`text-[11px] font-medium uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Freedom Date
            </p>
          </div>
          {freedomDate ? (
            <>
              <p className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {freedomDate.label}
              </p>
              <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Estimated FIRE crossover
              </p>
            </>
          ) : (
            <>
              <p className={`text-base font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Beyond projection
              </p>
              <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Extend timeline or adjust expenses
              </p>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Progress to FIRE
          </span>
          <span className={`text-xs font-bold font-mono ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
            {progressPercent.toFixed(1)}%
          </span>
        </div>
        <div className={`w-full h-2.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progressPercent}%`,
              background: '#f97316',
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className={`text-[11px] font-mono ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            {formatCurrencyAmount(currentNetWorth, baseCurrency)}
          </span>
          <span className={`text-[11px] font-mono ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            {formatCurrencyAmount(fireNumber, baseCurrency)}
          </span>
        </div>
      </div>

      {/* Freedom Date Badge */}
      {freedomDate && (
        <div className={`mt-4 flex items-center justify-center`}>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
            darkMode
              ? 'bg-orange-900/20 border-orange-700 text-orange-300'
              : 'bg-orange-50 border-orange-200 text-orange-700'
          }`}>
            <Flame className="w-4 h-4" />
            Estimated Freedom Date: {freedomDate.label}
          </div>
        </div>
      )}
    </div>
  );
}

FireInsights.propTypes = {
  annualExpenses: PropTypes.number.isRequired,
  projectionData: PropTypes.arrayOf(
    PropTypes.shape({
      year: PropTypes.number.isRequired,
      netWorth: PropTypes.number.isRequired,
    })
  ).isRequired,
  darkMode: PropTypes.bool,
  baseCurrency: PropTypes.string,
};

export default FireInsights;
