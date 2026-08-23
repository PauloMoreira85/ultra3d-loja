-- ============================================================
--  Ultra 3D Brasil — Loja  |  Schema Supabase
--  Rodar no SQL Editor do projeto (ou via MCP apply_migration).
--  Adaptado da loja A Adega para PRODUTO FÍSICO + ENVIO (Melhor Envio).
-- ============================================================

-- ---------- CATEGORIAS ----------
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ordem int not null default 0,
  ativo boolean not null default true
);

-- ---------- PRODUTOS ----------
create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid references categorias(id) on delete set null,
  nome text not null,
  descricao text,
  preco numeric(10,2) not null default 0,      -- preço em reais
  sku text,
  foto_url text,
  material text,                               -- PLA, PETG, Silk...
  -- dimensões/peso p/ cotação de frete (Melhor Envio)
  peso_g int not null default 100,             -- gramas
  comprimento_cm numeric(6,1) not null default 15,
  largura_cm numeric(6,1) not null default 11,
  altura_cm numeric(6,1) not null default 4,
  estoque int,                                 -- null = sob encomenda (ilimitado)
  ativo boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- PERFIS (1:1 com auth.users) ----------
create table if not exists perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  telefone text,
  cpf text,
  asaas_customer_id text,
  -- endereço padrão de entrega
  cep text, rua text, numero text, complemento text,
  bairro text, cidade text, uf text,
  papel text not null default 'cliente',       -- 'cliente' | 'admin'
  created_at timestamptz not null default now()
);

-- ---------- PEDIDOS ----------
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'rascunho',
    -- rascunho | aguardando_pagamento | pago | em_producao | enviado | entregue | cancelado
  forma_pagamento text,                        -- 'pix' | 'cartao'
  subtotal numeric(10,2) not null default 0,
  frete numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  -- dados do cliente / entrega
  cliente_nome text, cliente_telefone text,
  cep text, rua text, numero text, complemento text, bairro text, cidade text, uf text,
  -- frete escolhido (Melhor Envio)
  frete_servico text,            -- ex.: 'PAC', 'SEDEX'
  frete_servico_id int,
  frete_prazo_dias int,
  frete_transportadora text,
  -- integração Asaas
  asaas_payment_id text,
  asaas_status text,
  asaas_invoice_url text,
  asaas_pix_qrcode_base64 text,
  asaas_pix_copia_cola text,
  asaas_pix_vencimento timestamptz,
  observacoes text,
  created_at timestamptz not null default now()
);

-- ---------- ITENS DO PEDIDO ----------
create table if not exists itens_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  produto_id uuid references produtos(id) on delete set null,
  descricao text not null,
  quantidade int not null default 1,
  preco_unitario numeric(10,2) not null default 0,
  valor_total numeric(10,2) not null default 0
);

-- ---------- CONFIG DA LOJA ----------
create table if not exists config_loja (
  id int primary key default 1,
  pedido_minimo numeric(10,2) not null default 0,
  frete_gratis_acima numeric(10,2),            -- null = sem frete grátis
  retirada_maringa boolean not null default true,  -- oferece retirada local grátis
  aberto boolean not null default true,
  obs text
);
insert into config_loja (id) values (1) on conflict (id) do nothing;

-- ---------- CONFIG WHATSAPP (alertas de pedido) ----------
create table if not exists config_whatsapp (
  id int primary key default 1,
  uazapi_url text, uazapi_token text, numero_alerta text
);
insert into config_whatsapp (id) values (1) on conflict (id) do nothing;

-- ============================================================
--  RLS
-- ============================================================
alter table categorias enable row level security;
alter table produtos enable row level security;
alter table perfis enable row level security;
alter table pedidos enable row level security;
alter table itens_pedido enable row level security;
alter table config_loja enable row level security;

-- catálogo: leitura pública
create policy cat_read on categorias for select using (true);
create policy prod_read on produtos for select using (true);
create policy cfg_read on config_loja for select using (true);

-- perfil: cada um vê/edita o seu
create policy perfil_self on perfis for select using (auth.uid() = id);
create policy perfil_upd  on perfis for update using (auth.uid() = id);
create policy perfil_ins  on perfis for insert with check (auth.uid() = id);

-- pedidos: cada um vê/cria os seus
create policy ped_self on pedidos for select using (auth.uid() = user_id);
create policy ped_ins  on pedidos for insert with check (auth.uid() = user_id);
create policy ped_upd  on pedidos for update using (auth.uid() = user_id);

-- itens: via pedido do próprio usuário
create policy item_self on itens_pedido for select using (
  exists (select 1 from pedidos p where p.id = pedido_id and p.user_id = auth.uid())
);
create policy item_ins on itens_pedido for insert with check (
  exists (select 1 from pedidos p where p.id = pedido_id and p.user_id = auth.uid())
);
-- Obs.: admin e webhook Asaas usam a SERVICE ROLE KEY (ignora RLS).

-- ---------- categorias iniciais ----------
insert into categorias (nome, ordem) values
  ('Decoração', 1), ('Colecionáveis & Jogos', 2), ('Brindes personalizados', 3),
  ('Lembrancinhas', 4), ('Times & Cidade', 5)
on conflict do nothing;
