/* ============================================================
   TruckLog Pro — Demo Data Seeder
   Seeds realistic demo trips on first launch so the app
   doesn't look empty. Runs only once (checks a flag in DB).
   ============================================================ */

const DemoSeeder = {
  async seed() {
    const done = await db.getSetting('demoSeeded');
    if (done) return;

    const settings = await App.getSettings();
    const currency = settings.currency || 'THB';

    // Demo trips — mix of ETS2 and ATS scenarios
    const demoTrips = [
      { game:'ets2', source:'Rotterdam', destination:'Frankfurt', cargoType:'general', cargoLabel:'สินค้าทั่วไป (FTL)', massT:22, distanceKm:430, fuelUsed:72, tollTotal:8.5, fineTotal:0, ferryTotal:0, wearDeltaEngine:1, wearDeltaChassis:1, wearDeltaTrailer:0, daysAgo:1 },
      { game:'ets2', source:'Paris',     destination:'Lyon',      cargoType:'reefer',  cargoLabel:'สินค้าแช่เย็น (Reefer)', massT:18, distanceKm:470, fuelUsed:80, tollTotal:12.0, fineTotal:0,   ferryTotal:0, wearDeltaEngine:1, wearDeltaChassis:1, wearDeltaTrailer:1, daysAgo:2 },
      { game:'ets2', source:'Hamburg',   destination:'Warsaw',    cargoType:'hazmat',  cargoLabel:'วัตถุอันตราย (ADR)',      massT:14, distanceKm:680, fuelUsed:110, tollTotal:5.0, fineTotal:150, ferryTotal:0, wearDeltaEngine:2, wearDeltaChassis:2, wearDeltaTrailer:0, daysAgo:3 },
      { game:'ets2', source:'Milan',     destination:'Vienna',    cargoType:'flatbed', cargoLabel:'Flatbed / Oversize',       massT:20, distanceKm:580, fuelUsed:95, tollTotal:18.0, fineTotal:0,   ferryTotal:0, wearDeltaEngine:1, wearDeltaChassis:2, wearDeltaTrailer:1, daysAgo:4 },
      { game:'ets2', source:'Calais',    destination:'Dover',     cargoType:'container',cargoLabel:'ตู้คอนเทนเนอร์',         massT:24, distanceKm:95,  fuelUsed:18, tollTotal:2.0,  fineTotal:0,   ferryTotal:35,wearDeltaEngine:0, wearDeltaChassis:0, wearDeltaTrailer:0, daysAgo:5 },
      { game:'ats',  source:'Los Angeles', destination:'Phoenix', cargoType:'general', cargoLabel:'สินค้าทั่วไป (FTL)',      massT:20, distanceKm:595, fuelUsed:95, tollTotal:0,    fineTotal:0,   ferryTotal:0, wearDeltaEngine:1, wearDeltaChassis:1, wearDeltaTrailer:0, daysAgo:6 },
      { game:'ats',  source:'Dallas',    destination:'Houston',   cargoType:'bulk',    cargoLabel:'Bulk / Tanker',            massT:25, distanceKm:390, fuelUsed:62, tollTotal:3.5,  fineTotal:250, ferryTotal:0, wearDeltaEngine:1, wearDeltaChassis:1, wearDeltaTrailer:1, daysAgo:7 },
      { game:'ats',  source:'Seattle',   destination:'Portland',  cargoType:'reefer',  cargoLabel:'สินค้าแช่เย็น (Reefer)', massT:16, distanceKm:280, fuelUsed:45, tollTotal:2.0,  fineTotal:0,   ferryTotal:0, wearDeltaEngine:0, wearDeltaChassis:1, wearDeltaTrailer:0, daysAgo:8 },
      { game:'ets2', source:'Munich',    destination:'Prague',    cargoType:'machinery',cargoLabel:'เครื่องจักรหนัก',        massT:18, distanceKm:400, fuelUsed:68, tollTotal:6.0,  fineTotal:0,   ferryTotal:0, wearDeltaEngine:1, wearDeltaChassis:2, wearDeltaTrailer:2, daysAgo:10 },
      { game:'ets2', source:'Madrid',    destination:'Barcelona', cargoType:'livestock',cargoLabel:'ปศุสัตว์',               massT:15, distanceKm:620, fuelUsed:102, tollTotal:14.0, fineTotal:0,   ferryTotal:0, wearDeltaEngine:2, wearDeltaChassis:1, wearDeltaTrailer:1, daysAgo:12 },
    ];

    for (const t of demoTrips) {
      const d = new Date();
      d.setDate(d.getDate() - t.daysAgo);
      d.setHours(8 + Math.floor(Math.random()*10), Math.floor(Math.random()*60));
      const trip = {
        game:        t.game,
        source:      t.source,
        destination: t.destination,
        cargoType:   t.cargoType,
        cargoLabel:  t.cargoLabel,
        massT:       t.massT,
        distanceKm:  t.distanceKm,
        fuelUsed:    t.fuelUsed,
        tollTotal:   t.tollTotal,
        fineTotal:   t.fineTotal,
        ferryTotal:  t.ferryTotal,
        wearDeltaEngine:  t.wearDeltaEngine,
        wearDeltaChassis: t.wearDeltaChassis,
        wearDeltaTrailer: t.wearDeltaTrailer,
        date:         d.toISOString(),
        demo:         true,
      };
      const id = await db.addTrip(trip);
      trip.id = id;

      // Ledger entry
      const pnl = calculator.calcTripPnL(trip, { ...settings, currency });
      await db.addLedgerEntry({ type:'trip', tripId:id, desc:`งาน: ${t.source} → ${t.destination}`, income:pnl.income, expense:pnl.totalExpenses, date:trip.date });

      // Fine entries
      if (t.fineTotal > 0) {
        await db.addFineEntry({ fineType:'speeding_camera', amount:t.fineTotal, game:t.game, date:trip.date });
      }
      if (t.tollTotal > 0) {
        await db.addFineEntry({ fineType:'toll', amount:t.tollTotal, game:t.game, date:trip.date });
      }
      if (t.ferryTotal > 0) {
        await db.addFineEntry({ fineType:'ferry', amount:t.ferryTotal, game:t.game, date:trip.date, route:`${t.source} → ${t.destination}` });
      }
    }

    // Demo trucks
    await db.addTruck({ name:'รถคันที่ 1', model:'Scania R 730', price:3200000, lifeKm:1000000, addedAt:new Date().toISOString() });
    await db.addTruck({ name:'รถคันที่ 2', model:'Volvo FH16',   price:2800000, lifeKm:900000,  addedAt:new Date().toISOString() });

    // Demo AI driver
    await db.addDriver({ name:'Hans Mueller', isAI:true, wagePct:30, xp:4500, level:5, addedAt:new Date().toISOString() });
    await db.addDriver({ name:'Sofia Rossi',  isAI:true, wagePct:28, xp:2100, level:3, addedAt:new Date().toISOString() });

    await db.setSetting('demoSeeded', true);
    console.log('[DemoSeeder] Demo data seeded ✅');
  }
};
