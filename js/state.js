import { DEFAULT_WATCHLIST } from './config.js';

// 所有模組共用同一個 state 物件，對屬性的修改會即時反映給所有 import 此模組的地方
export const state = {
  watchlist:       JSON.parse(localStorage.getItem('watchlist') || 'null') || DEFAULT_WATCHLIST,
  quoteCache:      {},
  currentSymbol:   null,
  currentRange:    '1d',
  chartInstance:   null,
  currentTab:      'all',
  autoRefreshTimer: null,
  maEnabled:       { 5: true, 20: true, 60: true },
  indicatorCache:  {},
};
