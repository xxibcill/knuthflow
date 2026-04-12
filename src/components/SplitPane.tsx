import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';

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

const KEYBOARD_STEP = 5;

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
    if (initialSizes) return [initialSizes[0] ?? 50, initialSizes[1] ?? 50];
    return [50, 50];
  });
  const [isDragging, setIsDragging] = useState(false);

  const minSize1 = panelConfigs?.[0]?.minSize ?? 10;
  const maxSize1 = panelConfigs?.[0]?.maxSize ?? 90;
  const minSize2 = panelConfigs?.[1]?.minSize ?? 10;
  const maxSize2 = panelConfigs?.[1]?.maxSize ?? 90;

  const applyResize = useCallback((newFirstSize: number) => {
    const clampedFirst = Math.max(minSize1, Math.min(maxSize1, newFirstSize));
    const second = 100 - clampedFirst;

    if (second < minSize2 || second > maxSize2) return;

    const nextSizes: [number, number] = [clampedFirst, second];
    setSizes(nextSizes);
    onResize?.(nextSizes);
  }, [maxSize1, maxSize2, minSize1, minSize2, onResize]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const nextSize = direction === 'horizontal'
      ? ((event.clientX - rect.left) / rect.width) * 100
      : ((event.clientY - rect.top) / rect.height) * 100;

    applyResize(nextSize);
  }, [applyResize, direction, isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Home') {
      applyResize(minSize1);
      return;
    }

    if (event.key === 'End') {
      applyResize(maxSize1);
      return;
    }

    let delta = 0;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') delta = -KEYBOARD_STEP;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') delta = KEYBOARD_STEP;

    if (delta === 0) return;

    event.preventDefault();
    applyResize(sizes[0] + delta);
  }, [applyResize, maxSize1, minSize1, sizes]);

  useEffect(() => {
    if (!isDragging) return undefined;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [direction, handleMouseMove, handleMouseUp, isDragging]);

  const isHorizontal = direction === 'horizontal';
  const firstChild = Array.isArray(children) ? children[0] : children;
  const secondChild = Array.isArray(children) ? children[1] : null;

  return (
    <div
      ref={containerRef}
      className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} ${className} ${isDragging ? 'select-none' : ''}`}
      style={isHorizontal ? { height: '100%' } : { width: '100%' }}
    >
      <div
        className="min-h-0 min-w-0 overflow-hidden"
        style={isHorizontal ? { width: `${sizes[0]}%` } : { height: `${sizes[0]}%` }}
      >
        {firstChild}
      </div>

      <div
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        className={`split-handle ${isHorizontal ? 'w-3 cursor-col-resize split-handle-horizontal' : 'h-3 cursor-row-resize split-handle-vertical'}`}
        role="separator"
        aria-orientation={direction}
        aria-valuenow={sizes[0]}
        aria-valuemin={minSize1}
        aria-valuemax={maxSize1}
      />

      <div
        className="min-h-0 min-w-0 overflow-hidden"
        style={isHorizontal ? { width: `${sizes[1]}%` } : { height: `${sizes[1]}%` }}
      >
        {secondChild}
      </div>
    </div>
  );
}

export default SplitPane;
