import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// METRO FIRE PROTECTION — Massive Demo Data Seeder
// Creates: 75 customers, 500+ assets, 1000+ inspections,
// deficiencies, proposals, work orders, invoices, payments,
// documents, notifications, recurring schedules
// ============================================================

const COMPANY_NAMES = [
  "Metro Towers Property Management", "Grand Plaza Hotel Group", "Harborview Medical Center",
  "Westfield Shopping District", "Pinnacle Industrial Park", "Riverside Office Complex",
  "Oakwood Senior Living", "Crestview Apartments LLC", "Downtown Commerce Center",
  "Bay Harbor Residences", "Summit Data Center", "Clearwater School District",
  "Stonebridge Manufacturing", "Lakeside Convention Center", "Eastgate Retail Plaza",
  "Park Avenue Highrise", "Sunset Valley Hospital", "Golden State University",
  "Pacific Logistics Hub", "Mountain View Resort", "Capitol Hill Office Suites",
  "Redwood Community College", "Iron Gate Warehouse District", "Silver Creek Country Club",
  "Northstar Corporate Campus", "Bayshore Marina Complex", "Heritage Museum & Gallery",
  "Cedar Ridge Apartments", "Valley Tech Innovation Center", "Harbor Point Towers",
  "The Meridian Hotel", "Crossroads Business Park", "Sierra Nevada Apartments",
  "Pacific Heights Medical Plaza", "Golden Gate Convention Hall", "Seaside Luxury Condos",
  "Atlas Industrial Complex", "Evergreen Assisted Living", "Cascade Research Labs",
  "Frontier Distribution Center", "Blue Lake Storage Facility", "Pinehurst Elementary School",
  "Sterling Office Tower", "Ridgeview Shopping Center", "Coastal Data Solutions",
  "Empire State Offices", "Meadowbrook Nursing Home", "Summit Park Executive Suites",
  "Liberty Financial Center", "Horizon Tech Campus", "Brookfield Retail Hub",
  "Highland Medical Group", "Desert Vista Resort & Spa", "Prairie View Manufacturing",
  "The Cambridge Residences", "Arcadia Sports Complex", "Milestone Industrial Park",
  "Woodland Heights School", "Pinnacle Peak Resort", "Garden State Mall",
  "Twin Peaks Office Park", "South Beach Condominiums", "Crown Jewel Casino & Hotel",
  "Alpine Storage Systems", "Metropolis Convention Center", "Oceanview Retirement Village",
  "Keystone Corporate Center", "Brighton Hills Apartments", "Phoenix Biomedical Campus",
  "The Starlight Theater", "Discovery Science Museum", "Ironwood Industrial Center",
  "Ashford Luxury Apartments", "Trinity Hospital Network", "Western States University",
  "Diamond Head Resort", "Falcon Ridge Business Park", "Portside Warehouse Complex",
];

const STREETS = [
  "2450 Commerce Drive", "1800 Harbor Boulevard", "7200 Medical Center Parkway",
  "3500 Retail Circle", "890 Industrial Way", "1200 Riverside Avenue",
  "560 Oakwood Lane", "4300 Crestview Drive", "150 Downtown Plaza",
  "2800 Bay Shore Road", "900 Summit Ridge", "4100 Clearwater Boulevard",
  "760 Stonebridge Road", "2200 Lakeside Drive", "5400 Eastgate Boulevard",
  "890 Park Avenue", "3100 Sunset Valley Road", "5600 University Drive",
  "1800 Pacific Highway", "4200 Mountain View Road", "220 Capitol Mall",
  "7500 Redwood Lane", "3900 Iron Gate Boulevard", "1100 Silver Creek Road",
  "1550 Northstar Drive", "880 Bayshore Way", "2250 Heritage Lane",
  "6700 Cedar Ridge Court", "3200 Innovation Drive", "450 Harbor Point",
];

const CITIES = [
  "San Francisco, CA", "Oakland, CA", "San Jose, CA", "Sacramento, CA",
  "Fresno, CA", "Los Angeles, CA", "San Diego, CA", "Portland, OR",
  "Seattle, WA", "Phoenix, AZ", "Denver, CO", "Austin, TX",
  "Dallas, TX", "Houston, TX", "Las Vegas, NV", "Salt Lake City, UT",
];

const ASSET_TYPES = [
  { type: "fire_extinguisher", base_names: ["FE", "EXT"], count_per_building: [3, 8] },
  { type: "sprinkler_system", base_names: ["SP", "SPR"], count_per_building: [1, 3] },
  { type: "fire_alarm", base_names: ["FA", "FACP"], count_per_building: [1, 2] },
  { type: "fire_hydrant", base_names: ["FH", "HYD"], count_per_building: [1, 4] },
  { type: "fire_hose", base_names: ["FH", "FHC"], count_per_building: [1, 3] },
  { type: "standpipe", base_names: ["ST", "SP"], count_per_building: [1, 2] },
  { type: "backflow_preventer", base_names: ["BF", "BFP"], count_per_building: [1, 2] },
  { type: "fire_pump", base_names: ["FP", "PUMP"], count_per_building: [1, 1] },
  { type: "emergency_lighting", base_names: ["EL", "EXIT"], count_per_building: [4, 12] },
  { type: "smoke_control", base_names: ["SC", "SMP"], count_per_building: [1, 2] },
  { type: "kitchen_suppression", base_names: ["KS", "KSC"], count_per_building: [1, 2] },
  { type: "elevator_recall", base_names: ["ER", "ELV"], count_per_building: [1, 2] },
];

