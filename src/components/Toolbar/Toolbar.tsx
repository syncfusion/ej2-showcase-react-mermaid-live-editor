import React from 'react';
import { ToolbarComponent, ItemsDirective, ItemDirective } from '@syncfusion/ej2-react-navigations';
import { ClickEventArgs } from '@syncfusion/ej2-navigations';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ToolbarProps {
  onToolClick: (action: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ZOOM_TOOLBAR_ITEMS = [
  { prefixIcon: 'e-icons e-reset', tooltipText: 'Reset Zoom', id: 'reset', cssClass: 'e-flat toolbar-btn' },
  { prefixIcon: 'e-icons e-zoom-to-fit', tooltipText: 'Fit To Page', id: 'fitToPage', cssClass: 'e-flat toolbar-btn' },
  { prefixIcon: 'e-icons e-zoom-in', tooltipText: 'Zoom In', id: 'zoomIn', cssClass: 'e-flat toolbar-btn' },
  { prefixIcon: 'e-icons e-zoom-out', tooltipText: 'Zoom Out', id: 'zoomOut', cssClass: 'e-flat toolbar-btn' },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────
const Toolbar: React.FC<ToolbarProps> = ({ onToolClick }) => {
  const handleToolbarClick = (args: ClickEventArgs) => {
    if (args.item && args.item.id) {
      onToolClick(args.item.id);
    }
  };

  return (
    <div className="toolbar-container" aria-label="Diagram zoom controls">
      <div className="toolbar-wrapper">
        <ToolbarComponent overflowMode="Extended" clicked={handleToolbarClick}>
          <ItemsDirective>
            {ZOOM_TOOLBAR_ITEMS.map((item, index) => (
              <ItemDirective
                key={index}
                prefixIcon={item.prefixIcon}
                tooltipText={item.tooltipText}
                id={item.id}
                cssClass={item.cssClass}
              />
            ))}
          </ItemsDirective>
        </ToolbarComponent>
      </div>
    </div>
  );
};

export default Toolbar;
