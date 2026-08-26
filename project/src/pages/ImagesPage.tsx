import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Image as ImageIcon, Search, ArrowDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Image as ImageType, Module } from '@/types/database';
import { Modal, StatusBadge, EmptyState, ConfirmDialog } from '@/components/ui';
import { Button, LoadingSpinner, PageHeader, inputClass, labelClass, textareaClass } from '@/components/shared';

export function ImagesPage() {
  const { user } = useAuth();
  const [images, setImages] = useState<ImageType[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ImageType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [iRes, mRes] = await Promise.all([
      supabase.from('images').select('*, module:modules(*)').eq('user_id', user.id).order('module_id').order('sort_order'),
      supabase.from('modules').select('*').eq('user_id', user.id).order('sort_order'),
    ]);
    setImages((iRes.data || []) as ImageType[]);
    setModules((mRes.data || []) as Module[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async (formData: Partial<ImageType>) => {
    if (!user) return;
    setSaving(true);
    const payload = { ...formData, user_id: user.id } as Partial<ImageType>;
    if (editing) {
      await supabase.from('images').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('images').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    setEditing(null);
    loadData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('images').delete().eq('id', id);
    loadData();
  };

  const cycleStatus = async (image: ImageType) => {
    const order: ImageType['status'][] = ['pending', 'viewed', 'concluded'];
    const next = order[(order.indexOf(image.status) + 1) % order.length];
    await supabase.from('images').update({ status: next }).eq('id', image.id);
    loadData();
  };

  const filtered = images.filter((i) => {
    const matchesSearch = i.title.toLowerCase().includes(search.toLowerCase());
    const matchesModule = moduleFilter === 'all' || i.module_id === moduleFilter;
    return matchesSearch && matchesModule;
  });

  // Group by module
  const grouped = filtered.reduce((acc, img) => {
    const key = img.module_id || 'no-module';
    if (!acc[key]) acc[key] = [];
    acc[key].push(img);
    return acc;
  }, {} as Record<string, ImageType[]>);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Imagens"
        subtitle="Sequência de aprendizado visual passo a passo"
        action={
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="w-4 h-4" />
            Nova imagem
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar imagens..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className={`${inputClass} sm:w-56`}
        >
          <option value="all">Todos os módulos</option>
          {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="w-8 h-8" />}
          title={search ? "Nenhuma imagem encontrada" : "Nenhuma imagem cadastrada"}
          description={search ? "Tente outra busca" : "Crie sequências de aprendizado visual com imagens passo a passo"}
          action={!search && (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Adicionar imagem
            </Button>
          )}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([moduleKey, imgs]) => (
            <div key={moduleKey} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4">
                {moduleKey === 'no-module' ? 'Sem módulo' : imgs[0]?.module?.name || 'Módulo'}
              </h3>
              <div className="space-y-3">
                {imgs.map((img, idx) => (
                  <div key={img.id}>
                    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                        {img.step_number || idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-slate-900 truncate">{img.title}</h4>
                            {img.explanation && <p className="text-slate-500 text-sm mt-0.5 line-clamp-2">{img.explanation}</p>}
                            {img.tutor_notes && <p className="text-slate-400 text-xs mt-1 italic">Nota do tutor: {img.tutor_notes}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <StatusBadge status={img.status} />
                            <button onClick={() => { setEditing(img); setModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleteId(img.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => cycleStatus(img)}
                          className="mt-2 text-xs font-medium text-blue-500 hover:text-blue-600"
                        >
                          Alterar status: {img.status === 'pending' ? 'Pendente' : img.status === 'viewed' ? 'Visualizado' : 'Concluído'} →
                        </button>
                      </div>
                    </div>
                    {idx < imgs.length - 1 && (
                      <div className="flex justify-center py-1">
                        <ArrowDown className="w-4 h-4 text-slate-300" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ImageFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        editing={editing}
        modules={modules}
        saving={saving}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Excluir imagem"
        message="Tem certeza que deseja excluir esta imagem? Esta ação não pode ser desfeita."
      />
    </div>
  );
}

interface ImageFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<ImageType>) => void;
  editing: ImageType | null;
  modules: Module[];
  saving: boolean;
}

function ImageFormModal({ open, onClose, onSave, editing, modules, saving }: ImageFormModalProps) {
  const [form, setForm] = useState<Partial<ImageType>>({});

  useEffect(() => {
    if (editing) {
      setForm(editing);
    } else {
      setForm({
        step_number: 1,
        title: '',
        image_url: '',
        explanation: '',
        tutor_notes: '',
        status: 'pending',
        module_id: null,
        sort_order: 0,
      });
    }
  }, [editing, open]);

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar imagem' : 'Nova imagem'} maxWidth="max-w-xl">
      <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Número da etapa *</label>
            <input
              type="number"
              required
              min={1}
              value={form.step_number ?? 1}
              onChange={(e) => setForm({ ...form, step_number: parseInt(e.target.value) || 1 })}
              className={inputClass}
            />
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
          <label className={labelClass}>Título *</label>
          <input
            type="text"
            required
            value={form.title || ''}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            placeholder="Ex: Tela inicial do sistema"
          />
        </div>

        <div>
          <label className={labelClass}>URL da imagem</label>
          <input
            type="url"
            value={form.image_url || ''}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            className={inputClass}
            placeholder="https://..."
          />
        </div>

        <div>
          <label className={labelClass}>Explicação</label>
          <textarea
            value={form.explanation || ''}
            onChange={(e) => setForm({ ...form, explanation: e.target.value })}
            className={textareaClass}
            placeholder="Ex: Clique no menu configurações para iniciar"
          />
        </div>

        <div>
          <label className={labelClass}>Observação do tutor</label>
          <textarea
            value={form.tutor_notes || ''}
            onChange={(e) => setForm({ ...form, tutor_notes: e.target.value })}
            className={textareaClass}
            placeholder="Observações do tutor sobre esta etapa"
          />
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <select
            value={form.status || 'pending'}
            onChange={(e) => setForm({ ...form, status: e.target.value as ImageType['status'] })}
            className={inputClass}
          >
            <option value="pending">Pendente</option>
            <option value="viewed">Visualizado</option>
            <option value="concluded">Concluído</option>
          </select>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