const MANUFACTURERS = [
  "Kidde", "Ansul", "Tyco", "SimplexGrinnell", "Notifier", "Honeywell",
  "Siemens", "Johnson Controls", "Viking", "Reliable", "Victaulic",
  "Potter Electric", "System Sensor", "Gentex", "Wheelock",
];

const INSPECTION_TYPES: Record<string, string[]> = {
  fire_extinguisher: ["Monthly Visual", "Annual Maintenance", "6-Year Teardown", "Hydrostatic Test"],
  sprinkler_system: ["Quarterly Inspection", "Annual Main Drain Test", "5-Year Internal Inspection"],
  fire_alarm: ["Semi-Annual Test", "Annual Inspection", "5-Year Sensitivity Test"],
  fire_hydrant: ["Semi-Annual Flow Test", "Annual Inspection", "5-Year Pressure Test"],
  fire_hose: ["Semi-Annual Inspection", "Annual Pressure Test", "3-Year Service Test"],
  standpipe: ["Semi-Annual Flow Test", "Annual Inspection", "5-Year Hydrostatic"],
  backflow_preventer: ["Annual Test", "5-Year Rebuild"],
  fire_pump: ["Weekly Churn Test", "Monthly Inspection", "Annual Flow Test"],
  emergency_lighting: ["Monthly 30-Second Test", "Annual 90-Minute Test"],
  smoke_control: ["Semi-Annual Test", "Annual Integrated Test"],
  kitchen_suppression: ["Semi-Annual Inspection", "Annual Fusible Link", "12-Year Hydrostatic"],
  elevator_recall: ["Monthly Test", "Annual Integrated Test"],
};

const FINDINGS_TEMPLATES: Record<string, string[]> = {
  pass: [
    "All components in good working order. No deficiencies noted.",
    "Inspection passed. System functioning within NFPA parameters.",
    "All tests passed. Equipment shows normal wear consistent with age.",
    "No issues found. System ready for continued service.",
  ],
  needs_attention: [
    "Minor wear on seals. Recommend monitoring and replacement within 6 months.",
    "Gauge reading slightly low but within acceptable range. Monitor next cycle.",
    "Battery date approaching expiration. Schedule replacement before next inspection.",
    "Slight corrosion on coupling threads. Clean and lubricate.",
  ],
  fail: [
    "Pressure gauge in red zone. Unit requires immediate replacement.",
    "Tamper seal broken. System may have been used or serviced by unauthorized personnel.",
    "Battery backup failed. Control panel not receiving primary power.",
    "Significant corrosion found on valve assembly. Unit is non-compliant.",
    "Flow rate below NFPA minimum. Pump may need servicing.",
    "Smoke detector failed sensitivity test. Replacement required.",
    "Hose showing dry rot and cracking. Remove from service immediately.",
    "Control valve found in closed position. Restored and tagged.",
    "Sprinkler head painted over. Requires replacement.",
    "Agent level below minimum. Recharge required.",
  ],
};

const DEFICIENCY_DESCRIPTIONS = [
  { severity: "critical", desc: "Fire pump failed flow test — output below NFPA 20 requirements. Immediate repair needed.", cost: 8500 },
  { severity: "high", desc: "Control panel showing ground fault on zone 4. Troubleshooting and circuit repair required.", cost: 3200 },
  { severity: "high", desc: "Sprinkler head obstructed by storage within 18 inches. Clearance violation.", cost: 1500 },
  { severity: "critical", desc: "Emergency lighting battery pack fully depleted. 90-minute runtime cannot be met.", cost: 4200 },
  { severity: "medium", desc: "Backflow preventer leaking at shutoff valve #2. Gasket replacement needed.", cost: 950 },
  { severity: "medium", desc: "Fire extinguisher past 6-year maintenance interval. Teardown and recharge required.", cost: 450 },
  { severity: "low", desc: "Exit sign bulb burned out on 3rd floor east wing. Replacement needed.", cost: 120 },
  { severity: "high", desc: "Kitchen suppression nozzle missing cap. System may have partially discharged.", cost: 1800 },
  { severity: "critical", desc: "Alarm communication line to central station is down. Cellular backup active but primary POTS line dead.", cost: 5600 },
  { severity: "medium", desc: "Hose cabinet door hinge broken on FH-12. Door will not stay closed.", cost: 350 },
  { severity: "low", desc: "Inspection tag faded and illegible. Replace with current tag.", cost: 25 },
  { severity: "high", desc: "Fire damper in HVAC duct A-7 stuck in closed position. Airflow obstructed.", cost: 2400 },
];

