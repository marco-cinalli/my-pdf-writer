import React, { useRef, useState, useEffect } from 'react';
import { X, Eraser, Check, PenTool, Type } from 'lucide-react';

interface SignatureDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSignature: (rawDataUrl: string, name: string, format: 'DRAW' | 'STAMP') => void;
}

export const SignatureDrawModal: React.FC<SignatureDrawModalProps> = ({
  isOpen,
  onClose,
  onSaveSignature,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'draw' | 'stamp'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(3.5);
  const [stampText, setStampText] = useState(
    `Signed on ${new Date().toLocaleDateString('en-US')}`
  );
  const [signatureName, setSignatureName] = useState('Drawn Signature');

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'draw' || !canvasRef.current) return;
    setIsDrawing(true);
    const ctx = canvasRef.current.getContext('2d')!;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = '#0F172A';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || mode !== 'draw' || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleConfirm = () => {
    if (mode === 'draw' && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onSaveSignature(dataUrl, signatureName.trim() || 'Drawn Signature', 'DRAW');
      onClose();
    } else if (mode === 'stamp') {
      const offscreen = document.createElement('canvas');
      offscreen.width = 560;
      offscreen.height = 140;
      const ctx = offscreen.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, offscreen.width, offscreen.height);

      ctx.strokeStyle = '#1E3A8A';
      ctx.lineWidth = 3;
      ctx.strokeRect(16, 16, offscreen.width - 32, offscreen.height - 32);

      ctx.fillStyle = '#1E3A8A';
      ctx.font = '600 28px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        stampText.trim() || new Date().toLocaleDateString('en-US'),
        offscreen.width / 2,
        offscreen.height / 2
      );

      onSaveSignature(
        offscreen.toDataURL('image/png'),
        stampText.trim() || 'Date Stamp',
        'STAMP'
      );
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Create Freehand Signature or Date Stamp
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('draw')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                mode === 'draw'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Freehand Draw</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('stamp')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                mode === 'stamp'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Date / Text Stamp</span>
            </button>
          </div>

          {mode === 'draw' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Signature Label:
                  <input
                    type="text"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    className="ml-2 px-2.5 py-1 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:border-blue-600"
                  />
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span>Stroke width</span>
                  <input
                    type="range"
                    min={1.5}
                    max={7}
                    step={0.5}
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(Number(e.target.value))}
                    className="w-20 accent-blue-600 cursor-pointer"
                  />
                </label>
              </div>

              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={520}
                  height={200}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className="w-full h-44 cursor-crosshair block"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>White background is automatically converted to transparent.</span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Date or Stamp Text
              </label>
              <input
                type="text"
                value={stampText}
                onChange={(e) => setStampText(e.target.value)}
                placeholder="e.g. Approved — Nov 8, 2026"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600"
              />
              <div className="p-4 bg-checkerboard rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                <div className="border-2 border-blue-800 px-5 py-2 text-blue-900 font-semibold text-base">
                  {stampText || 'Date / Stamp'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-600 rounded-lg transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save to Signature Library</span>
          </button>
        </div>
      </div>
    </div>
  );
};
