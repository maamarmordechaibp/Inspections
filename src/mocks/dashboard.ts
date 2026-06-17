export const dashboardStats = {
  totalAssets: 487,
  activeAssets: 423,
  inspectionsThisMonth: 86,
  inspectionsCompleted: 72,
  inspectionsOverdue: 14,
  complianceRate: 94.2,
  openIssues: 23,
  resolvedThisMonth: 41,
};

export const monthlyInspections = [
  { month: "Jan", completed: 65, scheduled: 72 },
  { month: "Feb", completed: 59, scheduled: 68 },
  { month: "Mar", completed: 80, scheduled: 85 },
  { month: "Apr", completed: 81, scheduled: 90 },
  { month: "May", completed: 72, scheduled: 86 },
  { month: "Jun", completed: 56, scheduled: 70 },
  { month: "Jul", completed: 64, scheduled: 75 },
  { month: "Aug", completed: 75, scheduled: 82 },
  { month: "Sep", completed: 88, scheduled: 92 },
  { month: "Oct", completed: 73, scheduled: 80 },
  { month: "Nov", completed: 68, scheduled: 76 },
  { month: "Dec", completed: 70, scheduled: 78 },
];

export const complianceByCategory = [
  { name: "Extinguishers", rate: 96, total: 215 },
  { name: "Sprinklers", rate: 92, total: 98 },
  { name: "Alarms", rate: 89, total: 74 },
  { name: "Hydrants", rate: 97, total: 52 },
  { name: "Hoses", rate: 93, total: 48 },
];

export const upcomingInspections = [
  { id: "INS-1042", asset: "Fire Extinguisher FE-301", location: "Building A, Floor 3", type: "Monthly Check", date: "2026-05-28", assignee: "Mike Rodriguez", priority: "high" },
  { id: "INS-1043", asset: "Sprinkler System SP-112", location: "Building B, Basement", type: "Quarterly Test", date: "2026-05-29", assignee: "Lisa Thompson", priority: "high" },
  { id: "INS-1044", asset: "Fire Alarm FA-089", location: "Building A, Floor 1", type: "Annual Inspection", date: "2026-05-30", assignee: "Mike Rodriguez", priority: "medium" },
  { id: "INS-1045", asset: "Hydrant HY-022", location: "Parking Lot East", type: "Semi-Annual", date: "2026-06-01", assignee: "Lisa Thompson", priority: "medium" },
  { id: "INS-1046", asset: "Fire Hose FH-156", location: "Building C, Floor 2", type: "Annual Test", date: "2026-06-02", assignee: "Mike Rodriguez", priority: "low" },
];

export const recentActivity = [
  { id: 1, user: "Mike Rodriguez", action: "completed inspection", target: "FE-301 Extinguisher", time: "10 minutes ago", type: "inspection" },
  { id: 2, user: "Sarah Chen", action: "generated report", target: "Monthly Compliance Summary", time: "2 hours ago", type: "report" },
  { id: 3, user: "Lisa Thompson", action: "updated asset", target: "SP-112 Sprinkler System", time: "3 hours ago", type: "asset" },
  { id: 4, user: "James Mitchell", action: "added new asset", target: "FE-425 Extinguisher", time: "5 hours ago", type: "asset" },
  { id: 5, user: "Mike Rodriguez", action: "flagged issue on", target: "FA-089 Fire Alarm", time: "Yesterday", type: "issue" },
  { id: 6, user: "David Park", action: "rescheduled inspection", target: "HY-022 Hydrant", time: "Yesterday", type: "schedule" },
  { id: 7, user: "Sarah Chen", action: "approved report", target: "Q2 Safety Audit", time: "2 days ago", type: "report" },
  { id: 8, user: "Lisa Thompson", action: "completed inspection", target: "FH-156 Fire Hose", time: "2 days ago", type: "inspection" },
];

