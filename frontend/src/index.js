import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './index.css';
import './App.css';
import './styles/responsive.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const resolveApiBaseUrl = () => {
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }

  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }

  return '';
};

const API_BASE_URL = resolveApiBaseUrl();

const normalizeLocalApiUrl = (url) => {
  if (!API_BASE_URL || typeof url !== 'string') {
    return url;
  }

  if (url.startsWith('/api/') || url.startsWith('/uploads/')) {
    return `${API_BASE_URL}${url}`;
  }

  if (url.startsWith('http://localhost:3000/api/') || url.startsWith('http://127.0.0.1:3000/api/')) {
    return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):3000/i, API_BASE_URL);
  }

  if (url.startsWith('http://localhost:3000/uploads/') || url.startsWith('http://127.0.0.1:3000/uploads/')) {
    return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):3000/i, API_BASE_URL);
  }

  return url;
};

if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === 'string') {
      return originalFetch(normalizeLocalApiUrl(input), init);
    }

    return originalFetch(input, init);
  };
}

if (API_BASE_URL) {
  axios.defaults.baseURL = API_BASE_URL;
  axios.interceptors.request.use((config) => {
    if (typeof config.url === 'string') {
      config.url = normalizeLocalApiUrl(config.url);
    }
    return config;
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();


