# SPARE PARTS MANAGEMENT SYSTEM - Restructured Architecture

## Overview
Converted from single monolithic HTML file to modular structure for better maintainability.

## Directory Structure
```
voltgrid-store/
├── index.html                 # Main HTML shell
├── css/
│   ├── variables.css         # CSS custom properties (colors, sizing)
│   ├── base.css              # Base styles & resets
│   ├── components.css        # Reusable component styles
│   └── layout.css            # Grid, flexbox, responsive
├── js/
│   ├── config.js             # App configuration & constants
│   ├── storage.js            # Database & localStorage handlers
│   ├── state.js              # Application state management
│   ├── auth.js               # Authentication & login
│   ├── roles.js              # Role-based access control
│   ├── utils/
│   │   ├── formatting.js     # Date, currency, string formatting
│   │   ├── dom.js            # DOM query helpers
│   │   └── math.js           # Calculation utilities
│   ├── models/
│   │   ├── parts.js          # Parts data & business logic
│   │   ├── tools.js          # Tools data & business logic
│   │   ├── pos.js            # Purchase orders logic
│   │   ├── logs.js           # Activity logging
│   │   └── warranty.js       # Warranty calculations
│   ├── pages/
│   │   ├── home.js           # Dashboard page
│   │   ├── parts.js          # Parts inventory page
│   │   ├── tools.js          # Tools management page
│   │   ├── calibration.js    # Calibration tracking
│   │   ├── warranty.js       # Warranty overview
│   │   ├── po.js             # Purchase orders page
│   │   ├── log.js            # Activity log
│   │   └── admin.js          # Settings/admin
│   ├── ui/
│   │   ├── modals.js         # Modal dialogs
│   │   ├── menus.js          # Context menus
│   │   ├── toast.js          # Toast notifications
│   │   ├── photos.js         # Photo handling
│   │   └── components.js     # Reusable UI components
│   ├── navigation.js         # Navigation & routing
│   ├── app.js                # Main application orchestrator
│   └── index.js              # Entry point - loads all modules
└── data/
    └── seed.js               # Demo data generator
```

## Module Responsibilities

### Core
- **index.html**: Minimal HTML with script tags & container divs
- **config.js**: Database names, constants, demo users
- **storage.js**: IndexedDB & localStorage abstraction
- **state.js**: Global application state object

### Authentication
- **auth.js**: Login flow, session management
- **roles.js**: ROLES constant, permissions check

### Data Models
- **parts.js**: Part inventory operations
- **tools.js**: Tool checkout & calibration
- **pos.js**: Purchase order lifecycle
- **logs.js**: Activity log creation & filtering
- **warranty.js**: Warranty expiry calculations

### UI Layer
- **modals.js**: openModal(), closeModal()
- **menus.js**: Context menu rendering
- **toast.js**: Notifications
- **photos.js**: Image upload, compression, display
- **components.js**: Reusable badges, pills, progress bars

### Pages
- Each page file handles its specific page rendering
- Exports: render function, event handlers
- Imports: state, models, UI components

### Utilities
- **formatting.js**: Date/time/money formatting
- **dom.js**: Query shortcuts, element creation
- **math.js**: Stock calculations, flow analytics

## Migration Strategy

1. **Extract CSS** → Separate by concern (variables, base, components, layout)
2. **Extract Models** → Data logic separate from UI
3. **Extract UI** → Modals, menus, toast as separate modules
4. **Extract Pages** → Each page gets its own module
5. **Extract Utils** → Formatting, DOM, math helpers
6. **Create index.js** → Single entry point that loads all modules
7. **Simplify index.html** → Just structure, loading script

## Benefits

✅ **Modularity**: Each concern in its own file
✅ **Reusability**: Components & utilities easily imported
✅ **Maintainability**: Find what you need in seconds
✅ **Testing**: Each module can be tested independently
✅ **Debugging**: Stack traces show exactly which file
✅ **Collaboration**: Multiple developers can work on different modules
✅ **Scalability**: Easy to add new pages/features

## Build Considerations

For production, consider:
- Bundle modules with Webpack/Rollup
- Minify CSS & JS
- Lazy-load pages
- Tree-shake unused code
- Add source maps for debugging

## Backwards Compatibility

The single HTML file still works during transition. You can:
1. Keep using the original for now
2. Gradually migrate modules
3. Use a bundler to combine modules for deployment
4. Eventually drop the monolithic file
