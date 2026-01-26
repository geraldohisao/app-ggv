import { test, expect } from '@playwright/test';

type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type?: string;
  user?: {
    id: string;
    email?: string;
    user_metadata?: Record<string, any>;
  };
};

function getSupabaseStorageKey(): string | null {
  const supabaseUrl = process.env.PLAYWRIGHT_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return null;
  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
    return `sb-${projectRef}-auth-token`;
  } catch {
    return null;
  }
}

function requireEnv(name: string, fallbackName?: string): string {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : undefined);
  if (!value) {
    throw new Error(`Missing environment variable: ${name}${fallbackName ? ` (or ${fallbackName})` : ''}`);
  }
  return value;
}

test('cria sprint contínua com agenda e remove do Google Calendar', async ({ page }) => {
  const supabaseAuthRaw = process.env.PLAYWRIGHT_SUPABASE_AUTH;
  const gcalToken = process.env.PLAYWRIGHT_GCAL_TOKEN;
  const storageKey = getSupabaseStorageKey();

  test.skip(!supabaseAuthRaw, 'Defina PLAYWRIGHT_SUPABASE_AUTH com o JSON da sessão Supabase.');
  test.skip(!gcalToken, 'Defina PLAYWRIGHT_GCAL_TOKEN com um token válido do Google Calendar.');
  test.skip(!storageKey, 'Defina PLAYWRIGHT_SUPABASE_URL ou VITE_SUPABASE_URL para detectar o storage key.');

  const supabaseAuth = JSON.parse(supabaseAuthRaw as string) as SupabaseSession;
  const userId = supabaseAuth.user?.id || process.env.PLAYWRIGHT_USER_ID || 'playwright-user';
  const userEmail = supabaseAuth.user?.email || process.env.PLAYWRIGHT_USER_EMAIL || 'playwright@ggv.local';
  const userName = process.env.PLAYWRIGHT_USER_NAME || 'Playwright Admin';

  const sprintTitle = `Sprint E2E ${Date.now()}`;

  await page.addInitScript(
    ({ storageKey, supabaseAuth, userId, userEmail, userName, gcalToken }) => {
      const ggvUser = {
        id: userId,
        email: userEmail,
        name: userName,
        initials: userName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase(),
        role: 'SUPER_ADMIN',
        department: 'geral',
      };

      const now = Date.now().toString();
      localStorage.setItem('ggv-user', JSON.stringify(ggvUser));
      localStorage.setItem('ggv-user-timestamp', now);
      sessionStorage.setItem('ggv-user', JSON.stringify(ggvUser));
      sessionStorage.setItem('ggv-user-timestamp', now);

      localStorage.setItem(storageKey, JSON.stringify(supabaseAuth));
      sessionStorage.setItem(storageKey, JSON.stringify(supabaseAuth));

      const tokenCache = {
        access_token: gcalToken,
        expires_at: Date.now() + 60 * 60 * 1000,
        source: 'oauth',
      };
      localStorage.setItem('ggv_calendar_token_cache', JSON.stringify(tokenCache));
    },
    { storageKey, supabaseAuth, userId, userEmail, userName, gcalToken }
  );

  await page.goto('/okr/sprints');

  await expect(page.getByRole('button', { name: /Nova Sprint/i })).toBeVisible();
  await page.getByRole('button', { name: /Nova Sprint/i }).click();

  await expect(page.getByTestId('sprint-form')).toBeVisible();
  await page.getByTestId('sprint-title').fill(sprintTitle);

  const okrList = page.getByTestId('sprint-okr-list');
  await expect(okrList.locator('label').first()).toBeVisible();
  await okrList.locator('label').first().click();

  const continuousToggle = page.getByTestId('sprint-continuous-toggle');
  if (!(await continuousToggle.isChecked())) {
    await continuousToggle.check();
  }

  const calendarToggle = page.getByTestId('sprint-calendar-toggle');
  if (!(await calendarToggle.isChecked())) {
    await calendarToggle.check();
  }

  await page.getByTestId('sprint-submit').click();
  await expect(page.getByText(/Sprint criada com sucesso/i)).toBeVisible();
  await expect(page.getByText(/Evento sincronizado no Google Calendar/i)).toBeVisible();

  const searchInput = page.getByPlaceholder('Buscar sprints...');
  await searchInput.fill(sprintTitle);
  await expect(page.getByText(sprintTitle, { exact: false })).toBeVisible();

  await page.getByText(sprintTitle, { exact: false }).click();
  await expect(page.getByTestId('sprint-edit')).toBeVisible();

  const currentUrl = page.url();
  const sprintId = currentUrl.split('/').pop();
  if (!sprintId) throw new Error('Sprint ID não encontrado na URL.');

  const supabaseUrl = requireEnv('PLAYWRIGHT_SUPABASE_URL', 'VITE_SUPABASE_URL');
  const anonKey = requireEnv('PLAYWRIGHT_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');

  const eventBeforeDelete = await fetch(
    `${supabaseUrl}/rest/v1/sprint_calendar_events?sprint_id=eq.${sprintId}&status=neq.cancelled&select=event_id,status`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${supabaseAuth.access_token}`,
      },
    }
  ).then((res) => res.json());

  const eventId = eventBeforeDelete?.[0]?.event_id;
  if (!eventId) throw new Error('Event ID não encontrado antes da exclusão.');

  page.on('dialog', (dialog) => dialog.accept());
  await page.getByTestId('sprint-edit').click();
  await expect(page.getByTestId('sprint-delete')).toBeVisible();
  await page.getByTestId('sprint-delete').click();

  await expect(page.getByText(/Sprint enviada para a lixeira/i)).toBeVisible();

  const eventAfterDelete = await fetch(
    `${supabaseUrl}/rest/v1/sprint_calendar_events?sprint_id=eq.${sprintId}&status=neq.cancelled&select=id`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${supabaseAuth.access_token}`,
      },
    }
  ).then((res) => res.json());

  expect(Array.isArray(eventAfterDelete)).toBeTruthy();
  expect(eventAfterDelete.length).toBe(0);

  const gcalRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      headers: { Authorization: `Bearer ${gcalToken}` },
    }
  );
  expect([404, 410]).toContain(gcalRes.status);
});
