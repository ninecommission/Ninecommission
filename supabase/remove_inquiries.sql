do $$
begin
  if to_regclass('public.inquiries') is not null then
    drop policy if exists "public can create inquiries" on public.inquiries;
    drop policy if exists "admins manage inquiries" on public.inquiries;
  end if;
end
$$;

drop function if exists public.get_public_inquiries();
drop function if exists public.get_inquiry_by_code(text, text);
drop function if exists public.get_my_inquiries(text, text);
drop function if exists public.create_inquiry(text, text, text, text, boolean, text);
drop function if exists public.generate_inquiry_code();

drop table if exists public.inquiries cascade;
