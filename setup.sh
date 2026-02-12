#!/bin/bash
# =============================================
# Zgharta Tourism App - Project Setup Script
# =============================================
# Run from inside the zgharta-tourism directory:
#   bash setup.sh
# =============================================

echo "🇱🇧 Setting up Zgharta Tourism App..."

# Create directories
mkdir -p public src

# --- package.json ---
cat > package.json << 'PACKAGEEOF'
{
  "name": "zgharta-tourism",
  "version": "1.0.0",
  "private": true,
  "description": "Bilingual tourism app for Zgharta Caza, North Lebanon",
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "lucide-react": "^0.263.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
  }
}
PACKAGEEOF

# --- .env ---
cat > .env << 'ENVEOF'
REACT_APP_SUPABASE_URL=https://mhohpseegfnfzycxvcuk.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sb_publishable_1d7gkxEaroVhrEUPYOMVIQ_uSjdM8Gc
ENVEOF

# --- .gitignore ---
cat > .gitignore << 'GITEOF'
/node_modules
/build
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local
npm-debug.log*
GITEOF

# --- vercel.json ---
cat > vercel.json << 'VERCELEOF'
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
VERCELEOF

# --- public/index.html ---
cat > public/index.html << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <meta name="theme-color" content="#10b981" />
  <meta name="description" content="Discover Zgharta Caza - Tourism guide for North Lebanon" />
  <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet" />
  <title>Zgharta Caza Tourism</title>
</head>
<body>
  <noscript>You need to enable JavaScript to run this app.</noscript>
  <div id="root"></div>
</body>
</html>
HTMLEOF

# --- public/manifest.json ---
cat > public/manifest.json << 'MANIFESTEOF'
{
  "short_name": "Zgharta",
  "name": "Zgharta Caza Tourism",
  "icons": [],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#10b981",
  "background_color": "#f9fafb"
}
MANIFESTEOF

# --- src/index.css ---
cat > src/index.css << 'CSSEOF'
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  background: #f9fafb;
  overscroll-behavior-y: contain;
}
::-webkit-scrollbar { display: none; }
html { scroll-behavior: smooth; -ms-overflow-style: none; scrollbar-width: none; }
CSSEOF

# --- src/index.js ---
cat > src/index.js << 'INDEXEOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import ZghartaTourismApp from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ZghartaTourismApp />
  </React.StrictMode>
);
INDEXEOF

echo "✅ Config files created!"
echo ""
echo "⚠️  Now you need to add src/App.js manually:"
echo "   1. Download the App.js file from Claude's output"
echo "   2. Place it in: $(pwd)/src/App.js"
echo ""
echo "Then run:"
echo "   npm install"
echo "   npm start"
