/* ============================================================
   TruckLog Pro — Real-world freight rate tables (rates.js)
   ============================================================ */

const RATES = {
  /* ---- USD (ATS / US Trucking) ---- */
  USD: {
    label: 'USD (สหรัฐอเมริกา)',
    symbol: '$',
    unit: '/mile',
    distanceUnit: 'mile',
    kmPerUnit: 1.60934,   // 1 mile in km
    cargoTypes: {
      'general':     { label: 'สินค้าทั่วไป (FTL)',      forHire: [1.50, 2.20], ownerOp: [2.50, 3.50] },
      'reefer':      { label: 'สินค้าแช่เย็น (Reefer)',  forHire: [2.00, 2.80], ownerOp: [3.00, 4.20] },
      'hazmat':      { label: 'วัตถุอันตราย (Hazmat)',   forHire: [2.50, 3.50], ownerOp: [3.50, 5.00] },
      'flatbed':     { label: 'Flatbed / Oversize',       forHire: [2.00, 3.00], ownerOp: [3.00, 4.50] },
      'bulk':        { label: 'Bulk / Tanker',            forHire: [1.30, 2.00], ownerOp: [2.20, 3.20] },
      'livestock':   { label: 'ปศุสัตว์',                forHire: [1.80, 2.50], ownerOp: [2.80, 3.80] },
      'machinery':   { label: 'เครื่องจักร',             forHire: [2.20, 3.20], ownerOp: [3.20, 4.80] },
      'auto':        { label: 'ยานยนต์ (Car Hauler)',     forHire: [1.60, 2.40], ownerOp: [2.60, 3.80] },
    },
    fuelLabel: 'ราคาน้ำมันดีเซล ($/gallon)',
    fuelUnit: 'gallon',
    litrePerUnit: 3.785,
    defaultFuelPrice: 4.50,     // $/gallon
  },

  /* ---- EUR (ETS2 / European Trucking) ---- */
  EUR: {
    label: 'EUR (ยุโรป)',
    symbol: '€',
    unit: '/km',
    distanceUnit: 'km',
    kmPerUnit: 1,
    cargoTypes: {
      'general':     { label: 'สินค้าทั่วไป (FTL)',      forHire: [0.80, 1.20], ownerOp: [1.20, 1.80] },
      'reefer':      { label: 'สินค้าแช่เย็น (Reefer)',  forHire: [1.00, 1.50], ownerOp: [1.50, 2.20] },
      'hazmat':      { label: 'วัตถุอันตราย (ADR)',       forHire: [1.20, 1.80], ownerOp: [1.80, 2.80] },
      'flatbed':     { label: 'Flatbed / Oversize',       forHire: [1.00, 1.60], ownerOp: [1.60, 2.50] },
      'bulk':        { label: 'Bulk / Tanker',            forHire: [0.70, 1.10], ownerOp: [1.10, 1.70] },
      'livestock':   { label: 'ปศุสัตว์',                forHire: [0.90, 1.30], ownerOp: [1.30, 2.00] },
      'machinery':   { label: 'เครื่องจักรหนัก',         forHire: [1.10, 1.70], ownerOp: [1.70, 2.60] },
      'container':   { label: 'ตู้คอนเทนเนอร์',          forHire: [0.85, 1.25], ownerOp: [1.25, 1.90] },
    },
    fuelLabel: 'ราคาน้ำมันดีเซล (€/ลิตร)',
    fuelUnit: 'litre',
    litrePerUnit: 1,
    defaultFuelPrice: 1.85,    // €/litre
  },

  /* ---- THB (ไทย) ---- */
  THB: {
    label: 'THB (ประเทศไทย)',
    symbol: '฿',
    unit: '/km',
    distanceUnit: 'km',
    kmPerUnit: 1,
    cargoTypes: {
      'general':     { label: 'สินค้าทั่วไป (FTL)',      forHire: [12, 18], ownerOp: [22, 32] },
      'reefer':      { label: 'สินค้าแช่เย็น',           forHire: [18, 25], ownerOp: [30, 42] },
      'hazmat':      { label: 'วัตถุอันตราย',            forHire: [22, 30], ownerOp: [35, 50] },
      'flatbed':     { label: 'รถพ่วง/โอเวอร์ไซซ์',     forHire: [20, 28], ownerOp: [32, 48] },
      'bulk':        { label: 'Bulk / แทงเกอร์',         forHire: [10, 16], ownerOp: [18, 28] },
      'livestock':   { label: 'ปศุสัตว์',                forHire: [15, 22], ownerOp: [25, 38] },
      'machinery':   { label: 'เครื่องจักร/อุปกรณ์',    forHire: [18, 26], ownerOp: [28, 45] },
      'container':   { label: 'ตู้คอนเทนเนอร์',          forHire: [14, 20], ownerOp: [24, 36] },
    },
    fuelLabel: 'ราคาน้ำมันดีเซล (฿/ลิตร)',
    fuelUnit: 'litre',
    litrePerUnit: 1,
    defaultFuelPrice: 30.00,   // ฿/litre
  },
};

