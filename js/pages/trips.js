/* ============================================================
   Trips Page
   ============================================================ */
const TripsPage = {
  filter: { search: '', game: '', cargoType: '' },

  async render() {
    const trips    = await db.getAllTrips();
    const settings = await App.getSettings();
    const currency = settings.currency || 'THB';
    const sorted   = [...trips].reverse();

    return `
    <div class="page-fade">
      <div class="section-header">
        <div>
          <div class="section-title">บันทึกเที่ยววิ่ง</div>
          <div class="section-sub">ทุกเที่ยวถูกบันทึกอัตโนมัติเมื่อเชื่อมต่อเกม</div>
        </div>
        <div class="section-actions">
          <button class="btn btn-secondary" onclick="TripsPage.openManualAdd()">➕ เพิ่มด้วยตนเอง</button>
        </div>
      </div>

      <!-- Filters -->
      <div class="trips-filter-bar">
        <input type="text" id="trip-search" placeholder="🔍 ค้นหา เส้นทาง / สินค้า..." oninput="TripsPage.applyFilter()" style="min-width:220px">
        <select id="trip-filter-game" onchange="TripsPage.applyFilter()">
          <option value="">ทุกเกม</option>
          <option value="ets2">🇪🇺 ETS2</option>
          <option value="ats">🇺🇸 ATS</option>
        </select>
        <select id="trip-filter-cargo" onchange="TripsPage.applyFilter()">
          <option value="">ทุกประเภทสินค้า</option>
          ${Object.entries(RATES[currency]?.cargoTypes || {}).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}
        </select>
      </div>

      <!-- Table -->
      <div class="table-wrapper">
        <table id="trips-table">
          <thead>
            <tr>
              <th>#</th>
              <th>วันที่</th>
              <th>เกม</th>
              <th>เส้นทาง</th>
              <th>สินค้า</th>
              <th class="td-right">ระยะทาง</th>
              <th class="td-right">น้ำมัน (L)</th>
              <th class="td-right">รายได้</th>
              <th class="td-right">ค่าใช้จ่าย</th>
              <th class="td-right">กำไร</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="trips-tbody">
            ${await TripsPage._renderRows(sorted, settings)}
          </tbody>
        </table>
      </div>
    </div>`;
  },

  async _renderRows(trips, settings) {
    if (trips.length === 0) {
      return `<tr><td colspan="11"><div class="empty-state">
        <div class="empty-icon">🚛</div>
        <div class="empty-title">ยังไม่มีเที่ยววิ่ง</div>
        <div class="empty-desc">เชื่อมต่อ ETS2 หรือ ATS เพื่อเริ่มบันทึกอัตโนมัติ</div>
      </div></td></tr>`;
    }
    const currency = settings.currency || 'THB';
    return trips.map((t, i) => {
      const pnl = calculator.calcTripPnL(t, settings);
      const dateStr = t.date ? new Date(t.date).toLocaleDateString('th-TH', { day:'2-digit', month:'short', year:'2-digit' }) : '—';
      return `
      <tr>
        <td class="td-muted td-mono">${t.id || i+1}</td>
        <td class="td-muted">${dateStr}</td>
        <td><span class="badge ${t.game === 'ets2' ? 'badge-ets2' : 'badge-ats'}">${t.game?.toUpperCase()||'—'}</span></td>
        <td>
          <div style="font-weight:500">${t.source||'?'} → ${t.destination||'?'}</div>
          <div class="td-muted" style="font-size:0.72rem">${new Date(t.date||0).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})}</div>
        </td>
        <td><span class="badge badge-blue">${t.cargoLabel||t.cargoType||'—'}</span></td>
        <td class="td-right td-mono">${(t.distanceKm||0).toFixed(1)} km</td>
        <td class="td-right td-mono">${(t.fuelUsed||0).toFixed(1)}</td>
        <td class="trip-row-income td-right">${Calculator.fmt(pnl.income, currency)}</td>
        <td class="trip-row-expense td-right">${Calculator.fmt(pnl.totalExpenses, currency)}</td>
        <td class="trip-row-profit td-right ${pnl.profit >= 0 ? 'pos' : 'neg'}">${Calculator.fmt(pnl.profit, currency)}</td>
        <td>
          <div style="display:flex;gap:4px">
            <button class="btn btn-ghost btn-sm btn-icon" onclick="TripsPage.viewTrip(${t.id})" title="รายละเอียด">👁️</button>
            <button class="btn btn-ghost btn-sm btn-icon" onclick="TripsPage.deleteTrip(${t.id})" title="ลบ">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  },

  applyFilter() {
    const search = document.getElementById('trip-search')?.value.toLowerCase() || '';
    const game   = document.getElementById('trip-filter-game')?.value || '';
    const cargo  = document.getElementById('trip-filter-cargo')?.value || '';
    this.filter = { search, game, cargoType: cargo };
    this._reloadTable();
  },

  async _reloadTable() {
    const settings = await App.getSettings();
    const trips    = await db.getAllTrips();
    let filtered   = [...trips].reverse();
    if (this.filter.search) {
      filtered = filtered.filter(t =>
        (t.source||'').toLowerCase().includes(this.filter.search) ||
        (t.destination||'').toLowerCase().includes(this.filter.search) ||
        (t.cargoLabel||'').toLowerCase().includes(this.filter.search));
    }
    if (this.filter.game)      filtered = filtered.filter(t => t.game === this.filter.game);
    if (this.filter.cargoType) filtered = filtered.filter(t => t.cargoType === this.filter.cargoType);
    const tbody = document.getElementById('trips-tbody');
    if (tbody) tbody.innerHTML = await TripsPage._renderRows(filtered, settings);
  },

  async viewTrip(id) {
    const trip     = await db.getTrip(id);
    const settings = await App.getSettings();
    const currency = settings.currency || 'THB';
    const pnl      = calculator.calcTripPnL(trip, settings);
    const fmt      = v => Calculator.fmt(v, currency);

    App.openModal('รายละเอียดเที่ยววิ่ง', `
      <div class="trip-detail">
        <div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:var(--space-sm)">ข้อมูลการเดินทาง</div>
          ${[
            ['เส้นทาง', `${trip.source||'?'} → ${trip.destination||'?'}`],
            ['เกม', trip.game?.toUpperCase()||'—'],
            ['วันที่', trip.date ? new Date(trip.date).toLocaleString('th-TH') : '—'],
            ['สินค้า', trip.cargoLabel||trip.cargoType||'—'],
            ['น้ำหนัก', trip.massT ? trip.massT.toFixed(1)+' ตัน' : '—'],
            ['ระยะทาง', (trip.distanceKm||0).toFixed(1)+' km'],
            ['เวลาที่ใช้', trip.durationMin ? Math.round(trip.durationMin)+' นาที' : '—'],
          ].map(([l,v]) => `<div class="trip-detail-row"><span class="trip-detail-label">${l}</span><span class="trip-detail-value">${v}</span></div>`).join('')}
        </div>
        <div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:var(--space-sm)">การเงิน (Real-world)</div>
          ${[
            ['รายได้', `<span style="color:var(--green);font-weight:700">${fmt(pnl.income)}</span>`],
            ['ค่าเชื้อเพลิง', `<span style="color:var(--red)">${fmt(pnl.fuelCost)}</span>`],
            ['ค่าสึกหรอ', `<span style="color:var(--red)">${fmt(pnl.wearCost)}</span>`],
            ['ค่าเสื่อมราคา', `<span style="color:var(--red)">${fmt(pnl.depreciation)}</span>`],
            ['Toll', `<span style="color:var(--orange)">${fmt(pnl.tolls)}</span>`],
            ['ค่าปรับ', `<span style="color:var(--yellow)">${fmt(pnl.fines)}</span>`],
            ['ค่าขนส่งพิเศษ', `<span style="color:var(--orange)">${fmt(pnl.ferry)}</span>`],
            ['ค่าแรงคนขับ', `<span style="color:var(--purple)">${fmt(pnl.driverWage)}</span>`],
            ['กำไรสุทธิ', `<span style="color:${pnl.profit>=0?'var(--green)':'var(--red)'};font-weight:700;font-size:1.05rem">${fmt(pnl.profit)}</span>`],
          ].map(([l,v]) => `<div class="trip-detail-row"><span class="trip-detail-label">${l}</span><span class="trip-detail-value">${v}</span></div>`).join('')}
        </div>
      </div>
    `, [{ label: 'ปิด', cls: 'btn-secondary', action: () => App.closeModal() }]);
  },

  async deleteTrip(id) {
    if (!confirm('ลบเที่ยววิ่งนี้?')) return;
    await db.deleteTrip(id);
    App.toast('ลบเที่ยววิ่งแล้ว', 'success');
    this._reloadTable();
  },

  openManualAdd() {
    const gameOpts = `<option value="ets2">🇪🇺 ETS2</option><option value="ats">🇺🇸 ATS</option>`;
    const cargoOpts = Object.entries(RATES.THB.cargoTypes).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('');
    App.openModal('เพิ่มเที่ยววิ่งด้วยตนเอง', `
      <div class="form-row">
        <div class="form-group"><label class="form-label">เกม</label><select id="m-game">${gameOpts}</select></div>
        <div class="form-group"><label class="form-label">วันที่</label><input type="datetime-local" id="m-date" value="${new Date().toISOString().slice(0,16)}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">ต้นทาง</label><input type="text" id="m-src" placeholder="เมือง / คลังสินค้า"></div>
        <div class="form-group"><label class="form-label">ปลายทาง</label><input type="text" id="m-dst" placeholder="เมือง / คลังสินค้า"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">ประเภทสินค้า</label><select id="m-cargo">${cargoOpts}</select></div>
        <div class="form-group"><label class="form-label">น้ำหนัก (ตัน)</label><input type="number" id="m-mass" step="0.1" min="0" placeholder="22.0"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">ระยะทาง (km)</label><input type="number" id="m-dist" step="0.1" min="0" placeholder="450"></div>
        <div class="form-group"><label class="form-label">น้ำมันที่ใช้ (ลิตร)</label><input type="number" id="m-fuel" step="0.1" min="0" placeholder="85"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Toll ที่จ่าย</label><input type="number" id="m-toll" step="0.01" min="0" placeholder="0"></div>
        <div class="form-group"><label class="form-label">ค่าปรับ</label><input type="number" id="m-fine" step="0.01" min="0" placeholder="0"></div>
      </div>
    `, [
      { label: 'ยกเลิก', cls: 'btn-secondary', action: () => App.closeModal() },
      { label: '💾 บันทึก', cls: 'btn-primary', action: () => TripsPage._saveManual() },
    ]);
  },

  async _saveManual() {
    const game  = document.getElementById('m-game')?.value;
    const src   = document.getElementById('m-src')?.value.trim();
    const dst   = document.getElementById('m-dst')?.value.trim();
    const cargo = document.getElementById('m-cargo')?.value;
    const mass  = parseFloat(document.getElementById('m-mass')?.value) || 0;
    const dist  = parseFloat(document.getElementById('m-dist')?.value) || 0;
    const fuel  = parseFloat(document.getElementById('m-fuel')?.value) || 0;
    const toll  = parseFloat(document.getElementById('m-toll')?.value) || 0;
    const fine  = parseFloat(document.getElementById('m-fine')?.value) || 0;
    const date  = document.getElementById('m-date')?.value || new Date().toISOString();
    const settings = await App.getSettings();

    if (!src || !dst || !dist) { App.toast('กรุณากรอกข้อมูลให้ครบ', 'error'); return; }

    const cargoLabel = RATES[settings.currency]?.cargoTypes?.[cargo]?.label || cargo;
    const trip = { game, source: src, destination: dst, cargoType: cargo, cargoLabel, massT: mass, distanceKm: dist, fuelUsed: fuel, tollTotal: toll, fineTotal: fine, date: new Date(date).toISOString(), manual: true };
    await db.addTrip(trip);

    // Add ledger entry
    const pnl = calculator.calcTripPnL(trip, settings);
    await db.addLedgerEntry({ type: 'trip', tripId: trip.id, desc: `งาน: ${src} → ${dst}`, income: pnl.income, expense: pnl.totalExpenses, date: trip.date });

    App.closeModal();
    App.toast('บันทึกเที่ยววิ่งแล้ว ✅', 'success');
    this._reloadTable();
  },

  afterRender() {}
};
