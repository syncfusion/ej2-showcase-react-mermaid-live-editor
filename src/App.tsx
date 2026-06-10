import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DiagramComponent,
  Inject,
  DataBinding,
  PrintAndExport,
  MindMap,
  FlowchartLayout,
  SnapConstraints,
  DiagramTools
} from '@syncfusion/ej2-react-diagrams';
import { ButtonComponent, CheckBoxComponent } from '@syncfusion/ej2-react-buttons';
import Editor from '@monaco-editor/react';
import mermaid from 'mermaid';

// Components
import NavMenu from './components/NavMenu/NavMenu';
import Toolbar from './components/Toolbar/Toolbar';
import HamburgerMenu from './components/HamburgerMenu/HamburgerMenu';
import ExportDialog from './components/ExportDialog/ExportDialog';
import Resizer from './components/Resizer/Resizer';
import Spinner from './components/Spinner/Spinner';

// Context
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ThemeType } from './utils/themeService';

// Assets & Styles
import { DEFAULT_SAMPLE, SAMPLES, SampleKey } from './assets/sampleMermaid';
import diagramSvg from './assets/Diagram_Component.svg';
import './App.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const DEBOUNCE_DELAY = 500;
const ZOOM_STEP = 0.2;

// ─── Pure helpers (no component dependencies) ─────────────────────────────────

/** Map a mermaid direction code to a Syncfusion orientation string. */
function dirCodeToOrientation(code: string): 'TopToBottom' | 'BottomToTop' | 'LeftToRight' | 'RightToLeft' | undefined {
  switch (code.toUpperCase()) {
    case 'TB': case 'TD': return 'TopToBottom';
    case 'BT': return 'BottomToTop';
    case 'RL': return 'RightToLeft';
    case 'LR': return 'LeftToRight';
    default:   return undefined;
  }
}

/** Detect diagram type and flowchart orientation from raw mermaid text (fallback). */
function GetLayoutInfo(text: string): { type: 'flowchart' | 'mindmap' | 'sequence'; orientation?: 'TopToBottom' | 'BottomToTop' | 'LeftToRight' | 'RightToLeft' } {
  if (!text) return { type: 'flowchart' };
  const rawFirst = text.split(/\r?\n/).find(l => l.trim()) ?? '';
  const firstRaw = rawFirst.replace(/^[\uFEFF\x00-\x1F]+/, '').trim();
  const first = firstRaw.toLowerCase();
  if (/^(sequence\s*diagram|sequencediagram)\b/.test(first)) return { type: 'sequence' };
  if (/^mindmap\b/.test(first)) return { type: 'mindmap' };
  const flowMatch = firstRaw.match(/^(flowchart|graph)\b(?:\s+([A-Za-z]{2}))?/i);
  if (flowMatch) return { type: 'flowchart', orientation: dirCodeToOrientation(flowMatch[2] || '') };
  return { type: 'flowchart' };
}

