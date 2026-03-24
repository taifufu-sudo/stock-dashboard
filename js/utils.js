export function fmtNum(n, dec = 2) {
  if (n == null) return '--';
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function fmtVol(n) {
  if (!n) return '--';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toString();
}

export function colorClass(v) {
  return v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
}

export function arrow(v) {
  return v > 0 ? '▲' : v < 0 ? '▼' : '';
}

export function showToast(msg, duration = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}
