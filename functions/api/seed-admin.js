
// Helper function for consistent JSON responses
const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

// Helper function to hash a password
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    // Convert ArrayBuffer to hex string
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * GET /api/seed-admin
 * Creates a default admin user if one doesn't exist.
 * This is for development setup only and should be removed or secured in production.
 */
export async function onRequestGet(context) {
    const { env } = context;

    const adminEmail = 'admin@example.com';
    const adminName = 'Admin User';
    // IMPORTANT: This is a temporary password. Change it after first login.
    const tempPassword = 'temp-password-123';

    try {
        // 1. Check if the admin user already exists
        const existingAdmin = await env.DB.prepare('SELECT id FROM Clients WHERE email = ?').bind(adminEmail).first();

        if (existingAdmin) {
            return jsonResponse({ message: 'Admin user already exists.' }, { status: 409 });
        }

        // 2. Hash the temporary password
        const hashedPassword = await hashPassword(tempPassword);

        // 3. Insert the new admin user
        await env.DB.prepare(
            'INSERT INTO Clients (name, email, password, role) VALUES (?, ?, ?, ?)'
        ).bind(adminName, adminEmail, hashedPassword, 'ADMIN').run();

        return jsonResponse({
            message: 'Admin user created successfully.',
            loginDetails: {
                email: adminEmail,
                password: tempPassword
            }
        });

    } catch (e) {
        console.error("Admin Seed Error:", e);
        return jsonResponse({ message: 'An error occurred while creating the admin user.' }, { status: 500 });
    }
}
