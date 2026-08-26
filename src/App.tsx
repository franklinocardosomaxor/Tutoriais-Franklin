import { useState, useCallback, useEffect } from 'react';
import { Upload, FolderOpen, ChevronRight, CheckCircle2, Clock, BookOpen, ChevronDown, PlusCircle, RefreshCw, AlertCircle } from 'lucide-react';
import type { ItemConteudo, CategoriaArvore, StatusItem } from './lib/tipos';
import { processarArquivo } from './lib/processador-ia';
import { extrairTextoELinks } from './lib/leitor-word';

const CHAVE_OPENAI = import.meta.env.VITE_OPENAI_API_KEY || '';

const salvarDados = (dados: ItemConteudo[]) => localStorage.setItem('painel_conteudos', JSON.stringify(dados));
const carregarDados = (): ItemConteudo[] => JSON.parse(localStorage.getItem('painel_conteudos') || '[]').map(i => ({
  ...i,
  dataAdicionado: new Date(i.dataAdicionado)
}));

function lerImagemReduzida(arquivo: File): Promise<string> {
  return new Promise(resolve => {
    const leitor = new FileReader();
    leitor.onload = e => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(img.width, 800);
        canvas.height = Math.round(img.height * (canvas.width / img.width));
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
      };
      img.src = e.target?.result as string;
    };
    leitor.readAsDataURL(arquivo);
  });
}

