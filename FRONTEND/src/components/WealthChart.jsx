import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { CURRENCY_INFO } from '../utils/currencyHelper.js';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

const makeFormatShorthand = (currency = 'USD') => {
  const info = CURRENCY_INFO[currency] || CURRENCY_INFO.USD;
  const sym = info.symbol;
  return (value) => {
    if (Math.abs(value) >= 1000000) {
      return `${sym}${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `${sym}${(value / 1000).toFixed(0)}k`;
    }
    return `${sym}${value}`;
  };
};

const makeFormatCurrency = (currency = 'USD') => {
  const info = CURRENCY_INFO[currency];
  if (info && info.type === 'crypto') {
    return (value) => `${info.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  }
  return (value) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return `${(info || CURRENCY_INFO.USD).symbol}${value.toLocaleString()}`;
    }
  };
};

function CustomTooltip({ active, payload, label, darkMode, formatCurrency }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div
      className={`rounded-lg shadow-lg border px-4 py-3 transition-colors ${
        darkMode
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-slate-200'
      }`}
    >
      <p className={`text-sm font-bold mb-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Year {label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          ></div>
          <span className={`text-sm capitalize ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{entry.name}:</span>
          <span className={`text-sm font-semibold font-mono ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
      {payload.length >= 2 && (
        <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Net Worth:</span>
            <span className={`text-sm font-bold font-mono ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {formatCurrency(
                (payload.find((p) => p.name === 'assets')?.value || 0) -
                  (payload.find((p) => p.name === 'debt')?.value || 0)
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  darkMode: PropTypes.bool,
  formatCurrency: PropTypes.func,
  payload: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.number,
      color: PropTypes.string,
    })
  ),
  label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

function MonteCarloTooltip({ active, payload, label, darkMode, formatCurrency }) {
  if (!active || !payload || payload.length === 0) return null;

  const p90 = payload.find((p) => p.dataKey === 'p90');
  const median = payload.find((p) => p.dataKey === 'median');
  const p10 = payload.find((p) => p.dataKey === 'p10');

  return (
    <div
      className={`rounded-lg shadow-lg border px-4 py-3 transition-colors ${
        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}
    >
      <p className={`text-sm font-bold mb-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Year {label}</p>
      {p90 && (
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6366f1' }}></div>
          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>90th %ile:</span>
          <span className={`text-sm font-semibold font-mono ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{formatCurrency(p90.value)}</span>
        </div>
      )}
      {median && (
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></div>
          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Median:</span>
          <span className={`text-sm font-semibold font-mono ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{formatCurrency(median.value)}</span>
        </div>
      )}
      {p10 && (
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#a78bfa' }}></div>
          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>10th %ile:</span>
          <span className={`text-sm font-semibold font-mono ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{formatCurrency(p10.value)}</span>
        </div>
      )}
    </div>
  );
}

MonteCarloTooltip.propTypes = {
  active: PropTypes.bool,
  darkMode: PropTypes.bool,
  formatCurrency: PropTypes.func,
  payload: PropTypes.array,
  label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

function WealthChart({ data, monteCarloData, fireNumber, showRealValues = false, darkMode = false, baseCurrency = 'USD' }) {
  const [activeView, setActiveView] = useState('projection');

  const formatShorthand = useMemo(() => makeFormatShorthand(baseCurrency), [baseCurrency]);
  const formatCurrency = useMemo(() => makeFormatCurrency(baseCurrency), [baseCurrency]);

  // Build chart data: when showRealValues is on, swap assets/debt/netWorth with real values
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (!showRealValues) return data;
    // Use the built-in realNetWorth / realAssets / realDebt from generateProjection
    return data.map((entry) => ({
      ...entry,
      assets: entry.realAssets ?? entry.assets,
      debt: entry.realDebt ?? entry.debt,
      netWorth: entry.realNetWorth ?? entry.netWorth,
    }));
  }, [data, showRealValues]);

  if (!data || data.length === 0) {
    return (
      <div className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
        darkMode
          ? 'border-slate-700 bg-slate-800/50'
          : 'border-slate-300 bg-slate-50'
      }`}>
        <p className={`font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No projection data available</p>
        <p className={`text-sm mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Add accounts and scenarios to generate a projection
        </p>
      </div>
    );
  }

  const gridColor = darkMode ? '#334155' : '#e2e8f0';
  const tickColor = darkMode ? '#94a3b8' : '#64748b';
  const axisColor = darkMode ? '#475569' : '#cbd5e1';

  const hasMonteCarloData = monteCarloData && monteCarloData.length > 0;

  return (
    <div>
      {/* View Toggle Row */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-2">
          {hasMonteCarloData && (
            <>
              <button
                onClick={() => setActiveView('projection')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeView === 'projection'
                    ? 'bg-blue-600 text-white'
                    : darkMode
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                Projection
              </button>
              <button
                onClick={() => setActiveView('montecarlo')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeView === 'montecarlo'
                    ? 'bg-violet-600 text-white'
                    : darkMode
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                Monte Carlo
              </button>
            </>
          )}
        </div>

        {/* Real-Value Indicator (controlled by parent toggle) */}
        {showRealValues && activeView === 'projection' && (
          <span className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
            darkMode
              ? 'bg-amber-900/20 border-amber-800 text-amber-400'
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}>
            Real Value (inflation &amp; tax adjusted)
          </span>
        )}
      </div>

      {/* Projection Chart */}
      {activeView === 'projection' && (
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
            >
              <defs>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />

              <XAxis
                dataKey="year"
                tick={{ fill: tickColor, fontSize: 12 }}
                axisLine={{ stroke: axisColor }}
                tickLine={{ stroke: axisColor }}
              />

              <YAxis
                tickFormatter={formatShorthand}
                tick={{ fill: tickColor, fontSize: 12 }}
                axisLine={{ stroke: axisColor }}
                tickLine={{ stroke: axisColor }}
                width={70}
              />

              <Tooltip content={<CustomTooltip darkMode={darkMode} formatCurrency={formatCurrency} />} />

              <Area
                type="monotone"
                dataKey="assets"
                name="assets"
                stackId="a"
                stroke="#10b981"
                strokeWidth={2}
                fill="#10b981"
                fillOpacity={0.15}
              />

              <Area
                type="monotone"
                dataKey="debt"
                name="debt"
                stackId="a"
                stroke="#f43f5e"
                strokeWidth={2}
                fill="#f43f5e"
                fillOpacity={0.15}
              />

              {/* FIRE Number Reference Line */}
              {fireNumber > 0 && (
                <ReferenceLine
                  y={fireNumber}
                  stroke="#f97316"
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  label={{
                    value: `FIRE: ${formatShorthand(fireNumber)}`,
                    position: 'right',
                    fill: '#f97316',
                    fontSize: 12,
                    fontWeight: 'bold',
                  }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monte Carlo Confidence Interval Chart */}
      {activeView === 'montecarlo' && hasMonteCarloData && (
        <div>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={monteCarloData}
                margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
              >
                <defs>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />

                <XAxis
                  dataKey="year"
                  tick={{ fill: tickColor, fontSize: 12 }}
                  axisLine={{ stroke: axisColor }}
                  tickLine={{ stroke: axisColor }}
                />

                <YAxis
                  tickFormatter={formatShorthand}
                  tick={{ fill: tickColor, fontSize: 12 }}
                  axisLine={{ stroke: axisColor }}
                  tickLine={{ stroke: axisColor }}
                  width={70}
                />

                <Tooltip content={<MonteCarloTooltip darkMode={darkMode} formatCurrency={formatCurrency} />} />

                {/* Shaded confidence band: 10th to 90th percentile */}
                <Area
                  type="monotone"
                  dataKey="p90"
                  name="90th Percentile"
                  stroke="none"
                  fill="#8b5cf6"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="p10"
                  name="10th Percentile"
                  stroke="none"
                  fill={darkMode ? '#0f172a' : '#ffffff'}
                  fillOpacity={1}
                />

                {/* Median bold line */}
                <Line
                  type="monotone"
                  dataKey="median"
                  name="Median"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#8b5cf6' }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-3 rounded" style={{ backgroundColor: '#8b5cf6', opacity: 0.25 }}></div>
              <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>10th–90th Percentile</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 rounded" style={{ backgroundColor: '#8b5cf6' }}></div>
              <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Median (50th)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

WealthChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      year: PropTypes.number.isRequired,
      netWorth: PropTypes.number.isRequired,
      assets: PropTypes.number.isRequired,
      debt: PropTypes.number.isRequired,
    })
  ).isRequired,
  monteCarloData: PropTypes.arrayOf(
    PropTypes.shape({
      year: PropTypes.number.isRequired,
      median: PropTypes.number.isRequired,
      p10: PropTypes.number.isRequired,
      p90: PropTypes.number.isRequired,
    })
  ),
  fireNumber: PropTypes.number,
  showRealValues: PropTypes.bool,
  darkMode: PropTypes.bool,
  baseCurrency: PropTypes.string,
};

export default WealthChart;
