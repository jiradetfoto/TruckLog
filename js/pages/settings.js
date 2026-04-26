/* Settings Page */
const SettingsPage = {
  _section: 'company',

  async render() {
    const s = await App.getSettings();
    return `
    <div class="page-fade">
      <div class="section-title" style="margin-bottom:var(--space-md)">ตั้งค่า</div>
      <div class="settings-layout">
        <!-- Settings Nav -->
        <div class="settings-sidebar-nav">
          ${[['company','🏢 บริษัท'],['currency','💱 สกุลเงิน & Mode'],['rates','📋 อัตราค่าขนส่ง'],['costs','🔧 ค่าใช้จ่าย'],['telemetry','📡 การเชื่อมต่อ']].map(([key,label]) => `
            <div class="settings-nav-item ${this._section===key?'active':''}" onclick="SettingsPage.switchSection('${key}')">${label}</div>
          `).join('')}
        </div>

        <!-- Settings Content -->
        <div class="settings-section" id="settings-content">
          ${await this._renderSection(s)}
        </div>
      </div>
    </div>`;
  },

  async switchSection(sec) {
    this._section = sec;
    const s = await App.getSettings();
    const content = document.getElementById('settings-content');
    if (content) content.innerHTML = await this._renderSection(s);
    document.querySelectorAll('.settings-nav-item').forEach(el => {
      el.classList.toggle('active', el.textContent.includes(sec) || el.getAttribute('onclick')?.includes(sec));
    });
  },

  async _renderSection(s) {
    const game = telemetry.game || 'ets2';
    const availCurrencies = GAME_CURRENCIES[game] || ['EUR','THB'];

    if (this._section === 'company') return `
      <div class="settings-panel">
        <div class="settings-panel-title">🏢 ข้อมูลบริษัท</div>
        <div class="form-group"><label class="form-label">ชื่อบริษัท</label>
          <input type="text" id="s-company" value="${s.companyName||''}" placeholder="บริษัทขนส่งของฉัน"></div>
        <div class="form-group"><label class="form-label">เกมหลักที่เล่น</label>
          <select id="s-maingame">
            <option value="ets2" ${s.mainGame==='ets2'?'selected':''}>🇪🇺 Euro Truck Simulator 2</option>
            <option value="ats"  ${s.mainGame==='ats' ?'selected':''}>🇺🇸 American Truck Simulator</option>
          </select>
        </div>
        <button class="btn btn-primary" onclick="SettingsPage.saveCompany()">💾 บันทึก</button>
      </div>`;

    if (this._section === 'currency') return `
      <div class="settings-panel">
        <div class="settings-panel-title">💱 สกุลเงิน & โหมดการคำนวณ</div>
        <div class="form-group">
          <label class="form-label">สกุลเงิน (ขึ้นกับเกม: ETS2=EUR/THB, ATS=USD/THB)</label>
          <select id="s-currency" onchange="SettingsPage.onCurrencyChange()">
            ${Object.keys(RATES).map(k => `<option value="${k}" ${s.currency===k?'selected':''}>${RATES[k].label}</option>`).join('')}
          </select>
          <div class="form-hint" id="currency-hint">อัตราค่าขนส่งจะเปลี่ยนตามสกุลเงินที่เลือก</div>
        </div>
        <div class="form-group">
          <label class="form-label">โหมดคนขับ</label>
          <select id="s-mode">
            <option value="forHire"  ${s.mode==='forHire' ?'selected':''}>🔑 รับจ้างขับ (For-Hire) — ไม่รวมค่าเสื่อมรถ</option>
            <option value="ownerOp" ${s.mode==='ownerOp'?'selected':''}>🚛 เจ้าของรถ (Owner-Operator) — รวมทุกต้นทุน</option>
          </select>
        </div>
        <button class="btn btn-primary" onclick="SettingsPage.saveCurrency()">💾 บันทึก</button>
      </div>`;

    if (this._section === 'rates') {
      const cur = s.currency || 'THB';
      const rateInfo = RATES[cur];
      const customRates = s.customRates || {};
      return `
      <div class="settings-panel">
        <div class="settings-panel-title">📋 อัตราค่าขนส่ง — ${rateInfo?.label||cur}</div>
        <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:var(--space-md)">ปรับแต่งอัตราค่าขนส่งที่ใช้คำนวณ (${rateInfo?.unit||'/km'}) แยกตาม Mode</p>
        <table class="rate-table">
          <thead><tr><th style="color:var(--text-muted);font-size:0.75rem">ประเภทสินค้า</th><th style="color:var(--text-muted);font-size:0.75rem">รับจ้างขับ</th><th style="color:var(--text-muted);font-size:0.75rem">เจ้าของรถ</th></tr></thead>
          <tbody>
          ${Object.entries(rateInfo?.cargoTypes||{}).map(([k,v]) => `
            <tr>
              <td>${v.label}</td>
              <td><input type="number" id="rate-fh-${k}" value="${customRates[cur]?.[k]?.forHire ?? ((v.forHire[0]+v.forHire[1])/2).toFixed(2)}" step="0.01" min="0"></td>
              <td><input type="number" id="rate-oo-${k}" value="${customRates[cur]?.[k]?.ownerOp ?? ((v.ownerOp[0]+v.ownerOp[1])/2).toFixed(2)}" step="0.01" min="0"></td>
            </tr>`).join('')}
          </tbody>
        </table>
        <button class="btn btn-primary" style="margin-top:var(--space-md)" onclick="SettingsPage.saveRates('${cur}')">💾 บันทึกอัตรา</button>
        <button class="btn btn-ghost" style="margin-top:var(--space-md);margin-left:var(--space-sm)" onclick="SettingsPage.resetRates('${cur}')">↩ รีเซ็ต</button>
      </div>`;
    }

    if (this._section === 'costs') return `
      <div class="settings-panel">
        <div class="settings-panel-title">⛽ ราคาน้ำมัน</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${RATES[s.currency||'THB']?.fuelLabel||'ราคาน้ำมัน'}</label>
            <input type="number" id="s-fuel-price" value="${s.fuelPrice ?? RATES[s.currency||'THB']?.defaultFuelPrice ?? 30}" step="0.01" min="0">
          </div>
        </div>
      </div>
      <div class="settings-panel">
        <div class="settings-panel-title">🔧 ค่าซ่อมบำรุง (ราคาซ่อมเต็ม 100%)</div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">ซ่อมเครื่องยนต์ (เต็ม)</label><input type="number" id="s-repair-engine"  value="${s.repairEngine||50000}"  min="0"></div>
          <div class="form-group"><label class="form-label">ซ่อมตัวถัง (เต็ม)</label><input type="number" id="s-repair-chassis" value="${s.repairChassis||30000}" min="0"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">ซ่อมเทรลเลอร์ (เต็ม)</label><input type="number" id="s-repair-trailer" value="${s.repairTrailer||20000}" min="0"></div>
        </div>
      </div>
      <div class="settings-panel">
        <div class="settings-panel-title">🚛 ข้อมูลรถหลัก (สำหรับคำนวณค่าเสื่อม)</div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">ราคารถ</label><input type="number" id="s-truck-price" value="${s.truckPrice||3000000}" min="0"></div>
          <div class="form-group"><label class="form-label">อายุการใช้งาน (km)</label><input type="number" id="s-truck-life" value="${s.truckLifeKm||1000000}" min="0"></div>
        </div>
      </div>
      <button class="btn btn-primary" onclick="SettingsPage.saveCosts()">💾 บันทึกค่าใช้จ่าย</button>`;

    if (this._section === 'telemetry') return `
      <div class="settings-panel">
        <div class="settings-panel-title">📡 การเชื่อมต่อ Telemetry Server</div>
        <div class="connection-widget" style="margin-bottom:var(--space-md)">
          <div class="status-dot ${telemetry.connected ? (telemetry.game||'connected') : 'disconnected'}"></div>
          <div class="connection-status-text">
            ${telemetry.connected
              ? `เชื่อมต่อ ${telemetry.game?.toUpperCase()||''} แล้ว`
              : 'ยังไม่ได้เชื่อมต่อ — ต้องเปิดเกมและ ets2-telemetry-server ก่อน'}
          </div>
          <button class="btn btn-secondary btn-sm" onclick="SettingsPage.testConnection()">🔌 ทดสอบ</button>
        </div>
        <div class="form-group">
          <label class="form-label">Telemetry Server URL</label>
          <input type="text" id="s-tele-url" value="${s.telemetryUrl||'ws://localhost:25555/'}" placeholder="ws://localhost:25555/">
          <div class="form-hint">ค่าเริ่มต้น: ws://localhost:25555/ (ets2-telemetry-server ต้องรันอยู่)</div>
        </div>
        <button class="btn btn-primary" onclick="SettingsPage.saveTelemetry()">💾 บันทึก & เชื่อมต่อ</button>
        <div style="margin-top:var(--space-lg);padding:var(--space-md);background:var(--bg-elevated);border-radius:var(--radius-md)">
          <div style="font-size:0.8rem;font-weight:600;margin-bottom:var(--space-sm)">📥 วิธีติดตั้ง ets2-telemetry-server</div>
          <ol style="font-size:0.78rem;color:var(--text-muted);padding-left:var(--space-md);line-height:2">
            <li>ดาวน์โหลด <a href="https://github.com/nicolargh/ETS2Sync-Helper" style="color:var(--accent)">ets2-telemetry-server</a></li>
            <li>วาง plugin <code>.dll</code> ใน <code>…\\ETS2\\bin\\win_x64\\plugins\\</code></li>
            <li>รัน <code>server.exe</code></li>
            <li>เปิดเกม → แอพจะเชื่อมต่ออัตโนมัติ</li>
          </ol>
        </div>
      </div>`;

    return '<div class="empty-state"><div class="empty-title">เลือกหมวดการตั้งค่า</div></div>';
  },

  async saveCompany() {
    const name = document.getElementById('s-company')?.value.trim();
    const game = document.getElementById('s-maingame')?.value;
    await db.setSetting('companyName', name);
    await db.setSetting('mainGame', game);
    document.getElementById('company-name-sidebar').textContent = name || 'บริษัทของฉัน';
    App.toast('บันทึกข้อมูลบริษัทแล้ว ✅', 'success');
  },

  async saveCurrency() {
    const currency = document.getElementById('s-currency')?.value;
    const mode     = document.getElementById('s-mode')?.value;
    await db.setSetting('currency', currency);
    await db.setSetting('mode', mode);
    const badge = document.getElementById('currency-badge');
    if (badge) badge.textContent = currency;
    App.toast('บันทึกสกุลเงินแล้ว ✅', 'success');
  },

  async saveRates(cur) {
    const s = await App.getSettings();
    const customRates = s.customRates || {};
    customRates[cur] = customRates[cur] || {};
    Object.keys(RATES[cur]?.cargoTypes||{}).forEach(k => {
      customRates[cur][k] = {
        forHire: parseFloat(document.getElementById(`rate-fh-${k}`)?.value) || 0,
        ownerOp: parseFloat(document.getElementById(`rate-oo-${k}`)?.value) || 0,
      };
    });
    await db.setSetting('customRates', customRates);
    App.toast('บันทึกอัตราค่าขนส่งแล้ว ✅', 'success');
  },

  async resetRates(cur) {
    const s = await App.getSettings();
    const customRates = s.customRates || {};
    delete customRates[cur];
    await db.setSetting('customRates', customRates);
    App.toast('รีเซ็ตอัตราแล้ว', 'info');
    this.switchSection('rates');
  },

  async saveCosts() {
    await db.setSetting('fuelPrice',    parseFloat(document.getElementById('s-fuel-price')?.value)    || 30);
    await db.setSetting('repairEngine', parseFloat(document.getElementById('s-repair-engine')?.value) || 50000);
    await db.setSetting('repairChassis',parseFloat(document.getElementById('s-repair-chassis')?.value)|| 30000);
    await db.setSetting('repairTrailer',parseFloat(document.getElementById('s-repair-trailer')?.value)|| 20000);
    await db.setSetting('truckPrice',   parseFloat(document.getElementById('s-truck-price')?.value)   || 3000000);
    await db.setSetting('truckLifeKm',  parseFloat(document.getElementById('s-truck-life')?.value)    || 1000000);
    App.toast('บันทึกค่าใช้จ่ายแล้ว ✅', 'success');
  },

  async saveTelemetry() {
    const url = document.getElementById('s-tele-url')?.value.trim();
    await db.setSetting('telemetryUrl', url);
    telemetry.disconnect();
    telemetry.connect(url);
    App.toast('กำลังเชื่อมต่อ...', 'info');
  },

  testConnection() {
    App.toast(telemetry.connected ? `✅ เชื่อมต่อแล้ว (${telemetry.game?.toUpperCase()})` : '❌ ยังไม่ได้เชื่อมต่อ', telemetry.connected ? 'success' : 'error');
  },

  onCurrencyChange() {
    const cur = document.getElementById('s-currency')?.value;
    const hint = document.getElementById('currency-hint');
    if (hint) hint.textContent = RATES[cur]?.label + ' — ' + (cur === 'THB' ? 'อิงมาตรฐานกรมขนส่งไทย' : cur === 'USD' ? 'อิงอุตสาหกรรมขนส่ง US' : 'อิงอุตสาหกรรมขนส่งยุโรป');
  },

  afterRender() {}
};
