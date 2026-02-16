/**
 * Format a number as Indian Rupees (INR) currency.
 * Centralized to allow future configuration via system settings.
 */
export const CURRENCY_SYMBOL = '₹';
export const LOCALE = 'en-IN';
export const DEFAULT_CURRENCY_CODE = 'INR';

export const formatCurrency = (amount, options = {}) => {
  const num = Number(amount) || 0;
  const { maximumFractionDigits = 0, showSymbol = true } = options;
  const formatted = num.toLocaleString(LOCALE, { maximumFractionDigits });
  return showSymbol ? `${CURRENCY_SYMBOL}${formatted}` : formatted;
};

export const CURRENCY_CONFIG = { symbol: CURRENCY_SYMBOL, locale: LOCALE, code: DEFAULT_CURRENCY_CODE };

export default formatCurrency;
