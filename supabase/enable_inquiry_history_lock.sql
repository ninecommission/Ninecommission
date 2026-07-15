alter table public.inquiries add column if not exists inquiry_code text;
alter table public.inquiries add column if not exists owner_key text not null default '';
alter table public.inquiries add column if not exists locked boolean not null default false;
alter table public.inquiries add column if not exists lock_key_hash text;

create unique index if not exists inquiries_inquiry_code_key
on public.inquiries (inquiry_code)
where inquiry_code is not null;

create or replace function public.generate_inquiry_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  code text;
begin
  loop
    code := 'Q';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from public.inquiries where inquiry_code = code);
  end loop;
  return code;
end;
$$;

revoke all on function public.generate_inquiry_code() from public;

create or replace function public.create_inquiry(
  p_name text,
  p_contact text,
  p_message text,
  p_owner_key text,
  p_locked boolean default false,
  p_lock_key text default ''
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := public.generate_inquiry_code();
begin
  if coalesce(p_owner_key, '') !~ '^[A-Za-z0-9-]{12,}$' then
    raise exception 'invalid inquiry owner key';
  end if;


  insert into public.inquiries (
    inquiry_code,
    owner_key,
    name,
    contact,
    message,
    locked,
    lock_key_hash
  )
  values (
    v_code,
    p_owner_key,
    coalesce(p_name, ''),
    coalesce(p_contact, ''),
    coalesce(p_message, ''),
    coalesce(p_locked, false),
    null
  );

  return v_code;
end;
$$;

revoke all on function public.create_inquiry(text, text, text, text, boolean, text) from public;
grant execute on function public.create_inquiry(text, text, text, text, boolean, text) to anon, authenticated;

create or replace function public.get_my_inquiries(
  p_owner_key text,
  p_lock_key text default ''
)
returns table (
  inquiry_code text,
  created_at timestamptz,
  name text,
  contact text,
  message text,
  locked boolean,
  can_view boolean
)
language sql
security definer
set search_path = public
as $$
  select
    i.inquiry_code,
    i.created_at,
    i.name,
    i.contact,
    i.message,
    i.locked,
    true as can_view
  from public.inquiries i
  where p_owner_key ~ '^[A-Za-z0-9-]{12,}$'
    and i.owner_key = p_owner_key
  order by i.created_at desc;
$$;

revoke all on function public.get_my_inquiries(text, text) from public;
grant execute on function public.get_my_inquiries(text, text) to anon, authenticated;

create or replace function public.get_inquiry_by_code(
  p_inquiry_code text,
  p_lock_key text default ''
)
returns table (
  inquiry_code text,
  created_at timestamptz,
  name text,
  contact text,
  message text,
  locked boolean,
  can_view boolean
)
language sql
security definer
set search_path = public
as $$
  select
    i.inquiry_code,
    i.created_at,
    i.name,
    i.contact,
    i.message,
    i.locked,
    true as can_view
  from public.inquiries i
  where upper(i.inquiry_code) = upper(trim(coalesce(p_inquiry_code, '')))
  order by i.created_at desc
  limit 1;
$$;

revoke all on function public.get_inquiry_by_code(text, text) from public;
grant execute on function public.get_inquiry_by_code(text, text) to anon, authenticated;

create or replace function public.get_public_inquiries()
returns table (
  inquiry_code text,
  created_at timestamptz,
  name text,
  contact text,
  message text,
  locked boolean,
  can_view boolean
)
language sql
security definer
set search_path = public
as $$
  select
    i.inquiry_code,
    i.created_at,
    i.name,
    ''::text as contact,
    i.message,
    false as locked,
    true as can_view
  from public.inquiries i
  where i.locked = false
  order by i.created_at desc
  limit 50;
$$;

revoke all on function public.get_public_inquiries() from public;
grant execute on function public.get_public_inquiries() to anon, authenticated;
