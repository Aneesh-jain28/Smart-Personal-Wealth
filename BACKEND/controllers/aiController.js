const axios = require('axios');
const UserFinancials = require('../models/UserFinancials');

// ── Mistral AI Configuration ─────────────────────────────────────────
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || '';
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

// Models to try in order (fallback chain)
const MODEL_CHAIN = [
  'mistral-small-latest',
  'open-mistral-nemo',
  'mistral-tiny',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Send a chat completion request to Mistral AI with retry + model fallback.
 */
async function sendToMistral(messages) {
  if (!MISTRAL_API_KEY) {
    const err = new Error('No Mistral API key configured. Add MISTRAL_API_KEY to .env.');
    err.status = 500;
    throw err;
  }

  for (const model of MODEL_CHAIN) {
    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        const response = await axios.post(
          MISTRAL_API_URL,
          {
            model,
            messages,
            max_tokens: 4096,
            temperature: 0.7,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${MISTRAL_API_KEY}`,
            },
            timeout: 30000,
          }
        );

        const reply = response.data?.choices?.[0]?.message?.content;
        if (reply) return reply;

        throw new Error('Empty response from Mistral AI');
      } catch (err) {
        const status = err.response?.status;
        const msg = err.response?.data?.message || err.message || '';

        // Model not found → try next model
        if (status === 404 || msg.includes('not found')) {
          console.warn(`[AI] Model ${model} not found, trying next…`);
          break;
        }

        // Rate limited → retry with backoff
        if (status === 429) {
          if (attempt < 2) {
            const delay = (attempt + 1) * 2000;
            console.warn(`[AI] ${model} rate limited, retry #${attempt + 1} in ${delay}ms`);
            await sleep(delay);
            continue;
          }
          console.warn(`[AI] ${model} rate limit exhausted, trying next model…`);
          break;
        }

        // Auth error → no point retrying
        if (status === 401 || status === 403) {
          const authErr = new Error('Mistral API key is invalid or expired. Check MISTRAL_API_KEY in .env.');
          authErr.status = 401;
          throw authErr;
        }

        // Server error → retry
        if (status >= 500 && attempt < 2) {
          const delay = (attempt + 1) * 1500;
          console.warn(`[AI] ${model} server error (${status}), retry #${attempt + 1} in ${delay}ms`);
          await sleep(delay);
          continue;
        }

        // Unknown error on last attempt
        if (attempt === 2) {
          console.error(`[AI] ${model} failed after 3 attempts:`, msg);
          break;
        }

        throw err;
      }
    }
  }

  const err = new Error('AI service is temporarily unavailable. Please try again in a moment.');
  err.status = 429;
  throw err;
}

/**
 * Build a concise snapshot of the user's financial data so the AI has context.
 */
function buildFinancialContext(financials) {
  if (!financials) return 'The user has not added any financial data yet.';

  const { accounts = [], scenarios = [] } = financials;
  const summary = [];

  if (accounts.length === 0) {
    summary.push('Accounts: none added yet.');
  } else {
    const savings = accounts.filter((a) => a.type === 'savings');
    const investments = accounts.filter((a) => a.type === 'investment');
    const debts = accounts.filter((a) => a.type === 'debt');

    const total = accounts.reduce((s, a) => s + a.balance, 0);
    summary.push(`Net worth across ${accounts.length} account(s): $${total.toLocaleString()}`);

    if (savings.length)
      summary.push(
        `Savings (${savings.length}): ` +
          savings.map((a) => `${a.name} ${a.currency} ${a.balance.toLocaleString()} @ ${a.annualGrowthRate}%`).join(', ')
      );
    if (investments.length)
      summary.push(
        `Investments (${investments.length}): ` +
          investments.map((a) => `${a.name} ${a.currency} ${a.balance.toLocaleString()} @ ${a.annualGrowthRate}% ±${a.standardDeviation || 0}%`).join(', ')
      );
    if (debts.length)
      summary.push(
        `Debts (${debts.length}): ` +
          debts.map((a) => `${a.name} ${a.currency} ${a.balance.toLocaleString()} APR ${a.interestRate}%`).join(', ')
      );
  }

  if (scenarios.length) {
    summary.push(
      `What-if scenarios: ` +
        scenarios.map((s) => `${s.label} (${s.type}, $${s.amount.toLocaleString()}, year ${s.startYear}${s.isRecurring ? ', recurring ' + s.frequency : ''})`).join('; ')
    );
  }

  return summary.join('\n');
}

