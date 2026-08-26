import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Link as LinkIcon, Search, ExternalLink, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Link as LinkType, Tutor, Module } from '@/types/database';
import { Modal, StatusBadge, EmptyState, ConfirmDialog } from '@/components/ui';
import { Button, LoadingSpinner, PageHeader, inputClass, labelClass, textareaClass } from '@/components/shared';

export function LinksPage() {
  const { user } = useAuth();
  const [links, setLinks] = useState<LinkType[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LinkType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [lRes, tRes, mRes] = await Promise.all([
      supabase.from('links').select('*, module:modules(*), tutor:tutors(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('tutors').select('*').eq('user_id', user.id).order('name'),
      supabase.from('modules').select('*').eq('user_id', user.id).order('sort_order'),
    ]);
    setLinks((lRes.data || []) as LinkType[]);
    setTutors((tRes.data || []) as Tutor[]);
    setModules((mRes.data || []) as Module[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async (formData: Partial<LinkType>) => {
    if (!user) return;
    setSaving(true);
    const payload = { ...formData, user_id: user.id } as Partial<LinkType>;
    if (editing) {
      await supabase.from('links').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('links').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    setEditing(null);
    loadData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('links').delete().eq('id', id);
    loadData();
  };

  const toggleFavorite = async (link: LinkType) => {
    await supabase.from('links').update({
      status: link.status === 'favorite' ? 'consulted' : 'favorite',
    }).eq('id', link.id);
    loadData();
  };

  const filtered = links.filter((l) => {
    const matchesSearch = l.site_name.toLowerCase().includes(search.toLowerCase()) || l.url.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Links"
        subtitle="Recursos externos e sites indicados"
        action={
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="w-4 h-4" />
            Novo link
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar links..."
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
          <option value="consulted">Consultados</option>
          <option value="favorite">Favoritos</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<LinkIcon className="w-8 h-8" />}
          title={search ? "Nenhum link encontrado" : "Nenhum link cadastrado"}
          description={search ? "Tente outra busca" : "Salve links de sites e recursos importantes para seus estudos"}
          action={!search && (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Adicionar link
            </Button>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((link) => (
            <div key={link.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                    <LinkIcon className="w-4 h-4 text-amber-500" />
                  </div>
                  <StatusBadge status={link.status} />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleFavorite(link)}
                    className={`p-1.5 rounded-lg transition-colors ${link.status === 'favorite' ? 'text-yellow-500 bg-yellow-50' : 'text-slate-300 hover:text-yellow-500 hover:bg-yellow-50'}`}
                  >
                    <Star className={`w-4 h-4 ${link.status === 'favorite' ? 'fill-current' : ''}`} />
                  </button>
                  <button onClick={() => { setEditing(link); setModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteId(link.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 mb-1">{link.site_name}</h3>
              {link.purpose && <p className="text-slate-500 text-sm line-clamp-2 mb-3">{link.purpose}</p>}

              <div className="space-y-1 text-xs text-slate-500 mb-3">
                {link.tutor && <p>Tutor: <span className="text-slate-700 font-medium">{link.tutor.name}</span></p>}
                {link.module && <p>Módulo: <span className="text-slate-700 font-medium">{link.module.name}</span></p>}
              </div>

              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 font-medium truncate"
              >
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{link.url}</span>
              </a>
            </div>
          ))}
        </div>
      )}

      <LinkFormModal
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
        title="Excluir link"
        message="Tem certeza que deseja excluir este link? Esta ação não pode ser desfeita."
      />
    </div>
  );
}

interface LinkFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<LinkType>) => void;
  editing: LinkType | null;
  tutors: Tutor[];
  modules: Module[];
  saving: boolean;
}

function LinkFormModal({ open, onClose, onSave, editing, tutors, modules, saving }: LinkFormModalProps) {
  const [form, setForm] = useState<Partial<LinkType>>({});

  useEffect(() => {
    if (editing) {
      setForm(editing);
    } else {
      setForm({
        site_name: '',
        url: '',
        purpose: '',
        status: 'consulted',
        module_id: null,
        tutor_id: null,
      });
    }
  }, [editing, open]);

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar link' : 'Novo link'} maxWidth="max-w-lg">
      <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4">
        <div>
          <label className={labelClass}>Nome do site *</label>
          <input
            type="text"
            required
            value={form.site_name || ''}
            onChange={(e) => setForm({ ...form, site_name: e.target.value })}
            className={inputClass}
            placeholder="Ex: Documentação oficial"
          />
        </div>

        <div>
          <label className={labelClass}>Endereço (URL) *</label>
          <input
            type="url"
            required
            value={form.url || ''}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className={inputClass}
            placeholder="https://..."
          />
        </div>

        <div>
          <label className={labelClass}>Para que serve</label>
          <textarea
            value={form.purpose || ''}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            className={textareaClass}
            placeholder="Descreva a utilidade deste recurso"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Tutor que indicou</label>
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
          <label className={labelClass}>Status</label>
          <select
            value={form.status || 'consulted'}
            onChange={(e) => setForm({ ...form, status: e.target.value as LinkType['status'] })}
            className={inputClass}
          >
            <option value="consulted">Consultado</option>
            <option value="favorite">Favorito</option>
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
