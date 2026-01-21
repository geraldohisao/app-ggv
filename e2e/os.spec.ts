import { test, expect } from '@playwright/test';

test.describe('OS Management System', () => {
    const mockUser = {
        id: 'user-123',
        name: 'Geraldo Admin',
        email: 'geraldo@grupoggv.com',
        role: 'SUPER_ADMIN',
        department: 'Diretoria',
        cargo: 'CEO'
    };

    const mockProfile = {
        id: 'signer-456',
        name: 'John Doe',
        email: 'john@example.com',
        user_function: 'Consultor'
    };

    const mockOS = {
        id: 'os-789',
        title: 'E2E Test OS',
        os_number: 'OS-2026-001',
        description: 'Testing OS Management',
        file_name: 'test.pdf',
        file_path: 'user-123/test.pdf',
        file_size: 1024,
        file_hash: 'abc123hash',
        status: 'PENDING',
        created_at: new Date().toISOString(),
        created_by: 'user-123',
        created_by_name: 'Geraldo Admin',
        total_signers: 1,
        signed_count: 0,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    const mockSigner = {
        id: 'sig-001',
        os_id: 'os-789',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Consultor',
        status: 'PENDING',
        order_index: 0
    };

    test.beforeEach(async ({ page }) => {
        // 1. Mock Profiles
        await page.route('**/rest/v1/profiles?*', async route => {
            if (route.request().method() === 'GET') {
                await route.fulfill({ json: [mockProfile] });
            } else {
                await route.continue();
            }
        });

        // 2. Mock Service Orders
        await page.route('**/rest/v1/service_orders?*', async route => {
            const method = route.request().method();
            const url = route.request().url();
            if (method === 'POST') {
                await route.fulfill({ status: 201, json: mockOS });
            } else if (method === 'GET') {
                const isSingle = /[?&]id=eq\./.test(url);
                if (isSingle) {
                    await route.fulfill({ json: mockOS });
                } else {
                    await route.fulfill({ json: [mockOS] });
                }
            } else if (method === 'PATCH') {
                await route.fulfill({ status: 200, json: mockOS });
            } else {
                await route.continue();
            }
        });

        // 3. Mock Signers
        await page.route('**/rest/v1/os_signers?*', async route => {
            const method = route.request().method();
            const url = route.request().url();
            if (method === 'POST') {
                await route.fulfill({ status: 201, json: [mockSigner] });
            } else if (method === 'GET') {
                const isSingle = /[?&]id=eq\./.test(url);
                if (isSingle) {
                    await route.fulfill({ json: mockSigner });
                } else {
                    await route.fulfill({ json: [mockSigner] });
                }
            } else if (method === 'PATCH') {
                await route.fulfill({ status: 200, json: mockSigner });
            } else {
                await route.continue();
            }
        });

        // 4. Mock RPC log_os_event
        await page.route('**/rest/v1/rpc/log_os_event', async route => {
            await route.fulfill({ status: 200, json: { success: true } });
        });

        // 5. Mock Storage
        await page.route('**/storage/v1/object/**', async route => {
            const method = route.request().method();
            if (method === 'POST') {
                await route.fulfill({ status: 200, json: { Key: 'service-orders/user-123/test.pdf' } });
            } else if (method === 'GET') {
                const fileContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Test) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
                await route.fulfill({ status: 200, contentType: 'application/pdf', body: fileContent });
            } else {
                await route.continue();
            }
        });

        // 6. Bypass Authentication and Email Verification
        await page.addInitScript((signerEmail) => {
            const user = {
                id: 'user-123',
                email: 'geraldo@grupoggv.com',
                name: 'Geraldo Admin',
                role: 'SUPER_ADMIN',
                department: 'Diretoria',
                cargo: 'CEO'
            };
            localStorage.setItem('ggv-user', JSON.stringify(user));
            localStorage.setItem('ggv-user-timestamp', Date.now().toString());

            // Bypass OS Email Verification
            sessionStorage.setItem(`email_verified_${signerEmail}`, 'true');
        }, mockSigner.email);
    });

    test('should create a new OS successfully', async ({ page }) => {
        await page.goto('/ordens-servico');
        await page.waitForLoadState('networkidle');

        // Click New OS
        await page.click('button:has-text("Nova OS")');

        // Step 1: Document Info
        await page.fill('input[placeholder*="Ex: 2025-001"]', 'OS-2026-001');
        await page.fill('input[placeholder*="Ex: OS - Contrato"]', 'E2E Test OS');
        await page.fill('textarea[placeholder*="Adicione detalhes"]', 'Testing OS Management');

        // Mock file upload
        const fileContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Test) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
        await page.setInputFiles('input[type="file"]', {
            name: 'test.pdf',
            mimeType: 'application/pdf',
            buffer: fileContent
        });

        await page.click('button:has-text("Próximo")');

        // Step 2: Signers
        // Open profiles selector
        await page.click('button:has-text("Mostrar")');
        // Add John Doe from profile
        await page.click('text=John Doe');

        // Submit
        await page.click('button:has-text("Enviar para Assinatura")');

        // Verify success alert
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('concesso');
            await dialog.accept();
        });

        // Verify it appears in the list
        await expect(page.getByText('E2E Test OS')).toBeVisible();
    });

    test('should allow a signer to sign a document', async ({ page }) => {
        // Mock specific signer and OS GET for the signature page
        await page.route('**/rest/v1/os_signers?id=eq.sig-001*', async route => {
            await route.fulfill({ json: mockSigner });
        });
        await page.route('**/rest/v1/service_orders?id=eq.os-789*', async route => {
            await route.fulfill({ json: mockOS });
        });

        // Navigate to signature page
        await page.goto('/assinar/os-789/sig-001');
        await page.waitForLoadState('networkidle');

        // Verify "Assinar" button is present and click it
        await expect(page.locator('button:has-text("Assinar")')).toBeVisible();
        await page.click('button:has-text("Assinar")');

        // Fill signature form
        await page.waitForSelector('input[placeholder="Digite seu nome completo"]');
        await page.fill('input[placeholder="Digite seu nome completo"]', 'John Doe');
        await page.fill('input[placeholder="000.000.000-00"]', '111.444.777-35');
        await page.fill('input[placeholder="21/11/1991"]', '21/11/1991');

        // Mock PATCH response for signing
        await page.route('**/rest/v1/os_signers?id=eq.sig-001', async route => {
            if (route.request().method() === 'PATCH') {
                await route.fulfill({ status: 200, json: { ...mockSigner, status: 'SIGNED', signed_at: new Date().toISOString() } });
            } else {
                await route.continue();
            }
        });

        // Submit signature
        await page.click('button:has-text("Avançar")');

        // Verify success message
        await expect(page.getByText('Documento assinado com sucesso')).toBeVisible();
    });
});
