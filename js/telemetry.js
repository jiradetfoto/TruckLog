/* ============================================================
   TruckLog Pro — Telemetry WebSocket Client (telemetry.js)
   ETS2 & ATS via ets2-telemetry-server
   ============================================================ */

class TelemetryClient {
  constructor() {
    this.ws         = null;
    this.connected  = false;
    this.data       = {};          // Latest telemetry snapshot
    this.gameType   = null;        // 'ets2' | 'ats' | null
    this.listeners  = {};
    this.reconnectTimer = null;
    this.reconnectDelay = 3000;
    this.url        = 'ws://localhost:25555/';
    this._jobActive = false;
    this._jobStartData = null;
    this._prevFuel  = null;
    this._prevOdo   = null;
  }

  /* ---- Event system ---- */
  on(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  off(event, fn) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(f => f !== fn);
  }
  emit(event, data) {
    (this.listeners[event] || []).forEach(fn => fn(data));
  }

  /* ---- Connection ---- */
  connect(url) {
    if (url) this.url = url;
    this._tryConnect();
  }

  _tryConnect() {
    try {
      this.ws = new WebSocket(this.url);
      this.ws.onopen    = () => this._onOpen();
      this.ws.onmessage = (e) => this._onMessage(e);
      this.ws.onclose   = () => this._onClose();
      this.ws.onerror   = () => {};
    } catch(err) {
      this._scheduleReconnect();
    }
  }

  _onOpen() {
    this.connected = true;
    clearTimeout(this.reconnectTimer);
    this.emit('connected');
    console.log('[Telemetry] Connected to', this.url);
  }

  _onClose() {
    this.connected = false;
    this.emit('disconnected');
    this._scheduleReconnect();
  }

