/* Drivers Page */
const DriversPage = {
  async render() {
    const drivers  = await db.getAllDrivers();
    const settings = await App.getSettings();
    const currency = settings.currency || 'THB';
    const trips    = await db.getAllTrips();

    return `
    <div class="page-fade">
      <div class="section-header">
        <div>
          <div class="section-title">คนขับ & AI Driver</div>
          <div class="section-sub">ดึงข้อมูล AI Driver จากไฟล์ Save Game หรือเพิ่มคนขับเองได้</div>
        </div>
        <div class="section-actions">
          <button class="btn btn-secondary" onclick="DriversPage.importFromSave()">📂 Import จาก Save Game</button>
          <button class="btn btn-primary" onclick="DriversPage.openAdd()">➕ เพิ่มคนขับ</button>
        </div>
      </div>
      <div class="driver-cards-grid" id="driver-cards">
        ${drivers.length === 0 ? `
          <div class="empty-state" style="grid-column:1/-1">
            <div class="empty-icon">👤</div>
            <div class="empty-title">ยังไม่มีคนขับ</div>
            <div class="empty-desc">กด "Import จาก Save Game" หรือเพิ่มด้วยตนเอง</div>
          </div>` :
          drivers.map(d => DriversPage._renderCard(d, trips, settings, currency)).join('')}
      </div>
    </div>`;
  },

  _renderCard(d, trips, settings, currency) {
    const driverTrips = trips.filter(t => t.driverId === d.id || (d.isPlayer && !t.driverId));
    const stats = Calculator.summarize(driverTrips, settings);
    const wagePct = d.wagePct || 30;
    return `
    <div class="driver-card">
      <div class="driver-card-header">
        <div class="driver-avatar ${d.isAI ? 'ai' : ''}">${d.isAI ? '🤖' : '🧑'}</div>
        <div>
          <div class="driver-name">${d.name}</div>
          <div class="driver-type">${d.isAI ? 'AI Driver' : d.isPlayer ? 'ผู้เล่น (คุณ)' : 'คนขับ'} ${d.isAI ? `· ค่าจ้าง ${wagePct}%` : ''}</div>
        </div>
        ${!d.isPlayer ? `<button class="btn btn-ghost btn-sm btn-icon" onclick="DriversPage.editDriver(${d.id})" style="margin-left:auto">✏️</button>` : ''}
      </div>
      <div class="driver-stats">
        <div class="driver-stat">
          <span class="driver-stat-label">เที่ยวสะสม</span>
          <span class="driver-stat-value">${driverTrips.length}</span>
        </div>
        <div class="driver-stat">
          <span class="driver-stat-label">ระยะทางรวม</span>
          <span class="driver-stat-value">${(stats.totalDistance).toLocaleString()} km</span>
        </div>
        <div class="driver-stat">
          <span class="driver-stat-label">รายได้รวม</span>
          <span class="driver-stat-value" style="color:var(--green)">${Calculator.fmtShort(stats.totalIncome, currency)}</span>
        </div>
        <div class="driver-stat">
          <span class="driver-stat-label">กำไรสุทธิ</span>
          <span class="driver-stat-value" style="color:${stats.totalProfit>=0?'var(--green)':'var(--red)'}">${Calculator.fmtShort(stats.totalProfit, currency)}</span>
        </div>
      </div>
      ${d.xp ? `
      <div class="driver-xp">
        <div class="driver-xp-label"><span>XP Level ${d.level||1}</span><span>${d.xp||0} XP</span></div>
        <div class="progress-bar"><div class="progress-fill purple" style="width:${Math.min(100,(d.xp||0)%1000/10)}%"></div></div>
      </div>` : ''}
    </div>`;
  },

  openAdd() {
    App.openModal('เพิ่มคนขับ', `
      <div class="form-group"><label class="form-label">ชื่อคนขับ</label><input type="text" id="d-name" placeholder="ชื่อ..."></div>
      <div class="form-group">
        <label class="form-label">ประเภท</label>
        <select id="d-type">
          <option value="human">คนขับ (Human)</option>
          <option value="ai">AI Driver</option>
          <option value="player">ผู้เล่น (ฉัน)</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">ค่าจ้าง (% ของรายได้)</label><input type="number" id="d-wage" value="30" min="0" max="100"></div>
    `, [
      { label: 'ยกเลิก', cls: 'btn-secondary', action: () => App.closeModal() },
      { label: '💾 บันทึก', cls: 'btn-primary', action: () => DriversPage._saveDriver() },
    ]);
  },

  async _saveDriver() {
    const name = document.getElementById('d-name')?.value.trim();
    const type = document.getElementById('d-type')?.value;
    const wage = parseFloat(document.getElementById('d-wage')?.value) || 30;
    if (!name) { App.toast('กรุณาใส่ชื่อ', 'error'); return; }
    await db.addDriver({ name, isAI: type === 'ai', isPlayer: type === 'player', wagePct: wage, addedAt: new Date().toISOString() });
    App.closeModal();
    App.toast('เพิ่มคนขับแล้ว ✅', 'success');
    App.navigate('drivers');
  },

  importFromSave() {
    App.openModal('Import AI Driver จาก Save Game', `
      <div style="margin-bottom:var(--space-md)">
        <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:var(--space-sm)">
          เลือกไฟล์ <code>game.sii</code> หรือ <code>profile.sii</code> จาก Save Game ของคุณ
        </p>
        <div style="font-size:0.78rem;color:var(--text-muted)">
          📁 ตำแหน่งไฟล์ ETS2: <code>Documents\\Euro Truck Simulator 2\\profiles\\[id]\\save\\</code><br>
          📁 ตำแหน่งไฟล์ ATS: <code>Documents\\American Truck Simulator\\profiles\\[id]\\save\\</code>
        </div>
      </div>
      <input type="file" id="sii-file" accept=".sii,.bak" style="width:100%">
      <div id="sii-preview" style="margin-top:var(--space-md);font-size:0.82rem;color:var(--text-muted)"></div>
    `, [
      { label: 'ยกเลิก', cls: 'btn-secondary', action: () => App.closeModal() },
      { label: '📥 Import', cls: 'btn-primary', action: () => DriversPage._parseSaveFile() },
    ]);
    document.getElementById('sii-file')?.addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (f) document.getElementById('sii-preview').textContent = `เลือก: ${f.name} (${(f.size/1024).toFixed(1)} KB)`;
    });
  },

  async _parseSaveFile() {
    const fileInput = document.getElementById('sii-file');
    if (!fileInput?.files[0]) { App.toast('กรุณาเลือกไฟล์', 'error'); return; }
    const text = await fileInput.files[0].text();
    // Simple SII driver parser
    const driverBlocks = [...text.matchAll(/driver\s*:\s*\S+\s*\{([^}]+)\}/g)];
    let added = 0;
    for (const block of driverBlocks) {
      const content = block[1];
      const nameMatch = content.match(/name\s*:\s*"([^"]+)"/);
      const xpMatch   = content.match(/experience\s*:\s*(\d+)/);
      if (nameMatch) {
        const existing = (await db.getAllDrivers()).find(d => d.name === nameMatch[1]);
        if (!existing) {
          await db.addDriver({ name: nameMatch[1], isAI: true, wagePct: 30, xp: parseInt(xpMatch?.[1]||0), level: Math.floor(parseInt(xpMatch?.[1]||0)/1000)+1, addedAt: new Date().toISOString() });
          added++;
        }
      }
    }
    App.closeModal();
    App.toast(added > 0 ? `Import ${added} คนขับสำเร็จ ✅` : 'ไม่พบข้อมูลคนขับในไฟล์', added > 0 ? 'success' : 'warning');
    if (added > 0) App.navigate('drivers');
  },

  editDriver(id) { App.toast('ฟีเจอร์แก้ไขจะมาเร็วๆ นี้', 'info'); },
  afterRender() {}
};

