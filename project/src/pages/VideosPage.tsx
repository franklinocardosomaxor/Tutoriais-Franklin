import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, Video as VideoIcon, ExternalLink, Search,
  Upload, Sparkles, Loader2, FileText, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Video, Tutor, Module } from '@/types/database';
import { Modal, StatusBadge, EmptyState, ConfirmDialog } from '@/components/ui';
import { Button, LoadingSpinner, PageHeader, inputClass, labelClass, textareaClass } from '@/components/shared';

export function VideosPage() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Video | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [aiMessage, setAiMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [transcriptionModal, setTranscriptionModal] = useState<Video | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [vRes, tRes, mRes] = await Promise.all([
      supabase.from('videos').select('*, module:modules(*), tutor:tutors(*)').eq('user_id', user.id).order('sort_order'),
      supabase.from('tutors').select('*').eq('user_id', user.id).order('name'),
      supabase.from('modules').select('*, category:categories(*)').eq('user_id', user.id).order('sort_order'),
    ]);
    setVideos((vRes.data || []) as Video[]);
    setTutors((tRes.data || []) as Tutor[]);
    setModules((mRes.data || []) as Module[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async (formData: Partial<Video>) => {
    if (!user) return;
    setSaving(true);
    const payload = {
      ...formData,
      user_id: user.id,
      completed_at: formData.status === 'implemented' ? (formData.completed_at || new Date().toISOString().split('T')[0]) : null,
    } as Partial<Video>;

    if (editing) {
      await supabase.from('videos').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('videos').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    setEditing(null);
    loadData();
  };

  const handleDelete = async (id: string) => {
    const video = videos.find((v) => v.id === id);
    if (video?.file_path) {
      await supabase.storage.from('videos').remove([video.file_path]);
    }
    await supabase.from('videos').delete().eq('id', id);
    loadData();
  };

  const toggleStatus = async (video: Video) => {
    const newStatus = video.status === 'pending' ? 'implemented' : 'pending';
    await supabase.from('videos').update({
      status: newStatus,
      completed_at: newStatus === 'implemented' ? new Date().toISOString().split('T')[0] : null,
    }).eq('id', video.id);
    loadData();
  };

  const handleFileUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    setUploadProgress(0);

    const fileExt = file.name.split('.').pop() || 'mp4';
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, file);

    if (uploadError) {
      setAiMessage({ type: 'error', text: `Erro no upload: ${uploadError.message}` });
      setUploading(false);
      return;
    }

    const { data: videoData, error: insertError } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        title: file.name.replace(/\.[^/.]+$/, ''),
        file_path: fileName,
        status: 'pending',
        sort_order: videos.length,
      })
      .select('*, module:modules(*), tutor:tutors(*)')
      .maybeSingle();

    setUploading(false);
    setUploadProgress(0);

    if (insertError || !videoData) {
      setAiMessage({ type: 'error', text: 'Erro ao salvar vídeo no banco de dados.' });
      return;
    }

    setAiMessage({ type: 'success', text: 'Vídeo enviado! Clique em "Processar com IA" para transcrever e classificar.' });
    loadData();
  };

  const handleProcessAI = async (video: Video) => {
    if (!user || !video.file_path) return;
    setProcessingIds((prev) => new Set(prev).add(video.id));
    setAiMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-video-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            videoId: video.id,
            filePath: video.file_path,
            userId: user.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setAiMessage({ type: 'error', text: result.error || 'Erro ao processar vídeo com IA.' });
      } else {
        setAiMessage({
          type: 'success',
          text: `Vídeo processado! Categoria sugerida: ${result.ai_category || 'N/A'}. Transcrição disponível.`,
        });
        loadData();
      }
    } catch {
      setAiMessage({ type: 'error', text: 'Erro de conexão ao processar vídeo.' });
    }

    setProcessingIds((prev) => {
      const next = new Set(prev);
      next.delete(video.id);
      return next;
    });
  };

  const applyAISuggestion = async (video: Video) => {
    if (!video.ai_category) return;

    // Try to find matching category and module, or create them
    let moduleId = video.module_id;

    if (video.ai_module) {
      const existingModule = modules.find(
        (m) => m.name.toLowerCase() === video.ai_module!.toLowerCase()
      );
      if (existingModule) {
        moduleId = existingModule.id;
      }
    }

    await supabase.from('videos').update({
      description: video.ai_summary || video.description,
      key_steps: video.ai_key_steps || video.key_steps,
      module_id: moduleId,
    }).eq('id', video.id);

    setAiMessage({ type: 'success', text: 'Sugestões da IA aplicadas ao vídeo!' });
    loadData();
  };

  const filtered = videos.filter((v) => {
    const matchesSearch = v.title.toLowerCase().includes(search.toLowerCase()) || (v.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Vídeos"
        subtitle="Gerencie seus treinamentos em vídeo"
        action={
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="w-4 h-4" />
            Novo vídeo
          </Button>
        }
      />

      {/* Upload zone */}
      <div className="mb-6">
        <label className="block">
          <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
            uploading ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
          }`}>
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm font-medium text-slate-700">Enviando vídeo... {uploadProgress}%</p>
                <div className="w-full max-w-xs h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-blue-500" />
                </div>
                <p className="text-sm font-medium text-slate-700">Clique para enviar um vídeo</p>
                <p className="text-xs text-slate-400">MP4, MOV, WEBM até 25MB para processamento com IA</p>
              </div>
            )}
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = '';
              }}
              disabled={uploading}
            />
          </div>
        </label>
      </div>

      {/* AI message */}
      {aiMessage && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm mb-4 ${
          aiMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {aiMessage.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />
          }
          {aiMessage.text}
          <button onClick={() => setAiMessage(null)} className="ml-auto text-slate-400 hover:text-slate-600">
            <span className="text-xs">x</span>
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar vídeos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${inputClass} sm:w-48`}
        >
          <option value="all">Todos os status</option>
          <option value="pending">Pendentes</option>
          <option value="implemented">Implementados</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<VideoIcon className="w-8 h-8" />}
          title={search ? "Nenhum vídeo encontrado" : "Nenhum vídeo cadastrado"}
          description={search ? "Tente outra busca" : "Envie um vídeo acima ou adicione manualmente"}
          action={!search && (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Adicionar vídeo
            </Button>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((video) => (
            <div key={video.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <VideoIcon className="w-4 h-4 text-blue-500" />
                  </div>
                  <StatusBadge status={video.status} />
                </div>
                <div className="flex gap-1">
                  {video.ai_processed && (
                    <button
                      onClick={() => setTranscriptionModal(video)}
                      className="p-1.5 text-slate-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Ver transcrição"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => { setEditing(video); setModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteId(video.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">{video.title}</h3>
              {video.description && <p className="text-slate-500 text-sm line-clamp-2 mb-3">{video.description}</p>}

              {/* AI badge */}
              {video.ai_processed && (
                <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-purple-50 rounded-md">
                  <Sparkles className="w-3 h-3 text-purple-500" />
                  <span className="text-xs text-purple-600 font-medium">Processado com IA</span>
                  {video.ai_category && (
                    <span className="text-xs text-purple-400">• {video.ai_category}</span>
                  )}
                </div>
              )}

              <div className="space-y-1.5 text-xs text-slate-500">
                {video.tutor && <p>Tutor: <span className="text-slate-700 font-medium">{video.tutor.name}</span></p>}
                {video.module && <p>Módulo: <span className="text-slate-700 font-medium">{video.module.name}</span></p>}
                {video.completed_at && <p>Concluído em: <span className="text-slate-700">{new Date(video.completed_at).toLocaleDateString('pt-BR')}</span></p>}
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                {video.file_path && !video.ai_processed && (
                  <button
                    onClick={() => handleProcessAI(video)}
                    disabled={processingIds.has(video.id)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {processingIds.has(video.id) ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        Processar com IA
                      </>
                    )}
                  </button>
                )}
                {video.ai_processed && video.ai_summary && !video.description && (
                  <button
                    onClick={() => applyAISuggestion(video)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Aplicar sugestões da IA
                  </button>
                )}
                {!video.file_path && (
                  <button
                    onClick={() => toggleStatus(video)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      video.status === 'pending'
                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                    }`}
                  >
                    {video.status === 'pending' ? 'Marcar implementado' : 'Marcar pendente'}
                  </button>
                )}
                {video.file_path && video.ai_processed && (
                  <button
                    onClick={() => toggleStatus(video)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      video.status === 'pending'
                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                    }`}
                  >
                    {video.status === 'pending' ? 'Implementar' : 'Desfazer'}
                  </button>
                )}
                {video.url && (
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <VideoFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        editing={editing}
        tutors={tutors}
        modules={modules}
        saving={saving}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Excluir vídeo"
        message="Tem certeza que deseja excluir este vídeo? Esta ação não pode ser desfeita."
      />

      {/* Transcription modal */}
      {transcriptionModal && (
        <Modal
          open={!!transcriptionModal}
          onClose={() => setTranscriptionModal(null)}
          title="Transcrição e Análise da IA"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">Resumo</h4>
              <p className="text-sm text-slate-600">{transcriptionModal.ai_summary || 'Nenhum resumo gerado.'}</p>
            </div>

            {transcriptionModal.ai_category && (
              <div className="flex gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 mb-1">Categoria sugerida</h4>
                  <p className="text-sm text-slate-700">{transcriptionModal.ai_category}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 mb-1">Módulo sugerido</h4>
                  <p className="text-sm text-slate-700">{transcriptionModal.ai_module || 'N/A'}</p>
                </div>
              </div>
            )}

            {transcriptionModal.ai_key_steps && (
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-1">Passos importantes</h4>
                <p className="text-sm text-slate-600 whitespace-pre-line">{transcriptionModal.ai_key_steps}</p>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">Transcrição completa</h4>
              <div className="bg-slate-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <p className="text-sm text-slate-600 whitespace-pre-line">{transcriptionModal.transcription || 'Nenhuma transcrição disponível.'}</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" onClick={() => setTranscriptionModal(null)}>Fechar</Button>
              <Button onClick={() => { applyAISuggestion(transcriptionModal); setTranscriptionModal(null); }}>
                <CheckCircle2 className="w-4 h-4" />
                Aplicar sugestões
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

interface VideoFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Video>) => void;
  editing: Video | null;
  tutors: Tutor[];
  modules: Module[];
  saving: boolean;
}

function VideoFormModal({ open, onClose, onSave, editing, tutors, modules, saving }: VideoFormModalProps) {
  const [form, setForm] = useState<Partial<Video>>({});

  useEffect(() => {
    if (editing) {
      setForm(editing);
    } else {
      setForm({
        title: '',
        url: '',
        embed_url: '',
        description: '',
        objective: '',
        key_steps: '',
        status: 'pending',
        notes: '',
        module_id: null,
        tutor_id: null,
        sort_order: 0,
      });
    }
  }, [editing, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar vídeo' : 'Novo vídeo'} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Nome do treinamento *</label>
          <input
            type="text"
            required
            value={form.title || ''}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            placeholder="Ex: Como criar usuários"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>URL do vídeo</label>
            <input
              type="url"
              value={form.url || ''}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className={inputClass}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className={labelClass}>URL de incorporação</label>
            <input
              type="url"
              value={form.embed_url || ''}
              onChange={(e) => setForm({ ...form, embed_url: e.target.value })}
              className={inputClass}
              placeholder="Embed URL (opcional)"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Tutor responsável</label>
            <select
              value={form.tutor_id || ''}
              onChange={(e) => setForm({ ...form, tutor_id: e.target.value || null })}
              className={inputClass}
            >
              <option value="">Sem tutor</option>
              {tutors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Módulo</label>
            <select
              value={form.module_id || ''}
              onChange={(e) => setForm({ ...form, module_id: e.target.value || null })}
              className={inputClass}
            >
              <option value="">Sem módulo</option>
              {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>O que será aprendido</label>
          <textarea
            value={form.description || ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={textareaClass}
            placeholder="Descrição do conteúdo do vídeo"
          />
        </div>

        <div>
          <label className={labelClass}>Objetivo do treinamento</label>
          <textarea
            value={form.objective || ''}
            onChange={(e) => setForm({ ...form, objective: e.target.value })}
            className={textareaClass}
            placeholder="Qual o objetivo deste treinamento?"
          />
        </div>

        <div>
          <label className={labelClass}>Passos importantes</label>
          <textarea
            value={form.key_steps || ''}
            onChange={(e) => setForm({ ...form, key_steps: e.target.value })}
            className={textareaClass}
            placeholder="Liste os passos importantes abordados"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={form.status || 'pending'}
              onChange={(e) => setForm({ ...form, status: e.target.value as Video['status'] })}
              className={inputClass}
            >
              <option value="pending">Pendente</option>
              <option value="implemented">Implementado</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Ordem</label>
            <input
              type="number"
              value={form.sort_order ?? 0}
              onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Observações</label>
          <textarea
            value={form.notes || ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={textareaClass}
            placeholder="Observações adicionais"
          />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
