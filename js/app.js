// Driver Support App – Main Application Logic (refactor cu fix-uri)
'use strict';

class DriverApp {
  constructor() {
    // State
    this.programStarted    = false;
    this.currentActivity   = null;
    this.programStartTime  = null;
    this.activityStartTime = null;
    this.voiceListening    = false;
    this.currentTab        = 'program';

    // Servicii/Componente
    this.dataManager     = new DataManager();
    this.timeTracker     = new TimeTracker();
    this.locationService = new LocationService();
    this.alertSystem     = new AlertSystem();

    // Handlere pentru timere
    this._uiTimer  = null;
    this._netTimer = null;

    this.initializeApp();
  }

  /* ========== BOOTSTRAP ========== */
  initializeApp() {
    console.log('🚛 Driver Support App initializing...');

    // 1) Init servicii + UI care nu depind de sesiune
    this.locationService?.initialize?.();
    this.alertSystem?.initialize?.();
    this.setupEventListeners();
    this.updateNetworkStatus();
    this.loadWeatherData();

    // 2) Abia apoi încarcă datele (poate declanșa restoreSession)
    this.loadSavedData();

    // 3) Tick-uri periodice (curățăm cele vechi)
    if (this._uiTimer)  clearInterval(this._uiTimer);
    if (this._netTimer) clearInterval(this._netTimer);
    this._uiTimer  = setInterval(() => this.updateUI(),           1000);
    this._netTimer = setInterval(() => this.updateNetworkStatus(), 30000);

    // 4) Expunem pentru debug pe mobil (opțional)
    window.app = this;

    console.log('✅ App initialized successfully');
  }

  loadSavedData() {
    const settings    = this.dataManager.getSettings()   || {};
    const driverData  = this.dataManager.getDriverData() || {};
    const sessionData = this.dataManager.getSessionData()|| {};

    // Setări UI
    if (settings.darkMode) {
      document.body.classList.add('dark-mode');
      const tgl = document.getElementById('darkModeToggle');
      if (tgl) tgl.checked = true;
    }
    if (settings.voiceControl !== undefined) {
      const tgl = document.getElementById('voiceControlToggle');
      if (tgl) tgl.checked = !!settings.voiceControl;
    }
    if (settings.soundAlerts !== undefined) {
      const tgl = document.getElementById('soundAlertsToggle');
      if (tgl) tgl.checked = !!settings.soundAlerts;
    }

    // Info șofer
    if (driverData.name) {
      const elName = document.getElementById('driverName');
      if (elName) elName.textContent = driverData.name;
      const inp = document.getElementById('settingDriverName');
      if (inp) inp.value = driverData.name;
    }
    if (driverData.truckNumber) {
      const elTruck = document.getElementById('truckNumber');
      if (elTruck) elTruck.textContent = `Camion #${driverData.truckNumber}`;
      const inp2 = document.getElementById('settingTruckNumber');
      if (inp2) inp2.value = driverData.truckNumber;
    }

    // Sesiune activă?
    if (sessionData.isActive) this.restoreSession(sessionData);
  }

  restoreSession(sessionData) {
    console.log('🔄 Restoring active session...');

    this.programStarted   = true;
    this.programStartTime = new Date(sessionData.startTime);

    // UI
    const startBtn = document.getElementById('startButton');
    if (startBtn) startBtn.style.display = 'none';

    document.getElementById('statusCard')?.classList.add('show');
    document.getElementById('controlButtons')?.classList.add('show');
    const st = document.getElementById('currentState');
    if (st) st.textContent = 'Program activ';
    const ps = document.getElementById('programStartTime');
    if (ps) ps.textContent = this.formatTime(this.programStartTime);

    // ⚠️ Pornește activitatea curentă fără să depindă de buton
    const a = sessionData.currentActivity;
    if (a && a.type) this.setActivity(a.type, a.name || '');

    this.showToast('Sesiune restaurată');
  }

