-- 신청 완료 후 신청 번호를 사용자 화면에 표시하려면 Supabase SQL Editor에서 실행하세요.
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
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id bigint;
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
    coalesce(p_reference_paths, '{}')
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.create_commission_request(text, text, text, text, text, text, text, text[]) from public;
grant execute on function public.create_commission_request(text, text, text, text, text, text, text, text[]) to anon, authenticated;
