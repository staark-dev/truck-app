// Driver Support App - Main Application Logic (robust)

// ----------------------------------------------------
// Helper: log short prefix
const LOG = (...a) => console.log('[DriverApp]', ...a);

// ----------------------------------------------------
class DriverApp {
  constructor() {
    // State
    this.programStarted   = false;
    this.currentActivity  = null;
    this.programStartTime = null;
    this.activityStartTime= null;
    this.voiceListening   = false;
    this.currentTab       = 'program';

    // Components (tolerant la absență)
    try { this.dataManager = new DataManager(); }   catch (e) { console.warn('DataManager init error:', e); }
    try { this.timeTracker = new TimeTracker(); }   catch (e) { console.warn('TimeTracker init error:', e); }
    try { this.locationService = new LocationService(); } catch (e) { console.warn('LocationService init error:', e); }
    try { this.alertSystem = new AlertSystem(); }   catch (e) { console.warn('AlertSystem init error:', e); }

    // Boot
    this.initializeApp();
  }

  initializeApp() {
    LOG('🚛 initializing…');

    // 1) Load saved data/UI
    this.loadSavedData();

    // 2) Initialize services (dacă există)
    try { this.locationService?.initialize?.(); } catch (e) { console.warn('locationService.initialize failed', e); }
    try { this.alertSystem?.initialize?.(); }     catch (e) { console.warn('alertSystem.initialize failed', e); }

    // 3) Events
    this.setupEventListeners();

    // 4) First UI paint
    this.updateNetworkStatus();
    this.loadWeatherData();

    // 5) Periodic updates
    this._uiTimer     = setInterval(() => this.updateUI(), 1000);
    this._netTimer    = setInterval(() => this.updateNetworkStatus(), 30000);

    LOG('✅ App initialized');
  }

  // ----------------------- Persistence / Restore

  loadSavedData() {
    const settings    = (this.dataManager?.getSettings?.()    || {});
    const driverData  = (this.dataManager?.getDriverData?.()  || {});
    const sessionData = (this.dataManager?.getSessionData?.() || {});

    // Theme
    if (settings.darkMode) {
      document.body.classList.add('dark-mode');
      const dm = document.getElementById('darkModeToggle'); if (dm) dm.checked = true;
    }
    const vc = document.getElementById('voiceControlToggle'); if (vc && settings.voiceControl !== undefined) vc.checked = settings.voiceControl;
    const sa = document.getElementById('soundAlertsToggle');  if (sa && settings.soundAlerts  !== undefined) sa.checked  = settings.soundAlerts;

    // Driver info
    if (driverData.name) {
      const dn = document.getElementById('driverName');            if (dn)  dn.textContent = driverData.name;
      const sdn= document.getElementById('settingDriverName');     if (sdn) sdn.value = driverData.name;
    }
    if (driverData.truckNumber) {
      const tn = document.getElementById('truckNumber');           if (tn)  tn.textContent = `Camion #${driverData.truckNumber}`;
      const stn= document.getElementById('settingTruckNumber');    if (stn) stn.value = driverData.truckNumber;
    }

    // Restore session
    if (sessionData.isActive) {
      this.restoreSession(sessionData);
    }
  }

  restoreSession(sessionData) {
    try {
      LOG('🔄 restoring session…');

      this.programStarted   = true;
      this.programStartTime = new Date(sessionData.startTime);

      const startBtn   = document.getElementById('startButton');
      const statusCard = document.getElementById('statusCard');
      const controls   = document.getElementById('controlButtons');
      if (startBtn)   startBtn.style.display = 'none';
      if (statusCard) statusCard.classList.add('show');
      if (controls)   controls.classList.add('show');

      const cs  = document.getElementById('currentState');     if (cs)  cs.textContent = 'Program activ';
      const pst = document.getElementById('programStartTime'); if (pst) pst.textContent = this.formatTime(this.programStartTime);
      const ca  = document.getElementById('currentActivity');  if (ca)  ca.textContent = 'Așteptare activitate';

      // Reinstate current activity (map la buton)
      if (sessionData.currentActivity) {
        const type  = sessionData.currentActivity.type || 'other';
        const name  = sessionData.currentActivity.name || '';
        const btnId = ({ driving:'btnDriving', break:'btnBreak', work:'btnWork', other:'btnOther' }[type]) || 'btnOther';
        const btn   = document.getElementById(btnId);
        this.setActivity(type, name, btn);
      }

      this.showToast('Sesiune restaurată');
    } catch (e) {
      console.error('restoreSession error:', e);
      this.showToast('⚠️ Eroare la restaurarea sesiunii');
    }
  }

