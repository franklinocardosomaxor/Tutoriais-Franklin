import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Users, Mail, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Tutor } from '@/types/database';
import { Modal, EmptyState, ConfirmDialog } from '@/components/ui';
import { Button, LoadingSpinner, PageHeader, inputClass, labelClass, textareaClass } from '@/components/shared';

export function TutorsPage() {
  const { user } = useAuth();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tutor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('tutors').select('*').eq('user_id', user.id).order('name');
    setTutors((data || []) as Tutor[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async (formData: Partial<Tutor>) => {
    if (!user) return;
    setSaving(true);
    const payload = { ...formData, user_id: user.id } as Partial<Tutor>;
    if (editing) {
      await supabase.from('tutors').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('tutors').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    setEditing(null);
    loadData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('tutors').delete().eq('id', id);
    loadData();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Tutores"
        subtitle="Gerencie os responsáveis pelos treinamentos"
        action={
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="w-4 h-4" />
            Novo tutor
          </Button>
        }
      />

      {tutors.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="Nenhum tutor cadastrado"
          description="Cadastre os tutores responsáveis pelos seus conteúdos de aprendizado"
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Adicionar tutor
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tutors.map((tutor) => (
            <div key={tutor.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                  {tutor.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(tutor); setModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteId(tutor.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 mb-2">{tutor.name}</h3>

              <div className="space-y-1.5 text-sm text-slate-500">
                {tutor.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    {tutor.email}
                  </p>
                )}
                {tutor.specialty && (
                  <p className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5" />
                    {tutor.specialty}
                  </p>
                )}
              </div>

              {tutor.bio && <p className="text-slate-500 text-sm mt-3 line-clamp-3">{tutor.bio}</p>}
            </div>
          ))}
        </div>
      )}

      <TutorFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        editing={editing}
        saving={saving}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Excluir tutor"
        message="Tem certeza que deseja excluir este tutor? Esta ação não pode ser desfeita."
      />
    </div>
  );
}

interface TutorFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Tutor>) => void;
  editing: Tutor | null;
  saving: boolean;
}

function TutorFormModal({ open, onClose, onSave, editing, saving }: TutorFormModalProps) {
  const [form, setForm] = useState<Partial<Tutor>>({});

  useEffect(() => {
    if (editing) {
      setForm(editing);
    } else {
      setForm({ name: '', email: '', specialty: '', bio: '' });
    }
  }, [editing, open]);

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar tutor' : 'Novo tutor'} maxWidth="max-w-lg">
      <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4">
        <div>
          <label className={labelClass}>Nome *</label>
          <input
            type="text"
            required
            value={form.name || ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            placeholder="Nome do tutor"
          />
        </div>

        <div>
          <label className={labelClass}>E-mail</label>
          <input
            type="email"
            value={form.email || ''}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClass}
            placeholder="tutor@email.com"
          />
        </div>

        <div>
          <label className={labelClass}>Especialidade</label>
          <input
            type="text"
            value={form.specialty || ''}
            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
            className={inputClass}
            placeholder="Ex: Configuração de sistemas"
          />
        </div>

        <div>
          <label className={labelClass}>Biografia</label>
          <textarea
            value={form.bio || ''}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className={textareaClass}
            placeholder="Breve descrição sobre o tutor"
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
