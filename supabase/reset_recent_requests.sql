-- 최근 신청을 모두 초기화합니다. Supabase SQL Editor에서 한 번만 실행하세요.
delete from public.commission_requests;
update public.site_settings set used_slots = 0, updated_at = now() where id = 1;
