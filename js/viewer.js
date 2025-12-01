/**
 * Viewer
 * Main application logic for the Git Patch Viewer
 */

const Viewer = (() => {
  // State
  let currentPatch = null;
  let currentView = 'side-by-side'; // 'unified' or 'side-by-side'
  let currentSavedPatchId = null; // Track if current patch is saved

  /**
   * Initialize the viewer
   */
  function init() {
    console.log('🚀 Initializing Git Patch Viewer...');

    // Load saved view preference
    const savedView = localStorage.getItem('git-patch-viewer-view');
    if (savedView) {
      currentView = savedView;
    }

    // Set up event listeners
    setupInputListeners();
    setupViewerListeners();
    setupModalListeners();
    setupKeyboardShortcuts();

    // Handle URL parameters
    const urlStatus = URLHandler.handleURLOnLoad();
    
    // Check if we have a saved patch ID to load
    const savedPatchId = URLHandler.getSavedPatchIdFromURL();
    
    if (savedPatchId) {
      // Load from saved patches
      loadSavedPatchById(savedPatchId);
    } else if (urlStatus.hasPatch) {
      // Load patch from URL
      loadPatchFromURL();
    } else {
      // Show recent patches in input screen
      displayRecentPatches();
    }

    // Update saved patches count
    updateSavedPatchesCount();

    console.log('✅ Viewer initialized');
  }

  /**
   * Set up input section event listeners
   */
  function setupInputListeners() {
    // Drag and drop
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
      dropZone.addEventListener('dragover', handleDragOver);
      dropZone.addEventListener('dragleave', handleDragLeave);
      dropZone.addEventListener('drop', handleDrop);
    }

    // Browse button
    const browseBtn = document.getElementById('browse-btn');
    const fileInput = document.getElementById('file-input');
    if (browseBtn && fileInput) {
      browseBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', handleFileSelect);
    }

    // Parse button
    const parseBtn = document.getElementById('parse-btn');
    if (parseBtn) {
      parseBtn.addEventListener('click', handleParsePatch);
    }

    // Clear button
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        document.getElementById('patch-textarea').value = '';
      });
    }

    // New patch button
    const newPatchBtn = document.getElementById('new-patch-btn');
    if (newPatchBtn) {
      newPatchBtn.addEventListener('click', showInputSection);
    }
  }

  /**
   * Set up viewer section event listeners
   */
  function setupViewerListeners() {
    // View toggle buttons
    const unifiedBtn = document.getElementById('unified-btn');
    const sideBySideBtn = document.getElementById('sidebyside-btn');

    if (unifiedBtn) {
      unifiedBtn.addEventListener('click', () => setView('unified'));
    }
    if (sideBySideBtn) {
      sideBySideBtn.addEventListener('click', () => setView('side-by-side'));
    }

    // Expand/collapse all files
    document.getElementById('expand-all-files')?.addEventListener('click', () => {
      document.querySelectorAll('.d2h-file-wrapper').forEach(file => {
        file.classList.remove('d2h-file-collapsed');
      });
    });

    document.getElementById('collapse-all-files')?.addEventListener('click', () => {
      document.querySelectorAll('.d2h-file-wrapper').forEach(file => {
        file.classList.add('d2h-file-collapsed');
      });
    });

    // Copy all button
    document.getElementById('copy-all-btn')?.addEventListener('click', handleCopyAll);

    // Saved patches button
    document.getElementById('saved-btn')?.addEventListener('click', toggleSavedSidebar);
    document.getElementById('close-saved-btn')?.addEventListener('click', closeSavedSidebar);

    // Close saved sidebar when clicking outside
    document.addEventListener('click', handleClickOutsideSavedSidebar);

    // Save patch button
    document.getElementById('save-patch-btn')?.addEventListener('click', handleSavePatch);
    
    // Share button
    document.getElementById('share-btn')?.addEventListener('click', openShareModal);
  }

  /**
   * Set up modal event listeners
   */
  function setupModalListeners() {
    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) {
          modal.classList.add('hidden');
        }
      });
    });

    // Close modal on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) {
          modal.classList.add('hidden');
        }
      });
    });

    // Share modal - copy button
    document.getElementById('copy-share-url-btn')?.addEventListener('click', handleCopyShareURL);
    
    // Share modal - save button
    document.getElementById('save-share-patch-btn')?.addEventListener('click', handleSaveFromShareModal);

    // Help modal trigger
    document.addEventListener('keydown', (e) => {
      if (e.key === '?' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const helpModal = document.getElementById('help-modal');
        if (helpModal) {
          helpModal.classList.remove('hidden');
        }
      }
    });
  }

  /**
   * Set up keyboard shortcuts
   */
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Skip if in input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        // Allow Escape in inputs
        if (e.key === 'Escape') {
          e.target.blur();
          e.target.value = '';
        }
        return;
      }

      switch (e.key) {
        case '/':
          e.preventDefault();
          // Focus search (if visible)
          const search = document.querySelector('#saved-search, #theme-search');
          if (search) search.focus();
          break;
          
        case 'Escape':
          e.preventDefault();
          // Close modals
          document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
            modal.classList.add('hidden');
          });
          break;

        case 'j':
        case 'J':
          e.preventDefault();
          navigateToNextFile();
          break;

        case 'k':
        case 'K':
          e.preventDefault();
          navigateToPreviousFile();
          break;

        case 'u':
        case 'U':
          e.preventDefault();
          setView('unified');
          break;

        case 's':
        case 'S':
          e.preventDefault();
          setView('side-by-side');
          break;

        case 'c':
        case 'C':
          e.preventDefault();
          handleCopyAll();
          break;
      }
    });
  }

  // ============================================
  // Input Handling
  // ============================================

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('drag-over');
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      loadPatchFromFile(files[0]);
    }
  }

  function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
      loadPatchFromFile(files[0]);
    }
  }

  function handleParsePatch() {
    const textarea = document.getElementById('patch-textarea');
    const patchText = textarea.value.trim();

    if (!patchText) {
      showToast('Please enter patch content', 'error');
      return;
    }

    loadPatchFromText(patchText);
  }

  // ============================================
  // Patch Loading
  // ============================================

  function loadPatchFromFile(file) {
    showLoading();

    const reader = new FileReader();
    reader.onload = (e) => {
      const patchText = e.target.result;
      loadPatchFromText(patchText);
    };
    reader.onerror = () => {
      hideLoading();
      showToast('Failed to read file', 'error');
    };
    reader.readAsText(file);
  }

  function loadPatchFromText(patchText) {
    showLoading();

    try {
      // Validate patch
      if (!PatchParser.isValidPatch(patchText)) {
        throw new Error('Invalid patch format');
      }

      // Parse patch
      const parsedPatch = PatchParser.parse(patchText);
      currentPatch = parsedPatch;

      // Show viewer section
      showViewerSection();

      // Render everything
      renderMetadata(parsedPatch.metadata);
      renderStatistics(parsedPatch.stats);
      renderDiff(parsedPatch.raw);
      renderFileTree(parsedPatch.files);

      // Handle permalink if in URL
      const file = URLHandler.getFileFromURL();
      const line = URLHandler.getLineFromURL();
      if (file && line) {
        setTimeout(() => navigateToFileLine(file, line), 500);
      } else if (file) {
        setTimeout(() => navigateToFile(file), 500);
      }

      hideLoading();
      showToast('Patch loaded successfully', 'success');
      
      // Update save button state
      updateSaveButtonState();
      
      // Prompt to save if this is a new patch (not from saved patches)
      if (!currentSavedPatchId) {
        promptToSavePatch();
      }
    } catch (error) {
      hideLoading();
      console.error('Parse error:', error);
      showToast('Failed to parse patch: ' + error.message, 'error');
    }
  }

  function loadPatchFromURL() {
    showLoading();

    try {
      const patchText = URLHandler.getPatchFromURL();
      
      if (!patchText) {
        throw new Error('Failed to decode patch from URL');
      }

      loadPatchFromText(patchText);
    } catch (error) {
      hideLoading();
      console.error('URL load error:', error);
      showToast('Failed to load patch from URL: ' + error.message, 'error');
    }
  }

  function loadSavedPatch(patchId) {
    const patch = StorageManager.loadPatch(patchId);
    
    if (!patch) {
      showToast('Patch not found', 'error');
      return;
    }

    // Mark this as a saved patch
    currentSavedPatchId = patchId;
    
    // Update URL to include saved patch ID
    URLHandler.updateURL({ savedPatchId: patchId });
    
    loadPatchFromText(patch.data);
    closeSavedSidebar();
  }

  function loadSavedPatchById(patchId) {
    const patch = StorageManager.loadPatch(patchId);
    
    if (!patch) {
      showToast('Saved patch not found', 'error');
      showInputSection();
      return;
    }

    // Mark this as a saved patch
    currentSavedPatchId = patchId;
    loadPatchFromText(patch.data);
  }

  // ============================================
  // Rendering
  // ============================================

  function renderMetadata(metadata) {
    const metadataCard = document.getElementById('metadata-card');
    if (!metadataCard) return;

    if (!metadata.commitHash && !metadata.author && !metadata.message) {
      metadataCard.classList.add('hidden');
      return;
    }

    metadataCard.classList.remove('hidden');

    let html = '<div class="metadata-header">';
    html += '<svg class="metadata-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';
    html += '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>';
    html += '</svg>';
    html += '<div class="metadata-content">';

    if (metadata.commitHash) {
      const shortHash = metadata.commitHash.substring(0, 7);
      html += `<div class="commit-hash" title="${metadata.commitHash}">${shortHash}</div>`;
    }

    if (metadata.message) {
      html += `<div class="commit-message">${escapeHtml(metadata.message)}</div>`;
    }

    html += '<div class="commit-meta">';
    
    if (metadata.author) {
      html += '<div class="commit-author">';
      html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';
      html += '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>';
      html += '</svg>';
      html += escapeHtml(metadata.author);
      if (metadata.authorEmail) {
        html += ` &lt;${escapeHtml(metadata.authorEmail)}&gt;`;
      }
      html += '</div>';
    }

    if (metadata.date) {
      const relativeTime = PatchParser.formatRelativeTime(metadata.date);
      html += '<div class="commit-date" title="' + metadata.date + '">';
      html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';
      html += '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>';
      html += '</svg>';
      html += relativeTime;
      html += '</div>';
    }

    if (metadata.refs && metadata.refs.length > 0) {
      html += '<div class="commit-refs">';
      metadata.refs.forEach(ref => {
        html += `<span class="ref-badge">${escapeHtml(ref)}</span>`;
      });
      html += '</div>';
    }

    html += '</div></div></div>';

    metadataCard.innerHTML = html;
  }

  function renderStatistics(stats) {
    // Update header stats badges
    const headerStats = document.getElementById('header-stats');
    const filesValue = document.getElementById('stat-files-value');
    const additionsValue = document.getElementById('stat-additions-value');
    const deletionsValue = document.getElementById('stat-deletions-value');
    
    if (!headerStats || !filesValue || !additionsValue || !deletionsValue) return;

    // Show header stats
    headerStats.classList.remove('hidden');
    
    // Update values
    filesValue.textContent = stats.filesChanged;
    additionsValue.textContent = stats.additions;
    deletionsValue.textContent = stats.deletions;
  }

  function renderDiff(patchText) {
    const diffContainer = document.getElementById('diff-container');
    if (!diffContainer) return;

    try {
      // Get current mode from ThemeManager
      const currentMode = typeof ThemeManager !== 'undefined' 
        ? ThemeManager.getCurrentMode() 
        : 'dark';

      // Use diff2html to render
      const configuration = {
        drawFileList: false,
        matching: 'lines',
        outputFormat: currentView === 'unified' ? 'line-by-line' : 'side-by-side',
        highlight: true,
        colorScheme: currentMode, // 'dark' or 'light'
      };

      const diff2htmlUi = new Diff2HtmlUI(diffContainer, patchText, configuration);
      diff2htmlUi.draw();

      // Apply syntax highlighting with Prism
      setTimeout(() => {
        Prism.highlightAllUnder(diffContainer);
      }, 100);

    } catch (error) {
      console.error('Diff render error:', error);
      // Fallback to raw text
      diffContainer.innerHTML = `<pre style="padding: 1rem; overflow: auto;">${escapeHtml(patchText)}</pre>`;
    }
  }

  function renderFileTree(files) {
    const sidebar = document.querySelector('.sidebar-content');
    if (!sidebar) return;

    let html = '';

    files.forEach((file, index) => {
      const path = file.newPath !== '/dev/null' ? file.newPath : file.oldPath;
      const filename = path.split('/').pop();
      const fileId = `file-${index}`;

      let iconType = file.type;
      if (iconType === 'modified') iconType = 'modified';
      if (iconType === 'added') iconType = 'added';
      if (iconType === 'deleted') iconType = 'deleted';
      if (iconType === 'renamed') iconType = 'renamed';

      html += `
        <div class="file-tree-item" data-file="${escapeHtml(path)}" data-file-id="${fileId}">
          <svg class="file-icon ${iconType}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${getFileIcon(iconType)}
          </svg>
          <span class="file-name" title="${escapeHtml(path)}">${escapeHtml(filename)}</span>
          <span class="file-stats">
            ${file.additions > 0 ? `<span class="additions">+${file.additions}</span>` : ''}
            ${file.deletions > 0 ? `<span class="deletions">-${file.deletions}</span>` : ''}
          </span>
        </div>
      `;
    });

    sidebar.innerHTML = html;

    // Add click handlers
    sidebar.querySelectorAll('.file-tree-item').forEach(item => {
      item.addEventListener('click', () => {
        const filePath = item.dataset.file;
        navigateToFile(filePath);
      });
    });
  }

  function getFileIcon(type) {
    switch (type) {
      case 'added':
        return '<path d="M12 5v14M5 12h14"></path>';
      case 'deleted':
        return '<path d="M5 12h14"></path>';
      case 'renamed':
        return '<polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>';
      case 'modified':
      default:
        return '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>';
    }
  }

  // ============================================
  // Navigation
  // ============================================

  function navigateToFile(filePath) {
    const fileHeaders = document.querySelectorAll('.d2h-file-header');
    
    for (const header of fileHeaders) {
      const fileNameSpan = header.querySelector('.d2h-file-name');
      if (fileNameSpan && fileNameSpan.textContent.includes(filePath)) {
        header.scrollIntoView({ behavior: 'smooth', block: 'start' });
        header.classList.add('highlight');
        setTimeout(() => header.classList.remove('highlight'), 1000);
        break;
      }
    }
  }

  function navigateToFileLine(filePath, lineNumber) {
    navigateToFile(filePath);
    // Additional line navigation could be implemented here
  }

  function navigateToNextFile() {
    const items = Array.from(document.querySelectorAll('.file-tree-item'));
    const currentIndex = items.findIndex(item => item.classList.contains('active'));
    
    if (currentIndex < items.length - 1) {
      const nextItem = items[currentIndex + 1];
      nextItem.click();
    }
  }

  function navigateToPreviousFile() {
    const items = Array.from(document.querySelectorAll('.file-tree-item'));
    const currentIndex = items.findIndex(item => item.classList.contains('active'));
    
    if (currentIndex > 0) {
      const prevItem = items[currentIndex - 1];
      prevItem.click();
    }
  }

  // ============================================
  // UI Management
  // ============================================

  function showInputSection() {
    document.getElementById('input-section')?.classList.remove('hidden');
    document.getElementById('viewer-section')?.classList.add('hidden');
    document.getElementById('new-patch-btn')?.classList.add('hidden');
    document.getElementById('save-patch-btn')?.classList.add('hidden');
    document.getElementById('share-btn')?.classList.add('hidden');
    document.getElementById('header-stats')?.classList.add('hidden');
    URLHandler.clearURL();
    currentPatch = null;
    currentSavedPatchId = null;
  }

  function showViewerSection() {
    document.getElementById('input-section')?.classList.add('hidden');
    document.getElementById('viewer-section')?.classList.remove('hidden');
    document.getElementById('new-patch-btn')?.classList.remove('hidden');
    document.getElementById('save-patch-btn')?.classList.remove('hidden');
    document.getElementById('share-btn')?.classList.remove('hidden');
  }

  function setView(view) {
    currentView = view;
    localStorage.setItem('git-patch-viewer-view', view);

    // Update button states
    document.getElementById('unified-btn')?.classList.toggle('active', view === 'unified');
    document.getElementById('sidebyside-btn')?.classList.toggle('active', view === 'side-by-side');

    // Re-render diff if patch loaded
    if (currentPatch) {
      renderDiff(currentPatch.raw);
    }
  }

  function showLoading() {
    document.getElementById('loading')?.classList.remove('hidden');
  }

  function hideLoading() {
    document.getElementById('loading')?.classList.add('hidden');
  }

  // ============================================
  // Saved Patches
  // ============================================

  function displayRecentPatches() {
    const recentSection = document.getElementById('recent-patches');
    const recentList = document.getElementById('recent-list');
    
    if (!recentList) return;

    const recent = StorageManager.getRecentPatches(6);
    
    // Always show the recent patches section
    recentSection?.classList.remove('hidden');

    if (recent.length === 0) {
      recentList.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem; color: var(--text-tertiary);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 1rem; opacity: 0.5;">
            <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <p style="font-size: 0.875rem;">No saved patches yet</p>
          <p style="font-size: 0.8125rem; margin-top: 0.5rem;">Load and save a patch to see it here</p>
        </div>
      `;
      return;
    }

    let html = '';
    recent.forEach(patch => {
      html += `
        <div class="recent-item" data-patch-id="${patch.id}">
          <div class="recent-item-name">${escapeHtml(patch.name)}</div>
          <div class="recent-item-stats">
            ${StorageManager.formatPatchDate(patch.date)} • 
            ${patch.stats.filesChanged} files • 
            +${patch.stats.additions} -${patch.stats.deletions}
          </div>
        </div>
      `;
    });

    recentList.innerHTML = html;

    // Add click handlers
    recentList.querySelectorAll('.recent-item').forEach(item => {
      item.addEventListener('click', () => {
        loadSavedPatch(item.dataset.patchId);
      });
    });
  }

  function toggleSavedSidebar(e) {
    if (e) e.stopPropagation(); // Prevent event from bubbling to document
    const sidebar = document.getElementById('saved-sidebar');
    if (!sidebar) return;

    sidebar.classList.toggle('hidden');
    
    if (!sidebar.classList.contains('hidden')) {
      renderSavedPatches();
    }
  }

  function closeSavedSidebar() {
    document.getElementById('saved-sidebar')?.classList.add('hidden');
  }

  function handleClickOutsideSavedSidebar(e) {
    const sidebar = document.getElementById('saved-sidebar');
    const savedBtn = document.getElementById('saved-btn');
    
    // Check if sidebar is visible
    if (!sidebar || sidebar.classList.contains('hidden')) {
      return;
    }
    
    // Check if click is outside sidebar and not on the button that opens it
    if (!sidebar.contains(e.target) && !savedBtn?.contains(e.target)) {
      closeSavedSidebar();
    }
  }

  function renderSavedPatches() {
    const savedList = document.getElementById('saved-list');
    if (!savedList) return;

    const patches = StorageManager.getAllPatches();

    if (patches.length === 0) {
      savedList.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-tertiary);">No saved patches yet</div>';
      return;
    }

    let html = '';
    patches.forEach(patch => {
      html += `
        <div class="saved-patch-card" data-patch-id="${patch.id}">
          <div class="saved-patch-name">${escapeHtml(patch.name)}</div>
          <div class="saved-patch-meta">${StorageManager.formatPatchDate(patch.date)}</div>
          <div class="saved-patch-stats">
            ${patch.stats.filesChanged} files • +${patch.stats.additions} -${patch.stats.deletions}
          </div>
          <div class="saved-patch-actions">
            <button class="btn-ghost load-patch-btn">Load</button>
            <button class="btn-ghost delete-patch-btn">Delete</button>
          </div>
        </div>
      `;
    });

    savedList.innerHTML = html;

    // Add event listeners
    savedList.querySelectorAll('.load-patch-btn').forEach((btn, index) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.saved-patch-card');
        loadSavedPatch(card.dataset.patchId);
      });
    });

    savedList.querySelectorAll('.delete-patch-btn').forEach((btn, index) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.saved-patch-card');
        if (confirm('Delete this patch?')) {
          StorageManager.deletePatch(card.dataset.patchId);
          renderSavedPatches();
          updateSavedPatchesCount();
          showToast('Patch deleted', 'info');
        }
      });
    });
  }

  function updateSavedPatchesCount() {
    const count = StorageManager.getAllPatches().length;
    const badge = document.getElementById('saved-count');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  // ============================================
  // Save Patch Functions
  // ============================================

  function handleSavePatch() {
    if (!currentPatch) return;
    
    // If already saved, offer to save as new
    if (currentSavedPatchId) {
      const result = confirm('This patch is already saved. Save as a new copy?');
      if (!result) return;
      
      // Clear the ID to save as new
      currentSavedPatchId = null;
    }
    
    savePatchToStorage();
  }

  function savePatchToStorage() {
    if (!currentPatch) return;
    
    try {
      const saved = StorageManager.savePatch(currentPatch);
      if (saved) {
        currentSavedPatchId = saved.id;
        
        // Update URL with saved patch ID
        URLHandler.updateURL({ savedPatchId: saved.id });
        
        showToast('Patch saved successfully', 'success');
        updateSavedPatchesCount();
        updateSaveButtonState();
        displayRecentPatches();
      }
    } catch (error) {
      showToast('Failed to save patch: ' + error.message, 'error');
    }
  }

  function promptToSavePatch() {
    // Check if patch already exists in storage
    if (currentPatch) {
      const existingPatch = StorageManager.findPatchByContent(currentPatch.raw);
      if (existingPatch) {
        // Patch already saved, just set the ID
        currentSavedPatchId = existingPatch.id;
        updateSaveButtonState();
        return;
      }
    }
    
    // Show a toast with action button to save
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast info save-prompt';
    
    toast.innerHTML = `
      <svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
      </svg>
      <div class="toast-message">Would you like to save this patch?</div>
      <button class="toast-action-btn">Save</button>
      <button class="toast-close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    container.appendChild(toast);

    // Save button action
    toast.querySelector('.toast-action-btn').addEventListener('click', () => {
      savePatchToStorage();
      toast.remove();
    });

    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 10000);
  }

  function updateSaveButtonState() {
    const saveBtn = document.getElementById('save-patch-btn');
    if (!saveBtn) return;
    
    if (currentSavedPatchId) {
      // Patch is already saved
      saveBtn.title = 'Save as new copy';
      saveBtn.classList.add('saved');
    } else {
      // Patch is not saved
      saveBtn.title = 'Save this patch';
      saveBtn.classList.remove('saved');
    }
  }

  // ============================================
  // Share Modal
  // ============================================

  function openShareModal() {
    if (!currentPatch) return;

    const modal = document.getElementById('share-modal');
    if (!modal) return;

    try {
      const shareURL = URLHandler.generateShareURL(currentPatch.raw, { includeTheme: false });
      const urlInput = document.getElementById('share-url-input');
      const urlInfo = document.getElementById('url-length-info');

      if (urlInput) {
        urlInput.value = shareURL;
      }

      // Check URL safety
      const safety = URLHandler.checkURLSafety(shareURL);
      if (urlInfo) {
        urlInfo.textContent = safety.message;
        urlInfo.className = 'url-info';
        if (safety.isWarning) urlInfo.classList.add('warning');
        if (safety.isError) urlInfo.classList.add('error');
      }
      
      // Show/hide save button based on URL size
      const saveBtn = document.getElementById('save-share-patch-btn');
      if (saveBtn) {
        if (safety.isError || safety.isWarning) {
          saveBtn.classList.remove('hidden');
        } else {
          saveBtn.classList.add('hidden');
        }
      }

      modal.classList.remove('hidden');
    } catch (error) {
      showToast('Failed to generate share link: ' + error.message, 'error');
    }
  }

  async function handleCopyShareURL() {
    const urlInput = document.getElementById('share-url-input');
    if (!urlInput) return;

    const success = await URLHandler.copyToClipboard(urlInput.value);
    
    if (success) {
      showToast('Link copied to clipboard', 'success');
    } else {
      showToast('Failed to copy link', 'error');
    }
  }

  function handleSaveFromShareModal() {
    if (!currentPatch) return;
    
    try {
      const saved = StorageManager.savePatch(currentPatch);
      if (saved) {
        showToast('Patch saved to localStorage', 'success');
        updateSavedPatchesCount();
        
        // Close the share modal
        const modal = document.getElementById('share-modal');
        if (modal) {
          modal.classList.add('hidden');
        }
      }
    } catch (error) {
      showToast('Failed to save patch: ' + error.message, 'error');
    }
  }

  async function handleCopyAll() {
    if (!currentPatch) return;

    const success = await URLHandler.copyToClipboard(currentPatch.raw);
    
    if (success) {
      showToast('Patch copied to clipboard', 'success');
    } else {
      showToast('Failed to copy patch', 'error');
    }
  }

  // ============================================
  // Toast Notifications
  // ============================================

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = getToastIcon(type);
    
    toast.innerHTML = `
      <svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${icon}
      </svg>
      <div class="toast-message">${escapeHtml(message)}</div>
      <button class="toast-close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    container.appendChild(toast);

    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  function getToastIcon(type) {
    switch (type) {
      case 'success':
        return '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
      case 'error':
        return '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>';
      case 'warning':
        return '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>';
      case 'info':
      default:
        return '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>';
    }
  }

  // ============================================
  // Utilities
  // ============================================

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Re-render current diff (useful when mode changes)
   */
  function reRenderDiff() {
    if (currentPatch) {
      renderDiff(currentPatch.raw);
    }
  }

  // Public API
  return {
    init,
    reRenderDiff,
  };
})();

