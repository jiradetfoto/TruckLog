/* ============================================================
   TruckLog Pro — Financial Calculator (calculator.js)
   ============================================================ */

class Calculator {
  constructor() {}

  /**
   * Calculate real-world income for a trip
   * @param {object} p
   *   distanceKm, cargoType, currency, mode ('forHire'|'ownerOp'),
   *   customRate (optional override ฿/$/€ per unit), mass (tonnes, optional)
   */
  calcIncome({ distanceKm, cargoType, currency, mode, customRate, mass }) {
    const rateInfo = RATES[currency];
    if (!rateInfo) return 0;

    // Convert km → distance unit (miles for USD)
    const distInUnit = distanceKm / rateInfo.kmPerUnit;

    // Get rate (custom or table mid)
    let rate = customRate != null
      ? parseFloat(customRate)
      : getMidRate(currency, cargoType || 'general', mode);

    // For THB/EUR: multiply by mass (tonnes) only if >0 and user has mass-based pricing enabled
    // For USD: rate is per-mile flat (industry standard, not per-tonne)
    let income = rate * distInUnit;

    // Apply mass factor for THB only (กรมขนส่งไทยคิดตามน้ำหนัก)
    if (currency === 'THB' && mass && mass > 0) {
      income = rate * distInUnit * Math.min(mass, 25); // cap at 25 tonnes
    }

    return Math.round(income * 100) / 100;
  }

  /**
   * Calculate fuel cost
   * @param {number} litresUsed
   * @param {object} settings { fuelPrice, currency }
   */
  calcFuelCost(litresUsed, settings) {
    const rateInfo = RATES[settings.currency];
    if (!rateInfo) return 0;
    const pricePerLitre = rateInfo.fuelUnit === 'gallon'
      ? (settings.fuelPrice / rateInfo.litrePerUnit)
      : settings.fuelPrice;
    return Math.round(litresUsed * pricePerLitre * 100) / 100;
  }

  /**
   * Calculate rental fee for a trip
   */
  calcRentalFee(distanceKm, durationMin, settings) {
    const rate = RENTAL_RATES[settings.currency] || RENTAL_RATES.THB;
    const days = Math.max(1, Math.ceil((durationMin || 0) / (24 * 60)));
    return (days * rate.daily) + (distanceKm * rate.perKm);
  }

  /**
   * Calculate wear cost for a trip
   * wearDelta = wear% change during trip (0–100)
   * repairCostFull = cost to repair from 100% damage
   */
  calcWearCost({ wearDeltaEngine, wearDeltaChassis, wearDeltaTrailer, settings }) {
    const e = (wearDeltaEngine  || 0) / 100 * (settings.repairEngine  || 0);
    const c = (wearDeltaChassis || 0) / 100 * (settings.repairChassis || 0);
    const t = (wearDeltaTrailer || 0) / 100 * (settings.repairTrailer || 0);
    return Math.round((e + c + t) * 100) / 100;
  }

  /**
   * Calculate depreciation for a trip
   */
  calcDepreciation({ distanceKm, truckPrice, truckLifeKm }) {
    if (!truckLifeKm || truckLifeKm <= 0) return 0;
    const perKm = truckPrice / truckLifeKm;
    return Math.round(perKm * distanceKm * 100) / 100;
  }

