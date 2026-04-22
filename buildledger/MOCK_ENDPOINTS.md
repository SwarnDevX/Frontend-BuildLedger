# BuildLedger — Mock Data & Missing Backend Endpoints

## Overview
The following features use **local mock data** because the corresponding backend endpoints have not been implemented yet.
These endpoints must be built in a future backend sprint.

---

## 📋 Missing Endpoints (Priority Order)

### 1. Contracts API
**Used in:** Contract Management page (`/contracts`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/contracts` | Get all contracts [PM/ADMIN] |
| `GET` | `/contracts/{contractId}` | Get contract by ID |
| `POST` | `/contracts` | Create new contract [PM/ADMIN] |
| `PUT` | `/contracts/{contractId}` | Update contract [PM/ADMIN] |
| `DELETE` | `/contracts/{contractId}` | Delete contract [ADMIN] |
| `GET` | `/contracts/vendor/{vendorId}` | Get contracts by vendor |
| `GET` | `/contracts/status/{status}` | Filter contracts by status |

**Mock file:** `src/data/mockData.js` → `contracts`, `recentContracts`

**Expected Response Shape:**
```json
{
  "success": true,
  "data": [
    {
      "contractId": 1,
      "project": "Metro Tower Phase 2",
      "vendorId": 1,
      "vendorName": "SteelCorp Ltd",
      "value": 480000,
      "startDate": "2025-01-15",
      "endDate": "2025-08-30",
      "status": "ACTIVE",
      "progress": 62,
      "contractType": "FIXED_PRICE",
      "complianceStatus": "COMPLIANT"
    }
  ]
}
```

---

### 2. Delivery / Shipment Tracking API
**Used in:** Delivery Tracking page (`/deliveries`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/deliveries` | Get all deliveries [PM/ADMIN] |
| `GET` | `/deliveries/{deliveryId}` | Get delivery by ID |
| `POST` | `/deliveries` | Create delivery record [PM/ADMIN] |
| `PUT` | `/deliveries/{deliveryId}/status` | Update delivery status |
| `GET` | `/deliveries/contract/{contractId}` | Deliveries by contract |
| `GET` | `/deliveries/status/{status}` | Filter by status (PENDING/IN_TRANSIT/COMPLETED) |

**Mock file:** `src/data/mockData.js` → `deliveries`

---

### 3. Invoice & Payment API
**Used in:** Invoice & Payment page (`/invoices`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/invoices` | Get all invoices [FINANCE/ADMIN] |
| `GET` | `/invoices/{invoiceId}` | Get invoice by ID |
| `POST` | `/invoices` | Create invoice [FINANCE/ADMIN] |
| `PUT` | `/invoices/{invoiceId}/approve` | Approve invoice [FINANCE/ADMIN] |
| `PUT` | `/invoices/{invoiceId}/pay` | Mark invoice as paid [FINANCE/ADMIN] |
| `GET` | `/invoices/vendor/{vendorId}` | Invoices by vendor |
| `GET` | `/invoices/status/{status}` | Filter by status |

**Mock file:** `src/data/mockData.js` → `invoices`, `paymentTrendData`

---

### 4. Audit Log & Compliance API
**Used in:** Compliance & Audit page (`/compliance`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/audit/logs` | Get all audit logs [ADMIN/COMPLIANCE] |
| `GET` | `/audit/logs/module/{module}` | Filter by module |
| `GET` | `/compliance/scores` | Get compliance scores per vendor |
| `POST` | `/compliance/check/{vendorId}` | Run compliance check |
| `GET` | `/compliance/alerts` | Get active compliance alerts |

**Mock file:** `src/data/mockData.js` → `auditLogs`, `complianceScores`

---

### 5. Dashboard KPI / Analytics API
**Used in:** Main Dashboard (`/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/analytics/kpi` | Get dashboard KPI summary |
| `GET` | `/analytics/contract-trend` | Monthly contract value series |
| `GET` | `/analytics/vendor-performance` | Vendor performance scores |

**Mock file:** `src/data/mockData.js` → `kpiData`, `contractTrendData`, `vendorPerformanceData`

---

### 6. Auth — Logout / Token Refresh
**Currently handled:** Client-side only (clear localStorage)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/logout` | Invalidate JWT server-side |
| `POST` | `/auth/refresh` | Issue new token from refresh token |
| `POST` | `/auth/change-password` | Change password for logged-in user |

---

### 7. Notifications API
**Used in:** Notifications page (`/notifications`)  
Currently uses fully static mock data.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/notifications` | Get notifications for current user |
| `PUT` | `/notifications/{id}/read` | Mark notification as read |
| `PUT` | `/notifications/read-all` | Mark all as read |
| `DELETE` | `/notifications/{id}` | Delete notification |
| WebSocket | `ws://…/notifications` | Real-time push notifications |

**Mock file:** `src/data/mockData.js` → `notifications`

---

## 🔄 Integration Instructions (when endpoints are ready)

1. Import the relevant API module from `src/api/`
2. Replace the `mockData` import in the page component with `useState` + `useEffect`
3. Call the API in `useEffect` on mount
4. Map response `data` fields to the component's existing shape

### Example (Dashboard KPI):
```js
// Before (mock):
import { kpiData } from '../../data/mockData';

// After (real API):
import { getKpiSummary } from '../../api/analytics';
const [kpiData, setKpiData] = useState([]);
useEffect(() => {
  getKpiSummary().then(r => setKpiData(r.data?.data || []));
}, []);
```

---

## 📝 Notes
- All authenticated requests automatically include `Authorization: Bearer <token>` via the Axios interceptor in `src/api/axios.js`
- The backend base URL is configured in `src/api/axios.js` as `http://localhost:8079`
- 401 responses auto-redirect to `/login` and clear stored credentials

