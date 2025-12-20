import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Trash2 } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/ai';

export default function AiChat({ darkMode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hey! I'm **SPW Assistant** - I can see your accounts and scenarios. Ask me anything about your finances.",
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
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
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

  // Floating button
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium shadow-lg transition-all duration-200 hover:scale-105 ${
          darkMode
            ? 'bg-slate-700 text-slate-200 shadow-black/30 hover:bg-slate-600'
            : 'bg-slate-800 text-white shadow-slate-400/30 hover:bg-slate-700'
        }`}
        aria-label="Open AI chat"
      >
        <MessageCircle className="w-4 h-4" />
        <span className="text-sm">Ask AI</span>
      </button>
    );
  }

  // Chat panel
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-[400px] max-h-[560px] flex flex-col rounded-xl shadow-2xl border transition-colors ${
        darkMode
          ? 'bg-slate-900 border-slate-700 shadow-black/40'
          : 'bg-white border-slate-200 shadow-slate-400/20'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b rounded-t-xl ${
        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            darkMode ? 'bg-blue-500/15' : 'bg-blue-50'
          }`}>
            <Bot className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div>
            <h3 className={`font-bold text-xs leading-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>SPW Assistant</h3>
            <p className={`text-[10px] leading-tight ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>AI-powered insights</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={clearChat}
            className={`p-1.5 rounded-lg transition ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
            title="Clear chat"
          >
            <Trash2 className={`w-3.5 h-3.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
          </button>
          <button
            onClick={() => setOpen(false)}
            className={`p-1.5 rounded-lg transition ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
            title="Close"
          >
            <X className={`w-3.5 h-3.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[280px] max-h-[400px] ${
        darkMode ? 'bg-slate-900' : 'bg-white'
      }`}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center mt-0.5 ${
                darkMode ? 'bg-blue-500/15' : 'bg-blue-50'
              }`}>
                <Bot className="w-3 h-3 text-blue-500" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : darkMode
                    ? 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700/50'
                    : 'bg-slate-50 text-slate-700 rounded-bl-sm border border-slate-200'
              }`}
            >
              {renderContent(msg.content)}
            </div>
            {msg.role === 'user' && (
              <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center mt-0.5 ${
                darkMode ? 'bg-slate-700' : 'bg-slate-100'
              }`}>
                <User className="w-3 h-3 text-slate-400" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 justify-start">
            <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center mt-0.5 ${
              darkMode ? 'bg-blue-500/15' : 'bg-blue-50'
            }`}>
              <Bot className="w-3 h-3 text-blue-500" />
            </div>
            <div className={`rounded-xl rounded-bl-sm px-3 py-2.5 border ${
              darkMode ? 'bg-slate-800 border-slate-700/50' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex gap-1">
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${darkMode ? 'bg-slate-500' : 'bg-slate-400'}`} style={{ animationDelay: '0ms' }} />
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${darkMode ? 'bg-slate-500' : 'bg-slate-400'}`} style={{ animationDelay: '150ms' }} />
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${darkMode ? 'bg-slate-500' : 'bg-slate-400'}`} style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={`px-3 py-2.5 border-t rounded-b-xl ${
        darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'
      }`}>
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors ${
          darkMode
            ? 'bg-slate-700/50 border-slate-600 focus-within:border-blue-500'
            : 'bg-white border-slate-200 focus-within:border-blue-500'
        }`}>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your finances..."
            disabled={loading}
            className={`flex-1 resize-none text-[13px] py-1 bg-transparent outline-none placeholder-slate-400 ${
              darkMode ? 'text-white' : 'text-slate-800'
            }`}
            style={{ maxHeight: '72px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className={`p-1.5 rounded-md transition-colors ${
              input.trim() && !loading
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : darkMode
                  ? 'bg-slate-600 text-slate-500'
                  : 'bg-slate-200 text-slate-400'
            }`}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className={`text-[9px] mt-1 text-center ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
          Powered by Gemini AI
        </p>
      </div>
    </div>
  );
}
