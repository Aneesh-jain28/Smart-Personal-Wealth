import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, Pencil, Trash2, ArrowLeft, Zap, X, Save } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const API = 'http://localhost:5000/api/financials';

const SCENARIO_TYPES = ['one-time-expense', 'income-change'];
const FREQUENCIES = ['monthly', 'annually'];

const currentYear = new Date().getFullYear();

const emptyScenario = {
  label: '',
  type: 'one-time-expense',
  amount: 0,
  startYear: currentYear,
  isRecurring: false,
  frequency: 'annually',
};

export default function ManageScenariosPage() {
  const { darkMode } = useTheme();
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyScenario });
  const [saving, setSaving] = useState(false);

  const fetchScenarios = async () => {
    try {
      const res = await axios.get(API);
      setScenarios(res.data.data.scenarios || []);
    } catch {
      setError('Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchScenarios(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyScenario });
    setShowForm(true);
    setError('');
  };

  const openEdit = (scenario) => {
    setEditingId(scenario._id);
    setForm({
      label: scenario.label,
      type: scenario.type,
      amount: scenario.amount,
      startYear: scenario.startYear,
      isRecurring: scenario.isRecurring || false,
      frequency: scenario.frequency || 'annually',
    });
    setShowForm(true);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: inputType === 'checkbox' ? checked
        : ['amount', 'startYear'].includes(name) ? Number(value)
        : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.label.trim()) { setError('Scenario label is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await axios.put(`${API}/scenarios/${editingId}`, form);
      } else {
        await axios.post(`${API}/scenarios`, form);
      }
      setShowForm(false);
      setEditingId(null);
      await fetchScenarios();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save scenario');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this scenario?')) return;
    try {
      await axios.delete(`${API}/scenarios/${id}`);
      await fetchScenarios();
    } catch {
      setError('Failed to delete scenario');
    }
  };

  const formatAmount = (amount) => {
    const prefix = amount < 0 ? '-' : '+';
    return `${prefix}$${Math.abs(amount).toLocaleString()}`;
  };

  const inputCls = `w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-800'}`;
  const labelCls = `block text-xs font-medium mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
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
                <Zap className="w-5 h-5 text-violet-500" /> Scenarios
              </h1>
              <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''} total
              </p>
            </div>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 font-medium text-sm transition text-white">
            <Plus className="w-4 h-4" /> New Scenario
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
              <h2 className="text-base font-bold">{editingId ? 'Edit Scenario' : 'New Scenario'}</h2>
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
                  <label className={labelCls}>Label *</label>
                  <input name="label" value={form.label} onChange={handleChange} placeholder="e.g. New Car Purchase"
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Type *</label>
                  <select name="type" value={form.type} onChange={handleChange} className={inputCls}>
                    {SCENARIO_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t === 'one-time-expense' ? 'One-Time Expense' : 'Income Change'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Amount ($) {form.type === 'one-time-expense' && '(negative = expense)'}</label>
                  <input name="amount" type="number" step="any" value={form.amount} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Start Year</label>
                  <input name="startYear" type="number" min={currentYear} max={currentYear + 50} value={form.startYear} onChange={handleChange}
                    className={inputCls} />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input name="isRecurring" type="checkbox" checked={form.isRecurring} onChange={handleChange}
                    className={`w-4 h-4 rounded text-violet-500 focus:ring-violet-500 ${darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'}`} />
                  <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Recurring</span>
                </label>
                {form.isRecurring && (
                  <select name="frequency" value={form.frequency} onChange={handleChange}
                    className={`px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
                    {FREQUENCIES.map((f) => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 font-medium text-sm transition text-white">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingId ? 'Update' : 'Add Scenario'}
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
        {scenarios.length === 0 && !showForm ? (
          <div className={`text-center py-16 border-2 border-dashed rounded-xl ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <Zap className={`w-7 h-7 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
            </div>
            <p className={`text-base font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>No scenarios yet</p>
            <p className={`text-sm mb-5 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>Add what-if scenarios to explore financial decisions</p>
            <button onClick={openAdd}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 font-medium text-sm transition text-white">
              <Plus className="w-4 h-4" /> Add Scenario
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {scenarios.map((scenario) => (
              <div key={scenario._id} className={`border rounded-xl p-4 flex items-center justify-between transition card-hover ${
                darkMode ? 'bg-slate-800 border-slate-700/50 hover:border-slate-600' : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
              }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">{scenario.label}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      scenario.type === 'one-time-expense'
                        ? darkMode ? 'text-red-400 bg-red-500/10' : 'text-red-600 bg-red-50'
                        : darkMode ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-600 bg-emerald-50'
                    }`}>
                      {scenario.type === 'one-time-expense' ? 'Expense' : 'Income'}
                    </span>
                  </div>
                  <div className={`flex items-center gap-3 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span className={`font-mono font-medium ${scenario.amount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatAmount(scenario.amount)}
                    </span>
                    <span>Year {scenario.startYear}</span>
                    {scenario.isRecurring && (
                      <span className="text-violet-400">{scenario.frequency}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <button onClick={() => openEdit(scenario)}
                    className={`p-2 rounded-lg transition ${darkMode ? 'hover:bg-slate-700 text-slate-500 hover:text-slate-300' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(scenario._id)}
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
