import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, Pencil, Trash2, ArrowLeft, Wallet, X, Save } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const API = 'http://localhost:5000/api/financials';

const ACCOUNT_TYPES = ['savings', 'investment', 'debt'];
const TAX_TREATMENTS = ['taxable', 'deferred', 'exempt'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'BTC', 'ETH'];

const emptyAccount = {
  name: '',
  type: 'savings',
  balance: 0,
  annualGrowthRate: 0,
  standardDeviation: 0,
  taxTreatment: 'taxable',
  interestRate: 0,
  minimumPayment: 0,
  currency: 'USD',
};

export default function ManageAccountsPage() {
  const { darkMode } = useTheme();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyAccount });
  const [saving, setSaving] = useState(false);

  const fetchAccounts = async () => {
    try {
      const res = await axios.get(API);
      setAccounts(res.data.data.accounts || []);
    } catch (err) {
      setError('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyAccount });
    setShowForm(true);
    setError('');
  };

  const openEdit = (account) => {
    setEditingId(account._id);
    setForm({
      name: account.name,
      type: account.type,
      balance: account.balance,
      annualGrowthRate: account.annualGrowthRate,
      standardDeviation: account.standardDeviation || 0,
      taxTreatment: account.taxTreatment || 'taxable',
      interestRate: account.interestRate || 0,
      minimumPayment: account.minimumPayment || 0,
      currency: account.currency || 'USD',
    });
    setShowForm(true);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: ['balance', 'annualGrowthRate', 'standardDeviation', 'interestRate', 'minimumPayment'].includes(name)
        ? Number(value)
        : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Account name is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await axios.put(`${API}/accounts/${editingId}`, form);
      } else {
        await axios.post(`${API}/accounts`, form);
      }
      setShowForm(false);
      setEditingId(null);
      await fetchAccounts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this account?')) return;
    try {
      await axios.delete(`${API}/accounts/${id}`);
      await fetchAccounts();
    } catch (err) {
      setError('Failed to delete account');
    }
  };

  const typeColor = (type) => {
    if (type === 'savings') return darkMode ? 'text-blue-400 bg-blue-500/10' : 'text-blue-600 bg-blue-50';
    if (type === 'investment') return darkMode ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-600 bg-emerald-50';
    return darkMode ? 'text-red-400 bg-red-500/10' : 'text-red-600 bg-red-50';
  };

  const inputCls = `w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-800'}`;
  const labelCls = `block text-xs font-medium mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
      {/* Top Bar */}
      <header className={`sticky top-0 z-10 border-b backdrop-blur-sm ${
        darkMode ? 'bg-slate-900/80 border-slate-700/50' : 'bg-slate-50/80 border-slate-200'
      }`}>
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" className={`p-2 rounded-lg transition ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-slate-100 border border-slate-200'}`}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-500" /> Accounts
              </h1>
              <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {accounts.length} account{accounts.length !== 1 ? 's' : ''} total
              </p>
            </div>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium text-sm transition text-white"
          >
            <Plus className="w-4 h-4" /> New Account
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {error && !showForm && (
          <div className={`mb-5 px-4 py-3 rounded-lg text-sm ${darkMode ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>{error}</div>
        )}

        {/* Form */}
        {showForm && (
          <div className={`mb-8 rounded-xl p-6 border ${darkMode ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold">{editingId ? 'Edit Account' : 'New Account'}</h2>
              <button onClick={() => setShowForm(false)} className={`p-1.5 rounded-lg transition ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                <X className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
              </button>
            </div>

            {error && (
              <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${darkMode ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Account Name *</label>
                  <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Emergency Fund"
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Type *</label>
                  <select name="type" value={form.type} onChange={handleChange} className={inputCls}>
                    {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Balance {form.type === 'debt' && '(negative for debt)'}</label>
                  <input name="balance" type="number" step="any" value={form.balance} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Currency</label>
                  <select name="currency" value={form.currency} onChange={handleChange} className={inputCls}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Annual Growth Rate (%)</label>
                  <input name="annualGrowthRate" type="number" step="0.1" value={form.annualGrowthRate} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Std Deviation (%)</label>
                  <input name="standardDeviation" type="number" step="0.1" value={form.standardDeviation} onChange={handleChange} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Tax Treatment</label>
                <select name="taxTreatment" value={form.taxTreatment} onChange={handleChange} className={inputCls}>
                  {TAX_TREATMENTS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>

              {form.type === 'debt' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Interest Rate (%)</label>
                    <input name="interestRate" type="number" step="0.1" value={form.interestRate} onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Min Payment ($/mo)</label>
                    <input name="minimumPayment" type="number" step="1" value={form.minimumPayment} onChange={handleChange} className={inputCls} />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-medium text-sm transition text-white">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingId ? 'Update' : 'Add Account'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className={`px-5 py-2.5 rounded-lg font-medium text-sm transition ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List */}
        {accounts.length === 0 && !showForm ? (
          <div className={`text-center py-16 border-2 border-dashed rounded-xl ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <Wallet className={`w-7 h-7 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
            </div>
            <p className={`text-base font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>No accounts yet</p>
            <p className={`text-sm mb-5 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>Add your first account to start tracking</p>
            <button onClick={openAdd}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium text-sm transition text-white">
              <Plus className="w-4 h-4" /> Add Account
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {accounts.map((account) => (
              <div key={account._id} className={`border rounded-xl p-4 flex items-center justify-between transition card-hover ${
                darkMode ? 'bg-slate-800 border-slate-700/50 hover:border-slate-600' : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
              }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">{account.name}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeColor(account.type)}`}>
                      {account.type}
                    </span>
                    <span className={`text-[10px] ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{account.currency}</span>
                  </div>
                  <div className={`flex items-center gap-3 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span className={`font-mono font-medium ${account.balance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {account.balance < 0 ? '-' : ''}${Math.abs(account.balance).toLocaleString()}
                    </span>
                    <span>{account.annualGrowthRate}% growth</span>
                    {account.standardDeviation > 0 && <span>&plusmn;{account.standardDeviation}%</span>}
                    <span className={darkMode ? 'text-slate-600' : 'text-slate-400'}>{account.taxTreatment}</span>
                    {account.type === 'debt' && account.interestRate > 0 && (
                      <span>{account.interestRate}% APR</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <button onClick={() => openEdit(account)}
                    className={`p-2 rounded-lg transition ${darkMode ? 'hover:bg-slate-700 text-slate-500 hover:text-slate-300' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(account._id)}
                    className={`p-2 rounded-lg transition ${darkMode ? 'hover:bg-red-500/10 text-slate-500 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