export const priorityAssets = [
  { id: "AST-001", name: "Fire Extinguisher FE-301", type: "Extinguisher", location: "Building A - Floor 3", status: "Overdue", daysOverdue: 12 },
  { id: "AST-002", name: "Sprinkler System SP-112", type: "Sprinkler", location: "Building B - Basement", status: "Due Soon", daysOverdue: 0 },
  { id: "AST-003", name: "Fire Alarm FA-089", type: "Alarm", location: "Building A - Floor 1", status: "Overdue", daysOverdue: 5 },
  { id: "AST-004", name: "Hydrant HY-022", type: "Hydrant", location: "Parking Lot East", status: "Upcoming", daysOverdue: 0 },
];

export const needsScheduling = [
  { assetId: "AST-008", assetName: "Extinguisher FE-180", assetType: "Extinguisher", location: "Building A, Floor 4", customerId: "c1a2b3c4-d5e6-7890-abcd-ef1234567890", customerName: "Skyline Tower Condominiums", nextDue: "2026-05-22", daysUntilDue: -5 },
  { assetId: "AST-028", assetName: "Extinguisher FE-302", assetType: "Extinguisher", location: "Building A, Floor 1", customerId: "c1a2b3c4-d5e6-7890-abcd-ef1234567890", customerName: "Skyline Tower Condominiums", nextDue: "2026-05-15", daysUntilDue: -12 },
  { assetId: "AST-029", assetName: "Extinguisher FE-303", assetType: "Extinguisher", location: "Building A, Floor 2", customerId: "c1a2b3c4-d5e6-7890-abcd-ef1234567890", customerName: "Skyline Tower Condominiums", nextDue: "2026-05-20", daysUntilDue: -7 },
  { assetId: "AST-031", assetName: "Sprinkler SP-201", assetType: "Sprinkler", location: "Building A, Floors 1-5", customerId: "c1a2b3c4-d5e6-7890-abcd-ef1234567890", customerName: "Skyline Tower Condominiums", nextDue: "2026-05-10", daysUntilDue: -17 },
  { assetId: "AST-011", assetName: "Extinguisher FE-410", assetType: "Extinguisher", location: "Building C, Floor 1", customerId: "e3c4d5e6-f7a8-9012-cdef-123456789012", customerName: "Hudson Yards Office Plaza", nextDue: "2026-05-10", daysUntilDue: -17 },
  { assetId: "AST-016", assetName: "Fire Pump FP-002", assetType: "Fire Pump", location: "Building C, Basement", customerId: "e3c4d5e6-f7a8-9012-cdef-123456789012", customerName: "Hudson Yards Office Plaza", nextDue: "2026-05-30", daysUntilDue: 3 },
  { assetId: "AST-020", assetName: "Emergency Lights EL-422", assetType: "Emergency Lighting", location: "Building C, Floors 1-3", customerId: "e3c4d5e6-f7a8-9012-cdef-123456789012", customerName: "Hudson Yards Office Plaza", nextDue: "2026-05-18", daysUntilDue: -9 },
  { assetId: "AST-006", assetName: "Extinguisher FE-255", assetType: "Extinguisher", location: "Building B, Floor 1", customerId: "d2b3c4d5-e6f7-8901-bcde-f12345678901", customerName: "Brooklyn Heights Medical Center", nextDue: "2026-06-01", daysUntilDue: 5 },
  { assetId: "AST-015", assetName: "Fire Pump FP-001", assetType: "Fire Pump", location: "Building B, Pump Room", customerId: "d2b3c4d5-e6f7-8901-bcde-f12345678901", customerName: "Brooklyn Heights Medical Center", nextDue: "2026-06-20", daysUntilDue: 24 },
  { assetId: "AST-026", assetName: "Extinguisher FE-501", assetType: "Extinguisher", location: "Food Court, North Wing", customerId: "f4d5e6f7-a8b9-0123-defa-234567890123", customerName: "Queens Center Mall", nextDue: "2026-06-02", daysUntilDue: 6 },
  { assetId: "AST-019", assetName: "Emergency Lights EL-310", assetType: "Emergency Lighting", location: "Building A, All Floors", customerId: "c1a2b3c4-d5e6-7890-abcd-ef1234567890", customerName: "Skyline Tower Condominiums", nextDue: "2026-06-01", daysUntilDue: 5 },
];