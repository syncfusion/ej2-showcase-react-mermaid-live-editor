import React, { useRef, useCallback, useEffect } from 'react';

interface ResizerProps {
  onResize?: (leftWidth: number) => void;
}

const RESIZER_CONFIG = {
  RIGHT_PANEL_MIN_PERCENTAGE: 0.5,
  THROTTLE_DELAY: 16,
} as const;

const Resizer: React.FC<ResizerProps> = ({ onResize }) => {
  const splitterRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    event.preventDefault();
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDraggingRef.current) return;
    if (throttleTimeoutRef.current) return;

    throttleTimeoutRef.current = setTimeout(() => {
      const mainGrid = document.querySelector('.main-grid') as HTMLElement;
      const leftPanel = document.querySelector('.left-panel') as HTMLElement;
      if (!mainGrid || !leftPanel) return;

      const containerWidth = mainGrid.offsetWidth;
      const maxLeftWidth = containerWidth * (1 - RESIZER_CONFIG.RIGHT_PANEL_MIN_PERCENTAGE);
      const newWidth = Math.min(Math.max(event.clientX, 0), maxLeftWidth);
      leftPanel.style.width = `${newWidth}px`;

      if (onResize) onResize(newWidth);
      throttleTimeoutRef.current = null;
    }, RESIZER_CONFIG.THROTTLE_DELAY);
  }, [onResize]);

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
        throttleTimeoutRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (throttleTimeoutRef.current) clearTimeout(throttleTimeoutRef.current);
      document.body.style.cursor = '';
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={splitterRef}
      className="splitter"
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panels"
      tabIndex={0}
    />
  );
};

export default Resizer;
