/* ============================================================
   TruckLog Pro — Banking & Loans Page (bank.js)
   ============================================================ */

const BankPage = {
  async render() {
    const loans = await db.getAllLoans();
    const settings = await App.getSettings();
    const currency = settings.currency || 'THB';
    const fmt = v => Calculator.fmt(v, currency);

    const activeLoans = loans.filter(l => l.status === 'active');
    const totalDebt = activeLoans.reduce((a, l) => a + l.remainingAmount, 0);

    return `
    <div class="page-fade">
      <div class="section-header">
        <div>
          <div class="section-title">ธนาคาร & สินเชื่อ (Banking)</div>
          <div class="section-sub">บริหารจัดการเงินทุนและหนี้สินของบริษัท</div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card ${totalDebt > 0 ? 'red' : 'green'}">
          <div class="kpi-label">หนี้สินคงเหลือทั้งหมด</div>
          <div class="kpi-value">${fmt(totalDebt)}</div>
          <div class="kpi-sub">${activeLoans.length} สัญญาที่กำลังผ่อน</div>
        </div>
        <div class="kpi-card blue">
          <div class="kpi-label">เครดิตบูโร / สถานะ</div>
          <div class="kpi-value">A+</div>
          <div class="kpi-sub">ประวัติการชำระดีเยี่ยม</div>
        </div>
      </div>

      <div class="section-title" style="margin: var(--space-lg) 0 var(--space-md)">สินเชื่อที่ใช้งานอยู่</div>
      
      ${activeLoans.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">🏦</div>
          <div class="empty-title">ไม่มีหนี้สิน</div>
          <div class="empty-desc">บริษัทของคุณไม่มีภาระหนี้ผูกพันในขณะนี้</div>
        </div>
      ` : `
        <div class="driver-cards-grid">
          ${activeLoans.map(l => `
            <div class="driver-card" style="border-left: 4px solid var(--accent)">
              <div style="display:flex; justify-content:space-between; margin-bottom:var(--space-md)">
                <div>
                  <div class="driver-name">${l.truckName}</div>
                  <div class="driver-type">สัญญาเลขที่: #LN-${l.id.toString().slice(-6)}</div>
                </div>
                <div class="badge badge-ats">ACTIVE</div>
              </div>
              <div class="driver-stats">
                <div class="driver-stat">
                  <span class="driver-stat-label">ยอดกู้เริ่มต้น</span>
                  <span class="driver-stat-value">${fmt(l.principal)}</span>
                </div>
                <div class="driver-stat">
                  <span class="driver-stat-label">ยอดคงเหลือ</span>
                  <span class="driver-stat-value" style="color:var(--red)">${fmt(l.remainingAmount)}</span>
                </div>
                <div class="driver-stat">
                  <span class="driver-stat-label">ผ่อนต่องวด</span>
                  <span class="driver-stat-value" style="color:var(--orange)">${fmt(l.monthlyPayment)}</span>
                </div>
                <div class="driver-stat">
                  <span class="driver-stat-label">งวดที่เหลือ</span>
                  <span class="driver-stat-value">${l.remainingInstallments} / ${l.totalInstallments}</span>
                </div>
              </div>
              <div class="driver-xp">
                <div class="driver-xp-label">
                  <span>ความคืบหน้าการผ่อน</span>
                  <span>${Math.round(((l.totalInstallments - l.remainingInstallments) / l.totalInstallments) * 100)}%</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill green" style="width: ${((l.totalInstallments - l.remainingInstallments) / l.totalInstallments) * 100}%"></div>
                </div>
              </div>
              <div style="margin-top:var(--space-md); display:flex; gap:var(--space-sm)">
                <button class="btn btn-secondary btn-sm" style="flex:1" onclick="BankPage.payExtra(${l.id})">💰 โปะยอด</button>
                <button class="btn btn-ghost btn-sm" onclick="BankPage.viewDetails(${l.id})">📄 รายละเอียด</button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>`;
  },

  async openLoanModal(truckData, price) {
    const settings = await App.getSettings();
    const cur = settings.currency || 'THB';
    
    App.openModal('ขอสินเชื่อเช่าซื้อรถ (Apply for Loan)', `
      <div style="margin-bottom:var(--space-md)">
        <div style="font-size:0.85rem;color:var(--text-muted)">รถที่ต้องการซื้อ</div>
        <div style="font-size:1.1rem;font-weight:700">${truckData.brand} ${truckData.model}</div>
        <div style="font-size:1rem;color:var(--green)">ราคา: ${Calculator.fmt(price, cur)}</div>
      </div>
      
      <div class="form-group">
        <label class="form-label">เงินดาวน์ (Down Payment)</label>
        <input type="number" id="l-down" value="${Math.round(price * 0.2)}" oninput="BankPage.updateCalculation(${price})">
        <div class="form-hint">แนะนำอย่างน้อย 20% ของราคารถ</div>
      </div>

      <div class="form-group">
        <label class="form-label">ระยะเวลาผ่อนชำระ</label>
        <select id="l-term" onchange="BankPage.updateCalculation(${price})">
          <option value="12">12 งวด (1 ปี) - ดอกเบี้ย 3.50%</option>
          <option value="24">24 งวด (2 ปี) - ดอกเบี้ย 4.00%</option>
          <option value="36">36 งวด (3 ปี) - ดอกเบี้ย 4.50%</option>
          <option value="48">48 งวด (4 ปี) - ดอกเบี้ย 5.25%</option>
          <option value="60">60 งวด (5 ปี) - ดอกเบี้ย 6.00%</option>
        </select>
      </div>

      <div id="loan-summary" style="background:var(--bg-elevated);padding:var(--space-md);border-radius:var(--radius-md);margin-top:var(--space-md)">
        <!-- Calculated dynamically -->
      </div>
    `, [
      { label: 'ยกเลิก', cls: 'btn-secondary', action: () => App.closeModal() },
      { label: '✍️ เซ็นสัญญาเงินกู้', cls: 'btn-primary', action: () => BankPage.confirmLoan(truckData, price) },
    ]);
    
    this.updateCalculation(price);
  },

  updateCalculation(totalPrice) {
    const down = parseFloat(document.getElementById('l-down').value) || 0;
    const term = parseInt(document.getElementById('l-term').value);
    const settings = App._settingsCache;
    const cur = settings.currency || 'THB';

    const principal = totalPrice - down;
    const rates = { '12': 0.035, '24': 0.04, '36': 0.045, '48': 0.0525, '60': 0.06 };
    const annualRate = rates[term];
    
    // Simple Interest for Truck Loans (Standard practice)
    const totalInterest = principal * annualRate * (term / 12);
    const totalPayable = principal + totalInterest;
    const monthly = totalPayable / term;

    document.getElementById('loan-summary').innerHTML = `
      <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px">
        <span>ยอดจัดไฟแนนซ์:</span><span>${Calculator.fmt(principal, cur)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px">
        <span>ดอกเบี้ยทั้งหมด (${(annualRate*100).toFixed(2)}%):</span><span>${Calculator.fmt(totalInterest, cur)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:1rem; font-weight:700; border-top:1px solid var(--border-subtle); padding-top:8px; margin-top:8px">
        <span>ผ่อนต่องวด:</span><span style="color:var(--orange)">${Calculator.fmt(monthly, cur)}</span>
      </div>
    `;
    this._lastCalc = { principal, monthly, term, totalInterest };
  },

  async confirmLoan(truckData, price) {
    const calc = this._lastCalc;
    const down = parseFloat(document.getElementById('l-down').value) || 0;
    const settings = await App.getSettings();
    const cur = settings.currency || 'THB';

    // 1. Add Truck to Fleet
    const truckId = await db.addTruck({
      ...truckData,
      name: `${truckData.brand} ${truckData.model} (ผ่อนชำระ)`,
      buyPrice: price,
      isFinanced: true,
      addedAt: new Date().toISOString()
    });

    // 2. Add Loan Entry
    await db.addLoan({
      truckId,
      truckName: `${truckData.brand} ${truckData.model}`,
      principal: calc.principal,
      remainingAmount: calc.principal + calc.totalInterest,
      monthlyPayment: calc.monthly,
      totalInstallments: calc.term,
      remainingInstallments: calc.term,
      status: 'active',
      startDate: new Date().toISOString()
    });

    // 3. Record Down Payment in Ledger
    await db.addLedgerEntry({
      type: 'expense',
      desc: `เงินดาวน์รถ: ${truckData.brand} ${truckData.model}`,
      income: 0,
      expense: down,
      date: new Date().toISOString()
    });

    App.closeModal();
    App.toast('ทำสัญญาเงินกู้และซื้อรถสำเร็จ! ✍️🏦', 'success');
    App.navigate('bank');
  },

  payExtra(id) { App.toast('ฟีเจอร์โปะยอดจะมาในเวอร์ชั่นหน้าครับ', 'info'); },
  viewDetails(id) { App.toast('กำลังเปิดรายละเอียดสัญญา...', 'info'); },
  afterRender() {}
};
