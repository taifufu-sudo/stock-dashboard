import { state } from './state.js';
import { fmtNum, colorClass, arrow } from './utils.js';

export function saveWatchlist() {
  localStorage.setItem('watchlist', JSON.stringify(state.watchlist));
}

export function getFilteredList() {
  if (state.currentTab === 'tw') return state.watchlist.filter(s => s.symbol.endsWith('.TW') || s.symbol.endsWith('.TWO'));
  if (state.currentTab === 'us') return state.watchlist.filter(s => !s.symbol.includes('.'));
  return state.watchlist;
}

export function renderStockList() {
  const list = document.getElementById('stock-list');
  const filtered = getFilteredList();
  document.getElementById('watchlist-count').textContent = `${filtered.length} 支`;

  if (filtered.length === 0) {
    list.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:13px;">尚無自選股</div>`;
    return;
  }

  list.innerHTML = filtered.map(s => {
    const q = state.quoteCache[s.symbol];
    const priceHtml = q
      ? `<div class="stock-price ${colorClass(q.change)}">${fmtNum(q.price)}</div>
         <div class="stock-pct ${colorClass(q.pct)}">${arrow(q.pct)} ${fmtNum(Math.abs(q.pct))}%</div>`
      : `<div class="stock-price skeleton" style="height:16px;width:60px;">&nbsp;</div>
         <div class="stock-pct skeleton" style="height:12px;width:50px;margin-top:3px;">&nbsp;</div>`;
    const active = s.symbol === state.currentSymbol ? 'active' : '';
    return `
      <div class="stock-item ${active}" onclick="app.loadChart('${s.symbol}','${s.name}')">
        <div class="stock-info">
          <div class="stock-symbol">${s.symbol}</div>
          <div class="stock-name">${s.name}</div>
        </div>
        <div class="stock-prices">${priceHtml}</div>
        <button class="remove-btn" onclick="app.removeStock(event,'${s.symbol}')" title="移除">✕</button>
      </div>`;
  }).join('');
}
