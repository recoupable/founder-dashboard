-- Create tables
CREATE TABLE IF NOT EXISTS active_users (
  id bigint primary key generated always as identity,
  user_id text not null,
  last_active timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS sales_pipeline (
  id bigint primary key generated always as identity,
  company_name text not null,
  potential_revenue numeric not null,
  status text not null check (status in ('lead', 'meeting', 'proposal', 'negotiation', 'closed')),
  created_at timestamp with time zone default now()
);

-- Create functions for table creation
CREATE OR REPLACE FUNCTION create_active_users_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS active_users (
    id bigint primary key generated always as identity,
    user_id text not null,
    last_active timestamp with time zone default now(),
    created_at timestamp with time zone default now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION create_sales_pipeline_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS sales_pipeline (
    id bigint primary key generated always as identity,
    company_name text not null,
    potential_revenue numeric not null,
    status text not null check (status in ('lead', 'meeting', 'proposal', 'negotiation', 'closed')),
    created_at timestamp with time zone default now()
  );
END;
$$; 