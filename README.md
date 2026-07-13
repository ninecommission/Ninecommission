# NINE Commission

Static commission site prepared for GitHub Pages and Supabase.

## GitHub Pages

1. Push this folder to a GitHub repository.
2. In GitHub, open Settings > Pages.
3. Select the main branch and root folder.

## Supabase

1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Copy the Project URL and anon public key.
4. Edit `js/supabase-config.js`.
5. Set `enabled: true`.

Never commit a Supabase `service_role` key. Browser code should only use the anon public key.

## 관리자 계정 보안 설정

1. Supabase Authentication에서 공개 회원가입을 비활성화합니다.
2. 관리자 계정은 Authentication의 사용자 관리 화면에서 직접 생성합니다.
3. `supabase/schema.sql`을 실행합니다. Auth 사용자가 한 명이면 해당 계정이 최초 관리자로 자동 등록됩니다.
4. Auth 사용자가 여러 명이면 `supabase/register_admin.sql`의 이메일을 바꿔 실행합니다.

일반 방문자는 로그인하지 않으며, 공개된 공지·갤러리를 조회하고 신청·문의·채팅만 등록할 수 있습니다. 관리자 페이지와 관리자용 데이터·파일 작업은 `admin_users`에 등록된 계정만 허용됩니다.
