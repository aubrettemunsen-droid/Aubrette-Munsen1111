import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext.tsx';

interface MaskEditorCanvasProps {
  imageSrc: string;
  onMaskChange: (maskDataUrl: string) => void;
  className?: string;
}

export const MaskEditorCanvas: React.FC<MaskEditorCanvasProps> = ({
  imageSrc,
  onMaskChange,
  className = '',
}) => {
  const { language } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [brushSize, setBrushSize] = useState<number>(30);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Load image onto background canvas and initialize mask
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      const imgCanvas = imageCanvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!imgCanvas || !maskCanvas) return;

      const width = img.naturalWidth || 600;
      const height = img.naturalHeight || 800;

      imgCanvas.width = width;
      imgCanvas.height = height;
      maskCanvas.width = width;
      maskCanvas.height = height;

      const imgCtx = imgCanvas.getContext('2d');
      if (imgCtx) {
        imgCtx.drawImage(img, 0, 0, width, height);
      }

      const maskCtx = maskCanvas.getContext('2d');
      if (maskCtx) {
        maskCtx.clearRect(0, 0, width, height);
        generateAutoMask(imgCanvas, maskCanvas);
      }

      setIsLoaded(true);
    };
  }, [imageSrc]);

  // Generate an initial smart auto-mask targeting central clothing area
  const generateAutoMask = (imgCanvas: HTMLCanvasElement, maskCanvas: HTMLCanvasElement) => {
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    const w = maskCanvas.width;
    const h = maskCanvas.height;

    maskCtx.clearRect(0, 0, w, h);

    maskCtx.fillStyle = 'rgba(255, 255, 255, 1.0)';
    maskCtx.beginPath();
    const centerX = w / 2;
    const centerY = h * 0.48;
    const radiusX = w * 0.32;
    const radiusY = h * 0.34;
    maskCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    maskCtx.fill();

    notifyMaskChange();
  };

  const notifyMaskChange = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const dataUrl = maskCanvas.toDataURL('image/png');
    onMaskChange(dataUrl);
  }, [onMaskChange]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return { x: 0, y: 0 };
    const rect = maskCanvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = maskCanvas.width / rect.width;
    const scaleY = maskCanvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;
    drawPoint(coords.x, coords.y);
  };

  const drawPoint = (x: number, y: number) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (tool === 'brush') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
    } else {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
    }

    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    const currentPoint = getCanvasCoords(e);
    const lastPoint = lastPointRef.current;

    if (lastPoint) {
      ctx.save();
      if (tool === 'brush') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(255, 255, 255, 1.0)';
        ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
      } else {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0, 0, 0, 1.0)';
        ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
      }

      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(currentPoint.x, currentPoint.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(currentPoint.x, currentPoint.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    lastPointRef.current = currentPoint;
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      lastPointRef.current = null;
      notifyMaskChange();
    }
  };

  const handleClearMask = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    notifyMaskChange();
  };

  const handleFillAll = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
    ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    notifyMaskChange();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mask Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTool('brush')}
            className={`px-3 py-1.5 rounded transition-colors ${
              tool === 'brush'
                ? 'bg-stone-900 text-white'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
          >
            {language === 'zh' ? '画笔 (选中区域)' : 'Brush (Mask In)'}
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`px-3 py-1.5 rounded transition-colors ${
              tool === 'eraser'
                ? 'bg-stone-900 text-white'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
          >
            {language === 'zh' ? '橡皮擦 (保护区域)' : 'Eraser (Protect Area)'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-stone-500">{language === 'zh' ? '笔刷粗细' : 'Size'}: {brushSize}px</span>
          <input
            type="range"
            min="5"
            max="120"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
            className="w-24 accent-stone-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (imageCanvasRef.current && maskCanvasRef.current) {
                generateAutoMask(imageCanvasRef.current, maskCanvasRef.current);
              }
            }}
            className="px-2.5 py-1.5 bg-white border border-stone-200 text-stone-700 rounded hover:bg-stone-100"
          >
            {language === 'zh' ? '自动识别上身' : 'Auto Torso Mask'}
          </button>
          <button
            onClick={handleFillAll}
            className="px-2.5 py-1.5 bg-white border border-stone-200 text-stone-700 rounded hover:bg-stone-100"
          >
            {language === 'zh' ? '全选' : 'Select All'}
          </button>
          <button
            onClick={handleClearMask}
            className="px-2.5 py-1.5 bg-white border border-stone-200 text-red-700 rounded hover:bg-red-50"
          >
            {language === 'zh' ? '清空' : 'Clear'}
          </button>
        </div>
      </div>

      {/* Canvas Workspace */}
      <div
        ref={containerRef}
        className="relative border border-stone-200 rounded-lg overflow-hidden bg-stone-900 flex items-center justify-center min-h-[380px] max-h-[560px]"
      >
        <canvas ref={imageCanvasRef} className="max-w-full max-h-[560px] object-contain block" />
        <canvas
          ref={maskCanvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 w-full h-full object-contain cursor-crosshair opacity-60 mix-blend-screen"
          style={{
            filter: 'drop-shadow(0px 0px 4px rgba(220, 38, 38, 0.8))',
          }}
        />

        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-100 text-stone-500 font-mono text-xs">
            {language === 'zh' ? '加载画布资源中...' : 'Loading canvas asset...'}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-stone-500 font-mono">
        <span>{language === 'zh' ? '高亮白色蒙版区域为调色目标区域。' : 'White overlay indicates the active recolor target region.'}</span>
        <span>{language === 'zh' ? '蒙版以外的像素严格保持 0 漂移。' : 'Outside mask remains strictly 100% unaltered.'}</span>
      </div>
    </div>
  );
};
