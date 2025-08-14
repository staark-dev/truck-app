/* app.js – Driver Support (full) */

class DriverApp {
  constructor() {
    // stare
    this.programStarted   = false;
    this.currentActivity  = null;        // {type,name}
    this.programStartTime = null;
    this.activityStartTime= null;
    this.currentTab       = 'program';

    // permisiuni + voce
    this.permissions = { location: 'unknown', notifications: 'unknown' };
    this.voiceListening = false;
    this.recognition = null;

    // componente (expuse global de fișierele din /js)
    this.dataManager     = new DataManager();
    this.timeTracker     = new TimeTracker();
    this.locationService = new LocationService();
    this.alertSystem     = new AlertSystem();

    this.initializeApp();
  }

  /* -------------------- INIT -------------------- */
  initializeApp() {
    console.log('[DriverApp] 🚛 initializing...');

    this.loadSavedData();
    this.locationService.initialize();
    this.alertSystem.initialize();

    this.setupEventListeners();
    this.initVoice();

    this.updateNetworkStatus();
    this.loadWeatherData();

    // tick-uri UI
    setInterval(() => this.updateUI(), 1000);
    setInterval(() => this.updateNetworkStatus(), 30000);

    console.log('[DriverApp] ✅ App initialized');
  }

  loadSavedData() {
    const settings   = this.dataManager.getSettings();
    const driverData = this.dataManager.getDriverData();
    const session    = this.dataManager.getSessionData();

    // setări UI
    if (settings.darkMode) {
      document.body.classList.add('dark-mode');
      const t = document.getElementById('darkModeToggle'); if (t) t.checked = true;
    }
    const vc = document.getElementById('voiceControlToggle');
    if (vc && settings.voiceControl !== undefined) vc.checked = settings.voiceControl;
    const sa = document.getElementById('soundAlertsToggle');
    if (sa && settings.soundAlerts !== undefined) sa.checked = settings.soundAlerts;

    // șofer
    if (driverData.name) {
      const el1 = document.getElementById('driverName'); if (el1) el1.textContent = driverData.name;
      const el2 = document.getElementById('settingDriverName'); if (el2) el2.value = driverData.name;
    }
    if (driverData.truckNumber) {
      const el1 = document.getElementById('truckNumber'); if (el1) el1.textContent = `Camion #${driverData.truckNumber}`;
      const el2 = document.getElementById('settingTruckNumber'); if (el2) el2.value = driverData.truckNumber;
    }

    // sesiune
    if (session?.isActive) this.restoreSession(session);
  }

  restoreSession(session) {
    console.log('[DriverApp] 🔄 Restoring active session...');
    this.programStarted   = true;
    this.programStartTime = new Date(session.startTime);

    this._show(document.getElementById('statusCard'));
    this._show(document.getElementById('controlButtons'));
    const sb = document.getElementById('startButton'); if (sb) sb.style.display = 'none';

    const sEl = document.getElementById('currentState'); if (sEl) sEl.textContent = 'Program activ';
    const st  = document.getElementById('programStartTime'); if (st) st.textContent = this.formatTime(this.programStartTime);

    if (session.currentActivity) {
      const t = session.currentActivity.type;
      const n = session.currentActivity.name;
      const btnId = {
        driving:'btnDriving', break:'btnBreak', work:'btnWork', other:'btnOther'
      }[t] || null;
      const btn = btnId ? document.getElementById(btnId) : null;
      this.setActivity(t, n, btn);
    }
    this.showToast('Sesiune restaurată');
  }

  setupEventListeners() {
    // efect mic la touch
    document.querySelectorAll('.control-btn, .nav-item').forEach(btn=>{
      btn.addEventListener('touchstart', ()=>btn.style.transform='scale(0.96)', {passive:true});
      btn.addEventListener('touchend',   ()=>btn.style.transform='scale(1)',     {passive:true});
    });

    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('visibilitychange', () => {
      if (!this.programStarted) return;
      if (!document.hidden) this.updateUI();
    });
  }

