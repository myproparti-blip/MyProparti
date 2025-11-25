// utils/performance.js
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Prevent multiple rapid clicks
export const preventMultipleClicks = (func, interval = 500) => {
  let lastClickTime = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastClickTime > interval) {
      lastClickTime = now;
      func(...args);
    }
  };
};