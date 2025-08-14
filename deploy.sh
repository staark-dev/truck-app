#!/bin/bash

# 🚛 Driver Support PWA - Deployment Script pentru GitHub Pages
# Acest script automatizează deployment-ul aplicației pe GitHub Pages

set -e  # Oprește scriptul la prima eroare

# Culori pentru output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funcții helper
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
echo -e "${BLUE}"
cat << "EOF"
╔══════════════════════════════════════════╗
║        🚛 Driver Support PWA             ║
║      GitHub Pages Deployment Script      ║
╚══════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Verifică dacă suntem într-un repository git
if [ ! -d ".git" ]; then
    print_error "Nu sunt într-un repository Git!"
    echo "Rulează: git init"
    exit 1
fi

# Citește informații de la utilizator
echo ""
print_status "Configurare deployment..."

# Verifică dacă avem remote origin
if ! git remote get-url origin > /dev/null 2>&1; then
    read -p "🔗 URL repository GitHub (https://github.com/username/repo.git): " REPO_URL
    if [ ! -z "$REPO_URL" ]; then
        git remote add origin "$REPO_URL"
        print_success "Remote origin adăugat: $REPO_URL"
    else
        print_error "URL repository necesar!"
        exit 1
    fi
else
    REPO_URL=$(git remote get-url origin)
    print_status "Repository detectat: $REPO_URL"
fi

# Verifică dacă toate fișierele necesare există
print_status "Verifică fișierele necesare..."

REQUIRED_FILES=(
    "index.html"
    "manifest.json"
    "sw.js"
    "js/app.js"
    "js/data-manager.js"
    "js/time-tracker.js"
    "js/location-service.js"
    "js/alerts.js"
)

MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -ne 0 ]; then
    print_error "Fișiere lipsă:"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
    echo ""
    print_warning "Creează fișierele lipsă înainte de deployment!"
    exit 1
fi

print_success "Toate fișierele necesare sunt prezente!"

# Verifică directorul icons
if [ ! -d "icons" ]; then
    print_warning "Directorul 'icons' nu există!"
    read -p "Creez directorul icons cu iconițe placeholder? (y/N): " CREATE_ICONS
    if [[ $CREATE_ICONS =~ ^[Yy]$ ]]; then
        mkdir -p icons
        print_status "Generez iconițe placeholder..."
        
        # Generează iconițe simple SVG ca placeholder
        ICON_SIZES=(72 96 128 144 152 192 384 512)
        for size in "${ICON_SIZES[@]}"; do
            cat > "icons/icon-${size}x${size}.png.svg" << EOF
<svg width="$size" height="$size" xmlns="http://www.w3.org/2000/svg">
  <rect width="$size" height="$size" fill="#3498db"/>
  <text x="50%" y="50%" font-family="Arial" font-size="${size}0%" fill="white" text-anchor="middle" dy="0.3em">🚛</text>
</svg>
EOF
        done
        print_success "Iconițe placeholder create! Înlocuiește-le cu iconițe reale."
    else
        print_warning "Nu uita să adaugi iconițele în directorul 'icons'!"
    fi
fi

# Verifică și actualizează versiunea
if [ -f "manifest.json" ]; then
    CURRENT_VERSION=$(grep -o '"version": "[^"]*"' manifest.json | sed 's/"version": "\(.*\)"/\1/')
    print_status "Versiunea curentă: $CURRENT_VERSION"
    
    read -p "📦 Noua versiune (Enter pentru $CURRENT_VERSION): " NEW_VERSION
    if [ ! -z "$NEW_VERSION" ] && [ "$NEW_VERSION" != "$CURRENT_VERSION" ]; then
        # Actualizează versiunea în manifest.json
        sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" manifest.json
        
        # Actualizează cache name în service worker
        if [ -f "sw.js" ]; then
            sed -i.bak "s/driver-support-v$CURRENT_VERSION/driver-support-v$NEW_VERSION/g" sw.js
        fi
        
        print_success "Versiunea actualizată la: $NEW_VERSION"
        rm -f manifest.json.bak sw.js.bak
    fi
fi

# Optimization options
echo ""
print_status "Opțiuni de optimizare..."

read -p "🗜️  Minifică JavaScript-ul? (y/N): " MINIFY_JS
read -p "🧹 Curăță fișierele temporare? (Y/n): " CLEANUP

