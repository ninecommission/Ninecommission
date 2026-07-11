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