// ─── AppContent ───────────────────────────────────────────────────────────────
const AppContent: React.FC = () => {
  const { theme, themeSettings, setTheme } = useTheme();
  const diagramRef = useRef<DiagramComponent>(null);
  const debounceRef = useRef<number | null>(null);
  const prevParseErrorRef = useRef<any>(null);

  // ── Editor state ─────────────────────────────────────────────────────────
  const [mermaidText, setMermaidText] = useState<string>(DEFAULT_SAMPLE);
  const [livePreview, setLivePreview] = useState<boolean>(true);
  const [isEditorContentValid, setIsEditorContentValid] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [copyToast, setCopyToast] = useState<boolean>(false);

  // ── Diagram state ─────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [totalNodeCount, setTotalNodeCount] = useState<number>(0);
  const [importSummary, setImportSummary] = useState<string>('');
  const [isMindmapLayout, setIsMindmapLayout] = useState<boolean>(false);
  const [isGraphExpanded, setIsGraphExpanded] = useState<boolean>(true);
  // detected diagram type used for layout / defaults
  const [detectedType, setDetectedType] = useState<'flowchart' | 'mindmap' | 'sequence'>('flowchart');
  const detectedTypeRef = useRef<'flowchart' | 'mindmap' | 'sequence'>('flowchart');
  // ── UI state ──────────────────────────────────────────────────────────────
  const [isExportDialogOpen, setIsExportDialogOpen] = useState<boolean>(false);
  // track editor changes that haven't been rendered (only used when livePreview is off)
  const [pendingRender, setPendingRender] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showRuler, setShowRuler] = useState<boolean>(false);

  // ─────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  // initial render will be triggered once the DiagramComponent fires its `created` event

  // ─────────────────────────────────────────────────────────────────────────
  // CORE MERMAID RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // Override mermaid.parseError to capture parse errors from mermaid.parse
  useEffect(() => {
    prevParseErrorRef.current = (mermaid as any).parseError;
    (mermaid as any).parseError = (err: any) => {
      const msg = err?.str ?? err?.message ?? String(err);
      setErrorMessage(msg);
      setIsEditorContentValid(false);
    };
    return () => {
      (mermaid as any).parseError = prevParseErrorRef.current;
    };
  //eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validate mermaid syntax using mermaid.parse. Returns true when valid.
  // Helper: unified mermaid.parse wrapper (handles sync or Promise)
  const parseMermaid = useCallback(async (text: string) => {
    const maybePromise = (mermaid as any).parse(text, true);
    return maybePromise && typeof maybePromise.then === 'function' ? await maybePromise : maybePromise;
  }, []);

  // Helper: set validation state together
  const setValidation = useCallback((valid: boolean, msg?: string) => {
    setIsEditorContentValid(valid);
    setErrorMessage(msg ?? '');
  }, []);

  const validateMermaid = useCallback(async (text: string) => {
    if (!text || text.trim() === '') {
      setValidation(true, '');
      return true;
    }
    try {
      const res = await parseMermaid(text);
      if (res === false) {
        setValidation(false, 'Invalid Mermaid syntax');
        return false;
      }

      // As soon as the syntax is valid, attempt to detect diagram type so
      // the UI (NavMenu) can show the diagram type immediately even if the
      // diagram itself hasn't been rendered yet.
      try {
        let layoutInfo = GetLayoutInfo(text);
        if (res && (res as any).diagramType) {
          const dt = String((res as any).diagramType).toLowerCase();
          if (/sequence/.test(dt)) layoutInfo = { type: 'sequence' };
          else if (/mindmap/.test(dt)) layoutInfo = { type: 'mindmap' };
          else if (/flowchart|graph/.test(dt)) layoutInfo = { type: 'flowchart' };
        }
        const type = layoutInfo.type;
        detectedTypeRef.current = type;
        setDetectedType(type);
      } catch (e) {
        // ignore detection errors and fall back to previous detectedType
      }

      setValidation(true, '');
      return true;
    } catch (err: any) {
      const msg = err?.str ?? err?.message ?? String(err);
      setValidation(false, msg);
      return false;
    }
  }, [parseMermaid, setValidation, setDetectedType]);

  /** Primary entry point: detect type and load diagram (mermaid importer or small sequence model) */
  const renderFromMermaid = useCallback(async (text: string) => {
    setErrorMessage('');
    setIsLoading(true);
    try {
      // Prefer mermaid.parse to get diagram type and (when available) orientation.
      let layoutInfo = GetLayoutInfo(text);
      try {
        const parsed = await parseMermaid(text);
        if (parsed && parsed.diagramType) {
          const dt = String(parsed.diagramType).toLowerCase();
          if (/sequence/.test(dt)) layoutInfo = { type: 'sequence' };
          else if (/mindmap/.test(dt)) layoutInfo = { type: 'mindmap' };
          else if (/flowchart|graph/.test(dt)) {
            // attempt to extract orientation/direction from parse result if present
            const code = parsed?.db?.dir || parsed?.db?.direction || parsed?.direction || parsed?.parser?.yy?.direction || parsed?.root?.dir;
            layoutInfo = { type: 'flowchart', orientation: code ? dirCodeToOrientation(String(code)) : undefined };
          }
        }
      } catch (parseErr) {
        // If mermaid.parse throws here, treat as invalid syntax and surface the error.
        const msg = (parseErr as any)?.str ?? (parseErr as any)?.message ?? String(parseErr);
        setValidation(false, msg);
        setIsLoading(false);
        return;
      }

      const type = layoutInfo.type;
      detectedTypeRef.current = type;
      setDetectedType(type);

      const inst = diagramRef.current as any;
      if (!inst) {
        setErrorMessage('Diagram instance not ready.');
        setIsEditorContentValid(false);
        return;
      }
      // Set diagram layout on the instance BEFORE loading Mermaid so the importer uses the correct layout
      inst.clear();
      if (type === 'mindmap') {
        inst.layout = { type: 'MindMap', orientation: 'Horizontal', verticalSpacing: 50, horizontalSpacing: 50 };
      } else if (type === 'flowchart') {
        // include orientation when present (TopToBottom/BottomToTop/LeftToRight/RightToLeft)
        const layoutObj: any = { type: 'Flowchart' };
        if (layoutInfo.orientation) layoutObj.orientation = layoutInfo.orientation;
        inst.layout = layoutObj;
      } else {
        // sequence / other: clear layout so the importer doesn't apply a graph layout
        inst.layout = { type: 'None' };
      }
      inst.dataBind?.();

      await inst.loadDiagramFromMermaid(text);
      if (typeof inst.fitToPage === 'function') inst.fitToPage();
      const nodesCount = Array.isArray(inst.nodes) ? inst.nodes.length : 0;
      setTotalNodeCount(nodesCount);
      // If non-empty input produced zero nodes, treat as invalid syntax.
      if (nodesCount === 0 && text.trim() !== '') {
        setErrorMessage('No diagram elements produced — possible invalid Mermaid syntax');
        setImportSummary('');
        setIsMindmapLayout(false);
        setIsEditorContentValid(false);
      } else {
        setImportSummary('Diagram loaded successfully');
        setIsMindmapLayout(type === 'mindmap');
        setIsEditorContentValid(true);
      }
    } catch (err: any) {
      console.error('renderFromMermaid error', err);
      setValidation(false, err?.message || 'Invalid Mermaid syntax');
    } finally {
      setIsLoading(false);
      setPendingRender(false);
    }
  }, []);
  // ─────────────────────────────────────────────────────────────────────────
  // DEBOUNCED LIVE PREVIEW
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Always validate editor content on change (debounced). Only render when livePreview is enabled.
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      // validateMermaid may be async (returns a Promise) in some mermaid builds
      validateMermaid(mermaidText)
        .then((ok) => { if (ok && livePreview) renderFromMermaid(mermaidText); })
        .catch(() => { /* validation error already set in validateMermaid */ });
    }, DEBOUNCE_DELAY);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [mermaidText, livePreview, renderFromMermaid, validateMermaid]);

  // ─────────────────────────────────────────────────────────────────────────
  // EDITOR HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleEditorChange = useCallback((value: string | undefined) => {
    const text = value ?? '';
    setMermaidText(text);
    setErrorMessage('');
    setIsEditorContentValid(false);
    setImportSummary('');

    // empty editor -> show empty diagram area and clear pending state
    if (text.trim() === '') {
      setPendingRender(false);
      setIsEditorContentValid(true);
      return;
    }

    if (livePreview) {
      // live preview will validate via debounced render
      setPendingRender(false);
    } else {
      // live preview off: mark as changed but keep current diagram shown
      setPendingRender(true);
      // keep isEditorContentValid as last rendered state
    }
  }, [livePreview]);

  const handleRenderClick = useCallback(async () => {
    const text = mermaidText;
    // empty text: don't disable diagram, show empty status
    if (text.trim() === '') {
      setIsEditorContentValid(true);
      setPendingRender(false);
      setImportSummary('');
      setErrorMessage('');
      return;
    }

    // user requested render -> validate first, then render if valid
    setIsEditorContentValid(false);
    setPendingRender(false);
    const ok = await validateMermaid(text);
    if (ok) {
      renderFromMermaid(text);
    }
  }, [mermaidText, renderFromMermaid, validateMermaid]);

  const handleLiveToggle = useCallback((enabled: boolean) => {
    setLivePreview(enabled);
    // If enabling live preview and there's a pending change, validate and render it now.
    if (enabled && pendingRender) {
      // clear pending state now that live preview is on
      setPendingRender(false);
      validateMermaid(mermaidText).then((ok) => {
        if (ok) renderFromMermaid(mermaidText);
      }).catch(() => {
        // validation error already set inside validateMermaid
      });
    }
  }, [pendingRender, mermaidText, renderFromMermaid, validateMermaid]);

  const handleClearClick = useCallback(() => {
    setMermaidText('');
    setErrorMessage('');
    setImportSummary('');
    setIsEditorContentValid(true);
    setTotalNodeCount(0);
    if (diagramRef.current) {
      (diagramRef.current as any).clear?.();
    }
  }, []);

  const handleCopyClick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mermaidText);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 1800);
    } catch {
      // silent — clipboard may be blocked
    }
  }, [mermaidText]);

  // ─────────────────────────────────────────────────────────────────────────
  // FILE ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  const handleFileAction = useCallback((action: string) => {
    switch (action) {
      case 'new':
        handleClearClick();
        break;
      case 'reset':
        setMermaidText(DEFAULT_SAMPLE);
        if (livePreview) renderFromMermaid(DEFAULT_SAMPLE);
        else setPendingRender(true);
        break;
      case 'import': {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.mmd,.txt';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const text = ev.target?.result as string;
              setMermaidText(text);
              // Validate immediately so status reflects the imported content.
              // Only render now when livePreview is enabled; otherwise mark as pending.
              validateMermaid(text).then((ok) => {
                if (ok) {
                  if (livePreview) {
                    renderFromMermaid(text);
                  } else {
                    setPendingRender(true);
                    setImportSummary('');
                  }
                } else {
                  setPendingRender(false);
                  setImportSummary('');
                }
              }).catch(() => {
                // validation error already set in validateMermaid; do not attempt render
                setPendingRender(false);
                setImportSummary('');
              });
            };
            reader.readAsText(file);
          }
        };
        input.click();
        break;
      }
      case 'exportImage':
        // open existing export image dialog
        setIsExportDialogOpen(true);
        break;
      case 'exportDiagram': {
        const inst = diagramRef.current as any;
        if (!inst) {
          setValidation(false, 'Diagram not ready for export');
          return;
        }
        // Try Syncfusion save API if available
        try {
          const data = typeof inst.saveDiagram === 'function' ? inst.saveDiagram() : (inst.serialize ? inst.serialize() : null);
          if (data) {
            const json = typeof data === 'string' ? data : JSON.stringify(data);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'diagram.json';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          } else if (typeof inst.exportDiagram === 'function') {
            // fallback: ask Syncfusion to export (may not support JSON)
            try { inst.exportDiagram({ format: 'Json', fileName: 'diagram' }); } catch (e) { setValidation(false, 'Export not supported by this Diagram build'); }
          } else {
            setValidation(false, 'Export API not available');
          }
        } catch (err: any) {
          setValidation(false, err?.message ?? String(err));
        }
        break;
      }
      default:
        break;
    }
  }, [renderFromMermaid, handleClearClick, validateMermaid, livePreview]);

  // ─────────────────────────────────────────────────────────────────────────
  // SAMPLE LOADING
  // ─────────────────────────────────────────────────────────────────────────

  const handleSampleLoad = useCallback((sampleId: string) => {
    const text = SAMPLES[sampleId as SampleKey];
    if (text) {
      setMermaidText(text);
      // Validate sample first so status updates immediately.
      // Only render immediately when livePreview is enabled; otherwise mark as pending.
      validateMermaid(text).then((ok) => {
        if (ok) {
          if (livePreview) renderFromMermaid(text);
          else setPendingRender(true);
        } else {
          setPendingRender(false);
          setImportSummary('');
        }
      }).catch(() => {
        setPendingRender(false);
        setImportSummary('');
      });
    }
  }, [renderFromMermaid, validateMermaid, livePreview]);

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW OPTIONS
  // ─────────────────────────────────────────────────────────────────────────

  const handleViewOptionToggle = useCallback((optionId: string) => {
    switch (optionId) {
      case 'view-grid':
        setShowGrid(prev => !prev);
        break;
      case 'view-ruler':
        setShowRuler(prev => !prev);
        break;
      default:
        break;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // THEME
  // ─────────────────────────────────────────────────────────────────────────

  const handleThemeChange = useCallback((newTheme: ThemeType) => {
    if (theme === newTheme) return;
    setTheme(newTheme);
    document.body.classList.toggle('dark-theme', newTheme === 'dark');

    const themeLink = document.getElementById('theme-link') as HTMLLinkElement;
    if (themeLink) {
      if (newTheme === 'dark') {
        themeLink.href = themeLink.href.replace(/tailwind(\.css)/, 'tailwind-dark$1');
      } else {
        themeLink.href = themeLink.href.replace(/tailwind-dark(\.css)/, 'tailwind$1');
      }
    }
}, [theme, setTheme]);

  // ─────────────────────────────────────────────────────────────────────────
  // DIAGRAM TOOLBAR ACTIONS (zoom controls)
  // ─────────────────────────────────────────────────────────────────────────

  const handleDiagramToolbarActions = useCallback((action: string) => {
    const inst = diagramRef.current as any;
    if (!inst) return;
    switch (action) {
      case 'reset':
        inst.reset?.();
        break;
      case 'fitToPage':
        inst.fitToPage?.({ mode: 'Page', region: 'Content'});
        break;
      case 'zoomIn':
        inst.zoomTo?.({ type: 'ZoomIn', zoomFactor: ZOOM_STEP });
        break;
      case 'zoomOut':
        inst.zoomTo?.({ type: 'ZoomOut', zoomFactor: ZOOM_STEP });
        break;
      default:
        break;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // EXPORT
  // ─────────────────────────────────────────────────────────────────────────

  const handleExportImageDialogOpen = useCallback(() => {
    setIsExportDialogOpen(true);
  }, []);

  const handleDiagramExport = useCallback((fileName: string, format: string) => {
    const inst = diagramRef.current as any;
    if (!inst) {
      setErrorMessage('Diagram not ready for export');
      return;
    }
    if (typeof inst.exportDiagram === 'function') {
      inst.exportDiagram({ format: format as any, fileName });
    } else {
      setErrorMessage('exportDiagram API not available in this Syncfusion version');
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // EXPAND GRAPH ONLY (Mindmap)
  // ─────────────────────────────────────────────────────────────────────────

  const toggleExpandGraphOnly = useCallback(() => {
    if (!isMindmapLayout) return;
    const inst = diagramRef.current as any;
    if (!inst) return;

    const allNodes: any[] = inst.nodes ?? [];
    const nextExpanded = !isGraphExpanded;

    allNodes.forEach((node: any) => {
      node.isExpanded = nextExpanded;
    });

    inst.dataBind?.();
    inst.doLayout?.();
    setIsGraphExpanded(nextExpanded);
  }, [isMindmapLayout, isGraphExpanded]);

  // node/connector default styles based on detected diagram type
  const getNodeDefaults = useCallback((node: any) => {
    const currentType = detectedTypeRef.current;
    if (currentType === 'mindmap') {
        node.width = 140;
        node.height = 36;
      return node;
    }
    if (currentType === 'flowchart') {
        node.width = 130;
        node.height = 48;
      return node;
    }
  }, [detectedType]);

  const getConnectorDefaults = useCallback((connector: any) => {
    const currentType = detectedTypeRef.current;
    const strokeColor =  '#6B7280';
    if (currentType === 'flowchart') {
      connector.type = 'Orthogonal';
    } else if (currentType === 'mindmap') {
      connector.type = 'Bezier';
    }

    connector.style = {
      strokeColor: strokeColor,
      strokeWidth: 1.5
    }

    if (connector.targetDecorator) {
      if (currentType === 'sequence') {
          connector.targetDecorator.style.fill = strokeColor;
          connector.targetDecorator.style.strokeColor = strokeColor;
      }else{
        connector.targetDecorator = { shape: 'none' };
      }
    }

    if (connector.annotations && connector.annotations[0] && connector.annotations[0].style) {
      connector.annotations[0].style = {
        color: strokeColor,
      }
    }
    // flowchart / default
    return connector;
  }, [detectedType]);
  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const snapConstraints = showGrid ? SnapConstraints.ShowLines : SnapConstraints.None;

  return (
    <div className="app-layout">

      {/* ── Navigation Bar ── */}
      <NavMenu
        onFileAction={handleFileAction}
        onSampleLoad={handleSampleLoad}
        onViewOptionToggle={handleViewOptionToggle}
        onThemeChange={handleThemeChange}
        showGrid={showGrid}
        showRuler={showRuler}
        currentLayout={detectedType}     />

      {/* ── Main Content ── */}
      <div className="main-grid">

        {/* Left Panel — Editor */}
        <div className="left-panel">

          {/* Textarea toolbar */}
          <div className="editor-toolbar" role="toolbar" aria-label="Editor controls">
            <CheckBoxComponent label="Live Preview" checked={livePreview} change={(e) => handleLiveToggle(e.checked)} />
            <div style={{display: "flex", gap: "4px"}}>
              {!livePreview &&(
              <ButtonComponent id='renderBtn' cssClass='action-btn e-flat' iconCss='e-icons e-play' onClick={handleRenderClick} disabled={isLoading} aria-label="Render diagram"></ButtonComponent>
              )}
              <ButtonComponent id='clearBtn' cssClass='action-btn e-flat' iconCss='e-icons e-close' onClick={handleClearClick} disabled={isLoading} aria-label="Clear editor"></ButtonComponent>
              <ButtonComponent id='copyBtn' cssClass='action-btn e-flat' iconCss='e-icons e-copy' onClick={handleCopyClick} disabled={isLoading} aria-label="Copy text"></ButtonComponent>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="monaco-editor-container">
            <Editor
              height="100%"
              language="plaintext"
              value={mermaidText}
              onChange={handleEditorChange}
              theme={theme === 'dark' ? 'vs-dark' : 'vs'}
              options={{
                automaticLayout: true,
                scrollBeyondLastLine: false,
                minimap: { enabled: false },
                scrollbar: { verticalScrollbarSize: 5, horizontalScrollbarSize: 5 },
                stickyScroll: { enabled: false },
                placeholder: 'Enter Mermaid syntax here...',
                wordWrap: 'on',
                lineNumbers: 'on',
              }}
            />
          </div>

        </div>

        {/* Resizer */}
        <Resizer />

        {/* Right Panel — Diagram */}
        <div className="right-panel scroll-hide">

          {/* Hamburger Menu */}
          <HamburgerMenu
            onExpandGraphOnly={toggleExpandGraphOnly}
            isMindmapLayout={isMindmapLayout}
          />

          {/* Syncfusion Diagram */}
          <DiagramComponent
            ref={diagramRef}
            id="mermaid-diagram"
            width="100%"
            height="100%"
            backgroundColor={themeSettings.backgroundColor}
            scrollSettings={{ scrollLimit: 'Infinity' }}
            snapSettings={{
              constraints: snapConstraints,
              horizontalGridlines: { lineColor: themeSettings.gridlinesColor },
              verticalGridlines: { lineColor: themeSettings.gridlinesColor },
            }}
            tool={DiagramTools.ZoomPan | DiagramTools.SingleSelect}
            getNodeDefaults={getNodeDefaults}
            getConnectorDefaults={getConnectorDefaults}
            rulerSettings={{ showRulers: showRuler }}
            created={(args) => { if (livePreview) renderFromMermaid(mermaidText); }}
          >
            <Inject services={[DataBinding, PrintAndExport, MindMap, FlowchartLayout]} />
          </DiagramComponent>
          {/* invalid overlay when editor content isn't valid (empty disabled screen) */}
          {!isEditorContentValid && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.60)', color: '#fff', zIndex: 500, pointerEvents: 'auto'
            }} />
          )}
          {/* Zoom Toolbar (bottom-left) */}
          <Toolbar onToolClick={handleDiagramToolbarActions} />

          {/* Spinner overlay */}
          <Spinner isVisible={isLoading} />
        </div>
      </div>

      {/* ── Bottom Status Bar ── */}
      <div className="bottom-bar">
        <div className="bottom-bar-content">

          {/* Status icon + validity */}
           <span className="status-message" aria-live="polite">
            {mermaidText.trim() === '' ? null : (
              isEditorContentValid ? (
                <span className="status-valid">
                  <span className="e-icons e-check" aria-hidden="true" />
                  <span>Valid Mermaid</span>
                </span>
              ) : (
                <span className="status-invalid" role="alert">
                  <span className="e-icons e-close" aria-hidden="true" />
                  <span>Invalid Mermaid</span>
                </span>
              )
            )}
          </span>

          {/* Center: import summary + Details button */}
          <span className="status-center">
            {importSummary && (
              <>
                <span>{importSummary}</span>
                {errorMessage && (
                  <button
                    className="details-btn"
                    onClick={() => setIsDetailsModalOpen(true)}
                    aria-label="View error details"
                  >
                    Details
                  </button>
                )}
              </>
            )}
            {!importSummary && errorMessage && (
              <>
                <span className="status-error-summary">{errorMessage.slice(0, 80)}{errorMessage.length > 80 ? '…' : ''}</span>
                <button
                  className="details-btn"
                  onClick={() => setIsDetailsModalOpen(true)}
                  aria-label="View error details"
                >
                  Details
                </button>
              </>
            )}
          </span>

          {/* Right: node count */}
          <span className="bottom-right">Nodes: {totalNodeCount}</span>
        </div>
      </div>

      {/* ── Footer ── */}
      <Footer />

      {/* ── Dialogs ── */}

      {/* Export Image dialog */}
      <ExportDialog
        isVisible={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        onExport={handleDiagramExport}
      />
      {/* Error Details modal */}
      {isDetailsModalOpen && (
        <div
          className="details-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Error details"
          onClick={() => setIsDetailsModalOpen(false)}
        >
          <div
            className="details-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="details-modal-header">
              <span>Error Details</span>
              <button
                className="details-modal-close"
                onClick={() => setIsDetailsModalOpen(false)}
                aria-label="Close error details"
              >
                <span className="e-icons e-close" />
              </button>
            </div>
            <pre className="details-modal-body">{errorMessage || 'No errors.'}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Root App ─────────────────────────────────────────────────────────────────
const App: React.FC = () => (
  <ThemeProvider>
    <AppContent />
  </ThemeProvider>
);

// ─── Footer ───────────────────────────────────────────────────────────────────
const Footer: React.FC = () => (
  <div className="footer">
    <div className="footer-container">
      <div className="diagram-icon">
                    <img
                        className="footer-logo"
                        src={diagramSvg}
                    />
                </div>
      <div className="footer-content">
        <div className="title">
            <span>
                Want interactive diagramming in your app?
            </span>
            <span><strong className='main-title'> Try our Diagram Component</strong> — build, connect, and customize!</span>
        </div>
        <div className="buttons">
            <button
                type="button"
                className="e-trial-btn e-btn e-primary e-icons"
                onClick={() => window.open('https://www.syncfusion.com/downloads/react?tag=es-freetools-mermaid-live-editor-sample-ads-trial', '_blank')}
            >
            </button>
            <button
                type="button"
                className="e-demo-btn e-btn"
                onClick={() => window.open('https://www.syncfusion.com/request-demo?tag=es-freetools-mermaid-live-editor-sample-ads-demo', '_blank')}
            >
                Request Demo
            </button>
        </div>
      </div>
    </div>
  </div>
);

export default App;
