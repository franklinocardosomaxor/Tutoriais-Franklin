export type TipoConteudo = 'video' | 'imagem' | 'link' | 'app';
export type StatusItem = 'pendente' | 'estudado' | 'implementado' | 'revisar';

export interface ItemConteudo {
  id: string;
  nomeOriginal: string;
  caminho: string;
  tipo: TipoConteudo;
  categoria: string;
  subtopico: string;
  titulo: string;
  descricao: string;
  grupoSequencia: string | null;
  numeroOrdem?: number;
  status: StatusItem;
  observacoes: string;
  dataAdicionado: Date;
}

export interface CategoriaArvore {
  nome: string;
  filhos: CategoriaArvore[];
  itens: ItemConteudo[];
}
