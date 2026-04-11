import { useState, useCallback, useRef, useEffect, ReactNode } from 'react';

export type PanelDirection = 'horizontal' | 'vertical';

export interface PanelConfig {
  id: string;
  minSize?: number;
  maxSize?: number;
  defaultSize?: number;
}

export interface SplitPaneProps {
  children: [ReactNode, ReactNode];
  direction?: PanelDirection;
  initialSizes?: [number | undefined, number | undefined];
  panelConfigs?: [PanelConfig, PanelConfig];
  className?: string;
  onResize?: (sizes: [number, number]) => void;
}

const KEYBOARD_STEP = 5; // % to move per key press

export function SplitPane({
  children,
  direction = 'horizontal',
  initialSizes,
  panelConfigs,
  className = '',
  onResize,
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState<[number, number]>(() => {
    if (initialSizes) {
      return [initialSizes[0] ?? 50, initialSizes[1] ?? 50];
    }
    return [50, 50];
  });
  const [isDragging, setIsDragging] = useState(false);

  const minSize1 = panelConfigs?.[0]?.minSize ?? 10;
  const maxSize1 = panelConfigs?.[0]?.maxSize ?? 90;
  const minSize2 = panelConfigs?.[1]?.minSize ?? 10;
  const maxSize2 = panelConfigs?.[1]?.maxSize ?? 90;

  const applyResize = useCallback((newFirstSize: number) => {
    newFirstSize = Math.max(minSize1, Math.min(maxSize1, newFirstSize));
    const newSecondSize = 100 - newFirstSize;

    if (newSecondSize >= minSize2 && newSecondSize <= maxSize2) {
      const newSizes: [number, number] = [newFirstSize, newSecondSize];
      setSizes(newSizes);
      onResize?.(newSizes);
    }
  }, [minSize1, maxSize1, minSize2, maxSize2, onResize]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    let newFirstSize: number;
    if (direction === 'horizontal') {
      newFirstSize = ((e.clientX - rect.left) / rect.width) * 100;
    } else {
      newFirstSize = ((e.clientY - rect.top) / rect.height) * 100;
    }

    applyResize(newFirstSize);
  }, [isDragging, direction, applyResize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    let delta = 0;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      delta = -KEYBOARD_STEP;
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      delta = KEYBOARD_STEP;
    } else if (e.key === 'Home') {
      applyResize(minSize1);
      return;
    } else if (e.key === 'End') {
      applyResize(maxSize1);
      return;
    }

    if (delta !== 0) {
      e.preventDefault();
      applyResize(sizes[0] + delta);
    }
  }, [sizes, applyResize, minSize1, maxSize1]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp, direction]);

  const isHorizontal = direction === 'horizontal';
  const firstChild = Array.isArray(children) ? children[0] : children;
  const secondChild = Array.isArray(children) ? children[1] : null;

  return (
    <div
      ref={containerRef}
      className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} ${className} ${
        isDragging ? 'select-none' : ''
      }`}
      style={isHorizontal ? { height: '100%' } : { width: '100%' }}
    >
      {/* First panel */}
      <div
        className="overflow-hidden flex-shrink-0"
        style={
          isHorizontal
            ? { width: `${sizes[0]}%`, minWidth: 0 }
            : { height: `${sizes[0]}%`, minHeight: 0 }
        }
      >
        {firstChild}
      </div>

      {/* Resizer */}
      <div
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        className={`flex-shrink-0 ${
          isHorizontal
            ? 'w-1 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500'
            : 'h-1 cursor-row-resize hover:bg-blue-500/50 active:bg-blue-500'
        } ${isDragging ? 'bg-blue-500' : 'bg-gray-700'}`}
        role="separator"
        aria-orientation={direction}
        aria-valuenow={sizes[0]}
        aria-valuemin={minSize1}
        aria-valuemax={maxSize1}
      />

      {/* Second panel */}
      <div
        className="overflow-hidden flex-shrink-0"
        style={
          isHorizontal
            ? { width: `${sizes[1]}%`, minWidth: 0 }
            : { height: `${sizes[1]}%`, minHeight: 0 }
        }
      >
        {secondChild}
      </div>
    </div>
  );
}

export default SplitPane;
