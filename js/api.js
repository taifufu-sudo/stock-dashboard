import { PROXY } from './config.js';

export async function fetchQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  try {
    const res = await fetch(PROXY + encodeURIComponent(url));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const meta = data.chart.result[0].meta;
    const price = meta.regularMarketPrice;
    const prev  = meta.chartPreviousClose || meta.previousClose;
    const change = price - prev;
    const pct = (change / prev) * 100;
    return {
      symbol,
      price,
      change,
      pct,
      open:    meta.regularMarketOpen,
      high:    meta.regularMarketDayHigh,
      low:     meta.regularMarketDayLow,
      vol:     meta.regularMarketVolume,
      mktCap:  meta.marketCap,
      currency: meta.currency,
    };
  } catch (e) {
    console.warn('quote fetch failed', symbol, e);
    return null;
  }
}

export async function fetchChart(symbol, range) {
  const intervalMap = { '1d': '5m', '5d': '15m', '1mo': '1d', '3mo': '1d', '6mo': '1d', '1y': '1wk', '5y': '1mo' };
  const interval = intervalMap[range] || '1d';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  try {
    const res = await fetch(PROXY + encodeURIComponent(url));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const ohlc = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (!quotes.close[i]) continue;
      ohlc.push({
        time:   timestamps[i],
        open:   quotes.open[i]   || quotes.close[i],
        high:   quotes.high[i]   || quotes.close[i],
        low:    quotes.low[i]    || quotes.close[i],
        close:  quotes.close[i],
        value:  quotes.close[i],
        volume: quotes.volume[i] || 0,
      });
    }
    return ohlc;
  } catch (e) {
    console.warn('chart fetch failed', symbol, e);
    return null;
  }
}