  /**
   * Calculate full trip P&L
   */
  calcTripPnL(trip, settings) {
    const currency = settings.currency || 'THB';
    const mode     = settings.mode     || 'ownerOp';

    // Determine if it's Owner, Rental, or For-Hire
    let modeToUse = settings.mode;
    let isRental = false;

    // Ownership check: If trip has truck info, verify against owned fleet
    if (trip.truckBrand && trip.truckModel) {
      const isOwned = (settings.ownedTrucks || []).some(t => 
        t.brand.toLowerCase() === trip.truckBrand.toLowerCase() && 
        t.model.toLowerCase() === trip.truckModel.toLowerCase()
      );
      
      if (!isOwned && !trip.isQuickJob) {
        modeToUse = 'ownerOp'; // We treat it as owner operation but with rental costs
        isRental = true;
      }
    }

    // Income
    const income = this.calcIncome({
      distanceKm: trip.distanceKm,
      cargoType:  trip.cargoType || 'general',
      currency,
      mode:       modeToUse,
      customRate: trip.customRate,
      mass:       trip.massT,
    });

    // Fuel
    const fuelCost = this.calcFuelCost(trip.fuelUsed || 0, settings);

    // Wear & Depreciation (only if not a Quick Job)
    let wearCost = 0;
    let depreciation = 0;
    let rentalFee = 0;

    if (!trip.isQuickJob) {
      if (isRental) {
        rentalFee = this.calcRentalFee(trip.distanceKm, trip.durationMin, settings);
      } else {
        // Actual owner costs
        wearCost = this.calcWearCost({
            wearDeltaEngine:  trip.wearDeltaEngine  || 0,
            wearDeltaChassis: trip.wearDeltaChassis || 0,
            wearDeltaTrailer: trip.wearDeltaTrailer || 0,
            settings,
          });
        depreciation = (settings.truckPrice && settings.truckLifeKm)
          ? this.calcDepreciation({ distanceKm: trip.distanceKm, truckPrice: settings.truckPrice, truckLifeKm: settings.truckLifeKm })
          : 0;
      }
    }

    // Tolls & fines stored per-trip (sum)
    const tolls  = trip.tollTotal  || 0;
    const fines  = trip.fineTotal  || 0;
    const ferry  = trip.ferryTotal || 0;

    // AI driver wage (if driver assigned)
    const driverWagePct = trip.driverWagePct || 0;
    const driverWage    = Math.round(income * (driverWagePct / 100) * 100) / 100;

    const totalExpenses = fuelCost + wearCost + depreciation + tolls + fines + ferry + driverWage + rentalFee;
    const profit        = Math.round((income - totalExpenses) * 100) / 100;

    return { income, fuelCost, wearCost, depreciation, tolls, fines, ferry, driverWage, rentalFee, totalExpenses, profit, isRental };
  }

  /**
   * Format currency
   */
  static fmt(amount, currency, compact = false) {
    const sym = RATES[currency]?.symbol || '';
    const abs = Math.abs(amount);
    let str;
    if (compact && abs >= 1000000) {
      str = (abs / 1000000).toFixed(1) + 'M';
    } else if (compact && abs >= 1000) {
      str = (abs / 1000).toFixed(1) + 'K';
    } else {
      str = abs.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return (amount < 0 ? '-' : '') + sym + str;
  }

  static fmtShort(amount, currency) {
    return Calculator.fmt(amount, currency, true);
  }

  /**
   * Summary stats from trip array
   */
  static summarize(trips, settings) {
    const calc = new Calculator();
    let totalIncome = 0, totalExpenses = 0, totalDistance = 0, totalFuel = 0, totalFines = 0;
    for (const t of trips) {
      const pnl = calc.calcTripPnL(t, settings);
      totalIncome    += pnl.income;
      totalExpenses  += pnl.totalExpenses;
      totalDistance  += t.distanceKm || 0;
      totalFuel      += t.fuelUsed   || 0;
      totalFines     += t.fineTotal  || 0;
    }
    return {
      totalIncome:   Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalProfit:   Math.round((totalIncome - totalExpenses) * 100) / 100,
      totalDistance: Math.round(totalDistance),
      totalFuel:     Math.round(totalFuel * 10) / 10,
      totalFines:    Math.round(totalFines * 100) / 100,
      avgProfitPerKm: totalDistance > 0
        ? Math.round((totalIncome - totalExpenses) / totalDistance * 100) / 100
        : 0,
    };
  }
}

const calculator = new Calculator();
