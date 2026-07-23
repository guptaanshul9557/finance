# Synmetrix Analytics Dashboard - Complete Documentation

**Last Updated:** December 2025  
**Project Status:** ✅ Production Ready  
**Version:** 1.0.0

---

## 📑 Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Setup & Installation](#setup--installation)
6. [Frontend Implementation](#frontend-implementation)
7. [Backend Implementation](#backend-implementation)
8. [Database Schema](#database-schema)
9. [Configuration System](#configuration-system)
10. [Features & Components](#features--components)
11. [Multi-Level Drilldown System](#multi-level-drilldown-system)
12. [Troubleshooting & Diagnostics](#troubleshooting--diagnostics)
13. [Deployment Guide](#deployment-guide)

---

## Project Overview

### 🎯 Purpose
The Synmetrix Analytics Dashboard is a fully dynamic, scalable React-based analytics platform for the KMC (Pune Municipal Corporation) grievance management and financial collection system.

### ✨ Key Features
- ✅ **Dynamic Dashboard** - Multi-module analytics with real-time data
- ✅ **Multi-Level Drilldown** - 5-level and 3-level drill-down navigation
- ✅ **Modular Architecture** - Configuration-driven, easily extensible
- ✅ **Chart Support** - Line charts, bar charts, and pie charts
- ✅ **KPI Cards** - Customizable metric display with styling
- ✅ **Data Tables** - Paginated, sortable tables with search
- ✅ **CORS Enabled** - Secure frontend-backend communication
- ✅ **Authentication** - Token-based auth system with redirect flows
- ✅ **Responsive Design** - Mobile-friendly layouts

### 📊 Current Modules
1. **Grievances Management** - Track and analyze grievance data by department, category, source
2. **Common Collection** - Monitor collection metrics and transactions
3. **CRN Management** - CRN-based collection tracking
4. **Expense Bills** - Expense bill tracking and analysis

---

## System Architecture

### 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (React 18.2)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Home Page (Module Cards) → Module Detail Pages      │   │
│  │  • Department Selection  • Category Selection        │   │
│  │  • Multi-level Drilldown • Data Tables & Charts     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↓ AXIOS + CORS
┌─────────────────────────────────────────────────────────────┐
│              EXPRESS BACKEND (Node.js)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Routes                                          │   │
│  │  • /api/health     - Server status                  │   │
│  │  • /api/cors-test  - CORS verification             │   │
│  │  • /api/db-test    - Database connectivity          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↓ PostgreSQL Driver
┌─────────────────────────────────────────────────────────────┐
│         CUBE.JS OLAP SERVER (Analytics Engine)              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Schema Manager                                      │   │
│  │  • EgPgrService (Grievances)                        │   │
│  │  • ComDepartment (Departments)                      │   │
│  │  • ComRegisteredNumber (CRN)                        │   │
│  │  • CollTransactionId (Collections)                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│           POSTGRESQL DATABASE (192.168.0.132:5444)          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  digit database - Grievance & Collection Data       │   │
│  │  finance3 database - Financial Data                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 📱 User Journey

```
1. Login
   ↓
2. Home Page (/)
   ├─ Card: Common Collection
   ├─ Card: CRN Management
   ├─ Card: Grievances
   └─ Card: Expense Bills
   ↓
3. Select Module → Navigate to Module Dashboard
   ↓
4. Module Dashboard Page
   ├─ Header with Module Title
   ├─ KPI Cards (4 columns)
   ├─ Charts (pie, line, bar)
   └─ Data Tables
   ↓
5. Click on Card/Chart/Row → Drilldown
   ├─ Level 1: Department Selection
   ├─ Level 2: Monthly/Category Selection
   ├─ Level 3: Category/SubCategory Selection
   ├─ Level 4: SubCategory/Daily Details
   └─ Level 5: Detailed Daily Records
   ↓
6. View Detailed Data in Modal
```

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 18.2.0 | UI Framework |
| **Routing** | React Router | 7.9.6 | Client-side navigation |
| **HTTP Client** | Axios | 1.6.0 | API calls with CORS |
| **Styling** | CSS3 | - | Component styles |
| **Charts** | Chart.js | 4.4.0 | Data visualization |
| **Backend** | Express.js | 4.18.2 | API server |
| **OLAP** | Cube.js | 1.5.9 | Analytics queries |
| **DB Driver** | PostgreSQL | 15.x | Database client |
| **CORS** | cors | 2.8.x | Cross-origin support |
| **Environment** | dotenv | 16.x | Config management |
| **Database** | PostgreSQL | 15.x | Data storage |
| **Deployment** | Docker | - | Containerization |
| **Orchestration** | Kubernetes | - | Container orchestration |

---

## Project Structure

```
synmetrix/
│
├── 📄 COMPLETE_PROJECT_DOCUMENTATION.md    ← THIS FILE (Consolidated Docs)
├── 📄 package.json                         # Dependencies & scripts
├── 📄 Dockerfile.cubejs                    # Cube.js container
├── 📄 Dockerfile.frontend                  # React frontend container
├── 📄 nginx.conf                           # Nginx reverse proxy
├── 📄 .env                                 # Environment variables
│
├── public/                                 # Static assets
│   └── index.html                          # HTML entry point
│
├── src/                                    # ⚛️ REACT FRONTEND
│   ├── App.js                              # Root component + routing
│   ├── App.css                             # Global styles
│   ├── index.js                            # Entry point
│   ├── index.css                           # Global CSS
│   │
│   ├── components/                         # Reusable UI Components
│   │   ├── Header.jsx                      # App header/nav
│   │   ├── Sidebar.jsx                     # Navigation sidebar
│   │   ├── Layout.jsx                      # Page layout wrapper
│   │   ├── KPICard.jsx                     # KPI metric card (custom styles)
│   │   ├── DrilldownModal.jsx              # Drilldown details modal
│   │   ├── ModuleDataTable.jsx             # Data table component
│   │   ├── PaginatedTable.jsx              # Table with pagination
│   │   ├── UniversalScreen.jsx             # Main dashboard screen
│   │   ├── ModuleWiseModal.jsx             # Module modal viewer
│   │   ├── ModuleKPICards.jsx              # KPI card grid
│   │   ├── ModulePieChart.jsx              # Pie chart handler
│   │   └── charts/                         # Chart components
│   │       ├── LineChart.jsx
│   │       ├── BarChart.jsx
│   │       └── PieChart.jsx
│   │
│   ├── config/                             # 🔧 CONFIGURATION
│   │   ├── globalConfig.js                 # Theme, colors, globals
│   │   ├── moduleRegistry.js               # Module definitions
│   │   ├── screenRegistry.js               # Screen configurations
│   │   ├── queryConfig.js                  # Query builders
│   │   └── tableConfigs.js                 # Table column configs
│   │
│   ├── pages/                              # 📄 PAGE COMPONENTS
│   │   ├── Dashboard.jsx                   # Dashboard page
│   │   ├── HomePage.jsx                    # Home/modules page
│   │   ├── ModuleDetailPage.jsx            # Module detail page
│   │   ├── DashboardCubejs.jsx             # Cube.js dashboard
│   │   ├── TestPage.jsx                    # Testing page
│   │   └── Login.jsx                       # Login page
│   │
│   ├── contexts/                           # 🔗 CONTEXT & STATE
│   │   └── AuthContext.js                  # Authentication state
│   │
│   ├── hooks/                              # 🪝 CUSTOM HOOKS
│   │   └── useEnsureSchema.js              # Schema initialization
│   │
│   ├── services/                           # 🔌 API SERVICES
│   │   └── (API service files)
│   │
│   ├── cubejs/                             # 📊 CUBE.JS CONFIG
│   │   └── cubejsApi.js                    # Cube.js client setup
│   │
│   ├── styles/                             # 🎨 STYLE MODULES
│   │   └── (Component CSS files)
│   │
│   └── utils/                              # 🛠️ UTILITIES
│       └── (Helper functions)
│
├── server/                                 # 🖥️ EXPRESS BACKEND
│   ├── index.js                            # Express app entry
│   ├── cube-server.js                      # Cube.js server + routes
│   ├── db.js                               # PostgreSQL connection
│   ├── queryBuilder.js                     # Query building logic
│   ├── tableConfigs.js                     # Table configuration
│   ├── schemaManager.js                    # Schema management
│   ├── schemaGenerator.js                  # Dynamic schema generation
│   ├── preAggregationGenerator.js          # Pre-aggregation config
│   │
│   ├── routes/                             # 🛣️ API ROUTES
│   │   ├── moduleRoutes.js                 # Module APIs
│   │   └── schemaRoutes.js                 # Schema APIs
│   │
│   └── services/                           # 📦 BUSINESS LOGIC
│       └── commonCollectionService.js      # Service layer
│
├── schema/                                 # 📋 CUBE.JS SCHEMAS
│   ├── EgPgrService.js                     # Grievances schema
│   ├── ComDepartment.js                    # Departments schema
│   ├── ComRegisteredNumber.js              # CRN schema
│   ├── TresCollReceiptHdr.js               # Collection schema
│   └── (Other schemas)
│
├── queries/                                # 📝 SQL QUERIES
│   └── (Raw SQL query files)
│
├── k8s/                                    # ☸️ KUBERNETES CONFIG
│   ├── deployment.yaml                     # Deployment manifest
│   ├── service.yaml                        # Service definition
│   ├── ingress.yaml                        # Ingress configuration
│   ├── configmap.yaml                      # ConfigMap for settings
│   ├── secret.yaml                         # Secrets management
│   └── README.md                           # K8s deployment guide
│
├── docker/                                 # 🐳 DOCKER CONFIG
│   └── nginx.conf                          # Nginx reverse proxy
│
└── public/                                 # 📁 STATIC FILES
    └── (Images, assets)
```

---

## Setup & Installation

### Prerequisites

```bash
# System Requirements
- Node.js v16+ (LTS)
- PostgreSQL 15+
- Docker & Docker Compose (optional, for containerization)
- npm or yarn package manager
```

### 1️⃣ Install Dependencies

```bash
cd /path/to/synmetrix
npm install
```

### 2️⃣ Configure Environment

Create `.env` file in root directory:

```env
# Database Configuration (Grievance & Collection)
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=

# Finance Database (CRN & Finance Data)
FIN_DB_HOST=
FIN_DB_PORT=
FIN_DB_NAME=
FIN_DB_USER=
FIN_DB_PASSWORD="your_finance_db_password"

# Backend Server
BE_PORT=5000
BE_PATH=/mis-dashboard-be

# Cube.js Configuration
CUBEJS_API_SECRET=synmetrix-secret-key-change-in-production
CUBEJS_API_AUDIENCE=hmm
CUBEJS_SCHEDULED_REFRESH=true
CUBEJS_PRE_AGGREGATIONS=true

# Frontend
REACT_APP_BACKEND_URL=http://localhost:5000
REACT_APP_CUBEJS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:5000,https://jkhudd.mycitydemo.in

# Authentication
AUTH_DOMAIN=your.auth.domain
AUTH_CLIENT_ID=your_client_id
AUTH_CLIENT_SECRET=your_client_secret

# Logging
LOG_LEVEL=info
DEBUG=false
```

### 3️⃣ Verify Database Connection

```bash
# Test database connectivity
node test-db-connection.js

# Run environment check
node test-env.js
```

### 4️⃣ Initialize Cube.js Schemas

```bash
# Generate schemas from tables
npm run generate:schemas

# Or manually create schemas (see schema/ directory)
```

### 5️⃣ Start Development Servers

```bash
# Terminal 1: Start backend Cube.js server
npm run dev:server

# Terminal 2: Start React frontend
npm run start

# Optional Terminal 3: API server (if separate)
npm run dev:api
```

### 6️⃣ Access Dashboard

```
Frontend:  http://localhost:3000
Backend:   http://localhost:5000
Cube.js:   https://jkhudd.mycitydemo.in
Health:    http://localhost:5000/api/health
DB Test:   http://localhost:5000/api/db-test
```

---

## Frontend Implementation

### 🎨 Main App Structure (App.js)

```javascript
// Key components
<BrowserRouter>
  <AuthProvider>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/modules/:moduleId" element={<ModuleDetailPage />} />
      <Route path="/mis-dashboard/:screenId" element={<UniversalScreen />} />
      <Route path="/test" element={<TestPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  </AuthProvider>
</BrowserRouter>
```

### 📱 Page Components

#### HomePage.jsx
- Displays module cards (Common Collection, CRN, Grievances)
- Navigation to individual module dashboards
- Authentication check

#### UniversalScreen.jsx (🌟 Main Dashboard)
- **Renders dynamic screens** from `screenRegistry.js`
- **Multi-level drilldown** handling (5-level and 3-level flows)
- **KPI Cards** with custom styling
- **Charts** (line, bar, pie)
- **Data Tables** with pagination
- **Modal** for detailed drilldown data

#### ModuleDetailPage.jsx
- Module-specific analytics
- KPI cards grid
- Charts and visualizations
- Data tables

### 🎛️ Key Components

#### KPICard.jsx
```javascript
// Customizable KPI card component
<KPICard 
  title="Total Grievances"
  value={1250}
  trend="+12%"
  icon="📊"
  cardStyle={{
    borderColor: '#302ba0',
    borderWidth: '3px',
    fontSize: '20px',
    textColor: '#E53935'
  }}
  onClick={() => handleDrilldown()}
/>
```

#### ModuleDataTable.jsx
- Paginated table display
- Search and filter
- Sortable columns
- Row click handlers for drilldown

#### Charts
- **LineChart.jsx** - Time-series data
- **BarChart.jsx** - Categorical comparisons
- **PieChart.jsx** - Distribution visualization

### 🔄 Multi-Level Drilldown System

The drilldown system in `UniversalScreen.jsx` supports multiple levels:

#### 5-Level Drilldown (Grievances Status Cards)
```
Level 1: Select Department
   ↓
Level 2: Select Month (Monthly data)
   ↓
Level 3: Select Category (Category breakdown)
   ↓
Level 4: Select Sub-Category (Sub-category breakdown)
   ↓
Level 5: View Daily Details (Daily records)
```

#### 3-Level Drilldown (Grievances Sources)
```
Level 1: Select Department
   ↓
Level 2: Select Month (Monthly data)
   ↓
Level 3: View Daily Details (Daily records)
```

#### Handler Implementation
```javascript
// Line 545-600 in UniversalScreen.jsx
async function handleDrilldown(index, value, drilldownConfig) {
  const levelIndex = drilldownLevels.length;
  const currentConfig = drilldownLevels[levelIndex];
  
  if (levelIndex === 0) {
    // Level 1: Department selection
    setDepartmentFilter(value);
    // Fetch monthly data
  } else if (levelIndex === 1) {
    // Level 2: Monthly selection
    setMonthFilter(value);
    // Fetch category data (or daily if 3-level)
  } else if (levelIndex === 2 && currentConfig.type === 'daily') {
    // Direct to daily (3-level drilldown)
    fetchDailyData();
  } else if (levelIndex === 2) {
    // Level 3: Category selection
    setCategoryFilter(value);
    // Fetch sub-category data
  } else if (levelIndex === 3) {
    // Level 4: Sub-category selection
    setSubCategoryFilter(value);
    // Fetch daily data
  }
  // Level 5: Daily details shown in modal
}
```

---

## Backend Implementation

### 🖥️ Express Server (cube-server.js)

#### Server Startup
```javascript
const CubejsServer = require('@cubejs-backend/server');
const express = require('express');
const cors = require('cors');

// CORS Configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'https://jkhudd.mycitydemo.in', ...],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  maxAge: 86400
};

app.use(cors(corsOptions));
```

#### API Endpoints

##### Health Check
```
GET /api/health
Response: { status: 'OK', message: '...', cubeApi: '...' }
```

##### CORS Test
```
GET /api/cors-test
Response: { status: 'OK', message: 'CORS is working' }
```

##### Database Connection Test
```
GET /api/db-test
Response: {
  status: 'OK',
  message: 'Database connection successful',
  dbHost: '192.168.0.132',
  dbPort: 5444,
  dbName: 'digit',
  serverTime: '2025-12-12T...',
  timestamp: '...'
}
```

### 🔌 Database Connection

#### Driver Factory Pattern (Multi-Database Support)
```javascript
driverFactory: ({ dataSource }) => {
  const PostgresDriver = require('@cubejs-backend/postgres-driver');
  
  if (dataSource === 'finance') {
    // Finance database (CRN)
    return new PostgresDriver({
      database: process.env.FIN_DB_NAME,
      host: process.env.FIN_DB_HOST,
      port: parseInt(process.env.FIN_DB_PORT),
      user: process.env.FIN_DB_USER,
      password: cleanPassword(process.env.FIN_DB_PASSWORD)
    });
  }
  
  // Default database (digit - grievances & collections)
  return new PostgresDriver({
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: cleanPassword(process.env.DB_PASSWORD)
  });
}
```

#### Connection Validation
```javascript
// Validate configuration before creating driver
if (!config.host || !config.port || !config.database) {
  console.error('❌ CRITICAL: Database configuration missing!');
  throw new Error('Invalid database configuration');
}
```

---

## Database Schema

### 🗄️ Schema Files

#### EgPgrService.js (Grievances)
```javascript
// Cube.js schema for grievance data
cube(`EgPgrService`, {
  sql: `SELECT * FROM eg_pgr_service`,
  
  dimensions: {
    servicerequestid: { sql: `servicerequestid` },
    departmentName: { sql: `department_name` },
    categoryName: { sql: `category_name` },
    subcategoryName: { sql: `subcategory_name` },
    createdtime: { sql: `createdtime`, type: `time` },
    source: { sql: `source` },
    statusname: { sql: `status_name` }
  },
  
  measures: {
    count: { type: `count` },
    todayTopGrievanceCount: {
      type: `count`,
      sql: `CASE WHEN to_timestamp(createdtime / 1000.0)::date = CURRENT_DATE 
            THEN servicerequestid END`
    }
  }
});
```

#### ComDepartment.js
```javascript
// Department reference data
cube(`ComDepartment`, {
  sql: `SELECT * FROM eg_department`,
  
  dimensions: {
    departmentCode: { sql: `code` },
    departmentName: { sql: `name` }
  }
});
```

#### ComRegisteredNumber.js (CRN)
```javascript
// CRN collection data
cube(`ComRegisteredNumber`, {
  sql: `SELECT * FROM eg_crn`,
  
  dimensions: {
    crnNumber: { sql: `crn_number` },
    ownerName: { sql: `owner_name` }
  }
});
```

#### TresCollReceiptHdr.js (Collections)
```javascript
// Collection transactions
cube(`TresCollReceiptHdr`, {
  sql: `SELECT * FROM tbl_collection_receipt`,
  
  dimensions: {
    receiptNumber: { sql: `receipt_number` },
    amount: { sql: `amount` },
    status: { sql: `status` }
  }
});
```

---

## Configuration System

### 🔧 screenRegistry.js (Configuration-Driven)

The main configuration file that defines all screens, cards, and drilldowns.

#### Structure
```javascript
export const screenRegistry = {
  'grievances-dashboard': {
    name: 'grievances-dashboard',
    title: 'Grievances Management Dashboard',
    sections: [
      {
        id: 'total-grievances-status',
        title: 'Total Grievances - Status Breakdown',
        type: 'kpi-grid',
        gridColumns: 4,
        cards: [
          {
            id: 'total-grievances',
            title: 'Total Grievances',
            type: 'kpi',
            measure: 'EgPgrService.count',
            isTodayKpi: false,
            drilldown: {
              levels: [
                { 
                  name: 'Department', 
                  dimension: 'EgPgrService.departmentName',
                  type: 'selection'
                },
                { 
                  name: 'Month', 
                  dimension: 'EgPgrService.createdtime',
                  type: 'monthly'
                },
                { 
                  name: 'Category', 
                  dimension: 'EgPgrService.categoryName',
                  type: 'selection'
                },
                { 
                  name: 'SubCategory', 
                  dimension: 'EgPgrService.subcategoryName',
                  type: 'selection'
                },
                { 
                  name: 'Daily', 
                  dimension: 'EgPgrService.createdtime',
                  type: 'daily'
                }
              ]
            }
          }
        ]
      },
      // More sections...
    ]
  }
};
```

#### Configuration Options

##### Section Types
- `kpi-grid` - Grid of KPI cards
- `chart` - Chart visualization
- `table` - Data table display

##### Card Properties
```javascript
{
  id: 'unique-card-id',
  title: 'Card Title',
  type: 'kpi',                           // kpi, chart, table
  measure: 'Schema.measure',             // Cube.js measure
  dimension: 'Schema.dimension',         // For grouping
  cardStyle: {                           // Custom styling
    borderColor: '#302ba0',
    borderWidth: '3px',
    fontSize: '20px',
    textColor: '#E53935'
  },
  isTodayKpi: true,                      // Today's data only
  drilldown: { levels: [...] },         // Drilldown configuration
  filters: [{ dimension: '...', value: '...' }]
}
```

##### Drilldown Level Types
- `selection` - Dropdown/list selection (department, category)
- `monthly` - Month selector (displays monthly aggregates)
- `daily` - Day selector (displays daily records)

---

## Features & Components

### 📊 Feature: KPI Cards with Custom Styling

**Today Grievance Card Example:**
```javascript
{
  id: 'today-grievance',
  title: 'Today Grievance',
  type: 'kpi',
  measure: 'EgPgrService.todayTopGrievanceCount',
  isTodayKpi: true,
  cardStyle: {
    borderColor: '#302ba0',      // Blue border
    borderWidth: '3px',
    fontSize: '20px',
    textColor: '#E53935'          // Red text
  }
}
```

### 📈 Feature: Multi-Level Drilldown

**Grievances Source Cards (3-Level Drilldown):**
```javascript
{
  id: 'web-portal-grievances',
  title: 'Grievances from Web Portal',
  type: 'kpi',
  measure: 'EgPgrService.count',
  sourceFilter: 'Web Portal',
  drilldown: {
    levels: [
      { name: 'Department', dimension: 'EgPgrService.departmentName', type: 'selection' },
      { name: 'Month', dimension: 'EgPgrService.createdtime', type: 'monthly' },
      { name: 'Daily', dimension: 'EgPgrService.createdtime', type: 'daily' }
    ]
  }
}
```

### 📋 Feature: Data Tables

**Top Departments Today Table:**
```javascript
{
  id: 'top-departments-today',
  title: 'Top Departments Today',
  type: 'table',
  dimension: 'EgPgrService.departmentName',
  measure: 'EgPgrService.todayTopGrievanceCount',
  limit: 10,
  columns: [
    { label: 'Department', key: 'departmentName' },
    { label: 'Today Grievances', key: 'todayTopGrievanceCount' },
    { label: 'Top Category', key: 'categoryName' },
    { label: 'Category Count', key: 'count' }
  ]
}
```

### 🔐 Feature: CORS & Security

**CORS Middleware:**
```javascript
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://jkhudd.mycitydemo.in',
    'https://jkhudd.mycitydemo.in:3000',
    'https://jkhudd.mycitydemo.in:5000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
```

### 🔌 Feature: Axios with CORS

**useEnsureSchema.js (Hooks):**
```javascript
const apiClient = axios.create({
  baseURL: 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true  // ✅ Enable credentials for CORS
});

// Usage
const { data } = await apiClient.post('/api/schema/ensure', { 
  schemas: requiredSchemas 
});
```

---

## Multi-Level Drilldown System

### 🎯 How Drilldown Works

#### Execution Flow
```javascript
// In UniversalScreen.jsx

1. User clicks on KPI card or chart segment
   ↓
2. handleDrilldown() function called with:
   - cardConfig: Card configuration from screenRegistry
   - value: Selected value (department, month, etc.)
   ↓
3. levelIndex = drilldownLevels.length (current level)
   ↓
4. Switch based on levelIndex and level type:
   
   Level 0 (Department):
   - Store department filter
   - Fetch monthly data for selected department
   - Show Level 1 modal
   
   Level 1 (Monthly):
   - Store month filter
   - Fetch data for selected month
   - If 3-level: Show daily data (Level 2)
   - If 5-level: Fetch category data (Level 2)
   
   Level 2 (Category OR Daily):
   - If type === 'daily': Show daily records table
   - If type === 'selection': Store category, fetch sub-categories
   
   Level 3 (Sub-Category):
   - Store sub-category filter
   - Fetch daily data
   
   Level 4 (Daily):
   - Show detailed records in table
   ↓
5. Display modal with:
   - Breadcrumb showing path (Dept > Month > Category > ...)
   - Data table or charts
   - Option to drill deeper or go back
```

#### Special Cases

**3-Level Drilldown Jump to Daily (Line 545):**
```javascript
// When drilldown has only 3 levels and Level 2 is daily
if (levelIndex === 2 && currentLevelConfig.type === 'daily') {
  // Skip category selection, show daily data directly
  const dailyData = await fetchDailyData(departmentFilter, monthFilter);
  setDrilldownData(dailyData);
}
```

**Monthly to Daily with Filters:**
```javascript
// Include all active filters when fetching daily data
const dailyData = await cubejsApi.load({
  dimensions: ['EgPgrService.createdtime', 'EgPgrService.departmentName'],
  measures: ['EgPgrService.count'],
  filters: [
    { dimension: 'EgPgrService.departmentName', operator: 'equals', value: departmentFilter },
    { dimension: 'EgPgrService.createdtime', operator: 'inDateRange', value: [monthStart, monthEnd] }
  ]
});
```

---

## Troubleshooting & Diagnostics

### 🐛 Common Issues & Solutions

#### Issue 1: CORS Error "No 'Access-Control-Allow-Origin' header"
**Cause:** Frontend request blocked by missing CORS headers  
**Solution:**
```javascript
// Verify CORS middleware in cube-server.js
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Test CORS endpoint
http://localhost:5000/api/cors-test
```

#### Issue 2: Database Connection Error "ECONNREFUSED ::1:5432"
**Cause:** Docker container cannot reach PostgreSQL  
**Diagnosis:**
1. Test database connection:
   ```bash
   http://localhost:5000/api/db-test
   ```
2. Check host resolution:
   ```bash
   docker exec <container> nc -zv 192.168.0.132 5444
   ```
3. Verify credentials in .env
4. Check firewall rules

**Solution Options:**
- Use `host.docker.internal` instead of IP if on Docker Desktop
- Use `localhost` if PostgreSQL is on same host
- Ensure PostgreSQL service is running: `sudo service postgresql status`

#### Issue 3: Daily Details Show "NaN"
**Cause:** Data structure mismatch (object vs number)  
**Solution (Line 2110 in UniversalScreen.jsx):**
```javascript
// ❌ Wrong
formatValue(value, ...)

// ✅ Correct
formatValue(value?.value || value, ...)
```

#### Issue 4: Outreach Program Monthly→Daily Not Working
**Cause:** 3-level drilldowns skipped category check  
**Solution (Line 545 in UniversalScreen.jsx):**
```javascript
// Add check BEFORE category selection
if (levelIndex === 2 && currentLevelConfig.type === 'daily') {
  // Direct daily fetch for 3-level drilldowns
  const dailyData = await fetchDailyData(...);
  setDrilldownData(dailyData);
}
```

#### Issue 5: "No routes matched location /"
**Cause:** Missing or incorrect routing configuration  
**Solution (App.js):**
```javascript
<Routes>
  <Route path="/" element={<HomePage />} />  // ✅ Add root route
  <Route path="/login" element={<Login />} />
  <Route path="/modules/:moduleId" element={<ModuleDetailPage />} />
  <Route path="*" element={<Navigate to="/" />} />  // ✅ Catch-all
</Routes>
```

### 🔍 Diagnostic Tools

#### Health Check
```bash
curl http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "message": "Synmetrix Cube.js Server is running",
  "version": "1.5.9",
  "cors": "enabled"
}
```

#### Database Test
```bash
curl http://localhost:5000/api/db-test
```

**Successful Response:**
```json
{
  "status": "OK",
  "message": "Database connection successful",
  "dbHost": "192.168.0.132",
  "dbPort": 5444,
  "serverTime": "2025-12-12T10:30:00Z"
}
```

**Error Response Shows:**
```json
{
  "status": "ERROR",
  "message": "Database connection failed",
  "error": "connect ECONNREFUSED ...",
  "dbHost": "192.168.0.132",
  "dbPort": 5444
}
```

#### CORS Test
```bash
curl -H "Origin: http://localhost:3000" http://localhost:5000/api/cors-test
```

---

## Deployment Guide

### 🐳 Docker Deployment

#### Build Docker Images
```bash
# Build Cube.js server image
docker build -f Dockerfile.cubejs -t synmetrix-cubejs:1.0 .

# Build React frontend image
docker build -f Dockerfile.frontend -t synmetrix-frontend:1.0 .
```

#### Run with Docker Compose
```bash
docker-compose up -d
```

#### Access Services
```
Frontend:  http://localhost:3000
Backend:   http://localhost:5000
Nginx:     http://localhost:80
```

### ☸️ Kubernetes Deployment

#### Deploy to Kubernetes
```bash
kubectl apply -f k8s/secret.yaml       # Create secrets
kubectl apply -f k8s/configmap.yaml    # Create config
kubectl apply -f k8s/deployment.yaml   # Deploy services
kubectl apply -f k8s/service.yaml      # Expose services
kubectl apply -f k8s/ingress.yaml      # Setup ingress
```

#### Verify Deployment
```bash
# Check pods
kubectl get pods

# Check services
kubectl get svc

# View logs
kubectl logs -f deployment/synmetrix-cubejs
kubectl logs -f deployment/synmetrix-frontend
```

#### Access Production
```
URL: https://jkhudd.mycitydemo.in
API: https://jkhudd.mycitydemo.in/mis-dashboard-be
```

### 📦 Environment Setup for Production

```env
# .env (Production)
DB_HOST=192.168.0.132
DB_PORT=5444
DB_NAME=digit
DB_USER=postgres
DB_PASSWORD=****

# Backend
BE_PORT=5000
BE_PATH=/mis-dashboard-be

# Cube.js
CUBEJS_API_SECRET=your-secure-secret-key
CUBEJS_SCHEDULED_REFRESH=true
CUBEJS_PRE_AGGREGATIONS=true

# Frontend
REACT_APP_BACKEND_URL=https://jkhudd.mycitydemo.in/mis-dashboard-be
REACT_APP_CUBEJS_TOKEN=eyJ...

# CORS
CORS_ORIGIN=https://jkhudd.mycitydemo.in

# Security
DEBUG=false
NODE_ENV=production
```

### 📊 Performance Optimization

#### 1. Pre-aggregations
```javascript
// In schema files
preAggregations: {
  dailyAggregations: {
    type: 'rollup',
    measureReferences: ['count', 'totalAmount'],
    dimensionReferences: ['createdtime', 'departmentName'],
    timeDimensionReference: 'createdtime',
    granularity: 'day',
    refreshKey: {
      every: '1 hour'
    }
  }
}
```

#### 2. Caching
- Set `CUBEJS_SCHEDULED_REFRESH=true` for automatic refresh
- Configure Redis for distributed caching (if needed)

#### 3. Database Indexes
```sql
-- Recommended indexes
CREATE INDEX idx_eg_pgr_department ON eg_pgr_service(department_name);
CREATE INDEX idx_eg_pgr_category ON eg_pgr_service(category_name);
CREATE INDEX idx_eg_pgr_created ON eg_pgr_service(createdtime);
CREATE INDEX idx_eg_pgr_source ON eg_pgr_service(source);
CREATE INDEX idx_eg_pgr_status ON eg_pgr_service(status_name);
```

---

## Summary

This comprehensive documentation covers:

✅ **Complete project structure** with file descriptions  
✅ **Setup and installation** steps  
✅ **Frontend architecture** with React components  
✅ **Backend configuration** with Express and Cube.js  
✅ **Database schema** definitions  
✅ **Configuration system** (screenRegistry.js)  
✅ **Multi-level drilldown** implementation  
✅ **Troubleshooting guide** for common issues  
✅ **Deployment options** (Docker, Kubernetes, Production)  

### 🚀 Next Steps

1. **If deploying locally:**
   - Follow Setup & Installation section
   - Run `npm run dev:server` and `npm start`
   - Test with health check endpoint

2. **If deploying to production:**
   - Build Docker images
   - Deploy to Kubernetes
   - Configure Nginx reverse proxy
   - Set environment variables

3. **For customization:**
   - Edit `screenRegistry.js` to add/modify screens
   - Create new Cube.js schemas in `/schema`
   - Add database tables to driver factory

---

**Document Version:** 1.0.0  
**Last Updated:** December 2025  
**Status:** ✅ Production Ready
