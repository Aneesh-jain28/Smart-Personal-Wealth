import PropTypes from 'prop-types';
import { CURRENCY_INFO, formatCurrencyAmount } from '../utils/currencyHelper.js';

function AccountList({ accounts }) {
  const getTypeColor = (type) => {
    switch (type) {
      case 'savings':
        return { dot: 'bg-blue-400', text: 'text-blue-400', bg: 'bg-blue-500/10' };
      case 'investment':
        return { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10' };
      case 'debt':
        return { dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-500/10' };
      default:
        return { dot: 'bg-slate-400', text: 'text-slate-400', bg: 'bg-slate-500/10' };
    }
  };

  if (!accounts || accounts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-10 h-10 rounded-xl bg-slate-700/50 mx-auto mb-2 flex items-center justify-center text-slate-500 text-lg font-mono">$</div>
        <p className="text-slate-500 text-sm">No accounts found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {accounts.map((account, index) => {
        const color = getTypeColor(account.type);

        return (
          <div
            key={account._id || index}
            className="bg-slate-800/60 rounded-lg p-3.5 border border-slate-700/50 hover:border-slate-600 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${color.dot}`} />
                <h3 className="font-medium text-white text-sm">{account.name}</h3>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium capitalize ${color.bg} ${color.text}`}>
                {account.type}
              </span>
            </div>

            <p className={`text-xl font-bold font-mono ${
              account.balance < 0 ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {formatCurrencyAmount(account.balance, account.currency || 'USD')}
            </p>

            {account.currency && account.currency !== 'USD' && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs">{CURRENCY_INFO[account.currency]?.flag}</span>
                <span className="text-xs text-slate-500 font-medium">{account.currency}</span>
                {account.originalBalance !== undefined && (
                  <span className="text-xs text-slate-600 ml-auto font-mono">
                    ≈ {formatCurrencyAmount(account.originalBalance, account.originalCurrency || account.currency)}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/30">
              <p className="text-[11px] text-slate-500">Growth Rate</p>
              <p className={`text-xs font-medium font-mono ${
                account.annualGrowthRate >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {account.annualGrowthRate}%
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

AccountList.propTypes = {
  accounts: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['savings', 'investment', 'debt']).isRequired,
      balance: PropTypes.number.isRequired,
      annualGrowthRate: PropTypes.number.isRequired,
      currency: PropTypes.string,
    })
  ).isRequired,
};

export default AccountList;
