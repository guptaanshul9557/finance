# Synmetrix Analytics Dashboard

A fully dynamic, reusable analytics architecture powered by **React**, **PostgreSQL**, and **Cube.js**.

## � Documentation

👉 **[See COMPLETE_PROJECT_DOCUMENTATION.md](./COMPLETE_PROJECT_DOCUMENTATION.md)** for full documentation including:
- Complete project structure
- Setup & installation steps
- Architecture and design
- Frontend & backend implementation
- Database schema
- Configuration system
- Multi-level drilldown system
- Troubleshooting guide
- Deployment options

## 🚀 Quick Start

### 1. Prerequisites
- Node.js v16+ (LTS)
- PostgreSQL 15+
- npm or yarn

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Create `.env` file:
```env
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=

BE_PORT=5000
BE_PATH=/mis-dashboard-be

CUBEJS_API_SECRET=synmetrix-secret-key-change-in-production
CUBEJS_PRE_AGGREGATIONS=true
CUBEJS_SCHEDULED_REFRESH=true
```

### 4. Test Database Connection
```bash
node test-db-connection.js
# or access: http://localhost:5000/api/db-test (after server starts)
```

### 5. Start Servers
```bash
# Terminal 1: Backend + Cube.js server
npm run dev:server

# Terminal 2: React frontend
npm start
```

### 6. Access Dashboard
- **Frontend:** http://localhost:3000
- **Health Check:** http://localhost:5000/api/health
- **Database Test:** http://localhost:5000/api/db-test

## ✨ Key Features

✅ **Multi-Module Analytics** - Common Collection, CRN, Grievances, Expense Bills  
✅ **Dynamic Configuration** - Screens, cards, and drilldowns via screenRegistry.js  
✅ **Multi-Level Drilldown** - 3-level and 5-level navigation flows  
✅ **KPI Cards** - Customizable metrics with styling and today's data support  
✅ **Data Tables** - Paginated, searchable tables with aggregations  
✅ **Charts** - Line, bar, and pie charts with drill-down support  
✅ **CORS Enabled** - Secure frontend-backend communication with Axios  
✅ **Responsive Design** - Mobile-friendly layouts  
✅ **Database Support** - Multi-database (digit + finance) with Cube.js  

## � Project Structure

```
synmetrix/
├── COMPLETE_PROJECT_DOCUMENTATION.md  ← Full documentation
├── src/
│   ├── components/                    # React components
│   │   ├── UniversalScreen.jsx        # Main dashboard screen
│   │   ├── KPICard.jsx                # KPI metric cards
│   │   ├── DrilldownModal.jsx         # Drilldown modal
│   │   └── charts/                    # Chart components
│   ├── config/
│   │   ├── screenRegistry.js          # Screen configurations
│   │   ├── moduleRegistry.js          # Module definitions
│   │   └── globalConfig.js            # Global settings
│   ├── pages/
│   │   ├── HomePage.jsx               # Home page
│   │   └── DashboardCubejs.jsx        # Dashboard
│   └── cubejs/
│       └── cubejsApi.js               # Cube.js client
├── server/
│   ├── cube-server.js                 # Express + Cube.js server
│   ├── db.js                          # Database connection
│   └── routes/
├── schema/                            # Cube.js schemas
│   ├── EgPgrService.js                # Grievances
│   ├── ComDepartment.js               # Departments
│   ├── ComRegisteredNumber.js         # CRN
│   └── TresCollReceiptHdr.js          # Collections
├── k8s/                               # Kubernetes config
├── package.json                       # Dependencies
└── .env                               # Environment variables
```

## � Available Screens

### Grievances Management
- **Department Grievances** - Status breakdown by department
- **Grievance Sources** - Analysis by source (Web, WhatsApp, etc.)
- **Category & Sub-Category Analysis** - Categorized grievance data

### Financial Modules
- **Common Collection** - Collection metrics and analytics
- **CRN Management** - CRN-based collection tracking
- **Expense Bills** - Expense tracking and analysis

## 🔄 Multi-Level Drilldown Examples

### 5-Level Drilldown (Grievances Status)
```
Department → Monthly → Category → Sub-Category → Daily Details
```

### 3-Level Drilldown (Grievances Sources)
```
Department → Monthly → Daily Details
```

## 🛠️ Available npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:server` | Start Cube.js server on port 5000 |
| `npm start` | Start React frontend on port 3000 |
| `npm run build` | Build React for production |
| `npm run dev` | Start both frontend & backend |

## 🐳 Docker & Kubernetes

### Docker
```bash
docker build -f Dockerfile.cubejs -t synmetrix-cubejs:1.0 .
docker build -f Dockerfile.frontend -t synmetrix-frontend:1.0 .
docker-compose up -d
```

### Kubernetes
```bash
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

## � Diagnostic Endpoints

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Database Connection Test
```bash
curl http://localhost:5000/api/db-test
```

### CORS Test
```bash
curl http://localhost:5000/api/cors-test
```

## 🚨 Troubleshooting

### CORS Error
- Check CORS middleware in `cube-server.js`
- Test with `/api/cors-test` endpoint
- Verify origin URLs in corsOptions

### Database Connection Failed
- Test with `/api/db-test` endpoint
- Check `.env` file for correct credentials
- Verify PostgreSQL is running on configured host/port
- If using Docker, try `host.docker.internal` instead of IP

### Daily Details Showing NaN
- Located in `UniversalScreen.jsx` line 2110
- Solution: Extract value with `value?.value || value`

### Route Not Found "/"
- Check `App.js` routing configuration
- Ensure root route exists: `<Route path="/" element={<HomePage />} />`

## 📖 For Complete Documentation

See **[COMPLETE_PROJECT_DOCUMENTATION.md](./COMPLETE_PROJECT_DOCUMENTATION.md)** for:
- Detailed architecture and design patterns
- Database schema documentation
- Configuration system details
- Code examples and implementation guides
- Deployment instructions
- Performance optimization tips
- And much more!

---

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Last Updated:** December 2025

Built with ❤️ using React, Cube.js, and PostgreSQL
