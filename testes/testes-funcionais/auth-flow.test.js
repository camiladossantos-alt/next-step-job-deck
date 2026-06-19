import test from 'node:test';
import assert from 'node:assert';

// Define a minimal DOM structure to prevent ReferenceErrors
const createMockElement = (id) => ({
    id,
    value: '',
    innerText: '',
    innerHTML: '',
    style: { display: 'none' },
    classList: {
        add: () => {},
        remove: () => {},
        contains: () => false
    },
    addEventListener: (event, handler) => {
        mockElementListeners[id] = mockElementListeners[id] || {};
        mockElementListeners[id][event] = handler;
    },
    dispatchEvent: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => ({ style: { display: 'none' } }),
    disabled: false,
    placeholder: '',
    appendChild: () => {},
    reset: () => {},
    click: () => {
        if (mockElementListeners[id] && mockElementListeners[id]['click']) {
            mockElementListeners[id]['click']({ preventDefault: () => {} });
        }
    }
});

const mockElementListeners = {};
const mockElements = {};
const domListeners = {};

const mockLocalStorage = {};

// Mock localStorage globally
globalThis.localStorage = {
    getItem(key) {
        return mockLocalStorage[key] || null;
    },
    setItem(key, val) {
        mockLocalStorage[key] = val;
    }
};

globalThis.window = {
    localStorage: globalThis.localStorage,
    logToConsole: () => {}
};

globalThis.document = {
    createElement(tag) {
        return {
            className: '',
            innerHTML: '',
            appendChild: () => {}
        };
    },
    getElementById(id) {
        if (!mockElements[id]) {
            mockElements[id] = createMockElement(id);
        }
        return mockElements[id];
    },
    querySelector(selector) {
        return createMockElement('dummy-query-selector');
    },
    querySelectorAll(selector) {
        return {
            forEach(callback) {
                // Return dummy node links/tabs if requested
                if (selector === '.nav-link') {
                    callback({
                        getAttribute: () => 'dashboard',
                        classList: { remove: () => {}, add: () => {} },
                        addEventListener: () => {}
                    });
                }
                if (selector === '.tab-content') {
                    callback({
                        id: 'tab-dashboard',
                        classList: { remove: () => {}, add: () => {} },
                        addEventListener: () => {}
                    });
                }
            }
        };
    },
    addEventListener(event, handler) {
        domListeners[event] = handler;
    }
};

// Mock alert globally
let lastAlert = '';
globalThis.alert = (msg) => { lastAlert = msg; };

// Mock storage config
mockLocalStorage["jsos_config"] = JSON.stringify({
    provider: "gemini",
    geminiKey: "local-gemini-key",
    ollamaHost: "http://localhost:11434",
    ollamaModel: "gemma2",
    masterResume: "resume text",
    supabaseUrl: "https://local-supabase.co",
    supabaseKey: "local-anon-key"
});

// Mock SupabaseDB
let supabaseInitialized = false;
let signUpCalled = false;
let signInCalled = false;
let signUpArgs = [];
let signInArgs = [];

// Create global window object containing UIManager later
globalThis.window.UIManager = null;

// Mock window.supabase object so SupabaseDB.init runs successfully
globalThis.window.supabase = {
    createClient: () => {
        supabaseInitialized = true;
        return {
            auth: {
                signUp: async (args) => {
                    signUpCalled = true;
                    signUpArgs = [args.email, args.password];
                    return { data: { user: { id: 'mock-user' } }, error: null };
                },
                signInWithPassword: async (args) => {
                    signInCalled = true;
                    signInArgs = [args.email, args.password];
                    return { data: { session: { user: { email: args.email } } }, error: null };
                },
                signOut: async () => {
                    return { error: null };
                },
                getSession: async () => {
                    return { data: { session: null } };
                },
                getUser: async () => {
                    return { data: { user: { id: 'mock-user', email: 'test@test.com' } } };
                }
            },
            from: () => ({
                select: () => ({
                    eq: () => ({
                        maybeSingle: async () => null
                    })
                })
            })
        };
    }
};

// Mock fetch globally
globalThis.fetch = async (url) => {
    if (url === '/api/config') {
        return {
            ok: true,
            json: async () => ({
                supabaseUrl: 'https://server-supabase.co',
                supabaseKey: 'server-anon-key',
                hasGeminiKey: true
            })
        };
    }
    return { ok: false };
};

// Import SupabaseDB and app.js dynamically after environment is fully mocked
const { SupabaseDB } = await import('../../js/supabase-db.js');
await import('../../js/app.js');

test('TST-004 - Auth Flow and UI Modals integration', async (t) => {
    const UIManager = globalThis.window.UIManager;
    assert.ok(UIManager);

    // Call init and await it to fully initialize
    await UIManager.init();

    // Verify SupabaseDB is initialized from local storage config
    assert.strictEqual(supabaseInitialized, true);

    // Test case 1: Initial state is login mode
    await UIManager.openAuthModal();
    const title = document.getElementById("auth-modal-title");
    const submitBtn = document.getElementById("btn-auth-submit");
    
    assert.strictEqual(title.innerText, "Entrar na Nuvem");
    assert.strictEqual(submitBtn.innerText, "Entrar");

    // Test case 2: Toggle to signup mode
    const toggleBtn = document.getElementById("btn-auth-toggle");
    assert.ok(toggleBtn);
    
    // Trigger toggle click
    toggleBtn.click();
    assert.strictEqual(title.innerText, "Criar Nova Conta");
    assert.strictEqual(submitBtn.innerText, "Cadastrar");

    // Test case 3: Form submit triggers signUp
    const emailInput = document.getElementById("auth-email");
    const passInput = document.getElementById("auth-password");
    emailInput.value = "newuser@test.com";
    passInput.value = "secret123";

    signUpCalled = false;
    await UIManager.handleAuthSubmit();

    assert.strictEqual(signUpCalled, true);
    assert.deepStrictEqual(signUpArgs, ["newuser@test.com", "secret123"]);
    
    // Upon successful signup, UI should reset to login mode (isAuthSignUpMode = false)
    assert.strictEqual(title.innerText, "Entrar na Nuvem");
    assert.strictEqual(submitBtn.innerText, "Entrar");

    // Test case 4: Behavior when Supabase is not initialized
    SupabaseDB.client = null; // Un-initialize
    assert.strictEqual(SupabaseDB.isInitialized(), false);

    await UIManager.openAuthModal();
    assert.strictEqual(title.innerText, "Supabase não Inicializado");
});
