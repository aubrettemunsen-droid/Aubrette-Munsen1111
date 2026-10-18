import React, { useState } from 'react';
import { GarmentAnalysisResult } from '../types/index.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface GarmentIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImageDataUrl?: string;
}

export const GarmentIntelligenceModal: React.FC<GarmentIntelligenceModalProps> = ({
  isOpen,
  onClose,
  initialImageDataUrl,
}) => {
  const { language, strings } = useLanguage();

  const [selectedImage, setSelectedImage] = useState<string | null>(initialImageDataUrl || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<GarmentAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setAnalysis(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/analyze-garment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageOrVideoDataUrl: selectedImage }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || (language === 'zh' ? '面料智能分析失败。' : 'Garment analysis failed.'));
      }

      const data = await res.json();
      setAnalysis(data);
    } catch (err: any) {
      setErrorMsg(err.message || (language === 'zh' ? '分析处理遇到错误。' : 'Analysis encountered an error.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-stone-900">
              {strings.intelligence.modalTitle}
            </h2>
            <div className="flex items-center gap-2 text-xs font-mono text-stone-500 mt-0.5">
              <span>{language === 'zh' ? '分析引擎：Gemini 4 Argon' : 'Engine: Gemini 4 Argon'}</span>
              <span aria-hidden="true">·</span>
              <span>{language === 'zh' ? '深度推演：高保真' : 'Thinking: High'}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 text-lg font-mono p-1"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
          {/* Left Column: Image Preview & Actions */}
          <div className="sm:col-span-5 space-y-4">
            <div className="relative aspect-[3/4] bg-stone-100 rounded-lg overflow-hidden border border-stone-200 flex items-center justify-center">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt="Apparel Target"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-4 text-xs text-stone-400 font-mono">
                  {language === 'zh' ? '上传服装图片或视频帧' : 'Upload an apparel photo or video frame'}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label className="flex-1 py-2 px-3 text-center text-xs font-mono bg-stone-50 border border-stone-200 rounded-lg text-stone-700 hover:bg-stone-100 cursor-pointer">
                {language === 'zh' ? '更换图片' : 'Change Image'}
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleUpload}
                  className="hidden"
                />
              </label>

              <button
                disabled={!selectedImage || isLoading}
                onClick={handleAnalyze}
                className="flex-1 py-2 px-3 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 disabled:bg-stone-300 transition-colors"
              >
                {isLoading ? (language === 'zh' ? '深度推理中...' : 'Thinking...') : (language === 'zh' ? '启动深度分析' : 'Run Deep Audit')}
              </button>
            </div>
          </div>

          {/* Right Column: Technical Garment Audit Results */}
          <div className="sm:col-span-7 space-y-4">
            {analysis ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
                  <div className="font-semibold text-stone-900 text-sm">
                    {analysis.garmentType}
                  </div>
                  <div className="text-stone-600">
                    <span className="font-mono text-stone-400 uppercase">{language === 'zh' ? '材质纤维: ' : 'Textile: '}</span>
                    {analysis.fabricCategory} ({analysis.estimatedGSM})
                  </div>
                  <div className="text-stone-600">
                    <span className="font-mono text-stone-400 uppercase">{language === 'zh' ? '织法结构: ' : 'Weave: '}</span>
                    {analysis.weaveStructure}
                  </div>
                  <div className="text-stone-600">
                    <span className="font-mono text-stone-400 uppercase">{language === 'zh' ? '版型剪裁: ' : 'Silhouette: '}</span>
                    {analysis.silhouetteAndFit}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="font-mono text-stone-400 uppercase">{language === 'zh' ? '核心工艺亮点：' : 'Key Tailoring Features:'}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.keyDesignFeatures.map((feat, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-stone-100 border border-stone-200 rounded text-stone-800"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-stone-400 uppercase">
                    <span>{strings.intelligence.drapeScore}:</span>
                    <span className="text-stone-900 font-semibold">{analysis.drapeScore} / 10</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-stone-900"
                      style={{ width: `${analysis.drapeScore * 10}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
                  <span className="font-mono text-stone-400 uppercase">{strings.intelligence.commercialCopyTitle}:</span>
                  <p className="text-stone-700 italic leading-relaxed">
                    "{analysis.commercialCopy}"
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center border border-dashed border-stone-200 rounded-lg p-6 text-center text-xs text-stone-400 font-mono space-y-2">
                <span>{isLoading ? strings.intelligence.analyzing : (language === 'zh' ? '点击“启动深度分析”，推导面料织造结构、克重及电商文案。' : 'Click "Run Deep Audit" to extract textile specs, weave metrics, and commercial copy.')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
