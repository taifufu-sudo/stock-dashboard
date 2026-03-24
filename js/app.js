import { state } from './state.js';
import { fetchQuote, fetchChart } from './api.js';
import { fmtNum, fmtVol, colorClass, arrow, showToast } from './utils.js';
import { drawChart } from './chart.js';
import { renderStockList, saveWatchlist } from './watchlist.js';
import { renderIndicesBar, refreshIndices } from './indices.js';
import { fetchIndicators } from './indicators.js';

// ── Clock ──────────────────────────────────────────────────
function updateClock() {
  document.getElementById('clock').textContent = new Date().toLocaleString('zh-TW', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

// ── Indicators render ──────────────────────────────────────
function renderIndicators(ind, quote) {
  const panel = document.getElementById('indicators-panel');
  if (!ind) return;

  const fmt = (v, d = 1) => v != null ? v.toFixed(d) : '--';

  function kdSig(k, d) {
    if (k == null) return '';
    if (k >= 80) return '<span class="ind-sig ob">超買</span>';
    if (k <= 20) return '<span class="ind-sig os">超賣</span>';
    if (k > d)   return '<span class="ind-sig bull">金叉↑</span>';
    if (k < d)   return '<span class="ind-sig bear">死叉↓</span>';
    return '';
  }

  function rsiSig(r) {
    if (r == null) return '';
    if (r >= 70) return '<span class="ind-sig ob">超買</span>';
    if (r <= 30) return '<span class="ind-sig os">超賣</span>';
    if (r >= 50) return '<span class="ind-sig bull">偏多</span>';
    return '<span class="ind-sig bear">偏空</span>';
  }

  const p = quote?.price;
  const maClass = ma => (!p || !ma) ? '' : p >= ma ? 'up' : 'down';

  document.getElementById('ind-ma5').innerHTML  = `<span class="${maClass(ind.ma5)}">${fmt(ind.ma5, 2)}</span>`;
  document.getElementById('ind-ma20').innerHTML = `<span class="${maClass(ind.ma20)}">${fmt(ind.ma20, 2)}</span>`;
  document.getElementById('ind-ma60').innerHTML = `<span class="${maClass(ind.ma60)}">${fmt(ind.ma60, 2)}</span>`;
  document.getElementById('ind-dk').textContent       = fmt(ind.dailyK);
  document.getElementById('ind-dd').textContent       = fmt(ind.dailyD);
  document.getElementById('ind-dk-sig').innerHTML     = kdSig(ind.dailyK, ind.dailyD);
  document.getElementById('ind-mk').textContent       = fmt(ind.monthlyK);
  document.getElementById('ind-md').textContent       = fmt(ind.monthlyD);
  document.getElementById('ind-mk-sig').innerHTML     = kdSig(ind.monthlyK, ind.monthlyD);
  document.getElementById('ind-rsi').textContent      = fmt(ind.rsi);
  document.getElementById('ind-rsi-sig').innerHTML    = rsiSig(ind.rsi);

  panel.style.display = 'flex';
}

// ── Chart ──────────────────────────────────────────────────
async function loadChart(symbol, name) {
  state.currentSymbol = symbol;
  renderStockList();

  const loading = document.getElementById('chart-loading');
  loading.style.display = 'flex';
  loading.textContent = '載入中...';

  document.getElementById('chart-symbol').textContent = `${symbol}  ${name}`;

  let q = state.quoteCache[symbol];
  if (!q) {
    q = await fetchQuote(symbol);
    if (q) state.quoteCache[symbol] = q;
  }
  if (q) {
    const cc = colorClass(q.change);
    document.getElementById('chart-price').className = `chart-price-big ${cc}`;
    document.getElementById('chart-price').textContent = fmtNum(q.price);
    document.getElementById('chart-change').className = `chart-change-big ${cc}`;
    document.getElementById('chart-change').textContent = `${arrow(q.change)} ${fmtNum(q.change)} (${fmtNum(q.pct)}%)`;
    document.getElementById('chart-stats').innerHTML = `
      <div class="stat-item"><div class="stat-label">開盤</div><div class="stat-value">${fmtNum(q.open)}</div></div>
      <div class="stat-item"><div class="stat-label">最高</div><div class="stat-value up">${fmtNum(q.high)}</div></div>
      <div class="stat-item"><div class="stat-label">最低</div><div class="stat-value down">${fmtNum(q.low)}</div></div>
      <div class="stat-item"><div class="stat-label">成交量</div><div class="stat-value">${fmtVol(q.vol)}</div></div>
      ${q.mktCap ? `<div class="stat-item"><div class="stat-label">市值</div><div class="stat-value">${fmtVol(q.mktCap)}</div></div>` : ''}
      <div class="stat-item"><div class="stat-label">幣別</div><div class="stat-value">${q.currency || 'USD'}</div></div>
    `;
  }

  // 圖表資料 + 指標同步抓取（指標依 symbol 快取，換 range 不重抓）
  const needInd = !state.indicatorCache[symbol];
  const [ohlc, freshInd] = await Promise.all([
    fetchChart(symbol, state.currentRange),
    needInd ? fetchIndicators(symbol) : Promise.resolve(null),
  ]);
  if (freshInd) state.indicatorCache[symbol] = freshInd;

  loading.style.display = 'none';

  if (!ohlc || ohlc.length === 0) {
    loading.style.display = 'flex';
    loading.textContent = '無法載入圖表資料';
    return;
  }

  drawChart(ohlc, q);
  renderIndicators(state.indicatorCache[symbol] || null, q);
}

// ── Watchlist actions ──────────────────────────────────────
async function addStock() {
  const input = document.getElementById('symbol-input');
  let sym = input.value.trim().toUpperCase();
  if (!sym) return;
  if (/^\d{4,6}$/.test(sym)) sym = sym + '.TW';

  if (state.watchlist.find(s => s.symbol === sym)) {
    showToast(`${sym} 已在自選股中`);
    input.value = '';
    return;
  }

  showToast(`查詢 ${sym}...`);
  const q = await fetchQuote(sym);
  if (!q) {
    showToast(`找不到 ${sym}，請確認代碼`);
    return;
  }
  const name = sym;
  state.watchlist.push({ symbol: sym, name });
  saveWatchlist();
  state.quoteCache[sym] = q;
  renderStockList();
  input.value = '';
  showToast(`已加入 ${sym}`);
  loadChart(sym, name);
}

function removeStock(e, symbol) {
  e.stopPropagation();
  state.watchlist = state.watchlist.filter(s => s.symbol !== symbol);
  saveWatchlist();
  delete state.quoteCache[symbol];
  delete state.indicatorCache[symbol];
  if (state.currentSymbol === symbol) {
    state.currentSymbol = null;
    document.getElementById('chart-symbol').textContent = '選擇股票';
    document.getElementById('chart-price').textContent = '--';
    document.getElementById('chart-change').textContent = '';
    document.getElementById('chart-stats').innerHTML = '';
    document.getElementById('chart-loading').style.display = 'flex';
    document.getElementById('chart-loading').textContent = '點擊左側股票查看圖表';
  }
  renderStockList();
}

function switchTab(tab, el) {
  state.currentTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderStockList();
}

// ── Chart range ────────────────────────────────────────────
function changeRange(range, btn) {
  state.currentRange = range;
  document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (state.currentSymbol) {
    const s = state.watchlist.find(w => w.symbol === state.currentSymbol);
    loadChart(state.currentSymbol, s ? s.name : state.currentSymbol);
  }
}

// ── Refresh ────────────────────────────────────────────────
async function refreshWatchlistQuotes() {
  await Promise.all(state.watchlist.map(async s => {
    const q = await fetchQuote(s.symbol);
    if (q) state.quoteCache[s.symbol] = q;
  }));
  renderStockList();
  document.getElementById('last-update').textContent = new Date().toLocaleTimeString('zh-TW', { hour12: false });
}

async function refreshAll() {
  const btn = document.querySelector('.refresh-btn');
  btn.classList.add('spinning');
  await Promise.all([refreshIndices(), refreshWatchlistQuotes()]);
  btn.classList.remove('spinning');
  if (state.currentSymbol) {
    const s = state.watchlist.find(w => w.symbol === state.currentSymbol);
    loadChart(state.currentSymbol, s ? s.name : state.currentSymbol);
  }
}

function startAutoRefresh() {
  clearInterval(state.autoRefreshTimer);
  state.autoRefreshTimer = setInterval(() => {
    refreshIndices();
    refreshWatchlistQuotes();
  }, 60000);
}

// ── MA toggle ──────────────────────────────────────────────
function toggleMA(period, btn) {
  state.maEnabled[period] = !state.maEnabled[period];
  btn.classList.toggle('active', state.maEnabled[period]);
  if (state.currentSymbol && state.currentRange !== '1d') {
    const s = state.watchlist.find(w => w.symbol === state.currentSymbol);
    loadChart(state.currentSymbol, s ? s.name : state.currentSymbol);
  }
}

// ── Expose to window for inline HTML onclick handlers ──────
window.app = { loadChart, addStock, removeStock, switchTab, changeRange, refreshAll, toggleMA };

// ── Init ───────────────────────────────────────────────────
setInterval(updateClock, 1000);
updateClock();

document.getElementById('symbol-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') addStock();
});

(async () => {
  renderIndicesBar();
  renderStockList();
  await Promise.all([refreshIndices(), refreshWatchlistQuotes()]);
  if (state.watchlist.length > 0) {
    loadChart(state.watchlist[0].symbol, state.watchlist[0].name);
  }
  startAutoRefresh();
})();
