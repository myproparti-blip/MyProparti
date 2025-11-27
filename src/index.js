// index.js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "antd-mobile/es/global";
import "./index.css"; // Optional: your custom styles
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';


const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);