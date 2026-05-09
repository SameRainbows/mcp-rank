create table if not exists mcp_categories (
  slug text primary key,
  name text not null,
  description text not null
);

create table if not exists mcp_servers (
  slug text primary key,
  name text not null,
  category text not null,
  tagline text not null,
  source text not null,
  package_name text not null,
  install_command text not null,
  repository_url text not null,
  stars integer not null default 0,
  last_reviewed date not null default current_date,
  transports text[] not null default '{}',
  clients text[] not null default '{}',
  risk text not null check (risk in ('low', 'medium', 'high')),
  score jsonb not null,
  signals text[] not null default '{}',
  evidence text[] not null default '{}',
  cautions text[] not null default '{}',
  examples text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists scoring_snapshots (
  id bigserial primary key,
  server_slug text not null references mcp_servers(slug) on delete cascade,
  score jsonb not null,
  stars integer not null default 0,
  notes text,
  captured_at timestamptz not null default now()
);

create index if not exists mcp_servers_category_idx on mcp_servers(category);
create index if not exists scoring_snapshots_server_captured_idx
  on scoring_snapshots(server_slug, captured_at desc);
