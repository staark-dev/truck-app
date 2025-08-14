# 🚛 Driver Support Pro - Suedia

Aplicație PWA (Progressive Web App) pentru managementul timpilor de lucru pentru șoferii de camion conform reglementărilor din Suedia.

## 📋 Caracteristici

### ⚡ Funcționalități Principale
- **Tracking timp real** al activităților (condus, pauze, muncă, alte activități)
- **Conformitate EU** cu reglementările suedeze pentru șoferi profesionali
- **GPS tracking** cu localizare în timp real
- **Management combustibil** cu tracking consum și costuri
- **Alerte inteligente** pentru conformitate și siguranță
- **Control vocal** pentru comenzi rapide
- **Rapoarte detaliate** cu export PDF/Excel
- **Mod offline** complet funcțional

### 🎨 Interfață & UX
- **Design responsive** optimizat pentru mobile și tablet
- **Mod întunecat** pentru utilizare nocturnă
- **PWA features** - instalabile ca aplicație nativă
- **Touch-friendly** cu feedback haptic
- **Multilingv** (RO, EN, SV)

### 🔧 Tehnologii
- **Vanilla JavaScript** (ES6+) pentru performance maxim
- **Service Workers** pentru funcționalitate offline
- **Web APIs**: Geolocation, Notifications, Vibration, Speech
- **LocalStorage** pentru persistența datelor
- **CSS Grid & Flexbox** pentru layout responsive

## 🚀 Deployment pe GitHub Pages

### 1. Pregătirea Repository-ului

```bash
# Clonează sau creează un repository nou
git clone https://github.com/username/driver-support-app.git
cd driver-support-app

# Sau inițializează un repository nou
mkdir driver-support-app
cd driver-support-app
git init
```

### 2. Structura Fișierelor

Creează următoarea structură de fișiere:

```
driver-support-app/
├── index.html
├── manifest.json
├── sw.js
├── README.md
├── js/
│   ├── app.js
│   ├── data-manager.js
│   ├── time-tracker.js
│   ├── location-service.js
│   └── alerts.js
├── icons/
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   └── icon-512x512.png
└── screenshots/
    ├── mobile-1.png
    ├── mobile-2.png
    └── tablet-1.png
```

### 3. Crearea Iconițelor PWA

