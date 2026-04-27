/* ============================================================
   TruckLog Pro — Main App Controller (app.js)
   ============================================================ */

const PAGES = {
  dashboard: { page: DashboardPage, title: 'Dashboard',         navId: 'nav-dashboard' },
  trips:     { page: TripsPage,     title: 'บันทึกเที่ยววิ่ง', navId: 'nav-trips' },
  ledger:    { page: LedgerPage,    title: 'สมุดบัญชี',         navId: 'nav-ledger' },
  drivers:   { page: DriversPage,   title: 'คนขับ & AI Driver', navId: 'nav-drivers' },
  fleet:     { page: FleetPage,     title: 'กองรถ (Fleet)',     navId: 'nav-fleet' },
  analytics: { page: AnalyticsPage, title: 'วิเคราะห์ข้อมูล',  navId: 'nav-analytics' },
  fines:     { page: FinesPage,     title: 'ค่าปรับ & Toll',    navId: 'nav-fines' },
  bank:      { page: BankPage,      title: 'ธนาคาร & สินเชื่อ', navId: 'nav-bank' },
  settings:  { page: SettingsPage,  title: 'ตั้งค่า',           navId: 'nav-settings' },
};

const App = {
  currentPage: 'dashboard',
  _settingsCache: null,

  async init() {
    // Open DB
    await db.open();

    // Load Chart.js dynamically
    await this._loadChartJs();

    // Init telemetry
    const url = await db.getSetting('telemetryUrl', 'ws://localhost:25555/');
    telemetry.connect(url);
    this._setupTelemetryEvents();

    // Init sidebar
    this._setupSidebar();

    // Init nav
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(el.dataset.page);
      });
    });

    // Init modal close
    document.getElementById('modal-close')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-overlay')) this.closeModal();
    });

    // Load company name
    const name = await db.getSetting('companyName', 'บริษัทของฉัน');
    const sidebarName = document.getElementById('company-name-sidebar');
    if (sidebarName) sidebarName.textContent = name;

    // Load currency badge
    const currency = await db.getSetting('currency', 'THB');
    const badge = document.getElementById('currency-badge');
    if (badge) badge.textContent = currency;

    // Seed demo data on first launch
    await DemoSeeder.seed();

    // Navigate to dashboard
    await this.navigate('dashboard');

    // Telemetry status UI
    this._updateStatusUI();
  },

  async _loadChartJs() {
    return new Promise((resolve) => {
      if (window.Chart) { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js';
      s.onload = () => {
        // Dark defaults
        Chart.defaults.color = '#8a95a8';
        Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
        Chart.defaults.font.family = "'Inter', 'Sarabun', sans-serif";
        resolve();
      };
      s.onerror = resolve;
      document.head.appendChild(s);
    });
  },

  async navigate(pageKey) {
    const pageDef = PAGES[pageKey];
    if (!pageDef) return;

    this.currentPage = pageKey;
    this._settingsCache = null;  // bust cache on nav

    // Update nav active state
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
      el.classList.toggle('active', el.dataset.page === pageKey);
    });

    // Update page title
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = pageDef.title;

    // Render page
    const content = document.getElementById('page-content');
    if (!content) return;
    content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px"><div style="color:var(--text-muted)">กำลังโหลด...</div></div>';

    try {
      const html = await pageDef.page.render();
      content.innerHTML = html;
      if (pageDef.page.afterRender) await pageDef.page.afterRender();
    } catch(err) {
      console.error('[App] Page render error:', err);
      content.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">เกิดข้อผิดพลาด</div><div class="empty-desc">${err.message}</div></div>`;
    }
  },

  async getSettings() {
    if (this._settingsCache) return this._settingsCache;
    const keys = ['currency','mode','fuelPrice','repairEngine','repairChassis','repairTrailer','truckPrice','truckLifeKm','companyName','mainGame','customRates','telemetryUrl'];
    const s = {};
    for (const k of keys) s[k] = await db.getSetting(k);
    
    // Fetch owned fleet for ownership verification
    s.ownedTrucks   = await db.getAllTrucks();
    
    s.currency      = s.currency || 'THB';
    s.mode          = s.mode     || 'ownerOp';
    s.fuelPrice     = s.fuelPrice     ?? RATES[s.currency]?.defaultFuelPrice ?? 30;
    s.repairEngine  = s.repairEngine  ?? 50000;
    s.repairChassis = s.repairChassis ?? 30000;
    s.repairTrailer = s.repairTrailer ?? 20000;
    s.truckPrice    = s.truckPrice    ?? 3000000;
    s.truckLifeKm   = s.truckLifeKm   ?? 1000000;
    this._settingsCache = s;
    return s;
  },

  /* ---- Modal ---- */
  openModal(title, bodyHtml, buttons = []) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML    = bodyHtml;
    const footer = document.getElementById('modal-footer');
    footer.innerHTML = '';
    buttons.forEach(btn => {
      const el = document.createElement('button');
      el.className = `btn ${btn.cls || 'btn-secondary'}`;
      el.textContent = btn.label;
      el.onclick = btn.action;
      footer.appendChild(el);
    });
    document.getElementById('modal-overlay').classList.add('open');
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
  },

  /* ---- Toast ---- */
  toast(msg, type = 'info', duration = 3500) {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><span class="toast-msg">${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; toast.style.transition = '0.3s'; setTimeout(() => toast.remove(), 350); }, duration);
  },

  /* ---- Sidebar toggle ---- */
  _setupSidebar() {
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('collapsed');
    });
  },

  /* ---- Telemetry events → auto-record ---- */
  _setupTelemetryEvents() {
    telemetry.on('connected',    () => { this._updateStatusUI(); this.toast('เชื่อมต่อเกมแล้ว 🎮', 'success'); });
    telemetry.on('disconnected', () => { this._updateStatusUI(); });

    telemetry.on('jobFinished', async (data) => {
      const settings = await this.getSettings();
      const cargoType = detectCargoType(data.startData?.cargo || '');
      const cargoInfo = RATES[settings.currency]?.cargoTypes?.[cargoType];
      
      const trip = {
        game:        data.game || telemetry.game,
        source:      data.startData?.source      || '?',
        destination: data.startData?.destination || '?',
        cargoType,
        cargoLabel:  cargoInfo?.label || cargoType,
        massT:       data.startData?.mass || 0,
        distanceKm:  data.distanceKm,
        fuelUsed:    data.fuelUsed,
        durationMin: (new Date(data.realTimeEnd) - new Date(data.startData?.realTime)) / (1000 * 60),
        wearDeltaEngine:  Math.round((data.wearEngine  || 0) * 100),
        wearDeltaChassis: Math.round((data.wearChassis || 0) * 100),
        wearDeltaTrailer: Math.round((data.wearTrailer || 0) * 100),
        truckBrand:  data.startData?.truckBrand,
        truckModel:  data.startData?.truckModel,
        isQuickJob:  data.startData?.isQuickJob,
        tollTotal:   0,
        fineTotal:   0,
        ferryTotal:  0,
        date:        data.startData?.realTime || new Date().toISOString(),
        realTimeEnd: data.realTimeEnd,
      };

      const id = await db.addTrip(trip);
      const pnl = calculator.calcTripPnL(trip, settings);
      
      let ledgerDesc = `งาน: ${trip.source} → ${trip.destination}`;
      if (pnl.isRental) ledgerDesc += ` (เช่ารถ ${trip.truckBrand})`;
      
      await db.addLedgerEntry({ type: 'trip', tripId: id, desc: ledgerDesc, income: pnl.income, expense: pnl.totalExpenses, date: trip.date });
      
      if (pnl.isRental) {
        this.toast(`⚠️ งานนี้หักค่าเช่ารถ ${Calculator.fmt(pnl.rentalFee, settings.currency)} เนื่องจากยังไม่ได้ซื้อรถ ${trip.truckBrand} ในแอพ`, 'warning', 6000);
      }
      
      // 4. Process Loan Payments (Check if any installment is due)
      await this.processLoanPayments();
      
      this.toast(`✅ บันทึกเที่ยววิ่งสำเร็จ | กำไร: ${Calculator.fmt(pnl.profit, settings.currency)}`, 'success', 5000);
      if (this.currentPage === 'dashboard') this.navigate('dashboard');
    });

    telemetry.on('toll', async (data) => {
      const settings = await this.getSettings();
      await db.addFineEntry({ fineType: 'toll', amount: data.amount, game: data.game, date: data.time, note: 'Tollgate' });
      this.toast(`🛣️ Toll: ${Calculator.fmt(data.amount, settings.currency)}`, 'warning', 2500);
    });

    telemetry.on('fine', async (data) => {
      const settings = await this.getSettings();
      const label = FINE_LABELS[data.fineType]?.label || data.fineType;
      await db.addFineEntry({ fineType: data.fineType, amount: data.amount, game: data.game, date: data.time });
      this.toast(`⚠️ ค่าปรับ: ${label} — ${Calculator.fmt(data.amount, settings.currency)}`, 'error', 4000);
    });

    telemetry.on('ferry', async (data) => {
      const settings = await this.getSettings();
      await db.addFineEntry({ fineType: 'ferry', amount: data.amount, game: telemetry.game, date: data.time, route: `${data.source} → ${data.target}` });
      this.toast(`⛴️ Ferry: ${data.source} → ${data.target} | ${Calculator.fmt(data.amount, settings.currency)}`, 'info', 3000);
    });

    telemetry.on('train', async (data) => {
      const settings = await this.getSettings();
      await db.addFineEntry({ fineType: 'train', amount: data.amount, game: telemetry.game, date: data.time, route: `${data.source} → ${data.target}` });
      this.toast(`🚂 Train: ${data.source} → ${data.target} | ${Calculator.fmt(data.amount, settings.currency)}`, 'info', 3000);
    });
  },

  async processLoanPayments() {
    const loans = (await db.getAllLoans()).filter(l => l.status === 'active');
    if (loans.length === 0) return;

    const now = new Date();
    for (const loan of loans) {
      // Logic: Pay one installment for every 3 in-game days or simply per real-world day 
      // (For now, let's keep it simple: if last payment was > 24 hours ago, pay one installment)
      const lastPay = loan.lastPaymentDate ? new Date(loan.lastPaymentDate) : new Date(loan.startDate);
      const hoursSince = (now - lastPay) / (1000 * 60 * 60);

      if (hoursSince >= 24 && loan.remainingInstallments > 0) {
        loan.remainingInstallments--;
        loan.remainingAmount -= loan.monthlyPayment;
        loan.lastPaymentDate = now.toISOString();
        
        if (loan.remainingInstallments === 0) {
          loan.status = 'finished';
          this.toast(`🎉 สินเชื่อรถ ${loan.truckName} ผ่อนชำระครบถ้วนแล้ว!`, 'success', 7000);
        } else {
          this.toast(`🏦 ธนาคารหักค่างวดรถ ${loan.truckName}: ${Calculator.fmt(loan.monthlyPayment, App._settingsCache.currency)}`, 'info', 5000);
        }

        await db.updateLoan(loan);
        await db.addLedgerEntry({
          type: 'expense',
          desc: `ค่างวดรถ: ${loan.truckName} (${loan.totalInstallments - loan.remainingInstallments}/${loan.totalInstallments})`,
          income: 0,
          expense: loan.monthlyPayment,
          date: now.toISOString()
        });
      }
    }
  },

  _updateStatusUI() {
    const dot  = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    if (!dot || !text) return;
    if (telemetry.connected) {
      const g = telemetry.game;
      dot.className  = 'status-dot ' + (g || 'connected');
      text.textContent = g === 'ets2' ? '🇪🇺 ETS2 เชื่อมต่อแล้ว'
                       : g === 'ats'  ? '🇺🇸 ATS เชื่อมต่อแล้ว'
                       : 'เชื่อมต่อแล้ว';
    } else {
      dot.className  = 'status-dot disconnected';
      text.textContent = 'ไม่ได้เชื่อมต่อ';
    }
  },
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
