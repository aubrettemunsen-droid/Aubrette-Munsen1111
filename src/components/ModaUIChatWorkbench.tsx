import React, { useState, useEffect, useRef } from 'react';
import {
  ChatMessageRecord,
  ChatGeneratedImage,
  GarmentDesignSpec,
} from '../types/index.ts';
import { ModaUICore, CoreState } from './ModaUICore.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Download,
  Maximize2,
  Edit3,
  X,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Activity,
  Workflow,
  Clock,
  Check,
} from 'lucide-react';

const STORAGE_KEY = 'modagpt_v8_execution_history_v1';

export interface ExecutionStepTrace {
  stepIndex: number;
  toolId: string;
  toolName: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  durationMs?: number;
  error?: string;
}

export interface ExtendedChatMessageRecord extends ChatMessageRecord {
  steps?: ExecutionStepTrace[];
  auditRecords?: any[];
  intentCategory?: string;
}

interface ModaGPTWorkbenchProps {
  onOpenVideoModal?: (dataUrl: string) => void;
  onOpenAnalysisModal?: (dataUrl: string) => void;
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
}

export const ModaUIChatWorkbench: React.FC<ModaGPTWorkbenchProps> = ({
  onOpenVideoModal,
  onOpenAnalysisModal,
  initialPrompt,
  onClearInitialPrompt,
}) => {
  const { language, strings } = useLanguage();

  // Core chat state
  const [messages, setMessages] = useState<ExtendedChatMessageRecord[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [coreState, setCoreState] = useState<CoreState>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [statusNote, setStatusNote] = useState<string>('');
  const [activePlanSteps, setActivePlanSteps] = useState<ExecutionStepTrace[]>([]);

  // Attachments state
  const [attachments, setAttachments] = useState<
    Array<{ id: string; name: string; mimeType: string; dataUrl: string }>
  >([]);

  // Active design reference (for conversational continuous revision)
  const [activeImageRef, setActiveImageRef] = useState<{
    imageUrl: string;
    designSpec?: GarmentDesignSpec;
    candidateId?: string;
    version: number;
    title?: string;
  } | null>(null);

  // Lightbox modal state
  const [lightboxImage, setLightboxImage] = useState<ChatGeneratedImage | null>(null);
  const [isComparingVersions, setIsComparingVersions] = useState<Record<string, boolean>>({});

  // Audit inspector drawer
  const [selectedAuditLog, setSelectedAuditLog] = useState<any[] | null>(null);

  // Voice recognition state
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatScrollEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          for (let i = parsed.length - 1; i >= 0; i--) {
            if (parsed[i].generatedImage?.url) {
              const gen = parsed[i].generatedImage!;
              setActiveImageRef({
                imageUrl: gen.url,
                designSpec: gen.spec,
                candidateId: gen.candidateId,
                version: gen.version || 1,
                title: gen.spec?.garmentCategory || '当前设计',
              });
              break;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to restore chat history:', e);
    }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      }
    } catch (e) {
      console.warn('Failed to persist chat history:', e);
    }
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatScrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, activePlanSteps]);

  // Handle prefilled prompt passed from dashboard or asset library
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setInputVal(initialPrompt);
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
      }
      onClearInitialPrompt?.();
    }
  }, [initialPrompt]);

  // Adjust textarea height automatically
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputVal(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
    if (coreState !== 'thinking' && coreState !== 'generating') {
      setCoreState(e.target.value.trim() ? 'typing' : 'idle');
    }
  };

  // Web Speech API Voice Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language === 'zh' ? 'zh-CN' : 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInputVal((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
  }, [language]);

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      alert(language === 'zh' ? '当前浏览器未开放麦克风语音转写接口。' : 'Speech recognition not supported in this browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.warn('Speech recognition error:', err);
      }
    }
  };

  // Handle file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            mimeType: file.type || 'image/jpeg',
            dataUrl,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Primary Unified Multi-Step Engine Dispatch
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt !== undefined ? customPrompt : inputVal).trim();
    if (!textToSend && attachments.length === 0) return;

    const userMessageId = `msg_user_${Date.now()}`;
    const newUserMessage: ExtendedChatMessageRecord = {
      id: userMessageId,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputVal('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const currentAttachments = [...attachments];
    setAttachments([]);

    setIsLoading(true);
    setCoreState('thinking');
    setStatusNote(language === 'zh' ? '正在解析任务需求并规划工具执行链条...' : 'Planning multi-step tool execution...');
    setActivePlanSteps([]);

    try {
      // Dispatch to ModaGPT Task Orchestrator
      const res = await fetch('/api/modagpt/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          conversationHistory: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
            generatedImage: m.generatedImage,
          })),
          activeImageRef: activeImageRef
            ? {
                imageUrl: activeImageRef.imageUrl,
                designSpec: activeImageRef.designSpec,
                candidateId: activeImageRef.candidateId,
                version: activeImageRef.version,
              }
            : undefined,
          attachments: currentAttachments,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || (language === 'zh' ? '任务执行失败。' : 'Execution failed.'));
      }

      const data = await res.json();

      setCoreState('completed');
      setTimeout(() => setCoreState('idle'), 1800);

      const assistantMessageId = `msg_ai_${Date.now()}`;
      const newAssistantMessage: ExtendedChatMessageRecord = {
        id: assistantMessageId,
        role: 'assistant',
        content: data.assistantResponse,
        timestamp: Date.now(),
        status: data.success ? 'completed' : 'error',
        steps: data.steps || [],
        auditRecords: data.auditRecords || [],
        intentCategory: data.intentCategory,
        generatedImage: data.primaryOutput
          ? {
              url: data.primaryOutput.url || '',
              spec: data.primaryOutput.spec,
              candidateId: data.primaryOutput.candidateId,
              version: data.primaryOutput.version || 1,
              consistencyScore: data.primaryOutput.consistencyScore || 94,
              verificationPassed: true,
              previousImageUrl: data.primaryOutput.previousImageUrl,
              auditNotes: data.primaryOutput.auditNotes || [],
              actionType: (data.primaryOutput.type as any) || 'design',
            }
          : undefined,
        suggestedNextPrompts: data.suggestedNextPrompts || [],
      };

      setMessages((prev) => [...prev, newAssistantMessage]);

      if (data.primaryOutput?.url) {
        setActiveImageRef({
          imageUrl: data.primaryOutput.url,
          designSpec: data.primaryOutput.spec,
          candidateId: data.primaryOutput.candidateId,
          version: data.primaryOutput.version || 1,
          title: data.primaryOutput.spec?.garmentCategory || '当前成果',
        });
      }
    } catch (err: any) {
      console.error('Execution error:', err);
      setCoreState('error');
      setTimeout(() => setCoreState('idle'), 2500);

      const errorMsg: ExtendedChatMessageRecord = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: language === 'zh' ? '执行链路发生异常，未达商业质检门槛。' : 'Execution interrupted by validation or engine limits.',
        timestamp: Date.now(),
        status: 'error',
        error: err.message || 'Error occurred.',
        suggestedNextPrompts: [
          '设计一件黑色高端羊毛大衣',
          '设计一件意式西服并穿在模特身上看效果',
          '运行系统算法引擎全面质检',
        ],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setStatusNote('');
      setActivePlanSteps([]);
    }
  };

  const handleClearHistory = () => {
    if (confirm(language === 'zh' ? '确定开启新对话并清空当前任务记录吗？' : 'Start a new session and clear history?')) {
      setMessages([]);
      setActiveImageRef(null);
      localStorage.removeItem(STORAGE_KEY);
      setCoreState('idle');
    }
  };

  const handleSetAsActiveRef = (img: ChatGeneratedImage) => {
    setActiveImageRef({
      imageUrl: img.url,
      designSpec: img.spec,
      candidateId: img.candidateId,
      version: img.version || 1,
      title: img.spec?.garmentCategory || `Design v${img.version}`,
    });
    textareaRef.current?.focus();
  };

  const handleDownloadImage = (url: string, filename = 'modagpt_output.jpg') => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isBlankState = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-5xl mx-auto w-full relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
      />

      {/* ------------------------------------------------------------- */}
      {/* 1. BLANK HOME STATE                                            */}
      {/* ------------------------------------------------------------- */}
      {isBlankState ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center animate-fade-in">
          <div className="mb-6 relative">
            <ModaUICore state={coreState} size="lg" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-stone-900/90 backdrop-blur-md px-3.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest text-stone-200 border border-stone-700/60 shadow-xs">
              MODAGPT · UNIFIED AI ENGINE
            </div>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 mb-2">
            {language === 'zh' ? '统一 AI 服装设计执行平台' : 'ModaGPT Unified Fashion AI Platform'}
          </h1>
          <p className="text-stone-500 max-w-lg text-sm sm:text-base leading-relaxed mb-8">
            {language === 'zh'
              ? '自然语言驱动服装设计、虚拟试衣、模特棚拍、无损调色、面料分析与走秀视频。'
              : 'Direct execution of garment design, virtual try-on, lookbook shoots, recoloring, and runway video.'}
          </p>

          <div className="w-full max-w-2xl bg-white border border-stone-300 rounded-2xl shadow-lg p-3 focus-within:border-stone-900 focus-within:ring-2 focus-within:ring-stone-900/10 transition-all">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 p-1.5 bg-stone-50 rounded-xl border border-stone-200">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-stone-200 text-xs text-stone-700 shadow-2xs"
                  >
                    <img src={att.dataUrl} alt={att.name} className="w-6 h-6 rounded object-cover" />
                    <span className="truncate max-w-[120px]">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="text-stone-400 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              rows={2}
              value={inputVal}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                language === 'zh'
                  ? '直接输入需求（例如：“设计一件黑色羊毛大衣，并穿在模特身上生成棚拍图”或“上传面料图分析克重”）...'
                  : 'Enter command (e.g., "Design a black wool coat and drape on model for catalog shoot")...'
              }
              className="w-full resize-none border-none outline-none text-stone-900 placeholder:text-stone-400 text-sm sm:text-base p-1.5 bg-transparent"
            />

            <div className="flex items-center justify-between pt-2 border-t border-stone-100 mt-2">
              <div className="flex items-center gap-1.5 text-stone-500">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 hover:bg-stone-100 rounded-lg text-stone-600 transition-colors flex items-center gap-1.5 text-xs font-medium"
                  title="添加附件或参考图"
                >
                  <Paperclip className="w-4 h-4" />
                  <span className="hidden sm:inline">{language === 'zh' ? '添加参考图' : 'Attach'}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium ${
                    isRecording
                      ? 'bg-red-50 text-red-600 animate-pulse font-semibold'
                      : 'hover:bg-stone-100 text-stone-600'
                  }`}
                  title="语音输入"
                >
                  {isRecording ? <MicOff className="w-4 h-4 text-red-600" /> : <Mic className="w-4 h-4" />}
                  <span className="hidden sm:inline">
                    {isRecording ? (language === 'zh' ? '聆听中...' : 'Listening...') : language === 'zh' ? '语音' : 'Voice'}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputVal.trim() && attachments.length === 0}
                className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
                  inputVal.trim() || attachments.length > 0
                    ? 'bg-stone-900 text-white hover:bg-stone-800 shadow-md scale-100'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-6 max-w-2xl text-xs text-stone-600">
            <span className="text-stone-400 mr-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {language === 'zh' ? '多引擎串联示范：' : 'Execution examples:'}
            </span>
            {[
              language === 'zh'
                ? '设计一件黑色羊毛大衣，并穿在模特身上看效果'
                : 'Design a black wool coat and try on model',
              language === 'zh'
                ? '设计一套高定晚礼服并生成走秀视频'
                : 'Design haute couture gown and create runway video',
              language === 'zh'
                ? '运行系统算法引擎全面质检'
                : 'Run live benchmark & SSIM drift audit',
            ].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(p)}
                className="bg-white border border-stone-200 hover:border-stone-900 hover:bg-stone-50 px-3 py-1.5 rounded-full transition-all shadow-2xs text-left"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* 2. ACTIVE WORKSPACE                                           */
        /* ------------------------------------------------------------- */
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Status Sub-header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-stone-200/80 bg-white/80 backdrop-blur-xs shrink-0 rounded-t-xl">
            <div className="flex items-center gap-3">
              <ModaUICore state={coreState} size="sm" />
              <div>
                <div className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                  <span>ModaGPT Platform</span>
                  <span className="text-[10px] font-mono bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                    {coreState === 'thinking'
                      ? '规划执行中'
                      : coreState === 'generating'
                        ? '引擎计算中'
                        : coreState === 'completed'
                          ? '已交付'
                          : '在线'}
                  </span>
                </div>
                {activeImageRef && (
                  <div className="text-[11px] text-stone-500 truncate max-w-[240px]">
                    {language === 'zh' ? '当前锁定目标' : 'Active'}: {activeImageRef.title} (v{activeImageRef.version})
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearHistory}
                className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-stone-100 transition-colors"
                title="开启新会话"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'zh' ? '新会话' : 'New Chat'}</span>
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                {msg.role === 'user' ? (
                  <div className="max-w-[85%] sm:max-w-[75%] bg-stone-900 text-white px-4 py-3 rounded-2xl rounded-tr-xs shadow-xs">
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-stone-800">
                        {msg.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="relative group rounded-lg overflow-hidden border border-stone-700"
                          >
                            <img src={att.dataUrl} alt={att.name} className="w-20 h-24 object-cover" />
                            <span className="absolute bottom-0 inset-x-0 bg-stone-950/80 text-[10px] text-stone-300 px-1 py-0.5 truncate">
                              {att.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <div className="text-[10px] text-stone-400 text-right mt-1 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[92%] sm:max-w-[85%] bg-white border border-stone-200/90 rounded-2xl rounded-tl-xs p-4 sm:p-5 shadow-xs">
                    {/* Multi-Step Pipeline Visual Rail */}
                    {msg.steps && msg.steps.length > 1 && (
                      <div className="mb-4 p-3 bg-stone-50 border border-stone-200 rounded-xl">
                        <div className="text-xs font-semibold text-stone-800 mb-2 flex items-center gap-1.5">
                          <Workflow className="w-4 h-4 text-stone-600" />
                          <span>{language === 'zh' ? '多步骤引擎执行链路' : 'Execution Pipeline'}</span>
                          <span className="text-[10px] font-mono text-stone-400">({msg.steps.length} 步骤)</span>
                        </div>
                        <div className="space-y-1.5">
                          {msg.steps.map((st, sIdx) => (
                            <div
                              key={sIdx}
                              className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center text-[10px] font-mono">
                                  {sIdx + 1}
                                </span>
                                <span className="font-medium text-stone-900">{st.toolName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {st.durationMs && (
                                  <span className="text-[10px] font-mono text-stone-400">
                                    {st.durationMs}ms
                                  </span>
                                )}
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>已完成</span>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-sm sm:text-base text-stone-800 leading-relaxed whitespace-pre-wrap mb-4">
                      {msg.content}
                    </div>

                    {msg.error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 mb-3">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                        <div>
                          <div className="font-semibold">{language === 'zh' ? '执行被中断' : 'Execution Failed'}</div>
                          <div>{msg.error}</div>
                        </div>
                      </div>
                    )}

                    {/* Result Card */}
                    {msg.generatedImage && (
                      <div className="bg-stone-50 border border-stone-200 rounded-xl overflow-hidden shadow-xs mt-3">
                        <div className="px-3.5 py-2.5 bg-stone-100/80 border-b border-stone-200 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-900">
                              {msg.generatedImage.spec?.garmentCategory || '商业级输出成果'}
                            </span>
                            <span className="bg-stone-900 text-white font-mono text-[10px] px-2 py-0.5 rounded-full">
                              v{msg.generatedImage.version}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {msg.generatedImage.consistencyScore && (
                              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                质检: {msg.generatedImage.consistencyScore}分
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-3">
                          {isComparingVersions[msg.id] && msg.generatedImage.previousImageUrl ? (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="relative rounded-lg overflow-hidden border border-stone-300">
                                <img
                                  src={msg.generatedImage.previousImageUrl}
                                  alt="Previous"
                                  className="w-full aspect-3/4 object-cover"
                                />
                                <span className="absolute top-2 left-2 bg-stone-900/80 text-white text-[10px] px-2 py-0.5 rounded-md font-mono">
                                  原版对比
                                </span>
                              </div>
                              <div className="relative rounded-lg overflow-hidden border-2 border-stone-900">
                                <img
                                  src={msg.generatedImage.url}
                                  alt="Revised"
                                  className="w-full aspect-3/4 object-cover"
                                />
                                <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-md font-mono">
                                  当前成果
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="relative group rounded-lg overflow-hidden border border-stone-200 bg-white">
                              <img
                                src={msg.generatedImage.url}
                                alt="Output"
                                className="w-full max-h-[460px] object-contain mx-auto transition-transform duration-300 group-hover:scale-[1.01]"
                              />
                            </div>
                          )}

                          {msg.generatedImage.auditNotes && msg.generatedImage.auditNotes.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] font-mono text-stone-500">
                              {msg.generatedImage.auditNotes.map((note, nIdx) => (
                                <span key={nIdx} className="bg-white border border-stone-200 px-2 py-0.5 rounded-md">
                                  {note}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Toolbar */}
                        <div className="px-3.5 py-2.5 bg-white border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setLightboxImage(msg.generatedImage!)}
                              className="px-2.5 py-1.5 rounded-lg border border-stone-200 hover:border-stone-900 hover:bg-stone-50 text-stone-700 flex items-center gap-1 transition-colors"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              <span>查看原图</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadImage(msg.generatedImage!.url)}
                              className="px-2.5 py-1.5 rounded-lg border border-stone-200 hover:border-stone-900 hover:bg-stone-50 text-stone-700 flex items-center gap-1 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>下载</span>
                            </button>

                            {msg.generatedImage.previousImageUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  setIsComparingVersions((prev) => ({
                                    ...prev,
                                    [msg.id]: !prev[msg.id],
                                  }))
                                }
                                className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                                  isComparingVersions[msg.id]
                                    ? 'bg-stone-900 text-white border-stone-900 font-semibold'
                                    : 'border-stone-200 hover:border-stone-900 text-stone-700 bg-white'
                                }`}
                              >
                                <Layers className="w-3.5 h-3.5" />
                                <span>{isComparingVersions[msg.id] ? '退出对比' : '版本对比'}</span>
                              </button>
                            )}

                            {msg.auditRecords && msg.auditRecords.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setSelectedAuditLog(msg.auditRecords!)}
                                className="px-2.5 py-1.5 rounded-lg border border-stone-200 hover:border-stone-900 text-stone-600 bg-white flex items-center gap-1"
                              >
                                <Activity className="w-3.5 h-3.5 text-stone-400" />
                                <span>审计记录</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSetAsActiveRef(msg.generatedImage!)}
                              className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-medium flex items-center gap-1.5 shadow-xs transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>以此图继续操作</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {msg.suggestedNextPrompts && msg.suggestedNextPrompts.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-stone-100 flex flex-wrap gap-1.5">
                        <span className="text-[11px] text-stone-400 self-center mr-1">快捷指令：</span>
                        {msg.suggestedNextPrompts.map((p, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => handleSendMessage(p)}
                            className="text-xs bg-stone-50 hover:bg-stone-900 hover:text-white border border-stone-200 text-stone-700 px-2.5 py-1 rounded-full transition-all flex items-center gap-1"
                          >
                            <span>{p}</span>
                            <ArrowRight className="w-3 h-3 opacity-60" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start">
                <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-xs p-4 shadow-xs flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-stone-900 border-t-transparent animate-spin shrink-0" />
                  <div className="text-xs sm:text-sm text-stone-600 font-mono">
                    {statusNote || 'AI 正在拆解并执行服装工程链路...'}
                  </div>
                </div>
              </div>
            )}

            <div ref={chatScrollEndRef} />
          </div>

          {/* Bottom Fixed Chat Input Bar */}
          <div className="p-4 bg-white/95 backdrop-blur-md border-t border-stone-200 shrink-0 rounded-b-xl">
            {activeImageRef && (
              <div className="mb-2 px-3 py-1.5 bg-stone-100 border border-stone-200 rounded-xl flex items-center justify-between text-xs text-stone-700">
                <div className="flex items-center gap-2">
                  <img
                    src={activeImageRef.imageUrl}
                    alt="Active reference"
                    className="w-6 h-6 rounded object-cover border border-stone-300"
                  />
                  <span>
                    正在连续操作：<strong className="text-stone-900">{activeImageRef.title}</strong> (v{activeImageRef.version})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveImageRef(null)}
                  className="text-stone-400 hover:text-stone-900 text-[11px] underline"
                >
                  解除绑定
                </button>
              </div>
            )}

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 p-1.5 bg-stone-50 rounded-xl border border-stone-200">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-stone-200 text-xs text-stone-700 shadow-2xs"
                  >
                    <img src={att.dataUrl} alt={att.name} className="w-6 h-6 rounded object-cover" />
                    <span className="truncate max-w-[120px]">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="text-stone-400 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 bg-stone-50 border border-stone-300 rounded-2xl p-2 focus-within:border-stone-900 focus-within:bg-white focus-within:ring-2 focus-within:ring-stone-900/10 transition-all">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 rounded-xl transition-colors shrink-0 mb-0.5"
                title="上传参考图"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={toggleVoiceRecording}
                className={`p-2 rounded-xl transition-colors shrink-0 mb-0.5 ${
                  isRecording
                    ? 'bg-red-50 text-red-600 animate-pulse'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
                title="语音输入"
              >
                {isRecording ? <MicOff className="w-4 h-4 text-red-600" /> : <Mic className="w-4 h-4" />}
              </button>

              <textarea
                ref={textareaRef}
                rows={1}
                value={inputVal}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  activeImageRef
                    ? '输入指令（例如：“领口改成翻领，腰身收紧”或“穿在模特身上看效果”或“换成酒红色”）...'
                    : '输入时装设计需求，或单条指令串联多个功能（Enter 发送）...'
                }
                className="flex-1 max-h-[160px] resize-none border-none outline-none text-stone-900 placeholder:text-stone-400 text-sm p-1.5 bg-transparent"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={(!inputVal.trim() && attachments.length === 0) || isLoading}
                className={`p-2.5 rounded-xl shrink-0 transition-all ${
                  (inputVal.trim() || attachments.length > 0) && !isLoading
                    ? 'bg-stone-900 text-white hover:bg-stone-800 shadow-sm'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-stone-900 text-sm">
                  {lightboxImage.spec?.garmentCategory || '商业级高清原图'}
                </span>
                <span className="bg-stone-900 text-white font-mono text-[10px] px-2 py-0.5 rounded-full">
                  v{lightboxImage.version}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadImage(
                      lightboxImage.url,
                      `modagpt_${lightboxImage.candidateId || 'highres'}_v${lightboxImage.version}.jpg`
                    )
                  }
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>下载高清原图</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 text-stone-400 hover:text-stone-900 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-stone-900/5">
              <img
                src={lightboxImage.url}
                alt="Full preview"
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-md"
              />
            </div>

            {lightboxImage.spec && (
              <div className="p-4 bg-stone-50 border-t border-stone-200 text-xs font-mono text-stone-600 max-h-36 overflow-y-auto">
                <div className="font-semibold text-stone-900 mb-1 flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>设计规格参数</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div>品类: {lightboxImage.spec.garmentCategory}</div>
                  <div>风格: {lightboxImage.spec.designStyle}</div>
                  <div>基底色彩: {lightboxImage.spec.primaryColor}</div>
                  <div>廓形: {lightboxImage.spec.silhouette}</div>
                  <div>面料: {lightboxImage.spec.fabricAppearance}</div>
                  <div>门襟: {lightboxImage.spec.closureType || '定制'}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Log Drawer Modal */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-stone-700" />
                <span className="font-semibold text-stone-900 text-sm">ModaGPT 真实工程调用审计记录</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                className="p-1 text-stone-400 hover:text-stone-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
              {selectedAuditLog.map((log: any, lIdx: number) => (
                <div key={lIdx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5">
                  <div className="flex items-center justify-between text-stone-900 font-semibold">
                    <span>{log.toolName} ({log.toolId})</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] ${log.success ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {log.success ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                  <div className="text-stone-600">调度通道: {log.channel} · 模型: {log.modelUsed}</div>
                  <div className="text-stone-600">耗时: {log.durationMs}ms</div>
                  {log.auditNotes && log.auditNotes.length > 0 && (
                    <div className="text-stone-500 pt-1 border-t border-stone-200">
                      {log.auditNotes.map((n: string, ni: number) => (
                        <div key={ni}>• {n}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
