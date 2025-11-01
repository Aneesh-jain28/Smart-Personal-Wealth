# 💰 Smart Personal Wealth (SPW)

A full-stack personal finance dashboard that helps you track accounts, project net worth, run what-if scenarios, stress-test your portfolio, simulate tax migration, and get AI-powered financial insights — all in one place.

![Tech Stack](https://img.shields.io/badge/React-19-blue) ![Tech Stack](https://img.shields.io/badge/Node.js-Express-green) ![Tech Stack](https://img.shields.io/badge/MongoDB-Mongoose-brightgreen) ![Tech Stack](https://img.shields.io/badge/TailwindCSS-4-06B6D4) ![Tech Stack](https://img.shields.io/badge/Mistral_AI-Powered-yellow)

---

## 📖 Table of Contents

1. [Features](#-features)
2. [Architecture Overview](#-architecture-overview)
3. [Prerequisites](#-prerequisites)
4. [Installation & Setup](#-installation--setup)
5. [Running the Application](#-running-the-application)
6. [Project Structure](#-project-structure)
7. [Pages & Functionality Guide](#-pages--functionality-guide)
8. [API Endpoints](#-api-endpoints)
9. [Configuration](#-configuration)
10. [Troubleshooting](#-troubleshooting)
11. [License](#-license)

---

## ✨ Features

| Feature | Description |
|---|---|
| **Multi-Currency Accounts** | Track savings, investments, and debts in USD, EUR, GBP, INR, BTC, and ETH with real-time exchange rate conversion |
| **10-Year Net Worth Projection** | Compound growth forecasting with customizable growth rates and standard deviation per account |
| **What-If Scenarios** | Model one-time expenses or income changes and instantly see their impact on projections |
| **Monte Carlo Simulation** | Run 500 randomized simulations to visualize the probability distribution of your future net worth |
| **FIRE Calculator** | Calculate your Financial Independence number (annual expenses × 25) and estimate your freedom date |
| **Debt Optimizer** | Compare Avalanche (highest rate first) vs Snowball (smallest balance first) payoff strategies |
| **Tax & Inflation Adjustments** | Toggle real-value projections that account for 15% LTCG tax drag and configurable inflation rates |
| **Black Swan Stress Test** | Simulate historical crises (2008 crash, COVID-19, Great Depression, hyperinflation) against your portfolio and get a resilience grade (A+ to F) |
| **State Migration Tax Simulator** | Compare net worth projections across US states and Indian states based on income tax rates and cost of living |
| **AI Financial Assistant** | Chat with a Mistral-powered AI that has full context of your accounts and provides personalized financial guidance |
| **PDF Export** | Export your dashboard as a PDF report |
| **Dark/Light Mode** | Full theme support across all pages |
| **Authentication** | Secure JWT-based signup/login with per-user data isolation |

---

## 🏗 Architecture Overview

```
┌─────────────────────┐         ┌─────────────────────┐
│                     │  HTTP   │                     │
│   React Frontend    │◄──────► │  Express Backend    │
│   (Vite + Tailwind) │  :5173  │  (REST API)  :5000  │
│                     │         │                     │
└─────────────────────┘         └────────┬────────────┘
                                         │
                                         ▼
                                ┌─────────────────────┐
                                │   MongoDB Database   │
                                │   :27017             │
                                └─────────────────────┘
                                         │
                                         ▼
                                ┌─────────────────────┐
                                │  External APIs       │
                                │  • ExchangeRate-API  │
                                │  • CoinGecko         │
                                │  • Google Mistral AI  │
                                └─────────────────────┘
```

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

| Software | Version | Download Link |
|---|---|---|
| **Node.js** | v18 or higher | [nodejs.org](https://nodejs.org/) |
| **npm** | v9 or higher | Comes with Node.js |
| **MongoDB** | v6 or higher | [mongodb.com/try/download](https://www.mongodb.com/try/download/community) |
| **Git** | Any recent version | [git-scm.com](https://git-scm.com/) |

### Verify installations

```bash
node --version    # Should print v18.x.x or higher
npm --version     # Should print 9.x.x or higher
mongod --version  # Should print v6.x or higher
```

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd "SMART PERSONAL WEALTH"
```

### 2. Set Up the Backend

```bash
cd BACKEND
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the `BACKEND/` directory (or edit the existing one):

```env
# filepath: BACKEND/.env

# Server
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/smart-personal-wealth

# JWT Authentication
JWT_SECRET=your-secure-secret-key-change-this
JWT_EXPIRE=7d

# Google Mistral AI API Key (required for AI chat feature)
# Get your key from: https://aistudio.google.com/app/apikey
Mistral_API_KEY=your-Mistral-api-key-here
```

> ⚠️ **Important:** Replace `your-secure-secret-key-change-this` with a strong random string and add your own Mistral API key.

#### How to get a Mistral API Key:

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key and paste it as `Mistral_API_KEY` in your `.env` file

### 4. Set Up the Frontend

```bash
cd ../FRONTEND
npm install
```

### 5. Start MongoDB

Make sure MongoDB is running on your system:

**Windows (if installed as a service):**
```bash
net start MongoDB
```

**macOS / Linux:**
```bash
mongod --dbpath /path/to/your/data/directory
```

**Using Docker (alternative):**
```bash
docker run -d -p 27017:27017 --name spw-mongo mongo:latest
```

---

## ▶️ Running the Application

You need **two terminal windows** — one for the backend and one for the frontend.

### Terminal 1: Start the Backend Server

```bash
cd BACKEND
npm run dev
```

You should see output like:
```
Server running on port 5000
MongoDB connected successfully
```

### Terminal 2: Start the Frontend Dev Server

```bash
cd FRONTEND
npm run dev
```

You should see output like:
```
VITE v6.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

### 6. Open the Application

Open your browser and navigate to:

```
http://localhost:5173
```

---

## 📁 Project Structure

```
SMART PERSONAL WEALTH/
│
├── BACKEND/                          # Express.js REST API
│   ├── server.js                     # Entry point — Express app setup
│   ├── .env                          # Environment variables (secrets)
│   ├── package.json                  # Backend dependencies
│   │
│   ├── controllers/
│   │   ├── authController.js         # Signup, login, JWT token generation
│   │   ├── financialsController.js   # CRUD for accounts & scenarios
│   │   └── aiController.js           # Mistral AI chat integration
│   │
│   ├── middleware/
│   │   └── auth.js                   # JWT authentication middleware
│   │
│   ├── models/
│   │   ├── User.js                   # Mongoose user schema
│   │   └── UserFinancials.js         # Mongoose schema for accounts & scenarios
│   │
│   └── routes/
│       ├── authRoutes.js             # /api/auth/*
│       ├── financialsRoutes.js       # /api/financials/*
│       └── aiRoutes.js               # /api/ai/*
│
├── FRONTEND/                         # React + Vite SPA
│   ├── index.html                    # HTML entry point
│   ├── package.json                  # Frontend dependencies
│   ├── vite.config.js                # Vite configuration
│   ├── tailwind.config.js            # Tailwind CSS configuration
│   │
│   └── src/
│       ├── main.jsx                  # App entry — routing & providers
│       ├── App.jsx                   # Main dashboard page
│       ├── App.css                   # Global styles
│       │
│       ├── components/
│       │   ├── AccountList.jsx       # Displays account cards
│       │   ├── AiChat.jsx            # Floating AI chat widget
│       │   ├── FireInsights.jsx      # FIRE number & freedom date
│       │   ├── ScenarioToggle.jsx    # Scenario on/off toggles
│       │   ├── StatCards.jsx         # Summary stat cards
│       │   └── WealthChart.jsx       # Net worth projection chart
│       │
│       ├── pages/
│       │   ├── LoginPage.jsx         # User login
│       │   ├── SignupPage.jsx        # User registration
│       │   ├── ManageAccountsPage.jsx    # Add/edit/delete accounts
│       │   ├── ManageScenariosPage.jsx   # Add/edit/delete scenarios
│       │   ├── AiChatPage.jsx        # Full-page AI chat
│       │   ├── TaxSimulatorPage.jsx  # State migration tax comparison
│       │   └── BlackSwanPage.jsx     # Crisis stress test
│       │
│       ├── context/
│       │   ├── AuthContext.jsx       # Authentication state provider
│       │   └── ThemeContext.jsx       # Dark/light mode provider
│       │
│       └── utils/
│           ├── financeHelpers.js     # Projection, Monte Carlo, debt math
│           ├── currencyHelper.js     # Exchange rates & currency formatting
│           └── exportHelper.js       # PDF export functionality
│
└── README.md                         # ← You are here
```

---

## 📱 Pages & Functionality Guide

### 1. Signup / Login

- Navigate to `http://localhost:5173` — you'll be redirected to the login page
- Click **"Create account"** if you're a new user
- Enter your name, email, and password (min 6 characters)
- After signup/login, you'll be redirected to the main dashboard

### 2. Main Dashboard (`/`)

This is the central hub. Here you can:

- **View Net Worth** — See your total net worth in the sidebar, converted to your base currency
- **Net Worth Projection Chart** — A 10-year compound growth forecast with an optional Monte Carlo overlay (500 randomized simulations)
- **FIRE Insights** — See your FIRE number (annual expenses × 25), current progress, and estimated freedom date
- **Tax & Inflation Toggle** — Switch on to see projections adjusted for 15% capital gains tax and customizable inflation
- **What-If Scenarios** — Toggle scenarios to see one-time expenses or income changes reflected in projections
- **Debt Optimizer** — If you have debt accounts, choose between Avalanche or Snowball strategies and set extra payments
- **Currency Selector** — Switch your base display currency (USD, EUR, GBP, INR)
- **Dark/Light Mode** — Toggle in the top-right corner
- **PDF Export** — Export a snapshot of your dashboard

### 3. Manage Accounts (`/accounts`)

- Click **"Accounts"** in the sidebar or the "Add Accounts" button
- **Add Account:** Fill in name, type (savings/investment/debt), balance, annual growth rate, standard deviation, tax treatment, and currency
- **Edit/Delete:** Use the pencil/trash icons on each account card
- Account types:
  - **Savings** — Bank accounts, emergency funds
  - **Investment** — Stocks, mutual funds, index funds
  - **Debt** — Credit cards, loans (enter balance as positive; it will be subtracted)

### 4. Manage Scenarios (`/scenarios`)

- Click **"Add Scenarios"** or navigate via the sidebar
- **Scenario Types:**
  - **One-Time Expense** — e.g., buying a car for $30,000 in 2026
  - **Income Change** — e.g., salary raise of $10,000/year starting 2025
- Toggle scenarios on/off from the dashboard to see their impact

### 5. AI Financial Assistant (`/ai-chat`)

- Click **"Ask AI"** in the sidebar or the full-page chat link
- The AI has context of all your accounts and can answer questions like:
  - *"How close am I to FIRE?"*
  - *"Should I pay off debt first or invest?"*
  - *"Explain my net worth trend"*
  - *"Give me tips to grow my savings faster"*
- Powered by Google Mistral AI

> **Note:** Requires a valid `Mistral_API_KEY` in the backend `.env` file.

### 6. Black Swan Stress Test (`/black-swan`)

- Simulates how your portfolio would survive major financial crises
- **Preset Scenarios:**
  - 2008 Financial Crisis (-40% market crash)
  - COVID-19 Crash (-34% drop)
  - Great Depression (-55% drop)
  - Hyperinflation Spiral (25% inflation)
  - Custom Scenario (define your own parameters)
- **Parameters you can adjust:**
  - Market crash percentage
  - Inflation spike rate
  - Job loss duration (months)
  - Recovery period (years)
  - Monthly income & expenses
- **Output:**
  - Resilience Grade (A+ to F)
  - Survival timeline chart
  - Month-by-month breakdown table
  - Personalized recommendations

### 7. State Migration Tax Simulator (`/tax-simulator`)

- Compare net worth projections if you moved to a different state/region
- Supports **all 50 US states** and **all Indian states**
- Shows:
  - Tax rate comparison
  - Cost of living adjustment
  - Net worth difference over 10 years
  - Whether migration is financially worthwhile
- Configure your annual income, expenses, and projection period

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive JWT token |
| `GET` | `/api/auth/me` | Get current user profile |

### Financial Data

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/financials` | Get all accounts & scenarios |
| `POST` | `/api/financials/accounts` | Add a new account |
| `PUT` | `/api/financials/accounts/:id` | Update an account |
| `DELETE` | `/api/financials/accounts/:id` | Delete an account |
| `POST` | `/api/financials/scenarios` | Add a new scenario |
| `PUT` | `/api/financials/scenarios/:id` | Update a scenario |
| `DELETE` | `/api/financials/scenarios/:id` | Delete a scenario |

### AI Chat

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ai/chat` | Send a message to the AI assistant |

> All financial and AI endpoints require a valid JWT token in the `Authorization` header.

---

## ⚙️ Configuration

### Backend Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 5000) |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret key for JWT signing |
| `JWT_EXPIRE` | No | Token expiry duration (default: 7d) |
| `Mistral_API_KEY` | Yes* | Google Mistral API key (*required for AI chat) |
| `NODE_ENV` | No | `development` or `production` |

### Frontend Configuration

The frontend connects to the backend at `http://localhost:5000` by default. If you change the backend port, update the API URLs in:

- [`FRONTEND/src/components/AiChat.jsx`](FRONTEND/src/components/AiChat.jsx) — `API_URL`
- [`FRONTEND/src/pages/AiChatPage.jsx`](FRONTEND/src/pages/AiChatPage.jsx) — `API_URL`
- [`FRONTEND/src/pages/ManageAccountsPage.jsx`](FRONTEND/src/pages/ManageAccountsPage.jsx) — `API`
- [`FRONTEND/src/pages/ManageScenariosPage.jsx`](FRONTEND/src/pages/ManageScenariosPage.jsx) — `API`
- [`FRONTEND/src/App.jsx`](FRONTEND/src/App.jsx) — Axios calls

---

## 🔧 Troubleshooting

### Common Issues

| Problem | Solution |
|---|---|
| **MongoDB connection refused** | Make sure MongoDB is running: `mongod` or `net start MongoDB` |
| **Port 5000 already in use** | Change `PORT` in `BACKEND/.env` or kill the process using port 5000 |
| **CORS errors in browser** | Ensure the backend is running and the frontend URL is allowed in `server.js` CORS config |
| **AI chat returns errors** | Verify your `Mistral_API_KEY` is valid and has quota remaining |
| **Exchange rates not loading** | The app uses free-tier APIs that have rate limits; wait and retry |
| **Blank page after login** | Clear browser localStorage and cookies, then log in again |
| **`npm install` fails** | Delete `node_modules/` and `package-lock.json`, then run `npm install` again |

### Reset Database

To start fresh, drop the MongoDB database:

```bash
mongosh
use smart-personal-wealth
db.dropDatabase()
```

Then restart the backend and create a new account.

---

## 📄 License

This is a Final Year Software Engineering Project (2026). For educational use.

---

## 🙏 Acknowledgements

- [React](https://react.dev/) + [Vite](https://vite.dev/) — Frontend framework & build tool
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework
- [Recharts](https://recharts.org/) — Chart library for React
- [Lucide React](https://lucide.dev/) — Icon library
- [Express.js](https://expressjs.com/) — Backend framework
- [MongoDB](https://www.mongodb.com/) + [Mongoose](https://mongoosejs.com/) — Database & ODM
- [Google Mistral AI](https://ai.google.dev/) — AI chat capabilities
- [ExchangeRate-API](https://www.exchangerate-api.com/) & [CoinGecko](https://www.coingecko.com/) — Currency conversion