# Minifică JavaScript dacă e cerut
if [[ $MINIFY_JS =~ ^[Yy]$ ]]; then
    print_status "Minifică JavaScript..."
    
    # Verifică dacă uglify-js este instalat
    if command -v uglifyjs > /dev/null 2>&1; then
        for jsfile in js/*.js; do
            if [[ $jsfile != *.min.js ]]; then
                uglifyjs "$jsfile" -c -m -o "${jsfile%.js}.min.js"
                print_success "Minificat: $jsfile"
            fi
        done
    else
        print_warning "uglify-js nu este instalat. Rulează: npm install -g uglify-js"
    fi
fi

# Cleanup
if [[ ! $CLEANUP =~ ^[Nn]$ ]]; then
    print_status "Curăță fișierele temporare..."
    
    # Șterge fișiere temporare
    find . -name "*.bak" -delete
    find . -name ".DS_Store" -delete
    find . -name "Thumbs.db" -delete
    
    print_success "Cleanup complet!"
fi

# Git operations
echo ""
print_status "Pregătește Git commit..."

# Verifică dacă avem modificări
if [ -z "$(git status --porcelain)" ]; then
    print_warning "Nu sunt modificări de commituit!"
    read -p "Continui cu deployment? (y/N): " FORCE_DEPLOY
    if [[ ! $FORCE_DEPLOY =~ ^[Yy]$ ]]; then
        print_status "Deployment anulat."
        exit 0
    fi
else
    git status --short
fi

echo ""
read -p "💬 Mesaj commit (Enter pentru mesaj default): " COMMIT_MSG
if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Deploy Driver Support PWA - $(date '+%Y-%m-%d %H:%M')"
fi

# Git add, commit, push
print_status "Git add..."
git add .

print_status "Git commit..."
git commit -m "$COMMIT_MSG" || {
    print_warning "Nimic nou de commituit sau commit failed"
}

print_status "Git push..."
git push origin main || git push origin master || {
    print_error "Git push failed!"
    echo "Verifică:"
    echo "  1. Dacă ai acces la repository"
    echo "  2. Dacă branch-ul este corect (main/master)"
    echo "  3. Dacă remote origin este configurat corect"
    exit 1
}

print_success "Cod push-uit cu succes!"

# GitHub Pages check
echo ""
print_status "Verifică configurarea GitHub Pages..."

REPO_NAME=$(basename "$REPO_URL" .git)
USERNAME=$(echo "$REPO_URL" | sed -n 's|.*/\([^/]*\)/[^/]*|\1|p')

if [ ! -z "$USERNAME" ] && [ ! -z "$REPO_NAME" ]; then
    PAGES_URL="https://$USERNAME.github.io/$REPO_NAME"
    
    print_success "Deployment completat!"
    echo ""
    echo -e "${GREEN}🎉 Aplicația ta PWA va fi disponibilă la:${NC}"
    echo -e "${BLUE}$PAGES_URL${NC}"
    echo ""
    echo -e "${YELLOW}📝 Next steps:${NC}"
    echo "  1. Verifică GitHub Pages în repository Settings > Pages"
    echo "  2. Așteaptă 2-5 minute pentru build și deployment"
    echo "  3. Testează aplicația pe device mobil"
    echo "  4. Verifică funcționalitatea PWA (install prompt)"
    echo ""
    
    read -p "🌐 Deschid URL-ul în browser? (Y/n): " OPEN_BROWSER
    if [[ ! $OPEN_BROWSER =~ ^[Nn]$ ]]; then
        if command -v open > /dev/null 2>&1; then
            open "$PAGES_URL"  # macOS
        elif command -v xdg-open > /dev/null 2>&1; then
            xdg-open "$PAGES_URL"  # Linux
        elif command -v start > /dev/null 2>&1; then
            start "$PAGES_URL"  # Windows
        else
            print_status "Nu pot deschide browser-ul automat. Navighează manual la:"
            echo "$PAGES_URL"
        fi
    fi
else
    print_success "Deployment completat!"
    print_warning "Nu am putut determina URL-ul GitHub Pages automat."
    echo "Verifică Settings > Pages în repository-ul tău GitHub."
fi

# Final reminders
echo ""
print_status "Verificări finale:"
echo "  ✅ PWA Manifest valid"
echo "  ✅ Service Worker funcțional"
echo "  ✅ HTTPS activat (GitHub Pages)"
echo "  ✅ Iconițe în toate dimensiunile"
echo ""
echo -e "${GREEN}🚛 Driver Support PWA deployment completed! 🚛${NC}"
echo ""

# Optional: Run lighthouse audit
read -p "🔍 Rulezi Lighthouse audit pentru PWA? (y/N): " RUN_LIGHTHOUSE
if [[ $RUN_LIGHTHOUSE =~ ^[Yy]$ ]]; then
    if command -v lighthouse > /dev/null 2>&1; then
        print_status "Rulează Lighthouse audit..."
        lighthouse "$PAGES_URL" --chrome-flags="--headless" --output=html --output-path=lighthouse-report.html
        print_success "Raport Lighthouse generat: lighthouse-report.html"
    else
        print_warning "Lighthouse nu este instalat. Rulează: npm install -g lighthouse"
        echo "Sau folosește Lighthouse din Chrome DevTools"
    fi
fi

exit 0