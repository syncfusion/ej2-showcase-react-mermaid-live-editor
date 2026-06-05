import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DropDownButtonComponent, ItemModel } from '@syncfusion/ej2-react-splitbuttons';
import { MenuEventArgs } from '@syncfusion/ej2-splitbuttons';

// ─── Types ────────────────────────────────────────────────────────────────────
interface HamburgerMenuProps {
  onExpandGraphOnly: () => void;
  isMindmapLayout: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MENU_IDS = {
  EXPAND_GRAPH: 'expandGraph',
} as const;

const MENU_ICONS = {
  EXPAND: 'e-icons e-expand',
  HAMBURGER: 'e-icons e-menu',
} as const;

// ─── Component ────────────────────────────────────────────────────────────────
const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  onExpandGraphOnly,
  isMindmapLayout,
}) => {
  const menuItems = useMemo((): ItemModel[] => [
    {
      text: 'Expand Graph Only (Mindmap)',
      id: MENU_IDS.EXPAND_GRAPH,
      iconCss: MENU_ICONS.EXPAND,
      disabled: !isMindmapLayout,
    },
  ], [isMindmapLayout]);

  const handleMenuSelect = useCallback((args: MenuEventArgs) => {
    switch (args.item.id) {
      case MENU_IDS.EXPAND_GRAPH:
        if (isMindmapLayout) onExpandGraphOnly();
        break;
      default:
        break;
    }
  }, [onExpandGraphOnly, isMindmapLayout]);

  return (
    <div className="hamburger-menu">
      <DropDownButtonComponent
        iconCss={MENU_ICONS.HAMBURGER}
        cssClass="e-caret-hide"
        items={menuItems}
        select={handleMenuSelect}
        aria-label="Diagram actions menu"
      />
    </div>
  );
};

export default HamburgerMenu;
