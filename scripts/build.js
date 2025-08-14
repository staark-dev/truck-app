#!/usr/bin/env node

// 🚛 Driver Support PWA - Build Script
// Automatizează procesul de build pentru deployment

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configurații
const config = {
    sourceDir: '.',
    distDir: './dist',
    minify: true,
    optimize: true,
    generateSitemap: true,
    validateBuild: true,
    verbose: true
};

// Culori pentru console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Logger cu culori
const logger = {
    info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
    step: (msg) => console.log(`${colors.cyan}[STEP]${colors.reset} ${msg}`)
};

// Banner
console.log(`${colors.cyan}
╔══════════════════════════════════════════╗
║        🚛 Driver Support PWA             ║
║            Build Script v1.0             ║
╚══════════════════════════════════════════╝
${colors.reset}`);

class PWABuilder {
    constructor(config) {
        this.config = config;
        this.startTime = Date.now();
        this.errors = [];
        this.warnings = [];
    }

    // Main build process
    async build() {
        try {
            logger.info('Starting PWA build process...');

            await this.cleanDist();
            await this.copyFiles();
            
            if (this.config.minify) {
                await this.minifyAssets();
            }
            
            if (this.config.optimize) {
                await this.optimizeAssets();
            }
            
            await this.updateManifest();
            await this.updateServiceWorker();
            
            if (this.config.generateSitemap) {
                await this.generateSitemap();
            }
            
            if (this.config.validateBuild) {
                await this.validateBuild();
            }
            
            await this.generateBuildReport();
            
            const duration = Date.now() - this.startTime;
            logger.success(`Build completed in ${duration}ms`);
            
            if (this.warnings.length > 0) {
                logger.warning(`Build completed with ${this.warnings.length} warnings`);
            }
            
            return this.errors.length === 0;
            
        } catch (error) {
            logger.error(`Build failed: ${error.message}`);
            this.errors.push(error.message);
            return false;
        }
    }

    // Clean distribution directory
    async cleanDist() {
        logger.step('Cleaning distribution directory...');
        
        if (fs.existsSync(this.config.distDir)) {
            fs.rmSync(this.config.distDir, { recursive: true, force: true });
        }
        
        fs.mkdirSync(this.config.distDir, { recursive: true });
        logger.success('Distribution directory cleaned');
    }

    // Copy source files to dist
    async copyFiles() {
        logger.step('Copying source files...');
        
        const filesToCopy = [
            'index.html',
            'manifest.json',
            'sw.js',
            'LICENSE',
            'README.md'
        ];
        
        const directoriesToCopy = [
            'js',
            'icons',
            'screenshots'
        ];
        
        // Copy files
        for (const file of filesToCopy) {
            if (fs.existsSync(file)) {
                fs.copyFileSync(file, path.join(this.config.distDir, file));
                if (this.config.verbose) {
                    logger.info(`Copied: ${file}`);
                }
            } else {
                this.warnings.push(`File not found: ${file}`);
            }
        }
        
        // Copy directories
        for (const dir of directoriesToCopy) {
            if (fs.existsSync(dir)) {
                this.copyDirectory(dir, path.join(this.config.distDir, dir));
                if (this.config.verbose) {
                    logger.info(`Copied directory: ${dir}`);
                }
            } else {
                this.warnings.push(`Directory not found: ${dir}`);
            }
        }
        
        logger.success('Files copied successfully');
    }