  setupEventListeners() {
    // UX mobil (feedback de apăsare)
    document.querySelectorAll('.control-btn, .nav-item').forEach(btn => {
      btn.addEventListener('touchstart', function(){ this.style.transform = 'scale(0.95)'; }, {passive:true});
      btn.addEventListener('touchend',   function(){ this.style.transform = 'scale(1)';     }, {passive:true});
    });

    // Previne contextmenu pe long-press
    document.addEventListener('contextmenu', e => e.preventDefault());

    // Reducem zgomotul când aplicația e în background
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('📱 App backgrounded – reducing updates');
      } else {
        console.log('📱 App foregrounded – resuming updates');
        this.updateUI();
      }
    });
  }

  /* ========== CONTROL PROGRAM ========== */
  startProgram() {
    if (this.programStarted) return;

    console.log('▶️ Starting program...');
    this.programStarted = true;
    this.programStartTime = new Date();

    // UI
    const startBtn = document.getElementById('startButton');
    if (startBtn) startBtn.style.display = 'none';
    document.getElementById('statusCard')?.classList.add('show');
    document.getElementById('controlButtons')?.classList.add('show');

    const st = document.getElementById('currentState');
    if (st) st.textContent = 'Program activ';
    const ps = document.getElementById('programStartTime');
    if (ps) ps.textContent = this.formatTime(this.programStartTime);
    const ca = document.getElementById('currentActivity');
    if (ca) ca.textContent = 'Așteptare activitate';

    // Persist
    this.dataManager.saveSessionData({
      isActive: true,
      startTime: this.programStartTime.toISOString(),
      activities: []
    });

    // Servicii dependente
    this.timeTracker?.startProgram?.(this.programStartTime);
    this.alertSystem?.scheduleComplianceAlerts?.();

    this.showToast('Program pornit cu succes!');
    setTimeout(() => this.alertSystem?.showAlert?.('info', 'Sistem de monitorizare activ'), 5000);
  }

  endProgram() {
    if (!this.programStarted) return;
    if (!confirm('Sigur doriți să terminați programul?')) return;

    console.log('⏹️ Ending program...');
    this.programStarted = false;
    this.currentActivity = null;
    this.programStartTime = null;
    this.activityStartTime = null;

    // UI
    const startBtn = document.getElementById('startButton');
    if (startBtn) startBtn.style.display = 'block';
    document.getElementById('statusCard')?.classList.remove('show');
    document.getElementById('controlButtons')?.classList.remove('show');
    document.querySelectorAll('.control-btn').forEach(b => b.classList.remove('active'));

    // Persist/raport
    const sessionData = this.timeTracker?.endProgram?.();
    this.dataManager.saveSessionData({ isActive: false });
    if (sessionData) this.dataManager.saveDailyReport(sessionData);

    this.alertSystem?.clearAlerts?.();
    this.showToast('Program terminat!');
  }

  /* ========== ACTIVITĂȚI ========== */
  setActivity(activityType, activityName = '', button) {
    try {
      if (!this.programStarted) {
        console.warn('setActivity: program not started – ignoring.');
        return false;
      }

      // 1) Validare + etichete
      const VALID = ['driving','break','work','other'];
      const type  = VALID.includes(activityType) ? activityType : 'other';
      const label = {driving:'Condus', break:'Pauză', work:'Muncă', other:'Alte activități'};
      const name  = activityName || label[type];

      console.log(`🎯 setActivity -> type="${type}" name="${name}"`);

      // 2) UI butoane (fail-safe)
      try {
        document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
        if (button?.classList) button.classList.add('active');
      } catch(e){ console.warn('setActivity: could not toggle button state', e); }

      // 3) Închide activitatea anterioară
      if (this.currentActivity && this.timeTracker?.endActivity) {
        try { this.timeTracker.endActivity(); } catch(e){ console.warn('timeTracker.endActivity failed:', e); }
      }

      // 4) Stare nouă
      this.currentActivity   = { type, name };
      this.activityStartTime = new Date();

      // 5) UI label
      const ca = document.getElementById('currentActivity');
      if (ca) ca.textContent = name; else console.warn('setActivity: #currentActivity not found');

      // 6) Start tracking
      if (this.timeTracker?.startActivity) {
        try { this.timeTracker.startActivity(type, this.activityStartTime); }
        catch(e){ console.warn('timeTracker.startActivity failed:', e); }
      } else {
        console.warn('setActivity: timeTracker missing or invalid');
      }

      // 7) Persist sesiunea
      if (this.dataManager?.getSessionData && this.dataManager?.saveSessionData) {
        try {
          const s = this.dataManager.getSessionData() || {};
          s.currentActivity = this.currentActivity;
          this.dataManager.saveSessionData(s);
        } catch(e){ console.warn('setActivity: saving session failed:', e); }
      } else {
        console.warn('setActivity: dataManager missing or invalid');
      }

      // 8) Conformitate
      if (type === 'driving' && this.alertSystem?.checkDrivingCompliance) {
        try { this.alertSystem.checkDrivingCompliance(); }
        catch(e){ console.warn('alertSystem.checkDrivingCompliance failed:', e); }
      }

      // 9) Feedback
      this.showToast(`Activitate: ${name}`);
      return true;

    } catch (err) {
      console.error('❌ setActivity error:', err);
      try { this.alertSystem?.showAlert?.('error','A apărut o problemă la schimbarea activității.'); } catch {}
      return false;
    }
  }

  /* ========== VOICE ========== */
  toggleVoiceControl() {
    const settings = this.dataManager.getSettings() || {};
    if (!settings.voiceControl) {
      this.showToast('Control vocal dezactivat în setări');
      return;
    }

    const btn = document.getElementById('voiceBtn');
    this.voiceListening = !this.voiceListening;

    if (this.voiceListening) {
      btn?.classList.add('listening');
      if (btn) btn.textContent = '🎙️';
      this.showToast('Ascult... Spune comanda!');

      // Simulare – în produs folosește Web Speech API
      setTimeout(() => {
        this.voiceListening = false;
        btn?.classList.remove('listening');
        if (btn) btn.textContent = '🎤';

        const cmds = ['Start pauză','Start condus','Status','Termină program'];
        this.processVoiceCommand(cmds[Math.floor(Math.random()*cmds.length)]);
      }, 3000);

    } else {
      btn?.classList.remove('listening');
      if (btn) btn.textContent = '🎤';
      this.showToast('Control vocal oprit');
    }
  }

  processVoiceCommand(command) {
    console.log(`🎤 Voice command: ${command}`);
    const s = (command||'').toLowerCase();

    if (s.includes('start pauză') || s.includes('pauză')) {
      if (this.programStarted) this.setActivity('break','Pauză', document.getElementById('btnBreak'));
    } else if (s.includes('start condus') || s.includes('condus')) {
      if (this.programStarted) this.setActivity('driving','Condus', document.getElementById('btnDriving'));
    } else if (s.includes('start program')) {
      this.startProgram();
    } else if (s.includes('termină program')) {
      this.endProgram();
    } else if (s.includes('status')) {
      this.speakStatus();
    } else {
      this.showToast('Comandă nerecunoscută. Încearcă din nou.');
    }
  }

  speakStatus() {
    if (!this.programStarted) { this.showToast('🔊 Program oprit'); return; }
    const total   = this.timeTracker.getTotalProgramTime?.() || 0;
    const driving = this.timeTracker.getActivityTime?.('driving') || 0;
    const act     = this.currentActivity ? this.currentActivity.name : 'Nicio activitate';
    this.showToast(`🔊 Status: ${act}. Program: ${this.formatDuration(total)}. Condus: ${this.formatDuration(driving)}`);
  }

  /* ========== NAV ========== */
  switchTab(element, tabName) {
    console.log(`📱 Switching to tab: ${tabName}`);
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    element?.classList.add('active');

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageMap = { program:'pageProgram', gps:'pageGPS', fuel:'pageFuel', reports:'pageReports', settings:'pageSettings' };
    const target  = document.getElementById(pageMap[tabName]);
    if (target) {
      target.classList.add('active');
      this.currentTab = tabName;
      this.loadPageContent(tabName);
    }
    this.showToast(tabName.charAt(0).toUpperCase()+tabName.slice(1));
  }

  loadPageContent(tabName) {
    if (tabName === 'gps')     this.loadGPSPage();
    if (tabName === 'fuel')    this.loadFuelPage();
    if (tabName === 'reports') this.loadReportsPage();
  }

  loadGPSPage() {
    const c = document.getElementById('gpsContent');
    if (c && c.innerHTML.includes('Încărcare')) {
      setTimeout(() => {
        c.innerHTML = `
          <div style="background:#f8f9fa;border-radius:8px;padding:15px;margin-bottom:20px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;">
              <div style="width:30px;height:30px;border-radius:50%;background:#27ae60;display:flex;align-items:center;justify-content:center;color:#fff;">📍</div>
              <div><div style="font-weight:bold;">GPS Conectat</div><div style="font-size:12px;color:#7f8c8d;">Precizie: ±3m</div></div>
            </div>
            <div style="font-weight:bold;margin-bottom:8px;">Locația Curentă</div>
            <div>📍 E4, Stockholm, Suedia</div>
            <div>🕐 Ultimul update: acum 5 sec</div>
            <div>🚗 Viteză: 0 km/h (oprit)</div>
          </div>
          <div style="height:200px;background:linear-gradient(135deg,#74b9ff,#0984e3);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;margin-bottom:20px;">
            🗺️ HARTĂ GPS<br><small>Locația în timp real</small>
          </div>
          <div style="display:grid;gap:10px;">
            <button class="control-btn" onclick="app.showToast('Calculez ruta...')">📍 Calculează Ruta</button>
            <button class="control-btn" onclick="app.showToast('Găsesc zone de parcare...')">🅿️ Zone Parcare</button>
            <button class="control-btn" onclick="app.showToast('Găsesc stații...')">⛽ Stații Combustibil</button>
          </div>`;
      }, 800);
    }
  }

  loadFuelPage() {
    const page = document.getElementById('pageFuel');
    if (page) return;
    const newPage = document.createElement('div');
    newPage.className = 'page';
    newPage.id = 'pageFuel';
    newPage.innerHTML = `
      <div class="page-content">
        <h2 class="page-title">Management Combustibil</h2>
        <div style="background:linear-gradient(135deg,#fd79a8,#e84393);color:#fff;padding:20px;border-radius:12px;margin-bottom:20px;">
          <h3 style="margin-bottom:15px;">⛽ Status Combustibil</h3>
          <div style="font-size:24px;font-weight:bold;text-align:center;margin-bottom:15px;">76% • 380L</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
            <div style="text-align:center;"><div style="font-size:18px;font-weight:bold;">8.2L</div><div style="font-size:12px;opacity:.9;">Consum/100km</div></div>
            <div style="text-align:center;"><div style="font-size:18px;font-weight:bold;">520km</div><div style="font-size:12px;opacity:.9;">Autonomie</div></div>
          </div>
        </div>
        <div class="card">
          <h3 class="card-title">Adaugă Alimentare</h3>
          <div style="display:grid;gap:15px;">
            <div><label style="font-weight:500;display:block;margin-bottom:5px;">Cantitate (L):</label>
              <input type="number" id="fuelAmount" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;" placeholder="Litri combustibil..." />
            </div>
            <div><label style="font-weight:500;display:block;margin-bottom:5px;">Preț/L (€):</label>
              <input type="number" id="fuelPrice" step="0.01" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;" placeholder="1.45" />
            </div>
            <button class="control-btn" style="background:#27ae60;color:#fff;border-color:#27ae60;" onclick="app.saveFuelData()">💾 Salvează Alimentare</button>
          </div>
        </div>
      </div>`;
    document.querySelector('.content')?.appendChild(newPage);
  }

  loadReportsPage() {
    const page = document.getElementById('pageReports');
    if (page) return;
    const newPage = document.createElement('div');
    newPage.className = 'page';
    newPage.id = 'pageReports';

    const today = this.timeTracker.getTodayStats?.() || {driving:0,break:0,work:0,other:0};
    newPage.innerHTML = `
      <div class="page-content">
        <h2 class="page-title">Rapoarte și Istoric</h2>
        <div class="card">
          <h3 class="card-title">Detalii Program Curent</h3>
          <div style="background:#f8f9fa;border-radius:8px;padding:15px;">
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ecf0f1;">
              <span style="font-weight:500;color:#7f8c8d;">Program început la:</span>
              <span style="font-weight:bold;color:#2c3e50;">${this.programStartTime ? this.formatTime(this.programStartTime) : '-'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ecf0f1;">
              <span style="font-weight:500;color:#7f8c8d;">Conducere:</span>
              <span style="font-weight:bold;color:#2c3e50;">${this.formatDuration(today.driving)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ecf0f1;">
              <span style="font-weight:500;color:#7f8c8d;">Pauze:</span>
              <span style="font-weight:bold;color:#2c3e50;">${this.formatDuration(today.break)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;">
              <span style="font-weight:500;color:#7f8c8d;">Alte activități:</span>
              <span style="font-weight:bold;color:#2c3e50;">${this.formatDuration((today.work||0)+(today.other||0))}</span>
            </div>
          </div>
        </div>
        <div class="card">
          <h3 class="card-title">Exportă Rapoarte</h3>
          <div style="display:grid;gap:10px;">
            <button class="control-btn" onclick="app.exportToPDF()">📄 Export PDF</button>
            <button class="control-btn" onclick="app.exportToExcel()">📊 Export Excel</button>
            <button class="control-btn" onclick="app.sendEmail()">📧 Trimite email</button>
          </div>
        </div>
      </div>`;
    document.querySelector('.content')?.appendChild(newPage);
  }

  /* ========== SETĂRI ========== */
  saveSettings() {
    const settings = {
      darkMode:     !!document.getElementById('darkModeToggle')?.checked,
      voiceControl: !!document.getElementById('voiceControlToggle')?.checked,
      soundAlerts:  !!document.getElementById('soundAlertsToggle')?.checked
    };
    const driverData = {
      name:        document.getElementById('settingDriverName')?.value || '',
      truckNumber: document.getElementById('settingTruckNumber')?.value || ''
    };

    this.dataManager.saveSettings(settings);
    this.dataManager.saveDriverData(driverData);

    const elName = document.getElementById('driverName');
    if (elName) elName.textContent = driverData.name;
    const elTruck = document.getElementById('truckNumber');
    if (elTruck) elTruck.textContent = `Camion #${driverData.truckNumber}`;

    this.showToast('Setări salvate cu succes!');
  }

  toggleDarkMode() {
    const isDark = !!document.getElementById('darkModeToggle')?.checked;
    document.body.classList.toggle('dark-mode', isDark);
    const s = this.dataManager.getSettings() || {};
    s.darkMode = isDark;
    this.dataManager.saveSettings(s);
    this.showToast(isDark ? 'Mod întunecat activat' : 'Mod luminos activat');
  }

  /* ========== UI UPDATE ========== */
  updateUI() {
    if (!this.programStarted) return;

    if (this.activityStartTime) {
      const d = Date.now() - this.activityStartTime.getTime();
      const t = document.getElementById('activityTime');
      if (t) t.textContent = this.formatDuration(d);
    }
    if (this.programStartTime) {
      const td = Date.now() - this.programStartTime.getTime();
      const el = document.getElementById('totalProgramTime');
      if (el) el.textContent = this.formatDuration(td);
    }
    this.updateProgressRings();
  }

  updateProgressRings() {
    const s = this.timeTracker.getTodayStats?.() || {driving:0,break:0,work:0,other:0};
    const total = s.driving + s.break + s.work + s.other;
    if (!total) return;

    const pct = {
      driving: Math.round((s.driving / total) * 100),
      break:   Math.round((s.break   / total) * 100),
      work:    Math.round(((s.work+s.other) / total) * 100)
    };

    const setRing = (id, color, p) => {
      const deg = (p / 100) * 360;
      const ring = document.getElementById(id);
      if (ring) ring.style.background = `conic-gradient(${color} ${deg}deg, #ecf0f1 ${deg}deg)`;
    };

    setRing('drivingProgress', '#3498db', pct.driving);
    setRing('breakProgress',   '#27ae60',  pct.break);
    setRing('workProgress',    '#f39c12',  pct.work);

    const setLabel = (id, p) => { const el = document.getElementById(id); if (el) el.textContent = `${p}%`; };
    setLabel('drivingPercentage', pct.driving);
    setLabel('breakPercentage',   pct.break);
    setLabel('workPercentage',    pct.work);
  }

  updateNetworkStatus() {
    const el = document.getElementById('networkStatus');
    if (!el) return;
    if (navigator.onLine)  el.innerHTML = '<span class="status-dot status-online"></span>Online';
    else                   el.innerHTML = '<span class="status-dot status-offline"></span>Offline Ready';
  }

  async loadWeatherData() {
    const temp = document.getElementById('weatherTemp');
    const desc = document.getElementById('weatherDesc');
    try {
      await new Promise(r => setTimeout(r, 1200));
      const weather = {
        temperature: Math.round(Math.random()*20+5),
        description: ['☀️ Însorit','☁️ Înnorat','🌧️ Ploios','❄️ Ninsoare'][Math.floor(Math.random()*4)],
        location: 'Stockholm'
      };
      if (temp) temp.textContent = `${weather.temperature}°C`;
      if (desc) desc.textContent = `${weather.description} • ${weather.location}`;
      console.log('🌤️ Weather data loaded');
    } catch (e) {
      console.error('❌ Weather data failed:', e);
      if (temp) temp.textContent = '--°C';
      if (desc) desc.textContent = 'Informații meteo indisponibile';
    }
  }

  /* ========== EXPORT / FUEL ========== */
  exportToPDF()   { this.showToast('📄 Export PDF în curs...');   setTimeout(()=>this.showToast('✅ Raport PDF generat cu succes!'),   1500); }
  exportToExcel() { this.showToast('📊 Export Excel în curs...'); setTimeout(()=>this.showToast('✅ Raport Excel generat cu succes!'), 1500); }
  sendEmail()     { this.showToast('📧 Trimitere email în curs...'); setTimeout(()=>this.showToast('✅ Email trimis cu succes!'), 1500); }

  saveFuelData() {
    const amount = parseFloat(document.getElementById('fuelAmount')?.value || '');
    const price  = parseFloat(document.getElementById('fuelPrice')?.value  || '');
    if (!amount || !price) { this.showToast('❌ Completează toate câmpurile'); return; }

    const fuelData = { amount, price, timestamp: new Date().toISOString(), totalCost: amount*price };
    this.dataManager.saveFuelData(fuelData);
    const a = document.getElementById('fuelAmount'); if (a) a.value = '';
    const p = document.getElementById('fuelPrice');  if (p) p.value = '';
    this.showToast('⛽ Alimentare salvată cu succes!');
  }

  /* ========== UTILS ========== */
  formatTime(date) {
    return date.toLocaleTimeString('ro-RO', { hour12:false, hour:'2-digit', minute:'2-digit' });
  }
  formatDuration(ms) {
    const s = Math.floor(ms/1000), h = Math.floor(s/3600), m = Math.floor((s%3600)/60), ss = s%60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  }
  showToast(message) {
    const t = document.getElementById('toast'); if (!t) return console.log('[Toast]', message);
    t.textContent = message; t.style.opacity='1'; t.style.transform='translateX(-50%) translateY(0)';
    setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(-50%) translateY(-20px)'; }, 3000);
  }
}