/* Fleet Page */
const FleetPage = {
  async render() {
    const trucks   = await db.getAllTrucks();
    const settings = await App.getSettings();
    const currency = settings.currency || 'THB';
    const trips    = await db.getAllTrips();

    return `
    <div class="page-fade">
      <div class="section-header">
        <div><div class="section-title">กองรถ (Fleet)</div><div class="section-sub">จัดการรถทุกคันในบริษัท</div></div>
        <button class="btn btn-primary" onclick="FleetPage.openAdd()">➕ เพิ่มรถ</button>
      </div>
      <div class="fleet-cards-grid" id="fleet-cards">
        ${trucks.length === 0 ? `
          <div class="empty-state" style="grid-column:1/-1">
            <div class="empty-icon">🚚</div>
            <div class="empty-title">ยังไม่มีรถในกอง</div>
            <div class="empty-desc">กด "เพิ่มรถ" เพื่อเพิ่มรถคันแรก</div>
          </div>` :
          trucks.map(truck => {
            const truckTrips = trips.filter(t => t.truckId === truck.id);
            const totalKm    = truckTrips.reduce((a,t) => a+(t.distanceKm||0), 0);
            const lifePct    = truck.lifeKm ? Math.min(100, Math.round(totalKm/truck.lifeKm*100)) : 0;
            const liveTruck  = telemetry.truck;
            return `
            <div class="fleet-card">
              <div class="fleet-card-header">
                <div class="truck-icon">🚛</div>
                <div>
                  <div class="truck-name">${truck.name}</div>
                  <div class="truck-model">${truck.model||'—'}</div>
                </div>
              </div>
              <div class="fleet-card-body">
                <div class="fleet-wear-section">
                  <div class="fleet-wear-title">สภาพรถ (Live)</div>
                  ${[['เครื่องยนต์','Engine'],['ตัวถัง','Chassis'],['เทรลเลอร์','Trailer']].map(([th,k]) => {
                    const health = 100 - Math.round((liveTruck?.[`wear${k}`]||0)*100);
                    return `<div class="wear-meter">
                      <div class="wear-label"><span>${th}</span><span>${health}%</span></div>
                      <div class="progress-bar"><div class="progress-fill ${health>60?'green':health>30?'yellow':'red'}" style="width:${health}%"></div></div>
                    </div>`;
                  }).join('')}
                </div>
                ${truck.lifeKm ? `
                <div>
                  <div class="fleet-wear-title">อายุการใช้งาน</div>
                  <div class="wear-label"><span>${Math.round(totalKm).toLocaleString()} / ${truck.lifeKm.toLocaleString()} km</span><span>${lifePct}%</span></div>
                  <div class="progress-bar"><div class="progress-fill ${lifePct<60?'green':lifePct<80?'yellow':'red'}" style="width:${lifePct}%"></div></div>
                </div>` : ''}
              </div>
              <div class="fleet-card-footer">
                <div class="fleet-odometer">🛣️ ${Math.round(totalKm).toLocaleString()} km รวม</div>
                <button class="btn btn-ghost btn-sm" onclick="FleetPage.deleteTruck(${truck.id})">🗑️</button>
              </div>
            </div>`;
          }).join('')}
      </div>
    </div>`;
  },

  openAdd() {
    App.openModal('เพิ่มรถในกอง', `
      <div class="form-group"><label class="form-label">ชื่อรถ / เลขทะเบียน</label><input type="text" id="t-name" placeholder="เช่น รถคัน 1 หรือ กข-1234"></div>
      <div class="form-group"><label class="form-label">รุ่นรถ</label><input type="text" id="t-model" placeholder="เช่น Scania R 730"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">ราคารถ</label><input type="number" id="t-price" placeholder="3000000"></div>
        <div class="form-group"><label class="form-label">อายุการใช้งาน (km)</label><input type="number" id="t-life" placeholder="1000000"></div>
      </div>
    `, [
      { label: 'ยกเลิก', cls: 'btn-secondary', action: () => App.closeModal() },
      { label: '💾 บันทึก', cls: 'btn-primary', action: () => FleetPage._saveTruck() },
    ]);
  },

  async _saveTruck() {
    const name  = document.getElementById('t-name')?.value.trim();
    const model = document.getElementById('t-model')?.value.trim();
    const price = parseFloat(document.getElementById('t-price')?.value) || 0;
    const life  = parseFloat(document.getElementById('t-life')?.value)  || 0;
    if (!name) { App.toast('กรุณาใส่ชื่อรถ', 'error'); return; }
    await db.addTruck({ name, model, price, lifeKm: life, addedAt: new Date().toISOString() });
    App.closeModal();
    App.toast('เพิ่มรถแล้ว ✅', 'success');
    App.navigate('fleet');
  },

  async deleteTruck(id) {
    if (!confirm('ลบรถคันนี้?')) return;
    await db.deleteTruck(id);
    App.toast('ลบรถแล้ว', 'success');
    App.navigate('fleet');
  },

  afterRender() {}
};
