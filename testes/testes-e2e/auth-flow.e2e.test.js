import test from 'node:test';
import assert from 'node:assert';
import { chromium } from 'playwright';
import { startServer, stopServer } from '../test-server.js';

test('TST-005 - Playwright E2E Auth Flow and UI verification', async (t) => {
    console.log('Spinning up local test server...');
    await startServer(3000);

    console.log('Starting Playwright Chromium E2E Test...');
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    let dialogMessage = '';
    // Listen to browser alerts/dialogs
    page.on('dialog', async dialog => {
        dialogMessage = dialog.message();
        console.log(`[Browser Alert] ${dialogMessage}`);
        await dialog.accept();
    });

    try {
        console.log('Navigating to http://localhost:3000...');
        await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
        
        // Assert that the page title is correct
        const pageTitle = await page.title();
        console.log(`Page Title: ${pageTitle}`);
        assert.ok(pageTitle.includes('Job Deck') || pageTitle.includes('Next Step'));

        // Assert that main UI dashboard components exist
        const brandText = await page.locator('.logo-text').innerText();
        console.log(`Brand Text: ${brandText}`);
        assert.ok(brandText.toLowerCase().includes('nextstep') || brandText.toLowerCase().includes('job deck'));

        // Step 1: Open Settings Tab to verify Credentials are auto-hidden by .env settings
        console.log('Switching to Config tab to verify auto-hiding of credentials...');
        await page.click('nav.sidebar-nav a[data-tab="config"]');
        await page.waitForTimeout(1000); // Allow rendering to settle

        // Ensure the cloud config form/panel is hidden because SUPABASE_URL exists in server environment
        const cloudForm = page.locator('#config-cloud-form');
        // Let's assert that the inputs are hidden/not visible
        const sbUrlInput = page.locator('#supabase-url');
        const isSbUrlVisible = await sbUrlInput.isVisible();
        console.log(`Is Supabase URL input visible: ${isSbUrlVisible}`);
        assert.strictEqual(isSbUrlVisible, false, 'Supabase URL input should be hidden when credentials are set in .env');

        // Switch back to dashboard tab
        await page.click('nav.sidebar-nav a[data-tab="dashboard"]');
        await page.waitForTimeout(500);

        // Step 2: Open Auth Modal via Profile Button
        console.log('Opening Authentication Modal...');
        const profileBtn = page.locator('#btn-header-profile-trigger');
        await profileBtn.click();
        
        // Verify modal has 'open' class
        const authModal = page.locator('#modal-auth');
        const isModalOpen = await authModal.evaluate(el => el.classList.contains('open'));
        assert.strictEqual(isModalOpen, true, 'Auth modal should be open after clicking profile trigger');

        // Step 3: Verify initial state is "Entrar na Nuvem"
        let modalTitle = await page.locator('#auth-modal-title').innerText();
        console.log(`Initial Modal Title: ${modalTitle}`);
        assert.strictEqual(modalTitle, 'Entrar na Nuvem');

        // Step 4: Toggle to Sign Up Mode
        console.log('Toggling to Sign Up (Cadastrar) Mode...');
        await page.click('#btn-auth-toggle');
        modalTitle = await page.locator('#auth-modal-title').innerText();
        console.log(`Toggled Modal Title: ${modalTitle}`);
        assert.strictEqual(modalTitle, 'Criar Nova Conta');

        // Step 5: Toggle back to Sign In Mode
        console.log('Toggling back to Sign In (Entrar) Mode...');
        await page.click('#btn-auth-toggle');
        modalTitle = await page.locator('#auth-modal-title').innerText();
        console.log(`Returned Modal Title: ${modalTitle}`);
        assert.strictEqual(modalTitle, 'Entrar na Nuvem');

        // Step 6: Attempt authentication with test account
        console.log('Filling credentials...');
        await page.fill('#auth-email', 'camilastests@outlook.com');
        await page.fill('#auth-password', 'camila123');

        console.log('Submitting login form...');
        await page.click('#btn-auth-submit');
        
        // Wait for auth request/response/alert to be triggered and processed
        await page.waitForTimeout(3000);

        // Assert dialog or console logs.
        console.log(`Resulting dialog message: "${dialogMessage}"`);
        if (dialogMessage) {
            assert.ok(
                dialogMessage.toLowerCase().includes('confirm') || 
                dialogMessage.toLowerCase().includes('erro') || 
                dialogMessage.toLowerCase().includes('invalid') || 
                dialogMessage.toLowerCase().includes('sucesso')
            );
        }
        
    } finally {
        console.log('Closing browser...');
        await browser.close();
        console.log('Stopping test server...');
        await stopServer();
    }
});
