-- Auth 사용자가 여러 명일 때 관리자 이메일을 지정하는 보조 스크립트입니다.
-- 아래 이메일을 실제 관리자 이메일로 바꾼 뒤 Supabase SQL Editor에서 실행하세요.
insert into public.admin_users (user_id)
select id
from auth.users
where lower(email) = lower('YOUR_ADMIN_EMAIL@example.com')
on conflict (user_id) do nothing;

select au.email, ad.created_at
from public.admin_users ad
join auth.users au on au.id = ad.user_id
order by ad.created_at;
