# 🤝 Contributing to Driver Support PWA

Mulțumim pentru interesul de a contribui la Driver Support PWA! Acest ghid te va ajuta să înțelegi cum poți contribui la dezvoltarea acestei aplicații.

## 📋 Cuprins

- [Code of Conduct](#code-of-conduct)
- [Cum să contribui](#cum-să-contribui)
- [Raportarea bug-urilor](#raportarea-bug-urilor)
- [Sugerarea funcționalităților](#sugerarea-funcționalităților)
- [Dezvoltarea locală](#dezvoltarea-locală)
- [Ghid de stil](#ghid-de-stil)
- [Process de review](#process-de-review)
- [Comunitate](#comunitate)

## 🤝 Code of Conduct

Acest proiect respectă [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/). Prin participare, te așteptăm să respecți acest cod.

### Principii fundamentale:
- **Respectul**: Tratează pe toată lumea cu respect și demnitate
- **Incluziunea**: Bun venit tuturor, indiferent de experiență sau background
- **Colaborarea**: Lucrăm împreună pentru a îmbunătăți siguranța rutieră
- **Profesionalismul**: Păstrăm discuțiile constructive și focusate pe proiect

## 🚀 Cum să contribui

### 1. Tipuri de contribuții acceptate

**🐛 Bug Fixes**
- Corectarea erorilor în funcționalitate
- Îmbunătățirea compatibilității cu browserele
- Fixarea problemelor de performanță

**✨ Noi funcționalități**
- Îmbunătățiri ale experienței utilizatorului
- Noi funcții de conformitate
- Integrări cu servicii externe

**📚 Documentație**
- Îmbunătățirea README-ului
- Adăugarea de comentarii în cod
- Crearea de tutoriale

**🧪 Teste**
- Adăugarea de teste automatizate
- Îmbunătățirea acoperirii cu teste
- Testarea pe device-uri mobile

**🎨 Design & UX**
- Îmbunătățiri de interfață
- Optimizări pentru accesibilitate
- Design responsive

### 2. Înainte să începi

1. **Verifică Issues-urile existente** pentru a evita duplicarea muncii
2. **Deschide un Issue** pentru funcționalități mari înainte să începi dezvoltarea
3. **Fork repository-ul** și creează un branch pentru munca ta
4. **Citește documentația** pentru a înțelege arhitectura aplicației

## 🐛 Raportarea bug-urilor

### Înainte să raportezi un bug:

1. **Verifică Issues-urile existente** să nu fi fost deja raportat
2. **Testează cu ultima versiune** a aplicației
3. **Verifică în browsere multiple** dacă e posibil

### Template pentru raportarea bug-urilor:

```markdown
## 🐛 Descrierea bug-ului
O descriere clară și concisă a problemei.

## 🔄 Pași pentru reproducere
1. Mergi la '...'
2. Click pe '...'
3. Scrollează până la '...'
4. Vezi eroarea

## ✅ Comportamentul așteptat
Descriere clară a ceea ce ar trebui să se întâmple.

## 📱 Environment
- **Browser**: [ex. Chrome 91, Safari 14]
- **OS**: [ex. Windows 10, iOS 14]
- **Device**: [ex. iPhone 12, Desktop]
- **Versiunea aplicației**: [ex. 1.0.0]

## 📸 Screenshots
Dacă e aplicabil, adaugă screenshots pentru a explica problema.

## 📋 Context suplimentar
Orice altă informație care ar putea fi relevantă.
```

## ✨ Sugerarea funcționalităților

### Template pentru feature requests:

```markdown
## 🚀 Feature Request

### 📝 Descrierea funcționalității
O descriere clară a funcționalității propuse.

### 🎯 Problema care se rezolvă
Care este problema sau nevoia care se adresează?

### 💡 Soluția propusă
Descriere detaliată a implementării propuse.

### 🔄 Alternative considerate
Alte soluții la care te-ai gândit.

### 📊 Impact și prioritate
- Cât de multe persoane ar beneficia?
- Cât de important este pentru siguranța rutieră?
- Complexitatea estimată a implementării?

### 📱 Compatibilitate
- Cum afectează funcționalitatea offline?
- Impact asupra performanței?
- Compatibilitatea cu device-urile mai vechi?
```

## 💻 Dezvoltarea locală

### 1. Setup inițial

```bash
# Fork și clone repository-ul
git clone https://github.com/username/driver-support-app.git
cd driver-support-app

# Instalează dependențele
npm install

# Setează environment-ul local
npm run setup
```

### 2. Rularea aplicației local

```bash
# Development server
npm run dev

# Cu HTTPS (necesar pentru GPS și notificări)
npm run start:https

# Rulează testele
npm run test

# Lighthouse audit
npm run test:lighthouse
```

### 3. Structura proiectului

```
driver-support-app/
├── index.html              # Pagina principală
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker
├── js/
│   ├── app.js              # Logica principală
│   ├── data-manager.js     # Managementul datelor
│   ├── time-tracker.js     # Tracking timp
│   ├── location-service.js # Serviciu GPS
│   └── alerts.js           # Sistemul de alerte
├── icons/                  # Iconițe PWA
├── test/                   # Teste automatizate
└── scripts/                # Build și deployment
```

### 4. Fluxul de dezvoltare

1. **Creează un branch** pentru feature-ul tău:
   ```bash
   git checkout -b feature/nume-descriptiv
   ```

2. **Dezvoltă și testează** local:
   ```bash
   npm run dev
   npm run test
   ```

3. **Commit cu mesaje descriptive**:
   ```bash
   git commit -m "feat: adaugă tracking automat GPS"
   ```

4. **Push și creează Pull Request**:
   ```bash
   git push origin feature/nume-descriptiv
   ```

## 📝 Ghid de stil

### 1. Convenții de cod

**JavaScript:**
```javascript
// Folosește camelCase pentru variabile și funcții
const driverName = 'Alexandru';
function calculateDrivingTime() { }

// Folosește PascalCase pentru clase
class TimeTracker { }

// Folosește UPPER_CASE pentru constante
const MAX_DRIVING_TIME = 9 * 60 * 60 * 1000;

// Comentarii descriptive
/**
 * Calculează timpul de conducere în conformitate cu reglementările UE
 * @param {Date} startTime - Ora de început
 * @param {Date} endTime - Ora de sfârșit
 * @returns {number} Timpul în milisecunde
 */
```

**CSS:**
```css
/* Folosește kebab-case pentru clase */
.driver-status-card { }

/* Organizează proprietățile logic */
.control-btn {
    /* Layout */
    display: flex;
    position: relative;
    
    /* Dimensiuni */
    width: 100%;
    height: 50px;
    
    /* Stiluri vizuale */
    background: #3498db;
    border: none;
    border-radius: 8px;
    
    /* Tipografie */
    font-size: 14px;
    font-weight: 600;
    
    /* Interacțiune */
    cursor: pointer;
    transition: all 0.3s ease;
}
```

**HTML:**
```html
<!-- Folosește atribute semantice și accesibile -->
<button class="control-btn" 
        onclick="setActivity('driving')"
        aria-label="Începe activitatea de conducere"
        tabindex="0">
    Condus
</button>

<!-- Structură semantică -->
<main role="main">
    <section aria-labelledby="program-heading">
        <h2 id="program-heading">Program de lucru</h2>
    </section>
</main>
```

### 2. Convenții pentru commit-uri

Folosim [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Tipuri:**
- `feat`: nouă funcționalitate
- `fix`: corectare bug
- `docs`: modificări documentație
- `style`: formatare, punct și virgulă lipsă, etc.
- `refactor`: refactorizare cod
- `test`: adăugare sau modificare teste
- `chore`: mentenanță

**Exemple:**
```
feat(gps): adaugă tracking automat al locației
fix(alerts): corectează calculul alertelor de conformitate
docs(readme): actualizează instrucțiunile de instalare
test(time-tracker): adaugă teste pentru calculul timpului de pauză
```

### 3. Standardele PWA

**Performanță:**
- First Contentful Paint < 2s
- Largest Contentful Paint < 4s
- Time to Interactive < 5s
- Cumulative Layout Shift < 0.1

**Offline:**
- Aplicația trebuie să funcționeze offline
- Service Worker să cache-uiește resursele esențiale
- Date să se sincronizeze când conexiunea revine

**Responsive:**
- Design responsive pentru toate screen size-urile
- Touch targets de minimum 44px
- Text lizibil fără zoom

**Accesibilitate:**
- Contrast de minimum 4.5:1
- Navigare cu keyboard
- Screen reader support
- Semantic HTML

## 🔍 Process de review

### 1. Criterii pentru Pull Request

**Code Quality:**
- [ ] Codul urmează ghidul de stil
- [ ] Funcțiile au comentarii descriptive
- [ ] Nu există cod duplicat
- [ ] Variabilele au nume descriptive

**Funcționalitate:**
- [ ] Funcționalitatea lucrează conform specificațiilor
- [ ] Nu se întrerupe funcționalitatea existentă
- [ ] Include teste pentru noile funcții
- [ ] Funcționează offline dacă e aplicabil

**PWA Standards:**
- [ ] Nu afectează negativ performanța
- [ ] Menține compatibilitatea cu service worker-ul
- [ ] Respectă principiile de design responsive
- [ ] Accesibil pentru screen readers

**Siguranță:**
- [ ] Nu expune date sensibile
- [ ] Validează input-urile utilizatorului
- [ ] Nu introduce vulnerabilități

### 2. Procesul de review

1. **Auto-checks**: CI/CD verifică automat testele și Lighthouse
2. **Code review**: Un maintainer revizuiește codul
3. **Testing**: Testare manuală pe device-uri mobile
4. **Approval**: După aprobare, merge în main branch

### 3. După merge

- Deploy automat pe GitHub Pages
- Update al documentation-ului dacă e necesar
- Notificare în community despre noua funcționalitate

## 👥 Comunitate

### Comunicare

**GitHub Issues**: Pentru raportare bug-uri și feature requests
**GitHub Discussions**: Pentru întrebări generale și idei
**Email**: pentru probleme sensibile sau private

### Recunoaștere contribuțiilor

Toți contribuitorii vor fi listați în:
- README.md în secțiunea Contributors
- CHANGELOG.md pentru fiecare release
- Release notes pe GitHub

### Tipuri de contribuitori

**🐛 Bug Hunters**: Raportează și corectează bug-uri
**✨ Feature Developers**: Implementează noi funcționalități
**📚 Documentation Writers**: Îmbunătățesc documentația
**🧪 Testers**: Testează pe device-uri multiple
**🎨 Designers**: Îmbunătățesc UX/UI
**🌍 Translators**: Traduc aplicația în alte limbi

## 🎉 Primul tău Pull Request

Dacă este primul tău PR, iată câteva idei de început:

### Issues pentru începători
Caută issues marcate cu:
- `good first issue`
- `beginner friendly`
- `documentation`
- `help wanted`

### Idei simple de început:
1. **Îmbunătățește documentația**: Adaugă exemple sau clarifică instrucțiuni
2. **Traduce texte**: Adaugă suport pentru o nouă limbă
3. **Optimizează iconițe**: Comprimă sau îmbunătățește iconițele
4. **Adaugă teste**: Scrie teste pentru funcționalități existente
5. **Fix typos**: Corectează erori de scriere în comentarii sau UI

### Template pentru primul PR:

```markdown
## 🎉 Primul meu Pull Request

### 📝 Ce schimbă acest PR?
[Descriere scurtă a schimbărilor]

### 🎯 De ce această schimbare?
[Explică motivația]

### ✅ Checklist
- [ ] Am citit ghidul de contribuție
- [ ] Codul urmează ghidul de stil
- [ ] Am testat local modificările
- [ ] Am adăugat/actualizat documentația dacă e necesar

### 🤔 Întrebări
[Orice întrebări sau nelămuriri]
```

## 📚 Resurse utile

### Documentație tehnică
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

### Reglementări și compliance
- [EU Driving Time Rules](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32006R0561)
- [Swedish Transport Agency](https://transportstyrelsen.se/)

### Dezvoltare
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Mulțumim că contribui la Driver Support PWA! 🚛✨**

Fiecare contribuție, indiferent de mărime, face aplicația mai bună și mai sigură pentru șoferii profesioniști. Împreună construim un instrument care poate salva vieți prin respectarea reglementărilor de siguranță rutieră.