import { state } from './state.js';

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

  chart.timeScale().fitContent();

  const ro = new ResizeObserver(() => {
    chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
  });
  ro.observe(container);

  state.chartInstance = chart;
  chart._ro = ro;
}
