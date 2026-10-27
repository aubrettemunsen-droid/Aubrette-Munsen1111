import React, { useState, useEffect, useRef } from 'react';
import { AssetRecord } from '../types/index.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  FolderArchive,
  Search,
  Upload,
  Download,
  Trash2,
  ExternalLink,
  Eye,
  Filter,
  CheckCircle2,
  X,
  AlertCircle,
  FileImage,
  Sparkles,
} from 'lucide-react';

interface AssetLibraryViewProps {
  onSendToCreator: (asset: AssetRecord) => void;
  onOpenVideoModal?: (dataUrl?: string) => void;
}

export const AssetLibraryView: React.FC<AssetLibraryViewProps> = ({
  onSendToCreator,
  onOpenVideoModal,
}) => {
  const { language } = useLanguage();
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'garment' | 'person' | 'result'>('all');
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assets');
      if (res.ok) {
        const data = await res.json();
        setAssets(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to load assets', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  // Filter logic
  const filteredAssets = assets.filter((asset) => {
    const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg(language === 'zh' ? '请选择有效的图片文件 (JPEG, PNG, WEBP)' : 'Please select a valid image file');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg(language === 'zh' ? '文件大小不能超过 15MB' : 'File size cannot exceed 15MB');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const uploadRes = await fetch('/api/uploads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name.replace(/\.[^/.]+$/, ''),
            category: 'garment',
            dataUrl,
            tags: ['user_upload', 'custom'],
          }),
        });

        if (uploadRes.ok) {
          setSuccessMsg(language === 'zh' ? '素材上传成功' : 'Asset uploaded successfully');
          setTimeout(() => setSuccessMsg(null), 3000);
          fetchAssets();
        } else {
          const errData = await uploadRes.json();
          setErrorMsg(errData.error || 'Upload failed');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Upload request failed');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (assetId: string) => {
    if (!confirm(language === 'zh' ? '确定要永久删除此素材吗？' : 'Are you sure you want to delete this asset?')) {
      return;
    }

    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== assetId));
        if (selectedAsset?.id === assetId) {
          setSelectedAsset(null);
        }
        setSuccessMsg(language === 'zh' ? '素材已删除' : 'Asset deleted');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Delete failed');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Delete request failed');
    }
  };

  const handleDownload = (asset: AssetRecord) => {
    const link = document.createElement('a');
    link.href = asset.dataUrl;
    link.download = `${asset.name.replace(/\s+/g, '_')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-stone-900" />
            <h1 className="text-xl font-serif font-bold text-stone-900">
              {language === 'zh' ? '统一素材与成果库' : 'Asset & Creation Library'}
            </h1>
          </div>
          <p className="text-xs text-stone-500 font-mono mt-1">
            {language === 'zh'
              ? `共计 ${assets.length} 件资产 · 支持按类别筛选、质检元数据追溯与直接送入创作中心`
              : `${assets.length} total assets · Real metadata tracking, deletion & export`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={isUploading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-medium transition shadow-xs disabled:opacity-50"
          >
            <Upload className={`w-3.5 h-3.5 ${isUploading ? 'animate-bounce' : ''}`} />
            <span>{isUploading ? (language === 'zh' ? '上传中...' : 'Uploading...') : (language === 'zh' ? '上传新素材' : 'Upload Asset')}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Search & Category Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-stone-200 text-xs font-medium w-full sm:w-auto">
          {[
            { id: 'all', label: language === 'zh' ? '全部素材' : 'All' },
            { id: 'garment', label: language === 'zh' ? '服装面料' : 'Garments' },
            { id: 'person', label: language === 'zh' ? '模特肖像' : 'Models' },
            { id: 'result', label: language === 'zh' ? '生成成果' : 'Results' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                categoryFilter === tab.id
                  ? 'bg-stone-900 text-white font-medium shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'zh' ? '按名称或标签搜索...' : 'Search by name or tags...'}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-stone-900 text-stone-900 placeholder-stone-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Assets Gallery Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-2">
          <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-xs font-mono text-stone-500">
            {language === 'zh' ? '正在加载素材元数据...' : 'Loading assets...'}
          </div>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mx-auto">
            <FileImage className="w-6 h-6" />
          </div>
          <div className="text-sm font-semibold text-stone-800">
            {language === 'zh' ? '未找到符合条件的素材' : 'No assets found'}
          </div>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {searchQuery
              ? (language === 'zh' ? '尝试调整搜索关键词或清除筛选条件' : 'Try adjusting search term or clearing filters')
              : (language === 'zh' ? '点击右上角“上传新素材”添加第一张高定服装或模特图片' : 'Upload your first garment or model image')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="group bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              {/* Image Thumbnail */}
              <div
                onClick={() => setSelectedAsset(asset)}
                className="relative aspect-3/4 bg-stone-100 overflow-hidden cursor-pointer"
              >
                <img
                  src={asset.dataUrl}
                  alt={asset.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-stone-950/70 text-white backdrop-blur-xs capitalize">
                    {asset.category || 'Asset'}
                  </span>
                </div>
                <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAsset(asset);
                    }}
                    className="p-2 rounded-full bg-white text-stone-900 hover:scale-110 transition shadow"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(asset);
                    }}
                    className="p-2 rounded-full bg-white text-stone-900 hover:scale-110 transition shadow"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card Footer Info */}
              <div className="p-3 border-t border-stone-100 space-y-2">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-stone-900 truncate" title={asset.name}>
                      {asset.name}
                    </h3>
                    <div className="text-[10px] font-mono text-stone-400 mt-0.5">
                      {asset.sizeBytes ? `${Math.round(asset.sizeBytes / 1024)} KB` : 'HD Image'} · {new Date(asset.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {!asset.id.startsWith('benchmark_') && (
                    <button
                      type="button"
                      onClick={() => handleDelete(asset.id)}
                      className="p-1 text-stone-400 hover:text-rose-600 rounded transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Send to Creator Action Button */}
                <button
                  type="button"
                  onClick={() => onSendToCreator(asset)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-stone-50 hover:bg-stone-900 hover:text-white text-stone-700 rounded-lg text-[11px] font-medium border border-stone-200 hover:border-stone-900 transition"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{language === 'zh' ? '送入 AI 创作中心' : 'Send to Creator'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Asset Details & Full-Screen Lightbox Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row border border-stone-200 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Left Preview Box */}
            <div className="md:w-3/5 bg-stone-950 flex items-center justify-center p-4 relative aspect-square md:aspect-auto">
              <img
                src={selectedAsset.dataUrl}
                alt={selectedAsset.name}
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-stone-800 text-white hover:bg-stone-700 md:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Right Metadata Details Panel */}
            <div className="md:w-2/5 p-6 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200">
                      {selectedAsset.category || 'Asset'}
                    </span>
                    <h2 className="text-base font-serif font-bold text-stone-900 mt-2">
                      {selectedAsset.name}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAsset(null)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hidden md:block"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2.5 text-xs font-mono border-t border-b border-stone-100 py-4 text-stone-600">
                  <div className="flex justify-between">
                    <span className="text-stone-400">ID:</span>
                    <span className="text-stone-800 truncate max-w-[180px]">{selectedAsset.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">MIME Type:</span>
                    <span className="text-stone-800">{selectedAsset.mimeType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Created:</span>
                    <span className="text-stone-800">{new Date(selectedAsset.createdAt).toLocaleString()}</span>
                  </div>
                  {selectedAsset.sizeBytes && (
                    <div className="flex justify-between">
                      <span className="text-stone-400">File Size:</span>
                      <span className="text-stone-800">{Math.round(selectedAsset.sizeBytes / 1024)} KB</span>
                    </div>
                  )}
                </div>

                {selectedAsset.tags && selectedAsset.tags.length > 0 && (
                  <div>
                    <div className="text-[11px] font-mono text-stone-400 mb-1.5 uppercase">Tags</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAsset.tags.map((tag, idx) => (
                        <span key={idx} className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-6 border-t border-stone-100 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    const asset = selectedAsset;
                    setSelectedAsset(null);
                    onSendToCreator(asset);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-medium hover:bg-stone-800 transition shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{language === 'zh' ? '在 AI 创作中心使用' : 'Dispatch to AI Creator'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(selectedAsset)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-medium transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === 'zh' ? '下载原图' : 'Download'}</span>
                  </button>

                  {!selectedAsset.id.startsWith('benchmark_') && (
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedAsset.id)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
