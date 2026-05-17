create table if not exists mcp_categories (
  slug text primary key,
  name text not null,
  description text not null
);

create table if not exists mcp_servers (
  slug text primary key,
  name text not null,
  description text not null default '',
  category text not null,
  tagline text not null,
  source text not null,
  source_links jsonb not null default '[]'::jsonb,
  package_name text not null,
  install_command text not null,
  repository_url text not null,
  stars integer not null default 0,
  last_reviewed date not null default current_date,
  evidence_updated date not null default current_date,
  status text not null default 'indexed'
    check (status in ('indexed', 'reviewed', 'maintainer_verified', 'deprecated', 'high_risk')),
  confidence text not null default 'low'
    check (confidence in ('low', 'medium', 'high')),
  maintainer_verified boolean not null default false,
  maintainer_verified_at timestamptz,
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
  overall_score integer,
  previous_overall_score integer,
  status text,
  confidence text,
  risk text check (risk is null or risk in ('low', 'medium', 'high')),
  change_summary text,
  source text not null default 'manual_review',
  stars integer not null default 0,
  notes text,
  captured_at timestamptz not null default now()
);

create index if not exists mcp_servers_category_idx on mcp_servers(category);
create index if not exists scoring_snapshots_server_captured_idx
  on scoring_snapshots(server_slug, captured_at desc);

create table if not exists mcp_tools (
  slug text primary key,
  name text not null,
  description text not null default '',
  category text not null default 'Uncategorized',
  source text not null default '',
  source_url text not null default '',
  github_url text not null default '',
  package_url text not null default '',
  install_command text not null default '',
  stars integer,
  last_commit timestamptz,
  license text not null default '',
  status text not null default 'unreviewed'
    check (status in ('unreviewed', 'reviewed', 'deprecated', 'blocked')),
  trust_score integer check (trust_score is null or (trust_score >= 0 and trust_score <= 100)),
  confidence_score text not null default 'unreviewed'
    check (confidence_score in ('unreviewed', 'low', 'medium', 'high')),
  open_issues integer,
  readme_length integer,
  last_reviewed_at timestamptz,
  enrichment jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mcp_tools_status_idx on mcp_tools(status);
create index if not exists mcp_tools_confidence_idx on mcp_tools(confidence_score);
create index if not exists mcp_tools_category_idx on mcp_tools(category);

create table if not exists mcp_tool_snapshots (
  id bigserial primary key,
  tool_slug text not null references mcp_tools(slug) on delete cascade,
  score jsonb not null default '{}'::jsonb,
  overall_score integer,
  previous_overall_score integer,
  status text not null,
  confidence_score text not null,
  risk text not null default 'medium' check (risk in ('low', 'medium', 'high')),
  change_summary text not null default 'Admin review metadata updated.',
  source text not null default 'admin',
  captured_at timestamptz not null default now()
);

create index if not exists mcp_tool_snapshots_tool_captured_idx
  on mcp_tool_snapshots(tool_slug, captured_at desc);
