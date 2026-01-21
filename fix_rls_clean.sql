ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON app_settings TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "app_settings_read_policy" ON app_settings;
DROP POLICY IF EXISTS "Authenticated users can read app_settings" ON app_settings;
DROP POLICY IF EXISTS "app_settings_read_policy_debug" ON app_settings;

CREATE POLICY "app_settings_read_policy_no_comments" ON app_settings
    FOR SELECT
    USING (true);
