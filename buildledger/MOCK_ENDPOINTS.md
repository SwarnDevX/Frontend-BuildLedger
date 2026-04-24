# 📋 Missing API Endpoints – Future Backend Requirements

This document lists all endpoints that are **not yet available** in the backend but are needed for full frontend functionality. Until these are implemented, the frontend either derives approximate data from existing endpoints or omits those features.

---

## 1. Analytics / Dashboard

### `GET /analytics/contracts/trend`
**Used in:** Dashboard – "Contract Value Over Time" area chart  
**Purpose:** Returns monthly aggregated contract values for the current year  
**Response shape:**
```json
[{ "month": "Jan", "value": 820000, "count": 18 }, ...]
```
**Current workaround:** Contracts are grouped by `createdAt` month using client-side logic.

---

### `GET /analytics/vendors/performance`
**Used in:** Dashboard – "Vendor Performance" bar chart  
**Purpose:** Returns a performance score (0–100) per vendor  
**Response shape:**
```json
[{ "vendorId": 1, "vendorName": "SteelCorp", "score": 92, "deliveries": 45 }, ...]
```
**Current workaround:** Vendors listed with static score derived from `status` field.

---

## 2. Analytics / Finance

### `GET /analytics/payments/trend`
**Used in:** Invoice & Payments page – "Payment History" bar chart  
**Purpose:** Returns monthly paid vs pending payment totals  
**Response shape:**
```json
[{ "month": "Jan", "paid": 420000, "pending": 85000 }, ...]
```
**Current workaround:** Payments from `GET /payments` grouped by `createdAt` month on client side.

---

## 3. Compliance / Vendor Scores

### `GET /compliance/vendor-scores`
**Used in:** Compliance & Audit page – vendor score breakdown  
**Response shape:**
```json
[{ "vendorId": 1, "vendorName": "SteelCorp", "score": 98, "risk": "LOW" }, ...]
```
**Current workaround:** Overall score calculated from ratio of COMPLIANT vs total compliance records.

---

## 4. Notifications

### `GET /notifications`
**Purpose:** Paginated list of system notifications for the current user  
**Response shape:**
```json
{ "data": [{ "notificationId": 1, "type": "Invoice", "message": "...", "severity": "error", "read": false, "createdAt": "..." }] }
```

### `PATCH /notifications/{id}/read`  
**Purpose:** Mark a single notification as read

### `PATCH /notifications/read-all`  
**Purpose:** Mark all notifications as read

### `GET /notifications/unread-count`  
**Purpose:** Returns unread badge count → `{ "count": 5 }`

**Current workaround:** Notifications are derived client-side from invoices, deliveries, compliance, and contracts. "Mark as read" is local state only (resets on refresh).

---

## 5. Contract Progress Field

`progress` (0–100) is not returned by `GET /contracts`.  
**Current workaround:** Derived from `status` (DRAFT=5%, ACTIVE=55%, COMPLETED=100%, etc.)

---

## 6. Contract Compliance Flag

`complianceFlag` is not returned by `GET /contracts`.  
**Future endpoint:** `GET /contracts/{id}/compliance-summary`  
**Current workaround:** Not displayed on contract cards.

---

## 7. Delivery Progress Field

`progress` (0–100) is not returned by `GET /deliveries`.  
**Current workaround:** Derived from `status` (SCHEDULED=0%, PENDING=15%, IN_TRANSIT=65%, COMPLETED=100%).

---

*Last updated: April 22, 2026*
