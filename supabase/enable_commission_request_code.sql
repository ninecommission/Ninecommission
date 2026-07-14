-- 신청 완료 후 순번이 드러나지 않는 랜덤 신청 코드를 표시하려면 Supabase SQL Editor에서 실행하세요.
alter table public.commission_requests
add column if not exists request_code text;

create or replace function public.generate_commission_request_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  v_code text;
  v_index integer;
begin
  loop
    v_code := 'C';
    for v_index in 1..6 loop
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
    end loop;

    exit when not exists (
      select 1 from public.commission_requests where request_code = v_code
    );
  end loop;

  return v_code;
end;
$$;

update public.commission_requests
set request_code = public.generate_commission_request_code()
where request_code is null or request_code = '';

alter table public.commission_requests
alter column request_code set default public.generate_commission_request_code();

alter table public.commission_requests
alter column request_code set not null;

create unique index if not exists commission_requests_request_code_key
on public.commission_requests (request_code);

create or replace function public.create_commission_request(
  p_name text,
  p_email text,
  p_contact text,
  p_request_type text,
  p_people text,
  p_usage text,
  p_message text,
  p_reference_paths text[] default '{}'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_code text := public.generate_commission_request_code();
begin
  if not public.commission_applications_open() then
    raise exception 'Commission applications are closed.';
  end if;

  insert into public.commission_requests (
    name,
    email,
    contact,
    request_type,
    people,
    usage,
    message,
    status,
    request_code,
    reference_paths
  )
  values (
    coalesce(p_name, ''),
    coalesce(p_email, ''),
    coalesce(p_contact, ''),
    coalesce(p_request_type, ''),
    coalesce(p_people, ''),
    coalesce(p_usage, ''),
    coalesce(p_message, ''),
    'received',
    v_request_code,
    coalesce(p_reference_paths, '{}')
  );

  return v_request_code;
end;
$$;

revoke all on function public.create_commission_request(text, text, text, text, text, text, text, text[]) from public;
grant execute on function public.create_commission_request(text, text, text, text, text, text, text, text[]) to anon, authenticated;

drop function if exists public.lookup_commission_status(bigint, text);
drop function if exists public.lookup_commission_status(text, text);
create function public.lookup_commission_status(p_request_code text, p_email text)
returns table (request_code text, request_type text, status text, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select commission_requests.request_code, commission_requests.request_type, commission_requests.status, commission_requests.created_at
  from public.commission_requests
  where lower(trim(request_code)) = lower(trim(p_request_code))
    and lower(trim(email)) = lower(trim(p_email))
  limit 1
$$;

revoke all on function public.lookup_commission_status(text, text) from public;
grant execute on function public.lookup_commission_status(text, text) to anon, authenticated;
