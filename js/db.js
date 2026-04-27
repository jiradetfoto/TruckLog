/* ============================================================
   TruckLog Pro — JSON File Sync Layer (db.js)
   ============================================================ */

class Database {
  constructor() {
    this.data = {
      settings: {},
      trips: [],
      ledger: [],
      trucks: [],
      drivers: [],
      fines: [],
      fuelLog: [],
      loans: []
    };
    
    // Auto-detect API endpoint
    // If running on XAMPP (ends in .php or accessed via apache), use api.php
    // Otherwise use the Python server's /api/ path
    // Use Python server API if on port 3000, otherwise fallback to PHP (if available)
    this.apiUrl = window.location.port === '3000' ? '/api' : 'api.php';
  }

  async open() {
    console.log("Initializing Database via JSON Sync...");
    try {
      const response = await fetch(this.apiUrl + (this.apiUrl.includes('.php') ? '?action=load' : '/load'));
      if (response.ok) {
        const remoteData = await response.json();
        this.data = { ...this.data, ...remoteData };
        console.log("Data loaded from server successfully.");
      }
    } catch (e) {
      console.warn("Could not connect to backend server. Using local memory only.", e);
    }
    return this;
  }

  async sync() {
    try {
      const url = this.apiUrl + (this.apiUrl.includes('.php') ? '?action=save' : '/save');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.data)
      });
      if (!response.ok) throw new Error("Save failed");
      return true;
    } catch (e) {
      console.error("Failed to sync data to server:", e);
      return false;
    }
  }

  /* Generic CRUD helpers (In-memory + Sync) */
  
  async get(store, key) {
    if (store === 'settings') return { key, value: this.data.settings[key] };
    return this.data[store].find(item => item.id === key);
  }

  async getAll(store) {
    return this.data[store] || [];
  }

  async put(store, item) {
    if (store === 'settings') {
      this.data.settings[item.key] = item.value;
    } else {
      const index = this.data[store].findIndex(i => i.id === item.id);
      if (index !== -1) {
        this.data[store][index] = item;
      } else {
        if (!item.id) item.id = Date.now();
        this.data[store].push(item);
      }
    }
    return this.sync();
  }

  async add(store, item) {
    if (!item.id) item.id = Date.now();
    this.data[store].push(item);
    await this.sync();
    return item.id;
  }

  async delete(store, key) {
    if (store === 'settings') {
      delete this.data.settings[key];
    } else {
      this.data[store] = this.data[store].filter(item => item.id !== key);
    }
    return this.sync();
  }

  /* Settings shortcut */
  async getSetting(key, defaultVal = null) {
    return this.data.settings[key] !== undefined ? this.data.settings[key] : defaultVal;
  }
  async setSetting(key, value) {
    this.data.settings[key] = value;
    return this.sync();
  }

  /* ---- Domain helpers ---- */
  async addTrip(trip) {
    trip.id = Date.now();
    trip.date = trip.date || new Date().toISOString();
    this.data.trips.push(trip);
    await this.sync();
    return trip.id;
  }
  async getAllTrips() { return this.data.trips; }
  async getTrip(id) { return this.data.trips.find(t => t.id === id); }
  async updateTrip(trip) {
    const idx = this.data.trips.findIndex(t => t.id === trip.id);
    if (idx !== -1) this.data.trips[idx] = trip;
    return this.sync();
  }
  async deleteTrip(id) {
    this.data.trips = this.data.trips.filter(t => t.id !== id);
    return this.sync();
  }

  // Ledger
  async addLedgerEntry(entry) {
    entry.id = Date.now();
    entry.date = entry.date || new Date().toISOString();
    this.data.ledger.push(entry);
    await this.sync();
    return entry.id;
  }
  async getAllLedger() { return this.data.ledger; }

  // Trucks
  async getAllTrucks() { return this.data.trucks; }
  async addTruck(truck) {
    truck.id = Date.now();
    this.data.trucks.push(truck);
    await this.sync();
    return truck.id;
  }
  async updateTruck(truck) {
    const idx = this.data.trucks.findIndex(t => t.id === truck.id);
    if (idx !== -1) this.data.trucks[idx] = truck;
    return this.sync();
  }
  async deleteTruck(id) {
    this.data.trucks = this.data.trucks.filter(t => t.id !== id);
    return this.sync();
  }

  // Drivers
  async getAllDrivers() { return this.data.drivers; }
  async addDriver(driver) {
    driver.id = Date.now();
    this.data.drivers.push(driver);
    await this.sync();
    return driver.id;
  }
  async updateDriver(driver) {
    const idx = this.data.drivers.findIndex(d => d.id === driver.id);
    if (idx !== -1) this.data.drivers[idx] = driver;
    return this.sync();
  }
  async deleteDriver(id) {
    this.data.drivers = this.data.drivers.filter(d => d.id !== id);
    return this.sync();
  }

  // Fines & Tolls
  async addFineEntry(fine) {
    fine.id = Date.now();
    fine.date = fine.date || new Date().toISOString();
    this.data.fines.push(fine);
    await this.sync();
    return fine.id;
  }
  async getAllFines() { return this.data.fines; }

  // Fuel log
  async addFuelEntry(entry) {
    entry.id = Date.now();
    entry.date = entry.date || new Date().toISOString();
    this.data.fuelLog.push(entry);
    await this.sync();
    return entry.id;
  }
  async getAllFuelLog() { return this.data.fuelLog; }

  // Loans
  async getAllLoans() { return this.data.loans || []; }
  async addLoan(loan) {
    loan.id = Date.now();
    loan.status = loan.status || 'active';
    this.data.loans = this.data.loans || [];
    this.data.loans.push(loan);
    await this.sync();
    return loan.id;
  }
  async updateLoan(loan) {
    const idx = this.data.loans.findIndex(l => l.id === loan.id);
    if (idx !== -1) this.data.loans[idx] = loan;
    return this.sync();
  }
  async deleteLoan(id) {
    this.data.loans = this.data.loans.filter(l => l.id !== id);
    return this.sync();
  }
}

// Singleton
const db = new Database();