const SYSTEM_PROMPT = `You are **SPW Assistant**, an expert-level AI financial advisor built into the Smart Personal Wealth app. You have deep knowledge of global financial markets, investment vehicles, tax strategies, and personal finance planning.

═══ CORE BEHAVIOUR ═══

1. **Always lead with numbers.** Every answer must include concrete figures — expected returns (%), risk levels, projected values, historical performance, and cost breakdowns. Never give vague answers like "it depends" without following up with actual calculations.

2. **Investment analysis mode:** When a user asks where to invest a specific amount:
   • Break down ALL realistic options: stocks (index funds, blue-chip, sectoral), mutual funds (equity, debt, hybrid), fixed deposits, government bonds/PPF/NPS, gold (physical, ETFs, sovereign bonds), real estate (REITs), crypto (BTC, ETH — with high-risk warning), SIPs, and any other relevant instruments.
   • For EACH option show a mini table or structured breakdown:
     - Expected annual return range (conservative / moderate / aggressive)
     - Risk level (Low / Medium / High / Very High) with a 1-10 score
     - Minimum investment period for best results
     - Liquidity (how quickly they can exit)
     - Tax implications (brief)
   • Suggest a **recommended portfolio split** based on the user's amount, existing holdings (from their financial snapshot), and risk tolerance.
   • Show projected value after 1, 3, 5, and 10 years using compound interest formula.
   • Example: "If you invest ₹50,000 in Nifty 50 index fund at ~12% avg return → ₹56,000 (1yr) → ₹70,200 (3yr) → ₹88,100 (5yr) → ₹1,55,300 (10yr)"

3. **Risk calculation:** For every investment suggestion:
   • Show best-case, expected-case, and worst-case scenarios with actual numbers.
   • Mention maximum historical drawdown where relevant (e.g., "Nifty 50 dropped ~38% in March 2020 crash").
   • Calculate how much the user could lose in a worst-case year.
   • If the user's portfolio is concentrated, warn about diversification.

4. **Depth on demand:** Start with a clear, structured summary. If the user asks for more detail, go deeper:
   • Specific fund/stock recommendations with rationale
   • Step-by-step how-to (which app/broker to use, account setup)
   • Detailed tax calculations (LTCG, STCG, tax-loss harvesting)
   • Comparison tables between similar instruments
   • Dollar-cost averaging vs lump sum analysis with numbers

5. **Use the user's financial snapshot** (provided below) to personalize every response:
   • Reference their actual account balances, growth rates, and debts
   • Factor in their existing investments when suggesting new allocations
   • If they have debt, calculate whether paying off debt vs investing is better (compare interest rates)
   • Adjust currency based on their accounts (₹, $, €, etc.)

═══ FORMATTING RULES ═══

• Use **bold** for key numbers and important terms
• Use bullet points and numbered lists for clarity
• Use simple tables (markdown) for comparisons
• Break complex answers into sections with headers
• Use analogies and simple language — explain like talking to a smart friend, not a finance professor
• For calculations, show the formula briefly: "Using compound interest: A = P(1 + r)^n"

═══ IMPORTANT GUIDELINES ═══

• Base your market analysis on well-known historical averages and widely-accepted financial principles (e.g., Nifty 50 historical CAGR ~12%, S&P 500 ~10%, FD rates ~7%, gold ~8-10%)
• Never guarantee returns — always say "historically" or "expected" or "approximate"
• For crypto, always flag it as high-risk/speculative and suggest limiting to 5-10% of portfolio
• When discussing Indian markets, use ₹ and reference NSE/BSE, SEBI regulations, Indian tax rules
• When discussing US/global markets, use $ and reference relevant regulations
• If a user seems to be a beginner, explain jargon (SIP, NAV, CAGR, P/E ratio, etc.)
• End investment advice with: "⚠️ This is educational guidance based on historical data, not professional financial advice. Past performance doesn't guarantee future returns. Consider consulting a SEBI-registered advisor for personalized recommendations."

═══ PERSONALITY ═══

Tone: Confident, friendly, data-driven. Like a knowledgeable friend who happens to be a financial analyst. Use simple language but don't dumb things down. Be direct — if something is a bad idea, say so clearly with reasoning.`;

/**
 * POST /api/ai/chat
 * Body: { message: string, history?: [{ role, content }] }
 */
exports.chat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    // Input length validation
    if (message.length > 5000) {
      return res.status(400).json({ success: false, message: 'Message is too long. Maximum 5000 characters.' });
    }

    if (!Array.isArray(history) || history.length > 50) {
      return res.status(400).json({ success: false, message: 'Conversation history is too long. Maximum 50 turns.' });
    }

    if (!MISTRAL_API_KEY) {
      return res.status(500).json({ success: false, message: 'AI service is not configured. Set MISTRAL_API_KEY in .env.' });
    }

    // Fetch user's financial data for context
    const financials = await UserFinancials.findOne({ userId: req.user._id });
    const financialContext = buildFinancialContext(financials);

    // Build messages array for Mistral (OpenAI-compatible format)
    const messages = [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\n--- USER'S FINANCIAL SNAPSHOT ---\n${financialContext}\n--- END SNAPSHOT ---`,
      },
      // Prior conversation turns
      ...history.map((h) => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content,
      })),
      // Current user message
      {
        role: 'user',
        content: message,
      },
    ];

    const reply = await sendToMistral(messages);

    return res.json({ success: true, reply });
  } catch (err) {
    console.error('AI chat error:', err.message || err);
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Something went wrong with the AI service.',
    });
  }
};
