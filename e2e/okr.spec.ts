import { test, expect } from '@playwright/test';

test.describe('OKR System', () => {
    const mockUser = {
        id: 'test-user-id',
        name: 'Geraldo Admin',
        email: 'geraldo@grupoggv.com',
        role: 'SUPER_ADMIN',
        department: 'Diretoria',
        cargo: 'CEO'
    };

    const mockOKR = {
        id: 'new-okr-id',
        objective: 'E2E Test Objective: Improve Sales Performance',
        level: 'STRATEGIC',
        department: 'comercial',
        owner: 'Geraldo Admin',
        status: 'NOT_STARTED',
        progress: 0,
        key_results: [{
            id: 'kr-1',
            title: 'Existing KR',
            type: 'numeric',
            direction: 'increase',
            target_value: 100,
            current_value: 0,
            status: 'amarelo'
        }]
    };

    test.beforeEach(async ({ page }) => {
        // 2. Mock RPCs
        await page.route('**/rest/v1/rpc/list_users_for_okr', async route => {
            await route.fulfill({ status: 200, json: [mockUser] });
        });

        await page.route('**/rest/v1/rpc/save_okr_with_krs', async route => {
            const payload = JSON.parse(route.request().postData()!);
            console.log('🌐 [MOCK] RPC save_okr_with_krs:', payload);
            await route.fulfill({
                status: 200,
                json: { success: true, id: payload.p_okr_id || 'new-okr-id' }
            });
        });

        // 2. Mock OKRs (Table)
        await page.route('**/rest/v1/okrs?*', async route => {
            const method = route.request().method();
            if (method === 'POST') {
                const payload = JSON.parse(route.request().postData()!);
                const newOKR = { ...payload, id: 'new-okr-id', created_at: new Date().toISOString() };
                await route.fulfill({ status: 201, json: newOKR });
            } else if (method === 'GET') {
                await route.fulfill({ json: [mockOKR] });
            } else {
                await route.continue();
            }
        });

        // 3. Mock OKRs with Progress (View)
        // Some components might use this view
        await page.route('**/rest/v1/okrs_with_progress*', async route => {
            await route.fulfill({ json: [mockOKR] });
        });

        // 4. Mock Key Results
        await page.route('**/rest/v1/key_results*', async route => {
            if (route.request().method() === 'POST') {
                const payload = JSON.parse(route.request().postData()!);
                const response = Array.isArray(payload)
                    ? payload.map(kr => ({ ...kr, id: `kr-${Math.random()}` }))
                    : { ...payload, id: 'new-kr-id' };
                await route.fulfill({ status: 201, json: response });
            } else {
                await route.continue();
            }
        });

        // 5. Bypass Authentication
        await page.addInitScript(() => {
            const user = {
                id: 'test-user-id',
                email: 'geraldo@grupoggv.com',
                name: 'Geraldo Admin',
                role: 'SUPER_ADMIN',
                department: 'Diretoria',
                cargo: 'CEO',
                initials: 'GA'
            };
            const timestamp = Date.now().toString();
            localStorage.setItem('ggv-user', JSON.stringify(user));
            localStorage.setItem('ggv-user-timestamp', timestamp);
            localStorage.removeItem('okr-storage');
        });
    });

    test('should create a new OKR successfully', async ({ page }) => {
        // Navigate
        await page.goto('/okr');
        await page.waitForLoadState('networkidle');

        if (await page.getByText('Bem-vindo(a)').isVisible()) {
            throw new Error('Auth bypass failed');
        }

        // Switch to OKRs tab
        const okrTab = page.locator('button:has-text("OKRs")');
        await okrTab.waitFor({ state: 'visible', timeout: 10000 });
        await okrTab.click();

        // Click Create
        const createButton = page.locator('button:has-text("Criar Novo OKR"), button:has-text("Criar Primeiro OKR")').first();
        await createButton.click();

        // Fill Form
        await page.fill('textarea[name="objective"]', 'E2E Test Objective: Improve Sales Performance');
        await page.selectOption('select[name="department"]', 'comercial');
        await page.selectOption('select[name="owner"]', { label: 'Geraldo Admin (CEO - Diretoria)' });

        // Add Key Result
        await page.click('button:has-text("Adicionar KR")');
        await page.fill('input[name="key_results.0.title"]', 'Increase Leads by 20%');
        await page.selectOption('select[name="key_results.0.direction"]', 'increase');
        await page.fill('input[name="key_results.0.target_value"]', '120');

        // Submit
        await page.click('button:has-text("Salvar Objetivo")');

        // Verify
        // Use getByText with exact: false
        await expect(page.getByText('E2E Test Objective: Improve Sales Performance', { exact: false })).toBeVisible({ timeout: 10000 });
    });

    test('should edit an existing OKR', async ({ page }) => {
        // Navigate
        await page.goto('/okr');
        await page.waitForLoadState('networkidle');

        // Switch to OKRs tab
        const okrTab = page.locator('button:has-text("OKRs")');
        await okrTab.waitFor({ state: 'visible', timeout: 10000 });
        await okrTab.click();

        // 1. Click on existing OKR card
        const card = page.getByText('E2E Test Objective: Improve Sales Performance', { exact: false }).first();
        await expect(card).toBeVisible({ timeout: 10000 });
        await card.click();

        // 2. Wait for Edit Modal
        await expect(page.getByRole('heading', { name: 'Editar OKR' })).toBeVisible();

        // 3. Change Objective
        await page.fill('textarea[name="objective"]', 'Adjusted Objective: Maximize Revenue');

        // 4. Update Mock for PUT
        await page.route('**/rest/v1/okrs?id=eq.*', async route => {
            if (route.request().method() === 'PATCH' || route.request().method() === 'PUT') { // Supabase update is PATCH usually
                const payload = JSON.parse(route.request().postData()!);
                const updatedOKR = {
                    ...mockOKR,
                    ...payload,
                    objective: 'Adjusted Objective: Maximize Revenue'
                };
                await route.fulfill({ status: 200, json: updatedOKR });
            } else {
                await route.continue();
            }
        });

        // Mock GET list to return updated OKR after save
        await page.route('**/rest/v1/okrs?*', async route => {
            if (route.request().method() === 'GET') {
                await route.fulfill({ json: [{ ...mockOKR, objective: 'Adjusted Objective: Maximize Revenue' }] });
            } else {
                await route.continue();
            }
        });


        // 5. Submit
        await page.click('button:has-text("Salvar Objetivo")');

        // 6. Verify Update
        await expect(page.getByText('Adjusted Objective: Maximize Revenue', { exact: false })).toBeVisible({ timeout: 10000 });
    });

    test('should delete an OKR', async ({ page }) => {
        // Mock Delete
        await page.route('**/rest/v1/okrs?id=eq.*', async route => {
            if (route.request().method() === 'DELETE') {
                await route.fulfill({ status: 204 });
            } else {
                await route.continue();
            }
        });

        // Setup dialog handler
        page.on('dialog', dialog => dialog.accept());

        // Navigate
        await page.goto('/okr');
        await page.waitForLoadState('networkidle');

        // Switch to OKRs tab
        const okrTab = page.locator('button:has-text("OKRs")');
        await okrTab.waitFor({ state: 'visible', timeout: 10000 });
        await okrTab.click();

        // 1. Click on existing OKR card to open modal
        const card = page.getByText('E2E Test Objective: Improve Sales Performance', { exact: false }).first();
        await expect(card).toBeVisible({ timeout: 10000 });
        await card.click();

        // 2. Click Delete Button
        await page.click('button:has-text("Excluir")');

        // 3. Mock List after delete (empty list)
        await page.route('**/rest/v1/okrs?*', async route => {
            if (route.request().method() === 'GET') {
                await route.fulfill({ json: [] });
            } else {
                await route.continue();
            }
        });

        // Use a dummy interaction to trigger refetch if necessary, 
        // but locator(card).not.toBeVisible should work after fetchOKRs is called by store.

        // 3. Verify Item is Gone
        // Since we mocked GET to return [], the card should disappear
        await expect(card).not.toBeVisible({ timeout: 10000 });
    });
});
