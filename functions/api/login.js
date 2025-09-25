
// Helper function for consistent JSON responses
const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

// Helper function to hash a password (must be identical to the one in seed-admin.js)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * POST /api/login
 * Authenticates a user and returns their role.
 */
export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return jsonResponse({ message: 'Email and password are required.' }, { status: 400 });
        }

        // 1. Find the user by email
        const user = await env.DB.prepare('SELECT id, password, role FROM Clients WHERE email = ?').bind(email).first();

        if (!user) {
            return jsonResponse({ message: 'Invalid credentials.' }, { status: 401 });
        }

        // 2. Hash the provided password and compare it with the stored hash
        const hashedPassword = await hashPassword(password);

        if (hashedPassword !== user.password) {
            return jsonResponse({ message: 'Invalid credentials.' }, { status: 401 });
        }

        // 3. Login successful
        // IMPORTANT: In a real application, you would generate a session token (e.g., JWT) here
        // and return it to the client or set a secure, HTTP-only cookie.
        // This token would be used to authenticate subsequent requests.

        return jsonResponse({
            message: 'Login successful!',
            role: user.role
        });

    } catch (e) {
        console.error("Login Error:", e);
        return jsonResponse({ message: 'An error occurred during login.' }, { status: 500 });
    }
}
