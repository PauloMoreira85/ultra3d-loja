import type { Categoria, Produto } from './supabase'

// Dados de demonstração — usados enquanto o Supabase não está conectado/populado.
// Assim a loja já aparece "montada" com as seções e produtos.

export const demoCategorias: Categoria[] = [
  { id: 'c-deco', nome: 'Decoração', ordem: 1, ativo: true },
  { id: 'c-colec', nome: 'Colecionáveis & Jogos', ordem: 2, ativo: true },
  { id: 'c-brinde', nome: 'Brindes personalizados', ordem: 3, ativo: true },
  { id: 'c-lembr', nome: 'Lembrancinhas', ordem: 4, ativo: true },
  { id: 'c-times', nome: 'Times & Cidade', ordem: 5, ativo: true },
]

const base = {
  descricao: null as string | null, sku: null as string | null, foto_url: null as string | null,
  material: 'PLA', peso_g: 120, comprimento_cm: 15, largura_cm: 11, altura_cm: 4,
  estoque: null as number | null, ativo: true, ordem: 0,
}
const P = (o: Pick<Produto, 'id' | 'nome' | 'preco' | 'categoria_id'> & Partial<Produto>): Produto =>
  ({ ...base, ...o })

export const demoProdutos: Produto[] = [
  // Decoração
  P({ id: 'd1', categoria_id: 'c-deco', nome: 'Vaso Axis', descricao: 'Vaso decorativo em espiral', preco: 59.9, foto_url: '/demo/vaso-axis.webp' }),
  P({ id: 'd2', categoria_id: 'c-deco', nome: 'Vaso Brisa', descricao: 'Linhas onduladas, acabamento fosco', preco: 54.9, foto_url: '/demo/vaso-brisa.webp' }),
  P({ id: 'd3', categoria_id: 'c-deco', nome: 'Vaso Serenidade', descricao: 'Curvas suaves para mesa e aparador', preco: 64.9, foto_url: '/demo/vaso-serenidade.webp' }),
  P({ id: 'd4', categoria_id: 'c-deco', nome: 'Vaso SilkFlow', descricao: 'Brilho Silk, várias alturas', preco: 69.9, foto_url: '/demo/vaso-silkflow.webp', material: 'PLA Silk' }),
  P({ id: 'd5', categoria_id: 'c-deco', nome: 'Vaso Espiral Moderno', descricao: 'Escultural, torcido', preco: 74.9, foto_url: '/demo/vaso-espiral.png' }),
  P({ id: 'd6', categoria_id: 'c-deco', nome: 'Vaso Espiral 3', descricao: 'Minimalista', preco: 49.9, foto_url: '/demo/vaso-espiral3.webp' }),
  // Colecionáveis & Jogos
  P({ id: 'j1', categoria_id: 'c-colec', nome: 'Dragão articulado', descricao: 'Colecionável que se mexe — multicolor', preco: 59.9, material: 'PLA multicolor', peso_g: 60 }),
  P({ id: 'j2', categoria_id: 'c-colec', nome: 'Miniatura de RPG', descricao: 'Alta definição em resina', preco: 34.9, material: 'Resina' }),
  P({ id: 'j3', categoria_id: 'c-colec', nome: 'Dice Tower', descricao: 'Torre de dados para board game', preco: 79.9 }),
  // Brindes personalizados
  P({ id: 'b1', categoria_id: 'c-brinde', nome: 'Chaveiro com sua logo', descricao: 'A partir de 50un — sua marca em 3D', preco: 9.9, peso_g: 10 }),
  P({ id: 'b2', categoria_id: 'c-brinde', nome: 'Ímã personalizado', descricao: 'Ímã de geladeira com logo', preco: 12.9, peso_g: 15 }),
  P({ id: 'b3', categoria_id: 'c-brinde', nome: 'Display de balcão', descricao: 'Porta-cartão / suporte com a marca', preco: 89.9 }),
  // Lembrancinhas
  P({ id: 'l1', categoria_id: 'c-lembr', nome: 'Topo de bolo personalizado', descricao: 'Nome + tema da festa', preco: 44.9, peso_g: 40 }),
  P({ id: 'l2', categoria_id: 'c-lembr', nome: 'Lembrancinha temática', descricao: 'Com o nome do convidado', preco: 8.9, peso_g: 15 }),
  // Times & Cidade
  P({ id: 't1', categoria_id: 'c-times', nome: 'Chaveiro do seu time', descricao: 'Escudo do time do coração', preco: 14.9, peso_g: 10 }),
  P({ id: 't2', categoria_id: 'c-times', nome: 'Souvenir da sua cidade', descricao: 'Pontos turísticos em 3D', preco: 29.9 }),
]
