/**
 * js/data/seed.js - Demo data generator and data migration
 */

/**
 * Generate seed demo data
 * @returns {Object} Initial state object
 */
function seed() {
  const T = Date.now();

  // Sites
  const sites = [
    { id: 'TMP', name: 'Tmart Pong Central Warehouse', code: 'TMP' },
    { id: 'CHT', name: 'Chhoeu Tom SNTK 1000MWh', code: 'CHT' },
    { id: 'AMP', name: 'Amp Leang SNTL 600MWh', code: 'AMP' },
    { id: 'SNA', name: 'Sna Ansa SNTL 400MWh', code: 'SNA' },
    { id: 'SVC', name: 'Svay Chek SNTV 12MWh', code: 'SVC' }
  ];

  // Helper to create parts
  const P = (sku, name, cat, site, qty, min, unit, bin, cost, sup, lt) => ({
    id: uid('p'),
    sku, name, cat, site, qty, min, unit, bin, cost, sup, lt,
    photo: '',
    updated: T - Math.random() * 20 * DAY
  });

  const parts = [
    P('BAT-LFP-280', 'LFP Cell 3.2V 280Ah', 'Battery', 'CHT', 14, 12, 'pcs', 'A1-03', 96, 'CATL Asia', 45),
    P('BAT-BMU-V2', 'Battery Module BMU Board', 'Battery', 'CHT', 2, 4, 'pcs', 'A1-07', 310, 'CATL Asia', 60),
    P('BAT-FUSE-125', 'DC Fuse 125A gPV', 'Battery', 'TMP', 26, 15, 'pcs', 'A2-01', 18.5, 'Mersen', 21),
    P('BAT-BUS-CU', 'Copper Busbar 40x5 1m', 'Battery', 'TMP', 7, 6, 'pcs', 'A2-04', 42, 'Local Metal', 10),
    P('PCS-IGBT-M', 'IGBT Module 1200V 600A', 'PCS', 'CHT', 1, 2, 'pcs', 'B1-02', 780, 'Sungrow SEA', 75),
    P('PCS-FAN-24', 'Cabinet Fan 24VDC 172mm', 'PCS', 'SVC', 0, 6, 'pcs', 'B1-05', 34, 'Sungrow SEA', 30),
    P('PCS-CAP-DC', 'DC Link Capacitor 500uF', 'PCS', 'AMP', 5, 4, 'pcs', 'B1-08', 120, 'Sungrow SEA', 60),
    P('PCS-CTRL-BD', 'PCS Control Board Rev.C', 'PCS', 'TMP', 3, 2, 'pcs', 'B2-01', 540, 'Sungrow SEA', 90),
    P('HVA-FLT-G4', 'HVAC Filter G4 592x592', 'HVAC', 'SNA', 4, 10, 'pcs', 'C1-01', 12, 'Airtech KH', 14),
    P('HVA-COMP-5T', 'Scroll Compressor 5TR', 'HVAC', 'TMP', 1, 1, 'pcs', 'C1-06', 890, 'Airtech KH', 45),
    P('HVA-GAS-410', 'Refrigerant R410A 11.3kg', 'HVAC', 'TMP', 3, 2, 'cyl', 'C2-02', 165, 'Airtech KH', 14),
    P('ELE-CB-630', 'MCCB 630A 4P', 'Electrical', 'SVC', 2, 2, 'pcs', 'D1-02', 420, 'Schneider KH', 30),
    P('ELE-CT-1000', 'Current Transformer 1000/5', 'Electrical', 'AMP', 8, 6, 'pcs', 'D1-05', 58, 'Schneider KH', 21),
    P('ELE-SPD-T2', 'Surge Protector Type 2 DC', 'Electrical', 'CHT', 3, 8, 'pcs', 'D1-09', 76, 'Schneider KH', 21),
    P('ELE-CBL-95', 'Cable Cu 1x95mm2 XLPE', 'Electrical', 'TMP', 180, 120, 'm', 'D3-00', 9.4, 'Cadivi', 20),
    P('FIR-AER-6K', 'Aerosol Fire Suppressor 6kg', 'Fire', 'CHT', 6, 4, 'pcs', 'E1-01', 235, 'Firepro Asia', 40),
    P('FIR-DET-SMK', 'Smoke Detector Addressable', 'Fire', 'SNA', 5, 6, 'pcs', 'E1-04', 64, 'Firepro Asia', 28),
    P('FIR-VALV-N2', 'N2 Cylinder Valve Assy', 'Fire', 'TMP', 2, 2, 'pcs', 'E2-01', 310, 'Firepro Asia', 50),
    P('COM-SW-8P', 'Industrial Switch 8-Port SFP', 'Comms', 'AMP', 3, 3, 'pcs', 'F1-02', 290, 'Moxa SEA', 35),
    P('COM-RTU-EX', 'RTU Expansion I/O Card', 'Comms', 'TMP', 4, 3, 'pcs', 'F1-06', 180, 'Moxa SEA', 35),
    P('COM-FBR-SM', 'Fibre Patch LC-LC 10m SM', 'Comms', 'TMP', 22, 12, 'pcs', 'F2-03', 11, 'Local IT', 7),
    P('CON-TORQ-GR', 'Anti-seize Grease 500g', 'Consumable', 'TMP', 9, 6, 'tub', 'G1-01', 22, 'Local Supply', 7),
    P('CON-WIPE-IND', 'Industrial Wipes 200pc', 'Consumable', 'SNA', 2, 8, 'box', 'G1-03', 14, 'Local Supply', 5),
    P('CON-TAG-LOT', 'Lockout Tag Set (10)', 'Consumable', 'TMP', 11, 8, 'set', 'G1-06', 26, 'Local Supply', 10)
  ];

  // Helper to create tools
  const K = (code, name, cat, site, status, holder, out, due, calI, calL, cert) => ({
    id: uid('t'),
    code, name, cat, site, status,
    holder: holder || '',
    outAt: out || null,
    dueAt: due || null,
    calInt: calI || 0,
    calLast: calL || null,
    calNext: calL ? addD(calI * 30, calL) : null,
    cert: cert || '',
    cond: 'Good',
    notes: '',
    photo: ''
  });

  const tools = [
    K('TL-001', 'Fluke 87V Digital Multimeter', 'Test & Measure', 'CHT', 'out', 'Sok Piseth', T - 3 * DAY, addD(-1), 12, addD(-300), 'CAL-9921'),
    K('TL-002', 'Fluke 1587 Insulation Tester', 'Test & Measure', 'TMP', 'in', '', null, null, 12, addD(-40), 'CAL-1043'),
    K('TL-003', 'Hioki 3280-10 Clamp Meter', 'Test & Measure', 'AMP', 'out', 'Chan Dara', T - 1 * DAY, addD(2), 12, addD(-330), 'CAL-8817'),
    K('TL-004', 'Torque Wrench 40-200Nm', 'Mechanical', 'CHT', 'in', '', null, null, 6, addD(-160), 'CAL-7702'),
    K('TL-005', 'Torque Wrench 10-60Nm', 'Mechanical', 'SVC', 'out', 'Vann Rithy', T - 9 * DAY, addD(-4), 6, addD(-95), 'CAL-7703'),
    K('TL-006', 'Megger MIT525 HV Insulation', 'Test & Measure', 'TMP', 'in', '', null, null, 12, addD(-355), 'CAL-2288'),
    K('TL-007', 'FLIR E8 Thermal Camera', 'Test & Measure', 'AMP', 'out', 'Nhem Sovann', T - 2 * DAY, addD(5), 24, addD(-500), 'CAL-3390'),
    K('TL-008', 'Hydraulic Crimper 16-400mm²', 'Mechanical', 'CHT', 'in', '', null, null, 0, null, ''),
    K('TL-009', 'Cable Fault Locator TDR', 'Test & Measure', 'TMP', 'maint', '', null, null, 12, addD(-200), 'CAL-5561'),
    K('TL-010', 'Gas Detector 4-in-1', 'Safety', 'SVC', 'in', '', null, null, 6, addD(-170), 'CAL-6640'),
    K('TL-011', 'Insulated Tool Set 1000V (24pc)', 'Mechanical', 'SNA', 'out', 'Keo Sophal', T - 14 * DAY, addD(-8), 0, null, ''),
    K('TL-012', 'Fibre Fusion Splicer', 'Comms', 'TMP', 'in', '', null, null, 24, addD(-410), 'CAL-4415'),
    K('TL-013', 'Battery Internal Resistance Tester', 'Test & Measure', 'CHT', 'in', '', null, null, 12, addD(-320), 'CAL-9034'),
    K('TL-014', 'Laser Distance Meter 80m', 'Mechanical', 'TMP', 'in', '', null, null, 24, addD(-90), 'CAL-1177'),
    K('TL-015', 'Arc Flash PPE Kit Cat.2', 'Safety', 'CHT', 'out', 'Sok Piseth', T - 5 * DAY, addD(9), 12, addD(-140), 'CAL-2050'),
    K('TL-016', 'Power Quality Analyser PQ3198', 'Test & Measure', 'SNA', 'in', '', null, null, 12, addD(-370), 'CAL-6688')
  ];

  const find = (sku) => parts.find((p) => p.sku === sku);

  // Supplier warranty by category; the clock starts at the last goods-in
  parts.forEach((p) => {
    p.war = WARRANTY_TERMS[p.cat] !== undefined ? WARRANTY_TERMS[p.cat] : 12;
    p.warFrom = p.war ? addD(-Math.floor(Math.random() * p.war * 30 * 1.15)) : null;
  });

  // Guarantee a few of each state so the demo shows real cases
  const forceWar = (sku, pct) => {
    const p = find(sku);
    if (p && p.war) p.warFrom = addD(-Math.round(p.war * 30 * pct));
  };
  forceWar('BAT-BMU-V2', 1.08);    // expired
  forceWar('PCS-IGBT-M', 1.22);    // expired
  forceWar('HVA-COMP-5T', 0.96);   // expiring soon
  forceWar('ELE-CB-630', 0.94);    // expiring soon
  forceWar('COM-SW-8P', 0.97);     // expiring soon
  forceWar('BAT-LFP-280', 0.15);   // well covered

  tools.forEach((t) => {
    t.war = 24;
    t.warFrom = addD(-Math.floor(Math.random() * 30 * 30));
  });
  tools[3].warFrom = addD(-Math.round(24 * 30 * 0.95));   // expiring soon
  tools[8].warFrom = addD(-Math.round(24 * 30 * 1.3));    // expired

  // One order in each stage of the flow
  const pos = [
    {
      id: uid('po'), no: 'PO-2608-014', sup: 'Sungrow SEA', site: 'SVC', status: 'ordered',
      created: T - 9 * DAY, eta: addD(11), by: 'storekeeper',
      notes: 'Urgent — SHV PCS-3 fan failure.',
      lines: [
        { part: find('PCS-FAN-24').id, qty: 12, cost: 34 },
        { part: find('PCS-IGBT-M').id, qty: 2, cost: 780 }
      ]
    },
    {
      id: uid('po'), no: 'PO-2608-013', sup: 'Airtech KH', site: 'SNA', status: 'shipped',
      created: T - 16 * DAY, eta: addD(2), by: 'storekeeper',
      notes: 'Quarterly HVAC filter stock.',
      lines: [{ part: find('HVA-FLT-G4').id, qty: 24, cost: 12 }]
    },
    {
      id: uid('po'), no: 'PO-2608-012', sup: 'CATL Asia', site: 'CHT', status: 'draft',
      created: T - 2 * DAY, eta: addD(52), by: 'storekeeper',
      notes: 'Awaiting manager approval — long lead item.',
      lines: [{ part: find('BAT-BMU-V2').id, qty: 6, cost: 310 }]
    },
    {
      id: uid('po'), no: 'PO-2607-009', sup: 'Local Supply', site: 'TMP', status: 'received',
      created: T - 34 * DAY, eta: addD(-6), by: 'manager', notes: '',
      lines: [
        { part: find('CON-TAG-LOT').id, qty: 10, cost: 26 },
        { part: find('CON-TORQ-GR').id, qty: 6, cost: 22 }
      ]
    }
  ];

  const techs = ['Sok Piseth', 'Chan Dara', 'Vann Rithy', 'Nhem Sovann', 'Keo Sophal', 'Ly Sreymom'];
  const wos = [
    'WO-2280 PCS-2 fan swap', 'WO-2261 quarterly HVAC service', 'WO-2243 rack inspection',
    'WO-2299 fire panel test', 'WO-2205 DC busbar torque check', 'WO-2310 comms link repair',
    'WO-2188 battery module swap', 'WO-2334 SPD replacement', 'Routine consumable draw', 'WO-2277 IR survey'
  ];

  // Consumption history — ~15 months back, so week / month / YTD comparisons have a baseline
  const log = [];

  for (let d = 460; d >= 0; d--) {
    const day = new Date(T - d * DAY);
    day.setHours(0, 0, 0, 0);
    const dow = day.getDay();

    if (dow === 0 && d > 1) continue;                        // store closed Sundays

    let n = Math.random() < (dow === 6 ? 0.25 : 0.68) ? 1 + Math.floor(Math.random() * 3) : 0;
    n = Math.round(n * (1 + (460 - d) / 1200));              // slow growth as the fleet ages
    if (d <= 1) n = Math.max(n, 2);                          // today and yesterday always move

    for (let k = 0; k < n; k++) {
      const pool = parts.filter((p) => Math.random() * 10 < (CONSUMPTION_RATES[p.cat] || 2));
      const src = pool.length ? pool : parts;
      const p = src[Math.floor(Math.random() * src.length)];
      const q = 1 + Math.floor(Math.random() * (p.cat === 'Consumable' || p.unit === 'm' ? 5 : 2));
      const who = techs[Math.floor(Math.random() * techs.length)];
      const wo = wos[Math.floor(Math.random() * wos.length)];
      const ts = Math.min(
        day.getTime() + (8 + Math.floor(Math.random() * 9)) * 3600e3 + Math.floor(Math.random() * 3600e3),
        T - 6e4                                              // never stamp a movement in the future
      );

      log.push({
        id: uid('l'), ts, type: 'issue', by: 'storekeeper', site: p.site,
        part: p.id, qty: q, value: +(q * p.cost).toFixed(2),
        txt: `Issued ${q} × ${p.name} to ${who} (${wo})`
      });
    }

    // Deliveries land less often than issues, in bigger batches
    if (d === 0 || (dow !== 6 && Math.random() < 0.22)) {
      for (let k = 0, r = 1 + Math.floor(Math.random() * 2); k < r; k++) {
        const p = parts[Math.floor(Math.random() * parts.length)];
        const q = Math.max(2, Math.round(p.min * (0.6 + Math.random() * 1.4)));
        const ts = Math.min(
          day.getTime() + (9 + Math.floor(Math.random() * 7)) * 3600e3 + Math.floor(Math.random() * 3600e3),
          T - 6e4
        );

        log.push({
          id: uid('l'), ts, type: 'receive', by: 'storekeeper', site: p.site,
          part: p.id, qty: q, value: +(q * p.cost).toFixed(2),
          txt: `Received ${q} × ${p.name} into ${p.bin} (${p.sup})`
        });
      }
    }
  }

  log.push(
    { id: uid('l'), ts: T - 6 * 3600e3, type: 'checkout', by: 'tech', site: 'CHT',
      txt: 'Checked out Fluke 87V Digital Multimeter — Sok Piseth' },
    { id: uid('l'), ts: T - 1 * DAY, type: 'adjust', by: 'storekeeper', site: 'SNA',
      txt: 'Stock count correction: HVAC Filter G4 → 4 pcs' },
    { id: uid('l'), ts: T - 2 * DAY, type: 'po', by: 'storekeeper', site: 'CHT',
      txt: 'Created PO-2608-012 — CATL Asia, 1 line' },
    { id: uid('l'), ts: T - 3 * DAY, type: 'receive', by: 'storekeeper', site: 'TMP',
      txt: 'Received PO-2607-009 — 16 items into TMP store' }
  );

  log.sort((a, b) => b.ts - a.ts);

  // Demo users from config
  const users = DEMO_USERS.map((u) => ({ ...u }));

  // Return full state
  return {
    v: 3,
    sites,
    parts,
    tools,
    pos,
    log,
    users,
    cfg: {
      appName: 'VoltGrid Store',
      logo: '',
      sheetUrl: '',
      autoSync: false,
      poSeq: 15
    },
    session: null
  };
}

/**
 * Migrate old data format to new format
 * Handles updating old site codes to new ones
 */
function migrate(s) {
  if (!s || s.v >= 3) return s;

  const fresh = seed();
  s.sites = fresh.sites;
  s.users = fresh.users;

  // Map old site codes to new
  const map = (id) => SITE_MIGRATION[id] || id;

  (s.parts || []).forEach((p) => (p.site = map(p.site)));
  (s.tools || []).forEach((t) => (t.site = map(t.site)));
  (s.pos || []).forEach((o) => (o.site = map(o.site)));
  (s.log || []).forEach((l) => {
    if (l.site) l.site = map(l.site);
  });
  (s.users || []).forEach((u) => {
    if (u.site && u.site !== 'all') u.site = map(u.site);
  });
  if (s.session && s.session.site) s.session.site = map(s.session.site);

  s.v = 3;
  return s;
}
