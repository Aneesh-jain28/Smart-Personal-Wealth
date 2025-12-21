import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, Bot, User, Loader2, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';

const API_URL = 'http://localhost:5000/api/ai';

const SUGGESTIONS = [
  { label: 'How close am I to FIRE?', text: 'How close am I to FIRE?' },
  { label: 'Pay off debt or invest?', text: 'Should I pay off debt first or invest?' },
  { label: 'Explain my net worth trend', text: 'Explain my net worth trend' },
  { label: 'Tips to grow savings', text: 'Give me tips to grow my savings faster' },
];

export default function AiChatPage() {
  const { darkMode } = useTheme();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hey! I'm **SPW Assistant** - I can see your accounts, investments and scenarios. Ask me anything about your finances!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async (overrideText) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(1).map((m) => ({ role: m.role, content: m.content }));
      const res = await axios.post(`${API_URL}/chat`, { message: text, history });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      const raw = err.response?.data?.message || err.message || '';
      let errMsg;
      if (err.response?.status === 429 || raw.includes('429') || raw.includes('quota')) {
        errMsg = 'AI service is temporarily busy. Please wait and try again.';
      } else {
        errMsg = raw || 'Something went wrong. Please try again.';
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${errMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Chat cleared! Ask me anything about your finances.",
      },
    ]);
  };

  // Simple markdown renderer
  const renderContent = (text) => {
    return text.split('\n').map((line, i) => {
      const isBullet = /^[\-\*•]\s/.test(line);
      let processed = line.replace(/^[\-\*•]\s/, '');
      processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      processed = processed.replace(/\*(.+?)\*/g, '<em>$1</em>');
      processed = processed.replace(
        /`(.+?)`/g,
        `<code class="px-1 py-0.5 rounded text-xs font-mono ${darkMode ? 'bg-slate-700/50' : 'bg-slate-200/70'}">$1</code>`
      );

      if (isBullet) {
        return (
          <div key={i} className="flex gap-2 ml-1">
            <span className="text-blue-400 mt-0.5">-</span>
            <span dangerouslySetInnerHTML={{ __html: processed }} />
          </div>
        );
      }
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} dangerouslySetInnerHTML={{ __html: processed }} />;
    });
  };

  const showSuggestions = messages.length <= 1 && !loading;

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
      {/* Top bar */}
      <header className={`sticky top-0 z-10 border-b ${darkMode ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className={`p-2 rounded-lg transition ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
                <Bot className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h1 className="font-bold text-sm leading-tight">SPW Assistant</h1>
                <p className={`text-[10px] leading-tight ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>AI-powered financial insights</p>
              </div>
            </div>
          </div>
          <button
            onClick={clearChat}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
            title="Clear chat"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${
                  darkMode ? 'bg-blue-500/15' : 'bg-blue-50'
                }`}>
                  <Bot className="w-4 h-4 text-blue-500" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : darkMode
                      ? 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700/50'
                      : 'bg-white text-slate-700 rounded-bl-sm border border-slate-200 shadow-sm'
                }`}
              >
                {renderContent(msg.content)}
              </div>
              {msg.role === 'user' && (
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${
                  darkMode ? 'bg-slate-700' : 'bg-slate-100'
                }`}>
                  <User className="w-4 h-4 text-slate-400" />
                </div>
              )}
            </div>
          ))}

          {/* Suggestions */}
          {showSuggestions && (
            <div className="flex flex-wrap gap-2 pt-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => sendMessage(s.text)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    darkMode
                      ? 'border-slate-700 bg-slate-800 text-slate-300 hover:border-blue-500/50 hover:text-blue-400'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600 shadow-sm'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${
                darkMode ? 'bg-blue-500/15' : 'bg-blue-50'
              }`}>
                <Bot className="w-4 h-4 text-blue-500" />
              </div>
              <div className={`rounded-xl rounded-bl-sm px-4 py-3 border ${
                darkMode ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-slate-200'
              }`}>
                <div className="flex gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${darkMode ? 'bg-slate-500' : 'bg-slate-400'}`} style={{ animationDelay: '0ms' }} />
                  <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${darkMode ? 'bg-slate-500' : 'bg-slate-400'}`} style={{ animationDelay: '150ms' }} />
                  <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${darkMode ? 'bg-slate-500' : 'bg-slate-400'}`} style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <footer className={`sticky bottom-0 border-t ${darkMode ? 'border-slate-700/50 bg-slate-800' : 'border-slate-200 bg-white'}`}>
        <div className="max-w-3xl mx-auto px-6 py-3">
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 transition-colors ${
              darkMode
                ? 'bg-slate-700/50 border-slate-600 focus-within:border-blue-500'
                : 'bg-slate-50 border-slate-200 focus-within:border-blue-500'
            }`}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your finances..."
              disabled={loading}
              className={`flex-1 resize-none text-sm py-1.5 bg-transparent outline-none placeholder-slate-400 ${
                darkMode ? 'text-white' : 'text-slate-800'
              }`}
              style={{ maxHeight: '100px' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className={`p-2 rounded-lg transition-colors ${
                input.trim() && !loading
                  ? 'bg-blue-600 text-white hover:bg-blue-500'
                  : darkMode
                    ? 'bg-slate-600 text-slate-500'
                    : 'bg-slate-200 text-slate-400'
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className={`text-[10px] mt-1.5 text-center ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
            Powered by Gemini AI &middot; Not financial advice
          </p>
        </div>
      </footer>
    </div>
  );
}
