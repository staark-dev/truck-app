// Driver Support App - Main Application Logic (rev. with break-lock + button visibility)
class DriverApp {
  constructor() {
    // ---- State ----
    this.programStarted   = false;
    this.currentActivity  = null;     // { type, name }
    this.programStartTime = null;
    this.activityStartTime= null;
    this.voiceListening   = false;
    this.currentTab       = 'program';

    // ---- Break lock (30 min) ----
    this.MIN_BREAK_MS   = 30 * 60 * 1000; // 30m
    this.breakStartTime = null;           // number (ms from epoch) or null
    this.breakTimer     = null;           // setInterval id

    // ---- Components (provided by other files) ----
    this.dataManager     = new DataManager();
    this.timeTracker     = new TimeTracker();
    this.locationService = new LocationService();
    this.alertSystem     = new AlertSystem();

    this.initializeApp();
  }

  // =========================
  // ==== INIT / LIFECYCLE ===
  // =========================
  initializeApp() {
    console.log('[DriverApp] 🚛 initializing...');
    this.loadSavedData();

    // init services (safe)
    try { this.locationService.initialize(); } catch (e) { console.warn('Location init failed', e); }
    try { this.alertSystem.initialize();     } catch (e) { console.warn('Alert init failed', e); }

    this.setupEventListeners();
    this.updateNetworkStatus();
    this.loadWeatherData();

    // periodic UI/network ticks
    setInterval(() => this.updateUI(), 1000);
    setInterval(() => this.updateNetworkStatus(), 30000);

    console.log('[DriverApp] ✅ App initialized');
  }

  loadSavedData() {
    const settings    = this.dataManager.getSettings()    || {};
    const driverData  = this.dataManager.getDriverData()  || {};
    const sessionData = this.dataManager.getSessionData() || {};

    // Settings -> UI
    if (settings.darkMode) {
      document.body.classList.add('dark-mode');
      const t = document.getElementById('darkModeToggle'); if (t) t.checked = true;
    }
    if (settings.voiceControl !== undefined) {
      const t = document.getElementById('voiceControlToggle'); if (t) t.checked = settings.voiceControl;
    }
    if (settings.soundAlerts !== undefined) {
      const t = document.getElementById('soundAlertsToggle'); if (t) t.checked = settings.soundAlerts;
    }

    // Driver header
    if (driverData.name) {
      const a = document.getElementById('driverName');          if (a) a.textContent = driverData.name;
      const b = document.getElementById('settingDriverName');   if (b) b.value = driverData.name;
    }
    if (driverData.truckNumber) {
      const a = document.getElementById('truckNumber');         if (a) a.textContent = `Camion #${driverData.truckNumber}`;
      const b = document.getElementById('settingTruckNumber');  if (b) b.value = driverData.truckNumber;
    }

    // Restore session
    if (sessionData.isActive) {
      this.restoreSession(sessionData);
    } else {
      // default buttons state
      this.updateActivityButtonsUI();
    }
  }

  restoreSession(sessionData) {
    console.log('[DriverApp] 🔄 Restoring active session...');
    this.programStarted   = true;
    this.programStartTime = new Date(sessionData.startTime);

    // UI show
    const startBtn      = document.getElementById('startButton');
    const statusCard    = document.getElementById('statusCard');
    const controlButtons= document.getElementById('controlButtons');
    if (startBtn) startBtn.style.display = 'none';
    statusCard?.classList.add('show');
    controlButtons?.classList.add('show');

    const cs = document.getElementById('currentState');
    const ps = document.getElementById('programStartTime');
    if (cs) cs.textContent = 'Program activ';
    if (ps) ps.textContent = this.formatTime(this.programStartTime);

    // recover break lock
    if (sessionData.breakStartTime) {
      const ts = new Date(sessionData.breakStartTime).getTime();
      if (!Number.isNaN(ts)) this.breakStartTime = ts;
    }

    // Resume current activity
    if (sessionData.currentActivity) {
      this.setActivity(
        sessionData.currentActivity.type,
        sessionData.currentActivity.name,
        document.querySelector(`[data-activity="${sessionData.currentActivity.type}"]`)
      );
    } else {
      this.updateActivityButtonsUI();
    }

    this.showToast('Sesiune restaurată');
  }

