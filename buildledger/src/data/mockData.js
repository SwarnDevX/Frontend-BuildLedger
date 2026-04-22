// Mock data for all pages

export const kpiData = [
  { label: 'Total Contracts', value: '248', change: '+12%', trend: 'up', color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
  { label: 'Active Vendors', value: '64', change: '+4%', trend: 'up', color: '#14B8A6', bg: 'rgba(20,184,166,0.08)' },
  { label: 'Pending Deliveries', value: '31', change: '-3%', trend: 'down', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  { label: 'Outstanding Payments', value: '$1.24M', change: '+8%', trend: 'up', color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
];

export const contractTrendData = [
  { month: 'Jan', value: 820000, count: 18 },
  { month: 'Feb', value: 950000, count: 22 },
  { month: 'Mar', value: 880000, count: 20 },
  { month: 'Apr', value: 1200000, count: 28 },
  { month: 'May', value: 1350000, count: 31 },
  { month: 'Jun', value: 1180000, count: 26 },
  { month: 'Jul', value: 1420000, count: 34 },
  { month: 'Aug', value: 1650000, count: 38 },
  { month: 'Sep', value: 1480000, count: 35 },
  { month: 'Oct', value: 1720000, count: 41 },
  { month: 'Nov', value: 1580000, count: 37 },
  { month: 'Dec', value: 1900000, count: 44 },
];

export const vendorPerformanceData = [
  { name: 'SteelCorp', score: 92, deliveries: 45 },
  { name: 'BuildMat', score: 78, deliveries: 38 },
  { name: 'ProElec', score: 88, deliveries: 52 },
  { name: 'SafeGuard', score: 95, deliveries: 29 },
  { name: 'ConcretePro', score: 71, deliveries: 33 },
  { name: 'TechBuild', score: 84, deliveries: 41 },
];

export const recentContracts = [
  { id: 'CTR-2401', project: 'Metro Tower Phase 2', vendor: 'SteelCorp Ltd', value: '$480,000', start: '2025-01-15', end: '2025-08-30', status: 'Active' },
  { id: 'CTR-2402', project: 'Harbor Bridge Repair', vendor: 'ConcretePro Inc', value: '$275,000', start: '2025-02-01', end: '2025-06-15', status: 'Pending' },
  { id: 'CTR-2403', project: 'City Hall Renovation', vendor: 'ProElec Systems', value: '$192,000', start: '2025-01-20', end: '2025-04-10', status: 'Completed' },
  { id: 'CTR-2404', project: 'Highway Expansion', vendor: 'BuildMat Co', value: '$1,200,000', start: '2025-03-01', end: '2026-02-28', status: 'Active' },
  { id: 'CTR-2405', project: 'Stadium Upgrade', vendor: 'SafeGuard Pro', value: '$365,000', start: '2025-02-15', end: '2025-09-30', status: 'On Hold' },
  { id: 'CTR-2406', project: 'Solar Farm Install', vendor: 'TechBuild Energy', value: '$820,000', start: '2025-04-01', end: '2025-12-31', status: 'Active' },
];

export const vendors = [
  { id: 1, name: 'SteelCorp Ltd', category: 'Materials', status: 'Active', rating: 4.6, contracts: 12, compliance: 98, location: 'New York, NY', contact: 'james@steelcorp.com', since: '2021-03-10', tags: ['ISO 9001', 'OSHA Certified'] },
  { id: 2, name: 'ConcretePro Inc', category: 'Materials', status: 'Active', rating: 3.9, contracts: 8, compliance: 82, location: 'Chicago, IL', contact: 'sarah@concretepro.com', since: '2020-07-22', tags: ['ISO 9001'] },
  { id: 3, name: 'ProElec Systems', category: 'Electrical', status: 'Active', rating: 4.4, contracts: 15, compliance: 94, location: 'Houston, TX', contact: 'mike@proelec.com', since: '2019-11-05', tags: ['NFPA 70E', 'ISO 9001'] },
  { id: 4, name: 'SafeGuard Pro', category: 'Safety', status: 'Active', rating: 4.8, contracts: 9, compliance: 100, location: 'Phoenix, AZ', contact: 'linda@safeguard.com', since: '2022-01-14', tags: ['OSHA', 'ISO 45001', 'ISO 9001'] },
  { id: 5, name: 'BuildMat Co', category: 'Materials', status: 'Inactive', rating: 3.5, contracts: 5, compliance: 71, location: 'Philadelphia, PA', contact: 'tom@buildmat.com', since: '2021-09-18', tags: [] },
  { id: 6, name: 'TechBuild Energy', category: 'Energy', status: 'Active', rating: 4.2, contracts: 7, compliance: 89, location: 'San Antonio, TX', contact: 'nina@techbuild.com', since: '2023-02-28', tags: ['ISO 50001'] },
  { id: 7, name: 'FrameWorks Inc', category: 'Structural', status: 'Under Review', rating: 4.0, contracts: 11, compliance: 76, location: 'Dallas, TX', contact: 'omar@frameworks.com', since: '2020-04-11', tags: ['ISO 9001'] },
  { id: 8, name: 'HydraPlumb', category: 'Plumbing', status: 'Active', rating: 4.3, contracts: 6, compliance: 91, location: 'San Jose, CA', contact: 'ella@hydraplumb.com', since: '2022-08-03', tags: ['IAPMO', 'ISO 9001'] },
];

export const contracts = [
  { id: 'CTR-2401', project: 'Metro Tower Phase 2', vendor: 'SteelCorp Ltd', value: 480000, start: '2025-01-15', end: '2025-08-30', status: 'Active', progress: 62, type: 'Fixed Price', compliance: 'Compliant' },
  { id: 'CTR-2402', project: 'Harbor Bridge Repair', vendor: 'ConcretePro Inc', value: 275000, start: '2025-02-01', end: '2025-06-15', status: 'Pending', progress: 10, type: 'Unit Price', compliance: 'Pending Review' },
  { id: 'CTR-2403', project: 'City Hall Renovation', vendor: 'ProElec Systems', value: 192000, start: '2025-01-20', end: '2025-04-10', status: 'Completed', progress: 100, type: 'Lump Sum', compliance: 'Compliant' },
  { id: 'CTR-2404', project: 'Highway Expansion', vendor: 'BuildMat Co', value: 1200000, start: '2025-03-01', end: '2026-02-28', status: 'Active', progress: 28, type: 'Cost Plus', compliance: 'Flag' },
  { id: 'CTR-2405', project: 'Stadium Upgrade', vendor: 'SafeGuard Pro', value: 365000, start: '2025-02-15', end: '2025-09-30', status: 'On Hold', progress: 45, type: 'Fixed Price', compliance: 'Compliant' },
  { id: 'CTR-2406', project: 'Solar Farm Install', vendor: 'TechBuild Energy', value: 820000, start: '2025-04-01', end: '2025-12-31', status: 'Active', progress: 18, type: 'Unit Price', compliance: 'Compliant' },
];

export const deliveries = [
  { id: 'DEL-0101', item: 'Steel Beams (Grade A)', quantity: '240 tons', vendor: 'SteelCorp Ltd', contract: 'CTR-2401', date: '2025-04-20', status: 'In Transit', progress: 70 },
  { id: 'DEL-0102', item: 'Ready Mix Concrete', quantity: '500 m³', vendor: 'ConcretePro Inc', contract: 'CTR-2402', date: '2025-04-25', status: 'Pending', progress: 5 },
  { id: 'DEL-0103', item: 'Electrical Panels', quantity: '18 units', vendor: 'ProElec Systems', contract: 'CTR-2403', date: '2025-04-10', status: 'Completed', progress: 100 },
  { id: 'DEL-0104', item: 'Asphalt Mix', quantity: '1200 tons', vendor: 'BuildMat Co', contract: 'CTR-2404', date: '2025-05-03', status: 'Scheduled', progress: 0 },
  { id: 'DEL-0105', item: 'Safety Harnesses', quantity: '350 sets', vendor: 'SafeGuard Pro', contract: 'CTR-2405', date: '2025-04-18', status: 'Completed', progress: 100 },
  { id: 'DEL-0106', item: 'Solar Panels (500W)', quantity: '640 units', vendor: 'TechBuild Energy', contract: 'CTR-2406', date: '2025-05-15', status: 'In Transit', progress: 45 },
  { id: 'DEL-0107', item: 'Rebar (12mm)', quantity: '80 tons', vendor: 'SteelCorp Ltd', contract: 'CTR-2401', date: '2025-05-08', status: 'Pending', progress: 15 },
];

export const invoices = [
  { id: 'INV-3301', contract: 'CTR-2401', vendor: 'SteelCorp Ltd', amount: 120000, issued: '2025-03-28', due: '2025-04-28', status: 'Pending Approval', paymentMethod: 'Wire Transfer' },
  { id: 'INV-3302', contract: 'CTR-2403', vendor: 'ProElec Systems', amount: 96000, issued: '2025-04-01', due: '2025-04-22', status: 'Overdue', paymentMethod: 'ACH' },
  { id: 'INV-3303', contract: 'CTR-2404', vendor: 'BuildMat Co', amount: 250000, issued: '2025-04-05', due: '2025-05-05', status: 'Approved', paymentMethod: 'Wire Transfer' },
  { id: 'INV-3304', contract: 'CTR-2405', vendor: 'SafeGuard Pro', amount: 72500, issued: '2025-04-10', due: '2025-05-10', status: 'Paid', paymentMethod: 'ACH' },
  { id: 'INV-3305', contract: 'CTR-2406', vendor: 'TechBuild Energy', amount: 164000, issued: '2025-04-12', due: '2025-05-12', status: 'Pending Approval', paymentMethod: 'Check' },
  { id: 'INV-3306', contract: 'CTR-2402', vendor: 'ConcretePro Inc', amount: 55000, issued: '2025-04-15', due: '2025-05-15', status: 'Paid', paymentMethod: 'ACH' },
];

export const paymentTrendData = [
  { month: 'Jan', paid: 420000, pending: 85000 },
  { month: 'Feb', paid: 380000, pending: 120000 },
  { month: 'Mar', paid: 510000, pending: 95000 },
  { month: 'Apr', paid: 460000, pending: 210000 },
  { month: 'May', paid: 590000, pending: 140000 },
  { month: 'Jun', paid: 680000, pending: 90000 },
];

export const auditLogs = [
  { id: 'AUD-001', event: 'Contract CTR-2404 modified – payment terms updated', user: 'Admin (John D.)', timestamp: '2025-04-16 09:12', severity: 'Medium', module: 'Contracts' },
  { id: 'AUD-002', event: 'Vendor BuildMat Co compliance certificate expired', user: 'System', timestamp: '2025-04-16 07:00', severity: 'High', module: 'Compliance' },
  { id: 'AUD-003', event: 'Invoice INV-3302 overdue – escalation triggered', user: 'System', timestamp: '2025-04-15 23:00', severity: 'High', module: 'Invoices' },
  { id: 'AUD-004', event: 'New user "Rachel M." added to Finance role', user: 'Admin (John D.)', timestamp: '2025-04-15 14:30', severity: 'Low', module: 'Admin' },
  { id: 'AUD-005', event: 'Delivery DEL-0106 status changed to In Transit', user: 'Ops (Mark L.)', timestamp: '2025-04-15 11:22', severity: 'Info', module: 'Deliveries' },
  { id: 'AUD-006', event: 'Role permissions updated – PM role added report access', user: 'Admin (John D.)', timestamp: '2025-04-14 16:45', severity: 'Medium', module: 'Admin' },
  { id: 'AUD-007', event: 'Compliance check completed – SafeGuard Pro 100%', user: 'System', timestamp: '2025-04-14 09:00', severity: 'Info', module: 'Compliance' },
  { id: 'AUD-008', event: 'CTR-2402 deadline extended by 15 days', user: 'PM (Sarah K.)', timestamp: '2025-04-13 15:10', severity: 'Medium', module: 'Contracts' },
];

export const complianceScores = [
  { vendor: 'SteelCorp Ltd', score: 98, risk: 'Low' },
  { vendor: 'ConcretePro Inc', score: 82, risk: 'Medium' },
  { vendor: 'ProElec Systems', score: 94, risk: 'Low' },
  { vendor: 'SafeGuard Pro', score: 100, risk: 'None' },
  { vendor: 'BuildMat Co', score: 71, risk: 'High' },
  { vendor: 'TechBuild Energy', score: 89, risk: 'Low' },
];

export const users = [
  { id: 1, name: 'John Davidson', email: 'john@buildledger.com', role: 'Admin', status: 'Active', lastLogin: '2025-04-16', avatar: 'JD' },
  { id: 2, name: 'Sarah Kim', email: 'sarah@buildledger.com', role: 'Project Manager', status: 'Active', lastLogin: '2025-04-16', avatar: 'SK' },
  { id: 3, name: 'Mark Liu', email: 'mark@buildledger.com', role: 'Operations', status: 'Active', lastLogin: '2025-04-15', avatar: 'ML' },
  { id: 4, name: 'Rachel Moore', email: 'rachel@buildledger.com', role: 'Finance', status: 'Active', lastLogin: '2025-04-16', avatar: 'RM' },
  { id: 5, name: 'David Chen', email: 'david@buildledger.com', role: 'Viewer', status: 'Inactive', lastLogin: '2025-04-10', avatar: 'DC' },
  { id: 6, name: 'Priya Patel', email: 'priya@buildledger.com', role: 'Compliance', status: 'Active', lastLogin: '2025-04-14', avatar: 'PP' },
];

export const notifications = [
  { id: 1, type: 'Contract', message: 'CTR-2404 has a compliance flag requiring review', time: '5 min ago', read: false, severity: 'warning' },
  { id: 2, type: 'Invoice', message: 'Invoice INV-3302 is overdue by 6 days', time: '1 hr ago', read: false, severity: 'error' },
  { id: 3, type: 'Delivery', message: 'DEL-0106 Solar Panels shipped – ETA May 15', time: '2 hr ago', read: false, severity: 'info' },
  { id: 4, type: 'Compliance', message: 'BuildMat Co compliance certificate expired', time: '3 hr ago', read: false, severity: 'error' },
  { id: 5, type: 'Contract', message: 'CTR-2403 City Hall Renovation marked Completed', time: '5 hr ago', read: true, severity: 'success' },
  { id: 6, type: 'Invoice', message: 'INV-3304 Payment of $72,500 confirmed', time: '1 day ago', read: true, severity: 'success' },
  { id: 7, type: 'Delivery', message: 'DEL-0104 Asphalt Mix scheduled for May 3', time: '1 day ago', read: true, severity: 'info' },
  { id: 8, type: 'Compliance', message: 'Quarterly compliance audit scheduled for Apr 30', time: '2 days ago', read: true, severity: 'warning' },
];

