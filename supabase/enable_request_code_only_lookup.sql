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

drop function if exists public.lookup_commission_status(bigint, text);
drop function if exists public.lookup_commission_status(text, text);
drop function if exists public.lookup_commission_status(text);

create function public.lookup_commission_status(p_request_code text)
returns table (request_code text, request_type text, status text, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select commission_requests.request_code, commission_requests.request_type, commission_requests.status, commission_requests.created_at
  from public.commission_requests
  where lower(trim(request_code)) = lower(trim(p_request_code))
  limit 1
$$;

revoke all on function public.lookup_commission_status(text) from public;
grant execute on function public.lookup_commission_status(text) to anon, authenticated;
