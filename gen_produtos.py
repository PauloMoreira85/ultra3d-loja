# -*- coding: utf-8 -*-
"""Gera o catalogo da loja (lib/demo.ts) a partir da pasta Segmentos.
Cada modelo com FOTO + arquivo 3D (stl/3mf) vira um produto.
Copia a foto-capa pra public/produtos/. Rode sempre que adicionar modelos:
    python gen_produtos.py
"""
import os, re, shutil, unicodedata, json

LOJA = os.path.dirname(os.path.abspath(__file__))
SEG = os.path.join(LOJA, "Segmentos")
PUB = os.path.join(LOJA, "public", "produtos")
IMG = {'.webp', '.png', '.jpg', '.jpeg'}
D3  = {'.stl', '.3mf', '.obj'}

# preco padrao por categoria (AJUSTAR depois) — fallback 69
PRECO = {
    "Vasos": 59, "Animais": 79, "Estátuas": 89, "Luminárias": 149,
    "Quadros": 69, "Organizadores": 39, "Miniaturas": 34, "Articulados": 49,
    "Board games": 79, "Chaveiros": 15, "Ímãs": 15, "Displays": 89,
    "Datas": 25, "Topos de bolo": 45,
}
# ordem das seções na loja
ORDEM = ["Vasos", "Luminárias", "Animais", "Estátuas", "Quadros", "Organizadores",
         "Articulados", "Miniaturas", "Board games", "Chaveiros", "Ímãs", "Displays",
         "Datas", "Topos de bolo"]

def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    s = re.sub(r'[^a-zA-Z0-9]+', '-', s).strip('-').lower()
    return s or "item"

def cover(files):
    imgs = sorted([f for f in files if os.path.splitext(f)[1].lower() in IMG])
    if not imgs: return None
    for f in imgs:
        if f.lower().startswith('foto-1') or f.lower() == 'foto-1': return f
    for f in imgs:
        if f.lower().startswith('foto'): return f
    return imgs[0]

# limpa public/produtos e recria
if os.path.isdir(PUB): shutil.rmtree(PUB)
os.makedirs(PUB, exist_ok=True)

produtos = []
cats_usadas = {}
for root, dirs, files in os.walk(SEG):
    rel = os.path.relpath(root, SEG)
    if rel == '.' or rel.split(os.sep)[0].startswith('_'): continue
    files = [f for f in files if not f.startswith('_')]
    tem3d = any(os.path.splitext(f)[1].lower() in D3 for f in files)
    cov = cover(files)
    if not (tem3d and cov): continue        # precisa de arquivo 3D E foto
    parts = rel.split(os.sep)
    categoria = parts[1] if len(parts) >= 3 else parts[0]
    nome = parts[-1].strip()
    sg = slug(f"{categoria}-{nome}")
    ext = os.path.splitext(cov)[1].lower()
    shutil.copy(os.path.join(root, cov), os.path.join(PUB, sg + ext))
    produtos.append({
        "id": sg, "categoria": categoria, "nome": nome,
        "foto": f"/produtos/{sg}{ext}",
        "preco": PRECO.get(categoria, 69),
    })
    cats_usadas[categoria] = cats_usadas.get(categoria, 0) + 1

# ordena categorias
def ordkey(c): return ORDEM.index(c) if c in ORDEM else 999
cats = sorted(cats_usadas.keys(), key=lambda c: (ordkey(c), c))
catid = {c: f"c-{slug(c)}" for c in cats}
produtos.sort(key=lambda p: (ordkey(p["categoria"]), p["categoria"], p["nome"]))

# escreve lib/demo.ts
def esc(s): return s.replace('\\', '\\\\').replace('"', '\\"')
lines = []
lines.append("import type { Categoria, Produto } from './supabase'")
lines.append("")
lines.append("// GERADO por gen_produtos.py a partir da pasta Segmentos. Nao editar a mao.")
lines.append("export const demoCategorias: Categoria[] = [")
for i, c in enumerate(cats, 1):
    lines.append(f'  {{ id: "{catid[c]}", nome: "{esc(c)}", ordem: {i}, ativo: true }},')
lines.append("]")
lines.append("")
lines.append("const base = { descricao: null as string | null, sku: null as string | null, material: 'PLA', "
             "peso_g: 150, comprimento_cm: 15, largura_cm: 12, altura_cm: 12, estoque: null as number | null, ativo: true, ordem: 0 }")
lines.append("const P = (o: Pick<Produto,'id'|'nome'|'preco'|'categoria_id'|'foto_url'> & Partial<Produto>): Produto => ({ ...base, ...o })")
lines.append("")
lines.append("export const demoProdutos: Produto[] = [")
for p in produtos:
    lines.append(f'  P({{ id: "{p["id"]}", categoria_id: "{catid[p["categoria"]]}", '
                 f'nome: "{esc(p["nome"])}", preco: {p["preco"]}, foto_url: "{p["foto"]}" }}),')
lines.append("]")
open(os.path.join(LOJA, "lib", "demo.ts"), "w", encoding="utf-8").write("\n".join(lines) + "\n")

# escreve supabase/seed.sql (catalogo real -> banco). Idempotente: apaga e reinsere.
def sq(s): return s.replace("'", "''")
sql = ["-- GERADO por gen_produtos.py. Reseed do catalogo (apaga e reinsere).",
       "delete from itens_pedido where produto_id is not null;",
       "delete from produtos;", "delete from categorias;"]
sql.append("insert into categorias (nome, ordem) values")
sql.append(",\n".join(f"  ('{sq(c)}', {i})" for i, c in enumerate(cats, 1)) + ";")
sql.append("insert into produtos (categoria_id, nome, preco, foto_url, sku, material) values")
rows = []
for p in produtos:
    rows.append(f"  ((select id from categorias where nome='{sq(p['categoria'])}'), "
                f"'{sq(p['nome'])}', {p['preco']}, '{sq(p['foto'])}', '{sq(p['id'])}', 'PLA')")
sql.append(",\n".join(rows) + ";")
seed_dir = os.path.join(LOJA, "supabase")
os.makedirs(seed_dir, exist_ok=True)
open(os.path.join(seed_dir, "seed.sql"), "w", encoding="utf-8").write("\n".join(sql) + "\n")

print(f"OK — {len(produtos)} produtos em {len(cats)} categorias:")
for c in cats: print(f"  {c}: {cats_usadas[c]}")
