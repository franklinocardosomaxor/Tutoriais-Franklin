import { useEffect, useState } from 'react';
import { BarChart3, Video as VideoIcon, Image as ImageIcon, Link as LinkIcon, FileText, TrendingUp, Users, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Video, Image as ImageType, Link as LinkType, Document, Tutor, Module, Category } from '@/types/database';
import { LoadingSpinner, PageHeader } from '@/components/shared';

export function ReportsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [images, setImages] = useState<ImageType[]>([]);
  const [links, setLinks] = useState<LinkType[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [v, i, l, d, t, m, c] = await Promise.all([
        supabase.from('videos').select('*, module:modules(*)').eq('user_id', user.id),
        supabase.from('images').select('*').eq('user_id', user.id),
        supabase.from('links').select('*, tutor:tutors(*)').eq('user_id', user.id),
        supabase.from('documents').select('*').eq('user_id', user.id),
        supabase.from('tutors').select('*').eq('user_id', user.id),
        supabase.from('modules').select('*, category:categories(*)').eq('user_id', user.id),
        supabase.from('categories').select('*').eq('user_id', user.id),
      ]);
      setVideos((v.data || []) as Video[]);
      setImages((i.data || []) as ImageType[]);
      setLinks((l.data || []) as LinkType[]);
      setDocuments((d.data || []) as Document[]);
      setTutors((t.data || []) as Tutor[]);
      setModules((m.data || []) as Module[]);
      setCategories((c.data || []) as Category[]);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <LoadingSpinner />;

  // Calculate stats
  const totalContent = videos.length + images.length + links.length + documents.length;
  const completedVideos = videos.filter((v) => v.status === 'implemented').length;
  const concludedImages = images.filter((i) => i.status === 'concluded').length;
  const favoriteLinks = links.filter((l) => l.status === 'favorite').length;
  const studiedDocs = documents.filter((d) => d.status === 'studied').length;
  const totalCompleted = completedVideos + concludedImages + favoriteLinks + studiedDocs;
  const completionRate = totalContent > 0 ? Math.round((totalCompleted / totalContent) * 100) : 0;

  // Per-tutor stats
  const tutorStats = tutors.map((tutor) => {
    const tutorVideos = videos.filter((v) => v.tutor_id === tutor.id);
    const tutorLinks = links.filter((l) => l.tutor_id === tutor.id);
    return {
      tutor,
      videoCount: tutorVideos.length,
      implementedCount: tutorVideos.filter((v) => v.status === 'implemented').length,
      linkCount: tutorLinks.length,
    };
  }).filter((s) => s.videoCount > 0 || s.linkCount > 0);

  // Per-module stats
  const moduleStats = modules.map((mod) => {
    const modVideos = videos.filter((v) => v.module_id === mod.id);
    const modImages = images.filter((i) => i.module_id === mod.id);
    const modLinks = links.filter((l) => l.module_id === mod.id);
    const modDocs = documents.filter((d) => d.module_id === mod.id);
    const total = modVideos.length + modImages.length + modLinks.length + modDocs.length;
    const completed = modVideos.filter((v) => v.status === 'implemented').length +
      modImages.filter((i) => i.status === 'concluded').length +
      modLinks.filter((l) => l.status === 'favorite').length +
      modDocs.filter((d) => d.status === 'studied').length;
    return {
      module: mod,
      total,
      completed,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      breakdown: { videos: modVideos.length, images: modImages.length, links: modLinks.length, documents: modDocs.length },
    };
  }).filter((s) => s.total > 0);

  // Per-category stats
  const categoryStats = categories.map((cat) => {
    const catModules = modules.filter((m) => m.category_id === cat.id);
    const moduleIds = catModules.map((m) => m.id);
    const catVideos = videos.filter((v) => v.module_id && moduleIds.includes(v.module_id));
    const catImages = images.filter((i) => i.module_id && moduleIds.includes(i.module_id));
    const catLinks = links.filter((l) => l.module_id && moduleIds.includes(l.module_id));
    const catDocs = documents.filter((d) => d.module_id && moduleIds.includes(d.module_id));
    const total = catVideos.length + catImages.length + catLinks.length + catDocs.length;
    const completed = catVideos.filter((v) => v.status === 'implemented').length +
      catImages.filter((i) => i.status === 'concluded').length +
      catLinks.filter((l) => l.status === 'favorite').length +
      catDocs.filter((d) => d.status === 'studied').length;
    return { category: cat, total, completed, moduleCount: catModules.length };
  }).filter((s) => s.total > 0 || s.moduleCount > 0);

  const summaryCards = [
    { label: 'Total de conteúdos', value: totalContent, icon: BarChart3, color: 'blue' },
    { label: 'Concluídos', value: totalCompleted, icon: TrendingUp, color: 'emerald' },
    { label: 'Taxa de conclusão', value: `${completionRate}%`, icon: Award, color: 'amber' },
    { label: 'Tutores cadastrados', value: tutors.length, icon: Users, color: 'purple' },
  ];

  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Relatórios" subtitle="Análise detalhada do seu progresso de aprendizado" />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const colors = colorMap[card.color];
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${colors.text}`} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="text-sm text-slate-500">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Content breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Distribuição por tipo</h3>
          <div className="space-y-3">
            {[
              { label: 'Vídeos', count: videos.length, done: completedVideos, icon: VideoIcon, color: 'bg-blue-500' },
              { label: 'Imagens', count: images.length, done: concludedImages, icon: ImageIcon, color: 'bg-emerald-500' },
              { label: 'Links', count: links.length, done: favoriteLinks, icon: LinkIcon, color: 'bg-amber-500' },
              { label: 'Documentos', count: documents.length, done: studiedDocs, icon: FileText, color: 'bg-purple-500' },
            ].map((item) => {
              const Icon = item.icon;
              const pct = item.count > 0 ? (item.done / item.count) * 100 : 0;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">{item.label}</span>
                    </div>
                    <span className="text-sm text-slate-500">{item.done}/{item.count}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Per-tutor stats */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Conteúdos por tutor</h3>
          {tutorStats.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Nenhum conteúdo atribuído a tutores</p>
          ) : (
            <div className="space-y-3">
              {tutorStats.map((s) => (
                <div key={s.tutor.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-sm font-bold">
                      {s.tutor.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{s.tutor.name}</p>
                      <p className="text-xs text-slate-500">{s.videoCount} vídeos • {s.linkCount} links</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-emerald-600">{s.implementedCount} concluídos</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Module progress */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
        <h3 className="font-semibold text-slate-900 mb-4">Progresso por módulo</h3>
        {moduleStats.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Nenhum módulo com conteúdo</p>
        ) : (
          <div className="space-y-4">
            {moduleStats.map((s) => (
              <div key={s.module.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-sm font-medium text-slate-900">{s.module.name}</span>
                    {s.module.category && <span className="text-xs text-slate-400 ml-2">• {s.module.category.name}</span>}
                  </div>
                  <span className="text-sm text-slate-500">{s.completed}/{s.total} ({s.percent}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all" style={{ width: `${s.percent}%` }} />
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                  <span>{s.breakdown.videos} vídeos(s)</span>
                  <span>{s.breakdown.images} imagem(ns)</span>
                  <span>{s.breakdown.links} link(s)</span>
                  <span>{s.breakdown.documents} doc(s)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category overview */}
      {categoryStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Visão por categoria</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryStats.map((s) => (
              <div key={s.category.id} className="border border-slate-100 rounded-xl p-4">
                <h4 className="font-medium text-slate-900 mb-1">{s.category.name}</h4>
                <p className="text-xs text-slate-500 mb-2">{s.moduleCount} módulo(s) • {s.total} conteúdo(s)</p>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.total > 0 ? (s.completed / s.total) * 100 : 0}%` }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">{s.completed} concluídos</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
