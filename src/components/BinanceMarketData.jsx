import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
// import './BinanceMarketData.css'; // Import CSS for additional styles

const BinanceMarketData = () => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const wsRef = useRef(null);

  const [symbol, setSymbol] = useState('ethusdt');
  const [interval, setInterval] = useState('1m');
  const [candlestickData, setCandlestickData] = useState({});
  const [currentData, setCurrentData] = useState([]);

  const saveDataToLocalStorage = (symbol, data) => {
    localStorage.setItem(symbol, JSON.stringify(data));
  };

  const loadDataFromLocalStorage = (symbol) => {
    const savedData = localStorage.getItem(symbol);
    return savedData ? JSON.parse(savedData) : [];
  };

  const connectWebSocket = (symbol, interval) => {
    const wsUrl = `wss://stream.binance.com:9443/ws/${symbol}@kline_${interval}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected for', symbol);
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setTimeout(() => connectWebSocket(symbol, interval), 1000);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const candlestick = {
        time: Math.floor(data.k.t / 1000), // Convert to seconds
        open: parseFloat(data.k.o),
        high: parseFloat(data.k.h),
        low: parseFloat(data.k.l),
        close: parseFloat(data.k.c),
      };

      setCandlestickData((prevData) => {
        const updatedData = { ...prevData };
        const symbolData = updatedData[symbol] || [];

        // Only add new data if it's not a duplicate and it's newer
        const lastData = symbolData[symbolData.length - 1];
        if (!lastData || lastData.time < candlestick.time) {
          symbolData.push(candlestick);
        }

        // Sort data by time
        symbolData.sort((a, b) => a.time - b.time);
        
        // Save to local storage
        saveDataToLocalStorage(symbol, symbolData);
        
        // Update the candlestickData for the current symbol
        updatedData[symbol] = symbolData;

        return updatedData;
      });

      // Update current data for the chart
      setCurrentData((prevData) => {
        const updatedCurrentData = [...prevData];
        const lastCurrentData = updatedCurrentData[updatedCurrentData.length - 1];

        // Only update the chart if it's not disposed
        if (candlestickSeriesRef.current && (!lastCurrentData || lastCurrentData.time < candlestick.time)) {
          candlestickSeriesRef.current.update(candlestick);
          updatedCurrentData.push(candlestick);
        }

        return updatedCurrentData;
      });
    };

    ws.onclose = () => {
      console.log('WebSocket closed, reconnecting...');
      setTimeout(() => connectWebSocket(symbol, interval), 1000);
    };
  };

  useEffect(() => {
    // Initialize TradingView Lightweight Chart
    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        backgroundColor: '#1C1C27', // Dark background
        textColor: '#050b11', // Light text
      },
      grid: {
        vertLines: {
          color: '#f0f0f3', // Darker grid lines
        },
        horzLines: {
          color: '#e3e3ee', // Darker grid lines
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
      },
    });

    // Create the candlestick series
    candlestickSeriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#4CAF50',
      downColor: '#FF5252',
      borderDownColor: '#FF5252',
      borderUpColor: '#4CAF50',
      wickDownColor: '#FF5252',
      wickUpColor: '#4CAF50',
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    // Load data from local storage when switching symbols
    const cachedData = loadDataFromLocalStorage(symbol);
    if (cachedData.length) {
      setCurrentData(cachedData);
      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData(cachedData); // Load previous data into the chart
      }
    } else {
      setCurrentData([]);
    }

    connectWebSocket(symbol, interval);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [symbol, interval]);

  return (
    <div className="container">
      <h1 className="title">Binance Market Data WebSocket (TradingView Charts)</h1>

      <div className="dropdown-container">
        <label htmlFor="symbolDropdown">Select Cryptocurrency: </label>
        <select
          id="symbolDropdown"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="dropdown"
        >
          <option value="ethusdt">ETH/USDT</option>
          <option value="bnbusdt">BNB/USDT</option>
          <option value="dotusdt">DOT/USDT</option>
        </select>
      </div>

      <div className="dropdown-container">
        <label htmlFor="intervalDropdown">Select Interval: </label>
        <select
          id="intervalDropdown"
          value={interval}
          onChange={(e) => setInterval(e.target.value)}
          className="dropdown"
        >
          <option value="1m">1 Minute</option>
          <option value="3m">3 Minutes</option>
          <option value="5m">5 Minutes</option>
        </select>
      </div>

      <div
        ref={chartContainerRef}
        style={{ width: '100%', height: '400px', marginTop: '20px' ,color:"black"}}
      />
    </div>
  );
};

export default BinanceMarketData;