  // ----------------------- Events / UX

  setupEventListeners() {
    // Touch micro-feedback
    document.querySelectorAll('.control-btn, .nav-item').forEach(btn => {
      btn.addEventListener('touchstart',  e => { btn.style.transform = 'scale(0.96)'; }, { passive: true });
      btn.addEventListener('touchend',    e => { btn.style.transform = 'scale(1)';    }, { passive: true });
      btn.addEventListener('touchcancel', e => { btn.style.transform = 'scale(1)';    }, { passive: true });
    });

    // Fără context menu (long press)
    document.addEventListener('contextmenu', e => e.preventDefault());

    // Visibility hints
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { LOG('📱 backgrounded – throttling'); }
      else { LOG('📱 foregrounded – resume'); this.updateUI(); }
    });
  }

  // ----------------------- Program lifecycle

  startProgram() {
    if (this.programStarted) return;

    LOG('▶️ start program');

    this.programStarted   = true;
    this.programStartTime = new Date();

    // UI
    const startBtn   = document.getElementById('startButton');
    const statusCard = document.getElementById('statusCard');
    const controls   = document.getElementById('controlButtons');
    if (startBtn)   startBtn.style.display = 'none';
    if (statusCard) statusCard.classList.add('show');
    if (controls)   controls.classList.add('show');

    const cs  = document.getElementById('currentState');     if (cs)  cs.textContent = 'Program activ';
    const pst = document.getElementById('programStartTime'); if (pst) pst.textContent = this.formatTime(this.programStartTime);
    const ca  = document.getElementById('currentActivity');  if (ca)  ca.textContent  = 'Așteptare activitate';

    // Persist session
    try {
      this.dataManager?.saveSessionData?.({
        isActive: true,
        startTime: this.programStartTime.toISOString(),
        activities: []
      });
    } catch (e) { console.warn('saveSessionData failed', e); }

    // Start tracking
    try { this.timeTracker?.startProgram?.(this.programStartTime); } catch (e) { console.warn('timeTracker.startProgram failed', e); }

    // Compliance alerts
    try { this.alertSystem?.scheduleComplianceAlerts?.(); } catch (e) { console.warn('alert schedule failed', e); }

    this.showToast('Program pornit cu succes!');

    // demo alert mic
    setTimeout(() => {
      try { this.alertSystem?.showAlert?.('info', 'Sistem de monitorizare activ'); } catch {}
    }, 5000);
  }

  endProgram() {
    if (!this.programStarted) return;
    if (typeof confirm === 'function' && !confirm('Sigur doriți să terminați programul?')) return;

    LOG('⏹️ end program');

    this.programStarted   = false;
    this.currentActivity  = null;
    this.programStartTime = null;
    this.activityStartTime= null;

    // UI reset
    const startBtn = document.getElementById('startButton');
    const statusCard = document.getElementById('statusCard');
    const controls = document.getElementById('controlButtons');
    if (startBtn)   startBtn.style.display = 'block';
    if (statusCard) statusCard.classList.remove('show');
    if (controls)   controls.classList.remove('show');
    document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));

    // Persist & report
    try {
      const sessionData = this.timeTracker?.endProgram?.();
      this.dataManager?.saveSessionData?.({ isActive: false });
      if (sessionData) this.dataManager?.saveDailyReport?.(sessionData);
    } catch (e) { console.warn('saving end program failed', e); }

    // Clear alerts
    try { this.alertSystem?.clearAlerts?.(); } catch {}

    this.showToast('Program terminat!');
  }

  // ----------------------- Activities

  setActivity(activityType, activityName = '', button) {
    try {
      if (!this.programStarted) { console.warn('setActivity: program not started – ignore'); return false; }

      const VALID = ['driving', 'break', 'work', 'other'];
      const type  = VALID.includes(activityType) ? activityType : 'other';
      const labelMap = { driving: 'Condus', break: 'Pauză', work: 'Muncă', other: 'Alte activități' };
      const name  = activityName || labelMap[type];

      LOG(`🎯 setActivity -> ${type} (${name})`);

      // UI active button (fail-safe)
      try {
        document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
        if (button && button.classList) button.classList.add('active');
      } catch (e) { console.warn('toggle button state failed', e); }

      // end previous
      if (this.currentActivity && this.timeTracker?.endActivity) {
        try { this.timeTracker.endActivity(); } catch (e) { console.warn('endActivity failed', e); }
      }

      // set
      this.currentActivity   = { type, name };
      this.activityStartTime = new Date();

      // label
      const ca = document.getElementById('currentActivity');
      if (ca) ca.textContent = name; else console.warn('#currentActivity not found');

      // tracker
      if (this.timeTracker?.startActivity) {
        try { this.timeTracker.startActivity(type, this.activityStartTime); }
        catch (e) { console.warn('startActivity failed', e); }
      } else {
        console.warn('timeTracker missing');
      }

      // persist
      if (this.dataManager?.getSessionData && this.dataManager?.saveSessionData) {
        try {
          const session = this.dataManager.getSessionData() || {};
          session.currentActivity = this.currentActivity;
          this.dataManager.saveSessionData(session);
        } catch (e) { console.warn('save session currentActivity failed', e); }
      }

      // compliance
      if (type === 'driving' && this.alertSystem?.checkDrivingCompliance) {
        try { this.alertSystem.checkDrivingCompliance(); } catch (e) { console.warn('compliance check failed', e); }
      }

      this.showToast(`Activitate: ${name}`);
      return true;

    } catch (err) {
      console.error('❌ setActivity error:', err);
      try { this.alertSystem?.showAlert?.('error', 'A apărut o problemă la schimbarea activității.'); } catch {}
      return false;
    }
  }

  // ----------------------- Voice

  toggleVoiceControl() {
    const settings = this.dataManager?.getSettings?.() || {};
    if (!settings.voiceControl) { this.showToast('Control vocal dezactivat în setări'); return; }

    const btn = document.getElementById('voiceBtn');
    this.voiceListening = !this.voiceListening;

    if (this.voiceListening) {
      if (btn) { btn.classList.add('listening'); btn.textContent = '🎙️'; }
      this.showToast('Ascult... Spune comanda!');

      // demo
      setTimeout(() => {
        this.voiceListening = false;
        if (btn) { btn.classList.remove('listening'); btn.textContent = '🎤'; }
        const commands = ['Start pauză', 'Start condus', 'Status', 'Termină program'];
        const cmd = commands[Math.floor(Math.random()*commands.length)];
        this.processVoiceCommand(cmd);
      }, 3000);
    } else {
      if (btn) { btn.classList.remove('listening'); btn.textContent = '🎤'; }
      this.showToast('Control vocal oprit');
    }
  }

  processVoiceCommand(command) {
    LOG('🎤', command);
    const c = (command||'').toLowerCase();

    if (c.includes('start pauză') || c.includes('pauză')) {
      if (this.programStarted) this.setActivity('break', 'Pauză', document.getElementById('btnBreak'));
    } else if (c.includes('start condus') || c.includes('condus')) {
      if (this.programStarted) this.setActivity('driving', 'Condus', document.getElementById('btnDriving'));
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
    const total   = this.timeTracker?.getTotalProgramTime?.() || 0;
    const driving = this.timeTracker?.getActivityTime?.('driving') || 0;
    const act     = this.currentActivity ? this.currentActivity.name : 'Nicio activitate';
    this.showToast(`🔊 Status: ${act}. Program: ${this.formatDuration(total)}. Condus: ${this.formatDuration(driving)}`);
  }

  // ----------------------- Tabs / Lazy pages

  switchTab(element, tabName) {
    LOG('📱 switch ->', tabName);
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    if (element) element.classList.add('active');

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const map = { program:'pageProgram', gps:'pageGPS', fuel:'pageFuel', reports:'pageReports', settings:'pageSettings' };
    const target = document.getElementById(map[tabName]);
    if (target) { target.classList.add('active'); this.currentTab = tabName; this.loadPageContent(tabName); }

    this.showToast(tabName.charAt(0).toUpperCase() + tabName.slice(1));
  }

  loadPageContent(tabName) {
    if (tabName === 'gps') this.loadGPSPage();
    if (tabName === 'fuel') this.loadFuelPage();
    if (tabName === 'reports') this.loadReportsPage();
  }

  loadGPSPage() {
    const wrap = document.getElementById('gpsContent');
    if (!wrap || !wrap.innerHTML.includes('Încărcare')) return;

    setTimeout(() => {
      wrap.innerHTML = `
        <div style="background:#f8f9fa;border-radius:8px;padding:15px;margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;">
            <div style="width:30px;height:30px;border-radius:50%;background:#27ae60;display:flex;align-items:center;justify-content:center;color:#fff;">📍</div>
            <div><div style="font-weight:600;">GPS Conectat</div><div style="font-size:12px;color:#7f8c8d;">Precizie: ±3m</div></div>
          </div>
          <div style="font-weight:600;margin-bottom:8px;">Locația Curentă</div>
          <div>📍 E4, Stockholm, Suedia</div>
          <div>🕐 Ultimul update: acum 5 sec</div>
          <div>🚗 Viteză: 0 km/h (oprit)</div>
        </div>
        <div style="height:200px;background:linear-gradient(135deg,#74b9ff,#0984e3);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;margin-bottom:20px;">
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
    if (!page) {
      const container = document.querySelector('.content');
      if (!container) return;
      const newPage = document.createElement('div');
      newPage.className = 'page';
      newPage.id = 'pageFuel';
      newPage.innerHTML = `
        <div class="page-content">
          <h2 class="page-title">Management Combustibil</h2>
          <div style="background:linear-gradient(135deg,#fd79a8,#e84393);color:#fff;padding:20px;border-radius:12px;margin-bottom:20px;">
            <h3 style="margin-bottom:15px;">⛽ Status Combustibil</h3>
            <div style="font-size:24px;font-weight:700;text-align:center;margin-bottom:15px;">76% • 380L</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
              <div style="text-align:center;"><div style="font-size:18px;font-weight:700;">8.2L</div><div style="font-size:12px;opacity:.9;">Consum/100km</div></div>
              <div style="text-align:center;"><div style="font-size:18px;font-weight:700;">520km</div><div style="font-size:12px;opacity:.9;">Autonomie</div></div>
            </div>
          </div>
          <div class="card">
            <h3 class="card-title">Adaugă Alimentare</h3>
            <div style="display:grid;gap:15px;">
              <div><label style="font-weight:500;display:block;margin-bottom:5px;">Cantitate (L):</label><input type="number" id="fuelAmount" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;" placeholder="Litri combustibil..." /></div>
              <div><label style="font-weight:500;display:block;margin-bottom:5px;">Preț/L (€):</label><input type="number" id="fuelPrice" step="0.01" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;" placeholder="1.45" /></div>
              <button class="control-btn" style="background:#27ae60;color:#fff;border-color:#27ae60;" onclick="app.saveFuelData()">💾 Salvează Alimentare</button>
            </div>
          </div>
        </div>`;
      container.appendChild(newPage);
    }
  }

  loadReportsPage() {
    const page = document.getElementById('pageReports');
    if (!page) {
      const container = document.querySelector('.content');
      if (!container) return;
      const stats = this.timeTracker?.getTodayStats?.() || { driving:0, break:0, work:0, other:0 };
      const newPage = document.createElement('div');
      newPage.className = 'page';
      newPage.id = 'pageReports';
      newPage.innerHTML = `
        <div class="page-content">
          <h2 class="page-title">Rapoarte și Istoric</h2>
          <div class="card">
            <h3 class="card-title">Detalii Program Curent</h3>
            <div style="background:#f8f9fa;border-radius:8px;padding:15px;">
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ecf0f1;">
                <span style="font-weight:500;color:#7f8c8d;">Program început la:</span>
                <span style="font-weight:700;color:#2c3e50;">${this.programStartTime ? this.formatTime(this.programStartTime) : '-'}</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ecf0f1;">
                <span style="font-weight:500;color:#7f8c8d;">Conducere:</span>
                <span style="font-weight:700;color:#2c3e50;">${this.formatDuration(stats.driving)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ecf0f1;">
                <span style="font-weight:500;color:#7f8c8d;">Pauze:</span>
                <span style="font-weight:700;color:#2c3e50;">${this.formatDuration(stats.break)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;">
                <span style="font-weight:500;color:#7f8c8d;">Alte activități:</span>
                <span style="font-weight:700;color:#2c3e50;">${this.formatDuration(stats.work + stats.other)}</span>
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
      container.appendChild(newPage);
    }
  }

  // ----------------------- Settings

  saveSettings() {
    const settings = {
      darkMode:    !!document.getElementById('darkModeToggle')?.checked,
      voiceControl:!!document.getElementById('voiceControlToggle')?.checked,
      soundAlerts: !!document.getElementById('soundAlertsToggle')?.checked
    };
    const driverData = {
      name:        document.getElementById('settingDriverName')?.value || '',
      truckNumber: document.getElementById('settingTruckNumber')?.value || ''
    };

    try { this.dataManager?.saveSettings?.(settings); }  catch (e) { console.warn('saveSettings failed', e); }
    try { this.dataManager?.saveDriverData?.(driverData); } catch (e) { console.warn('saveDriverData failed', e); }

    const dn = document.getElementById('driverName'); if (dn) dn.textContent = driverData.name;
    const tn = document.getElementById('truckNumber'); if (tn) tn.textContent = `Camion #${driverData.truckNumber}`;

    this.showToast('Setări salvate cu succes!');
  }

  toggleDarkMode() {
    const toggle = document.getElementById('darkModeToggle');
    const isDark = !!toggle?.checked;
    document.body.classList.toggle('dark-mode', isDark);

    const settings = this.dataManager?.getSettings?.() || {};
    settings.darkMode = isDark;
    try { this.dataManager?.saveSettings?.(settings); } catch {}
    this.showToast(isDark ? 'Mod întunecat activat' : 'Mod luminos activat');
  }

  // ----------------------- UI updates

  updateUI() {
    if (!this.programStarted) return;

    if (this.activityStartTime) {
      const dur = Date.now() - this.activityStartTime.getTime();
      const el  = document.getElementById('activityTime');
      if (el) el.textContent = this.formatDuration(dur);
    }

    if (this.programStartTime) {
      const total = Date.now() - this.programStartTime.getTime();
      const el    = document.getElementById('totalProgramTime');
      if (el) el.textContent = this.formatDuration(total);
    }

    this.updateProgressRings();
  }

  updateProgressRings() {
    const s = this.timeTracker?.getTodayStats?.() || { driving:0, break:0, work:0, other:0 };
    const total = s.driving + s.break + s.work + s.other;
    if (!total) return;

    const pct = {
      driving: Math.round((s.driving / total) * 100),
      break:   Math.round((s.break   / total) * 100),
      work:    Math.round(((s.work + s.other) / total) * 100)
    };

    const setRing = (id, color, value) => {
      const deg = (value / 100) * 360;
      const ring = document.getElementById(id);
      if (ring) ring.style.background = `conic-gradient(${color} ${deg}deg, #ecf0f1 ${deg}deg)`;
    };
    setRing('drivingProgress', '#3498db', pct.driving);
    setRing('breakProgress',   '#27ae60', pct.break);
    setRing('workProgress',    '#f39c12', pct.work);

    const dp = document.getElementById('drivingPercentage'); if (dp) dp.textContent = `${pct.driving}%`;
    const bp = document.getElementById('breakPercentage');   if (bp) bp.textContent = `${pct.break}%`;
    const wp = document.getElementById('workPercentage');    if (wp) wp.textContent = `${pct.work}%`;
  }

  updateNetworkStatus() {
    const el = document.getElementById('networkStatus');
    if (!el) return;
    el.innerHTML = navigator.onLine
      ? '<span class="status-dot status-online"></span>Online'
      : '<span class="status-dot status-offline"></span>Offline Ready';
  }

  async loadWeatherData() {
    const temp = document.getElementById('weatherTemp');
    const desc = document.getElementById('weatherDesc');
    if (!temp && !desc) { console.warn('weather placeholders missing'); return; }

    try {
      // mock fetch
      await new Promise(r => setTimeout(r, 1200));
      const w = {
        temperature: Math.round(Math.random() * 20 + 5),
        description: ['☀️ Însorit','☁️ Înnorat','🌧️ Ploios','❄️ Ninsoare'][Math.floor(Math.random()*4)],
        location: 'Stockholm'
      };
      if (temp) temp.textContent = `${w.temperature}°C`;
      if (desc) desc.textContent = `${w.description} • ${w.location}`;
      LOG('🌤️ weather loaded');
    } catch (e) {
      console.error('weather error', e);
      if (temp) temp.textContent = '--°C';
      if (desc) desc.textContent = 'Informații meteo indisponibile';
    }
  }

  // ----------------------- Export & fuel

  exportToPDF() {
    this.showToast('📄 Export PDF în curs…');
    setTimeout(() => this.showToast('✅ Raport PDF generat!'), 1500);
  }
  exportToExcel() {
    this.showToast('📊 Export Excel în curs…');
    setTimeout(() => this.showToast('✅ Raport Excel generat!'), 1500);
  }
  sendEmail() {
    this.showToast('📧 Trimitere email…');
    setTimeout(() => this.showToast('✅ Email trimis!'), 1500);
  }

  saveFuelData() {
    const amount = parseFloat(document.getElementById('fuelAmount')?.value || '');
    const price  = parseFloat(document.getElementById('fuelPrice') ?.value || '');
    if (!amount || !price) { this.showToast('❌ Completează toate câmpurile'); return; }

    const fuel = { amount, price, timestamp: new Date().toISOString(), totalCost: amount * price };
    try { this.dataManager?.saveFuelData?.(fuel); } catch (e) { console.warn('saveFuelData failed', e); }

    const a = document.getElementById('fuelAmount'); if (a) a.value = '';
    const p = document.getElementById('fuelPrice');  if (p) p.value = '';
    this.showToast('⛽ Alimentare salvată cu succes!');
  }

  // ----------------------- Utils

  formatTime(date) {
    try {
      return date.toLocaleTimeString('ro-RO', { hour12:false, hour:'2-digit', minute:'2-digit' });
    } catch { return '--:--'; }
  }

  formatDuration(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = n => n.toString().padStart(2,'0');
    return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) { console.log('[Toast]', message); return; }
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-20px)';
    }, 3000);
  }
}

// ----------------------- Global wrappers (pentru HTML handlers)

let app;

function initializeApp() { app = new DriverApp(); }
function startProgram()   { app?.startProgram?.(); }
function endProgram()     { app?.endProgram?.(); }
function setActivity(type, name, button) { app?.setActivity?.(type, name, button); }
function toggleVoiceControl() { app?.toggleVoiceControl?.(); }
function switchTab(element, tabName) { app?.switchTab?.(element, tabName); }
function saveSettings() { app?.saveSettings?.(); }
function toggleDarkMode() { app?.toggleDarkMode?.(); }
function hideAlert() { document.getElementById('alertPanel')?.classList.remove('show'); }

// Visibility hints
document.addEventListener('visibilitychange', () => {
  if (!app) return;
  if (document.hidden) LOG('📱 backgrounded');
  else LOG('📱 foregrounded');
});

console.log('📱 Driver Support App — app.js loaded');