import { useState, useRef, useEffect, useCallback } from 'react';

type Tool = 'pen' | 'circle' | 'arrow' | 'text';

interface Point {
  x: number;
  y: number;
}

interface Annotation {
  type: Tool;
  color: string;
  lineWidth: number;
  points: Point[];
  text?: string;
  radius?: number;
}

interface PhotoAnnotatorProps {
  imageUrl: string;
  onSave: (annotatedDataUrl: string) => void;
  onClose: () => void;
}

const COLORS: { color: string; label: string; shortLabel: string }[] = [
  { color: '#ef4444', label: 'Deficiency / Fail', shortLabel: 'Fail' },
  { color: '#f97316', label: 'Needs Attention', shortLabel: 'Attn' },
  { color: '#f59e0b', label: 'Watch / Monitor', shortLabel: 'Watch' },
  { color: '#22c55e', label: 'Pass / OK', shortLabel: 'Pass' },
  { color: '#06b6d4', label: 'Info / Note', shortLabel: 'Info' },
  { color: '#8b5cf6', label: 'Verified / Reviewed', shortLabel: 'Vrfy' },
  { color: '#ffffff', label: 'White Mark', shortLabel: 'Wht' },
  { color: '#000000', label: 'Black Mark', shortLabel: 'Blk' },
];

const TOOLS: { key: Tool; icon: string; label: string }[] = [
  { key: 'pen', icon: 'ri-pen-nib-line', label: 'Pen' },
  { key: 'circle', icon: 'ri-circle-line', label: 'Circle' },
  { key: 'arrow', icon: 'ri-arrow-right-line', label: 'Arrow' },
  { key: 'text', icon: 'ri-font-size', label: 'Text' },
];

