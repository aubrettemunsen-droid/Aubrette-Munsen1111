import React, { useState } from 'react';
import { DesignCandidate, DesignRevision, GarmentDesignSpec } from '../types/index.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface FashionDesignerTabProps {
  onSendToTryOn: (asset: { id: string; name: string; mimeType: string; dataUrl: string; category: 'garment'; createdAt: number }) => void;
  onSendToModelShoot: (asset: { id: string; name: string; mimeType: string; dataUrl: string; category: 'garment'; createdAt: number }) => void;
  onSendToRecolor: (asset: { id: string; name: string; mimeType: string; dataUrl: string; category: 'garment'; createdAt: number }) => void;
  onOpenVideoModal: (dataUrl: string) => void;
}

const PRESET_INSPIRATIONS_ZH = [
  '帮我设计一套高级定制男士西服，深海军蓝色，意大利风格，单排两粒扣，宽平驳领，肩部自然挺括，腰部收身，搭配米白色衬衫。高级时装杂志摄影风格。',
  '设计一套极简主义黑金晚礼服长裙，重磅真丝缎面，露背挂脖剪裁，侧边高开衩，优雅流线垂坠感。',
  '设计一款当代城市机能风工装夹克，炭灰色防水防撕裂科技面料，不对称立体风琴袋，隐藏式拉链与反光抽绳。',
  '设计一套巴黎高定粗花呢短外套与半裙套装，燕麦奶油色混纺金丝，珍珠贝母纽扣，复古流苏毛边工艺。',
];

const PRESET_INSPIRATIONS_EN = [
  "Design a bespoke tailored men's suit in deep navy blue, Italian cut, 2-button single breasted, wide peak lapels, natural structured shoulders with crisp white poplin shirt.",
  'Design a minimalist black & gold evening gown, heavyweight silk satin, halter neckline, open back, high slit, fluid statuesque drape.',
  'Design a contemporary urban technical utility jacket, charcoal ripstop weather-resistant fabric, 3D accordion pockets, storm flap zipper.',
  'Design a Parisian haute couture tweed cropped jacket & skirt set, oat cream boucle blended with gold yarn, mother-of-pearl buttons, fringed raw edges.',
];

