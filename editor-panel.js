/**
 * Editor Panel — Ruarte Reports
 * Panel flotante de diseño reutilizable para todas las landings.
 * v2 — Agrega barra de formato por texto: color, negrita, mayúsculas.
 *
 * Uso:
 *   <script src="editor-panel.js"></script>
 *   <script>
 *     initEditorPanel({
 *       hero: { label: 'Hero', hasBg: true, hasPad: true,
 *         fields: [{ label: 'Título', sel: '#hero-line1' }] },
 *       footer: { label: 'Footer', hasBg: false, hasPad: false, fields: [] },
 *     }, { downloadName: 'ep-changes-NOMBRE.json' });
 *   </script>
 */

window.initEditorPanel = function(blockDefs, opts) {
  opts = opts || {};
  const downloadName = opts.downloadName || 'ep-changes.json';

  // ─── CSS ────────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
  #__ep-btn {
    position: fixed; bottom: 80px; right: 20px; z-index: 9999;
    width: 44px; height: 44px;
    background: #1E4A8A; border: 1px solid #3A7BD5; border-radius: 50%;
    color: white; font-size: 18px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 20px rgba(0,0,0,0.6); transition: transform 0.2s;
  }
  #__ep-btn:hover { transform: scale(1.1); }
  #__ep-panel {
    position: fixed; bottom: 136px; right: 20px; z-index: 9998;
    width: 270px; max-height: 72vh; overflow-y: auto;
    background: #111118; border: 1px solid #2A2A3A; border-radius: 16px;
    padding: 18px; font-family: 'Inter', sans-serif; font-size: 12px;
    color: #A0A0B0; box-shadow: 0 8px 40px rgba(0,0,0,0.8); display: none;
  }
  #__ep-panel.open { display: block; }
  .__ep-title {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.1em; color: #C9A96E;
    margin: 14px 0 8px; padding-bottom: 6px; border-bottom: 1px solid #2A2A3A;
  }
  .__ep-title:first-child { margin-top: 0; }
  .__ep-row {
    display: flex; align-items: center;
    justify-content: space-between; gap: 8px; margin-bottom: 7px; position: relative;
  }
  .__ep-lbl { flex: 1; color: #A0A0B0; font-size: 11px; line-height: 1.3; }
  .__ep-row input[type="number"] {
    width: 58px; background: #16161F; border: 1px solid #2A2A3A;
    border-radius: 6px; color: white; font-size: 11px;
    padding: 4px 6px; text-align: right; outline: none;
  }
  .__ep-row input[type="number"]:focus { border-color: #3A7BD5; }
  .__ep-unit { color: #6B6B7B; font-size: 10px; }
  .__ep-row input[type="color"] {
    width: 38px; height: 26px; background: none;
    border: 1px solid #2A2A3A; border-radius: 6px; cursor: pointer; padding: 2px;
  }
  #__ep-copy {
    width: 100%; margin-top: 14px; padding: 10px;
    background: linear-gradient(135deg, #2B5EA7, #3A7BD5);
    border: none; border-radius: 8px; color: white;
    font-size: 12px; font-weight: 700; cursor: pointer; transition: opacity 0.2s;
  }
  #__ep-copy:hover { opacity: 0.85; }
  #__ep-reset {
    width: 100%; margin-top: 6px; padding: 8px;
    background: transparent; border: 1px solid #2A2A3A;
    border-radius: 8px; color: #6B6B7B; font-size: 11px; cursor: pointer;
  }
  #__ep-reset:hover { border-color: #6B6B7B; color: #A0A0B0; }
  #__ep-tabs {
    display: flex; gap: 3px; margin-bottom: 14px;
    background: #0A0A0F; border-radius: 10px; padding: 3px;
  }
  .__ep-tab {
    flex: 1; padding: 7px 4px; background: transparent;
    border: none; border-radius: 8px; color: #6B6B7B;
    font-size: 11px; font-weight: 600; cursor: pointer;
    font-family: 'Inter', sans-serif; transition: all 0.2s;
  }
  .__ep-tab.active { background: #16161F; color: #C9A96E; }
  .__ep-block-item {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 10px; margin-bottom: 4px;
    background: #16161F; border: 1px solid #2A2A3A;
    border-radius: 8px; cursor: pointer; font-size: 11px; color: #A0A0B0;
    transition: all 0.15s; width: 100%; text-align: left;
    font-family: 'Inter', sans-serif;
  }
  .__ep-block-item:hover { border-color: #3A7BD5; color: white; }
  .__ep-block-item.active { border-color: #3A7BD5; color: white; background: rgba(58,123,213,0.12); }
  .__ep-block-dot { width: 6px; height: 6px; border-radius: 50%; background: #2A2A3A; flex-shrink: 0; transition: background 0.15s; }
  .__ep-block-item.active .__ep-block-dot,
  .__ep-block-item:hover .__ep-block-dot { background: #3A7BD5; }
  #__ep-block-editor { display: none; margin-top: 12px; }
  #__ep-block-editor.open { display: block; }
  .__ep-bed-title {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.1em; color: #C9A96E;
    margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #2A2A3A;
  }
  .__ep-fgroup { margin-bottom: 10px; }
  .__ep-ftextarea {
    width: 100%; padding: 7px 8px;
    background: #0A0A0F; border: 1px solid #2A2A3A;
    border-radius: 6px; color: white; font-size: 11px;
    font-family: 'Inter', sans-serif; line-height: 1.5;
    min-height: 36px; outline: none; box-sizing: border-box;
  }
  .__ep-ftextarea:focus, .__ep-ceditable:focus { border-color: #3A7BD5; }
  .__ep-ceditable {
    cursor: text; white-space: pre-wrap; word-break: break-word;
  }
  .__ep-ceditable:empty:before {
    content: 'Escribí aquí...'; color: #3A3A4A; font-style: italic;
  }
  /* ── Barra de formato ── */
  .__ep-fmt-bar {
    display: flex; align-items: center; gap: 4px;
    margin-bottom: 4px;
  }
  .__ep-fmt-color {
    width: 24px; height: 22px; padding: 1px 2px;
    background: none; border: 1px solid #2A2A3A; border-radius: 4px;
    cursor: pointer; flex-shrink: 0;
  }
  .__ep-fmt-color:hover { border-color: #6B6B7B; }
  .__ep-fmt-btn {
    padding: 3px 7px; background: #16161F;
    border: 1px solid #2A2A3A; border-radius: 4px;
    color: #A0A0B0; font-size: 10px; font-weight: 700;
    cursor: pointer; font-family: 'Inter', sans-serif;
    transition: all 0.15s; flex-shrink: 0; line-height: 1.4;
    user-select: none;
  }
  .__ep-fmt-btn:hover { border-color: #3A7BD5; color: white; }
  .__ep-fmt-btn.on { background: rgba(201,169,110,0.15); border-color: #C9A96E; color: #C9A96E; }
  .__ep-fmt-sep { flex: 1; }
  .__ep-fmt-reset {
    padding: 2px 5px; background: transparent;
    border: 1px solid #2A2A3A; border-radius: 4px;
    color: #6B6B7B; font-size: 9px; cursor: pointer;
    font-family: 'Inter', sans-serif; transition: all 0.15s;
  }
  .__ep-fmt-reset:hover { border-color: #6B6B7B; color: #A0A0B0; }
  #__ep-block-back {
    display: flex; align-items: center; gap: 6px;
    background: transparent; border: none; color: #6B6B7B;
    font-size: 11px; cursor: pointer; padding: 0 0 10px;
    font-family: 'Inter', sans-serif;
  }
  #__ep-block-back:hover { color: #A0A0B0; }
  body.ep-select [data-block] { cursor: pointer; }
  body.ep-select [data-block]:hover { outline: 1px dashed rgba(58,123,213,0.5) !important; outline-offset: 2px; }
  [data-block].ep-active-block { outline: 2px solid #3A7BD5 !important; outline-offset: 2px; }
  .__ep-undo {
    display: inline-flex; align-items: center; gap: 4px;
    background: transparent; border: none; color: #6B6B7B;
    font-size: 10px; cursor: pointer; padding: 2px 4px; border-radius: 4px;
    transition: color 0.2s; flex-shrink: 0;
  }
  .__ep-undo:hover { color: #C9A96E; }
  .__ep-undo:disabled { opacity: 0.2; cursor: default; }
  #__ep-save {
    position: fixed; bottom: 20px; right: 20px; z-index: 10000;
    padding: 12px 22px;
    background: linear-gradient(135deg, #C9A96E, #D4BC8A);
    border: none; border-radius: 10px; color: #0A0A0F;
    font-size: 13px; font-weight: 800; cursor: pointer;
    font-family: 'Inter', sans-serif;
    box-shadow: 0 4px 24px rgba(201,169,110,0.45);
    transition: all 0.2s; display: none;
  }
  #__ep-save.has-changes { display: block; }
  #__ep-save:hover { transform: translateY(-2px); box-shadow: 0 6px 28px rgba(201,169,110,0.65); }
  #__ep-save.saved { background: linear-gradient(135deg, #2B5EA7, #3A7BD5); color: white; }
  `;
  document.head.appendChild(style);

  // ─── HTML ───────────────────────────────────────────────────────────────────
  const epBtn = document.createElement('button');
  epBtn.id = '__ep-btn';
  epBtn.title = 'Editor de diseño';
  epBtn.textContent = '⚙';
  document.body.appendChild(epBtn);

  const panel = document.createElement('div');
  panel.id = '__ep-panel';
  panel.innerHTML = `
    <div id="__ep-tabs">
      <button class="__ep-tab active" data-tab="vars">⚙ Variables</button>
      <button class="__ep-tab" data-tab="blocks">◻ Bloques</button>
    </div>

    <!-- TAB VARIABLES -->
    <div id="__ep-vars">
      <div class="__ep-title">Colores</div>
      <div class="__ep-row"><span class="__ep-lbl">Azul principal</span>   <input type="color" data-var="--blue"       value="#2B5EA7"><button class="__ep-undo" data-undo="--blue"       disabled>↩</button></div>
      <div class="__ep-row"><span class="__ep-lbl">Azul claro</span>       <input type="color" data-var="--blue-light" value="#3A7BD5"><button class="__ep-undo" data-undo="--blue-light" disabled>↩</button></div>
      <div class="__ep-row"><span class="__ep-lbl">Azul oscuro</span>      <input type="color" data-var="--blue-dark"  value="#1E4A8A"><button class="__ep-undo" data-undo="--blue-dark"  disabled>↩</button></div>
      <div class="__ep-row"><span class="__ep-lbl">Dorado</span>           <input type="color" data-var="--gold"       value="#C9A96E"><button class="__ep-undo" data-undo="--gold"       disabled>↩</button></div>
      <div class="__ep-row"><span class="__ep-lbl">Dorado claro</span>     <input type="color" data-var="--gold-light" value="#D4BC8A"><button class="__ep-undo" data-undo="--gold-light" disabled>↩</button></div>
      <div class="__ep-title">Fondo</div>
      <div class="__ep-row"><span class="__ep-lbl">Fondo principal</span>  <input type="color" data-var="--bg"         value="#0A0A0F"><button class="__ep-undo" data-undo="--bg"         disabled>↩</button></div>
      <div class="__ep-row"><span class="__ep-lbl">Fondo secciones</span>  <input type="color" data-var="--bg2"        value="#111118"><button class="__ep-undo" data-undo="--bg2"        disabled>↩</button></div>
      <div class="__ep-row"><span class="__ep-lbl">Fondo cards</span>      <input type="color" data-var="--bg-card"    value="#16161F"><button class="__ep-undo" data-undo="--bg-card"    disabled>↩</button></div>
      <div class="__ep-row"><span class="__ep-lbl">Texto secundario</span> <input type="color" data-var="--text2"      value="#A0A0B0"><button class="__ep-undo" data-undo="--text2"      disabled>↩</button></div>
      <div class="__ep-row"><span class="__ep-lbl">Bordes</span>           <input type="color" data-var="--border"     value="#2A2A3A"><button class="__ep-undo" data-undo="--border"     disabled>↩</button></div>

      <div class="__ep-title">Tipografía</div>
      <div class="__ep-row"><span class="__ep-lbl">Títulos</span>          <input type="number" data-var="--title-size" data-unit="px" value="25"><span class="__ep-unit">px</span><button class="__ep-undo" data-undo="--title-size" disabled>↩</button></div>
      <div class="__ep-row"><span class="__ep-lbl">Cuerpo</span>           <input type="number" data-var="--body-size"  data-unit="px" value="16"><span class="__ep-unit">px</span><button class="__ep-undo" data-undo="--body-size"  disabled>↩</button></div>
      <div class="__ep-row"><span class="__ep-lbl">Pequeño</span>          <input type="number" data-var="--small-size" data-unit="px" value="13"><span class="__ep-unit">px</span><button class="__ep-undo" data-undo="--small-size" disabled>↩</button></div>

      <div class="__ep-title">Espaciado</div>
      <div class="__ep-row"><span class="__ep-lbl">Entre secciones</span>  <input type="number" data-var="--section-pad"   data-unit="px" value="80"><span class="__ep-unit">px</span><button class="__ep-undo" data-undo="--section-pad"   disabled>↩</button></div>
      <div class="__ep-row"><span class="__ep-lbl">Ancho máximo</span>     <input type="number" data-var="--max"           data-unit="px" value="1000"><span class="__ep-unit">px</span><button class="__ep-undo" data-undo="--max"           disabled>↩</button></div>
      <div class="__ep-row"><span class="__ep-lbl">Margen lateral</span>   <input type="number" data-var="--container-pad" data-unit="px" value="48"><span class="__ep-unit">px</span><button class="__ep-undo" data-undo="--container-pad" disabled>↩</button></div>

      <div class="__ep-title">Bordes</div>
      <div class="__ep-row"><span class="__ep-lbl">Radio normal</span>     <input type="number" data-var="--r"    data-unit="px" value="16"><span class="__ep-unit">px</span><button class="__ep-undo" data-undo="--r"    disabled>↩</button></div>
      <div class="__ep-row"><span class="__ep-lbl">Radio grande</span>     <input type="number" data-var="--r-lg" data-unit="px" value="24"><span class="__ep-unit">px</span><button class="__ep-undo" data-undo="--r-lg" disabled>↩</button></div>

      <div class="__ep-title">Componentes</div>
      <div class="__ep-row"><span class="__ep-lbl">Ancho formulario</span> <input type="number" data-var="--form-w"       data-unit="px" value="460"><span class="__ep-unit">px</span><button class="__ep-undo" data-undo="--form-w"       disabled>↩</button></div>
      <div class="__ep-row"><span class="__ep-lbl">Ancho tarjetas</span>   <input type="number" data-var="--track-card-w" data-unit="px" value="300"><span class="__ep-unit">px</span><button class="__ep-undo" data-undo="--track-card-w" disabled>↩</button></div>
      <div class="__ep-row"><span class="__ep-lbl">Ancho foto</span>       <input type="number" data-var="--photo-w"      data-unit="px" value="220"><span class="__ep-unit">px</span><button class="__ep-undo" data-undo="--photo-w"      disabled>↩</button></div>
      <div class="__ep-row"><span class="__ep-lbl">Alto foto</span>        <input type="number" data-var="--photo-h"      data-unit="px" value="280"><span class="__ep-unit">px</span><button class="__ep-undo" data-undo="--photo-h"      disabled>↩</button></div>

      <button id="__ep-copy">Copiar cambios</button>
      <button id="__ep-reset">Resetear todo</button>
    </div>

    <!-- TAB BLOQUES -->
    <div id="__ep-blocks" style="display:none">
      <div id="__ep-block-list"></div>
      <div id="__ep-block-editor">
        <button id="__ep-block-back">← Volver</button>
        <div class="__ep-bed-title" id="__ep-bed-title"></div>
        <div id="__ep-bed-fields"></div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // Generar botones de bloques desde blockDefs
  const blockList = panel.querySelector('#__ep-block-list');
  Object.keys(blockDefs).forEach(id => {
    const b = document.createElement('button');
    b.className = '__ep-block-item';
    b.dataset.blockBtn = id;
    const dot = document.createElement('span');
    dot.className = '__ep-block-dot';
    b.appendChild(dot);
    b.appendChild(document.createTextNode(blockDefs[id].label));
    blockList.appendChild(b);
  });

  // ─── TRACKING ───────────────────────────────────────────────────────────────
  window.__epChanges  = {};
  window.__epSaveData = null;

  const saveBtn = document.createElement('button');
  saveBtn.id = '__ep-save';
  saveBtn.textContent = '💾 Guardar al HTML';
  document.body.appendChild(saveBtn);

  function markChange(key, obj) {
    window.__epChanges[key] = obj;
    saveBtn.classList.add('has-changes');
  }

  saveBtn.addEventListener('click', () => {
    const json = JSON.stringify(window.__epChanges, null, 2);
    window.__epSaveData = json;
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(a.href);
    saveBtn.textContent = '✓ Descargado — avisale a Claude';
    saveBtn.classList.add('saved');
    setTimeout(() => {
      saveBtn.textContent = '💾 Guardar al HTML';
      saveBtn.classList.remove('saved');
    }, 4000);
  });

  // ─── VARIABLES CSS ──────────────────────────────────────────────────────────
  epBtn.addEventListener('click', () => panel.classList.toggle('open'));

  const defaults = {};
  const history  = {};

  panel.querySelectorAll('[data-var]').forEach(input => {
    defaults[input.dataset.var] = input.value;
    history[input.dataset.var]  = [];
  });

  function getUndoBtn(varName) {
    return panel.querySelector(`.__ep-undo[data-undo="${varName}"]`);
  }

  function applyVar(input) {
    document.documentElement.style.setProperty(input.dataset.var, input.value + (input.dataset.unit || ''));
  }

  panel.querySelectorAll('[data-var]').forEach(input => {
    let prevVal = input.value;
    input.addEventListener('mousedown', () => { prevVal = input.value; });
    input.addEventListener('focus',     () => { prevVal = input.value; });
    input.addEventListener('input',  () => applyVar(input));
    input.addEventListener('change', () => {
      if (input.value === prevVal) return;
      history[input.dataset.var].push(prevVal);
      prevVal = input.value;
      applyVar(input);
      const unit = input.dataset.unit || '';
      markChange('var:' + input.dataset.var, { sub: 'cssvar', var: input.dataset.var, value: input.value + unit });
      const undoBtn = getUndoBtn(input.dataset.var);
      if (undoBtn) undoBtn.disabled = false;
    });
  });

  panel.querySelectorAll('.__ep-undo[data-undo]').forEach(undoBtn => {
    undoBtn.addEventListener('click', () => {
      const varName = undoBtn.dataset.undo;
      const hist = history[varName];
      if (!hist || !hist.length) return;
      const prev  = hist.pop();
      const input = panel.querySelector(`[data-var="${varName}"]`);
      input.value = prev;
      applyVar(input);
      undoBtn.disabled = hist.length === 0;
    });
  });

  panel.querySelector('#__ep-copy').addEventListener('click', function() {
    const lines = [];
    panel.querySelectorAll('[data-var]').forEach(input => {
      if (input.value !== defaults[input.dataset.var]) {
        lines.push(input.dataset.var + ' = ' + input.value + (input.dataset.unit || ''));
      }
    });
    if (!lines.length) {
      this.textContent = 'Sin cambios aún';
      setTimeout(() => { this.textContent = 'Copiar cambios'; }, 2000);
      return;
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      this.textContent = '✓ Copiado!';
      setTimeout(() => { this.textContent = 'Copiar cambios'; }, 2500);
    });
  });

  panel.querySelector('#__ep-reset').addEventListener('click', () => {
    panel.querySelectorAll('[data-var]').forEach(input => {
      input.value = defaults[input.dataset.var];
      applyVar(input);
    });
  });

  // ─── BLOQUES ────────────────────────────────────────────────────────────────
  const varsDiv   = panel.querySelector('#__ep-vars');
  const blocksDiv = panel.querySelector('#__ep-blocks');

  panel.querySelectorAll('.__ep-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      panel.querySelectorAll('.__ep-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isBlocks = tab.dataset.tab === 'blocks';
      varsDiv.style.display   = isBlocks ? 'none' : 'block';
      blocksDiv.style.display = isBlocks ? 'block' : 'none';
      document.body.classList.toggle('ep-select', isBlocks);
      if (!isBlocks) clearActiveBlock();
    });
  });

  let activeBlockId = null;

  function rgbToHex(rgb) {
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return '#000000';
    return '#' + [m[1],m[2],m[3]].map(n => parseInt(n).toString(16).padStart(2,'0')).join('');
  }

  function clearActiveBlock() {
    if (activeBlockId) {
      const el = document.querySelector(`[data-block="${activeBlockId}"]`);
      if (el) el.classList.remove('ep-active-block');
    }
    panel.querySelectorAll('.__ep-block-item').forEach(b => b.classList.remove('active'));
    panel.querySelector('#__ep-block-list').style.display  = 'block';
    panel.querySelector('#__ep-block-editor').classList.remove('open');
    activeBlockId = null;
  }

  // ─── FORMATO DE TEXTO ───────────────────────────────────────────────────────

  // Guarda y restaura la selección (para cuando el color picker toma el foco)
  let savedRange = null;

  function saveRange() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRange = sel.getRangeAt(0).cloneRange();
  }

  function restoreRange() {
    if (!savedRange) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }

  function hasSelectionIn(ce) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
    return ce.contains(sel.anchorNode);
  }

  // Detectar si el nodo ancla ya está dentro de un wrapper con la propiedad dada
  // Si val es '' (vacío), matchea cualquier valor no vacío
  function getAncestorWithStyle(node, prop, val, root) {
    while (node && node !== root) {
      if (node.nodeType === 1 && node.style) {
        const v = node.style[prop];
        if (val === '' ? !!v : v === val) return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  function toggleUppercase(ce) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    // Si el ancla está dentro de un span uppercase → deshacer
    const existing = getAncestorWithStyle(sel.anchorNode, 'textTransform', 'uppercase', ce);
    if (existing) {
      // Desenvolver: mover los hijos fuera del span
      const parent = existing.parentNode;
      while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
      parent.removeChild(existing);
      ce.normalize();
      return;
    }

    // Envolver selección en span uppercase
    if (range.collapsed) return;
    const span = document.createElement('span');
    span.style.textTransform = 'uppercase';
    try {
      range.surroundContents(span);
    } catch (e) {
      span.appendChild(range.extractContents());
      range.insertNode(span);
    }
    // Reseleccionar el span
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }

  function toggleBold(ce) {
    if (!hasSelectionIn(ce) && !savedRange) return;
    document.execCommand('bold');
  }

  function applyColor(ce, color) {
    if (!savedRange) return;
    restoreRange();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);

    // Buscar si ya existe un span de color en el ancla → actualizarlo
    const existing = getAncestorWithStyle(sel.anchorNode, 'color', '', ce);
    if (existing && existing.style.color) {
      existing.style.color = color;
      return;
    }

    // Envolver selección en un span con el color elegido
    const span = document.createElement('span');
    span.style.color = color;
    try {
      range.surroundContents(span);
    } catch (e) {
      span.appendChild(range.extractContents());
      range.insertNode(span);
    }

    // Mantener la selección sobre el nuevo span
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(newRange);
    savedRange = newRange.cloneRange();
  }

  function removeFormatting(ce) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      // Si no hay selección, limpiar todo
      ce.querySelectorAll('strong, b, span[style]').forEach(el => {
        const parent = el.parentNode;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      });
      ce.normalize();
    } else {
      document.execCommand('removeFormat');
    }
  }

  // ─── ABRIR BLOQUE ───────────────────────────────────────────────────────────
  function openBlock(id) {
    clearActiveBlock();
    activeBlockId = id;
    const def = blockDefs[id];
    if (!def) return;
    const el = document.querySelector(`[data-block="${id}"]`);
    if (!el) return;

    el.classList.add('ep-active-block');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const blockBtn = panel.querySelector(`[data-block-btn="${id}"]`);
    if (blockBtn) blockBtn.classList.add('active');

    panel.querySelector('#__ep-block-list').style.display = 'none';
    const editor = panel.querySelector('#__ep-block-editor');
    editor.classList.add('open');
    panel.querySelector('#__ep-bed-title').textContent = def.label;

    const fieldsDiv = panel.querySelector('#__ep-bed-fields');
    fieldsDiv.innerHTML = '';

    // Helper: fila con label + input numérico + undo
    function makeRow(labelTxt, inputEl, undoProp) {
      const row = document.createElement('div');
      row.className = '__ep-fgroup __ep-row';
      const lbl = document.createElement('span');
      lbl.className = '__ep-lbl'; lbl.textContent = labelTxt;
      row.appendChild(lbl);
      row.appendChild(inputEl);
      if (inputEl.type === 'number') {
        const unit = document.createElement('span');
        unit.className = '__ep-unit'; unit.textContent = 'px';
        row.appendChild(unit);
      }
      const undo = document.createElement('button');
      undo.className = '__ep-undo'; undo.textContent = '↩';
      undo.dataset.blockUndo = undoProp; undo.disabled = true;
      row.appendChild(undo);
      return row;
    }

    // Fondo
    if (def.hasBg) {
      const computed = getComputedStyle(el).backgroundColor;
      const hex = (computed === 'rgba(0, 0, 0, 0)' || computed === 'transparent') ? '#0a0a0f' : rgbToHex(computed);
      const inp = document.createElement('input');
      inp.type = 'color'; inp.value = hex; inp.dataset.blockProp = 'bg';
      fieldsDiv.appendChild(makeRow('Color de fondo', inp, 'bg'));
    }

    // Padding
    if (def.hasPad) {
      const pt = parseInt(getComputedStyle(el).paddingTop)    || 80;
      const pb = parseInt(getComputedStyle(el).paddingBottom) || 80;
      const inPt = document.createElement('input');
      inPt.type = 'number'; inPt.value = pt; inPt.dataset.blockProp = 'pt';
      fieldsDiv.appendChild(makeRow('Padding arriba', inPt, 'pt'));
      const inPb = document.createElement('input');
      inPb.type = 'number'; inPb.value = pb; inPb.dataset.blockProp = 'pb';
      fieldsDiv.appendChild(makeRow('Padding abajo', inPb, 'pb'));
    }

    // ── Campos de texto con barra de formato ──
    def.fields.forEach((f, i) => {
      const textEl = document.querySelector(f.sel);
      if (!textEl) return;

      // Separador / label
      const sep = document.createElement('div');
      sep.className = '__ep-bed-title'; sep.style.marginTop = '10px';
      sep.textContent = f.label;
      fieldsDiv.appendChild(sep);

      // ── Tipo: altura de imagen ──
      if (f.type === 'img-h') {
        const h = parseInt(textEl.style.height) || parseInt(getComputedStyle(textEl).height) || 32;
        const inp = document.createElement('input');
        inp.type = 'number'; inp.value = h;
        inp.dataset.blockProp = 'imgh' + i;
        inp.dataset.fieldIdx  = i;
        fieldsDiv.appendChild(makeRow('Altura imagen', inp, 'imgh' + i));
        return;
      }

      // ── Tipo: margen superior ──
      if (f.type === 'margin-t') {
        const m = parseInt(textEl.style.marginTop) || parseInt(getComputedStyle(textEl).marginTop) || 0;
        const inp = document.createElement('input');
        inp.type = 'number'; inp.value = m;
        inp.dataset.blockProp = 'mgt' + i;
        inp.dataset.fieldIdx  = i;
        fieldsDiv.appendChild(makeRow('Separación arriba', inp, 'mgt' + i));
        return;
      }

      // ── Tipo: margen inferior ──
      if (f.type === 'margin-b') {
        const m = parseInt(textEl.style.marginBottom) || parseInt(getComputedStyle(textEl).marginBottom) || 0;
        const inp = document.createElement('input');
        inp.type = 'number'; inp.value = m;
        inp.dataset.blockProp = 'mgb' + i;
        inp.dataset.fieldIdx  = i;
        fieldsDiv.appendChild(makeRow('Separación abajo', inp, 'mgb' + i));
        return;
      }

      // Barra de formato
      const fmtBar = document.createElement('div');
      fmtBar.className = '__ep-fmt-bar';

      const colorPick = document.createElement('input');
      colorPick.type = 'color'; colorPick.className = '__ep-fmt-color';
      colorPick.value = '#ffffff'; colorPick.title = 'Color de texto';

      const boldBtn = document.createElement('button');
      boldBtn.className = '__ep-fmt-btn'; boldBtn.textContent = 'B';
      boldBtn.title = 'Negrita'; boldBtn.style.fontWeight = '900';

      const upperBtn = document.createElement('button');
      upperBtn.className = '__ep-fmt-btn'; upperBtn.textContent = 'AA';
      upperBtn.title = 'Mayúsculas';

      const sep2 = document.createElement('span');
      sep2.className = '__ep-fmt-sep';

      const resetBtn = document.createElement('button');
      resetBtn.className = '__ep-fmt-reset'; resetBtn.textContent = 'limpiar';
      resetBtn.title = 'Quitar formato de la selección';

      fmtBar.appendChild(colorPick);
      fmtBar.appendChild(boldBtn);
      fmtBar.appendChild(upperBtn);
      fmtBar.appendChild(sep2);
      fmtBar.appendChild(resetBtn);

      // Contenteditable
      const ce = document.createElement('div');
      ce.contentEditable = 'true';
      ce.className = '__ep-ftextarea __ep-ceditable';
      ce.dataset.blockProp = 'text' + i;
      ce.dataset.fieldIdx  = i;
      ce.innerHTML = textEl.innerHTML || textEl.textContent;

      const wrap = document.createElement('div');
      wrap.className = '__ep-fgroup';
      wrap.appendChild(fmtBar);
      wrap.appendChild(ce);
      fieldsDiv.appendChild(wrap);

      // Tamaño de fuente (sigue siendo número)
      const fs = parseInt(getComputedStyle(textEl).fontSize) || 14;
      const inFs = document.createElement('input');
      inFs.type = 'number'; inFs.value = fs;
      inFs.dataset.blockProp = 'fs' + i;
      inFs.dataset.fieldIdx  = i;
      fieldsDiv.appendChild(makeRow('Tamaño texto', inFs, 'fs' + i));

      // ── Eventos de formato ──

      // Guardar selección al hacer mouseup/keyup dentro del ce
      ce.addEventListener('mouseup', saveRange);
      ce.addEventListener('keyup',   saveRange);

      // Color: guardar range ANTES de que el picker tome foco
      colorPick.addEventListener('mousedown', saveRange);
      colorPick.addEventListener('input', () => {
        applyColor(ce, colorPick.value);
        // Sincronizar live
        const target = document.querySelector(f.sel);
        if (target) target.innerHTML = ce.innerHTML;
        markChange('block:' + activeBlockId + ':text' + i, buildTextChange(f, i, ce));
      });

      // Bold: mousedown + preventDefault para no perder foco del ce
      boldBtn.addEventListener('mousedown', e => {
        e.preventDefault();
        toggleBold(ce);
        boldBtn.classList.toggle('on', document.queryCommandState('bold'));
        syncText(ce, f, i);
      });

      // Uppercase
      upperBtn.addEventListener('mousedown', e => {
        e.preventDefault();
        toggleUppercase(ce);
        syncText(ce, f, i);
      });

      // Limpiar formato
      resetBtn.addEventListener('mousedown', e => {
        e.preventDefault();
        removeFormatting(ce);
        syncText(ce, f, i);
      });

      // Actualizar estado del botón B al cambiar selección
      ce.addEventListener('keyup',   updateBoldState);
      ce.addEventListener('mouseup', updateBoldState);
      function updateBoldState() {
        boldBtn.classList.toggle('on', document.queryCommandState('bold'));
      }

      // Sync live al escribir
      ce.addEventListener('input', () => syncText(ce, f, i));
    });

    // ── Eventos de padding / bg ──
    const blockHistories = {};
    fieldsDiv.querySelectorAll('[data-block-prop]').forEach(input => {
      if (input.contentEditable === 'true') return; // los ce se manejan arriba
      const prop = input.dataset.blockProp;
      blockHistories[prop] = [];
      let prevVal = input.value;

      input.addEventListener('mousedown', () => { prevVal = input.value; });
      input.addEventListener('focus',     () => { prevVal = input.value; });

      const applyBlockField = () => {
        if (prop === 'bg') { el.style.background   = input.value; return; }
        if (prop === 'pt') { el.style.paddingTop    = input.value + 'px'; return; }
        if (prop === 'pb') { el.style.paddingBottom = input.value + 'px'; return; }
        const idx = parseInt(input.dataset.fieldIdx);
        const fieldDef = blockDefs[activeBlockId] && blockDefs[activeBlockId].fields[idx];
        if (!fieldDef) return;
        const target = document.querySelector(fieldDef.sel);
        if (!target) return;
        if (prop.startsWith('fs'))   { target.style.fontSize   = input.value + 'px'; }
        if (prop.startsWith('imgh')) { target.style.height     = input.value + 'px'; target.style.width = 'auto'; }
        if (prop.startsWith('mgt')) { target.style.marginTop    = input.value + 'px'; }
        if (prop.startsWith('mgb')) { target.style.marginBottom = input.value + 'px'; }
      };

      input.addEventListener('input',  applyBlockField);
      input.addEventListener('change', () => {
        if (input.value === prevVal) return;
        blockHistories[prop].push(prevVal);
        prevVal = input.value;
        applyBlockField();
        let changeObj = null;
        if (prop === 'bg') {
          changeObj = { sub: 'bg', blockId: activeBlockId, value: input.value };
        } else if (prop === 'pt') {
          changeObj = { sub: 'pt', blockId: activeBlockId, value: input.value + 'px' };
        } else if (prop === 'pb') {
          changeObj = { sub: 'pb', blockId: activeBlockId, value: input.value + 'px' };
        } else if (prop.startsWith('fs')) {
          const idx = parseInt(input.dataset.fieldIdx);
          const fd  = blockDefs[activeBlockId] && blockDefs[activeBlockId].fields[idx];
          if (fd) changeObj = { sub: 'fs', sel: fd.sel, value: input.value + 'px' };
        } else if (prop.startsWith('imgh')) {
          const idx = parseInt(input.dataset.fieldIdx);
          const fd  = blockDefs[activeBlockId] && blockDefs[activeBlockId].fields[idx];
          if (fd) changeObj = { sub: 'img-h', sel: fd.sel, value: input.value + 'px' };
        } else if (prop.startsWith('mgt')) {
          const idx = parseInt(input.dataset.fieldIdx);
          const fd  = blockDefs[activeBlockId] && blockDefs[activeBlockId].fields[idx];
          if (fd) changeObj = { sub: 'margin-t', sel: fd.sel, value: input.value + 'px' };
        } else if (prop.startsWith('mgb')) {
          const idx = parseInt(input.dataset.fieldIdx);
          const fd  = blockDefs[activeBlockId] && blockDefs[activeBlockId].fields[idx];
          if (fd) changeObj = { sub: 'margin-b', sel: fd.sel, value: input.value + 'px' };
        }
        if (changeObj) markChange('block:' + activeBlockId + ':' + prop, changeObj);
        const undoBtn = fieldsDiv.querySelector(`[data-block-undo="${prop}"]`);
        if (undoBtn) undoBtn.disabled = false;
      });
    });

    fieldsDiv.addEventListener('click', e => {
      const undoBtn = e.target.closest('[data-block-undo]');
      if (!undoBtn) return;
      const prop = undoBtn.dataset.blockUndo;
      const hist = blockHistories[prop];
      if (!hist || !hist.length) return;
      const prev  = hist.pop();
      const input = fieldsDiv.querySelector(`[data-block-prop="${prop}"]`);
      if (!input || input.contentEditable === 'true') return;
      input.value = prev;
      input.dispatchEvent(new Event('input'));
      undoBtn.disabled = hist.length === 0;
    });

    // ── Auto espaciado ───────────────────────────────────────────────────────
    const SKIP_CLASSES = new Set(['fade','d1','d2','d3','open','active','container','__ep-panel','__ep-btn','__ep-save']);

    function autoLabel(child) {
      const classes = Array.from(child.classList).filter(c => !SKIP_CLASSES.has(c));
      const raw = child.id || classes[0] || child.tagName.toLowerCase();
      return raw
        .replace(/^(sec-|cred-|ctx-|learn-|form-|track-|hero-|fecha-)/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    }

    function autoSel(child) {
      if (child.id) return '#' + child.id;
      const classes = Array.from(child.classList).filter(c => !SKIP_CLASSES.has(c));
      if (classes.length > 0) {
        const cls = classes[0];
        const matches = document.querySelectorAll('.' + cls);
        if (matches.length === 1) return '.' + cls;
        return '[data-block="' + activeBlockId + '"] .' + cls;
      }
      const parent = child.parentElement;
      const idx = Array.from(parent.children).indexOf(child) + 1;
      return '[data-block="' + activeBlockId + '"] > :nth-child(' + idx + ')';
    }

    const container = el.querySelector('.container') || el;
    const autoChildren = Array.from(container.children).filter(child => {
      const tag = child.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style') return false;
      if (getComputedStyle(child).display === 'none') return false;
      return true;
    });

    // Solo si hay más de un hijo (el primero no necesita control, su espacio lo da el padding del bloque)
    if (autoChildren.length > 1) {
      const autoTitle = document.createElement('div');
      autoTitle.className = '__ep-bed-title';
      autoTitle.style.marginTop = '14px';
      autoTitle.textContent = 'Espaciado interno';
      fieldsDiv.appendChild(autoTitle);

      autoChildren.slice(1).forEach((child, ci) => {
        const prop = 'auto-mgt-' + ci;
        blockHistories[prop] = [];
        let prevVal = String(parseInt(getComputedStyle(child).marginTop) || 0);

        const mt = parseInt(getComputedStyle(child).marginTop) || 0;
        const inp = document.createElement('input');
        inp.type = 'number'; inp.value = mt;
        inp.dataset.blockProp = prop;

        const row = makeRow(autoLabel(child), inp, prop);
        fieldsDiv.appendChild(row);

        inp.addEventListener('mousedown', () => { prevVal = inp.value; });
        inp.addEventListener('focus',     () => { prevVal = inp.value; });
        inp.addEventListener('input',  () => { child.style.marginTop = inp.value + 'px'; });
        inp.addEventListener('change', () => {
          if (inp.value === prevVal) return;
          blockHistories[prop].push(prevVal);
          prevVal = inp.value;
          child.style.marginTop = inp.value + 'px';
          const sel = autoSel(child);
          markChange('block:' + activeBlockId + ':' + prop, { sub: 'margin-t', sel, value: inp.value + 'px' });
          const undoBtn = fieldsDiv.querySelector(`[data-block-undo="${prop}"]`);
          if (undoBtn) undoBtn.disabled = false;
        });
      });
    }
  }

  // Sincroniza el contenido del ce al elemento de la página y registra el cambio
  function syncText(ce, f, i) {
    const target = document.querySelector(f.sel);
    if (target) target.innerHTML = ce.innerHTML;
    markChange('block:' + activeBlockId + ':text' + i, buildTextChange(f, i, ce));
  }

  function buildTextChange(f, i, ce) {
    return { sub: 'html', sel: f.sel, value: ce.innerHTML };
  }

  // ─── EVENTOS GLOBALES DE BLOQUES ────────────────────────────────────────────
  panel.querySelectorAll('[data-block-btn]').forEach(b => {
    b.addEventListener('click', () => openBlock(b.dataset.blockBtn));
  });

  document.querySelectorAll('[data-block]').forEach(el => {
    el.addEventListener('click', e => {
      if (!document.body.classList.contains('ep-select')) return;
      const blockEl = e.target.closest('[data-block]');
      if (!blockEl) return;
      e.stopPropagation();
      openBlock(blockEl.dataset.block);
      if (!panel.classList.contains('open')) panel.classList.add('open');
    });
  });

  panel.querySelector('#__ep-block-back').addEventListener('click', clearActiveBlock);
};