  setupEventListeners() {
    // subtle tap feedback on mobile
    document.querySelectorAll('.control-btn, .nav-item').forEach(btn => {
      btn.addEventListener('touchstart', function(){ this.style.transform='scale(0.96)'; }, {passive:true});
      btn.addEventListener('touchend',   function(){ this.style.transform='scale(1)';    }, {passive:true});
    });
    // Prevent context menu
    document.addEventListener('contextmenu', e => e.preventDefault());
    // Visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) console.log('[DriverApp] background');
      else { console.log('[DriverApp] foreground'); this.updateUI(); }
    });
  }

  // =========================
  // ===== Program flow ======
  // =========================
  startProgram() {
    if (this.programStarted) return;

    console.log('[DriverApp] ▶️ start program');
    this.programStarted   = true;
    this.programStartTime = new Date();

    const startBtn      = document.getElementById('startButton');
    const statusCard    = document.getElementById('statusCard');
    const controlButtons= document.getElementById('controlButtons');
    if (startBtn) startBtn.style.display = 'none';
    statusCard?.classList.add('show');
    controlButtons?.classList.add('show');

    const cs = document.getElementById('currentState');
    const ps = document.getElementById('programStartTime');
    const ca = document.getElementById('currentActivity');
    if (cs) cs.textContent = 'Program activ';
    if (ps) ps.textContent = this.formatTime(this.programStartTime);
    if (ca) ca.textContent = 'Așteptare activitate';

    // persist session skeleton
    this.dataManager.saveSessionData({
      isActive: true,
      startTime: this.programStartTime.toISOString(),
      currentActivity: null,
      breakStartTime: null,
      activities: []
    });

    // trackers & alerts
    try { this.timeTracker.startProgram(this.programStartTime); } catch {}
    try { this.alertSystem.scheduleComplianceAlerts(); } catch {}

    this.showToast('Program pornit cu succes!');

    // opțional: începem cu "Alte activități"
    this.setActivity('other', 'Alte activități', this.getBtn('other'));
    this.updateActivityButtonsUI();
  }

  endProgram() {
    if (!this.programStarted) return;
    if (!confirm('Sigur doriți să terminați programul?')) return;

    console.log('[DriverApp] ⏹️ end program');

    this.programStarted   = false;
    this.currentActivity  = null;
    this.programStartTime = null;
    this.activityStartTime= null;

    // UI reset
    const startBtn      = document.getElementById('startButton');
    const statusCard    = document.getElementById('statusCard');
    const controlButtons= document.getElementById('controlButtons');
    if (startBtn) startBtn.style.display = 'block';
    statusCard?.classList.remove('show');
    controlButtons?.classList.remove('show');

    document.querySelectorAll('.control-btn').forEach(b=>{
      b.classList.remove('active'); b.disabled=false; b.classList.remove('hidden');
    });

    // trackers & persist
    let sessionData = {};
    try { sessionData = this.timeTracker.endProgram(); } catch {}
    this.dataManager.saveSessionData({ isActive: false });
    this.dataManager.saveDailyReport(sessionData);

    // alerts cleanup
    try { this.alertSystem.clearAlerts(); } catch {}

    // break lock cleanup
    this.clearBreakCountdown();
    this.breakStartTime = null;

    this.showToast('Program terminat!');
  }

  // =========================
  // ====== Activities =======
  // =========================
  setActivity(activityType, activityName = '', button) {
    try {
      if (!this.programStarted) {
        console.warn('setActivity: program not started – ignored');
        return false;
      }

      // normalize
      const VALID = ['driving','break','work','other'];
      const type  = VALID.includes(activityType) ? activityType : 'other';
      const label = { driving:'Condus', break:'Pauză', work:'Muncă', other:'Alte activități' }[type];
      const name  = activityName || label;

      // enforce break-lock before driving
      if (type === 'driving' && this.breakStartTime) {
        const left = this.MIN_BREAK_MS - (Date.now() - this.breakStartTime);
        if (left > 0) {
          this.showToast(`Așteaptă încă ${Math.ceil(left/60000)} min pentru a porni condusul.`);
          return false;
        }
      }

      // same activity -> ignore
      if (this.currentActivity?.type === type) return false;

      console.log(`[DriverApp] 🎯 setActivity -> ${type} (${name})`);

      // UI: deactivate all, mark clicked (if exists)
      try {
        document.querySelectorAll('.control-btn').forEach(b=>b.classList.remove('active'));
        if (button && button.classList) button.classList.add('active');
      } catch {}

      // end previous
      if (this.currentActivity && this.timeTracker?.endActivity) {
        try { this.timeTracker.endActivity(); } catch {}
      }

      // start new
      this.currentActivity   = { type, name };
      this.activityStartTime = new Date();
      const ca = document.getElementById('currentActivity'); if (ca) ca.textContent = name;
      if (this.timeTracker?.startActivity) {
        try { this.timeTracker.startActivity(type, this.activityStartTime); } catch {}
      }

      // break-lock handling
      if (type === 'break') {
        this.breakStartTime = Date.now();
        this.startBreakCountdown();          // ascunde „Condus” + afișează countdown
      } else {
        this.clearBreakCountdown();
        if (type === 'driving') this.breakStartTime = null;
      }

      // persist session (incl. breakStartTime)
      if (this.dataManager?.getSessionData && this.dataManager?.saveSessionData) {
        const session = this.dataManager.getSessionData() || {};
        session.currentActivity = this.currentActivity;
        session.breakStartTime  = this.breakStartTime ? new Date(this.breakStartTime).toISOString() : null;
        this.dataManager.saveSessionData(session);
      }

      // compliance checks
      if (type === 'driving' && this.alertSystem?.checkDrivingCompliance) {
        try { this.alertSystem.checkDrivingCompliance(); } catch {}
      }

      // update buttons visibility according to new state
      this.updateActivityButtonsUI();

      this.showToast(`Activitate: ${name}`);
      return true;

    } catch (err) {
      console.error('❌ setActivity error:', err);
      return false;
    }
  }

  // ---------- Buttons helpers ----------
  getBtn(type){ return document.querySelector(`.control-btn[data-activity="${type}"]`); }
  hideBtn(type, hidden=true){ this.getBtn(type)?.classList.toggle('hidden', hidden); }
  setActiveBtn(type){
    document.querySelectorAll('.control-btn').forEach(b=>{ b.classList.remove('active'); b.disabled=false; });
    const cur = this.getBtn(type);
    if (cur){ cur.classList.add('active'); cur.disabled = true; } // deactivăm activul curent
  }

  // ---------- Break countdown ----------
  startBreakCountdown() {
    // ascunde butonul „Condus” până la 30m
    this.hideBtn('driving', true);

    const chip = document.getElementById('breakCountdown') || this.createBreakChip();
    const tick = () => {
      const left = Math.max(0, this.MIN_BREAK_MS - (Date.now() - (this.breakStartTime || Date.now())));
      if (left > 0) {
        chip.textContent = `Reîncepere condus în ${this.msToMMSS(left)}`;
      } else {
        chip.textContent = 'Pauză minimă atinsă';
        this.clearBreakCountdown();
        this.hideBtn('driving', false); // reapare „Condus”
      }
    };
    this.clearBreakCountdown(); // safety
    tick();
    this.breakTimer = setInterval(tick, 1000);
  }
  clearBreakCountdown(){
    if (this.breakTimer) clearInterval(this.breakTimer);
    this.breakTimer = null;
  }
  createBreakChip() {
    const pauseBtn = this.getBtn('break');
    const chip = document.createElement('small');
    chip.id = 'breakCountdown';
    chip.className = 'countdown-chip';
    chip.setAttribute('aria-live','polite');
    if (pauseBtn?.parentElement) pauseBtn.insertAdjacentElement('afterend', chip);
    else document.getElementById('statusCard')?.appendChild(chip);
    return chip;
  }
  msToMMSS(ms){
    const s = Math.ceil(ms/1000);
    const m = Math.floor(s/60);
    const ss = String(s%60).padStart(2,'0');
    return `${m}:${ss}`;
  }

  // ---------- Buttons visibility logic ----------
  updateActivityButtonsUI() {
    const type = this.currentActivity?.type || null;

    // show all by default
    ['driving','break','work','other'].forEach(t => this.hideBtn(t,false));

    // if driving active -> hide its own button
    if (type === 'driving') this.hideBtn('driving', true);

    // if break active -> keep "driving" hidden until 30m pass
    if (type === 'break') {
      const elapsed = this.breakStartTime ? (Date.now() - this.breakStartTime) : 0;
      const needsMore = elapsed < this.MIN_BREAK_MS;
      this.hideBtn('driving', needsMore);
      if (needsMore && !this.breakTimer) this.startBreakCountdown();
    }

    if (type) this.setActiveBtn(type);
  }

  // =========================
  // ===== Voice control =====
  // =========================
  toggleVoiceControl() {
    const settings = this.dataManager.getSettings() || {};
    if (!settings.voiceControl) { this.showToast('Control vocal dezactivat în setări'); return; }

    const btn = document.getElementById('voiceBtn');
    this.voiceListening = !this.voiceListening;

    if (this.voiceListening) {
      btn?.classList.add('listening'); if (btn) btn.textContent = '🎙️';
      this.showToast('Ascult... Spune comanda!');
      setTimeout(() => {
        this.voiceListening = false;
        btn?.classList.remove('listening'); if (btn) btn.textContent = '🎤';
        const commands = ['Start pauză','Start condus','Status','Termină program'];
        this.processVoiceCommand(commands[Math.floor(Math.random()*commands.length)]);
      }, 3000);
    } else {
      btn?.classList.remove('listening'); if (btn) btn.textContent = '🎤';
      this.showToast('Control vocal oprit');
    }
  }

  processVoiceCommand(cmd) {
    console.log(`🎤 Voice: ${cmd}`);
    const c = (cmd||'').toLowerCase();

    if (c.includes('start pauză') || c.includes('pauză')) {
      if (this.programStarted) this.setActivity('break','Pauză', this.getBtn('break'));
    } else if (c.includes('start condus') || c.includes('condus')) {
      if (this.programStarted) this.setActivity('driving','Condus', this.getBtn('driving'));
    } else if (c.includes('start program')) {
      this.startProgram();
    } else if (c.includes('termină program')) {
      this.endProgram();
    } else if (c.includes('status')) {
      this.speakStatus();
    } else {
      this.showToast('Comandă nerecunoscută.');
    }
  }

  speakStatus() {
    if (!this.programStarted) { this.showToast('🔊 Program oprit'); return; }
    const total   = this.timeTracker.getTotalProgramTime?.() || 0;
    const driving = this.timeTracker.getActivityTime?.('driving') || 0;
    const act     = this.currentActivity ? this.currentActivity.name : 'Nicio activitate';
    this.showToast(`🔊 Status: ${act}. Program: ${this.formatDuration(total)}. Condus: ${this.formatDuration(driving)}`);
  }

  // =========================
  // ===== Navigation/UI =====
  // =========================
  switchTab(element, tabName) {
    console.log(`[DriverApp] 📱 tab: ${tabName}`);
    document.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('active'));
    element?.classList.add('active');

    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const pageMap = { program:'pageProgram', gps:'pageGPS', fuel:'pageFuel', reports:'pageReports', settings:'pageSettings' };
    const target = document.getElementById(pageMap[tabName]);
    target?.classList.add('active');
    this.currentTab = tabName;

    this.loadPageContent(tabName);
    this.showToast(tabName.charAt(0).toUpperCase()+tabName.slice(1));
  }

  loadPageContent(tab) {
    if (tab === 'gps')     this.loadGPSPage();
    if (tab === 'fuel')    this.loadFuelPage();
    if (tab === 'reports') this.loadReportsPage();
  }

  loadGPSPage() {
    const wrap = document.getElementById('gpsContent');
    if (!wrap || !wrap.innerHTML.includes('Încărcare')) return;
    setTimeout(()=>{
      wrap.innerHTML = `
        <div style="background:#f8f9fa;border-radius:8px;padding:15px;margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;">
            <div style="width:30px;height:30px;border-radius:50%;background:#27ae60;display:flex;align-items:center;justify-content:center;color:white;">📍</div>
            <div>
              <div style="font-weight:bold;">GPS Conectat</div>
              <div style="font-size:12px;color:#7f8c8d;">Precizie: ±3m</div>
            </div>
          </div>
          <div style="font-weight:bold;margin-bottom:8px;">Locația Curentă</div>
          <div>📍 E4, Stockholm, Suedia</div>
          <div>🕐 Ultimul update: acum 5 sec</div>
          <div>🚗 Viteză: 0 km/h (oprit)</div>
        </div>
        <div style="height:200px;background:linear-gradient(135deg,#74b9ff,#0984e3);border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;margin-bottom:20px;">
          🗺️ HARTĂ GPS<br><small>Locația în timp real</small>
        </div>
        <div style="display:grid;gap:10px;">
          <button class="control-btn" onclick="app.showToast('Calculez ruta...')">📍 Calculează Ruta</button>
          <button class="control-btn" onclick="app.showToast('Găsesc zone de parcare...')">🅿️ Zone Parcare</button>
          <button class="control-btn" onclick="app.showToast('Găsesc stații...')">⛽ Stații Combustibil</button>
        </div>`;
    }, 800);
  }

  loadFuelPage() {
    const page = document.getElementById('pageFuel');
    if (page) return; // already created
    const newPage = document.createElement('div');
    newPage.className = 'page'; newPage.id = 'pageFuel';
    newPage.innerHTML = `
      <div class="page-content">
        <h2 class="page-title">Management Combustibil</h2>
        <div style="background:linear-gradient(135deg,#fd79a8,#e84393);color:white;padding:20px;border-radius:12px;margin-bottom:20px;">
          <h3 style="margin-bottom:15px;">⛽ Status Combustibil</h3>
          <div style="font-size:24px;font-weight:bold;text-align:center;margin-bottom:15px;">76% • 380L</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
            <div style="text-align:center;">
              <div style="font-size:18px;font-weight:bold;">8.2L</div>
              <div style="font-size:12px;opacity:.9;">Consum/100km</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:18px;font-weight:bold;">520km</div>
              <div style="font-size:12px;opacity:.9;">Autonomie</div>
            </div>
          </div>
        </div>
        <div class="card">
          <h3 class="card-title">Adaugă Alimentare</h3>
          <div style="display:grid;gap:15px;">
            <div><label style="font-weight:500;display:block;margin-bottom:5px;">Cantitate (L):</label>
              <input type="number" id="fuelAmount" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;" placeholder="Litri combustibil..."/></div>
            <div><label style="font-weight:500;display:block;margin-bottom:5px;">Preț/L (€):</label>
              <input type="number" id="fuelPrice" step="0.01" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;" placeholder="1.45"/></div>
            <button class="control-btn" style="background:#27ae60;color:white;border-color:#27ae60;" onclick="app.saveFuelData()">💾 Salvează Alimentare</button>
          </div>
        </div>
      </div>`;
    document.querySelector('.content')?.appendChild(newPage);
  }

  loadReportsPage() {
    const page = document.getElementById('pageReports');
    if (page) return;
    const stats = this.timeTracker.getTodayStats ? this.timeTracker.getTodayStats() : {driving:0,break:0,work:0,other:0};
    const newPage = document.createElement('div');
    newPage.className='page'; newPage.id='pageReports';
    newPage.innerHTML = `
      <div class="page-content">
        <h2 class="page-title">Rapoarte și Istoric</h2>
        <div class="card">
          <h3 class="card-title">Detalii Program Curent</h3>
          <div style="background:#f8f9fa;border-radius:8px;padding:15px;">
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ecf0f1;">
              <span style="font-weight:500;color:#7f8c8d;">Program început la:</span>
              <span style="font-weight:bold;color:#2c3e50;">${this.programStartTime?this.formatTime(this.programStartTime):'-'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ecf0f1;">
              <span style="font-weight:500;color:#7f8c8d;">Conducere:</span>
              <span style="font-weight:bold;color:#2c3e50;">${this.formatDuration(stats.driving)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ecf0f1;">
              <span style="font-weight:500;color:#7f8c8d;">Pauze:</span>
              <span style="font-weight:bold;color:#2c3e50;">${this.formatDuration(stats.break)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;">
              <span style="font-weight:500;color:#7f8c8d;">Alte activități:</span>
              <span style="font-weight:bold;color:#2c3e50;">${this.formatDuration(stats.work + stats.other)}</span>
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

  // =========================
  // ===== Settings/Save =====
  // =========================
  saveSettings() {
    const settings = {
      darkMode:    document.getElementById('darkModeToggle')?.checked || false,
      voiceControl:document.getElementById('voiceControlToggle')?.checked || false,
      soundAlerts: document.getElementById('soundAlertsToggle')?.checked || false
    };
    const driverData = {
      name:        document.getElementById('settingDriverName')?.value || '',
      truckNumber: document.getElementById('settingTruckNumber')?.value || ''
    };
    this.dataManager.saveSettings(settings);
    this.dataManager.saveDriverData(driverData);

    const n = document.getElementById('driverName');   if (n) n.textContent = driverData.name;
    const t = document.getElementById('truckNumber');  if (t) t.textContent = `Camion #${driverData.truckNumber}`;

    this.showToast('Setări salvate cu succes!');
  }

  toggleDarkMode() {
    const isDark = !!document.getElementById('darkModeToggle')?.checked;
    document.body.classList.toggle('dark-mode', isDark);
    const settings = this.dataManager.getSettings() || {};
    settings.darkMode = isDark;
    this.dataManager.saveSettings(settings);
    this.showToast(isDark ? 'Mod întunecat activat' : 'Mod luminos activat');
  }

  // =========================
  // ===== Periodic UI =======
  // =========================
  updateUI() {
    if (!this.programStarted) return;

    if (this.activityStartTime) {
      const d = Date.now() - this.activityStartTime.getTime();
      const el = document.getElementById('activityTime'); if (el) el.textContent = this.formatDuration(d);
    }
    if (this.programStartTime) {
      const d = Date.now() - this.programStartTime.getTime();
      const el = document.getElementById('totalProgramTime'); if (el) el.textContent = this.formatDuration(d);
    }
    this.updateProgressRings();
  }

  updateProgressRings() {
    const s = this.timeTracker.getTodayStats ? this.timeTracker.getTodayStats() : {driving:0,break:0,work:0,other:0};
    const total = s.driving + s.break + s.work + s.other;
    if (total <= 0) return;

    const pct = v => Math.round((v/total)*100);
    const ring = (elId, color, percent) => {
      const deg = (percent/100)*360;
      const el  = document.getElementById(elId);
      if (el) el.style.background = `conic-gradient(${color} ${deg}deg, #ecf0f1 ${deg}deg)`;
    };
    ring('drivingProgress', '#3498db', pct(s.driving));
    ring('breakProgress',   '#27ae60', pct(s.break));
    ring('workProgress',    '#f39c12', pct(s.work + s.other));

    const dp = document.getElementById('drivingPercentage'); if (dp) dp.textContent = `${pct(s.driving)}%`;
    const bp = document.getElementById('breakPercentage');   if (bp) bp.textContent = `${pct(s.break)}%`;
    const wp = document.getElementById('workPercentage');    if (wp) wp.textContent = `${pct(s.work + s.other)}%`;
  }

  updateNetworkStatus() {
    const el = document.getElementById('networkStatus');
    if (!el) return;
    if (navigator.onLine) el.innerHTML = '<span class="status-dot status-online"></span>Online';
    else el.innerHTML = '<span class="status-dot status-offline"></span>Offline Ready';
  }

  async loadWeatherData() {
    const temp = document.getElementById('weatherTemp');
    const desc = document.getElementById('weatherDesc');
    try {
      await new Promise(r=>setTimeout(r, 1500)); // simulate fetch
      const weather = {
        temperature: Math.round(Math.random()*20+5),
        description: ['☀️ Însorit','☁️ Înnorat','🌧️ Ploios','❄️ Ninsoare'][Math.floor(Math.random()*4)],
        location: 'Stockholm'
      };
      if (temp) temp.textContent = `${weather.temperature}°C`;
      if (desc) desc.textContent = `${weather.description} • ${weather.location}`;
      console.log('[DriverApp] 🌤️ weather loaded');
    } catch (e) {
      console.error('Weather load failed', e);
      if (temp) temp.textContent = '--°C';
      if (desc) desc.textContent = 'Informații meteo indisponibile';
    }
  }

  // =========================
  // ====== Exports/Fuel =====
  // =========================
  exportToPDF(){ this.showToast('📄 Export PDF în curs...'); setTimeout(()=>this.showToast('✅ Raport PDF generat!'),1500); }
  exportToExcel(){ this.showToast('📊 Export Excel în curs...'); setTimeout(()=>this.showToast('✅ Raport Excel generat!'),1500); }
  sendEmail(){ this.showToast('📧 Trimitere email...'); setTimeout(()=>this.showToast('✅ Email trimis!'),1500); }

  saveFuelData() {
    const amount = parseFloat(document.getElementById('fuelAmount')?.value || '0');
    const price  = parseFloat(document.getElementById('fuelPrice')?.value  || '0');
    if (!amount || !price) { this.showToast('❌ Completează toate câmpurile'); return; }
    const record = { amount, price, timestamp: new Date().toISOString(), totalCost: amount*price };
    this.dataManager.saveFuelData(record);
    const a = document.getElementById('fuelAmount'); if (a) a.value = '';
    const p = document.getElementById('fuelPrice');  if (p) p.value = '';
    this.showToast('⛽ Alimentare salvată cu succes!');
  }

  // =========================
  // ======= Utilities =======
  // =========================
  formatTime(date){
    return date.toLocaleTimeString('ro-RO',{hour12:false,hour:'2-digit',minute:'2-digit'});
  }
  formatDuration(ms){
    const s  = Math.floor(ms/1000);
    const hh = String(Math.floor(s/3600)).padStart(2,'0');
    const mm = String(Math.floor((s%3600)/60)).padStart(2,'0');
    const ss = String(s%60).padStart(2,'0');
    return `${hh}:${mm}:${ss}`;
  }
  showToast(message){
    const t = document.getElementById('toast');
    if (!t) return console.log('[Toast]', message);
    t.textContent = message;
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(()=>{
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(-20px)';
    }, 3000);
  }
}

// ======== Global bindings for HTML event handlers ========
let app;

function initializeApp(){ app = new DriverApp(); }
function startProgram(){ app?.startProgram(); }
function endProgram(){ app?.endProgram(); }
function setActivity(type, name, button){ app?.setActivity(type, name, button); }
function toggleVoiceControl(){ app?.toggleVoiceControl(); }
function switchTab(el, tab){ app?.switchTab(el, tab); }
function saveSettings(){ app?.saveSettings(); }
function toggleDarkMode(){ app?.toggleDarkMode(); }
function hideAlert(){ document.getElementById('alertPanel')?.classList.remove('show'); }

// Visibility (battery hints)
document.addEventListener('visibilitychange', () => {
  if (!app) return;
  if (document.hidden) console.log('📱 App backgrounded');
  else console.log('📱 App foregrounded');
});

console.log('📱 Driver Support App - JS loaded');