/* Which currencies are valid per game */
const GAME_CURRENCIES = {
  ets2: ['EUR', 'THB'],
  ats:  ['USD', 'THB'],
};

/* Fine type labels (Thai) */
const FINE_LABELS = {
  'speeding_camera':          { label: 'กล้องจับความเร็ว',      icon: '📷' },
  'speeding_officer':         { label: 'ตำรวจจับความเร็ว',       icon: '👮' },
  'red_signal':               { label: 'ฝ่าไฟแดง',               icon: '🚦' },
  'wrong_way':                { label: 'ขับสวนทาง',              icon: '⛔' },
  'avoid_sleeping':           { label: 'ไม่พักตามกำหนด',         icon: '😴' },
  'illegal_trailer':          { label: 'ขนส่งผิดกฎ',             icon: '📦' },
  'overweight':               { label: 'น้ำหนักเกิน',            icon: '⚖️' },
  'no_lights':                { label: 'ไม่เปิดไฟ',              icon: '💡' },
  'illegal_border_crossing':  { label: 'ข้ามพรมแดนผิดกฎ',       icon: '🛂' },
  'accident':                 { label: 'อุบัติเหตุ',              icon: '💥' },
  'toll':                     { label: 'ค่าผ่านทาง (Toll)',       icon: '🛣️' },
  'ferry':                    { label: 'ค่าเรือเฟอร์รี่',         icon: '⛴️' },
  'train':                    { label: 'ค่ารถไฟ',                 icon: '🚂' },
  'unknown':                  { label: 'ค่าปรับอื่นๆ',           icon: '⚠️' },
};

/* Cargo type matcher — maps in-game cargo name → our cargoType key */
function detectCargoType(cargoName = '') {
  const n = cargoName.toLowerCase();
  if (n.includes('refrigerat') || n.includes('frozen') || n.includes('chilled') || n.includes('dairy') || n.includes('meat') || n.includes('fish')) return 'reefer';
  if (n.includes('hazmat') || n.includes('adr') || n.includes('chemical') || n.includes('explosive') || n.includes('fuel') || n.includes('acid') || n.includes('flammable')) return 'hazmat';
  if (n.includes('container')) return 'container';
  if (n.includes('cattle') || n.includes('livestock') || n.includes('pig') || n.includes('animal')) return 'livestock';
  if (n.includes('machine') || n.includes('equipment') || n.includes('heavy') || n.includes('excavator') || n.includes('crane')) return 'machinery';
  if (n.includes('liquid') || n.includes('tank') || n.includes('oil') || n.includes('water') || n.includes('bulk') || n.includes('grain') || n.includes('sand')) return 'bulk';
  if (n.includes('oversized') || n.includes('flatbed') || n.includes('windmill') || n.includes('blade') || n.includes('turbine')) return 'flatbed';
  if (n.includes('car') || n.includes('vehicle') || n.includes('auto')) return 'auto';
  return 'general';
}

/* Get mid-range rate for a cargo type */
function getMidRate(currency, cargoType, mode) {
  const r = RATES[currency]?.cargoTypes?.[cargoType];
  if (!r) return 0;
  const arr = mode === 'ownerOp' ? r.ownerOp : r.forHire;
  return (arr[0] + arr[1]) / 2;
}
