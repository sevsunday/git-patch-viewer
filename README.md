# Git Diff & Patch Viewer

A client-side git patch and diff viewer with syntax highlighting and theming. View, share, and manage git patches entirely in your browser with no backend required.

**Key Features:**
- 20 themes with independent dark/light modes
- View Modes: Modern (react-diff-viewer) and Classic (diff2html)
- Local storage for saving and managing patches
- Shareable URLs with compressed patch data
- Multiple input methods: drag-drop, file browser, paste, or URL
- Syntax highlighting for 20+ programming languages
- Git metadata extraction (commit info, author, date)
- File tree navigation with search and filtering

## Technology Stack

### Dependencies
- **[diff2html](https://github.com/rtfpessoa/diff2html)** - Classic diff rendering
- **[React 18](https://github.com/facebook/react)** + **[react-diff-viewer](https://github.com/praneshr/react-diff-viewer)** - Modern diff viewer
- **[Prism.js](https://github.com/PrismJS/prism)** - Syntax highlighting (20+ languages)
- **[pako](https://github.com/nodeca/pako)** - Gzip compression for URLs
- **[lz-string](https://github.com/pieroxy/lz-string)** - Additional compression

### Custom Modules
- **Theme Manager** - 20+ themes from tweakcn.com
- **Patch Parser** - Git metadata extraction and diff parsing
- **Storage Manager** - localStorage-based patch management
- **URL Handler** - Compression, encoding, and shareable link generation
- **Dual Viewer System** - Toggle between Modern and Classic rendering modes
