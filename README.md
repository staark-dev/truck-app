# 🚛 Aplicație PWA Șofer Camion - Reglementări Suedia

Aplicație web progresivă (PWA) pentru gestionarea programului de lucru conform reglementărilor din Suedia pentru șoferii profesioniști.

## 📋 Funcționalități

✅ **Timer precis** pentru sesiunile de conducere  
✅ **Notificări automate** la fiecare 6 ore pentru pauză obligatorie  
✅ **Respectarea reglementărilor din Suedia** (pauză min. 30 min, max 10h/zi)  
✅ **Evidența săptămânală** a orelor lucrate și conduse  
✅ **Baza de date locală** (IndexedDB) - datele rămân salvate  
✅ **Export/Import** date în format JSON și CSV  
✅ **Instalare ca aplicație** pe telefon/tabletă  
✅ **Funcționare offline** completă  
✅ **Notificări push** pentru pauze obligatorii

## 🚀 Instalare pe GitHub Pages

### Pasul 1: Creează repository-ul

1. Loghează-te pe [GitHub.com](https://github.com)
1. Clic pe “New repository” (butonul verde)
1. Nume repository: `truck-driver-app`
1. Bifează “Add a README file”
1. Clic “Create repository”

### Pasul 2: Adaugă fișierele

1. În repository-ul nou creat, clic pe “Add file” → “Create new file”
1. Creează primul fișier `index.html` și copiază conținutul din aplicația principală
1. Clic “Commit new file”
1. Repetă pentru `manifest.json` și `sw.js`

### Pasul 3: Activează GitHub Pages

1. În repository, mergi la tab-ul “Settings”
1. Scroll down la secțiunea “Pages”
1. La “Source” selectează “Deploy from a branch”
1. Selectează “main” branch și “/ (root)”
1. Clic “Save”

### Pasul 4: Accesează aplicația

- GitHub Pages va genera un link de forma: `https://[username].github.io/truck-driver-app`
- Aplicația va fi disponibilă în ~5-10 minute

## 📱 Instalare pe Telefon

### Android (Chrome/Edge)

1. Deschide aplicația în browser
1. Apasă pe meniul browser (⋮)
1. Selectează “Add to Home screen” sau “Install app”
1. Confirmă instalarea
1. Aplicația va apărea ca orice altă aplicație nativă

### iPhone/iPad (Safari)

1. Deschide aplicația în Safari
1. Apasă butonul Share (📤)
1. Selectează “Add to Home Screen”
1. Confirmă adăugarea
1. Aplicația va fi disponibilă pe ecranul principal

### Desktop (Chrome/Edge)

1. Deschide aplicația în browser
1. Căută iconița de instalare în bara de adrese
1. Clic pe iconiță și confirma instalarea
1. Aplicația va rula ca program standalone

## 🇸🇪 Reglementări Suedia Implementate

### Timpul de conducere

- ⏰ **Pauză obligatorie**: După 6 ore de conducere continuă
- ⏰ **Pauză minimă**: 30 de minute (conform legii suedeze)
- ⏰ **Maxim zilnic**: 10 ore de lucru pe zi
- ⏰ **Notificări**: 1 minut înainte și la momentul pauzei

### Evidența săptămânală

- 📊 **Ore totale lucrate** în săptămâna curentă
- 📊 **Ore de conducere** separate de pauze
- 📊 **Numărul de pauze** luate
- 📊 **Export rapoarte** pentru autorități

## 🔧 Structura Fișierelor

```
truck-driver-app/
├── index.html          # Aplicația principală
├── manifest.json       # Configurația PWA
├── sw.js              # Service Worker (funcționare offline)
└── README.md          # Acest fișier
```

## 💾 Salvarea Datelor

### Automat în browser

- Toate datele se salvează automat în IndexedDB
- Datele persistă între închiderea și redeschiderea aplicației
- Nu este nevoie de conexiune la internet pentru salvare

### Export manual

- **JSON**: Pentru backup complet și transfer între dispozitive
- **CSV**: Pentru rapoarte și analiză în Excel
- **Import**: Restaurare date din backup-uri anterioare

## 📊 Rapoarte și Export

### Raport CSV include:

- Data și ora fiecărei sesiuni
- Durata totală de lucru
- Timpul efectiv de conducere
- Numărul și durata pauzelor
- Compatibil cu Excel și Google Sheets

### Raport JSON include:

- Toate datele în format tehnic
- Perfect pentru backup și restaurare
- Include metadata și configurări

## 🔒 Securitate și Confidențialitate

- ✅ **Date locale**: Toate informațiile rămân pe dispozitivul tău
- ✅ **Fără servere**: Nu se transmit date către servere externe
- ✅ **Offline**: Funcționează complet fără internet
- ✅ **GDPR compliant**: Controlezi complet datele personale

## 🔧 Depanare

### Aplicația nu se instalează

- Verifică dacă browserul suportă PWA (Chrome, Edge, Safari recent)
- Încearcă să reîncarci pagina
- Verifică conexiunea la internet pentru prima încărcare

### Datele lipsesc

- Verifică dacă ai activat cookies și local storage
- Încearcă să exporți și reimporți datele
- Nu șterge datele browserului pentru această aplicație

### Notificările nu funcționează

- Activează permisiunile pentru notificări în browser
- Pe Android, verifică setările aplicației în Settings
- Pe iOS, verifică setările Safari pentru notificări

## 📞 Suport

Pentru probleme tehnice sau sugestii:

1. Creează un “Issue” în acest repository GitHub
1. Include detalii despre browser și dispozitiv
1. Descrie pașii pentru reproducerea problemei

## 📝 Licență

Acest proiect este open source și disponibil sub licența MIT. Poți folosi, modifica și distribui liber aplicația.

-----

**Dezvoltat pentru șoferii profesioniști din Suedia** 🇸🇪  
**Respectă reglementările EU pentru timpul de conducere** 🇪🇺
