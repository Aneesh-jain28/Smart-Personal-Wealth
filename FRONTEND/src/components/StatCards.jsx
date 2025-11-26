import PropTypes from 'prop-types';
import { Download } from 'lucide-react';
import { exportToPDF } from '../utils/exportHelper.js';
import { formatCurrencyAmount } from '../utils/currencyHelper.js';

function StatCards({ projectionData, darkMode = false, exportRef, baseCurrency = 'USD' }) {
  if (!projectionData || projectionData.length === 0) {
    return null;
  }

  const firstYear = projectionData[0];
  const lastYear = projectionData[projectionData.length - 1];

  const endingNetWorth = lastYear.netWorth;
  const totalGrowth = lastYear.netWorth - firstYear.netWorth;
  const growthPercent = firstYear.netWorth !== 0
    ? ((totalGrowth / Math.abs(firstYear.netWorth)) * 100).toFixed(1)
    : 0;

  const debtFreeEntry = projectionData.find((entry) => entry.debt === 0);
  const debtFreeYear = debtFreeEntry ? debtFreeEntry.year : null;

  const cards = [
    {
      label: 'Ending Net Worth',
      value: formatCurrencyAmount(endingNetWorth, baseCurrency),
      sub: `Year ${lastYear.year}`,
      accent: 'blue',
    },
    {
      label: 'Total Growth',
      value: formatCurrencyAmount(totalGrowth, baseCurrency),
      sub: `${totalGrowth >= 0 ? '+' : ''}${growthPercent}% over ${projectionData.length - 1}yr`,
      accent: totalGrowth >= 0 ? 'emerald' : 'red',
    },
    {
      label: 'Debt-Free Year',
      value: debtFreeYear ? `${debtFreeYear}` : 'N/A',
      sub: debtFreeYear
        ? `In ${debtFreeYear - firstYear.year} years`
        : 'Debt persists',
      accent: debtFreeYear ? 'violet' : 'slate',
    },
  ];

  const accentColors = {
    blue: {
      dot: 'bg-blue-400',
      value: darkMode ? 'text-blue-400' : 'text-blue-600',
      border: darkMode ? 'border-blue-500/20' : 'border-blue-200',
    },
    emerald: {
      dot: 'bg-emerald-400',
      value: darkMode ? 'text-emerald-400' : 'text-emerald-600',
      border: darkMode ? 'border-emerald-500/20' : 'border-emerald-200',
    },
    red: {
      dot: 'bg-red-400',
      value: darkMode ? 'text-red-400' : 'text-red-600',
      border: darkMode ? 'border-red-500/20' : 'border-red-200',
    },
    violet: {
      dot: 'bg-violet-400',
      value: darkMode ? 'text-violet-400' : 'text-violet-600',
      border: darkMode ? 'border-violet-500/20' : 'border-violet-200',
    },
    slate: {
      dot: 'bg-slate-400',
      value: darkMode ? 'text-slate-400' : 'text-slate-500',
      border: darkMode ? 'border-slate-600' : 'border-slate-200',
    },
  };

  const handleExport = () => {
    if (exportRef && exportRef.current) {
      exportToPDF(exportRef.current, 'SPW Dashboard');
    }
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {cards.map((card, index) => {
          const colors = accentColors[card.accent];
          return (
            <div
              key={index}
              className={`border rounded-lg p-4 transition-colors ${
                darkMode
                  ? `bg-slate-800/50 ${colors.border}`
                  : `bg-white ${colors.border}`
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {card.label}
                </p>
              </div>
              <p className={`text-xl font-bold font-mono ${colors.value}`}>
                {card.value}
              </p>
              <p className={`text-[11px] mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {card.sub}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex justify-end">
        <button
          onClick={handleExport}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            darkMode
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          Export PDF
        </button>
      </div>
    </div>
  );
}

StatCards.propTypes = {
  projectionData: PropTypes.arrayOf(
    PropTypes.shape({
      year: PropTypes.number.isRequired,
      netWorth: PropTypes.number.isRequired,
      assets: PropTypes.number.isRequired,
      debt: PropTypes.number.isRequired,
    })
  ).isRequired,
  darkMode: PropTypes.bool,
  exportRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  baseCurrency: PropTypes.string,
};

export default StatCards;