export default function PhotoAnnotator({ imageUrl, onSave, onClose }: PhotoAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(3);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = useState('');
  const [hiddenColors, setHiddenColors] = useState<Set<string>>(new Set());
  const hiddenColorsRef = useRef<Set<string>>(new Set());

  // Keep ref in sync so redrawAll can read latest hiddenColors without stale closures
  useEffect(() => {
    hiddenColorsRef.current = hiddenColors;
  }, [hiddenColors]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      imageRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const container = canvas.parentElement;
      if (!container) return;
      const maxW = container.clientWidth - 32;
      const scale = Math.min(maxW / img.width, 600 / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      setCanvasReady(true);
      redrawAll(img, canvas, []);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  const redrawAll = useCallback((img: HTMLImageElement | null, canvas: HTMLCanvasElement | null, anns: Annotation[]) => {
    if (!img || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const visibleAnns = anns.filter((ann) => !hiddenColorsRef.current.has(ann.color));
    visibleAnns.forEach((ann) => drawAnnotation(ctx, ann));
  }, []);

  const drawAnnotation = (ctx: CanvasRenderingContext2D, ann: Annotation) => {
    ctx.save();
    ctx.strokeStyle = ann.color;
    ctx.fillStyle = ann.color;
    ctx.lineWidth = ann.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (ann.type) {
      case 'pen':
        if (ann.points.length < 2) break;
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        for (let i = 1; i < ann.points.length; i++) {
          ctx.lineTo(ann.points[i].x, ann.points[i].y);
        }
        ctx.stroke();
        break;
      case 'circle':
        if (ann.points.length < 2) break;
        const cx = ann.points[0].x;
        const cy = ann.points[0].y;
        const r = ann.radius || Math.sqrt((ann.points[1].x - cx) ** 2 + (ann.points[1].y - cy) ** 2);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'arrow':
        if (ann.points.length < 2) break;
        const from = ann.points[0];
        const to = ann.points[1];
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const headLen = ann.lineWidth * 4;
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 6), to.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 6), to.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        break;
      case 'text':
        if (!ann.text || ann.points.length < 1) break;
        ctx.font = `${ann.lineWidth * 5}px sans-serif`;
        ctx.fillText(ann.text, ann.points[0].x, ann.points[0].y);
        break;
    }
    ctx.restore();
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handleDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === 'text') {
      const pos = getPos(e);
      setTextInput(pos);
      setTextValue('');
      return;
    }
    setIsDrawing(true);
    const pos = getPos(e);
    setCurrentAnnotation({ type: tool, color, lineWidth, points: [pos], radius: 0 });
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentAnnotation) return;
    e.preventDefault();
    const pos = getPos(e);
    const updated = { ...currentAnnotation, points: [...currentAnnotation.points, pos] };
    if (tool === 'circle') {
      const cx = currentAnnotation.points[0].x;
      const cy = currentAnnotation.points[0].y;
      updated.radius = Math.sqrt((pos.x - cx) ** 2 + (pos.y - cy) ** 2);
    }
    setCurrentAnnotation(updated);
    const canvas = canvasRef.current;
    if (!canvas) return;
    redrawAll(imageRef.current, canvas, [...annotations, updated]);
  };

  const handleUp = () => {
    if (!isDrawing || !currentAnnotation) return;
    setIsDrawing(false);
    const finalAnnotation = { ...currentAnnotation };
    if (tool === 'pen' && finalAnnotation.points.length < 2) return;
    if (tool === 'arrow' && finalAnnotation.points.length < 2) return;
    setAnnotations((prev) => [...prev, finalAnnotation]);
    setCurrentAnnotation(null);
  };

  const handleTextConfirm = () => {
    if (!textInput || !textValue.trim()) {
      setTextInput(null);
      return;
    }
    const ann: Annotation = {
      type: 'text',
      color,
      lineWidth,
      points: [textInput],
      text: textValue.trim(),
    };
    setAnnotations((prev) => [...prev, ann]);
    const canvas = canvasRef.current;
    redrawAll(imageRef.current, canvas, [...annotations, ann]);
    setTextInput(null);
    setTextValue('');
  };

  const handleUndo = () => {
    setAnnotations((prev) => {
      const next = prev.slice(0, -1);
      const canvas = canvasRef.current;
      redrawAll(imageRef.current, canvas, next);
      return next;
    });
  };

  const handleClearAll = () => {
    setAnnotations([]);
    setHiddenColors(new Set());
    const canvas = canvasRef.current;
    redrawAll(imageRef.current, canvas, []);
  };

  const toggleColorVisibility = (c: string) => {
    setHiddenColors((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const handleShowAllColors = () => {
    setHiddenColors(new Set());
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0">
              <i className="ri-edit-circle-line text-sm"></i>
            </span>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Annotate Photo</h3>
              <p className="text-xs text-gray-400">Mark issues with drawing tools</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-md cursor-pointer">
            <i className="ri-close-line"></i>
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2.5 border-b border-gray-50 space-y-2.5">
          {/* Tool buttons row */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Tool</span>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {TOOLS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTool(t.key)}
                  title={t.label}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    tool === t.key
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/60'
                  }`}
                >
                  <i className={`${t.icon} text-sm`}></i>
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>

            {/* Line width */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Size</span>
              <input
                type="range"
                min="1"
                max="8"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-14 h-1.5 accent-gray-800 cursor-pointer"
              />
              <span className="text-xs text-gray-500 w-3 font-medium">{lineWidth}</span>
            </div>
          </div>

          {/* Color row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Color</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c.color}
                  onClick={() => setColor(c.color)}
                  title={c.label}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all cursor-pointer whitespace-nowrap ${
                    color === c.color
                      ? 'border-gray-800 bg-gray-100 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-black/10"
                    style={{ backgroundColor: c.color }}
                  ></span>
                  <span className="text-[11px] font-medium text-gray-700">{c.shortLabel}</span>
                </button>
              ))}
            </div>

            <div className="flex-1"></div>

            {/* Undo / Clear */}
            <div className="flex items-center gap-1">
              <button onClick={handleUndo} disabled={annotations.length === 0} title="Undo last mark" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap">
                <i className="ri-arrow-go-back-line text-sm"></i>
              </button>
              <button onClick={handleClearAll} disabled={annotations.length === 0} title="Clear all marks" className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap">
                <i className="ri-delete-bin-6-line text-sm"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Color filter row */}
        {annotations.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-50 bg-gray-50/40">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium flex-shrink-0">Filter</span>
              <button
                onClick={handleShowAllColors}
                className={`text-[10px] px-2.5 py-1 rounded-full border transition-all cursor-pointer whitespace-nowrap font-medium ${
                  hiddenColors.size === 0
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                All
              </button>
              {COLORS.map((c) => {
                const count = annotations.filter((a) => a.color === c.color).length;
                if (count === 0) return null;
                const isHidden = hiddenColors.has(c.color);
                return (
                  <button
                    key={c.color}
                    onClick={() => toggleColorVisibility(c.color)}
                    title={isHidden ? `Show ${c.label} marks (${count})` : `Hide ${c.label} marks (${count})`}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all cursor-pointer whitespace-nowrap border ${
                      isHidden
                        ? 'bg-white border-gray-200 text-gray-300'
                        : 'bg-white border-gray-300 text-gray-600'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-black/10"
                      style={{ backgroundColor: c.color, opacity: isHidden ? 0.25 : 1 }}
                    ></span>
                    <span className={isHidden ? 'line-through' : ''}>{c.shortLabel}</span>
                    <span className={isHidden ? 'text-gray-300' : 'text-gray-400'}>({count})</span>
                  </button>
                );
              })}
              {hiddenColors.size > 0 && (
                <span className="text-[10px] text-gray-400">
                  {annotations.filter((a) => !hiddenColors.has(a.color)).length} of {annotations.length} marks visible
                </span>
              )}
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="p-4 bg-gray-100/50">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center min-h-[200px]">
            {!canvasReady && (
              <div className="flex items-center gap-2 py-12 text-gray-400 text-sm">
                <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></span>
                Loading image...
              </div>
            )}
            {textInput && (
              <div
                className="absolute z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex items-center gap-2"
                style={{ left: textInput.x, top: textInput.y }}
              >
                <input
                  type="text"
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  placeholder="Type label..."
                  className="px-2 py-1.5 border border-gray-200 rounded text-sm w-28 focus:outline-none focus:border-gray-400"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTextConfirm(); if (e.key === 'Escape') setTextInput(null); }}
                  autoFocus
                />
                <button onClick={handleTextConfirm} className="w-7 h-7 flex items-center justify-center rounded bg-gray-800 text-white hover:bg-gray-700 text-xs cursor-pointer">
                  <i className="ri-check-line"></i>
                </button>
              </div>
            )}
            <canvas
              ref={canvasRef}
              className={`cursor-crosshair ${canvasReady ? '' : 'hidden'}`}
              onMouseDown={handleDown}
              onMouseMove={handleMove}
              onMouseUp={handleUp}
              onMouseLeave={handleUp}
              onTouchStart={handleDown}
              onTouchMove={handleMove}
              onTouchEnd={handleUp}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            {tool === 'text' ? 'Click to place text label' : tool === 'circle' ? 'Drag to draw a circle' : tool === 'arrow' ? 'Drag to draw an arrow' : 'Draw freehand on the image'}
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2">
          <button onClick={handleClearAll} className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <i className="ri-delete-bin-6-line mr-1"></i>Clear All
          </button>
          <div className="flex-1"></div>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSave} className="px-5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold transition-colors cursor-pointer">
            <i className="ri-save-line mr-1.5"></i>Save Annotated
          </button>
        </div>
      </div>
    </div>
  );
}