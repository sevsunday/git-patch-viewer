/**
 * Theme Manager
 * Handles theme switching, dark/light mode toggle, and localStorage persistence
 */

const ThemeManager = (() => {
  // Available themes from tweakcn.com
  // Each theme has 4 colors: primary, secondary, accent, background
  const THEMES = [
    { id: 'cosmic-night', name: 'Cosmic Night', colors: ['#a48fff', '#4ade80', '#60a5fa', '#1a1a25'], category: 'Popular' },
    { id: 'catppuccin', name: 'Catppuccin', colors: ['#cba6f7', '#a6e3a1', '#89b4fa', '#11111b'], category: 'Popular' },
    { id: 'bubblegum', name: 'Bubblegum', colors: ['#ff6bdc', '#70f0a0', '#8bb3ff', '#301a40'], category: 'Popular' },
    { id: 'pastel-dreams', name: 'Pastel Dreams', colors: ['#b4a0ff', '#a8e0c0', '#a8c8ff', '#302840'], category: 'Popular' },
    { id: 'cyberpunk', name: 'Cyberpunk', colors: ['#ff0080', '#00ff9f', '#00aaff', '#210e48'], category: 'Vibrant' },
    { id: 'quantum-rose', name: 'Quantum Rose', colors: ['#ff4da6', '#66ffaa', '#66bbff', '#351630'], category: 'Vibrant' },
    { id: 'neon-nights', name: 'Neon Nights', colors: ['#00ffff', '#00ff00', '#0088ff', '#200035'], category: 'Vibrant' },
    { id: 'nord', name: 'Nord', colors: ['#88c0d0', '#a3be8c', '#81a1c1', '#434c5e'], category: 'Cool' },
    { id: 'dracula', name: 'Dracula', colors: ['#bd93f9', '#50fa7b', '#8be9fd', '#191a21'], category: 'Popular' },
    { id: 'tokyo-night', name: 'Tokyo Night', colors: ['#7aa2f7', '#9ece6a', '#7dcfff', '#24283b'], category: 'Cool' },
    { id: 'gruvbox', name: 'Gruvbox', colors: ['#fe8019', '#b8bb26', '#83a598', '#3c3836'], category: 'Warm' },
    { id: 'monokai', name: 'Monokai', colors: ['#f92672', '#a6e22e', '#66d9ef', '#3e3d32'], category: 'Popular' },
    { id: 'solarized', name: 'Solarized', colors: ['#268bd2', '#859900', '#2aa198', '#0e4a59'], category: 'Classic' },
    { id: 'slate', name: 'Slate', colors: ['#38bdf8', '#4ade80', '#60a5fa', '#334155'], category: 'Neutral' },
    { id: 'zinc', name: 'Zinc', colors: ['#a1a1aa', '#4ade80', '#60a5fa', '#3f3f46'], category: 'Neutral' },
    { id: 'rose', name: 'Rose Pine', colors: ['#ebbcba', '#9ccfd8', '#c4a7e7', '#26233a'], category: 'Warm' },
    { id: 'amethyst-haze', name: 'Amethyst Haze', colors: ['#9966ff', '#66d9aa', '#6699ff', '#301a45'], category: 'Cool' },
    { id: 'midnight', name: 'Midnight', colors: ['#6080d0', '#50c080', '#5090d0', '#1a1b2a'], category: 'Dark' },
    { id: 'ocean', name: 'Ocean', colors: ['#4da6ff', '#4dd9c9', '#66a6ff', '#152a45'], category: 'Cool' },
    { id: 'forest', name: 'Forest', colors: ['#4da66f', '#4dd98f', '#4d99d9', '#1a3020'], category: 'Natural' },
    { id: 'sunset', name: 'Sunset', colors: ['#ff7043', '#66d9a0', '#668fd9', '#301a18'], category: 'Warm' },
    { id: 'cherry-blossom', name: 'Cherry Blossom', colors: ['#ff99cc', '#99ddc0', '#99bbff', '#351830'], category: 'Soft' },
  ];

  const DEFAULT_THEME = 'cosmic-night';
  const DEFAULT_MODE = 'dark';
  const STORAGE_KEYS = {
    THEME: 'git-patch-viewer-theme',
    MODE: 'git-patch-viewer-mode',
  };

  let currentTheme = DEFAULT_THEME;
  let currentMode = DEFAULT_MODE;

  /**
   * Initialize theme manager
   */
  function init() {
    // Load saved preferences
    loadPreferences();
    
    // Apply theme and mode
    applyTheme();
    
    // Populate theme list
    populateThemeList();
    
    // Set up event listeners
    setupEventListeners();
    
    console.log('✨ ThemeManager initialized');
  }

  /**
   * Load theme and mode preferences from localStorage
   */
  function loadPreferences() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    const savedMode = localStorage.getItem(STORAGE_KEYS.MODE);
    
    if (savedTheme && THEMES.find(t => t.id === savedTheme)) {
      currentTheme = savedTheme;
    }
    
    if (savedMode && (savedMode === 'dark' || savedMode === 'light')) {
      currentMode = savedMode;
    }
  }

  /**
   * Save preferences to localStorage
   */
  function savePreferences() {
    localStorage.setItem(STORAGE_KEYS.THEME, currentTheme);
    localStorage.setItem(STORAGE_KEYS.MODE, currentMode);
  }

  /**
   * Apply current theme and mode to HTML element
   */
  function applyTheme() {
    const html = document.documentElement;
    
    // Remove all theme and mode classes
    html.className = '';
    
    // Add current theme and mode classes
    html.classList.add(`theme-${currentTheme}`);
    html.classList.add(currentMode);
    
    // Update UI
    updateThemeButton();
    updateModeButton();
  }

  /**
   * Update theme button display
   */
  function updateThemeButton() {
    const themeBtn = document.getElementById('theme-button');
    if (!themeBtn) return;
    
    const theme = THEMES.find(t => t.id === currentTheme) || THEMES[0];
    const preview = themeBtn.querySelector('.theme-preview');
    const name = themeBtn.querySelector('.theme-name');
    
    // Show single color for selected theme
    if (preview && theme.colors) {
      preview.style.background = theme.colors[0]; // Use primary color
    }
    if (name) name.textContent = theme.name;
  }

  /**
   * Update mode toggle button
   */
  function updateModeButton() {
    const modeToggle = document.getElementById('mode-toggle');
    const modeIcon = document.getElementById('mode-icon');
    if (!modeIcon) return;
    
    if (currentMode === 'dark') {
      // Show moon icon
      modeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
      modeToggle.title = 'Switch to light mode';
    } else {
      // Show sun icon
      modeIcon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
      modeToggle.title = 'Switch to dark mode';
    }
  }

  /**
   * Populate theme dropdown list
   */
  function populateThemeList() {
    const themeList = document.getElementById('theme-list');
    if (!themeList) return;
    
    // Group themes by category
    const categories = {};
    THEMES.forEach(theme => {
      if (!categories[theme.category]) {
        categories[theme.category] = [];
      }
      categories[theme.category].push(theme);
    });
    
    // Build HTML
    let html = '';
    for (const [category, themes] of Object.entries(categories)) {
      html += `<div class="theme-category" data-category="${category}">`;
      themes.forEach(theme => {
        const isActive = theme.id === currentTheme ? 'active' : '';
        const colorBoxes = theme.colors.map(color => 
          `<span class="theme-color-box" style="background-color: ${color}"></span>`
        ).join('');
        html += `
          <div class="theme-item ${isActive}" data-theme="${theme.id}">
            <div class="theme-item-colors">${colorBoxes}</div>
            <span class="theme-item-name">${theme.name}</span>
          </div>
        `;
      });
      html += `</div>`;
    }
    
    themeList.innerHTML = html;
    
    // Add click handlers
    themeList.querySelectorAll('.theme-item').forEach(item => {
      item.addEventListener('click', () => {
        const themeId = item.dataset.theme;
        setTheme(themeId);
        closeThemeDropdown();
      });
    });
  }

  /**
   * Set theme
   */
  function setTheme(themeId) {
    if (!THEMES.find(t => t.id === themeId)) return;
    
    currentTheme = themeId;
    savePreferences();
    applyTheme();
    
    // Update active state in dropdown
    document.querySelectorAll('.theme-item').forEach(item => {
      item.classList.toggle('active', item.dataset.theme === themeId);
    });
  }

  /**
   * Toggle dark/light mode
   */
  function toggleMode() {
    currentMode = currentMode === 'dark' ? 'light' : 'dark';
    savePreferences();
    applyTheme();
    
    // Re-render diff with new color scheme if patch is loaded
    if (typeof Viewer !== 'undefined' && Viewer.reRenderDiff) {
      Viewer.reRenderDiff();
    }
  }

  /**
   * Open theme dropdown
   */
  function openThemeDropdown() {
    const dropdown = document.getElementById('theme-dropdown');
    if (!dropdown) return;
    
    dropdown.classList.remove('hidden');
    document.getElementById('theme-search')?.focus();
  }

  /**
   * Close theme dropdown
   */
  function closeThemeDropdown() {
    const dropdown = document.getElementById('theme-dropdown');
    if (!dropdown) return;
    
    dropdown.classList.add('hidden');
    document.getElementById('theme-search').value = '';
    // Reset search filter
    document.querySelectorAll('.theme-item').forEach(item => {
      item.style.display = '';
    });
  }

  /**
   * Filter themes by search query
   */
  function filterThemes(query) {
    const lowerQuery = query.toLowerCase();
    const items = document.querySelectorAll('.theme-item');
    
    items.forEach(item => {
      const name = item.querySelector('.theme-item-name').textContent.toLowerCase();
      const matches = name.includes(lowerQuery);
      item.style.display = matches ? '' : 'none';
    });
  }

  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    // Theme button click
    const themeBtn = document.getElementById('theme-button');
    if (themeBtn) {
      themeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById('theme-dropdown');
        if (dropdown.classList.contains('hidden')) {
          openThemeDropdown();
        } else {
          closeThemeDropdown();
        }
      });
    }
    
    // Mode toggle click
    const modeToggle = document.getElementById('mode-toggle');
    if (modeToggle) {
      modeToggle.addEventListener('click', toggleMode);
    }
    
    // Theme search
    const themeSearch = document.getElementById('theme-search');
    if (themeSearch) {
      themeSearch.addEventListener('input', (e) => {
        filterThemes(e.target.value);
      });
      
      themeSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeThemeDropdown();
        }
      });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('theme-dropdown');
      const themeSelector = document.querySelector('.theme-selector');
      
      if (dropdown && !dropdown.classList.contains('hidden')) {
        if (!themeSelector?.contains(e.target)) {
          closeThemeDropdown();
        }
      }
    });
    
    // Keyboard shortcut: 't' to open theme selector
    document.addEventListener('keydown', (e) => {
      // Only if not in input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        openThemeDropdown();
      }
    });
  }

  /**
   * Get current theme ID
   */
  function getCurrentTheme() {
    return currentTheme;
  }

  /**
   * Get current mode
   */
  function getCurrentMode() {
    return currentMode;
  }

  /**
   * Get all available themes
   */
  function getThemes() {
    return THEMES;
  }

  /**
   * Set theme from URL parameter
   */
  function setThemeFromURL(themeId) {
    if (THEMES.find(t => t.id === themeId)) {
      setTheme(themeId);
    }
  }

  // Public API
  return {
    init,
    setTheme,
    toggleMode,
    getCurrentTheme,
    getCurrentMode,
    getThemes,
    setThemeFromURL,
  };
})();

