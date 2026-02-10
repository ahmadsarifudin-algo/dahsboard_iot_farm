# Frontend Placeholder

This directory will contain the frontend application for the IoT Dashboard.

## Recommended Setup

### Option 1: React with Vite
```bash
npm create vite@latest . -- --template react
npm install
```

### Option 2: Next.js
```bash
npx create-next-app@latest .
```

### Option 3: Vue.js
```bash
npm create vue@latest .
```

## Required Dependencies
After initializing, install these additional packages:
```bash
# Data visualization
npm install recharts chart.js react-chartjs-2 d3

# Real-time communication
npm install socket.io-client

# State management
npm install zustand
# or
npm install @reduxjs/toolkit react-redux

# UI components
npm install @mui/material @emotion/react @emotion/styled
# or
npm install antd

# HTTP client
npm install axios
```