const TECH_NOTES = [
  "Spoke with building manager Maria. All floors accessible.",
  "Roof access requires key from security desk.",
  "Server room requires escort — coordinated with IT department.",
  "Tenant in suite 400 refused entry. Will reschedule that unit.",
  "Customer provided ladder for ceiling access.",
  "Kitchen was active — coordinated with chef for hood inspection.",
  "Parking validated by front desk.",
  "Annual fire drill scheduled for next month — discussed coordination.",
];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function dateAddDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function isoStr(d: Date): string {
  return d.toISOString();
}

Deno.serve(async (_req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: string[] = [];
    const today = new Date("2026-06-16");

    // ── Step 1: Get existing users ──────────────────────────
    const { data: profiles } = await supabase.from("profiles").select("id, email, full_name, role");
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "No profiles found. Run user creation first." }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    const admins = profiles.filter((p: any) => p.role === "admin");
    const managers = profiles.filter((p: any) => p.role === "manager");
    const techs = profiles.filter((p: any) => p.role === "technician");

    if (admins.length === 0 || techs.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Need at least 1 admin and 1 technician." }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    const allUserIds = profiles.map((p: any) => p.id);
    const adminId = admins[0].id;
    const techIds = techs.map((t: any) => t.id);
    const managerIds = managers.map((m: any) => m.id);

    results.push(`Found ${profiles.length} users (${admins.length} admin, ${managers.length} manager, ${techs.length} technician)`);

    // ── Step 2: Clear existing demo data ────────────────────
    const tables = ["payments","invoices","work_orders","proposals","deficiencies","documents",
                    "inspections","recurring_schedules","assets","customers","notifications","audit_logs"];
    for (const tbl of tables) {
      await supabase.from(tbl).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }
    results.push("Cleared all existing data");

    // ── Step 3: Create 75 customers ─────────────────────────
    const customerIds: string[] = [];
    const customerData: any[] = [];
    const usedNames = new Set<string>();

    for (let i = 0; i < 75; i++) {
      let company: string;
      do { company = pick(COMPANY_NAMES); } while (usedNames.has(company));
      usedNames.add(company);

      const city = pick(CITIES);
      const street = pick(STREETS);
      const id = crypto.randomUUID();
      customerIds.push(id);

      const contactFirst = pick(["James","Maria","Robert","Linda","Michael","Patricia","John","Jennifer","David","Susan"]);
      const contactLast = pick(["Wilson","Garcia","Martinez","Brown","Davis","Jones","Taylor","Anderson","Thomas","Jackson"]);

      customerData.push({
        id, name: company, company, city, state: city.split(", ")[1] || "CA",
        address: street, zip: String(rand(90001, 99999)),
        phone: `(${rand(200,999)}) ${rand(200,999)}-${rand(1000,9999)}`,
        email: `facility@${company.toLowerCase().replace(/[^a-z]/g,"").slice(0,20)}.com`,
        contact_name: `${contactFirst} ${contactLast}`,
        notes: pick(["24/7 monitored facility","Key card access required","After-hours access available","Requires escort in secure areas","Loading dock access for service vehicles","Site contact available via phone","Building engineer on staff","Multiple buildings on campus"]),
        created_at: isoStr(dateAddDays(today, -rand(180, 720))),
      });
    }

    // Insert in batches of 25
    for (let i = 0; i < customerData.length; i += 25) {
      const batch = customerData.slice(i, i + 25);
      const { error } = await supabase.from("customers").insert(batch);
      if (error) { results.push(`Customer batch ${i} error: ${error.message}`); continue; }
    }
    results.push(`Created ${customerData.length} customers`);

    // ── Step 4: Create 500+ assets ──────────────────────────
    const assetRows: any[] = [];
    const assetIdsByCustomer: Record<string, string[]> = {};

    for (const custId of customerIds) {
      const numBuildings = rand(1, 4);
      const custAssetIds: string[] = [];

      for (let b = 0; b < numBuildings; b++) {
        const buildingNum = rand(1, 30);
        for (const at of ASSET_TYPES) {
          const count = rand(at.count_per_building[0], at.count_per_building[1]);
          for (let c = 0; c < count; c++) {
            const id = crypto.randomUUID();
            const installDate = dateAddDays(today, -rand(365, 2555));
            const lastInsp = dateAddDays(today, -rand(7, 365));
            const nextDue = dateAddDays(lastInsp, rand(30, 365));
            const serialNum = `${pick(["K","A","T","S","N","H","J","V","P","R"])}-${String(rand(10000,99999))}-${String(rand(1000,9999))}`;

            assetRows.push({
              id,
              customer_id: custId,
              name: `${at.base_names[0]}-${String(100 + assetRows.length).padStart(3,"0")}`,
              type: at.type,
              location: buildingNum <= 1
                ? pick(["Main Lobby","Basement Mechanical Room","Roof Penthouse","2nd Floor Hallway","Parking Garage","Loading Dock","Server Room","Electrical Room","Kitchen Area","Main Corridor"])
                : `Building ${buildingNum} - ${pick(["Lobby","Mechanical Room","Hallway","Stairwell","Basement","Penthouse","Utility Closet","Corridor"])}`,
              serial_number: serialNum,
              status: Math.random() > 0.12 ? "active" : pick(["maintenance","out_of_service"]),
              manufacturer: pick(MANUFACTURERS),
              install_date: dateStr(installDate),
              last_inspected: dateStr(lastInsp),
              next_due: dateStr(nextDue),
              created_at: isoStr(installDate),
            });
            custAssetIds.push(id);
          }
        }
      }
      assetIdsByCustomer[custId] = custAssetIds;
    }

    // Insert assets in batches of 50
    for (let i = 0; i < assetRows.length; i += 50) {
      const batch = assetRows.slice(i, i + 50);
      const { error } = await supabase.from("assets").insert(batch);
      if (error) { results.push(`Asset batch ${i} error: ${error.message}`); continue; }
    }
    results.push(`Created ${assetRows.length} assets`);

    // ── Step 5: Create 1000+ inspections ────────────────────
    const inspectionRows: any[] = [];
    const completedInspections: any[] = [];
    const failedInspections: any[] = [];

    for (const asset of assetRows) {
      // Each asset gets 1-4 inspection records spanning the last 18 months
      const numInsp = rand(1, 4);
      for (let i = 0; i < numInsp; i++) {
        const id = crypto.randomUUID();
        const scheduledDate = dateAddDays(today, -rand(0, 540));
        const statusRoll = Math.random();
        let status: string;
        let completedDate: Date | null = null;
        let rating: string | null = null;
        let findings: string | null = null;
        let checklistData: any = null;
        let checkedInAt: string | null = null;
        let checkedOutAt: string | null = null;
        let checkInLat: number | null = null;
        let checkInLng: number | null = null;
        let checkOutLat: number | null = null;
        let checkOutLng: number | null = null;

        if (statusRoll < 0.40) {
          // completed with pass
          status = "completed";
          completedDate = dateAddDays(scheduledDate, rand(0, 2));
          rating = "pass";
          findings = pick(FINDINGS_TEMPLATES.pass);
          checkedInAt = isoStr(new Date(completedDate.getTime() - rand(1800000, 14400000)));
          checkedOutAt = isoStr(new Date(completedDate.getTime() + rand(1800000, 21600000)));
          checkInLat = 37.7749 + (Math.random() - 0.5) * 0.5;
          checkInLng = -122.4194 + (Math.random() - 0.5) * 0.5;
          checkOutLat = checkInLat + (Math.random() - 0.5) * 0.001;
          checkOutLng = checkInLng + (Math.random() - 0.5) * 0.001;
        } else if (statusRoll < 0.55) {
          // completed with needs_attention
          status = "completed";
          completedDate = dateAddDays(scheduledDate, rand(0, 3));
          rating = "needs_attention";
          findings = pick(FINDINGS_TEMPLATES.needs_attention);
          checkedInAt = isoStr(new Date(completedDate.getTime() - rand(1800000, 14400000)));
          checkedOutAt = isoStr(new Date(completedDate.getTime() + rand(1800000, 21600000)));
          checkInLat = 37.7749 + (Math.random() - 0.5) * 0.5;
          checkInLng = -122.4194 + (Math.random() - 0.5) * 0.5;
          checkOutLat = checkInLat + (Math.random() - 0.5) * 0.001;
          checkOutLng = checkInLng + (Math.random() - 0.5) * 0.001;
        } else if (statusRoll < 0.62) {
          // completed with fail
          status = "completed";
          completedDate = dateAddDays(scheduledDate, rand(0, 2));
          rating = "fail";
          findings = pick(FINDINGS_TEMPLATES.fail);
          checkedInAt = isoStr(new Date(completedDate.getTime() - rand(1800000, 14400000)));
          checkedOutAt = isoStr(new Date(completedDate.getTime() + rand(1800000, 21600000)));
          checkInLat = 37.7749 + (Math.random() - 0.5) * 0.5;
          checkInLng = -122.4194 + (Math.random() - 0.5) * 0.5;
          checkOutLat = checkInLat + (Math.random() - 0.5) * 0.001;
          checkOutLng = checkInLng + (Math.random() - 0.5) * 0.001;
        } else if (statusRoll < 0.72) {
          // scheduled (future)
          status = "scheduled";
          // Override scheduledDate to be in the future
          const futureDate = dateAddDays(today, rand(1, 90));
          scheduledDate.setTime(futureDate.getTime());
        } else if (statusRoll < 0.78) {
          // overdue
          status = "overdue";
          scheduledDate.setTime(dateAddDays(today, -rand(30, 120)).getTime());
        } else {
          // in_progress
          status = "in_progress";
          scheduledDate.setTime(dateAddDays(today, -rand(0, 2)).getTime());
          checkedInAt = isoStr(new Date(Date.now() - rand(1800000, 7200000)));
          checkInLat = 37.7749 + (Math.random() - 0.5) * 0.5;
          checkInLng = -122.4194 + (Math.random() - 0.5) * 0.5;
        }

        // Pick inspection type based on asset type
        const types = INSPECTION_TYPES[asset.type] || ["Annual Inspection"];
        const inspType = pick(types);

        // Build checklist data for completed inspections
        if (status === "completed" && completedDate) {
          const items = [];
          const numItems = rand(4, 10);
          for (let j = 0; j < numItems; j++) {
            const itemStatus = rating === "fail" && Math.random() < 0.3 ? "fail" : rating === "needs_attention" && Math.random() < 0.2 ? "attention" : "pass";
            items.push({
              id: `item-${j}`,
              description: pick([
                "Visual inspection of unit", "Check pressure gauge reading",
                "Test alarm functionality", "Inspect seals and gaskets",
                "Verify mounting hardware", "Check for physical damage",
                "Test backup battery", "Verify signage and labeling",
                "Inspect valve operation", "Flow test", "Check tamper seal",
                "Verify clearance requirements", "Test emergency stop",
                "Inspect hose connections", "Check nozzle condition",
              ]),
              status: itemStatus,
              notes: itemStatus !== "pass" ? pick(["Requires follow-up", "Flagged for repair", "See attached photo"]) : null,
            });
          }
          checklistData = {
            items,
            tech_notes: pick(TECH_NOTES),
            completion_time_minutes: rand(15, 120),
          };
        }

        inspectionRows.push({
          id,
          asset_id: asset.id,
          customer_id: asset.customer_id,
          inspector_id: pick(techIds),
          scheduled_date: dateStr(scheduledDate),
          completed_date: completedDate ? dateStr(completedDate) : null,
          status,
          inspection_type: inspType,
          rating,
          findings,
          checklist_data: checklistData,
          checked_in_at: checkedInAt,
          checked_out_at: checkedOutAt,
          check_in_lat: checkInLat,
          check_in_lng: checkInLng,
          check_out_lat: checkOutLat,
          check_out_lng: checkOutLng,
          created_at: isoStr(dateAddDays(today, -rand(1, 540))),
        });

        if (status === "completed") {
          completedInspections.push(inspectionRows[inspectionRows.length - 1]);
          if (rating === "fail") {
            failedInspections.push(inspectionRows[inspectionRows.length - 1]);
          }
        }
      }
    }

    // Insert inspections in batches
    for (let i = 0; i < inspectionRows.length; i += 50) {
      const batch = inspectionRows.slice(i, i + 50);
      const { error } = await supabase.from("inspections").insert(batch);
      if (error) { results.push(`Inspection batch ${i} error: ${error.message}`); continue; }
    }
    results.push(`Created ${inspectionRows.length} inspections (${completedInspections.length} completed, ${failedInspections.length} failed)`);

    // ── Step 6: Create deficiencies from failed inspections ──
    const deficiencyRows: any[] = [];
    const deficiencyIds: string[] = [];

    for (const insp of failedInspections) {
      // 1-3 deficiencies per failed inspection
      const numDef = rand(1, 3);
      for (let d = 0; d < numDef; d++) {
        const id = crypto.randomUUID();
        const defTemplate = pick(DEFICIENCY_DESCRIPTIONS);
        const status = Math.random() < 0.35 ? "resolved" : Math.random() < 0.5 ? "in_progress" : "open";
        const resolvedAt = status === "resolved" ? isoStr(dateAddDays(new Date(insp.completed_date!), rand(3, 60))) : null;

        deficiencyRows.push({
          id,
          inspection_id: insp.id,
          asset_id: insp.asset_id,
          customer_id: insp.customer_id,
          checklist_item_id: `item-${rand(0, 9)}`,
          checklist_item_description: pick(["Pressure gauge","Seal integrity","Battery backup","Valve operation","Flow rate","Tamper seal","Mounting hardware"]),
          severity: defTemplate.severity,
          description: defTemplate.desc,
          corrective_action: pick([
            "Replace damaged component with OEM part",
            "Schedule vendor for repair within 30 days",
            "Perform full system test after repair",
            "Clean and recalibrate sensor",
            "Replace battery pack and retest",
            "Order replacement unit — estimated 2 week lead time",
            "Coordinate with building engineer for shutdown window",
          ]),
          status,
          estimated_cost: defTemplate.cost + rand(-200, 500),
          resolved_at: resolvedAt,
          resolved_by: status === "resolved" ? pick(techIds) : null,
          created_at: isoStr(new Date(insp.completed_date!)),
        });
        deficiencyIds.push(id);
      }
    }

    if (deficiencyRows.length > 0) {
      for (let i = 0; i < deficiencyRows.length; i += 25) {
        const batch = deficiencyRows.slice(i, i + 25);
        await supabase.from("deficiencies").insert(batch);
      }
    }
    results.push(`Created ${deficiencyRows.length} deficiencies`);

    // ── Step 7: Create proposals from deficiencies ──────────
    const proposalRows: any[] = [];
    const proposalIds: string[] = [];
    const deficiencyByCustomer: Record<string, string[]> = {};

    for (const def of deficiencyRows.slice(0, 40)) {
      if (!deficiencyByCustomer[def.customer_id]) deficiencyByCustomer[def.customer_id] = [];
      deficiencyByCustomer[def.customer_id].push(def.id);
    }

    for (const [custId, defIds] of Object.entries(deficiencyByCustomer)) {
      // Group into proposals of 1-4 deficiencies each
      while (defIds.length > 0) {
        const group = defIds.splice(0, rand(1, 4));
        const id = crypto.randomUUID();
        const subtotal = group.reduce((sum) => sum + rand(500, 12000), 0);
        const taxRate = 0.0875;
        const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
        const total = subtotal + taxAmount;
        const statusRoll = Math.random();
        const status = statusRoll < 0.3 ? "draft" : statusRoll < 0.6 ? "sent" : statusRoll < 0.85 ? "approved" : "rejected";
        const sentAt = status !== "draft" ? isoStr(dateAddDays(today, -rand(5, 120))) : null;

        proposalRows.push({
          id,
          customer_id: custId,
          deficiency_ids: group,
          title: `Fire System Repair — ${pick(["Emergency Lighting","Sprinkler System","Fire Alarm","Backflow Preventer","Kitchen Hood","Fire Pump"])}`,
          description: `Proposal for corrective actions identified during recent fire and life safety inspection at your facility. Scope includes all materials, labor, and testing per NFPA standards.`,
          line_items: group.map((did, idx) => ({
            description: `Repair item #${idx + 1}`,
            quantity: 1,
            unit_price: rand(500, 12000),
            total: rand(500, 12000),
          })),
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          status,
          sent_at: sentAt,
          approved_at: status === "approved" ? isoStr(dateAddDays(today, -rand(3, 60))) : null,
          valid_until: dateStr(dateAddDays(today, 30)),
          notes: null,
          created_by: pick(managerIds.length > 0 ? managerIds : [adminId]),
          created_at: isoStr(dateAddDays(today, -rand(3, 120))),
        });
        proposalIds.push(id);
      }
    }

    if (proposalRows.length > 0) {
      await supabase.from("proposals").insert(proposalRows);
    }
    results.push(`Created ${proposalRows.length} proposals`);

    // ── Step 8: Create work orders from approved proposals ──
    const workOrderRows: any[] = [];
    const workOrderIds: string[] = [];
    const approvedProps = proposalRows.filter((p: any) => p.status === "approved");

    for (const prop of approvedProps) {
      const id = crypto.randomUUID();
      const statusRoll = Math.random();
      const status = statusRoll < 0.4 ? "completed" : statusRoll < 0.7 ? "in_progress" : "scheduled";
      const completedDate = status === "completed" ? dateStr(dateAddDays(today, -rand(3, 90))) : null;
      const laborHours = status === "completed" ? rand(4, 40) : null;
      const materialsCost = Math.round(prop.total * (0.2 + Math.random() * 0.3) * 100) / 100;
      const laborCost = Math.round(prop.total * (0.3 + Math.random() * 0.4) * 100) / 100;
      const totalCost = materialsCost + laborCost;

      workOrderRows.push({
        id,
        proposal_id: prop.id,
        customer_id: prop.customer_id,
        deficiency_ids: prop.deficiency_ids,
        asset_ids: [],
        title: `WO: ${prop.title}`,
        description: prop.description,
        priority: pick(["normal","high","urgent"]),
        status,
        assigned_to: pick(techIds),
        scheduled_date: dateStr(dateAddDays(today, status === "scheduled" ? rand(1, 14) : -rand(7, 60))),
        completed_date: completedDate,
        labor_hours: laborHours,
        materials_cost: materialsCost,
        labor_cost: laborCost,
        total_cost: totalCost,
        notes: pick(TECH_NOTES),
        line_items: prop.line_items,
        created_by: pick(managerIds.length > 0 ? managerIds : [adminId]),
        created_at: isoStr(dateAddDays(today, -rand(3, 90))),
      });
      workOrderIds.push(id);
    }

    // Also create some standalone work orders not tied to proposals
    for (let i = 0; i < 15; i++) {
      const custId = pick(customerIds);
      const id = crypto.randomUUID();
      const status = pick(["completed","in_progress","scheduled","completed","completed"]);
      const materialsCost = rand(200, 5000);
      const laborCost = rand(300, 8000);
      const totalCost = materialsCost + laborCost;
      const completedDate = status === "completed" ? dateStr(dateAddDays(today, -rand(3, 120))) : null;

      workOrderRows.push({
        id, proposal_id: null, customer_id: custId, deficiency_ids: [], asset_ids: [],
        title: pick(["Emergency Exit Light Repair","Annual Backflow Test","Fire Door Inspection","Hood Suppression Service","Alarm Panel Diagnostics","Sprinkler Head Replacement"]),
        description: "Service call for routine maintenance and testing.",
        priority: pick(["normal","high"]),
        status,
        assigned_to: pick(techIds),
        scheduled_date: dateStr(dateAddDays(today, status === "scheduled" ? rand(1, 30) : -rand(7, 180))),
        completed_date: completedDate,
        labor_hours: status === "completed" ? rand(2, 16) : null,
        materials_cost: materialsCost,
        labor_cost: laborCost,
        total_cost: totalCost,
        notes: null,
        line_items: [{ description: "Labor", quantity: 1, unit_price: laborCost, total: laborCost }, { description: "Materials", quantity: 1, unit_price: materialsCost, total: materialsCost }],
        created_by: adminId,
        created_at: isoStr(dateAddDays(today, -rand(3, 180))),
      });
      workOrderIds.push(id);
    }

    if (workOrderRows.length > 0) {
      await supabase.from("work_orders").insert(workOrderRows);
    }
    results.push(`Created ${workOrderRows.length} work orders`);

    // ── Step 9: Create invoices from work orders ────────────
    const invoiceRows: any[] = [];
    const invoiceIds: string[] = [];

    for (const wo of workOrderRows) {
      const id = crypto.randomUUID();
      const statusRoll = Math.random();
      const status = statusRoll < 0.35 ? "paid" : statusRoll < 0.55 ? "sent" : statusRoll < 0.7 ? "draft" : "overdue";
      const total = wo.total_cost || rand(500, 15000);
      const taxRate = 0.0875;
      const subtotal = Math.round(total / (1 + taxRate) * 100) / 100;
      const taxAmount = Math.round((total - subtotal) * 100) / 100;
      const sentAt = status !== "draft" ? isoStr(dateAddDays(today, -rand(10, 120))) : null;
      const paidAt = status === "paid" ? isoStr(dateAddDays(today, -rand(3, 60))) : null;
      const dueDate = dateStr(dateAddDays(today, status === "overdue" ? -rand(1, 60) : rand(15, 45)));

      invoiceRows.push({
        id,
        work_order_id: wo.id,
        proposal_id: wo.proposal_id || null,
        customer_id: wo.customer_id,
        invoice_number: `INV-${String(2026000 + invoiceRows.length).padStart(5,"0")}`,
        title: `Invoice for ${wo.title}`,
        description: wo.description || "Fire and life safety services",
        line_items: wo.line_items || [],
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        status,
        sent_at: sentAt,
        paid_at: paidAt,
        due_date: dueDate,
        notes: null,
        created_by: wo.created_by || adminId,
        created_at: isoStr(dateAddDays(today, -rand(5, 120))),
      });
      invoiceIds.push(id);
    }

    // Also create some standalone invoices
    for (let i = 0; i < 20; i++) {
      const custId = pick(customerIds);
      const id = crypto.randomUUID();
      const total = rand(250, 8000);
      const taxRate = 0.0875;
      const subtotal = Math.round(total / (1 + taxRate) * 100) / 100;
      const taxAmount = Math.round((total - subtotal) * 100) / 100;
      const status = pick(["paid","sent","overdue","draft"]);
      const sentAt = status !== "draft" ? isoStr(dateAddDays(today, -rand(10, 120))) : null;
      const paidAt = status === "paid" ? isoStr(dateAddDays(today, -rand(3, 90))) : null;

      invoiceRows.push({
        id, work_order_id: null, proposal_id: null, customer_id: custId,
        invoice_number: `INV-${String(2026000 + invoiceRows.length).padStart(5,"0")}`,
        title: pick(["Annual Inspection Fee","Monthly Monitoring","System Testing & Certification","Preventive Maintenance","Emergency Service Call","Compliance Audit"]),
        description: "Routine fire protection services per service agreement.",
        line_items: [{ description: "Service fee", quantity: 1, unit_price: subtotal, total: subtotal }],
        subtotal, tax_rate: taxRate, tax_amount: taxAmount, total,
        status, sent_at: sentAt, paid_at: paidAt,
        due_date: dateStr(dateAddDays(today, status === "overdue" ? -rand(1, 60) : rand(15, 45))),
        notes: null, created_by: adminId,
        created_at: isoStr(dateAddDays(today, -rand(10, 180))),
      });
      invoiceIds.push(id);
    }

    if (invoiceRows.length > 0) {
      for (let i = 0; i < invoiceRows.length; i += 25) {
        await supabase.from("invoices").insert(invoiceRows.slice(i, i + 25));
      }
    }
    results.push(`Created ${invoiceRows.length} invoices`);

    // ── Step 10: Create payments for paid invoices ─────────
    const paymentRows: any[] = [];
    for (const inv of invoiceRows) {
      if (inv.status !== "paid") continue;
      paymentRows.push({
        id: crypto.randomUUID(),
        customer_id: inv.customer_id,
        invoice_id: inv.id,
        amount: inv.total,
        status: "completed",
        description: `Payment for ${inv.invoice_number}`,
        created_at: inv.paid_at || isoStr(dateAddDays(today, -rand(3, 30))),
      });
    }
    if (paymentRows.length > 0) {
      await supabase.from("payments").insert(paymentRows);
    }
    results.push(`Created ${paymentRows.length} payments`);

    // ── Step 11: Create documents for customers ────────────
    const documentRows: any[] = [];
    const docTypes = ["inspection_report","permit","contract","certification","photo","floor_plan","insurance"];

    for (const custId of pickN(customerIds, 40)) {
      const numDocs = rand(1, 4);
      for (let d = 0; d < numDocs; d++) {
        const docType = pick(docTypes);
        documentRows.push({
          id: crypto.randomUUID(),
          customer_id: custId,
          file_name: `${docType.replace("_","-")}_${dateStr(dateAddDays(today, -rand(30, 365)))}.pdf`,
          file_url: `https://storage.example.com/docs/${crypto.randomUUID()}.pdf`,
          file_type: "application/pdf",
          document_type: docType,
          file_size: rand(50000, 5000000),
          uploaded_by: pick(managerIds.length > 0 ? managerIds : [adminId]),
          uploaded_by_email: "manager@dousefire.co",
          created_at: isoStr(dateAddDays(today, -rand(0, 365))),
        });
      }
    }
    if (documentRows.length > 0) {
      await supabase.from("documents").insert(documentRows);
    }
    results.push(`Created ${documentRows.length} documents`);

    // ── Step 12: Create notifications ──────────────────────
    const notificationRows: any[] = [];
    for (const tech of techs) {
      const numNotifs = rand(3, 8);
      for (let n = 0; n < numNotifs; n++) {
        const daysAgo = rand(0, 30);
        notificationRows.push({
          id: crypto.randomUUID(),
          inspector_id: tech.id,
          inspector_name: tech.full_name,
          title: pick(["Upcoming Inspection","Inspection Overdue","Deficiency Assigned","Work Order Updated","Report Ready","Compliance Alert","Schedule Changed"]),
          body: pick(["You have 3 inspections scheduled for tomorrow.","Inspection for SP-112 is 5 days overdue.","A new deficiency has been assigned to you.","Work order WO-042 has been marked complete.","Monthly compliance report is ready for review.","Annual inspection for FA-089 is due next week.","Your schedule has been updated by the manager."]),
          inspection_count: rand(1, 5),
          scheduled_date: dateStr(dateAddDays(today, rand(-15, 15))),
          is_read: daysAgo > 5,
          created_at: isoStr(dateAddDays(today, -daysAgo)),
        });
      }
    }
    if (notificationRows.length > 0) {
      await supabase.from("notifications").insert(notificationRows);
    }
    results.push(`Created ${notificationRows.length} notifications`);

    // ── Step 13: Create recurring schedules ─────────────────
    const recurringRows: any[] = [];
    const frequencies = [
      { freq: "Monthly", days: 30 },
      { freq: "Quarterly", days: 90 },
      { freq: "Semi-Annual", days: 180 },
      { freq: "Annual", days: 365 },
    ];

    for (const asset of pickN(assetRows, 50)) {
      const freq = pick(frequencies);
      const startDate = dateAddDays(today, -rand(90, 365));
      recurringRows.push({
        id: crypto.randomUUID(),
        asset_id: asset.id,
        customer_id: asset.customer_id,
        asset_type: asset.type,
        frequency: freq.freq,
        interval_days: freq.days,
        start_date: dateStr(startDate),
        last_generated_date: dateStr(dateAddDays(today, -rand(7, 180))),
        next_due_date: dateStr(dateAddDays(today, rand(-30, 60))),
        active: true,
        created_by: adminId,
        created_at: isoStr(startDate),
      });
    }
    if (recurringRows.length > 0) {
      await supabase.from("recurring_schedules").insert(recurringRows);
    }
    results.push(`Created ${recurringRows.length} recurring schedules`);

    // ── Step 14: Create audit log entries ──────────────────
    const auditRows: any[] = [];
    for (let i = 0; i < 50; i++) {
      auditRows.push({
        id: crypto.randomUUID(),
        table_name: pick(["inspections","assets","customers","work_orders","invoices","deficiencies"]),
        record_id: crypto.randomUUID(),
        action: pick(["INSERT","UPDATE","DELETE"]),
        new_data: { summary: "Demo audit entry" },
        changed_by: pick(allUserIds),
        changed_by_email: pick(profiles.map((p: any) => p.email)),
        changed_at: isoStr(dateAddDays(today, -rand(0, 90))),
        ip_address: `192.168.1.${rand(1, 254)}`,
      });
    }
    await supabase.from("audit_logs").insert(auditRows);
    results.push(`Created ${auditRows.length} audit log entries`);

    return new Response(JSON.stringify({ success: true, summary: {
      customers: customerData.length,
      assets: assetRows.length,
      inspections: inspectionRows.length,
      deficiencies: deficiencyRows.length,
      proposals: proposalRows.length,
      work_orders: workOrderRows.length,
      invoices: invoiceRows.length,
      payments: paymentRows.length,
      documents: documentRows.length,
      notifications: notificationRows.length,
      recurring_schedules: recurringRows.length,
    }, results }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message, stack: err.stack }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
