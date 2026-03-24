import { INDICES } from './config.js';
import { fetchQuote } from './api.js';
import { fmtNum, colorClass, arrow } from './utils.js';

export function renderIndicesBar() {
  const bar = document.getElementById('indices-bar');
  bar.innerHTML = INDICES.map(idx => `
    <div class="index-card" id="idx-${idx.symbol.replace(/\^/, '')}" onclick="app.loadChart('${idx.symbol}','${idx.name}')">
      <div class="index-name">${idx.name}</div>
      <div class="index-price skeleton" style="height:22px;width:90px;">&nbsp;</div>
      <div class="index-change skeleton" style="height:14px;width:70px;margin-top:4px;">&nbsp;</div>
    </div>
  `).join('');
}

export async function refreshIndices() {
  await Promise.all(INDICES.map(async idx => {
    const q = await fetchQuote(idx.symbol);
    if (!q) return;
    const id = 'idx-' + idx.symbol.replace(/\^/, '');
    const card = document.getElementById(id);
    if (!card) return;
    const cc = colorClass(q.change);
    card.querySelector('.index-price').outerHTML = `<div class="index-price ${cc}">${fmtNum(q.price)}</div>`;
    card.querySelectorAll('.index-change,.skeleton')[0]?.remove();
    const existing = card.querySelector('.index-change');
    if (existing) {
      existing.className = 'index-change ' + cc;
      existing.textContent = `${arrow(q.change)} ${fmtNum(Math.abs(q.change))} (${fmtNum(Math.abs(q.pct))}%)`;
    } else {
      card.insertAdjacentHTML('beforeend', `<div class="index-change ${cc}">${arrow(q.change)} ${fmtNum(Math.abs(q.change))} (${fmtNum(Math.abs(q.pct))}%)</div>`);
    }
  }));
}