export default function App() {
  const [itens, setItens] = useState<ItemConteudo[]>(carregarDados);
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });
  const [erro, setErro] = useState<string | null>(null);
  const [menuAberto, setMenuAberto] = useState<Record<string, boolean>>({});

  useEffect(() => { salvarDados(itens); }, [itens]);

  const arvore: CategoriaArvore[] = itens.reduce((raiz, item) => {
    let cat = raiz.find(c => c.nome === item.categoria);
    if (!cat) { cat = { nome: item.categoria, filhos: [], itens: [] }; raiz.push(cat); }
    let sub = cat.filhos.find(s => s.nome === item.subtopico);
    if (!sub) { sub = { nome: item.subtopico, filhos: [], itens: [] }; cat.filhos.push(sub); }
    sub.itens.push(item);
    sub.itens.sort((a, b) => (a.numeroOrdem || 9999) - (b.numeroOrdem || 9999));
    return raiz;
  }, [] as CategoriaArvore[]).sort((a, b) => a.nome.localeCompare(b.nome));

  const processarArquivosSelecionados = useCallback(async (arquivos: File[]) => {
    try {
      setErro(null);
      if (!arquivos.length) return;
      if (!CHAVE_OPENAI) { setErro('⚠️ Coloque sua chave OpenAI no arquivo .env'); return; }

      setProcessando(true);
      const novosItens: ItemConteudo[] = [];

      for (let i = 0; i < arquivos.length; i++) {
        const arq = arquivos[i];
        setProgresso({ atual: i + 1, total: arquivos.length });

        if (arq.name.endsWith('.docx') || arq.name.endsWith('.txt')) {
          const linhas = await extrairTextoELinks(arq);
          for (const linha of linhas) {
            const item = await processarArquivo(arq, 'link', linha.conteudo, undefined, CHAVE_OPENAI);
            item.nomeOriginal = linha.nome;
            novosItens.push(item);
          }
        } else if (['.jpg', '.jpeg', '.png', '.webp'].some(ext => arq.name.endsWith(ext))) {
          const b64 = await lerImagemReduzida(arq);
          novosItens.push(await processarArquivo(arq, 'imagem', undefined, b64, CHAVE_OPENAI));
        } else {
          novosItens.push(await processarArquivo(arq, 'video', undefined, undefined, CHAVE_OPENAI));
        }
      }

      setItens(antigos => [...antigos, ...novosItens]);
      alert(`✅ Pronto! Adicionado: ${novosItens.length} item(ns) — Total: ${itens.length + novosItens.length}`);
    } catch (err) {
      setErro(String(err));
    } finally {
      setProcessando(false);
    }
  }, [itens]);

  const aoEscolher = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivos = Array.from(e.target.files || []);
    processarArquivosSelecionados(arquivos);
  };

  const recomecarTudo = () => {
    if (!confirm('⚠️ Apagar TUDO e recomeçar do zero?')) return;
    localStorage.removeItem('painel_conteudos');
    setItens([]);
    setErro(null);
  };

  const mudarStatus = (id: string, novo: StatusItem) => {
    setItens(lista => lista.map(i => i.id === id ? { ...i, status: novo } : i));
  };

  const contadores = {
    total: itens.length,
    pendentes: itens.filter(i => i.status === 'pendente').length,
    feito: itens.filter(i => i.status === 'implementado').length,
    imagens: itens.filter(i => i.tipo === 'imagem').length,
    videos: itens.filter(i => i.tipo === 'video').length,
    links: itens.filter(i => i.tipo === 'link').length
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <aside className="w-80 border-r bg-white p-4 overflow-auto">
        <h1 className="text-xl font-bold mb-4 flex items-center gap-2"><BookOpen size={22} /> Organizador Tutoriais</h1>

        <div className="mb-6 space-y-3">
          {itens.length === 0 ? (
            <label className="block border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50 transition">
              <input type="file" multiple accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.docx,.txt" onChange={aoEscolher} disabled={processando} className="hidden" />
              <Upload className="mx-auto mb-2 text-blue-600" size={28} />
              <span className="font-medium">{processando ? `Processando… ${progresso.atual}/${progresso.total}` : '📂 Carregar Arquivos'}</span>
              <p className="text-xs text-slate-500 mt-1">Vídeos, imagens e Lista_Links.txt</p>
            </label>
          ) : (
            <div className="space-y-2">
              <label className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-sm cursor-pointer">
                <input type="file" multiple accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.docx,.txt" onChange={aoEscolher} disabled={processando} className="hidden" id="arquivos-novos" />
                <PlusCircle size={20} /> ➕ Incluir Novos Arquivos
              </label>
              <button onClick={recomecarTudo} className="w-full text-sm text-slate-500 hover:text-red-600 py-1.5 flex items-center justify-center gap-1">
                <RefreshCw size={14} /> Recomeçar do Zero
              </button>
              <p className="text-xs text-slate-400 text-center py-1">
                {processando ? `🔄 Analisando… ${progresso.atual}/${progresso.total}` : `✅ ${itens.length} itens salvos`}
              </p>
            </div>
          )}
          {erro && <p className="bg-red-50 text-red-700 p-2 rounded text-sm flex gap-2"><AlertCircle size={16} /> {erro}</p>}
        </div>

        <nav>
          {arvore.length > 0 ? arvore.map(cat => (
            <div key={cat.nome} className="mb-1">
              <button onClick={() => setMenuAberto(p => ({ ...p, ['cat-' + cat.nome]: !p['cat-' + cat.nome] }))}
                className="flex items-center justify-between w-full p-2 rounded hover:bg-slate-100 font-medium">
                {menuAberto['cat-' + cat.nome] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                {cat.nome}
                <span className="ml-auto text-xs text-slate-400">{cat.filhos.reduce((s, f) => s + f.itens.length, 0)}</span>
              </button>
              {menuAberto['cat-' + cat.nome] && (
                <div className="ml-3 border-l pl-2">
                  {cat.filhos.map(sub => (
                    <div key={sub.nome} className="mb-1">
                      <button onClick={() => setMenuAberto(p => ({ ...p, ['sub-' + cat.nome + sub.nome]: !p['sub-' + cat.nome + sub.nome] }))}
                        className="flex items-center justify-between w-full p-1.5 rounded hover:bg-slate-100 text-sm">
                        {menuAberto['sub-' + cat.nome + sub.nome] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        {sub.nome}
                        <span className="ml-auto text-xs text-slate-400">{sub.itens.length}</span>
                      </button>
                      {menuAberto['sub-' + cat.nome + sub.nome] && (
                        <div className="ml-3 space-y-1 mt-0.5">
                          {sub.itens.map(item => (
                            <div key={item.id} className={`p-2 rounded text-sm border ${
                              item.status === 'implementado' ? 'bg-emerald-50 border-emerald-200' :
                              item.status === 'estudado' ? 'bg-sky-50 border-sky-200' :
                              item.status === 'revisar' ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'
                            }`}>
                              <div className="font-medium">{item.titulo}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{item.descricao}</div>
                              {item.grupoSequencia && (
                                <div className="text-xs text-blue-600 mt-0.5 italic">
                                  {item.grupoSequencia}{item.numeroOrdem ? ` — Etapa ${item.numeroOrdem}` : ''}
                                </div>
                              )}
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {(['pendente', 'estudado', 'implementado', 'revisar'] as StatusItem[]).map(s => (
                                  <button key={s} onClick={() => mudarStatus(item.id, s)}
                                    className={`px-2 py-0.5 rounded text-xs capitalize ${item.status === s ? 'ring-1 ring-slate-400 bg-slate-100' : ''}`}>
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )) : (
            <div className="text-center py-10 text-slate-400">
              <FolderOpen size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Ainda sem conteúdo</p>
            </div>
          )}
        </nav>
      </aside>

      <main className="flex-1 p-8">
        <h2 className="text-2xl font-bold mb-6">Painel de Organização</h2>
        <div className="grid grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Total', val: contadores.total },
            { label: 'Pendentes', val: contadores.pendentes },
            { label: 'Concluídos', val: contadores.feito },
            { label: 'Imagens', val: contadores.imagens },
            { label: 'Vídeos', val: contadores.videos },
            { label: 'Links', val: contadores.links }
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl border p-4 shadow-sm">
              <div className="text-slate-500 mb-1">{card.label}</div>
              <div className="text-2xl font-bold">{card.val}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
