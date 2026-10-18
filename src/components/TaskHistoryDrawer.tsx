import React, { useState, useEffect } from 'react';
import { TaskRecord, TaskStatus } from '../types/index.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface TaskHistoryDrawerProps {
  onSelectResult?: (resultAssetId: string) => void;
}

export const TaskHistoryDrawer: React.FC<TaskHistoryDrawerProps> = ({ onSelectResult }) => {
  const { language, strings } = useLanguage();

  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const url = new URL('/api/tasks', window.location.origin);
      if (statusFilter !== 'all') url.searchParams.set('status', statusFilter);
      if (typeFilter !== 'all') url.searchParams.set('type', typeFilter);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data: TaskRecord[] = await res.json();
        setTasks(data);
        if (data.length > 0 && !selectedTask) {
          setSelectedTask(data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, [statusFilter, typeFilter]);

  const handleRetry = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const newTask = await res.json();
        setActionMessage(language === 'zh' ? `任务 ${taskId} 已重新提交为 ${newTask.id}。` : `Task ${taskId} re-submitted successfully as ${newTask.id}.`);
        fetchTasks();
      }
    } catch (err: any) {
      setActionMessage(`Retry failed: ${err.message}`);
    }
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleCancel = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/cancel`, {
        method: 'POST',
      });
      if (res.ok) {
        setActionMessage(language === 'zh' ? `任务 ${taskId} 已取消。` : `Task ${taskId} cancelled.`);
        fetchTasks();
      }
    } catch (err: any) {
      setActionMessage(`Cancel failed: ${err.message}`);
    }
    setTimeout(() => setActionMessage(null), 4000);
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-mono font-semibold">{language === 'zh' ? '已完成' : 'COMPLETED'}</span>;
      case 'failed':
        return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-mono font-semibold">{language === 'zh' ? '失败' : 'FAILED'}</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 bg-stone-100 text-stone-600 border border-stone-200 rounded text-[10px] font-mono font-semibold">{language === 'zh' ? '已取消' : 'CANCELLED'}</span>;
      case 'processing':
        return (
          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-mono font-semibold flex items-center gap-1">
            <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            {language === 'zh' ? '处理中' : 'PROCESSING'}
          </span>
        );
      case 'quality_check':
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-mono font-semibold">{language === 'zh' ? '质检验算' : 'QUALITY CHECK'}</span>;
      default:
        return <span className="px-2 py-0.5 bg-stone-100 text-stone-700 border border-stone-200 rounded text-[10px] font-mono uppercase">{status}</span>;
    }
  };

  const getTypeLabel = (type: string) => {
    if (language === 'zh') {
      switch (type) {
        case 'try_on': return '虚拟试衣';
        case 'model_shoot': return 'AI模特棚拍';
        case 'recolor': return '高精调色';
        case 'video_runway': return '走秀视频';
        case 'garment_analysis': return '面料分析';
        default: return type;
      }
    }
    return type.toUpperCase().replace('_', ' ');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-stone-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase text-stone-500 tracking-wider">
              {language === 'zh' ? '流水线遥测与质检日志' : 'Telemetry & Audit Logs'}
            </span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">
            {strings.history.title}
          </h2>
          <p className="text-stone-500 text-xs font-mono mt-0.5">
            {strings.history.subtitle}
          </p>
        </div>

        <button
          onClick={fetchTasks}
          disabled={isLoading}
          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-mono rounded transition-colors self-start sm:self-auto flex items-center gap-1.5"
        >
          <span>↻ {strings.common.refresh}</span>
          {isLoading && <span className="animate-spin text-stone-500">·</span>}
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 bg-stone-900 text-stone-100 text-xs font-mono rounded flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-stone-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white border border-stone-200 rounded-lg text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-stone-400 uppercase">{strings.common.status}:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-stone-200 rounded px-2 py-1 bg-stone-50 text-stone-800"
          >
            <option value="all">{language === 'zh' ? '全状态' : 'All Statuses'}</option>
            <option value="processing">{language === 'zh' ? '处理中' : 'Processing'}</option>
            <option value="quality_check">{language === 'zh' ? '质检中' : 'Quality Check'}</option>
            <option value="completed">{language === 'zh' ? '已完成' : 'Completed'}</option>
            <option value="failed">{language === 'zh' ? '失败' : 'Failed'}</option>
            <option value="cancelled">{language === 'zh' ? '已取消' : 'Cancelled'}</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-stone-400 uppercase">{strings.history.taskType}:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-stone-200 rounded px-2 py-1 bg-stone-50 text-stone-800"
          >
            <option value="all">{language === 'zh' ? '所有类型' : 'All Types'}</option>
            <option value="try_on">{strings.header.tryOn}</option>
            <option value="model_shoot">{strings.header.modelShoot}</option>
            <option value="recolor">{strings.header.recolor}</option>
            <option value="video_runway">{strings.header.runwayVideo}</option>
          </select>
        </div>

        <div className="ml-auto text-stone-500">
          {language === 'zh' ? `共 ${tasks.length} 条流水线任务` : `Showing ${tasks.length} tasks`}
        </div>
      </div>

      {/* Main Grid: Task List + Task Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left List */}
        <div className="lg:col-span-1 bg-white border border-stone-200 rounded-lg overflow-hidden flex flex-col max-h-[640px]">
          <div className="p-3 bg-stone-50 border-b border-stone-200 text-xs font-mono font-semibold text-stone-700">
            {language === 'zh' ? '任务队列列表' : 'Task Queue Entries'}
          </div>
          <div className="overflow-y-auto divide-y divide-stone-100 flex-1">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-stone-400">
                {strings.history.emptyText}
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    selectedTask?.id === task.id ? 'bg-stone-100/90' : 'hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-stone-900 truncate">
                      {getTypeLabel(task.type)}
                    </span>
                    {getStatusBadge(task.status)}
                  </div>
                  <div className="text-[11px] font-mono text-stone-500 truncate mb-1">
                    ID: {task.id}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-stone-400">
                    <span>{new Date(task.createdAt).toLocaleTimeString()}</span>
                    {task.durationMs && <span>{task.durationMs}ms</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Detail Pane */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-lg p-6 space-y-6">
          {selectedTask ? (
            <div className="space-y-6">
              {/* Top Meta */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-stone-400 uppercase">{strings.history.taskId}</span>
                    <span className="text-xs font-mono font-bold text-stone-900">{selectedTask.id}</span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-stone-900 capitalize">
                    {getTypeLabel(selectedTask.type)} {language === 'zh' ? '任务详情' : 'Task Detail'}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedTask.status)}

                  {(selectedTask.status === 'failed' || selectedTask.status === 'completed') && (
                    <button
                      onClick={() => handleRetry(selectedTask.id)}
                      className="px-3 py-1 bg-stone-900 text-white text-xs font-mono rounded hover:bg-stone-800 transition-colors"
                    >
                      {language === 'zh' ? '重试任务' : 'Retry Task'}
                    </button>
                  )}

                  {(selectedTask.status === 'processing' || selectedTask.status === 'queued') && (
                    <button
                      onClick={() => handleCancel(selectedTask.id)}
                      className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-mono rounded hover:bg-rose-100 transition-colors"
                    >
                      {strings.common.cancel}
                    </button>
                  )}
                </div>
              </div>

              {/* Progress and Stage Message */}
              <div className="space-y-2 p-4 bg-stone-50 border border-stone-200 rounded-lg">
                <div className="flex items-center justify-between text-xs font-mono text-stone-600">
                  <span>{language === 'zh' ? '当前执行阶段：' : 'Current Stage: '}<strong className="text-stone-900">{selectedTask.stageMessage}</strong></span>
                  <span className="font-bold">{selectedTask.progress}%</span>
                </div>
                <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-stone-900 h-full transition-all duration-300"
                    style={{ width: `${selectedTask.progress}%` }}
                  />
                </div>
              </div>

              {/* Quality Scorecard */}
              {selectedTask.qualityMetrics && (
                <div className="space-y-3 p-4 bg-stone-50/70 border border-stone-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-stone-900">{language === 'zh' ? '商业质检综合审计' : 'Commercial Quality Audit'}</span>
                    <span className={`text-xs font-mono font-bold ${selectedTask.qualityMetrics.passed ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {selectedTask.qualityMetrics.passed ? (language === 'zh' ? '商业级验证达标 (PASSED)' : 'PASSED (COMMERCIAL GRADE)') : (language === 'zh' ? '需要精细迭代' : 'NEEDS REFINEMENT')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-2.5 bg-white border border-stone-200 rounded">
                      <span className="text-stone-400 block text-[10px]">{strings.tryOn.overallScore}</span>
                      <strong className="text-sm text-stone-900">{selectedTask.qualityMetrics.overallScore}/100</strong>
                    </div>
                    <div className="p-2.5 bg-white border border-stone-200 rounded">
                      <span className="text-stone-400 block text-[10px]">{strings.tryOn.consistencyScore}</span>
                      <strong className="text-sm text-stone-900">{selectedTask.qualityMetrics.garmentConsistencyScore}/100</strong>
                    </div>
                    {selectedTask.qualityMetrics.identityPreservationScore !== undefined && (
                      <div className="p-2.5 bg-white border border-stone-200 rounded">
                        <span className="text-stone-400 block text-[10px]">{language === 'zh' ? '面容特征锁死率' : 'Identity Protection'}</span>
                        <strong className="text-sm text-stone-900">{selectedTask.qualityMetrics.identityPreservationScore}/100</strong>
                      </div>
                    )}
                    {selectedTask.qualityMetrics.nonTargetDeltaPercent !== undefined && (
                      <div className="p-2.5 bg-white border border-stone-200 rounded">
                        <span className="text-stone-400 block text-[10px]">{strings.common.nonTargetDrift}</span>
                        <strong className="text-sm text-emerald-700">{selectedTask.qualityMetrics.nonTargetDeltaPercent}% (&lt;1% OK)</strong>
                      </div>
                    )}
                  </div>

                  {selectedTask.qualityMetrics.notes && selectedTask.qualityMetrics.notes.length > 0 && (
                    <ul className="text-xs font-mono text-stone-600 list-disc list-inside space-y-0.5 pt-2 border-t border-stone-200">
                      {selectedTask.qualityMetrics.notes.map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Execution Telemetry */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 bg-white border border-stone-200 rounded">
                  <span className="text-stone-400 uppercase text-[10px] block">{strings.history.modelUsed}</span>
                  <div className="font-semibold text-stone-800 mt-0.5">{selectedTask.modelUsed || 'Atelier Hybrid Engine'}</div>
                </div>
                <div className="p-3 bg-white border border-stone-200 rounded">
                  <span className="text-stone-400 uppercase text-[10px] block">{strings.common.duration}</span>
                  <div className="font-semibold text-stone-800 mt-0.5">{selectedTask.durationMs ? `${selectedTask.durationMs} ms` : (language === 'zh' ? '执行中...' : 'In progress...')}</div>
                </div>
                <div className="p-3 bg-white border border-stone-200 rounded">
                  <span className="text-stone-400 uppercase text-[10px] block">{strings.common.tokensUsed}</span>
                  <div className="font-semibold text-stone-800 mt-0.5">{selectedTask.costTokensEstimate !== undefined ? `${selectedTask.costTokensEstimate} tokens` : strings.common.costFree}</div>
                </div>
              </div>

              {/* Input Parameters */}
              <div className="space-y-2">
                <span className="text-xs font-mono text-stone-500 uppercase">{language === 'zh' ? '输入参数载荷 (Input Parameters)' : 'Input Parameters'}</span>
                <pre className="p-3 bg-stone-900 text-stone-100 rounded text-xs font-mono overflow-x-auto max-h-48">
                  {JSON.stringify(selectedTask.inputParams, null, 2)}
                </pre>
              </div>

              {/* Error block if any */}
              {selectedTask.error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg space-y-1">
                  <span className="text-xs font-mono font-bold text-rose-800 uppercase">{language === 'zh' ? '错误诊断日志' : 'Error Diagnostic Log'}</span>
                  <p className="text-xs font-mono text-rose-700">{selectedTask.error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center text-xs font-mono text-stone-400">
              {language === 'zh' ? '请从左侧列表选择一项任务查看遥测与质检日志。' : 'Select a task from the left list to inspect telemetry and quality audit logs.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