export const FashionDesignerTab: React.FC<FashionDesignerTabProps> = ({
  onSendToTryOn,
  onSendToModelShoot,
  onSendToRecolor,
  onOpenVideoModal,
}) => {
  const { language, strings } = useLanguage();

  const [promptInput, setPromptInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [renderingCandidates, setRenderingCandidates] = useState<Record<string, boolean>>({});

  const [assistantMessage, setAssistantMessage] = useState<string | null>(null);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const [suggestedRevisions, setSuggestedRevisions] = useState<string[]>([]);

  const [candidates, setCandidates] = useState<DesignCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<DesignCandidate | null>(null);
  const [selectedView, setSelectedView] = useState<'front' | 'back' | 'side' | 'detail'>('front');

  const [revisionInput, setRevisionInput] = useState('');
  const [isRevising, setIsRevising] = useState(false);
  const [revisionHistory, setRevisionHistory] = useState<DesignRevision[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const presetInspirations = language === 'zh' ? PRESET_INSPIRATIONS_ZH : PRESET_INSPIRATIONS_EN;

  // Submit initial natural language prompt to Fashion Design Brain
  const handleInitiateDesign = async (promptText?: string) => {
    const textToSend = promptText || promptInput;
    if (!textToSend.trim()) return;

    setIsAnalyzing(true);
    setErrorMsg(null);
    setCandidates([]);
    setSelectedCandidate(null);
    setConflictNotice(null);

    try {
      const res = await fetch('/api/designer/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: textToSend,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || (language === 'zh' ? '设计意图分析失败。' : 'Failed to analyze design intent.'));
      }

      const data = await res.json();
      setAssistantMessage(data.assistantResponse);
      setConflictNotice(data.conflictNotice);
      setSuggestedRevisions(data.suggestedRevisions || []);
      setCandidates(data.candidates);

      if (data.candidates.length > 0) {
        setSelectedCandidate(data.candidates[0]);
        renderAllCandidates(data.candidates);
      }
    } catch (err: any) {
      setErrorMsg(err.message || (language === 'zh' ? '设计启动异常。' : 'Design initiation failed.'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Render candidate images
  const renderAllCandidates = async (cands: DesignCandidate[]) => {
    for (const c of cands) {
      setRenderingCandidates((prev) => ({ ...prev, [c.id]: true }));
      fetch('/api/designer/render-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: c.id }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setCandidates((prev) =>
              prev.map((item) =>
                item.id === c.id
                  ? { ...item, imageUrl: data.imageUrl, assetId: data.assetId }
                  : item
              )
            );
            setSelectedCandidate((prev) =>
              prev && prev.id === c.id
                ? { ...prev, imageUrl: data.imageUrl, assetId: data.assetId }
                : prev
            );
          }
        })
        .catch(() => {})
        .finally(() => {
          setRenderingCandidates((prev) => ({ ...prev, [c.id]: false }));
        });
    }
  };

  // Handle conversational revision
  const handleExecuteRevision = async (instructionText?: string) => {
    const instruction = instructionText || revisionInput;
    if (!instruction.trim() || !selectedCandidate) return;

    setIsRevising(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/designer/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
          instruction,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || (language === 'zh' ? '修改指令执行失败。' : 'Revision failed.'));
      }

      const data = await res.json();
      const updatedCandidate: DesignCandidate = data.candidate;
      const revisionLog: DesignRevision = data.revision;

      setCandidates((prev) =>
        prev.map((c) => (c.id === updatedCandidate.id ? updatedCandidate : c))
      );
      setSelectedCandidate(updatedCandidate);
      setRevisionHistory((prev) => [revisionLog, ...prev]);
      setRevisionInput('');

      // Re-render visual image for the revised candidate
      setRenderingCandidates((prev) => ({ ...prev, [updatedCandidate.id]: true }));
      fetch('/api/designer/render-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: updatedCandidate.id }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((renderData) => {
          if (renderData) {
            setCandidates((prev) =>
              prev.map((item) =>
                item.id === updatedCandidate.id
                  ? { ...item, imageUrl: renderData.imageUrl, assetId: renderData.assetId }
                  : item
              )
            );
            setSelectedCandidate((prev) =>
              prev && prev.id === updatedCandidate.id
                ? { ...prev, imageUrl: renderData.imageUrl, assetId: renderData.assetId }
                : prev
            );
          }
        })
        .finally(() => {
          setRenderingCandidates((prev) => ({ ...prev, [updatedCandidate.id]: false }));
        });
    } catch (err: any) {
      setErrorMsg(err.message || (language === 'zh' ? '设计微调失败。' : 'Failed to apply design revision.'));
    } finally {
      setIsRevising(false);
    }
  };

  // Generate multi-views
  const handleGenerateMultiView = async (targetView: 'back' | 'side' | 'detail') => {
    if (!selectedCandidate) return;
    setErrorMsg(null);

    try {
      setSelectedView(targetView);
      const res = await fetch('/api/designer/multi-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
          view: targetView,
        }),
      });

      if (!res.ok) throw new Error(language === 'zh' ? '生成视角失败。' : 'Failed to generate view angle.');
      const data = await res.json();

      setSelectedCandidate((prev) =>
        prev
          ? {
              ...prev,
              multiViews: {
                ...(prev.multiViews || {}),
                [targetView]: data.imageUrl,
              },
            }
          : prev
      );

      setCandidates((prev) =>
        prev.map((c) =>
          c.id === selectedCandidate.id
            ? {
                ...c,
                multiViews: {
                  ...(c.multiViews || {}),
                  [targetView]: data.imageUrl,
                },
              }
            : c
        )
      );
    } catch (err: any) {
      setErrorMsg(err.message || (language === 'zh' ? '多视角渲染失败。' : 'Multi-view generation failed.'));
    }
  };

  // Export tech pack
  const handleExportSpec = () => {
    if (!selectedCandidate) return;
    const jsonStr = JSON.stringify(
      {
        atelierDesignSpecVersion: '2.0-Commercial',
        candidateId: selectedCandidate.id,
        directionTitle: selectedCandidate.directionTitle,
        directionDescription: selectedCandidate.directionDescription,
        specification: selectedCandidate.spec,
        disclaimer:
          language === 'zh'
            ? 'AI概念款式工艺书 — 在服装生产打版前须由专业板师复核放码。'
            : 'AI Concept Specification — must be reviewed and graded by a master patternmaker prior to apparel manufacturing.',
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atelier_tech_pack_${selectedCandidate.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Workflow bridge handlers
  const handleSendToTryOn = () => {
    if (!selectedCandidate || !selectedCandidate.imageUrl) return;
    onSendToTryOn({
      id: selectedCandidate.assetId || `cand_asset_${selectedCandidate.id}`,
      name: `${selectedCandidate.directionTitle} (${selectedCandidate.spec.garmentCategory})`,
      mimeType: 'image/jpeg',
      dataUrl: selectedCandidate.imageUrl,
      category: 'garment',
      createdAt: Date.now(),
    });
  };

  const handleSendToModelShoot = () => {
    if (!selectedCandidate || !selectedCandidate.imageUrl) return;
    onSendToModelShoot({
      id: selectedCandidate.assetId || `cand_asset_${selectedCandidate.id}`,
      name: `${selectedCandidate.directionTitle} (${selectedCandidate.spec.garmentCategory})`,
      mimeType: 'image/jpeg',
      dataUrl: selectedCandidate.imageUrl,
      category: 'garment',
      createdAt: Date.now(),
    });
  };

  const handleSendToRecolor = () => {
    if (!selectedCandidate || !selectedCandidate.imageUrl) return;
    onSendToRecolor({
      id: selectedCandidate.assetId || `cand_asset_${selectedCandidate.id}`,
      name: `${selectedCandidate.directionTitle} (${selectedCandidate.spec.garmentCategory})`,
      mimeType: 'image/jpeg',
      dataUrl: selectedCandidate.imageUrl,
      category: 'garment',
      createdAt: Date.now(),
    });
  };

  const getViewLabel = (view: string) => {
    if (language === 'zh') {
      switch (view) {
        case 'front': return '正面视角';
        case 'back': return '背面视角';
        case 'side': return '侧面轮廓';
        case 'detail': return '领口细节';
        default: return view;
      }
    }
    return `${view.charAt(0).toUpperCase() + view.slice(1)} View`;
  };

  return (
    <div className="space-y-10">
      {/* Editorial Header */}
      <div className="border-b border-stone-200 pb-6">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
          {strings.designer.title}
        </h1>
        <p className="mt-2 text-stone-600 text-sm max-w-3xl leading-relaxed">
          {strings.designer.subtitle}
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-xs font-mono underline hover:text-red-900"
          >
            {strings.common.close}
          </button>
        </div>
      )}

      {/* Natural Language Design Prompt & Presets */}
      <div className="p-6 bg-white border border-stone-200 rounded-xl space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-stone-500 uppercase tracking-wider">
            {strings.designer.promptLabel}
          </label>
          <span className="text-xs font-mono text-stone-400">
            Powered by Fashion Design Brain (Gemini 3.8 / 4)
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <textarea
            rows={3}
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder={strings.designer.promptPlaceholder}
            className="flex-1 p-3 text-sm bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
          />
          <button
            disabled={isAnalyzing || !promptInput.trim()}
            onClick={() => handleInitiateDesign()}
            className="sm:w-48 py-3 px-4 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex flex-col items-center justify-center gap-1 shrink-0"
          >
            {isAnalyzing ? (
              <>
                <span className="animate-spin text-sm">⏳</span>
                <span className="text-xs font-mono">
                  {language === 'zh' ? '正在推导4套方案...' : 'Formulating 4 Plans...'}
                </span>
              </>
            ) : (
              <>
                <span>{language === 'zh' ? '生成 4 套设计方案' : 'Generate 4 Designs'}</span>
                <span className="text-[10px] text-stone-300 font-mono">
                  {language === 'zh' ? '不同版型与工艺结构' : 'Distinct silhouettes'}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Suggested Inspiration Presets */}
        <div className="space-y-1.5 pt-2">
          <span className="text-xs font-mono text-stone-500">{strings.designer.suggestionsLabel}:</span>
          <div className="flex flex-wrap gap-2">
            {presetInspirations.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPromptInput(preset);
                  handleInitiateDesign(preset);
                }}
                className="text-xs px-3 py-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-md text-stone-700 text-left transition-colors truncate max-w-md font-mono"
              >
                {preset.slice(0, 36)}...
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Designer Assistant Response & Conflict Notice */}
      {assistantMessage && (
        <div className="p-5 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-stone-500 uppercase tracking-wider">
            <span>{language === 'zh' ? '设计总监解读与构思' : "Creative Director's Vision"}</span>
          </div>
          <p className="text-sm text-stone-800 leading-relaxed italic">
            "{assistantMessage}"
          </p>

          {conflictNotice && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-0.5">
              <span className="font-semibold block">{language === 'zh' ? '工艺与版型冲突澄清：' : 'Design Conflict Clarification:'}</span>
              <span>{conflictNotice}</span>
            </div>
          )}

          {suggestedRevisions.length > 0 && (
            <div className="pt-2 border-t border-stone-200 flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-stone-500">{language === 'zh' ? '推荐迭代方向：' : 'Suggested Revisions:'}</span>
              {suggestedRevisions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleExecuteRevision(sug)}
                  className="text-xs px-2.5 py-1 bg-white hover:bg-stone-200 border border-stone-200 rounded text-stone-700 transition-colors font-mono"
                >
                  "{sug}"
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4 Distinct Candidates Grid */}
      {candidates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div>
              <h2 className="font-serif text-xl font-semibold text-stone-900">
                {language === 'zh' ? '4 套实质差异化时装方案' : '4 Substantial Design Directions'}
              </h2>
              <p className="text-xs font-mono text-stone-500">
                {language === 'zh' ? '具备独立廓形、门襟扣位、面料肌理与领型。点击卡片进入深度推演。' : 'Distinct silhouette, lapels, closures, and fabric structures. Click any card to inspect or revise.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {candidates.map((cand, idx) => {
              const isSelected = selectedCandidate?.id === cand.id;
              const isRendering = renderingCandidates[cand.id];

              return (
                <div
                  key={cand.id}
                  onClick={() => setSelectedCandidate(cand)}
                  className={`p-4 bg-white border rounded-xl space-y-3 cursor-pointer transition-all shadow-sm ${
                    isSelected
                      ? 'border-stone-900 ring-2 ring-stone-900'
                      : 'border-stone-200 hover:border-stone-400'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-900 font-mono">
                      #{idx + 1} {cand.directionTitle.split(':')[1] || cand.directionTitle}
                    </span>
                    <span className="text-[10px] font-mono text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                      v{cand.version}
                    </span>
                  </div>

                  {/* Image Frame */}
                  <div className="relative aspect-[3/4] bg-stone-100 rounded-lg overflow-hidden border border-stone-200 flex items-center justify-center">
                    {cand.imageUrl ? (
                      <img
                        src={cand.imageUrl}
                        alt={cand.directionTitle}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                        {isRendering ? (
                          <>
                            <span className="animate-spin text-lg">⏳</span>
                            <span className="text-[11px] font-mono text-stone-500">
                              {language === 'zh' ? '渲染设计样衣中...' : 'Rendering Concept...'}
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] font-mono text-stone-400">
                            {language === 'zh' ? '排队渲染' : 'Queued for Synthesis'}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="absolute top-2 left-2 bg-stone-900/75 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono">
                      {cand.spec.designStyle}
                    </div>
                  </div>

                  {/* Summary Spec Tags */}
                  <div className="space-y-1 text-xs text-stone-600">
                    <div className="text-[11px] font-medium text-stone-800 line-clamp-1">
                      {cand.spec.silhouette}
                    </div>
                    <div className="text-[10px] text-stone-500 line-clamp-2">
                      {cand.directionDescription}
                    </div>
                    <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between text-[10px] font-mono text-stone-500">
                      <span>{cand.spec.collarType || cand.spec.garmentCategory}</span>
                      <span>{cand.spec.closureType || 'Bespoke'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Candidate Detailed Inspection & Revision Studio */}
      {selectedCandidate && (
        <div className="p-8 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-5">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-serif text-2xl font-semibold text-stone-900">
                  {selectedCandidate.directionTitle}
                </h3>
                <span className="px-2 py-0.5 bg-stone-100 border border-stone-200 text-stone-700 text-xs font-mono rounded">
                  {language === 'zh' ? `版本 v${selectedCandidate.version}` : `Version ${selectedCandidate.version}`}
                </span>
              </div>
              <p className="text-xs font-mono text-stone-500 mt-1">
                {language === 'zh'
                  ? `品类: ${selectedCandidate.spec.garmentCategory} · 风格: ${selectedCandidate.spec.designStyle} · 客群: ${selectedCandidate.spec.targetAudience}`
                  : `Category: ${selectedCandidate.spec.garmentCategory} · Style: ${selectedCandidate.spec.designStyle} · Target: ${selectedCandidate.spec.targetAudience}`}
              </p>
            </div>

            {/* Workflow Action Bridge */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSendToTryOn}
                className="px-3.5 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-colors whitespace-nowrap"
              >
                {strings.common.sendToTryOn}
              </button>
              <button
                onClick={handleSendToModelShoot}
                className="px-3.5 py-1.5 bg-stone-100 text-stone-800 border border-stone-200 rounded-lg text-xs font-medium hover:bg-stone-200 transition-colors whitespace-nowrap"
              >
                {strings.common.sendToModelShoot}
              </button>
              <button
                onClick={handleSendToRecolor}
                className="px-3.5 py-1.5 bg-stone-100 text-stone-800 border border-stone-200 rounded-lg text-xs font-medium hover:bg-stone-200 transition-colors whitespace-nowrap"
              >
                {strings.common.sendToRecolor}
              </button>
              <button
                onClick={() => selectedCandidate.imageUrl && onOpenVideoModal(selectedCandidate.imageUrl)}
                className="px-3.5 py-1.5 bg-stone-100 text-stone-800 border border-stone-200 rounded-lg text-xs font-medium hover:bg-stone-200 transition-colors whitespace-nowrap"
              >
                {strings.common.createRunwayVideo}
              </button>
              <button
                onClick={handleExportSpec}
                className="px-3.5 py-1.5 bg-stone-100 text-stone-800 border border-stone-200 rounded-lg text-xs font-medium hover:bg-stone-200 transition-colors whitespace-nowrap"
              >
                {language === 'zh' ? '导出工艺技术书' : 'Export Tech Pack'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Visual & Multi-View Explorer */}
            <div className="lg:col-span-6 space-y-4">
              <div className="relative aspect-[3/4] bg-stone-100 rounded-xl overflow-hidden border border-stone-200 shadow-sm">
                {selectedCandidate.multiViews?.[selectedView] || selectedCandidate.imageUrl ? (
                  <img
                    src={selectedCandidate.multiViews?.[selectedView] || selectedCandidate.imageUrl}
                    alt={`${selectedCandidate.directionTitle} (${selectedView})`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-stone-400 font-mono">
                    {language === 'zh' ? '排队生成视角图像...' : 'Image in synthesis queue...'}
                  </div>
                )}

                <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-sm text-white px-2.5 py-1 rounded text-xs font-mono uppercase">
                  {getViewLabel(selectedView)}
                </div>
              </div>

              {/* Multi-View Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {(['front', 'back', 'side', 'detail'] as const).map((view) => {
                  const hasView = selectedCandidate.multiViews?.[view] || (view === 'front' && selectedCandidate.imageUrl);

                  return (
                    <button
                      key={view}
                      onClick={() => {
                        if (hasView) {
                          setSelectedView(view);
                        } else {
                          handleGenerateMultiView(view as any);
                        }
                      }}
                      className={`py-2 px-2 text-xs font-mono rounded-lg border text-center transition-colors ${
                        selectedView === view
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <div className="font-medium">{getViewLabel(view)}</div>
                      <div className="text-[10px] text-stone-400">
                        {hasView ? (language === 'zh' ? '已就绪' : 'Ready') : (language === 'zh' ? '+ 生成' : '+ Render')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Conversational Revision & Full Technical Spec */}
            <div className="lg:col-span-6 space-y-6">
              {/* Conversational Revision Box */}
              <div className="p-5 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-900 font-mono">
                    {language === 'zh' ? '对话式精细微调' : 'Conversational Iteration'}
                  </span>
                  <span className="text-[11px] text-stone-500 font-mono">
                    {language === 'zh' ? '锁死已确认的剪裁特征' : 'Preserves invariant tailoring details'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={revisionInput}
                    onChange={(e) => setRevisionInput(e.target.value)}
                    placeholder={strings.designer.refinePlaceholder}
                    className="flex-1 py-2 px-3 text-xs font-mono bg-white border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                  <button
                    disabled={isRevising || !revisionInput.trim()}
                    onClick={() => handleExecuteRevision()}
                    className="py-2 px-4 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    {isRevising ? strings.common.loading : strings.designer.buttonRefine}
                  </button>
                </div>

                {/* Quick Revision Prompts */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(language === 'zh'
                    ? ['把扣子改成双排六粒扣', '领型换成优雅平驳领', '颜色调浅为米白亚麻色', '加宽肩部，做成复古廓形']
                    : ['Change buttons to double-breasted 6-button', 'Switch collar to Cuban collar', 'Shift color to light oatmeal', 'Widen shoulders for oversized vintage drop']
                  ).map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleExecuteRevision(chip)}
                      className="text-[11px] px-2 py-0.5 bg-white border border-stone-200 rounded text-stone-600 hover:bg-stone-100 font-mono"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Technical Design Spec Accordion */}
              <div className="p-5 bg-stone-50 border border-stone-200 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <span className="font-semibold text-stone-900 font-mono uppercase">
                    {language === 'zh' ? '服装款式技术规格书 (Spec Sheet)' : 'Garment Design Specification'}
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {language === 'zh' ? '一致性引擎已校准' : 'Audited by Consistency Engine'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-stone-700 font-mono text-[11px]">
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase">{strings.designer.silhouette}:</span>
                    <span className="font-medium text-stone-900">{selectedCandidate.spec.silhouette}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase">{strings.designer.primaryFabric}:</span>
                    <span className="font-medium text-stone-900">{selectedCandidate.spec.fabricAppearance}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase">{strings.designer.colorFamily}:</span>
                    <span className="font-medium text-stone-900">{selectedCandidate.spec.primaryColor}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase">{language === 'zh' ? '领型 / 驳头:' : 'Collar / Lapel:'}</span>
                    <span className="font-medium text-stone-900">{selectedCandidate.spec.collarType || 'Classic Lapel'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase">{language === 'zh' ? '门襟方式:' : 'Closure Type:'}</span>
                    <span className="font-medium text-stone-900">{selectedCandidate.spec.closureType || 'Horn Buttons'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase">{language === 'zh' ? '口袋结构:' : 'Pocket Construction:'}</span>
                    <span className="font-medium text-stone-900">{selectedCandidate.spec.pocketStyle || 'Flap Pockets'}</span>
                  </div>
                </div>

                {selectedCandidate.spec.decorativeDetails && selectedCandidate.spec.decorativeDetails.length > 0 && (
                  <div className="pt-2 border-t border-stone-200">
                    <span className="text-stone-400 block text-[10px] uppercase font-mono">
                      {strings.designer.designHighlights}:
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedCandidate.spec.decorativeDetails.map((det, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-white border border-stone-200 rounded text-stone-800 text-[10px] font-mono"
                        >
                          {det}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hard Constraints vs Preferences */}
                <div className="pt-2 border-t border-stone-200 space-y-1">
                  <div className="text-[10px] text-stone-400 uppercase font-mono">
                    {language === 'zh' ? '锁定不可变特征 (Hard Constraints):' : 'Hard Constraints:'}
                  </div>
                  <div className="text-[11px] text-stone-700">
                    {selectedCandidate.spec.hardConstraints?.join(' · ') || (language === 'zh' ? '品类、整体廓形结构与主推色调' : 'Category, silhouette structure, and primary color shade.')}
                  </div>
                </div>
              </div>

              {/* Revision History Rollback */}
              {revisionHistory.length > 0 && (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2 text-xs">
                  <span className="font-mono text-stone-500 uppercase text-[10px] block">
                    {language === 'zh' ? '迭代历史记录' : 'Revision History'}:
                  </span>
                  <div className="space-y-2">
                    {revisionHistory.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-2 bg-white border border-stone-200 rounded flex items-center justify-between text-[11px]"
                      >
                        <div>
                          <span className="font-mono font-semibold text-stone-900">v{rev.version}</span>
                          <span className="text-stone-500 mx-2">—</span>
                          <span className="text-stone-700">"{rev.instruction}"</span>
                        </div>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {rev.modifiedFields.join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
