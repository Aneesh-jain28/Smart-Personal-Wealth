/**
 * Currency conversion utility
 *
 * Fetches real-time exchange rates and converts between fiat currencies
 * (USD, EUR, GBP) and cryptocurrencies (BTC, ETH).
 *
 * Uses:
 *  - ExchangeRate-API (free tier) for fiat rates
 *  - CoinGecko public API for crypto rates
 */

// Supported currencies
export const FIAT_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR'];
export const CRYPTO_CURRENCIES = ['BTC', 'ETH'];
export const ALL_CURRENCIES = [...FIAT_CURRENCIES, ...CRYPTO_CURRENCIES];

// Currency display metadata
export const CURRENCY_INFO = {
  USD: { symbol: '$', name: 'US Dollar', flag: '🇺🇸', type: 'fiat' },
  EUR: { symbol: '€', name: 'Euro', flag: '🇪🇺', type: 'fiat' },
  GBP: { symbol: '£', name: 'British Pound', flag: '🇬🇧', type: 'fiat' },
  INR: { symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', type: 'fiat' },
  BTC: { symbol: '₿', name: 'Bitcoin', flag: '🪙', type: 'crypto' },
  ETH: { symbol: 'Ξ', name: 'Ethereum', flag: '🪙', type: 'crypto' },
};

// Cache for exchange rates (refresh every 10 minutes)
let ratesCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Fetches fiat exchange rates relative to USD from ExchangeRate-API.
 * @returns {Object} e.g. { USD: 1, EUR: 0.92, GBP: 0.79 }
 */
async function fetchFiatRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data.result === 'success') {
      return {
        USD: 1,
        EUR: data.rates.EUR || 0.92,
        GBP: data.rates.GBP || 0.79,
        INR: data.rates.INR || 83.5,
      };
    }
  } catch (err) {
    console.warn('Failed to fetch fiat rates, using fallback:', err.message);
  }
  // Fallback rates
  return { USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.5 };
}

/**
 * Fetches crypto prices in USD from CoinGecko.
 * @returns {Object} e.g. { BTC: 62000, ETH: 3400 }
 */
async function fetchCryptoRates() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd'
    );
    const data = await res.json();
    return {
      BTC: data.bitcoin?.usd || 95000,
      ETH: data.ethereum?.usd || 3500,
    };
  } catch (err) {
    console.warn('Failed to fetch crypto rates, using fallback:', err.message);
  }
  // Fallback prices (approximate — updated periodically)
  return { BTC: 95000, ETH: 3500 };
}

/**
 * Fetches and caches all exchange rates (fiat + crypto) relative to USD.
 *
 * @param {boolean} forceRefresh - Force a fresh fetch ignoring cache
 * @returns {Object} Rate map: { USD: 1, EUR: 0.92, GBP: 0.79, BTC: 62000, ETH: 3400 }
 *   - Fiat values = how many units of that currency per 1 USD
 *   - Crypto values = how many USD per 1 unit of that crypto
 */
export async function fetchExchangeRates(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && ratesCache && now - cacheTimestamp < CACHE_TTL) {
    return ratesCache;
  }

  const [fiat, crypto] = await Promise.all([fetchFiatRates(), fetchCryptoRates()]);

  ratesCache = { ...fiat, ...crypto };
  cacheTimestamp = now;

  return ratesCache;
}

/**
 * Converts an amount from one currency to a target currency (default USD).
 *
 * @param {number} amount - The amount in the source currency
 * @param {string} fromCurrency - Source currency code (e.g. 'EUR', 'BTC')
 * @param {string} toCurrency - Target currency code (default: 'USD')
 * @param {Object} rates - Exchange rate map from fetchExchangeRates()
 * @returns {number} Converted amount in target currency
 */
export function convertCurrency(amount, fromCurrency, toCurrency = 'USD', rates) {
  if (!rates) {
    console.warn('[convertCurrency] No rates provided, returning original amount');
    return amount;
  }

  if (fromCurrency === toCurrency) return amount;

  // Step 1: Convert source to USD
  let amountInUSD;
  const fromInfo = CURRENCY_INFO[fromCurrency];

  if (!fromInfo) {
    console.warn(`[convertCurrency] Unknown currency: ${fromCurrency}`);
    return amount;
  }

  if (fromInfo.type === 'crypto') {
    // Crypto: rates[BTC] = price of 1 BTC in USD
    amountInUSD = amount * (rates[fromCurrency] || 1);
  } else {
    // Fiat: rates[EUR] = how many EUR per 1 USD → to get USD, divide
    amountInUSD = amount / (rates[fromCurrency] || 1);
  }

  // Step 2: Convert USD to target
  const toInfo = CURRENCY_INFO[toCurrency];
  if (!toInfo) {
    console.warn(`[convertCurrency] Unknown target currency: ${toCurrency}`);
    return amountInUSD;
  }

  if (toCurrency === 'USD') return amountInUSD;

  if (toInfo.type === 'crypto') {
    // USD to crypto: divide by crypto's USD price
    return amountInUSD / (rates[toCurrency] || 1);
  } else {
    // USD to fiat: multiply by fiat rate
    return amountInUSD * (rates[toCurrency] || 1);
  }
}

/**
 * Converts an array of accounts to a base currency using exchange rates.
 * Returns new account objects with balances converted to baseCurrency.
 *
 * @param {Array} accounts - Array of account objects (with `currency` field)
 * @param {string} baseCurrency - Target currency code (default: 'USD')
 * @param {Object} rates - Exchange rate map
 * @returns {Array} Accounts with balances converted to baseCurrency
 */
export function convertAccountsToBase(accounts, baseCurrency = 'USD', rates) {
  if (!rates) return accounts;

  return accounts.map((account) => {
    const currency = account.currency || 'USD';
    if (currency === baseCurrency) return account;

    const convertedBalance = convertCurrency(account.balance, currency, baseCurrency, rates);
    return {
      ...account,
      balance: Math.round(convertedBalance * 100) / 100,
      originalBalance: account.balance,
      originalCurrency: currency,
      currency: baseCurrency,
    };
  });
}

/**
 * Formats an amount with the appropriate currency symbol.
 *
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @returns {string} Formatted string
 */
export function formatCurrencyAmount(amount, currency = 'USD') {
  const info = CURRENCY_INFO[currency];
  if (!info) return `$${amount.toLocaleString()}`;

  if (info.type === 'crypto') {
    // Crypto: show more decimal places
    const formatted = Math.abs(amount) < 1
      ? amount.toFixed(6)
      : amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    return `${info.symbol}${formatted}`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