Generează iconițele necesare în diferite dimensiuni. Poți folosi:
- [PWA Builder](https://www.pwabuilder.com/)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [App Icon Generator](https://appicon.co/)

**Dimensiuni necesare:**
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

### 4. Configurarea GitHub Pages

1. **Push fișierele pe GitHub:**
```bash
git add .
git commit -m "Initial commit - Driver Support PWA"
git branch -M main
git remote add origin https://github.com/username/driver-support-app.git
git push -u origin main
```

2. **Activează GitHub Pages:**
   - Mergi la Settings > Pages
   - Source: Deploy from a branch
   - Branch: main / root
   - Save

3. **Configurează domeniul custom (opțional):**
   - Adaugă un fișier `CNAME` cu domeniul tău
   - Configurează DNS-ul să pointeze către GitHub Pages

### 5. Optimizări pentru Production

#### A. Compresia Fișierelor
```bash
# Instalează tools pentru optimizare
npm install -g uglify-js clean-css-cli

# Minifică JavaScript
uglifyjs js/app.js -c -m -o js/app.min.js

# Minifică CSS (dacă ai fișiere separate)
cleancss -o styles.min.css styles.css
```

#### B. Service Worker Cache
Verifică că toate fișierele sunt listate în `STATIC_FILES` din `sw.js`:

```javascript
const STATIC_FILES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/js/app.js',
    '/js/data-manager.js',
    '/js/time-tracker.js',
    '/js/location-service.js',
    '/js/alerts.js',
    // Adaugă toate iconițele
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];
```

#### C. HTTPS & Security Headers
GitHub Pages oferă HTTPS automat. Pentru securitate adițională, creează un fișier `_headers`:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## 🛠️ Configurare Locală pentru Development

### 1. Server Local
```bash
# Folosește Python pentru server local
python -m http.server 8000

# Sau folosește Node.js
npx http-server -p 8000

# Sau folosește Live Server (VS Code extension)
```

### 2. HTTPS Local (pentru GPS și notificări)
```bash
# Folosește mkcert pentru certificat local
mkcert -install
mkcert localhost 127.0.0.1 ::1

# Sau folosește http-server cu SSL
npx http-server -p 8000 -S -C cert.pem -K key.pem
```

### 3. Testing PWA Features
- **Chrome DevTools** > Application > Service Workers
- **Lighthouse** pentru audit PWA
- **Chrome DevTools** > Application > Manifest
- Test pe device real pentru GPS și notificări

## 📱 Instalare și Utilizare

### 1. Accesare Web
Navighează la `https://username.github.io/driver-support-app`

### 2. Instalare ca PWA
- **Chrome/Edge**: Click pe iconița "Install" din address bar
- **Safari iOS**: Share > Add to Home Screen
- **Android Chrome**: "Add to Home Screen" prompt

### 3. Permisiuni Necesare
- **Localizare** pentru GPS tracking
- **Notificări** pentru alerte de conformitate
- **Storage** pentru date offline

## ⚙️ Configurare și Personalizare

### 1. Informații Șofer
- Nume șofer
- Numărul camionului
- Numărul permisului
- Compania

### 2. Reguli de Conformitate
- Timp maxim condus pe zi (9/10 ore)
- Pauza obligatorie după 4.5 ore
- Timp minim pauză (45 minute)
- Pauza de repaus zilnic (11 ore)

### 3. Setări Alerte
- Alerte conformitate
- Alerte siguranță
- Sunet și vibrații
- Timing alertelor

## 📊 Export și Backup

### 1. Formate Export
- **PDF** - rapoarte printabile
- **Excel** - analiză detaliată
- **JSON** - backup complet
- **CSV** - import în alte sisteme

### 2. Backup Automat
- LocalStorage pentru date locale
- Export manual pentru siguranță
- Sincronizare cloud (viitor)

## 🔧 Maintenance și Updates

### 1. Actualizări App
```bash
# Actualizează versiunea în manifest.json
"version": "1.0.1"

# Actualizează CACHE_NAME în sw.js
const CACHE_NAME = 'driver-support-v1.0.1';

# Commit și push
git add .
git commit -m "Update to v1.0.1"
git push
```

### 2. Cache Invalidation
Service Worker-ul va actualiza automat cache-ul la următoarea vizită.

### 3. Monitoring
- GitHub Pages Analytics
- Browser DevTools pentru erori
- User feedback pentru îmbunătățiri

## 🐛 Troubleshooting

### 1. GPS nu funcționează
- Verifică permisiunile browser-ului
- Testează pe HTTPS (necesar pentru GPS)
- Verifică în exterior (semnal GPS slab în interior)

### 2. PWA nu se instalează
- Verifică manifest.json (format valid)
- Service Worker functional
- HTTPS necesar
- Iconițe în toate dimensiunile

### 3. Notificări nu funcționează
- Permisiuni notificări acordate
- Service Worker activ
- Browser support pentru Notification API

### 4. Date pierdute
- Verifică LocalStorage disponibil
- Browser în mod privat poate restricționa storage
- Backup manual recomandat

## 📈 Roadmap Viitor

### Phase 2 Features
- [ ] Integrare cloud pentru backup
- [ ] Multi-user support pentru companii
- [ ] Integrare cu sisteme ERP
- [ ] API pentru tahografe digitale
- [ ] Predicții AI pentru planificare

### Phase 3 Features
- [ ] Fleet management dashboard
- [ ] Real-time communication
- [ ] Route optimization
- [ ] Fuel card integration
- [ ] Maintenance scheduling

## 📄 Licență

MIT License - vezi fișierul LICENSE pentru detalii.

## 🤝 Contribuții

Contribuțiile sunt binevenite! Pentru modificări majore:
1. Fork repository-ul
2. Creează un branch pentru feature (`git checkout -b feature/AmazingFeature`)
3. Commit modificările (`git commit -m 'Add AmazingFeature'`)
4. Push pe branch (`git push origin feature/AmazingFeature`)
5. Creează un Pull Request

## 📞 Support

Pentru support sau întrebări:
- GitHub Issues pentru bug-uri
- Discussions pentru feature requests
- Email pentru support privat

## 🏆 Credite

Dezvoltat pentru comunitatea șoferilor profesioniști din Suedia.
Conform cu reglementările EU pentru timpul de conducere și repaus.

---

**Driver Support Pro** - Driving Compliance Made Simple 🚛✨