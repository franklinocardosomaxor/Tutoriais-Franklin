import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, FolderTree, ChevronRight, FolderOpen, Layers, Video as VideoIcon, Image as ImageIcon, Link as LinkIcon, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Category, Module, Image as ImageType, Link as LinkType, Document } from '@/types/database';
import { Modal, EmptyState, ConfirmDialog } from '@/components/ui';
import { Button, LoadingSpinner, PageHeader, inputClass, labelClass, textareaClass } from '@/components/shared';

const ICON_OPTIONS = ['FolderOpen', 'Video', 'Image', 'Link', 'FileText', 'Layers', 'Settings', 'BookOpen'];

export function TutorialsPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [moduleContent, setModuleContent] = useState<Record<string, { videos: number; images: number; links: number; documents: number }>>({});
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [categoryModal, setCategoryModal] = useState(false);
  const [moduleModal, setModuleModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [deleteModuleId, setDeleteModuleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [moduleForNew, setModuleForNew] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [cRes, mRes] = await Promise.all([
      supabase.from('categories').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('modules').select('*').eq('user_id', user.id).order('sort_order'),
    ]);
    const cats = (cRes.data || []) as Category[];
    const mods = (mRes.data || []) as Module[];
    setCategories(cats);
    setModules(mods);

    // Count content per module
    const contentMap: Record<string, { videos: number; images: number; links: number; documents: number }> = {};
    await Promise.all(mods.map(async (m) => {
      const [v, i, l, d] = await Promise.all([
        supabase.from('videos').select('id', { count: 'exact', head: true }).eq('module_id', m.id),
        supabase.from('images').select('id', { count: 'exact', head: true }).eq('module_id', m.id),
        supabase.from('links').select('id', { count: 'exact', head: true }).eq('module_id', m.id),
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('module_id', m.id),
      ]);
      contentMap[m.id] = {
        videos: v.count || 0,
        images: i.count || 0,
        links: l.count || 0,
        documents: d.count || 0,
      };
    }));
    setModuleContent(contentMap);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveCategory = async (formData: Partial<Category>) => {
    if (!user) return;
    setSaving(true);
    const payload = { ...formData, user_id: user.id } as Partial<Category>;
    if (editingCategory) {
      await supabase.from('categories').update(payload).eq('id', editingCategory.id);
    } else {
      await supabase.from('categories').insert(payload);
    }
    setSaving(false);
    setCategoryModal(false);
    setEditingCategory(null);
    loadData();
  };

  const handleSaveModule = async (formData: Partial<Module>) => {
    if (!user) return;
    setSaving(true);
    const payload = { ...formData, user_id: user.id } as Partial<Module>;
    if (editingModule) {
      await supabase.from('modules').update(payload).eq('id', editingModule.id);
    } else {
      await supabase.from('modules').insert(payload);
    }
    setSaving(false);
    setModuleModal(false);
    setEditingModule(null);
    setModuleForNew(null);
    loadData();
  };

  const handleDeleteCategory = async (id: string) => {
    await supabase.from('categories').delete().eq('id', id);
    loadData();
  };

  const handleDeleteModule = async (id: string) => {
    await supabase.from('modules').delete().eq('id', id);
    loadData();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Tutoriais"
        subtitle="Organize seus conteúdos em categorias e módulos"
        action={
          <Button onClick={() => { setEditingCategory(null); setCategoryModal(true); }}>
            <Plus className="w-4 h-4" />
            Nova categoria
          </Button>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={<FolderTree className="w-8 h-8" />}
          title="Nenhuma categoria criada"
          description="Crie categorias para organizar seus treinamentos em módulos estruturados"
          action={
            <Button onClick={() => setCategoryModal(true)}>
              <Plus className="w-4 h-4" />
              Criar categoria
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const catModules = modules.filter((m) => m.category_id === cat.id);
            const isExpanded = expandedCategory === cat.id;
            return (
              <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{cat.name}</h3>
                      <p className="text-xs text-slate-500">{catModules.length} módulo(s)</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditingModule(null); setModuleForNew(cat.id); setModuleModal(true); }}
                      className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Adicionar módulo"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setEditingCategory(cat); setCategoryModal(true); }} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteCategoryId(cat.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-2">
                    {catModules.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">
                        Nenhum módulo nesta categoria. Clique no + para adicionar.
                      </p>
                    ) : (
                      catModules.map((mod) => {
                        const content = moduleContent[mod.id] || { videos: 0, images: 0, links: 0, documents: 0 };
                        const total = content.videos + content.images + content.links + content.documents;
                        return (
                          <div key={mod.id} className="bg-white rounded-xl border border-slate-200 p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-slate-400" />
                                <h4 className="font-medium text-slate-900">{mod.name}</h4>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => { setEditingModule(mod); setModuleModal(true); }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setDeleteModuleId(mod.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            {mod.description && <p className="text-sm text-slate-500 mb-2">{mod.description}</p>}
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span className="flex items-center gap-1"><VideoIcon className="w-3 h-3" /> {content.videos} vídeos</span>
                              <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> {content.images} imagens</span>
                              <span className="flex items-center gap-1"><LinkIcon className="w-3 h-3" /> {content.links} links</span>
                              <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {content.documents} docs</span>
                              <span className="ml-auto font-medium text-slate-400">{total} conteúdos</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Category Modal */}
      <CategoryFormModal
        open={categoryModal}
        onClose={() => { setCategoryModal(false); setEditingCategory(null); }}
        onSave={handleSaveCategory}
        editing={editingCategory}
        saving={saving}
      />

      {/* Module Modal */}
      <ModuleFormModal
        open={moduleModal}
        onClose={() => { setModuleModal(false); setEditingModule(null); setModuleForNew(null); }}
        onSave={handleSaveModule}
        editing={editingModule}
        categories={categories}
        defaultCategoryId={moduleForNew}
        saving={saving}
      />

      <ConfirmDialog
        open={!!deleteCategoryId}
        onClose={() => setDeleteCategoryId(null)}
        onConfirm={() => deleteCategoryId && handleDeleteCategory(deleteCategoryId)}
        title="Excluir categoria"
        message="Esta ação excluirá a categoria e todos os módulos dentro dela. Tem certeza?"
      />

      <ConfirmDialog
        open={!!deleteModuleId}
        onClose={() => setDeleteModuleId(null)}
        onConfirm={() => deleteModuleId && handleDeleteModule(deleteModuleId)}
        title="Excluir módulo"
        message="Tem certeza que deseja excluir este módulo?"
      />
    </div>
  );
}

function CategoryFormModal({ open, onClose, onSave, editing, saving }: {
  open: boolean; onClose: () => void; onSave: (d: Partial<Category>) => void; editing: Category | null; saving: boolean;
}) {
  const [form, setForm] = useState<Partial<Category>>({});

  useEffect(() => {
    if (editing) setForm(editing);
    else setForm({ name: '', description: '', icon: 'FolderOpen', sort_order: 0 });
  }, [editing, open]);

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar categoria' : 'Nova categoria'}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4">
        <div>
          <label className={labelClass}>Nome da categoria *</label>
          <input type="text" required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Ex: Configuração do Sistema" />
        </div>
        <div>
          <label className={labelClass}>Descrição</label>
          <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className={textareaClass} placeholder="Descrição da categoria" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Ícone</label>
            <select value={form.icon || 'FolderOpen'} onChange={(e) => setForm({ ...form, icon: e.target.value })} className={inputClass}>
              {ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Ordem</label>
            <input type="number" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className={inputClass} />
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ModuleFormModal({ open, onClose, onSave, editing, categories, defaultCategoryId, saving }: {
  open: boolean; onClose: () => void; onSave: (d: Partial<Module>) => void; editing: Module | null; categories: Category[]; defaultCategoryId: string | null; saving: boolean;
}) {
  const [form, setForm] = useState<Partial<Module>>({});

  useEffect(() => {
    if (editing) setForm(editing);
    else setForm({ name: '', description: '', category_id: defaultCategoryId || '', sort_order: 0 });
  }, [editing, open, defaultCategoryId]);

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar módulo' : 'Novo módulo'}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4">
        <div>
          <label className={labelClass}>Nome do módulo *</label>
          <input type="text" required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Ex: Módulo 01 - User Management" />
        </div>
        <div>
          <label className={labelClass}>Categoria *</label>
          <select required value={form.category_id || ''} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className={inputClass}>
            <option value="">Selecione uma categoria</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Descrição</label>
          <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className={textareaClass} placeholder="Descrição do módulo" />
        </div>
        <div>
          <label className={labelClass}>Ordem</label>
          <input type="number" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className={inputClass} />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
