/* ============================================================
   Dashboard Page
   ============================================================ */
const DashboardPage = {
  async render() {
    const settings = await App.getSettings();
    const trips    = await db.getAllTrips();
    const currency = settings.currency || 'THB';
    const stats    = Calculator.summarize(trips, settings);
    const recentTrips = [...trips].reverse().slice(0, 5);

    return `
    <div class="page-fade">
      <!-- Active Trip Banner -->
      <div class="active-trip-banner hidden" id="active-trip-banner">
        <div class="trip-banner-info">
          <div class="live-badge"><span class="live-dot"></span>กำลังวิ่ง</div>
          <div>
            <div class="trip-banner-route" id="banner-route">—</div>
            <div class="trip-banner-sub" id="banner-cargo">—</div>
          </div>
        </div>
        <div class="trip-banner-stats">
          <div class="trip-banner-stat">
            <span class="trip-banner-stat-label">ระยะทาง</span>
            <span class="trip-banner-stat-value" id="banner-dist">0 km</span>
          </div>
          <div class="trip-banner-stat">
            <span class="trip-banner-stat-label">น้ำมัน</span>
            <span class="trip-banner-stat-value" id="banner-fuel">0 L</span>
          </div>
          <div class="trip-banner-stat">
            <span class="trip-banner-stat-label">เวลา</span>
            <span class="trip-banner-stat-value" id="banner-time">00:00</span>
          </div>
        </div>
      </div>

      <!-- KPI Row -->
      <div class="kpi-grid">
        <div class="kpi-card green">
          <div class="kpi-icon">💰</div>
          <div class="kpi-label">รายได้รวม (Real-world)</div>
          <div class="kpi-value">${Calculator.fmtShort(stats.totalIncome, currency)}</div>
          <div class="kpi-sub"><span class="trend-up">▲</span> ${trips.length} เที่ยว</div>
        </div>
        <div class="kpi-card red">
          <div class="kpi-icon">💸</div>
          <div class="kpi-label">ค่าใช้จ่ายรวม</div>
          <div class="kpi-value">${Calculator.fmtShort(stats.totalExpenses, currency)}</div>
          <div class="kpi-sub">น้ำมัน + สึกหรอ + ค่าปรับ</div>
        </div>
        <div class="kpi-card ${stats.totalProfit >= 0 ? 'green' : 'red'}">
          <div class="kpi-icon">📊</div>
          <div class="kpi-label">กำไรสุทธิ</div>
          <div class="kpi-value ${stats.totalProfit >= 0 ? 'positive' : 'negative'}">
            ${Calculator.fmtShort(stats.totalProfit, currency)}
          </div>
          <div class="kpi-sub">อัตรากำไร: ${stats.totalIncome > 0 ? Math.round(stats.totalProfit/stats.totalIncome*100) : 0}%</div>
        </div>
        <div class="kpi-card cyan">
          <div class="kpi-icon">🛣️</div>
          <div class="kpi-label">ระยะทางสะสม</div>
          <div class="kpi-value">${stats.totalDistance.toLocaleString()}</div>
          <div class="kpi-sub">กิโลเมตร</div>
        </div>
        <div class="kpi-card yellow">
          <div class="kpi-icon">⛽</div>
          <div class="kpi-label">น้ำมันที่ใช้รวม</div>
          <div class="kpi-value">${stats.totalFuel.toLocaleString()}</div>
          <div class="kpi-sub">ลิตร</div>
        </div>
        <div class="kpi-card orange">
          <div class="kpi-icon">⚠️</div>
          <div class="kpi-label">ค่าปรับสะสม</div>
          <div class="kpi-value">${Calculator.fmtShort(stats.totalFines, currency)}</div>
          <div class="kpi-sub">Fines & Tolls</div>
        </div>
      </div>

      <!-- Dashboard Grid -->
      <div class="dashboard-grid">
        <!-- Profit chart -->
        <div class="card col-span-2" style="height:300px">
          <div class="card-header">
            <span class="card-title">📈 กำไร/ขาดทุน 30 วันล่าสุด</span>
          </div>
          <div class="chart-wrapper" style="height:220px">
            <canvas id="chart-profit"></canvas>
          </div>
        </div>

        <!-- Recent trips -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">🗺️ เที่ยววิ่งล่าสุด</span>
            <button class="btn btn-ghost btn-sm" onclick="App.navigate('trips')">ดูทั้งหมด</button>
          </div>
          ${recentTrips.length === 0 ? `
            <div class="empty-state">
              <div class="empty-icon">🚛</div>
              <div class="empty-title">ยังไม่มีข้อมูลเที่ยววิ่ง</div>
              <div class="empty-desc">เชื่อมต่อเกมเพื่อเริ่มบันทึกอัตโนมัติ</div>
            </div>` : `
          <div class="trip-mini-list">
            ${recentTrips.map(t => {
              const pnl = calculator.calcTripPnL(t, settings);
              return `
              <div class="trip-mini-item" onclick="App.navigate('trips')">
                <span style="font-size:1.1rem">${t.game === 'ets2' ? '🇪🇺' : '🇺🇸'}</span>
                <div style="flex:1;min-width:0">
                  <div class="trip-mini-route">${t.source || '?'} → ${t.destination || '?'}</div>
                  <div class="trip-mini-sub">${t.distanceKm?.toFixed(0)||0} km · ${t.cargoLabel||t.cargoType||'—'}</div>
                </div>
                <div class="trip-mini-income">${Calculator.fmtShort(pnl.profit, currency)}</div>
              </div>`;
            }).join('')}
          </div>`}
        </div>

        <!-- Wear monitor -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">🔧 สภาพรถ (Live)</span>
          </div>
          <div id="wear-monitor">
            <div class="wear-meter">
              <div class="wear-label"><span>เครื่องยนต์</span><span class="wear-value" id="wear-engine">--%</span></div>
              <div class="progress-bar"><div class="progress-fill green" id="bar-engine" style="width:0%"></div></div>
            </div>
            <div class="wear-meter">
              <div class="wear-label"><span>ตัวถัง/เฟรม</span><span class="wear-value" id="wear-chassis">--%</span></div>
              <div class="progress-bar"><div class="progress-fill yellow" id="bar-chassis" style="width:0%"></div></div>
            </div>
            <div class="wear-meter">
              <div class="wear-label"><span>เทรลเลอร์</span><span class="wear-value" id="wear-trailer">--%</span></div>
              <div class="progress-bar"><div class="progress-fill orange" id="bar-trailer" style="width:0%"></div></div>
            </div>
            <div class="wear-meter" style="margin-top:var(--space-sm)">
              <div class="wear-label"><span>⛽ น้ำมัน</span><span class="wear-value" id="wear-fuel">--%</span></div>
              <div class="progress-bar"><div class="progress-fill blue" id="bar-fuel" style="width:0%"></div></div>
            </div>
          </div>
        </div>

        <!-- Cargo stats donut -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">📦 สัดส่วนสินค้า</span>
          </div>
          <div class="chart-wrapper" style="height:180px">
            <canvas id="chart-cargo"></canvas>
          </div>
        </div>

        <!-- Quick stats -->
        <div class="card col-span-2">
          <div class="card-header">
            <span class="card-title">⚡ สถิติด่วน</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-md)">
            ${[
              ['กำไรต่อ km', Calculator.fmtShort(stats.avgProfitPerKm, currency) + '/km', '📍'],
              ['เฉลี่ยน้ำมัน', trips.length > 0 ? (stats.totalFuel/Math.max(stats.totalDistance,1)*100).toFixed(1)+' L/100km' : '--', '⛽'],
              ['จำนวนเที่ยว', trips.length + ' เที่ยว', '🗺️'],
              ['ค่าปรับสะสม', Calculator.fmtShort(stats.totalFines, currency), '⚠️'],
            ].map(([label,val,icon]) => `
              <div style="background:var(--bg-elevated);border-radius:var(--radius-md);padding:var(--space-md);text-align:center">
                <div style="font-size:1.4rem;margin-bottom:4px">${icon}</div>
                <div style="font-size:1rem;font-weight:700;font-family:var(--font-en);color:var(--text-primary)">${val}</div>
                <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">${label}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
  },

  async afterRender() {
    await this._drawProfitChart();
    await this._drawCargoChart();
    this._startWearUpdate();
    this._setupTelemetryBanner();
  },

  async _drawProfitChart() {
    const settings  = await App.getSettings();
    const trips     = await db.getAllTrips();
    const currency  = settings.currency || 'THB';

    // Last 30 days
    const days = 30;
    const labels = [];
    const profits = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      labels.push(key.slice(5));  // MM-DD
      const dayTrips = trips.filter(t => t.date?.slice(0, 10) === key);
      const sum = dayTrips.reduce((a, t) => {
        const pnl = calculator.calcTripPnL(t, settings);
        return a + pnl.profit;
      }, 0);
      profits.push(Math.round(sum));
    }

    const canvas = document.getElementById('chart-profit');
    if (!canvas || !window.Chart) return;
    new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'กำไร',
          data: profits,
          backgroundColor: profits.map(v => v >= 0 ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'),
          borderColor:     profits.map(v => v >= 0 ? '#22c55e' : '#ef4444'),
          borderWidth: 1,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: ctx => ' ' + Calculator.fmt(ctx.raw, currency) }
        }},
        scales: {
          x: { ticks: { color: '#525e72', font: { size: 10 } }, grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { color: '#525e72', callback: v => Calculator.fmtShort(v, currency) },
            grid: { color: 'rgba(255,255,255,0.04)' }
          }
        }
      }
    });
  },

  async _drawCargoChart() {
    const trips = await db.getAllTrips();
    const tally = {};
    trips.forEach(t => {
      const k = t.cargoType || 'general';
      tally[k] = (tally[k] || 0) + 1;
    });
    const labels  = Object.keys(tally).map(k => RATES.THB?.cargoTypes?.[k]?.label || k);
    const data    = Object.values(tally);
    const colors  = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#a855f7','#06b6d4','#f97316','#84cc16'];

    const canvas = document.getElementById('chart-cargo');
    if (!canvas || !window.Chart) return;
    new Chart(canvas, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#8a95a8', font: { size: 11 }, boxWidth: 12, padding: 8 } },
        }
      }
    });
  },

  _startWearUpdate() {
    const update = () => {
      const t = telemetry.truck;
      if (!t) return;
      const fields = [
        ['engine',  t.wearEngine  || 0, 'bar-engine',  'wear-engine'],
        ['chassis', t.wearChassis || 0, 'bar-chassis', 'wear-chassis'],
        ['trailer', t.wearTrailer || 0, 'bar-trailer', 'wear-trailer'],
      ];
      fields.forEach(([, pct, barId, labelId]) => {
        const health = Math.round((1 - pct) * 100);
        const bar   = document.getElementById(barId);
        const label = document.getElementById(labelId);
        if (bar)   { bar.style.width = health + '%'; bar.className = 'progress-fill ' + (health > 60 ? 'green' : health > 30 ? 'yellow' : 'red'); }
        if (label) label.textContent = health + '%';
      });
      const fuelPct = telemetry.getFuelPct();
      const fb = document.getElementById('bar-fuel'), fl = document.getElementById('wear-fuel');
      if (fb) { fb.style.width = fuelPct + '%'; fb.className = 'progress-fill ' + (fuelPct > 40 ? 'green' : fuelPct > 20 ? 'yellow' : 'red'); }
      if (fl) fl.textContent = fuelPct + '%';
    };
    telemetry.on('update', update);
    update();
  },

  _setupTelemetryBanner() {
    telemetry.on('jobStarted', (data) => {
      const banner = document.getElementById('active-trip-banner');
      if (banner) {
        banner.classList.remove('hidden');
        const routeEl  = document.getElementById('banner-route');
        const cargoEl  = document.getElementById('banner-cargo');
        if (routeEl) routeEl.textContent = `${data.source || '?'} → ${data.destination || '?'}`;
        if (cargoEl) cargoEl.textContent = data.cargo || 'ไม่ทราบสินค้า';
        this._tripStartTime = Date.now();
        this._bannerInterval = setInterval(() => {
          const elapsed = Math.floor((Date.now() - this._tripStartTime) / 1000);
          const h = Math.floor(elapsed / 3600), m = Math.floor((elapsed % 3600) / 60), s = elapsed % 60;
          const timeEl = document.getElementById('banner-time');
          if (timeEl) timeEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
          const fuelEl = document.getElementById('banner-fuel');
          if (fuelEl) {
            const fuel = (data.fuelAtStart || 0) - (telemetry.truck?.fuel?.value || 0);
            fuelEl.textContent = Math.max(0, fuel).toFixed(1) + ' L';
          }
          const distEl = document.getElementById('banner-dist');
          if (distEl) {
            const dist = (telemetry.truck?.odometer || 0) - (data.odoAtStart || 0);
            distEl.textContent = Math.max(0, dist).toFixed(1) + ' km';
          }
        }, 1000);
      }
    });

    telemetry.on('jobFinished', () => {
      clearInterval(this._bannerInterval);
      const banner = document.getElementById('active-trip-banner');
      if (banner) banner.classList.add('hidden');
    });
  }
};
