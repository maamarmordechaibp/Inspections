export interface PriceBookItem {
  id: string;
  item_code: string;
  name: string;
  description: string;
  category: 'material' | 'labor';
  unit: string;
  unit_cost: number;
  labor_hours: number;
  is_active: boolean;
}

export const mockPriceBook: PriceBookItem[] = [
  // Materials
  { id: 'pb-001', item_code: 'MAT-001', name: 'ABC Fire Extinguisher 10lb', description: 'Standard ABC dry chemical extinguisher, 10 lb capacity', category: 'material', unit: 'ea', unit_cost: 145.0, labor_hours: 0, is_active: true },
  { id: 'pb-002', item_code: 'MAT-002', name: 'ABC Fire Extinguisher 20lb', description: 'Heavy-duty ABC dry chemical extinguisher, 20 lb capacity', category: 'material', unit: 'ea', unit_cost: 245.0, labor_hours: 0, is_active: true },
  { id: 'pb-003', item_code: 'MAT-003', name: 'Stainless Steel Wall Bracket', description: 'Universal wall mount bracket for extinguishers up to 20lb', category: 'material', unit: 'ea', unit_cost: 40.0, labor_hours: 0, is_active: true },
  { id: 'pb-004', item_code: 'MAT-004', name: 'Tamper Switch Assembly', description: 'Complete tamper switch kit with wiring harness', category: 'material', unit: 'ea', unit_cost: 185.0, labor_hours: 0, is_active: true },
  { id: 'pb-005', item_code: 'MAT-005', name: 'Sprinkler Head — Upright 155°F', description: 'Standard response upright sprinkler head, 155°F rating', category: 'material', unit: 'ea', unit_cost: 22.5, labor_hours: 0, is_active: true },
  { id: 'pb-006', item_code: 'MAT-006', name: 'Sprinkler Head — Pendent 155°F', description: 'Standard response pendent sprinkler head, 155°F rating', category: 'material', unit: 'ea', unit_cost: 24.0, labor_hours: 0, is_active: true },
  { id: 'pb-007', item_code: 'MAT-007', name: 'Sprinkler Escutcheon Plate', description: 'Adjustable escutcheon plate, chrome finish', category: 'material', unit: 'ea', unit_cost: 8.5, labor_hours: 0, is_active: true },
  { id: 'pb-008', item_code: 'MAT-008', name: 'Fusible Link Set (4-pack)', description: 'Replacement fusible links for kitchen suppression systems', category: 'material', unit: 'set', unit_cost: 85.0, labor_hours: 0, is_active: true },
  { id: 'pb-009', item_code: 'MAT-009', name: 'Agent Cylinder Recharge', description: 'Wet chemical agent cylinder recharge service', category: 'material', unit: 'ea', unit_cost: 320.0, labor_hours: 0, is_active: true },
  { id: 'pb-010', item_code: 'MAT-010', name: 'Emergency Lighting Battery', description: 'Ni-Cd 6V 4.5Ah replacement battery for emergency lighting', category: 'material', unit: 'ea', unit_cost: 45.0, labor_hours: 0, is_active: true },
  { id: 'pb-011', item_code: 'MAT-011', name: 'Exit Sign LED Module', description: 'Universal LED retrofit module for exit signs', category: 'material', unit: 'ea', unit_cost: 68.0, labor_hours: 0, is_active: true },
  { id: 'pb-012', item_code: 'MAT-012', name: 'Reflective Hydrant Marker', description: 'High-visibility reflective marker post for fire hydrants', category: 'material', unit: 'ea', unit_cost: 35.0, labor_hours: 0, is_active: true },
  { id: 'pb-013', item_code: 'MAT-013', name: 'Smoke Detector — Ionization', description: 'Hardwired ionization smoke detector with backup battery', category: 'material', unit: 'ea', unit_cost: 52.0, labor_hours: 0, is_active: true },
  { id: 'pb-014', item_code: 'MAT-014', name: 'Smoke Detector — Photoelectric', description: 'Hardwired photoelectric smoke detector with backup battery', category: 'material', unit: 'ea', unit_cost: 58.0, labor_hours: 0, is_active: true },
  { id: 'pb-015', item_code: 'MAT-015', name: 'FACP Battery 12V 7Ah (pair)', description: 'Sealed lead-acid battery pair for fire alarm control panel', category: 'material', unit: 'pair', unit_cost: 125.0, labor_hours: 0, is_active: true },
  { id: 'pb-016', item_code: 'MAT-016', name: 'Fire Hose — 1.5" x 50ft', description: 'Single jacket fire hose with brass couplings', category: 'material', unit: 'ea', unit_cost: 195.0, labor_hours: 0, is_active: true },
  { id: 'pb-017', item_code: 'MAT-017', name: 'Nozzle — Fog/Straight Stream', description: 'Combination fog and straight stream brass nozzle', category: 'material', unit: 'ea', unit_cost: 145.0, labor_hours: 0, is_active: true },
  { id: 'pb-018', item_code: 'MAT-018', name: 'Backflow Preventer Test Kit', description: 'Differential pressure gauge test kit for backflow testing', category: 'material', unit: 'ea', unit_cost: 380.0, labor_hours: 0, is_active: true },
  { id: 'pb-019', item_code: 'MAT-019', name: 'Pipe Hanger — Adjustable', description: 'Adjustable swivel ring pipe hanger, 1"–2" capacity', category: 'material', unit: 'ea', unit_cost: 12.5, labor_hours: 0, is_active: true },
  { id: 'pb-020', item_code: 'MAT-020', name: 'Seismic Brace — Swivel', description: 'Swivel seismic sway brace for sprinkler systems', category: 'material', unit: 'ea', unit_cost: 28.0, labor_hours: 0, is_active: true },

  // Labor
  { id: 'pb-101', item_code: 'LAB-001', name: 'Standard Technician Labor', description: 'General fire protection technician labor', category: 'labor', unit: 'hr', unit_cost: 95.0, labor_hours: 1, is_active: true },
  { id: 'pb-102', item_code: 'LAB-002', name: 'Certified Inspector Labor', description: 'NFPA-certified inspector labor for inspections and testing', category: 'labor', unit: 'hr', unit_cost: 125.0, labor_hours: 1, is_active: true },
  { id: 'pb-103', item_code: 'LAB-003', name: 'Emergency Service Labor', description: 'After-hours or emergency response labor rate', category: 'labor', unit: 'hr', unit_cost: 185.0, labor_hours: 1, is_active: true },
  { id: 'pb-104', item_code: 'LAB-004', name: 'System Design/Engineering', description: 'Engineering and system design labor', category: 'labor', unit: 'hr', unit_cost: 165.0, labor_hours: 1, is_active: true },
  { id: 'pb-105', item_code: 'LAB-005', name: 'Helper/Apprentice Labor', description: 'Apprentice or helper labor for material handling and prep', category: 'labor', unit: 'hr', unit_cost: 65.0, labor_hours: 1, is_active: true },
  { id: 'pb-106', item_code: 'LAB-006', name: 'Travel Time', description: 'Travel time to and from job site', category: 'labor', unit: 'hr', unit_cost: 55.0, labor_hours: 1, is_active: true },
  { id: 'pb-107', item_code: 'LAB-007', name: 'Report & Documentation', description: 'Time for report writing, documentation, and data entry', category: 'labor', unit: 'hr', unit_cost: 75.0, labor_hours: 1, is_active: true },
  { id: 'pb-108', item_code: 'LAB-008', name: 'Service Call Minimum', description: 'Minimum service call charge (covers first hour)', category: 'labor', unit: 'ea', unit_cost: 150.0, labor_hours: 1, is_active: true },
];

export function getPriceBookItems(): PriceBookItem[] {
  return mockPriceBook;
}

export function getMaterials(): PriceBookItem[] {
  return mockPriceBook.filter((p) => p.category === 'material');
}

export function getLaborItems(): PriceBookItem[] {
  return mockPriceBook.filter((p) => p.category === 'labor');
}

export function searchPriceBook(query: string): PriceBookItem[] {
  const q = query.toLowerCase();
  return mockPriceBook.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.item_code.toLowerCase().includes(q)
  );
}

export function getPriceBookItemById(id: string): PriceBookItem | undefined {
  return mockPriceBook.find((p) => p.id === id);
}