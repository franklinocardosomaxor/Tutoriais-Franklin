export async function extrairTextoELinks(arquivo: File): Promise<Array<{nome: string, conteudo: string}>> {
  const texto = await arquivo.text();
  const linhas = texto.split(/[\r\n]+/).filter(l => l.trim().length > 3);
  
  return linhas.map((linha, idx) => ({
    nome: linha.length > 60 ? linha.slice(0, 57) + '…' : `Link/Entrada ${idx + 1}`,
    conteudo: linha
  }));
}
