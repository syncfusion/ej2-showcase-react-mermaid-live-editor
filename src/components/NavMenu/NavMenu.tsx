import React, { useState, useCallback, useMemo } from 'react';
import { DropDownButtonComponent, ItemModel } from '@syncfusion/ej2-react-splitbuttons';
import { MenuEventArgs } from '@syncfusion/ej2-splitbuttons';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeType } from '../../utils/themeService';
import syncfusionLogoSvg from '../../assets/Syncfusion_Logo.svg';
import mermaidLogoSvg from '../../assets/Mermaid_Icon.svg';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface NavMenuProps {
  onFileAction: (action: string) => void;
  onSampleLoad: (sampleId: string) => void;
  onViewOptionToggle: (optionId: string) => void;
  onThemeChange: (theme: ThemeType) => void;
  showGrid: boolean;
  showRuler: boolean;
  currentLayout: 'flowchart' | 'mindmap' | 'sequence';
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MENU_IDS = {
  FILE: { OPEN: 'open', NEW: 'new', RESET: 'reset', IMPORT: 'import', EXPORT_IMAGE: 'exportImage', EXPORT_DIAGRAM: 'exportDiagram', EXIT: 'exit' },
  VIEW: { GRID: 'view-grid', RULER: 'view-ruler' },
  THEME: { LIGHT: 'light', DARK: 'dark' },
  SAMPLES: {
    FLOWCHART: 'sample-flowchart',
    SEQUENCE: 'sample-sequence',
    MINDMAP: 'sample-mindmap',
  },
} as const;

const MENU_ICONS = {
  CHECK: 'e-icons e-check',
  IMPORT: 'e-icons e-import',
  EXPORT: 'e-icons e-export',
  RESET: 'e-icons e-reset',
  EXIT: 'e-icons e-close',
  BLANK: '',
} as const;

// ─── Component ────────────────────────────────────────────────────────────────
const NavMenu: React.FC<NavMenuProps> = ({
  onFileAction,
  onSampleLoad,
  onViewOptionToggle,
  onThemeChange,
  showGrid,
  showRuler,
  currentLayout
}) => {
  const { theme } = useTheme();

  const currentSampleId = useMemo(() => {
    if (currentLayout === 'flowchart') return MENU_IDS.SAMPLES.FLOWCHART;
    if (currentLayout === 'mindmap') return MENU_IDS.SAMPLES.MINDMAP;
    return MENU_IDS.SAMPLES.SEQUENCE;
  }, [currentLayout]);

  const currentSampleText = useMemo(() => {
    if (currentLayout === 'flowchart') return 'Flowchart';
    if (currentLayout === 'mindmap') return 'Mindmap';
    return 'Sequence Diagram';
  }, [currentLayout]);

  const fileMenuItems = useMemo((): ItemModel[] => [
    { text: 'New', id: MENU_IDS.FILE.NEW, iconCss: MENU_ICONS.RESET },
    { text: 'Import (.mmd)', id: MENU_IDS.FILE.IMPORT, iconCss: MENU_ICONS.IMPORT },
    { text: 'Export as Image', id: MENU_IDS.FILE.EXPORT_IMAGE, iconCss: MENU_ICONS.EXPORT },
    { text: 'Export Diagram (JSON)', id: MENU_IDS.FILE.EXPORT_DIAGRAM, iconCss: MENU_ICONS.EXPORT },
  ], []);

  const viewMenuItems = useMemo((): ItemModel[] => [
    { text: 'Show Grid', id: MENU_IDS.VIEW.GRID, iconCss: showGrid ? MENU_ICONS.CHECK : MENU_ICONS.BLANK },
    { text: 'Show Ruler', id: MENU_IDS.VIEW.RULER, iconCss: showRuler ? MENU_ICONS.CHECK : MENU_ICONS.BLANK },
  ], [showGrid, showRuler]);

  const themeMenuItems = useMemo((): ItemModel[] => [
    { text: 'Light', id: MENU_IDS.THEME.LIGHT, iconCss: theme === 'light' ? MENU_ICONS.CHECK : MENU_ICONS.BLANK },
    { text: 'Dark', id: MENU_IDS.THEME.DARK, iconCss: theme === 'dark' ? MENU_ICONS.CHECK : MENU_ICONS.BLANK },
  ], [theme]);

  const sampleMenuItems = useMemo((): ItemModel[] => [
    { text: 'Flowchart', id: MENU_IDS.SAMPLES.FLOWCHART, iconCss: currentSampleId === MENU_IDS.SAMPLES.FLOWCHART ? MENU_ICONS.CHECK : MENU_ICONS.BLANK },
    { text: 'Sequence Diagram', id: MENU_IDS.SAMPLES.SEQUENCE, iconCss: currentSampleId === MENU_IDS.SAMPLES.SEQUENCE ? MENU_ICONS.CHECK : MENU_ICONS.BLANK },
    { text: 'Mindmap', id: MENU_IDS.SAMPLES.MINDMAP, iconCss: currentSampleId === MENU_IDS.SAMPLES.MINDMAP ? MENU_ICONS.CHECK : MENU_ICONS.BLANK },
  ], [currentSampleId]);

  const handleFileSelect = useCallback((args: MenuEventArgs) => {
    if (args.item.id) onFileAction(args.item.id);
  }, [onFileAction]);

  const handleViewSelect = useCallback((args: MenuEventArgs) => {
    if (args.item.id) onViewOptionToggle(args.item.id);
  }, [onViewOptionToggle]);

  const handleThemeSelect = useCallback((args: MenuEventArgs) => {
    if (args.item.id) onThemeChange(args.item.id as ThemeType);
  }, [onThemeChange]);

  const handleSampleSelect = useCallback((args: MenuEventArgs) => {
    if (args.item.id) onSampleLoad(args.item.id);
  }, [onSampleLoad]);

  return (
    <div className="navbar">
      <div className="navbar-left">
        <img style={{ marginRight: '7px', marginBottom:'0.1rem',  filter: theme === 'dark' ? 'brightness(0) invert(1)' : 'none' }} src={mermaidLogoSvg} />
        <span className="nav-title">Mermaid Live Editor</span>

        <DropDownButtonComponent items={fileMenuItems} select={handleFileSelect}>
          File
        </DropDownButtonComponent>

        <DropDownButtonComponent items={viewMenuItems} select={handleViewSelect}>
          View
        </DropDownButtonComponent>

        <DropDownButtonComponent items={themeMenuItems} select={handleThemeSelect}>
          Theme
        </DropDownButtonComponent>

        <DropDownButtonComponent items={sampleMenuItems} select={handleSampleSelect}>
          {currentSampleText}
        </DropDownButtonComponent>
      </div>

     <div className="promotion-text" style={{ color: theme === 'dark' ? '#ffffff' : '#1a1a1a' }}>
        <img
          style={{ marginRight: '7px', marginBottom:'0.1rem', filter: theme === 'dark' ? 'brightness(0) invert(1)' : 'none' }}
          src={syncfusionLogoSvg}
        />
        Powered by&nbsp;
        <a
          style={{ textDecoration: 'none', color: theme === 'dark' ? '#6ea8fe' : '#0d6efd' }}
          href="https://www.syncfusion.com/react-components/react-diagram?tag=es-freetools-json-and-xml-diagram-visualizer-ft"
          target="_blank"
          rel="noopener noreferrer"
        >
          Syncfusion Diagram Component
        </a>
      </div> 
    </div>
  );
};

export default NavMenu;
