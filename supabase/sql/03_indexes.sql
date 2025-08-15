-- Índices e IVFFLAT (idempotentes)
create index if not exists idx_kd_user_created on public.knowledge_documents(user_id, created_at desc);
create index if not exists idx_ko_user_created on public.knowledge_overview(user_id, created_at desc);

-- Para IVFFLAT é necessário ter criado a extensão vector e feito ANALYZE após inserir
create index if not exists kd_embedding_ivf on public.knowledge_documents using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists ko_embedding_ivf on public.knowledge_overview using ivfflat (embedding vector_cosine_ops) with (lists = 100);


