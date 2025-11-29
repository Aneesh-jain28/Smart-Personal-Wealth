import PropTypes from 'prop-types';
import { Calendar, RotateCcw } from 'lucide-react';
import { formatCurrencyAmount } from '../utils/currencyHelper.js';

function ScenarioToggle({ scenarios, activeScenarioIds, onToggle, onReset, darkMode = false, baseCurrency = 'USD' }) {
  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="text-center py-8">
        <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
          <Calendar className={`w-5 h-5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
        </div>
        <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No scenarios available</p>
      </div>
    );
  }

  const activeCount = Object.values(activeScenarioIds).filter(Boolean).length;

  return (
    <div className="space-y-2">
      {scenarios.map((scenario, index) => {
        const isExpense = scenario.type === 'one-time-expense';
        const isActive = activeScenarioIds[index] || false;

        return (
          <label
            key={scenario._id || index}
            className={`flex items-center justify-between border rounded-lg p-3.5 cursor-pointer transition-all ${
              isActive
                ? darkMode
                  ? 'bg-slate-800/80 border-slate-600'
                  : 'bg-white border-slate-300'
                : darkMode
                  ? 'bg-slate-800/30 border-slate-700/50 opacity-50'
                  : 'bg-slate-50/50 border-slate-200 opacity-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => onToggle(index)}
                className="w-4 h-4 rounded border-slate-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />

              <div className={`w-1.5 h-1.5 rounded-full ${isExpense ? 'bg-red-400' : 'bg-emerald-400'}`} />

              <div>
                <p className={`font-medium text-sm ${
                  isActive
                    ? darkMode ? 'text-slate-200' : 'text-slate-700'
                    : darkMode ? 'text-slate-500 line-through' : 'text-slate-400 line-through'
                }`}>
                  {scenario.label}
                </p>
                <p className={`text-[11px] capitalize ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {scenario.type.replaceAll('-', ' ')}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className={`font-bold font-mono text-sm ${
                scenario.amount < 0 ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {scenario.amount < 0 ? '-' : '+'}
                {formatCurrencyAmount(Math.abs(scenario.amount), baseCurrency)}
              </p>
              <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Year {scenario.startYear}
              </p>
            </div>
          </label>
        );
      })}

      <div className={`mt-3 pt-3 border-t flex items-center justify-between transition-colors ${
        darkMode ? 'border-slate-700/50' : 'border-slate-200'
      }`}>
        <p className={`text-[11px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          {activeCount} of {scenarios.length} active
        </p>
        <button
          onClick={onReset}
          className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
            darkMode
              ? 'text-slate-400 hover:text-red-400 hover:bg-slate-700'
              : 'text-slate-500 hover:text-red-500 hover:bg-slate-100'
          }`}
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>
    </div>
  );
}

ScenarioToggle.propTypes = {
  scenarios: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['one-time-expense', 'income-change']).isRequired,
      amount: PropTypes.number.isRequired,
      startYear: PropTypes.number.isRequired,
    })
  ).isRequired,
  activeScenarioIds: PropTypes.objectOf(PropTypes.bool).isRequired,
  onToggle: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  darkMode: PropTypes.bool,
  baseCurrency: PropTypes.string,
};

export default ScenarioToggle;
