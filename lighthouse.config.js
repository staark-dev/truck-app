// 🚛 Driver Support PWA - Lighthouse Configuration
// Configurează auditurile Lighthouse pentru validarea PWA

module.exports = {
  // Extend the default Lighthouse config
  extends: 'lighthouse:default',
  
  // Settings specific pentru PWA
  settings: {
    // Simulează conexiune 3G pentru teste realiste
    throttlingMethod: 'simulate',
    throttling: {
      rttMs: 40,
      throughputKbps: 1024,
      cpuSlowdownMultiplier: 4,
    },
    
    // Device emulation pentru mobile testing
    emulatedFormFactor: 'mobile',
    
    // Configurări pentru PWA
    onlyAudits: [
      // PWA specific audits
      'installable-manifest',
      'splash-screen',
      'themed-omnibox',
      'content-width',
      'viewport',
      'service-worker',
      'works-offline',
      'offline-start-url',
      'apple-touch-icon',
      'maskable-icon',
      
      // Performance critice pentru PWA
      'first-contentful-paint',
      'largest-contentful-paint',
      'interactive',
      'speed-index',
      'cumulative-layout-shift',
      
      // Accessibility pentru șoferi
      'color-contrast',
      'tap-targets',
      'accessible-names',
      'focus-traps',
      
      // Best practices pentru mobile
      'uses-https',
      'uses-http2',
      'efficient-animated-content',
      'uses-optimized-images',
      'uses-text-compression',
      
      // SEO basics
      'document-title',
      'meta-description',
      'robots-txt',
      
      // Security pentru date sensibile
      'is-on-https',
      'external-anchors-use-rel-noopener',
      'geolocation-on-start',
      'notification-on-start'
    ],
    
    // Skip audits not relevant for PWA
    skipAudits: [
      'canonical',
      'plugins',
      'image-aspect-ratio'
    ],
    
    // Configurări pentru headless testing
    chromeFlags: [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--remote-debugging-port=9222'
    ]
  },
  
  // Categorii de audit cu ponderile lor
  categories: {
    // PWA category cu focus pe funcționalitate offline
    pwa: {
      title: 'Progressive Web App',
      description: 'Verifică dacă aplicația respectă standardele PWA',
      auditRefs: [
        {id: 'installable-manifest', weight: 2},
        {id: 'service-worker', weight: 1},
        {id: 'works-offline', weight: 3},
        {id: 'offline-start-url', weight: 1},
        {id: 'splash-screen', weight: 1},
        {id: 'themed-omnibox', weight: 1},
        {id: 'viewport', weight: 2},
        {id: 'apple-touch-icon', weight: 1},
        {id: 'maskable-icon', weight: 1}
      ]
    },
    
    // Performance cu focus pe mobile
    performance: {
      title: 'Performance Mobile',
      description: 'Măsoară performanța pe device-uri mobile',
      auditRefs: [
        {id: 'first-contentful-paint', weight: 10, group: 'metrics'},
        {id: 'largest-contentful-paint', weight: 25, group: 'metrics'},
        {id: 'interactive', weight: 10, group: 'metrics'},
        {id: 'speed-index', weight: 10, group: 'metrics'},
        {id: 'cumulative-layout-shift', weight: 25, group: 'metrics'}
      ]
    },
    
    // Accessibility pentru șoferi (importante pentru siguranță)
    accessibility: {
      title: 'Accessibility & Safety',
      description: 'Verifică accesibilitatea pentru utilizare în camion',
      auditRefs: [
        {id: 'color-contrast', weight: 3},
        {id: 'tap-targets', weight: 5}, // Crucial pentru touch în mișcare
        {id: 'accessible-names', weight: 2},
        {id: 'focus-traps', weight: 2}
      ]
    }
  },
  
  // Grupuri de audit
  groups: {
    'pwa-installable': {
      title: 'PWA Installable',
      description: 'Verifică dacă aplicația poate fi instalată'
    },
    'pwa-optimized': {
      title: 'PWA Optimized',
      description: 'Verifică optimizările PWA'
    },
    'offline': {
      title: 'Offline Capability',
      description: 'Verifică funcționalitatea offline'
    },
    'mobile-friendly': {
      title: 'Mobile Friendly',
      description: 'Verifică adaptarea pentru mobile'
    }
  },
  
  // Audit specific pentru Driver Support PWA
  audits: {
    // Custom audit pentru verificarea funcționalității GPS
    'gps-functionality': {
      title: 'GPS Functionality Available',
      description: 'Verifică dacă funcționalitatea GPS este implementată corect',
      implementation: class GPSAudit {
        static get meta() {
          return {
            id: 'gps-functionality',
            title: 'GPS Functionality',
            description: 'Checks if GPS functionality is properly implemented',
            category: 'pwa',
            scoreDisplayMode: 'binary'
          };
        }
        
        static audit(artifacts) {
          const hasGeolocationAPI = artifacts.mainDocumentContent.includes('navigator.geolocation');
          const hasLocationService = artifacts.mainDocumentContent.includes('LocationService');
          
          return {
            score: (hasGeolocationAPI && hasLocationService) ? 1 : 0,
            displayValue: hasGeolocationAPI && hasLocationService ? 'Available' : 'Missing',
            details: {
              type: 'table',
              headings: [
                {key: 'feature', itemType: 'text', text: 'Feature'},
                {key: 'status', itemType: 'text', text: 'Status'}
              ],
              items: [
                {feature: 'Geolocation API', status: hasGeolocationAPI ? '✅' : '❌'},
                {feature: 'Location Service', status: hasLocationService ? '✅' : '❌'}
              ]
            }
          };
        }
      }
    },
    
    // Custom audit pentru verificarea compliance tracking
    'compliance-tracking': {
      title: 'Compliance Tracking Available',
      description: 'Verifică dacă tracking-ul de conformitate este implementat',
      implementation: class ComplianceAudit {
        static get meta() {
          return {
            id: 'compliance-tracking',
            title: 'Compliance Tracking',
            description: 'Checks if compliance tracking features are implemented',
            category: 'pwa',
            scoreDisplayMode: 'binary'
          };
        }
        
        static audit(artifacts) {
          const hasTimeTracker = artifacts.mainDocumentContent.includes('TimeTracker');
          const hasAlertSystem = artifacts.mainDocumentContent.includes('AlertSystem');
          const hasComplianceRules = artifacts.mainDocumentContent.includes('complianceRules');
          
          return {
            score: (hasTimeTracker && hasAlertSystem && hasComplianceRules) ? 1 : 0,
            displayValue: 'Compliance features implemented',
            details: {
              type: 'table',
              headings: [
                {key: 'component', itemType: 'text', text: 'Component'},
                {key: 'implemented', itemType: 'text', text: 'Implemented'}
              ],
              items: [
                {component: 'Time Tracker', implemented: hasTimeTracker ? '✅' : '❌'},
                {component: 'Alert System', implemented: hasAlertSystem ? '✅' : '❌'},
                {component: 'Compliance Rules', implemented: hasComplianceRules ? '✅' : '❌'}
              ]
            }
          };
        }
      }
    }
  },
  
  // Assert configurations pentru CI
  assertions: {
    // PWA requirements
    'installable-manifest': 'error',
    'service-worker': 'error',
    'works-offline': 'error',
    'viewport': 'error',
    
    // Performance thresholds pentru mobile usage
    'first-contentful-paint': ['warn', {maxNumericValue: 2000}],
    'largest-contentful-paint': ['warn', {maxNumericValue: 4000}],
    'interactive': ['warn', {maxNumericValue: 5000}],
    'cumulative-layout-shift': ['warn', {maxNumericValue: 0.1}],
    
    // Accessibility requirements pentru safety
    'color-contrast': 'error',
    'tap-targets': 'error', // Critical pentru touch în vehicul
    
    // Security requirements
    'is-on-https': 'error',
    'geolocation-on-start': 'warn', // GPS nu trebuie să pornească automat
    'notification-on-start': 'warn'
  },
  
  // Output configuration
  output: ['html', 'json'],
  outputPath: './lighthouse-reports/',
  
  // Budget configuration pentru performance
  budgets: [
    {
      resourceType: 'script',
      budget: 300 // KB
    },
    {
      resourceType: 'image', 
      budget: 500 // KB
    },
    {
      resourceType: 'stylesheet',
      budget: 50 // KB
    },
    {
      resourceType: 'total',
      budget: 1000 // KB total
    }
  ],
  
  // Plugins pentru verificări suplimentare
  plugins: [
    'lighthouse-plugin-field-performance'
  ]
};

// Export și configurări specifice pentru environment-uri diferite
module.exports.ci = {
  collect: {
    numberOfRuns: 3,
    settings: {
      chromeFlags: '--no-sandbox --disable-gpu --headless'
    }
  },
  assert: {
    assertions: {
      'categories:performance': ['warn', {minScore: 0.8}],
      'categories:pwa': ['error', {minScore: 0.9}],
      'categories:accessibility': ['error', {minScore: 0.9}],
      'categories:best-practices': ['warn', {minScore: 0.8}],
      'categories:seo': ['warn', {minScore: 0.8}]
    }
  },
  upload: {
    target: 'filesystem',
    outputDir: './lighthouse-ci-results'
  }
};

// Development configuration
module.exports.dev = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['pwa', 'performance'],
    throttling: {
      rttMs: 40,
      throughputKbps: 10240, // Faster for dev
      cpuSlowdownMultiplier: 1
    }
  }
};

// Production configuration
module.exports.prod = {
  extends: 'lighthouse:default',
  settings: {
    throttling: {
      rttMs: 150, // Slower connection pentru teste realiste
      throughputKbps: 1638,
      cpuSlowdownMultiplier: 4
    }
  }
};