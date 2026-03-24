import { state } from './state.js';

const MA_CONFIG = [
  { period: 5,  color: '#ffa726' },
  { period: 20, color: '#42a5f5' },
  { period: 60, color: '#ab47bc' },
];

function calcMA(data, period) {
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.close, 0);
    result.push({ time: data[i].time, value: +(sum / period).toFixed(4) });
  }
  return result;
}

export function drawChart(ohlc, quote) {
  const container = document.getElementById('chart-container');

  if (state.chartInstance) {
    state.chartInstance.remove();
    state.chartInstance = null;
  }

  const chart = LightweightCharts.createChart(container, {
    width:  container.clientWidth,
    height: container.clientHeight,
    layout: {
      background: { color: '#1a1d2e' },
      textColor: '#8892a4',
    },
    grid: {
      vertLines: { color: '#2e3155' },
      horzLines: { color: '#2e3155' },
    },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    rightPriceScale: { borderColor: '#2e3155' },
    timeScale: {
      borderColor: '#2e3155',
      timeVisible: true,
      secondsVisible: false,
    },
  });

  const upColor   = '#26a69a';
  const downColor = '#ef5350';

  if (state.currentRange === '1d') {
    const areaSeries = chart.addAreaSeries({
      lineColor:   quote && quote.change >= 0 ? upColor : downColor,
      topColor:    quote && quote.change >= 0 ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)',
      bottomColor: 'rgba(0,0,0,0)',
      lineWidth: 2,
    });
    areaSeries.setData(ohlc.map(d => ({ time: d.time, value: d.value })));
  } else {
    const candleSeries = chart.addCandlestickSeries({
      upColor, downColor,
      borderUpColor: upColor, borderDownColor: downColor,
      wickUpColor:   upColor, wickDownColor:   downColor,
    });
    candleSeries.setData(ohlc);
  }

  // MA lines（僅限非當日 K 線，才有統計意義）
  if (state.currentRange !== '1d') {
    for (const { period, color } of MA_CONFIG) {
      if (!state.maEnabled[period]) continue;
      const maData = calcMA(ohlc, period);
      if (maData.length === 0) continue;
      const maSeries = chart.addLineSeries({
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      maSeries.setData(maData);
    }
  }

  chart.timeScale().fitContent();

  const ro = new ResizeObserver(() => {
    chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
  });
  ro.observe(container);

  state.chartInstance = chart;
  chart._ro = ro;
}
