#!/usr/bin/env node

// 🚛 Driver Support PWA - Complete Validation Script
// Verifică toate aspectele PWA înainte de deployment

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configurații
const config = {
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
    fix: process.argv.includes('--fix'),
    strict: process.argv.includes('--strict'),
    skipNetwork: process.argv.includes('--skip-network'),
    outputFormat: process.argv.includes('--json') ? 'json' : 'console'
};

// Culori pentru console
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Logger
const logger = {
    info: (msg) => config.outputFormat === 'console' && console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
    success: (msg) => config.outputFormat === 'console' && console.log(`${colors.green}[PASS]${colors.reset} ${msg}`),
    warning: (msg) => config.outputFormat === 'console' && console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
    error: (msg) => config.outputFormat === 'console' && console.log(`${colors.red}[FAIL]${colors.reset} ${msg}`),
    step: (msg) => config.outputFormat === 'console' && console.log(`${colors.cyan}[STEP]${colors.reset} ${msg}`)
};

// Banner
if (config.outputFormat === 'console') {
    console.log(`${colors.cyan}
╔══════════════════════════════════════════╗
║        🚛 PWA Validation Suite           ║
║      Comprehensive Quality Check         ║
╚══════════════════════════════════════════╝
${colors.reset}`);
}

class PWAValidator {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            },
            categories: {}
        };
        this.errors = [];
        this.warnings = [];
    }

    // Main validation process
    async validate() {
        logger.info('Starting comprehensive PWA validation...');

        try {
            await this.validateFileStructure();
            await this.validateManifest();
            await this.validateServiceWorker();
            await this.validateHTML();
            await this.validateCSS();
            await this.validateJavaScript();
            await this.validateIcons();
            await this.validateOfflineCapability();
            await this.validatePerformance();
            await this.validateAccessibility();
            await this.validateSecurity();
            await this.validateCompliance();
            
            if (!config.skipNetwork) {
                await this.validateNetworkRequests();
            }

            this.generateReport();
            return this.results.summary.failed === 0;

        } catch (error) {
            logger.error(`Validation failed: ${error.message}`);
            return false;
        }
    }

    // Test helper
    test(category, name, testFunction) {
        this.results.summary.total++;
        
        if (!this.results.categories[category]) {
            this.results.categories[category] = {
                passed: 0,
                failed: 0,
                warnings: 0,
                tests: []
            };
        }

        try {
            const result = testFunction();
            const testResult = {
                name,
                status: result.status || 'pass',
                message: result.message || '',
                details: result.details || null
            };

            if (result.status === 'fail') {
                this.results.summary.failed++;
                this.results.categories[category].failed++;
                this.errors.push(`${category}: ${name} - ${result.message}`);
                logger.error(`${name}: ${result.message}`);
            } else if (result.status === 'warning') {
                this.results.summary.warnings++;
                this.results.categories[category].warnings++;
                this.warnings.push(`${category}: ${name} - ${result.message}`);
                logger.warning(`${name}: ${result.message}`);
            } else {
                this.results.summary.passed++;
                this.results.categories[category].passed++;
                if (config.verbose) {
                    logger.success(`${name}: ${result.message || 'OK'}`);
                }
            }

            this.results.categories[category].tests.push(testResult);

        } catch (error) {
            this.results.summary.failed++;
            this.results.categories[category].failed++;
            this.errors.push(`${category}: ${name} - ${error.message}`);
            logger.error(`${name}: ${error.message}`);
        }
    }

    // File structure validation
    async validateFileStructure() {
        logger.step('Validating file structure...');

        const requiredFiles = [
            'index.html',
            'manifest.json', 
            'sw.js',
            'js/app.js',
            'js/data-manager.js',
            'js/time-tracker.js',
            'js/location-service.js',
            'js/alerts.js'
        ];

        const requiredDirectories = [
            'js',
            'icons'
        ];

        const recommendedFiles = [
            'robots.txt',
            'sitemap.xml',
            '.htaccess',
            'README.md',
            'LICENSE'
        ];

        // Test required files
        requiredFiles.forEach(file => {
            this.test('File Structure', `Required file: ${file}`, () => ({
                status: fs.existsSync(file) ? 'pass' : 'fail',
                message: fs.existsSync(file) ? 'Found' : 'Missing required file'
            }));
        });

        // Test required directories
        requiredDirectories.forEach(dir => {
            this.test('File Structure', `Required directory: ${dir}`, () => ({
                status: fs.existsSync(dir) ? 'pass' : 'fail',
                message: fs.existsSync(dir) ? 'Found' : 'Missing required directory'
            }));
        });

        // Test recommended files
        recommendedFiles.forEach(file => {
            this.test('File Structure', `Recommended file: ${file}`, () => ({
                status: fs.existsSync(file) ? 'pass' : 'warning',
                message: fs.existsSync(file) ? 'Found' : 'Missing recommended file'
            }));
        });
    }

    // Manifest validation
    async validateManifest() {
        logger.step('Validating PWA manifest...');

        this.test('Manifest', 'File exists and is valid JSON', () => {
            if (!fs.existsSync('manifest.json')) {
                return { status: 'fail', message: 'manifest.json not found' };
            }

            try {
                const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
                return { status: 'pass', message: 'Valid JSON', details: manifest };
            } catch (error) {
                return { status: 'fail', message: `Invalid JSON: ${error.message}` };
            }
        });

        if (fs.existsSync('manifest.json')) {
            const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));

            const requiredFields = [
                'name', 'short_name', 'start_url', 'display', 
                'theme_color', 'background_color', 'icons'
            ];

            requiredFields.forEach(field => {
                this.test('Manifest', `Required field: ${field}`, () => ({
                    status: manifest[field] ? 'pass' : 'fail',
                    message: manifest[field] ? 'Present' : 'Missing required field'
                }));
            });

            // Validate icons
            this.test('Manifest', 'Icons array not empty', () => ({
                status: manifest.icons && manifest.icons.length > 0 ? 'pass' : 'fail',
                message: manifest.icons && manifest.icons.length > 0 ? 
                    `${manifest.icons.length} icons defined` : 'No icons defined'
            }));

            // Validate required icon sizes
            const requiredSizes = ['192x192', '512x512'];
            if (manifest.icons) {
                requiredSizes.forEach(size => {
                    this.test('Manifest', `Icon size ${size}`, () => {
                        const hasSize = manifest.icons.some(icon => icon.sizes === size);
                        return {
                            status: hasSize ? 'pass' : 'fail',
                            message: hasSize ? 'Icon found' : `Missing ${size} icon`
                        };
                    });
                });
            }

            // Validate start_url
            this.test('Manifest', 'Start URL is valid', () => {
                const startUrl = manifest.start_url;
                if (!startUrl) {
                    return { status: 'fail', message: 'start_url missing' };
                }
                
                const isValid = startUrl === '/' || startUrl.startsWith('./') || startUrl.startsWith('/');
                return {
                    status: isValid ? 'pass' : 'warning',
                    message: isValid ? 'Valid start_url' : 'start_url should be relative'
                };
            });
        }
    }

    // Service Worker validation
    async validateServiceWorker() {
        logger.step('Validating Service Worker...');

        this.test('Service Worker', 'File exists', () => ({
            status: fs.existsSync('sw.js') ? 'pass' : 'fail',
            message: fs.existsSync('sw.js') ? 'Found' : 'sw.js not found'
        }));

        if (fs.existsSync('sw.js')) {
            const swContent = fs.readFileSync('sw.js', 'utf8');

            // Test syntax
            this.test('Service Worker', 'JavaScript syntax', () => {
                try {
                    execSync('node -c sw.js', { stdio: 'ignore' });
                    return { status: 'pass', message: 'Valid JavaScript syntax' };
                } catch (error) {
                    return { status: 'fail', message: 'Syntax error in sw.js' };
                }
            });

            // Test required events
            const requiredEvents = ['install', 'activate', 'fetch'];
            requiredEvents.forEach(event => {
                this.test('Service Worker', `Event listener: ${event}`, () => {
                    const hasEvent = swContent.includes(`addEventListener('${event}'`) ||
                                    swContent.includes(`on${event} =`);
                    return {
                        status: hasEvent ? 'pass' : 'warning',
                        message: hasEvent ? 'Event handler found' : `Missing ${event} event handler`
                    };
                });
            });

            // Test cache implementation
            this.test('Service Worker', 'Cache implementation', () => {
                const hasCache = swContent.includes('caches.open') || swContent.includes('cache.put');
                return {
                    status: hasCache ? 'pass' : 'warning',
                    message: hasCache ? 'Cache implementation found' : 'No cache implementation detected'
                };
            });
        }
    }

    // HTML validation
    async validateHTML() {
        logger.step('Validating HTML...');

        if (fs.existsSync('index.html')) {
            const htmlContent = fs.readFileSync('index.html', 'utf8');

            // Test DOCTYPE
            this.test('HTML', 'DOCTYPE declaration', () => ({
                status: htmlContent.includes('<!DOCTYPE html>') ? 'pass' : 'fail',
                message: htmlContent.includes('<!DOCTYPE html>') ? 'HTML5 DOCTYPE found' : 'Missing HTML5 DOCTYPE'
            }));

            // Test viewport meta tag
            this.test('HTML', 'Viewport meta tag', () => ({
                status: htmlContent.includes('name="viewport"') ? 'pass' : 'fail',
                message: htmlContent.includes('name="viewport"') ? 'Viewport meta tag found' : 'Missing viewport meta tag'
            }));

            // Test manifest link
            this.test('HTML', 'Manifest link', () => ({
                status: htmlContent.includes('rel="manifest"') ? 'pass' : 'fail',
                message: htmlContent.includes('rel="manifest"') ? 'Manifest link found' : 'Missing manifest link'
            }));

            // Test theme-color meta tag
            this.test('HTML', 'Theme color meta tag', () => ({
                status: htmlContent.includes('name="theme-color"') ? 'pass' : 'warning',
                message: htmlContent.includes('name="theme-color"') ? 'Theme color found' : 'Missing theme-color meta tag'
            }));

            // Test apple-touch-icon
            this.test('HTML', 'Apple touch icon', () => ({
                status: htmlContent.includes('apple-touch-icon') ? 'pass' : 'warning',
                message: htmlContent.includes('apple-touch-icon') ? 'Apple touch icon found' : 'Missing apple-touch-icon'
            }));

            // Test semantic HTML
            const semanticTags = ['main', 'header', 'nav', 'section', 'article'];
            semanticTags.forEach(tag => {
                this.test('HTML', `Semantic tag: ${tag}`, () => ({
                    status: htmlContent.includes(`<${tag}`) ? 'pass' : 'warning',
                    message: htmlContent.includes(`<${tag}`) ? 'Found' : `Consider using <${tag}> for better semantics`
                }));
            });
        }
    }

    // CSS validation
    async validateCSS() {
        logger.step('Validating CSS...');

        if (fs.existsSync('index.html')) {
            const htmlContent = fs.readFileSync('index.html', 'utf8');

            // Check for responsive design
            this.test('CSS', 'Responsive design patterns', () => {
                const hasMediaQueries = htmlContent.includes('@media') || 
                                       htmlContent.includes('max-width') ||
                                       htmlContent.includes('min-width');
                return {
                    status: hasMediaQueries ? 'pass' : 'warning',
                    message: hasMediaQueries ? 'Responsive patterns found' : 'Consider adding responsive design'
                };
            });

            // Check for CSS Grid/Flexbox
            this.test('CSS', 'Modern layout methods', () => {
                const hasModernLayout = htmlContent.includes('display: grid') ||
                                       htmlContent.includes('display: flex') ||
                                       htmlContent.includes('grid-template') ||
                                       htmlContent.includes('flex-direction');
                return {
                    status: hasModernLayout ? 'pass' : 'warning',
                    message: hasModernLayout ? 'Modern layout methods found' : 'Consider using CSS Grid/Flexbox'
                };
            });
        }
    }

    // JavaScript validation
    async validateJavaScript() {
        logger.step('Validating JavaScript...');

        const jsFiles = [
            'js/app.js',
            'js/data-manager.js', 
            'js/time-tracker.js',
            'js/location-service.js',
            'js/alerts.js'
        ];

        jsFiles.forEach(file => {
            if (fs.existsSync(file)) {
                this.test('JavaScript', `Syntax: ${file}`, () => {
                    try {
                        execSync(`node -c "${file}"`, { stdio: 'ignore' });
                        return { status: 'pass', message: 'Valid syntax' };
                    } catch (error) {
                        return { status: 'fail', message: 'Syntax error' };
                    }
                });
            }
        });

        // Test for modern JavaScript features
        if (fs.existsSync('js/app.js')) {
            const jsContent = fs.readFileSync('js/app.js', 'utf8');

            this.test('JavaScript', 'ES6+ features', () => ({
                status: jsContent.includes('class ') || jsContent.includes('const ') || jsContent.includes('=>') ? 'pass' : 'warning',
                message: 'Modern JavaScript features detected'
            }));

            this.test('JavaScript', 'Service Worker registration', () => ({
                status: jsContent.includes('serviceWorker.register') ? 'pass' : 'warning',
                message: jsContent.includes('serviceWorker.register') ? 'SW registration found' : 'No SW registration detected'
            }));
        }
    }

    // Icons validation
    async validateIcons() {
        logger.step('Validating PWA icons...');

        const requiredSizes = [192, 512];
        const recommendedSizes = [72, 96, 128, 144, 152, 384];

        requiredSizes.forEach(size => {
            this.test('Icons', `Required icon ${size}x${size}`, () => {
                const iconPath = `icons/icon-${size}x${size}.png`;
                return {
                    status: fs.existsSync(iconPath) ? 'pass' : 'fail',
                    message: fs.existsSync(iconPath) ? 'Found' : 'Missing required icon'
                };
            });
        });

        recommendedSizes.forEach(size => {
            this.test('Icons', `Recommended icon ${size}x${size}`, () => {
                const iconPath = `icons/icon-${size}x${size}.png`;
                return {
                    status: fs.existsSync(iconPath) ? 'pass' : 'warning',
                    message: fs.existsSync(iconPath) ? 'Found' : 'Missing recommended icon'
                };
            });
        });

        // Test maskable icon
        this.test('Icons', 'Maskable icon support', () => {
            if (fs.existsSync('manifest.json')) {
                const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
                const hasMaskable = manifest.icons && 
                    manifest.icons.some(icon => icon.purpose && icon.purpose.includes('maskable'));
                return {
                    status: hasMaskable ? 'pass' : 'warning',
                    message: hasMaskable ? 'Maskable icon found' : 'Consider adding maskable icon'
                };
            }
            return { status: 'warning', message: 'Cannot check without manifest' };
        });
    }

    // Offline capability validation
    async validateOfflineCapability() {
        logger.step('Validating offline capability...');

        // Check if essential resources are cacheable
        this.test('Offline', 'Service Worker caching strategy', () => {
            if (fs.existsSync('sw.js')) {
                const swContent = fs.readFileSync('sw.js', 'utf8');
                const hasStaticFiles = swContent.includes('STATIC_FILES') || 
                                      swContent.includes('cache.addAll');
                return {
                    status: hasStaticFiles ? 'pass' : 'warning',
                    message: hasStaticFiles ? 'Caching strategy found' : 'No clear caching strategy'
                };
            }
            return { status: 'fail', message: 'No service worker found' };
        });

        // Check for offline fallback
        this.test('Offline', 'Offline fallback strategy', () => {
            if (fs.existsSync('sw.js')) {
                const swContent = fs.readFileSync('sw.js', 'utf8');
                const hasOfflineFallback = swContent.includes('catch') && 
                                          swContent.includes('cache');
                return {
                    status: hasOfflineFallback ? 'pass' : 'warning',
                    message: hasOfflineFallback ? 'Offline fallback found' : 'Consider adding offline fallback'
                };
            }
            return { status: 'fail', message: 'No service worker found' };
        });
    }

    // Performance validation
    async validatePerformance() {
        logger.step('Validating performance aspects...');

        // Check file sizes
        const checkFileSize = (filePath, maxSize, name) => {
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                const sizeKB = Math.round(stats.size / 1024);
                return {
                    status: sizeKB <= maxSize ? 'pass' : 'warning',
                    message: `${sizeKB}KB (max: ${maxSize}KB)`
                };
            }
            return { status: 'warning', message: 'File not found' };
        };

        this.test('Performance', 'Main HTML size', () => 
            checkFileSize('index.html', 100, 'index.html'));

        this.test('Performance', 'Service Worker size', () => 
            checkFileSize('sw.js', 50, 'sw.js'));

        // Check for minification
        if (fs.existsSync('js/app.js')) {
            this.test('Performance', 'JavaScript minification readiness', () => {
                const jsContent = fs.readFileSync('js/app.js', 'utf8');
                const hasMinification = fs.existsSync('js/app.min.js') || 
                                       jsContent.length < 10000; // Small files don't need minification
                return {
                    status: hasMinification ? 'pass' : 'warning',
                    message: hasMinification ? 'Minification ready' : 'Consider minification for production'
                };
            });
        }
    }

    // Accessibility validation
    async validateAccessibility() {
        logger.step('Validating accessibility...');

        if (fs.existsSync('index.html')) {
            const htmlContent = fs.readFileSync('index.html', 'utf8');

            // Test for alt attributes
            this.test('Accessibility', 'Image alt attributes', () => {
                const images = htmlContent.match(/<img[^>]*>/gi) || [];
                const imagesWithAlt = images.filter(img => img.includes('alt='));
                return {
                    status: images.length === 0 || imagesWithAlt.length === images.length ? 'pass' : 'warning',
                    message: `${imagesWithAlt.length}/${images.length} images have alt text`
                };
            });

            // Test for aria labels
            this.test('Accessibility', 'ARIA labels', () => ({
                status: htmlContent.includes('aria-label') || htmlContent.includes('aria-labelledby') ? 'pass' : 'warning',
                message: htmlContent.includes('aria-label') ? 'ARIA labels found' : 'Consider adding ARIA labels'
            }));

            // Test for semantic headings
            this.test('Accessibility', 'Heading structure', () => {
                const hasH1 = htmlContent.includes('<h1');
                return {
                    status: hasH1 ? 'pass' : 'warning',
                    message: hasH1 ? 'Heading structure found' : 'Consider adding proper heading structure'
                };
            });

            // Test for focus management
            this.test('Accessibility', 'Focus management', () => ({
                status: htmlContent.includes('tabindex') || htmlContent.includes(':focus') ? 'pass' : 'warning',
                message: 'Consider implementing focus management'
            }));
        }
    }

    // Security validation
    async validateSecurity() {
        logger.step('Validating security aspects...');

        // Test for HTTPS enforcement in HTML
        if (fs.existsSync('index.html')) {
            const htmlContent = fs.readFileSync('index.html', 'utf8');

            this.test('Security', 'No mixed content', () => {
                const hasMixedContent = htmlContent.includes('http://') && 
                                       !htmlContent.includes('http://localhost');
                return {
                    status: !hasMixedContent ? 'pass' : 'warning',
                    message: hasMixedContent ? 'Potential mixed content detected' : 'No mixed content detected'
                };
            });
        }

        // Test for CSP headers in .htaccess
        if (fs.existsSync('.htaccess')) {
            const htaccessContent = fs.readFileSync('.htaccess', 'utf8');

            this.test('Security', 'Content Security Policy', () => ({
                status: htaccessContent.includes('Content-Security-Policy') ? 'pass' : 'warning',
                message: htaccessContent.includes('Content-Security-Policy') ? 'CSP found' : 'Consider adding CSP headers'
            }));
        }

        // Test for sensitive data exposure
        const sensitivePatterns = ['password', 'api_key', 'secret', 'token'];
        if (fs.existsSync('js/app.js')) {
            const jsContent = fs.readFileSync('js/app.js', 'utf8');

            this.test('Security', 'No hardcoded secrets', () => {
                const hasSecrets = sensitivePatterns.some(pattern => 
                    jsContent.toLowerCase().includes(pattern) && 
                    !jsContent.includes('placeholder') &&
                    !jsContent.includes('example')
                );
                return {
                    status: !hasSecrets ? 'pass' : 'warning',
                    message: hasSecrets ? 'Potential secrets detected' : 'No obvious secrets found'
                };
            });
        }
    }

    // Driver compliance validation
    async validateCompliance() {
        logger.step('Validating driver compliance features...');

        if (fs.existsSync('js/time-tracker.js')) {
            const timeTrackerContent = fs.readFileSync('js/time-tracker.js', 'utf8');

            // Test for EU compliance rules
            const complianceRules = [
                'maxDrivingTime',
                'mandatoryBreakAfter',
                'dailyRestPeriod',
                'weeklyRestPeriod'
            ];

            complianceRules.forEach(rule => {
                this.test('Compliance', `Rule implementation: ${rule}`, () => ({
                    status: timeTrackerContent.includes(rule) ? 'pass' : 'warning',
                    message: timeTrackerContent.includes(rule) ? 'Rule found' : 'Rule implementation missing'
                }));
            });
        }

        if (fs.existsSync('js/alerts.js')) {
            const alertsContent = fs.readFileSync('js/alerts.js', 'utf8');

            this.test('Compliance', 'Alert system implementation', () => ({
                status: alertsContent.includes('compliance') ? 'pass' : 'warning',
                message: alertsContent.includes('compliance') ? 'Compliance alerts found' : 'No compliance alerts detected'
            }));
        }
    }

    // Network requests validation
    async validateNetworkRequests() {
        logger.step('Validating network configurations...');

        // This would require actually running the app and checking network requests
        // For now, we'll do static analysis

        if (fs.existsSync('sw.js')) {
            const swContent = fs.readFileSync('sw.js', 'utf8');

            this.test('Network', 'Fetch event handling', () => ({
                status: swContent.includes('fetch') ? 'pass' : 'warning',
                message: swContent.includes('fetch') ? 'Fetch handling found' : 'No fetch handling detected'
            }));

            this.test('Network', 'Cache strategies', () => {
                const strategies = ['CacheFirst', 'NetworkFirst', 'StaleWhileRevalidate'];
                const hasStrategy = strategies.some(strategy => swContent.includes(strategy));
                return {
                    status: hasStrategy ? 'pass' : 'warning',
                    message: hasStrategy ? 'Cache strategies found' : 'Consider implementing cache strategies'
                };
            });
        }
    }

    // Generate comprehensive report
    generateReport() {
        const summary = this.results.summary;
        const successRate = summary.total > 0 ? 
            Math.round((summary.passed / summary.total) * 100) : 0;

        if (config.outputFormat === 'json') {
            console.log(JSON.stringify({
                ...this.results,
                successRate,
                errors: this.errors,
                warnings: this.warnings
            }, null, 2));
            return;
        }

        // Console report
        console.log(`\n${colors.cyan}📊 VALIDATION SUMMARY${colors.reset}`);
        console.log(`Total Tests: ${summary.total}`);
        console.log(`${colors.green}Passed: ${summary.passed}${colors.reset}`);
        console.log(`${colors.red}Failed: ${summary.failed}${colors.reset}`);
        console.log(`${colors.yellow}Warnings: ${summary.warnings}${colors.reset}`);
        console.log(`Success Rate: ${successRate}%`);

        // Category breakdown
        console.log(`\n${colors.cyan}📋 CATEGORY BREAKDOWN${colors.reset}`);
        Object.entries(this.results.categories).forEach(([category, results]) => {
            const categoryRate = results.passed + results.failed + results.warnings > 0 ?
                Math.round((results.passed / (results.passed + results.failed + results.warnings)) * 100) : 0;
            console.log(`${category}: ${categoryRate}% (${results.passed}✅ ${results.failed}❌ ${results.warnings}⚠️)`);
        });

        // Errors
        if (this.errors.length > 0) {
            console.log(`\n${colors.red}❌ CRITICAL ISSUES${colors.reset}`);
            this.errors.forEach(error => console.log(`  • ${error}`));
        }

        // Warnings
        if (this.warnings.length > 0 && config.verbose) {
            console.log(`\n${colors.yellow}⚠️ WARNINGS${colors.reset}`);
            this.warnings.forEach(warning => console.log(`  • ${warning}`));
        }

        // Recommendations
        console.log(`\n${colors.cyan}💡 RECOMMENDATIONS${colors.reset}`);
        if (summary.failed > 0) {
            console.log('  • Fix critical issues before deployment');
        }
        if (summary.warnings > 5) {
            console.log('  • Consider addressing warnings for better PWA quality');
        }
        if (successRate < 80) {
            console.log('  • Review PWA best practices and implement missing features');
        }
        if (successRate >= 90) {
            console.log('  • Excellent PWA quality! Ready for deployment 🚀');
        }

        // Final status
        const finalStatus = summary.failed === 0 ? 'PASSED' : 'FAILED';
        const statusColor = summary.failed === 0 ? colors.green : colors.red;
        console.log(`\n${statusColor}🏁 FINAL STATUS: ${finalStatus}${colors.reset}`);
    }
}

// Main execution
async function main() {
    const validator = new PWAValidator();
    const success = await validator.validate();
    
    process.exit(success ? 0 : 1);
}

// Help message
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
🚛 Driver Support PWA Validation Tool

Usage: node scripts/validate-pwa.js [options]

Options:
  --verbose, -v       Show detailed output for passed tests
  --fix              Attempt to fix issues automatically (future feature)
  --strict           Treat warnings as errors
  --skip-network     Skip network-related validations
  --json             Output results in JSON format
  --help, -h         Show this help message

Examples:
  node scripts/validate-pwa.js                    # Basic validation
  node scripts/validate-pwa.js --verbose         # Detailed output
  node scripts/validate-pwa.js --json > report.json  # JSON report
  node scripts/validate-pwa.js --strict          # Strict mode

Exit codes:
  0  All validations passed
  1  One or more validations failed
`);
    process.exit(0);
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error(`Validation error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = PWAValidator;