    // Recursively copy directory
    copyDirectory(src, dest) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        
        const entries = fs.readdirSync(src, { withFileTypes: true });
        
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
                this.copyDirectory(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    // Minify JavaScript and CSS
    async minifyAssets() {
        logger.step('Minifying assets...');
        
        try {
            // Minify JavaScript files
            const jsDir = path.join(this.config.distDir, 'js');
            if (fs.existsSync(jsDir)) {
                const jsFiles = fs.readdirSync(jsDir).filter(file => 
                    file.endsWith('.js') && !file.endsWith('.min.js')
                );
                
                for (const file of jsFiles) {
                    const inputPath = path.join(jsDir, file);
                    const outputPath = path.join(jsDir, file.replace('.js', '.min.js'));
                    
                    try {
                        execSync(`uglifyjs "${inputPath}" -c -m -o "${outputPath}"`);
                        
                        // Update HTML to reference minified version
                        this.updateHTMLReferences(file, file.replace('.js', '.min.js'));
                        
                        if (this.config.verbose) {
                            logger.info(`Minified: ${file}`);
                        }
                    } catch (error) {
                        this.warnings.push(`Failed to minify ${file}: ${error.message}`);
                    }
                }
            }
            
            logger.success('Assets minified');
            
        } catch (error) {
            this.warnings.push(`Minification error: ${error.message}`);
        }
    }

    // Optimize assets (images, etc.)
    async optimizeAssets() {
        logger.step('Optimizing assets...');
        
        try {
            // Optimize images if imagemin is available
            const iconsDir = path.join(this.config.distDir, 'icons');
            if (fs.existsSync(iconsDir)) {
                try {
                    execSync(`imagemin "${iconsDir}/*.png" --out-dir="${iconsDir}" --plugin=imagemin-pngquant`, 
                        { stdio: 'ignore' });
                    logger.info('Images optimized');
                } catch (error) {
                    this.warnings.push('Image optimization skipped (imagemin not available)');
                }
            }
            
            logger.success('Assets optimized');
            
        } catch (error) {
            this.warnings.push(`Optimization error: ${error.message}`);
        }
    }

    // Update HTML to reference minified files
    updateHTMLReferences(originalFile, minifiedFile) {
        const htmlPath = path.join(this.config.distDir, 'index.html');
        if (fs.existsSync(htmlPath)) {
            let htmlContent = fs.readFileSync(htmlPath, 'utf8');
            htmlContent = htmlContent.replace(
                new RegExp(originalFile, 'g'),
                minifiedFile
            );
            fs.writeFileSync(htmlPath, htmlContent);
        }
    }

    // Update manifest with build info
    async updateManifest() {
        logger.step('Updating manifest...');
        
        const manifestPath = path.join(this.config.distDir, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            
            // Add build timestamp
            manifest.build_timestamp = new Date().toISOString();
            manifest.build_version = this.getBuildVersion();
            
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
            logger.success('Manifest updated');
        } else {
            this.errors.push('manifest.json not found');
        }
    }

    // Update service worker with new cache version
    async updateServiceWorker() {
        logger.step('Updating service worker...');
        
        const swPath = path.join(this.config.distDir, 'sw.js');
        if (fs.existsSync(swPath)) {
            let swContent = fs.readFileSync(swPath, 'utf8');
            
            // Update cache version with timestamp
            const newCacheVersion = `driver-support-v${this.getBuildVersion()}`;
            swContent = swContent.replace(
                /const CACHE_NAME = '[^']*'/g,
                `const CACHE_NAME = '${newCacheVersion}'`
            );
            
            // Update static cache name
            swContent = swContent.replace(
                /const STATIC_CACHE_NAME = '[^']*'/g,
                `const STATIC_CACHE_NAME = '${newCacheVersion}-static'`
            );
            
            fs.writeFileSync(swPath, swContent);
            logger.success('Service Worker updated');
        } else {
            this.errors.push('sw.js not found');
        }
    }

    // Generate sitemap.xml
    async generateSitemap() {
        logger.step('Generating sitemap...');
        
        const baseUrl = this.getBaseUrl();
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${baseUrl}/</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${baseUrl}/test/pwa-tests.html</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.3</priority>
    </url>
</urlset>`;

        fs.writeFileSync(path.join(this.config.distDir, 'sitemap.xml'), sitemap);
        logger.success('Sitemap generated');
    }

    // Validate build output
    async validateBuild() {
        logger.step('Validating build...');
        
        const requiredFiles = [
            'index.html',
            'manifest.json',
            'sw.js',
            'js/app.js'
        ];
        
        const validationErrors = [];
        
        for (const file of requiredFiles) {
            const filePath = path.join(this.config.distDir, file);
            if (!fs.existsSync(filePath)) {
                validationErrors.push(`Missing required file: ${file}`);
            }
        }
        
        // Validate manifest.json
        try {
            const manifestPath = path.join(this.config.distDir, 'manifest.json');
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            
            const requiredManifestFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
            for (const field of requiredManifestFields) {
                if (!manifest[field]) {
                    validationErrors.push(`Missing manifest field: ${field}`);
                }
            }
        } catch (error) {
            validationErrors.push(`Invalid manifest.json: ${error.message}`);
        }
        
        // Validate service worker syntax
        try {
            const swPath = path.join(this.config.distDir, 'sw.js');
            execSync(`node -c "${swPath}"`, { stdio: 'ignore' });
        } catch (error) {
            validationErrors.push('Service Worker has syntax errors');
        }
        
        if (validationErrors.length > 0) {
            this.errors.push(...validationErrors);
            logger.error('Build validation failed');
        } else {
            logger.success('Build validation passed');
        }
    }

    // Generate build report
    async generateBuildReport() {
        logger.step('Generating build report...');
        
        const report = {
            buildTime: new Date().toISOString(),
            buildVersion: this.getBuildVersion(),
            duration: Date.now() - this.startTime,
            config: this.config,
            errors: this.errors,
            warnings: this.warnings,
            filesSizes: this.getFileSizes(),
            totalSize: this.getTotalSize()
        };
        
        fs.writeFileSync(
            path.join(this.config.distDir, 'build-report.json'),
            JSON.stringify(report, null, 2)
        );
        
        // Generate human-readable report
        const humanReport = this.generateHumanReport(report);
        fs.writeFileSync(
            path.join(this.config.distDir, 'BUILD_REPORT.md'),
            humanReport
        );
        
        logger.success('Build report generated');
    }

    // Get file sizes for reporting
    getFileSizes() {
        const sizes = {};
        
        const getSize = (filePath) => {
            try {
                return fs.statSync(filePath).size;
            } catch {
                return 0;
            }
        };
        
        const scanDirectory = (dir, prefix = '') => {
            if (!fs.existsSync(dir)) return;
            
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relativePath = path.join(prefix, entry.name);
                
                if (entry.isDirectory()) {
                    scanDirectory(fullPath, relativePath);
                } else {
                    sizes[relativePath] = getSize(fullPath);
                }
            }
        };
        
        scanDirectory(this.config.distDir);
        return sizes;
    }

    // Get total build size
    getTotalSize() {
        const sizes = this.getFileSizes();
        return Object.values(sizes).reduce((total, size) => total + size, 0);
    }

    // Generate human-readable report
    generateHumanReport(report) {
        const formatSize = (bytes) => {
            const kb = bytes / 1024;
            return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
        };
        
        return `# 🚛 Driver Support PWA - Build Report

## Build Information
- **Build Time**: ${report.buildTime}
- **Build Version**: ${report.buildVersion}
- **Duration**: ${report.duration}ms
- **Total Size**: ${formatSize(report.totalSize)}

## Build Results
- **Errors**: ${report.errors.length}
- **Warnings**: ${report.warnings.length}
- **Status**: ${report.errors.length === 0 ? '✅ SUCCESS' : '❌ FAILED'}

${report.errors.length > 0 ? `
## Errors
${report.errors.map(error => `- ${error}`).join('\n')}
` : ''}

${report.warnings.length > 0 ? `
## Warnings
${report.warnings.map(warning => `- ${warning}`).join('\n')}
` : ''}

## File Sizes
${Object.entries(report.filesSizes)
    .sort((a, b) => b[1] - a[1])
    .map(([file, size]) => `- **${file}**: ${formatSize(size)}`)
    .join('\n')}

## Configuration
\`\`\`json
${JSON.stringify(report.config, null, 2)}
\`\`\`

---
Generated by Driver Support PWA Build Script
`;
    }

    // Get build version (timestamp-based)
    getBuildVersion() {
        return `1.0.${Date.now()}`;
    }

    // Get base URL from package.json or default
    getBaseUrl() {
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            return packageJson.homepage || 'https://username.github.io/driver-support-app';
        } catch {
            return 'https://username.github.io/driver-support-app';
        }
    }
}

// Main execution
async function main() {
    const builder = new PWABuilder(config);
    const success = await builder.build();
    
    if (success) {
        logger.success('🎉 Build completed successfully!');
        process.exit(0);
    } else {
        logger.error('❌ Build failed!');
        process.exit(1);
    }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
🚛 Driver Support PWA Build Script

Usage: node scripts/build.js [options]

Options:
  --no-minify     Skip minification
  --no-optimize   Skip optimization
  --no-sitemap    Skip sitemap generation
  --no-validate   Skip build validation
  --quiet         Reduce output verbosity
  --help, -h      Show this help message

Examples:
  node scripts/build.js                    # Full build
  node scripts/build.js --no-minify       # Build without minification
  node scripts/build.js --quiet           # Quiet build
`);
    process.exit(0);
}

// Parse command line options
if (process.argv.includes('--no-minify')) config.minify = false;
if (process.argv.includes('--no-optimize')) config.optimize = false;
if (process.argv.includes('--no-sitemap')) config.generateSitemap = false;
if (process.argv.includes('--no-validate')) config.validateBuild = false;
if (process.argv.includes('--quiet')) config.verbose = false;

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        logger.error(`Unexpected error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = PWABuilder;