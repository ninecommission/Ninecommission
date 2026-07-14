-- 관리자 답변 기능을 활성화하려면 Supabase SQL Editor에서 한 번 실행하세요.
drop policy if exists "public can create chat messages" on public.chat_messages;
create policy "public can create chat messages"
  on public.chat_messages
  for insert
  to anon
  with check (
    sender ~ '^[MP]-[A-Z0-9]{6}$'
    and char_length(message) between 1 and 2000
  );

create or replace function public.get_chat_replies(p_visitor_code text)
returns table (id bigint, created_at timestamptz, message text)
language sql
security definer
set search_path = public
as $$
  select cm.id, cm.created_at, cm.message
  from public.chat_messages cm
  where p_visitor_code ~ '^[MP]-[A-Z0-9]{6}$'
    and cm.sender = 'ADMIN:' || p_visitor_code
  order by cm.created_at asc;
$$;

revoke all on function public.get_chat_replies(text) from public;
grant execute on function public.get_chat_replies(text) to anon, authenticated;

create or replace function public.get_chat_thread_messages(p_visitor_code text)
returns table (id bigint, created_at timestamptz, sender text, message text)
language sql
security definer
set search_path = public
as $$
  select cm.id, cm.created_at, cm.sender, cm.message
  from public.chat_messages cm
  where p_visitor_code ~ '^[MP]-[A-Z0-9]{6}$'
    and (
      cm.sender = p_visitor_code
      or cm.sender = 'ADMIN:' || p_visitor_code
    )
  order by cm.created_at asc;
$$;

revoke all on function public.get_chat_thread_messages(text) from public;
grant execute on function public.get_chat_thread_messages(text) to anon, authenticated;
