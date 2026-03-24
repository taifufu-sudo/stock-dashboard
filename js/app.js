import { state } from './state.js';
import { fetchQuote, fetchChart } from './api.js';
import { fmtNum, fmtVol, colorClass, arrow, showToast } from './utils.js';
import { drawChart } from './chart.js';
import { renderStockList, saveWatchlist } from './watchlist.js';
import { renderIndicesBar, refreshIndices } from './indices.js';

// ── Clock ──────────────────────────────────────────────────
function updateClock() {
  document.getElementById('clock').textContent = new Date().toLocaleString('zh-TW', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
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

  const ohlc = await fetchChart(symbol, state.currentRange);
  loading.style.display = 'none';

  if (!ohlc || ohlc.length === 0) {
    loading.style.display = 'flex';
    loading.textContent = '無法載入圖表資料';
    return;
  }

  drawChart(ohlc, q);
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

// ── Expose to window for inline HTML onclick handlers ──────
window.app = { loadChart, addStock, removeStock, switchTab, changeRange, refreshAll };

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
