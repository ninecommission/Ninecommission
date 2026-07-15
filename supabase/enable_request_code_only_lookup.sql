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