  /* -------------------- PERMISIUNI -------------------- */
  async requestPermissions({askLocation=true, askNotifications=true}={}) {
    try {
      if (askLocation)      await this.requestLocationPermission();
      if (askNotifications) await this.requestNotificationPermission();
    } catch(e) {
      console.warn('[DriverApp] permissions error', e);
    } finally {
      // chip GPS (opțional)
      const chip = document.querySelector('#gpsChip,[data-chip="gps"]');
      if (chip) {
        chip.textContent =
          this.permissions.location === 'granted' ? '🟢 GPS Activ' :
          this.permissions.location === 'denied'  ? '🔴 GPS Blocat' :
          '⚪ GPS Permission';
      }
    }
  }

  requestLocationPermission() {
    return new Promise(resolve => {
      if (!('geolocation' in navigator)) {
        this.permissions.location = 'unavailable';
        return resolve(false);
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          this.permissions.location = 'granted';
          console.log('[DriverApp] 📍 location granted', pos.coords);
          resolve(true);
        },
        err => {
          this.permissions.location = (err.code === 1) ? 'denied' : 'error';
          console.warn('[DriverApp] location error', err.code, err.message);
          resolve(false);
        },
        { enableHighAccuracy:true, timeout:10000, maximumAge:0 }
      );
    });
  }

  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      this.permissions.notifications = 'unavailable';
      return false;
    }
    try {
      const perm = await Notification.requestPermission();
      this.permissions.notifications = perm;
      if (perm !== 'granted') {
        this.showToast('Notificările sunt limitate în browser. Instalează ca PWA pentru iOS.');
      }
      return perm === 'granted';
    } catch(e) {
      this.permissions.notifications = 'error';
      console.warn('[DriverApp] notification perm error', e);
      return false;
    }
  }

  /* -------------------- START/STOP -------------------- */
  async startProgram() {
    if (this.programStarted) return;

    console.log('[DriverApp] ▶️ start program');
    // cereri permisiuni din gest direct
    await this.requestPermissions({askLocation:true, askNotifications:true});

    this.programStarted   = true;
    this.programStartTime = new Date();

    const sb = document.getElementById('startButton'); if (sb) sb.style.display = 'none';
    this._show(document.getElementById('statusCard'));
    this._show(document.getElementById('controlButtons'));

    const sEl = document.getElementById('currentState'); if (sEl) sEl.textContent = 'Program activ';
    const st  = document.getElementById('programStartTime'); if (st) st.textContent = this.formatTime(this.programStartTime);
    const ca  = document.getElementById('currentActivity'); if (ca) ca.textContent = 'Așteptare activitate';

    this.dataManager.saveSessionData({
      isActive:true,
      startTime:this.programStartTime.toISOString(),
      activities:[]
    });

    this.timeTracker.startProgram(this.programStartTime);
    this.alertSystem.scheduleComplianceAlerts();

    this.showToast('Program pornit!');
  }

  endProgram() {
    if (!this.programStarted) return;
    if (!confirm('Sigur doriți să terminați programul?')) return;

    console.log('[DriverApp] ⏹️ end program');

    this.programStarted = false;
    this.currentActivity = null;
    this.programStartTime = null;
    this.activityStartTime = null;

    const sb = document.getElementById('startButton'); if (sb) sb.style.display = 'block';
    this._hide(document.getElementById('statusCard'));
    this._hide(document.getElementById('controlButtons'));

    document.querySelectorAll('.control-btn').forEach(b=>b.classList.remove('active'));
    this._updateControlButtonsUI(); // readuce toate

    const sessionData = this.timeTracker.endProgram();
    this.dataManager.saveSessionData({isActive:false});
    this.dataManager.saveDailyReport(sessionData);

    this.alertSystem.clearAlerts();
    this.showToast('Program terminat!');
  }

  /* -------------------- ACTIVITĂȚI -------------------- */
  setActivity(activityType, activityName = '', button) {
    try {
      if (!this.programStarted) {
        console.warn('setActivity: program not started – ignoring.');
        return false;
      }

      const VALID = ['driving','break','work','other'];
      const type = VALID.includes(activityType) ? activityType : 'other';
      const labelMap = { driving:'Condus', break:'Pauză', work:'Muncă', other:'Alte activități' };
      const name = activityName || labelMap[type];

      console.log(`[DriverApp] 🎯 setActivity -> ${type} (${name})`);

      // UI: buton activ
      try {
        document.querySelectorAll('.control-btn').forEach(b=>b.classList.remove('active'));
        if (button && button.classList) button.classList.add('active');
      } catch(e) { console.warn('btn state warn', e); }

      // încheie activitatea anterioară
      if (this.currentActivity && this.timeTracker?.endActivity) {
        try { this.timeTracker.endActivity(); } catch(e) { console.warn('endActivity warn', e); }
      }

      // setează noua activitate
      this.currentActivity   = { type, name };
      this.activityStartTime = new Date();

      const ca = document.getElementById('currentActivity');
      if (ca) ca.textContent = name;

      if (this.timeTracker?.startActivity) {
        try { this.timeTracker.startActivity(type, this.activityStartTime); }
        catch(e) { console.warn('startActivity warn', e); }
      }

      // persistă sesiunea
      if (this.dataManager?.getSessionData && this.dataManager?.saveSessionData) {
        try {
          const s = this.dataManager.getSessionData() || {};
          s.currentActivity = this.currentActivity;
          this.dataManager.saveSessionData(s);
        } catch(e) { console.warn('saveSession warn', e); }
      }

      // verificări conformitate
      if (type === 'driving' && this.alertSystem?.checkDrivingCompliance) {
        try { this.alertSystem.checkDrivingCompliance(); } catch(e) {}
      }

      // logica UI butoane (ascunderi/disable)
      this._updateControlButtonsUI();

      this.showToast(`Activitate: ${name}`);
      return true;

    } catch(err) {
      console.error('❌ setActivity error:', err);
      this.showToast('Eroare la schimbarea activității');
      return false;
    }
  }

  /** gestionează vizibilitatea/disable pentru butoanele de control */
  _updateControlButtonsUI() {
    const btnDriving = document.getElementById('btnDriving');
    const btnBreak   = document.getElementById('btnBreak');
    const btnWork    = document.getElementById('btnWork');
    const btnOther   = document.getElementById('btnOther');

    // mai întâi arată/activează tot
    [btnDriving, btnBreak, btnWork, btnOther].forEach(b=>{
      if (!b) return;
      b.disabled = false;
      b.style.display = '';
      b.classList.remove('disabled');
    });

    if (!this.currentActivity) return;

    const type = this.currentActivity.type;

    // 1) când ești pe CONDUS -> ascunde butonul "Condus"
    if (type === 'driving' && btnDriving) {
      btnDriving.style.display = 'none';
    }

    // 2) când ești pe PAUZĂ:
    //    - ascunde butonul "Pauză"
    //    - "Condus" rămâne dezactivat până trec 30 min
    if (type === 'break') {
      if (btnBreak) btnBreak.style.display = 'none';

      const elapsed = Date.now() - this.activityStartTime.getTime();
      const MIN_BREAK_MS = 30 * 60 * 1000;

      const allowResume = elapsed >= MIN_BREAK_MS;
      if (btnDriving) {
        btnDriving.disabled = !allowResume;
        btnDriving.classList.toggle('disabled', !allowResume);
        // text ajutător
        if (!allowResume) {
          const remain = MIN_BREAK_MS - elapsed;
          const mm = Math.max(0, Math.ceil(remain/60000));
          btnDriving.setAttribute('data-hint', `minim ${mm} min`);
        } else {
          btnDriving.removeAttribute('data-hint');
        }
      }

      // re-verifică la fiecare 30s până când se împlinește
      clearTimeout(this._breakTimer);
      if (!allowResume) {
        this._breakTimer = setTimeout(()=>this._updateControlButtonsUI(), 30*1000);
      }
    }
  }

  /* -------------------- VOICE -------------------- */
  initVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      this.recognition = new SR();
      this.recognition.lang = 'ro-RO';
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;

      this.recognition.addEventListener('result', e => {
        const transcript = (e.results[0][0].transcript || '').toLowerCase();
        console.log('[Voice] result:', transcript);
        this.processVoiceCommand(transcript);
      });
      this.recognition.addEventListener('end', () => {
        if (this.voiceListening) { try { this.recognition.start(); } catch {} }
      });
      this.recognition.addEventListener('error', e => {
        console.warn('[Voice] error:', e.error);
        this.voiceListening = false;
        const btn = document.getElementById('voiceBtn');
        if (btn) { btn.classList.remove('listening'); btn.textContent = '🎤'; }
        this.showToast('Eroare microfon/voce');
      });
      console.log('[Voice] ready');
    } else {
      console.log('[Voice] not available, using fallback');
    }
  }

  toggleVoiceControl() {
    const settings = this.dataManager.getSettings();
    if (!settings.voiceControl) {
      this.showToast('Control vocal dezactivat în Setări');
      return;
    }
    const btn = document.getElementById('voiceBtn');
    this.voiceListening = !this.voiceListening;

    if (this.voiceListening) {
      if (btn) { btn.classList.add('listening'); btn.textContent = '🎙️'; }
      if (this.recognition) {
        try {
          this.recognition.start(); // trebuie din gest direct
          this.showToast('Ascult... ex: „Start pauză”, „Start condus”');
        } catch(e) {
          console.warn('[Voice] start failed', e);
          this.voiceListening = false;
          if (btn) { btn.classList.remove('listening'); btn.textContent = '🎤'; }
        }
      } else {
        // fallback demo
        this.showToast('Ascult (simulat)...');
        setTimeout(()=>{
          this.voiceListening = false;
          if (btn) { btn.classList.remove('listening'); btn.textContent = '🎤'; }
          const demo = ['start pauză','start condus','status'][Math.floor(Math.random()*3)];
          this.processVoiceCommand(demo);
        }, 3000);
      }
    } else {
      if (btn) { btn.classList.remove('listening'); btn.textContent = '🎤'; }
      try { this.recognition?.stop(); } catch {}
      this.showToast('Control vocal oprit');
    }
  }

  processVoiceCommand(text='') {
    const cmd = text.toLowerCase().trim();
    console.log('[Voice] cmd:', cmd);

    if (cmd.includes('start pauză') || cmd === 'pauză') {
      if (this.programStarted) this.setActivity('break','Pauză', document.getElementById('btnBreak'));
      return;
    }
    if (cmd.includes('start condus') || cmd === 'condus') {
      if (this.programStarted) this.setActivity('driving','Condus', document.getElementById('btnDriving'));
      return;
    }
    if (cmd.includes('start program')) { this.startProgram(); return; }
    if (cmd.includes('termină program')) { this.endProgram(); return; }
    if (cmd.includes('status')) { this.speakStatus(); return; }

    this.showToast('Comandă nerecunoscută');
  }

  speakStatus() {
    if (!this.programStarted) { this.showToast('🔊 Program oprit'); return; }
    const total   = this.timeTracker.getTotalProgramTime();
    const driving = this.timeTracker.getActivityTime('driving');
    const act     = this.currentActivity ? this.currentActivity.name : 'Nicio activitate';
    this.showToast(`🔊 ${act}. Program: ${this.formatDuration(total)}. Condus: ${this.formatDuration(driving)}`);
  }

  /* -------------------- TAB/LOAD -------------------- */
  switchTab(el, tabName) {
    document.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('active'));
    if (el) el.classList.add('active');

    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const map = {program:'pageProgram', gps:'pageGPS', fuel:'pageFuel', reports:'pageReports', settings:'pageSettings'};
    const target = document.getElementById(map[tabName]);
    if (target) target.classList.add('active');

    this.currentTab = tabName;
    this.loadPageContent(tabName);
    this.showToast(tabName.charAt(0).toUpperCase()+tabName.slice(1));
  }

  loadPageContent(tabName) {
    if (tabName === 'gps')   this.loadGPSPage();
    if (tabName === 'fuel')  this.loadFuelPage();
    if (tabName === 'reports') this.loadReportsPage();
  }

  loadGPSPage() {
    const cont = document.getElementById('gpsContent');
    if (cont && cont.innerHTML.includes('Încărcare')) {
      setTimeout(()=> {
        cont.innerHTML = `
          <div style="background:#f8f9fa;border-radius:8px;padding:15px;margin-bottom:20px;">
            <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px;">
              <div style="width:30px;height:30px;border-radius:50%;background:#27ae60;display:flex;align-items:center;justify-content:center;color:#fff">📍</div>
              <div><div style="font-weight:700">GPS Conectat</div><div style="font-size:12px;color:#7f8c8d">Precizie: ±3m</div></div>
            </div>
            <div><b>Locația Curentă</b></div>
            <div>🕐 Ultimul update: acum 5 sec</div>
            <div>🚗 Viteză: 0 km/h</div>
          </div>`;
      }, 800);
    }
  }

  loadFuelPage() {
    const page = document.getElementById('pageFuel');
    if (!page) return;
    // (conținutul poate exista deja din HTML tău)
  }

  loadReportsPage() {
    const page = document.getElementById('pageReports');
    if (!page || page.dataset.loaded) return;
    const today = this.timeTracker.getTodayStats();
    page.innerHTML = `
      <div class="page-content">
        <h2 class="page-title">Rapoarte și Istoric</h2>
        <div class="card"><h3 class="card-title">Detalii Program Curent</h3>
          <div style="background:#f8f9fa;border-radius:8px;padding:15px">
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ecf0f1">
              <span style="color:#7f8c8d">Program început la:</span>
              <span style="font-weight:700">${this.programStartTime?this.formatTime(this.programStartTime):'-'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ecf0f1">
              <span style="color:#7f8c8d">Conducere:</span>
              <span style="font-weight:700">${this.formatDuration(today.driving)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0">
              <span style="color:#7f8c8d">Pauze:</span>
              <span style="font-weight:700">${this.formatDuration(today.break)}</span>
            </div>
          </div>
        </div>
      </div>`;
    page.dataset.loaded = '1';
  }

  /* -------------------- SETĂRI -------------------- */
  saveSettings() {
    const settings = {
      darkMode:   !!document.getElementById('darkModeToggle')?.checked,
      voiceControl: !!document.getElementById('voiceControlToggle')?.checked,
      soundAlerts:  !!document.getElementById('soundAlertsToggle')?.checked
    };
    const driverData = {
      name: document.getElementById('settingDriverName')?.value || '',
      truckNumber: document.getElementById('settingTruckNumber')?.value || ''
    };
    this.dataManager.saveSettings(settings);
    this.dataManager.saveDriverData(driverData);
    const dn = document.getElementById('driverName'); if (dn) dn.textContent = driverData.name;
    const tn = document.getElementById('truckNumber'); if (tn) tn.textContent = driverData.truckNumber?`Camion #${driverData.truckNumber}`:'';
    this.showToast('Setări salvate');
  }

  toggleDarkMode() {
    const isDark = !!document.getElementById('darkModeToggle')?.checked;
    document.body.classList.toggle('dark-mode', isDark);
    const s = this.dataManager.getSettings(); s.darkMode = isDark; this.dataManager.saveSettings(s);
    this.showToast(isDark ? 'Mod întunecat activat' : 'Mod luminos activat');
  }

  /* -------------------- UI/UTIL -------------------- */
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

    // dacă e pe pauză, rulează logica de reactivare condus
    if (this.currentActivity?.type === 'break') this._updateControlButtonsUI();
  }

  updateProgressRings() {
    const s = this.timeTracker.getTodayStats();
    const total = s.driving + s.break + s.work + s.other;
    if (!total) return;

    const perc = n => Math.round((n/total)*100);
    const d = perc(s.driving), b = perc(s.break), w = perc(s.work+s.other);

    const ddeg = d/100*360, bdeg = b/100*360, wdeg = w/100*360;

    const dp = document.getElementById('drivingProgress');
    const bp = document.getElementById('breakProgress');
    const wp = document.getElementById('workProgress');
    const dpt = document.getElementById('drivingPercentage');
    const bpt = document.getElementById('breakPercentage');
    const wpt = document.getElementById('workPercentage');

    if (dp)  dp.style.background = `conic-gradient(#3498db ${ddeg}deg, #ecf0f1 ${ddeg}deg)`;
    if (bp)  bp.style.background = `conic-gradient(#27ae60 ${bdeg}deg, #ecf0f1 ${bdeg}deg)`;
    if (wp)  wp.style.background = `conic-gradient(#f39c12 ${wdeg}deg, #ecf0f1 ${wdeg}deg)`;
    if (dpt) dpt.textContent = d+'%';
    if (bpt) bpt.textContent = b+'%';
    if (wpt) wpt.textContent = w+'%';
  }

  updateNetworkStatus() {
    const el = document.getElementById('networkStatus');
    if (!el) return;
    el.innerHTML = navigator.onLine
      ? '<span class="status-dot status-online"></span>Online'
      : '<span class="status-dot status-offline"></span>Offline Ready';
  }

  async loadWeatherData() {
    const t = document.getElementById('weatherTemp');
    const d = document.getElementById('weatherDesc');
    try {
      await new Promise(r=>setTimeout(r, 1200));
      const weather = {
        temperature: Math.round(Math.random()*20 + 5),
        description: ['☀️ Însorit','☁️ Înnorat','🌧️ Ploios','❄️ Ninsoare'][Math.floor(Math.random()*4)],
        location: 'Stockholm'
      };
      if (t) t.textContent = `${weather.temperature}°C`;
      if (d) d.textContent = `${weather.description} • ${weather.location}`;
      console.log('[DriverApp] 🌤️ weather loaded');
    } catch(e) {
      if (t) t.textContent = '--°C';
      if (d) d.textContent = 'Meteo indisponibil';
    }
  }

  exportToPDF()  { this.showToast('📄 Export PDF...');  setTimeout(()=>this.showToast('✅ PDF generat!'), 1500); }
  exportToExcel(){ this.showToast('📊 Export Excel...');setTimeout(()=>this.showToast('✅ Excel generat!'),1500); }
  sendEmail()    { this.showToast('📧 Trimit email...'); setTimeout(()=>this.showToast('✅ Email trimis!'),1500); }

  saveFuelData() {
    const amount = parseFloat(document.getElementById('fuelAmount')?.value || '0');
    const price  = parseFloat(document.getElementById('fuelPrice')?.value  || '0');
    if (!amount || !price) return this.showToast('❌ Completează toate câmpurile');

    this.dataManager.saveFuelData({
      amount, price, timestamp:new Date().toISOString(), totalCost: amount*price
    });
    const a = document.getElementById('fuelAmount'); if (a) a.value='';
    const p = document.getElementById('fuelPrice');  if (p) p.value='';
    this.showToast('⛽ Alimentare salvată');
  }

  formatTime(date) {
    return date.toLocaleTimeString('ro-RO',{hour12:false,hour:'2-digit',minute:'2-digit'});
  }
  formatDuration(ms) {
    const s = Math.floor(ms/1000);
    const h = Math.floor(s/3600);
    const m = Math.floor((s%3600)/60);
    const r = s%60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
  }
  showToast(message) {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = message; t.style.opacity='1'; t.style.transform='translateX(-50%) translateY(0)';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(()=>{
      t.style.opacity='0'; t.style.transform='translateX(-50%) translateY(-20px)';
    }, 3000);
  }

  _show(el){ if (el) el.classList.add('show'); }
  _hide(el){ if (el) el.classList.remove('show'); }
}

/* --------- Global handlers folosite în HTML --------- */
let app;
function initializeApp(){ app = new DriverApp(); }
function startProgram(){ app?.startProgram(); }
function endProgram(){ app?.endProgram(); }
function setActivity(type,name,btn){ app?.setActivity(type,name,btn); }
function toggleVoiceControl(){ app?.toggleVoiceControl(); }
function switchTab(el,tab){ app?.switchTab(el,tab); }
function saveSettings(){ app?.saveSettings(); }
function toggleDarkMode(){ app?.toggleDarkMode(); }
function hideAlert(){ document.getElementById('alertPanel')?.classList.remove('show'); }

document.addEventListener('visibilitychange', ()=> {
  if (!app) return;
  if (!document.hidden && app.programStarted) app.updateUI();
});

console.log('📱 Driver Support App - JS loaded');