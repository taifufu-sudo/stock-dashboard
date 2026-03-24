import { PROXY } from './config.js';

// ── 原始 OHLC 資料抓取 ────────────────────────────────────
async function fetchOHLC(symbol, interval, range) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  try {
    const res = await fetch(PROXY + encodeURIComponent(url));
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.chart.result[0];
    const ts = result.timestamp;
    const q  = result.indicators.quote[0];
    return ts.map((t, i) => ({
      time:  t,
      open:  q.open[i]  ?? q.close[i],
      high:  q.high[i]  ?? q.close[i],
      low:   q.low[i]   ?? q.close[i],
      close: q.close[i],
    })).filter(d => d.close != null);
  } catch {
    return null;
  }
}

// ── 指標計算 ──────────────────────────────────────────────
function calcMALatest(data, period) {
  if (!data || data.length < period) return null;
  const slice = data.slice(-period);
  return slice.reduce((s, d) => s + d.close, 0) / period;
}

// KD 隨機指標（台灣標準：9日回顧，1/3 平滑）
function calcKD(data, period = 9) {
  if (!data || data.length < period) return null;
  let k = 50, d = 50;
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const ll  = Math.min(...slice.map(x => x.low));
    const hh  = Math.max(...slice.map(x => x.high));
    const rsv = hh === ll ? 50 : ((data[i].close - ll) / (hh - ll)) * 100;
    k = (2 / 3) * k + (1 / 3) * rsv;
    d = (2 / 3) * d + (1 / 3) * k;
  }
  return { k, d };
}

// RSI（Wilder 平滑，14 期）
function calcRSI(data, period = 14) {
  if (!data || data.length < period + 1) return null;
  const changes = data.slice(1).map((d, i) => d.close - data[i].close);
  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += -changes[i];
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + Math.max(0,  changes[i])) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -changes[i])) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

// ── 主要入口：同時抓日線 + 月線，計算所有指標 ────────────
export async function fetchIndicators(symbol) {
  const [daily, monthly] = await Promise.all([
    fetchOHLC(symbol, '1d', '1y'),
    fetchOHLC(symbol, '1mo', '5y'),
  ]);

  const dkd = calcKD(daily, 9);
  const mkd = calcKD(monthly, 9);

  return {
    ma5:      calcMALatest(daily, 5),
    ma20:     calcMALatest(daily, 20),
    ma60:     calcMALatest(daily, 60),
    dailyK:   dkd?.k ?? null,
    dailyD:   dkd?.d ?? null,
    monthlyK: mkd?.k ?? null,
    monthlyD: mkd?.d ?? null,
    rsi:      calcRSI(daily, 14),
  };
}
