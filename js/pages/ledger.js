/* Ledger Page */
const LedgerPage = {
  async render() {
    const settings = await App.getSettings();
    const currency = settings.currency || 'THB';
    const trips    = await db.getAllTrips();
    const fines    = await db.getAllFines();
    const fmt      = v => Calculator.fmt(v, currency);

    // Build combined ledger entries from trips + fines
    let entries = [];
    for (const t of trips) {
      const pnl = calculator.calcTripPnL(t, settings);
      entries.push({ date: t.date, type: 'trip', desc: `${t.source||'?'} → ${t.destination||'?'}`, income: pnl.income, expense: 0, sub: [
        { desc: '↳ ค่าเชื้อเพลิง', amount: -pnl.fuelCost },
        pnl.wearCost > 0   && { desc: '↳ ค่าสึกหรอ',      amount: -pnl.wearCost },
        pnl.depreciation>0 && { desc: '↳ ค่าเสื่อมราคา',  amount: -pnl.depreciation },
        pnl.tolls > 0      && { desc: '↳ Toll',            amount: -pnl.tolls },
        pnl.fines > 0      && { desc: '↳ ค่าปรับ',         amount: -pnl.fines },
        pnl.ferry > 0      && { desc: '↳ Ferry/Train',     amount: -pnl.ferry },
        pnl.driverWage > 0 && { desc: '↳ ค่าแรงคนขับ',    amount: -pnl.driverWage },
      ].filter(Boolean) });
    }
    for (const f of fines) {
      if (f.fineType === 'toll') entries.push({ date: f.date, type: 'toll', desc: `Toll — ${f.route||''}`, income: 0, expense: f.amount || 0 });
      else entries.push({ date: f.date, type: 'fine', desc: `ค่าปรับ: ${FINE_LABELS[f.fineType]?.label||f.fineType}`, income: 0, expense: f.amount || 0 });
    }

    entries.sort((a,b) => new Date(b.date) - new Date(a.date));

    let balance = 0, totalIn = 0, totalOut = 0;
    const allProfits = entries.map(e => {
      const net = e.income - e.expense - (e.sub||[]).reduce((a,s)=>a+Math.abs(s.amount),0);
      return net;
    });
    allProfits.forEach(p => { if(p>0) totalIn+=p; else totalOut+=Math.abs(p); });
    balance = allProfits.reduce((a,b)=>a+b, 0);

    return `
    <div class="page-fade">
      <div class="ledger-balance-header">
        <div>
          <div class="ledger-balance-label">ยอดคงเหลือสุทธิ</div>
          <div class="ledger-balance-value ${balance < 0 ? 'negative' : ''}">${fmt(balance)}</div>
        </div>
        <div class="ledger-summary">
          <div class="ledger-summary-item">
            <div class="ledger-summary-label">รายรับรวม</div>
            <div class="ledger-summary-value ledger-income-total">${fmt(totalIn)}</div>
          </div>
          <div class="ledger-summary-item">
            <div class="ledger-summary-label">รายจ่ายรวม</div>
            <div class="ledger-summary-value ledger-expense-total">${fmt(totalOut)}</div>
          </div>
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>วันที่</th><th>รายการ</th><th class="td-right">รายรับ</th>
            <th class="td-right">รายจ่าย</th><th class="td-right">คงเหลือ</th>
          </tr></thead>
          <tbody>
          ${entries.length === 0 ? `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">📒</div><div class="empty-title">ยังไม่มีรายการ</div></div></td></tr>` :
            entries.map(e => {
              const sub = e.sub || [];
              const expenses = sub.reduce((a,s)=>a+Math.abs(s.amount),0) + e.expense;
              const net = e.income - expenses;
              balance = net; // running (simplified)
              const typeClass = { trip:'ledger-row-income', fine:'ledger-row-fine', toll:'ledger-row-toll' }[e.type] || '';
              const dateStr = e.date ? new Date(e.date).toLocaleDateString('th-TH',{day:'2-digit',month:'short',year:'2-digit'}) : '—';
              return `
              <tr class="${typeClass}">
                <td class="td-muted">${dateStr}</td>
                <td><strong>${e.desc}</strong></td>
                <td class="td-right" style="color:var(--green);font-family:var(--font-en);font-weight:600">${e.income > 0 ? fmt(e.income) : ''}</td>
                <td class="td-right" style="color:var(--red);font-family:var(--font-en)">${expenses > 0 ? fmt(expenses) : ''}</td>
                <td class="td-right" style="color:${net>=0?'var(--green)':'var(--red)'};font-family:var(--font-en);font-weight:700">${fmt(net)}</td>
              </tr>
              ${sub.map(s => `
              <tr class="ledger-row-sub">
                <td></td>
                <td class="td-muted">${s.desc}</td>
                <td></td>
                <td class="td-right" style="color:var(--red);font-family:var(--font-en);font-size:0.8rem">${fmt(Math.abs(s.amount))}</td>
                <td></td>
              </tr>`).join('')}`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  },
  afterRender() {}
};

/* Fines & Toll Page */
const FinesPage = {
  async render() {
    const settings = await App.getSettings();
    const currency = settings.currency || 'THB';
    const fines    = await db.getAllFines();
    const fmt      = v => Calculator.fmt(v, currency);
    const sorted   = [...fines].reverse();

    const totalFines = fines.filter(f => f.fineType !== 'toll' && f.fineType !== 'ferry' && f.fineType !== 'train').reduce((a,f)=>a+(f.amount||0),0);
    const totalTolls = fines.filter(f => f.fineType === 'toll').reduce((a,f)=>a+(f.amount||0),0);
    const totalFerry = fines.filter(f => f.fineType === 'ferry' || f.fineType === 'train').reduce((a,f)=>a+(f.amount||0),0);

    return `
    <div class="page-fade">
      <div class="section-title" style="margin-bottom:var(--space-md)">ค่าปรับ, Toll และค่าขนส่งพิเศษ</div>
      <div class="fines-summary-grid">
        ${[
          ['⚠️ ค่าปรับรวม', totalFines, 'red'],
          ['🛣️ Toll รวม', totalTolls, 'orange'],
          ['⛴️ Ferry/Train รวม', totalFerry, 'cyan'],
          ['📊 ค่าใช้จ่ายพิเศษทั้งหมด', totalFines+totalTolls+totalFerry, 'yellow'],
        ].map(([label,val,color]) => `
          <div class="kpi-card ${color}">
            <div class="kpi-label">${label}</div>
            <div class="kpi-value">${fmt(val)}</div>
          </div>`).join('')}
      </div>

      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>วันที่</th><th>ประเภท</th><th>รายละเอียด</th>
            <th>เกม</th><th class="td-right">จำนวนเงิน</th>
          </tr></thead>
          <tbody>
          ${sorted.length === 0 ? `<tr><td colspan="5"><div class="empty-state">
            <div class="empty-icon">✅</div>
            <div class="empty-title">ไม่มีค่าปรับหรือ Toll</div>
            <div class="empty-desc">ขับดีมากไม่ถูกปรับเลย 👏</div>
          </div></td></tr>` : sorted.map(f => {
            const info = FINE_LABELS[f.fineType] || FINE_LABELS['unknown'];
            const dateStr = f.date ? new Date(f.date).toLocaleString('th-TH',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';
            const isFine  = f.fineType !== 'toll' && f.fineType !== 'ferry' && f.fineType !== 'train';
            return `<tr>
              <td class="td-muted">${dateStr}</td>
              <td><span class="fine-type-badge">${info.icon} ${info.label}</span></td>
              <td class="td-muted">${f.route||f.note||'—'}</td>
              <td><span class="badge ${f.game==='ets2'?'badge-ets2':'badge-ats'}">${(f.game||'').toUpperCase()}</span></td>
              <td class="td-right" style="color:${isFine?'var(--red)':'var(--orange)'};font-family:var(--font-en);font-weight:600">${fmt(f.amount||0)}</td>
            </tr>`;
          }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  },
  afterRender() {}
};

/* Analytics Page */
const AnalyticsPage = {
  async render() {
    const settings = await App.getSettings();
    const trips    = await db.getAllTrips();
    const currency = settings.currency || 'THB';

    // Route profitability
    const routeMap = {};
    for (const t of trips) {
      const key = `${t.source||'?'} → ${t.destination||'?'}`;
      const pnl = calculator.calcTripPnL(t, settings);
      if (!routeMap[key]) routeMap[key] = { trips: 0, profit: 0, dist: 0 };
      routeMap[key].trips++;
      routeMap[key].profit += pnl.profit;
      routeMap[key].dist   += t.distanceKm || 0;
    }
    const topRoutes = Object.entries(routeMap).sort((a,b) => b[1].profit - a[1].profit).slice(0, 8);
    const maxProfit = topRoutes[0]?.[1]?.profit || 1;

    return `
    <div class="page-fade">
      <div class="section-title" style="margin-bottom:var(--space-md)">วิเคราะห์ข้อมูล</div>
      <div class="analytics-grid">
        <!-- Monthly P&L -->
        <div class="chart-card full-width">
          <div class="chart-title">📈 กำไร/ขาดทุนรายเดือน</div>
          <div style="height:220px"><canvas id="chart-monthly"></canvas></div>
        </div>

        <!-- Top Routes -->
        <div class="chart-card">
          <div class="chart-title">🏆 เส้นทางที่ทำกำไรสูงสุด</div>
          <div class="route-rank-list">
          ${topRoutes.length === 0 ? '<div class="empty-state"><div class="empty-icon">🗺️</div><div class="empty-title">ยังไม่มีข้อมูล</div></div>' :
            topRoutes.map(([route, data], i) => `
            <div class="route-rank-item">
              <div class="route-rank-num ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${i+1}</div>
              <div style="flex:1;min-width:0">
                <div class="route-rank-name" style="font-size:0.82rem;font-weight:500">${route}</div>
                <div class="route-rank-bar" style="margin-top:4px">
                  <div class="progress-bar" style="height:4px">
                    <div class="progress-fill green" style="width:${Math.round(data.profit/maxProfit*100)}%"></div>
                  </div>
                </div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div class="route-rank-profit">${Calculator.fmtShort(data.profit, currency)}</div>
                <div style="font-size:0.7rem;color:var(--text-muted)">${data.trips} เที่ยว</div>
              </div>
            </div>`).join('')}
          </div>
        </div>

        <!-- Fuel efficiency -->
        <div class="chart-card">
          <div class="chart-title">⛽ ประสิทธิภาพน้ำมัน (L/100km)</div>
          <div style="height:200px"><canvas id="chart-fuel-eff"></canvas></div>
        </div>

        <!-- Cargo breakdown -->
        <div class="chart-card">
          <div class="chart-title">📦 รายได้ตามประเภทสินค้า</div>
          <div style="height:200px"><canvas id="chart-cargo-income"></canvas></div>
        </div>
      </div>
    </div>`;
  },

  async afterRender() {
    const settings = await App.getSettings();
    const trips    = await db.getAllTrips();
    const currency = settings.currency || 'THB';

    // Monthly P&L
    const months = {}; const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      months[key] = { income: 0, expense: 0 };
    }
    for (const t of trips) {
      const key = t.date?.slice(0, 7);
      if (months[key]) {
        const pnl = calculator.calcTripPnL(t, settings);
        months[key].income  += pnl.income;
        months[key].expense += pnl.totalExpenses;
      }
    }
    const mlabels = Object.keys(months).map(k => { const [y,m] = k.split('-'); return `${m}/${y.slice(2)}`; });
    const mincome  = Object.values(months).map(m => Math.round(m.income));
    const mexpense = Object.values(months).map(m => Math.round(m.expense));

    const mc = document.getElementById('chart-monthly');
    if (mc && window.Chart) new Chart(mc, {
      type: 'bar',
      data: { labels: mlabels, datasets: [
        { label: 'รายได้', data: mincome,  backgroundColor: 'rgba(34,197,94,0.5)',  borderColor: '#22c55e', borderWidth: 1, borderRadius: 4 },
        { label: 'ค่าใช้จ่าย', data: mexpense, backgroundColor: 'rgba(239,68,68,0.5)', borderColor: '#ef4444', borderWidth: 1, borderRadius: 4 },
      ]},
      options: { responsive:true, maintainAspectRatio:false,
        plugins: { legend: { labels: { color:'#8a95a8' } } },
        scales: {
          x: { ticks:{ color:'#525e72' }, grid:{ display:false } },
          y: { ticks:{ color:'#525e72', callback: v=>Calculator.fmtShort(v,currency) }, grid:{ color:'rgba(255,255,255,0.04)' } }
        }
      }
    });

    // Fuel efficiency per trip (last 20)
    const recentFuel = [...trips].reverse().slice(0,20).reverse();
    const fuelLabels = recentFuel.map(t => `${t.source?.slice(0,5)||'?'}-${t.destination?.slice(0,5)||'?'}`);
    const fuelData   = recentFuel.map(t => t.distanceKm && t.fuelUsed ? Math.round(t.fuelUsed/t.distanceKm*100*10)/10 : 0);
    const fc = document.getElementById('chart-fuel-eff');
    if (fc && window.Chart) new Chart(fc, {
      type: 'line',
      data: { labels: fuelLabels, datasets: [{ label: 'L/100km', data: fuelData, borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.1)', tension: 0.3, fill: true, pointRadius: 3 }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} },
        scales: { x:{ticks:{color:'#525e72',font:{size:9}},grid:{display:false}}, y:{ticks:{color:'#525e72'},grid:{color:'rgba(255,255,255,0.04)'}} } }
    });

    // Cargo income
    const cargoIncome = {};
    for (const t of trips) {
      const pnl = calculator.calcTripPnL(t, settings);
      const k   = t.cargoLabel || t.cargoType || 'other';
      cargoIncome[k] = (cargoIncome[k] || 0) + pnl.income;
    }
    const cic = document.getElementById('chart-cargo-income');
    if (cic && window.Chart) new Chart(cic, {
      type: 'doughnut',
      data: { labels: Object.keys(cargoIncome), datasets: [{ data: Object.values(cargoIncome).map(v=>Math.round(v)), backgroundColor: ['#3b82f6','#22c55e','#f59e0b','#ef4444','#a855f7','#06b6d4','#f97316','#84cc16'], borderWidth: 0 }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'right', labels:{ color:'#8a95a8', font:{size:10}, boxWidth:10 } } } }
    });
  }
};
