// Customer ID constants (match mock customers)
const CUSTOMERS = {
  skyline: 'c1a2b3c4-d5e6-7890-abcd-ef1234567890',
  brooklyn_medical: 'd2b3c4d5-e6f7-8901-bcde-f12345678901',
  hudson_yards: 'e3c4d5e6-f7a8-9012-cdef-123456789012',
  queens_mall: 'f4d5e6f7-a8b9-0123-defa-234567890123',
  waldorf: 'a5e6f7a8-b9c0-1234-efab-345678901234',
  park_ave: 'b6f7a8b9-c0d1-2345-fabc-456789012345',
  staten_island: 'c7a8b9c0-d1e2-3456-abcd-567890123456',
  chelsea: 'd8b9c0d1-e2f3-4567-bcde-678901234567',
};

export const mockAssets = [
  // ═══ Skyline Tower Condominiums ═══
  { id: "AST-001", name: "Fire Extinguisher FE-301", type: "Extinguisher", location: "Building A, Floor 3", serialNumber: "FE-2024-0301", status: "active", lastInspected: "2026-04-28", nextDue: "2026-05-28", manufacturer: "Kidde", installDate: "2024-01-15", customerId: CUSTOMERS.skyline },
  { id: "AST-003", name: "Fire Alarm FA-089", type: "Alarm", location: "Building A, Floor 1", serialNumber: "FA-2022-0089", status: "maintenance", lastInspected: "2026-05-16", nextDue: "2027-05-15", manufacturer: "Honeywell", installDate: "2022-03-20", customerId: CUSTOMERS.skyline },
  { id: "AST-008", name: "Extinguisher FE-180", type: "Extinguisher", location: "Building A, Floor 4", serialNumber: "FE-2022-0180", status: "active", lastInspected: "2026-04-22", nextDue: "2026-05-22", manufacturer: "Kidde", installDate: "2022-06-30", customerId: CUSTOMERS.skyline },
  { id: "AST-012", name: "Fire Hose FH-201", type: "Hose", location: "Building A, Floor 2", serialNumber: "FH-2024-0201", status: "active", lastInspected: "2026-03-20", nextDue: "2027-03-20", manufacturer: "Angus", installDate: "2024-05-15", customerId: CUSTOMERS.skyline },
  { id: "AST-014", name: "Backflow BFP-067", type: "Backflow Preventer", location: "Building A, Riser Room", serialNumber: "BFP-2023-0067", status: "active", lastInspected: "2026-03-28", nextDue: "2027-03-28", manufacturer: "Zurn", installDate: "2023-02-10", customerId: CUSTOMERS.skyline },
  { id: "AST-017", name: "Kitchen Hood KS-088", type: "Kitchen Suppression", location: "Building A, Cafeteria Kitchen", serialNumber: "KS-2023-0088", status: "active", lastInspected: "2026-03-15", nextDue: "2026-09-15", manufacturer: "Ansul", installDate: "2023-04-22", customerId: CUSTOMERS.skyline },
  { id: "AST-019", name: "Emergency Lights EL-310", type: "Emergency Lighting", location: "Building A, All Floors", serialNumber: "EL-2022-0310", status: "active", lastInspected: "2026-05-01", nextDue: "2026-06-01", manufacturer: "Lithonia", installDate: "2022-09-15", customerId: CUSTOMERS.skyline },
  { id: "AST-022", name: "Elevator Recall EV-005", type: "Elevator Recall", location: "Building A, Elevator Bank", serialNumber: "EV-2021-0005", status: "active", lastInspected: "2026-04-25", nextDue: "2027-04-25", manufacturer: "Otis", installDate: "2021-06-12", customerId: CUSTOMERS.skyline },
  { id: "AST-024", name: "Monitor System MON-012", type: "Monitoring System", location: "Building A, Telecom Room", serialNumber: "MON-2023-0012", status: "active", lastInspected: "2026-05-05", nextDue: "2027-05-05", manufacturer: "Telguard", installDate: "2023-05-10", customerId: CUSTOMERS.skyline },
  { id: "AST-028", name: "Extinguisher FE-302", type: "Extinguisher", location: "Building A, Floor 1", serialNumber: "FE-2024-0302", status: "active", lastInspected: "2026-04-15", nextDue: "2026-05-15", manufacturer: "Kidde", installDate: "2024-01-15", customerId: CUSTOMERS.skyline },
  { id: "AST-029", name: "Extinguisher FE-303", type: "Extinguisher", location: "Building A, Floor 2", serialNumber: "FE-2024-0303", status: "active", lastInspected: "2026-04-20", nextDue: "2026-05-20", manufacturer: "Amerex", installDate: "2024-02-01", customerId: CUSTOMERS.skyline },
  { id: "AST-030", name: "Extinguisher FE-304", type: "Extinguisher", location: "Building A, Floor 5", serialNumber: "FE-2024-0304", status: "active", lastInspected: "2026-05-01", nextDue: "2026-06-01", manufacturer: "Kidde", installDate: "2024-03-10", customerId: CUSTOMERS.skyline },
  { id: "AST-031", name: "Sprinkler SP-201", type: "Sprinkler", location: "Building A, Floors 1-5", serialNumber: "SP-2023-0201", status: "active", lastInspected: "2026-02-10", nextDue: "2026-05-10", manufacturer: "Tyco", installDate: "2023-05-01", customerId: CUSTOMERS.skyline },

  // ═══ Brooklyn Heights Medical Center ═══
  { id: "AST-002", name: "Sprinkler System SP-112", type: "Sprinkler", location: "Building B, Basement", serialNumber: "SP-2023-0112", status: "active", lastInspected: "2026-02-28", nextDue: "2026-05-29", manufacturer: "Tyco", installDate: "2023-06-01", customerId: CUSTOMERS.brooklyn_medical },
  { id: "AST-006", name: "Extinguisher FE-255", type: "Extinguisher", location: "Building B, Floor 1", serialNumber: "FE-2023-0255", status: "maintenance", lastInspected: "2026-05-01", nextDue: "2026-06-01", manufacturer: "Amerex", installDate: "2023-08-05", customerId: CUSTOMERS.brooklyn_medical },
  { id: "AST-009", name: "Fire Alarm FA-102", type: "Alarm", location: "Building B, Floor 2", serialNumber: "FA-2023-0102", status: "active", lastInspected: "2026-03-15", nextDue: "2027-03-15", manufacturer: "Siemens", installDate: "2023-01-22", customerId: CUSTOMERS.brooklyn_medical },
  { id: "AST-013", name: "Backflow BFP-045", type: "Backflow Preventer", location: "Building B, Mechanical Room", serialNumber: "BFP-2022-0045", status: "active", lastInspected: "2026-04-12", nextDue: "2027-04-12", manufacturer: "Watts", installDate: "2022-07-20", customerId: CUSTOMERS.brooklyn_medical },
  { id: "AST-015", name: "Fire Pump FP-001", type: "Fire Pump", location: "Building B, Pump Room", serialNumber: "FP-2020-0001", status: "active", lastInspected: "2026-05-20", nextDue: "2026-06-20", manufacturer: "Peerless", installDate: "2020-11-05", customerId: CUSTOMERS.brooklyn_medical },
  { id: "AST-018", name: "Kitchen Hood KS-099", type: "Kitchen Suppression", location: "Building B, Floor 1 Kitchen", serialNumber: "KS-2024-0099", status: "active", lastInspected: "2026-02-20", nextDue: "2026-08-20", manufacturer: "Range Guard", installDate: "2024-01-08", customerId: CUSTOMERS.brooklyn_medical },
  { id: "AST-021", name: "Smoke Control SC-001", type: "Smoke Control", location: "Building B, Roof", serialNumber: "SC-2024-0001", status: "active", lastInspected: "2026-05-10", nextDue: "2026-11-10", manufacturer: "Greenheck", installDate: "2024-03-01", customerId: CUSTOMERS.brooklyn_medical },
  { id: "AST-023", name: "Elevator Recall EV-006", type: "Elevator Recall", location: "Building B, Elevator Bank", serialNumber: "EV-2022-0006", status: "active", lastInspected: "2026-03-30", nextDue: "2027-03-30", manufacturer: "Schindler", installDate: "2022-01-18", customerId: CUSTOMERS.brooklyn_medical },

  // ═══ Hudson Yards Office Plaza ═══
  { id: "AST-004", name: "Hydrant HY-022", type: "Hydrant", location: "Parking Lot East", serialNumber: "HY-2021-0022", status: "active", lastInspected: "2026-05-10", nextDue: "2026-11-10", manufacturer: "Mueller", installDate: "2021-09-10", customerId: CUSTOMERS.hudson_yards },
  { id: "AST-007", name: "Sprinkler SP-098", type: "Sprinkler", location: "Building C, Floor 3", serialNumber: "SP-2022-0098", status: "active", lastInspected: "2026-04-28", nextDue: "2026-07-28", manufacturer: "Viking", installDate: "2022-11-18", customerId: CUSTOMERS.hudson_yards },
  { id: "AST-010", name: "Hydrant HY-031", type: "Hydrant", location: "Parking Lot West", serialNumber: "HY-2024-0031", status: "active", lastInspected: "2026-04-05", nextDue: "2026-10-05", manufacturer: "Mueller", installDate: "2024-02-14", customerId: CUSTOMERS.hudson_yards },
  { id: "AST-011", name: "Extinguisher FE-410", type: "Extinguisher", location: "Building C, Floor 1", serialNumber: "FE-2025-0410", status: "active", lastInspected: "2026-04-10", nextDue: "2026-05-10", manufacturer: "Amerex", installDate: "2025-01-08", customerId: CUSTOMERS.hudson_yards },
  { id: "AST-016", name: "Fire Pump FP-002", type: "Fire Pump", location: "Building C, Basement", serialNumber: "FP-2021-0002", status: "active", lastInspected: "2026-04-30", nextDue: "2026-05-30", manufacturer: "Armstrong", installDate: "2021-08-14", customerId: CUSTOMERS.hudson_yards },
  { id: "AST-020", name: "Emergency Lights EL-422", type: "Emergency Lighting", location: "Building C, Floors 1-3", serialNumber: "EL-2023-0422", status: "active", lastInspected: "2026-04-18", nextDue: "2026-05-18", manufacturer: "Dual-Lite", installDate: "2023-11-20", customerId: CUSTOMERS.hudson_yards },
  { id: "AST-025", name: "Monitor System MON-015", type: "Monitoring System", location: "Building C, IDF Closet", serialNumber: "MON-2024-0015", status: "active", lastInspected: "2026-04-22", nextDue: "2027-04-22", manufacturer: "AES Corporation", installDate: "2024-02-28", customerId: CUSTOMERS.hudson_yards },

  // ═══ Queens Center Mall ═══
  { id: "AST-005", name: "Fire Hose FH-156", type: "Hose", location: "Building C, Floor 2", serialNumber: "FH-2023-0156", status: "active", lastInspected: "2026-05-06", nextDue: "2027-05-05", manufacturer: "Angus", installDate: "2023-04-12", customerId: CUSTOMERS.queens_mall },
  { id: "AST-026", name: "Extinguisher FE-501", type: "Extinguisher", location: "Food Court, North Wing", serialNumber: "FE-2023-0501", status: "active", lastInspected: "2026-05-02", nextDue: "2026-06-02", manufacturer: "Kidde", installDate: "2023-05-01", customerId: CUSTOMERS.queens_mall },
  { id: "AST-027", name: "Kitchen Hood KS-101", type: "Kitchen Suppression", location: "Food Court, Kitchen A", serialNumber: "KS-2024-0101", status: "active", lastInspected: "2026-02-28", nextDue: "2026-08-28", manufacturer: "Ansul", installDate: "2024-03-01", customerId: CUSTOMERS.queens_mall },
];

export const assetTypes = ["All", "Extinguisher", "Sprinkler", "Alarm", "Hydrant", "Hose", "Backflow Preventer", "Fire Pump", "Kitchen Suppression", "Emergency Lighting", "Smoke Control", "Elevator Recall", "Monitoring System"];