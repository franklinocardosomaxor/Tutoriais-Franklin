import { useEffect, useState } from 'react';
import {
  Video as VideoIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Video, Image as ImageType, Link as LinkType, Document, Module, Category } from '@/types/database';
import { LoadingSpinner } from '@/components/shared';
import type { PageId } from '@/components/Layout';

interface DashboardStats {
  totalVideos: number;
  pendingVideos: number;
  implementedVideos: number;
  totalImages: number;
  viewedImages: number;
  concludedImages: number;
  totalLinks: number;
  favoriteLinks: number;
  totalDocuments: number;
  studiedDocuments: number;
}

interface Recommendation {
  type: 'video' | 'image' | 'link' | 'document';
  title: string;
  reason: string;
  moduleId: string | null;
  itemSortOrder: number;
}

export function DashboardPage({ onPageChange }: { onPageChange: (page: PageId) => void }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCompleted, setRecentCompleted] = useState<{ type: string; title: string; date: string }[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);

      const [videosRes, imagesRes, linksRes, docsRes] = await Promise.all([
        supabase.from('videos').select('*').eq('user_id', user.id),
        supabase.from('images').select('*').eq('user_id', user.id),
        supabase.from('links').select('*').eq('user_id', user.id),
        supabase.from('documents').select('*').eq('user_id', user.id),
      ]);

      const videos = (videosRes.data || []) as Video[];
      const images = (imagesRes.data || []) as ImageType[];
      const links = (linksRes.data || []) as LinkType[];
      const documents = (docsRes.data || []) as Document[];

      setStats({
        totalVideos: videos.length,
        pendingVideos: videos.filter((v) => v.status === 'pending').length,
        implementedVideos: videos.filter((v) => v.status === 'implemented').length,
        totalImages: images.length,
        viewedImages: images.filter((i) => i.status === 'viewed').length,
        concludedImages: images.filter((i) => i.status === 'concluded').length,
        totalLinks: links.length,
        favoriteLinks: links.filter((l) => l.status === 'favorite').length,
        totalDocuments: documents.length,
        studiedDocuments: documents.filter((d) => d.status === 'studied').length,
      });

      // Recent completed items
      const completed: { type: string; title: string; date: string }[] = [];
      videos.filter((v) => v.status === 'implemented' && v.completed_at).forEach((v) =>
        completed.push({ type: 'Vídeo', title: v.title, date: v.completed_at! })
      );
      images.filter((i) => i.status === 'concluded').forEach((i) =>
        completed.push({ type: 'Imagem', title: i.title, date: i.created_at })
      );
      documents.filter((d) => d.status === 'studied').forEach((d) =>
        completed.push({ type: 'Documento', title: d.title, date: d.created_at })
      );
      completed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentCompleted(completed.slice(0, 5));

      // Recommendation: find next pending video in sequence
      const pendingVideos = videos
        .filter((v) => v.status === 'pending')
        .sort((a, b) => a.sort_order - b.sort_order);

      if (pendingVideos.length > 0) {
        const next = pendingVideos[0];
        const moduleInfo = next.module_id
          ? (await supabase.from('modules').select('*, category:categories(*)').eq('id', next.module_id).maybeSingle()).data as Module | null
          : null;

        const lastCompleted = videos
          .filter((v) => v.status === 'implemented')
          .sort((a, b) => a.sort_order - b.sort_order)
          .pop();

        let reason = 'Continue de onde você parou.';
        if (lastCompleted && next.sort_order === lastCompleted.sort_order + 1) {
          reason = `Você concluiu "${lastCompleted.title}". Este é o próximo passo recomendado.`;
        } else if (moduleInfo) {
          reason = `Próximo conteúdo do módulo "${moduleInfo.name}".`;
        }

        setRecommendation({
          type: 'video',
          title: next.title,
          reason,
          moduleId: next.module_id,
          itemSortOrder: next.sort_order,
        });
      } else {
        // Check for pending images
        const pendingImages = images
          .filter((i) => i.status !== 'concluded')
          .sort((a, b) => a.step_number - b.step_number);
        if (pendingImages.length > 0) {
          setRecommendation({
            type: 'image',
            title: pendingImages[0].title,
            reason: 'Você tem imagens de aprendizado visual pendentes para revisar.',
            moduleId: pendingImages[0].module_id,
            itemSortOrder: pendingImages[0].sort_order,
          });
        } else {
          setRecommendation(null);
        }
      }

      setLoading(false);
    })();
  }, [user]);

  if (loading) return <LoadingSpinner />;
  if (!stats) return null;

  const totalContent = stats.totalVideos + stats.totalImages + stats.totalLinks + stats.totalDocuments;
  const completedContent = stats.implementedVideos + stats.concludedImages + stats.favoriteLinks + stats.studiedDocuments;
  const progressPercent = totalContent > 0 ? Math.round((completedContent / totalContent) * 100) : 0;

  const cards = [
    {
      label: 'Vídeos',
      total: stats.totalVideos,
      pending: stats.pendingVideos,
      done: stats.implementedVideos,
      icon: VideoIcon,
      color: 'blue',
      page: 'videos' as PageId,
    },
    {
      label: 'Imagens',
      total: stats.totalImages,
      pending: stats.totalImages - stats.concludedImages,
      done: stats.concludedImages,
      icon: ImageIcon,
      color: 'emerald',
      page: 'images' as PageId,
    },
    {
      label: 'Links',
      total: stats.totalLinks,
      pending: stats.totalLinks - stats.favoriteLinks,
      done: stats.favoriteLinks,
      icon: LinkIcon,
      color: 'amber',
      page: 'links' as PageId,
    },
    {
      label: 'Documentos',
      total: stats.totalDocuments,
      pending: stats.totalDocuments - stats.studiedDocuments,
      done: stats.studiedDocuments,
      icon: FileText,
      color: 'purple',
      page: 'tutorials' as PageId,
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; bar: string; hover: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', bar: 'bg-blue-500', hover: 'hover:bg-blue-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500', hover: 'hover:bg-emerald-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', bar: 'bg-amber-500', hover: 'hover:bg-amber-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', bar: 'bg-purple-500', hover: 'hover:bg-purple-100' },
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Visão geral do seu progresso de aprendizado</p>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold text-slate-900">Progresso geral</h2>
          </div>
          <span className="text-2xl font-bold text-slate-900">{progressPercent}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-slate-600">{completedContent} concluídos</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-slate-600">{totalContent - completedContent} pendentes</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600">{totalContent} conteúdos no total</span>
          </div>
        </div>
      </div>

      {/* Recommendation card */}
      {recommendation && (
        <div className="bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl p-6 mb-6 shadow-lg shadow-blue-500/10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white/80 text-sm font-medium mb-1">Próximo passo recomendado</p>
              <h3 className="text-white text-lg font-bold mb-1">{recommendation.title}</h3>
              <p className="text-white/80 text-sm">{recommendation.reason}</p>
              <button
                onClick={() => onPageChange(recommendation.type === 'video' ? 'videos' : recommendation.type === 'image' ? 'images' : 'tutorials')}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                Acessar agora
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card) => {
          const Icon = card.icon;
          const colors = colorMap[card.color];
          const percent = card.total > 0 ? Math.round((card.done / card.total) * 100) : 0;
          return (
            <button
              key={card.label}
              onClick={() => onPageChange(card.page)}
              className="bg-white rounded-2xl border border-slate-200 p-5 text-left shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center ${colors.hover} transition-colors`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <span className="text-2xl font-bold text-slate-900">{card.total}</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{card.label}</h3>
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  {card.done} concluídos
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-500" />
                  {card.pending} pendentes
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${colors.bar} rounded-full transition-all`} style={{ width: `${percent}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-4">Atividade recente</h2>
        {recentCompleted.length === 0 ? (
          <div className="flex items-center gap-3 text-slate-500 text-sm py-4">
            <AlertCircle className="w-5 h-5 text-slate-400" />
            Nenhum conteúdo concluído ainda. Comece assistindo a um vídeo!
          </div>
        ) : (
          <div className="space-y-3">
            {recentCompleted.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.type} • {new Date(item.date).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