  _scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this._tryConnect(), this.reconnectDelay);
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    if (this.ws) { this.ws.close(); this.ws = null; }
  }

  /* ---- Message parsing ---- */
  _onMessage(e) {
    try {
      const msg = JSON.parse(e.data);
      this._processMessage(msg);
    } catch(_) {}
  }

  _processMessage(msg) {
    // ets2-telemetry-server sends either a full state object or event packets
    if (msg.type === 'event') {
      this._handleEvent(msg.event, msg.data);
      return;
    }
    // Full telemetry state
    this.data = msg;
    this.gameType = msg.game?.id || null;   // 'ets2' | 'ats'
    this.emit('update', msg);
    this._checkJobState(msg);
    this._updateLiveUI(msg);
  }

  _handleEvent(eventName, data) {
    switch (eventName) {
      case 'job_started':
        this._jobActive = true;
        this._jobStartData = { 
          ...data, 
          realTime: new Date().toISOString(), 
          fuelAtStart: this.data?.truck?.fuel?.value || 0, 
          odoAtStart: this.data?.truck?.odometer || 0,
          truckBrand: this.data?.truck?.make || this.data?.truck?.brand,
          truckModel: this.data?.truck?.model,
          isQuickJob: this.data?.job?.isQuickJob || false
        };
        this.emit('jobStarted', this._jobStartData);
        break;

      case 'job_finished':
        if (this._jobActive) {
          const fuelUsed = (this._jobStartData?.fuelAtStart || 0) - (this.data?.truck?.fuel?.value || 0);
          const distance = (this.data?.truck?.odometer || 0) - (this._jobStartData?.odoAtStart || 0);
          this.emit('jobFinished', {
            ...data,
            realTimeEnd: new Date().toISOString(),
            startData: this._jobStartData,
            fuelUsed: Math.max(0, fuelUsed),
            distanceKm: Math.max(0, distance),
            wearEngine:  this.data?.truck?.wearEngine  || 0,
            wearChassis: this.data?.truck?.wearChassis || 0,
            wearTrailer: this.data?.truck?.wearTrailer || 0,
            game: this.gameType,
          });
          this._jobActive = false;
          this._jobStartData = null;
        }
        break;

      case 'job_cancelled':
        this._jobActive = false;
        this._jobStartData = null;
        this.emit('jobCancelled', data);
        break;

      case 'tollgate':
        this.emit('toll', { amount: data.payAmount || 0, currency: data.currency || '', time: new Date().toISOString(), game: this.gameType });
        break;

      case 'fine':
        this.emit('fine', {
          fineType: data.fineOffence || 'unknown',
          amount:   data.fineAmount || 0,
          time:     new Date().toISOString(),
          game:     this.gameType,
        });
        break;

      case 'refueled':
        this.emit('refueled', { liters: data.amount || 0, time: new Date().toISOString() });
        break;

      case 'ferry':
        this.emit('ferry', { source: data.sourceCity, target: data.targetCity, amount: data.payAmount || 0, time: new Date().toISOString() });
        break;

      case 'train':
        this.emit('train', { source: data.sourceCity, target: data.targetCity, amount: data.payAmount || 0, time: new Date().toISOString() });
        break;
    }
  }

  /* Job state detection for servers that only send state (not events) */
  _checkJobState(msg) {
    const jobActive = !!(msg.job?.onJob);
    if (jobActive && !this._jobActive) {
      this._jobActive = true;
      this._jobStartData = {
        source: msg.job?.sourceCity,
        destination: msg.job?.destinationCity,
        cargo: msg.job?.cargo?.name,
        mass: msg.job?.cargo?.mass || 0,
        plannedDistance: msg.job?.plannedDistance || 0,
        realTime: new Date().toISOString(),
        fuelAtStart: msg.truck?.fuel?.value || 0,
        odoAtStart: msg.truck?.odometer || 0,
        gameIncome: msg.job?.income || 0,
        truckBrand: msg.truck?.make || msg.truck?.brand,
        truckModel: msg.truck?.model,
        isQuickJob: msg.job?.isQuickJob || false
      };
      this.emit('jobStarted', this._jobStartData);
    } else if (!jobActive && this._jobActive) {
      const fuelUsed = (this._jobStartData?.fuelAtStart || 0) - (msg.truck?.fuel?.value || 0);
      const distance = (msg.truck?.odometer || 0) - (this._jobStartData?.odoAtStart || 0);
      this.emit('jobFinished', {
        realTimeEnd: new Date().toISOString(),
        startData: this._jobStartData,
        fuelUsed: Math.max(0, fuelUsed),
        distanceKm: Math.max(0, distance),
        wearEngine:  msg.truck?.wearEngine  || 0,
        wearChassis: msg.truck?.wearChassis || 0,
        wearTrailer: msg.truck?.wearTrailer || 0,
        game: this.gameType,
        income: msg.job?.income,
      });
      this._jobActive = false;
      this._jobStartData = null;
    }
  }

  /* ---- Live UI updates ---- */
  _updateLiveUI(msg) {
    const truck = msg.truck || {};
    const game  = msg.game  || {};

    // Speed
    const speedEl = document.getElementById('ticker-speed');
    if (speedEl) {
      const speed = Math.round(Math.abs(truck.speed || 0));
      speedEl.textContent = `${speed} km/h`;
    }

    // Fuel
    const fuelEl = document.getElementById('ticker-fuel');
    if (fuelEl) {
      const pct = truck.fuel?.capacity
        ? Math.round((truck.fuel.value / truck.fuel.capacity) * 100)
        : 0;
      fuelEl.textContent = `${pct}%`;
      fuelEl.style.color = pct < 20 ? 'var(--red)' : pct < 40 ? 'var(--yellow)' : '';
    }

    // In-game time
    const timeEl = document.getElementById('ticker-game-time');
    if (timeEl && game.time) {
      const total = game.time;  // minutes since midnight
      const h = Math.floor(total / 60) % 24;
      const m = total % 60;
      timeEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    }

    // Status badge
    const dot  = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    const gtype = this.gameType;
    if (dot && text) {
      dot.className = 'status-dot ' + (gtype || 'connected');
      text.textContent = gtype === 'ets2' ? '🇪🇺 ETS2 เชื่อมต่อแล้ว'
                       : gtype === 'ats'  ? '🇺🇸 ATS เชื่อมต่อแล้ว'
                       : 'เชื่อมต่อแล้ว';
    }
  }

  /* ---- Getters ---- */
  get truck()    { return this.data?.truck  || {}; }
  get job()      { return this.data?.job    || {}; }
  get isOnJob()  { return this._jobActive; }
  get game()     { return this.gameType; }

  getSpeed()   { return Math.abs(this.truck?.speed  || 0); }
  getFuelPct() {
    const t = this.truck?.fuel;
    if (!t || !t.capacity) return 0;
    return Math.round((t.value / t.capacity) * 100);
  }
  getWear(part) { return Math.round((this.truck?.[`wear${part}`] || 0) * 100); }
}

// Singleton
const telemetry = new TelemetryClient();
