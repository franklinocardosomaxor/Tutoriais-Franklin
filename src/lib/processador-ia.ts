async function chamarOpenAI(dados: any, chaveOpenAI: string) {
  const ehImagem = dados.tipo === 'imagem' && dados.imagemBase64;
  const mensagens: any[] = [
    {
      role: 'system',
      content: `
VOCÊ É ORGANIZADOR DE CONHECIMENTO — REGRAS OBRIGATÓRIAS:
✅ NÃO FAÇA TRANSCRIÇÃO COMPLETA — APENAS O SUFICIENTE PARA IDENTIFICAR E AGRUPAR
✅ Defina: categoria principal (Claude / GPT / Lovable / Gemini / Antigravity / Outros)
✅ subtopico: Skill, Repositório GitHub, API, Configuração, etc. — ex: "Claude + GitHub"
✅ titulo: CLARO — diga exatamente o que FAZ
✅ descricao: 1-2 frases curtas
✅ grupoSequencia: se parte de um tutorial com mesmo visual → nome comum
✅ Responda SOMENTE JSON:
{"categoria":"","subtopico":"","titulo":"","descricao":"","grupoSequencia":null,"numeroOrdem":null}
`
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: `Arquivo: ${dados.nomeArquivo}\nTipo: ${dados.tipo}\n${dados.conteudoTexto ? `Texto:\n${dados.conteudoTexto.substring(0,1200)}` : ''}` },
        ...(ehImagem ? [{ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${dados.imagemBase64}`, detail: 'low' } }] : [])
      ]
    }
  ];

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${chaveOpenAI}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0, response_format: { type: 'json_object' }, messages: mensagens })
  });

  const json = await resp.json();
  if (json.error) throw new Error(json.error.message);
  return JSON.parse(json.choices[0].message.content);
}

export async function processarArquivo(arquivo: File, tipo: string, conteudoTexto: string | undefined, imagemBase64: string | undefined, chave: string) {
  const resultado = await chamarOpenAI({
    nomeArquivo: arquivo.name,
    tipo,
    conteudoTexto,
    imagemBase64
  }, chave);

  return {
    id: crypto.randomUUID(),
    nomeOriginal: arquivo.name,
    caminho: '',
    tipo,
    categoria: resultado.categoria || 'Não classificado',
    subtopico: resultado.subtopico || 'Geral',
    titulo: resultado.titulo || arquivo.name,
    descricao: resultado.descricao || 'Sem descrição',
    grupoSequencia: resultado.grupoSequencia,
    numeroOrdem: resultado.numeroOrdem,
    observacoes: '',
    status: 'pendente' as const,
    dataAdicionado: new Date()
  };
}
