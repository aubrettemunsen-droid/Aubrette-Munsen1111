import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext.tsx';

interface ImageComparisonSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  aspectRatio?: string;
}

export const ImageComparisonSlider: React.FC<ImageComparisonSliderProps> = ({
  beforeImage,
  afterImage,
  beforeLabel = 'Original Asset',
  afterLabel = 'AI Synthesis',
  className = '',
  aspectRatio = 'aspect-[3/4]',
}) => {
  const { language } = useLanguage();
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'sideBySide'>('split');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  if (viewMode === 'sideBySide') {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between text-xs text-stone-500 font-mono">
          <span>{language === 'zh' ? '双图平铺对比模式' : 'Side-by-Side Inspection'}</span>
          <button
            onClick={() => setViewMode('split')}
            className="hover:text-stone-900 underline transition-colors"
          >
            {language === 'zh' ? '切换为交互滑动对比' : 'Switch to Split Slider'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative border border-stone-200 rounded-lg overflow-hidden bg-stone-100">
            <img
              src={beforeImage}
              alt={beforeLabel}
              className={`w-full ${aspectRatio} object-cover`}
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-stone-900/80 text-white text-xs font-mono rounded">
              {beforeLabel}
            </div>
          </div>
          <div className="relative border border-stone-200 rounded-lg overflow-hidden bg-stone-100">
            <img
              src={afterImage}
              alt={afterLabel}
              className={`w-full ${aspectRatio} object-cover`}
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-stone-900/80 text-white text-xs font-mono rounded">
              {afterLabel}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between text-xs text-stone-500 font-mono">
        <div className="flex items-center gap-3">
          <span>{beforeLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{afterLabel}</span>
        </div>
        <button
          onClick={() => setViewMode('sideBySide')}
          className="hover:text-stone-900 underline transition-colors"
        >
          {language === 'zh' ? '切换为双图平铺对比' : 'View Side-by-Side'}
        </button>
      </div>

      <div
        ref={containerRef}
        onMouseDown={(e) => {
          setIsDragging(true);
          handleMove(e.clientX);
        }}
        onTouchStart={(e) => {
          setIsDragging(true);
          handleMove(e.touches[0].clientX);
        }}
        className={`relative w-full ${aspectRatio} border border-stone-200 rounded-lg overflow-hidden select-none cursor-ew-resize bg-stone-100 shadow-sm`}
      >
        {/* After Image (Background) */}
        <img
          src={afterImage}
          alt={afterLabel}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          referrerPolicy="no-referrer"
        />

        {/* Before Image (Clipped Foreground) */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ width: `${sliderPosition}%` }}
        >
          <img
            src={beforeImage}
            alt={beforeLabel}
            className="absolute inset-0 w-full h-full object-cover max-w-none"
            style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : '100%' }}
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Divider Line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.4)] pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-md border border-stone-300 flex items-center justify-center text-stone-700 text-xs font-bold">
            ↔
          </div>
        </div>

        {/* Tags */}
        <div className="absolute top-3 left-3 bg-stone-900/75 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded font-mono pointer-events-none">
          {beforeLabel}
        </div>
        <div className="absolute top-3 right-3 bg-stone-900/75 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded font-mono pointer-events-none">
          {afterLabel}
        </div>
      </div>
    </div>
  );
};
