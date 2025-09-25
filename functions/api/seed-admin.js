// Helper function to hash a password (same as in seed-admin.js)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestGet(context) {
    const { env } = context;

    // Check if admin already exists
    const existing = await env.DB.prepare(
        "SELECT id FROM Clients WHERE email = ?"
    ).bind("admin@example.com").first();

    if (existing) {
        return new Response("Admin already exists.");
    }

    // Hash the password
    const passwordHash = await hashPassword("temp-password-123");

    // Insert admin user
    await env.DB.prepare(
        "INSERT INTO Clients (name, email, password, role) VALUES (?, ?, ?, ?)"
    ).bind("Admin", "admin@example.com", passwordHash, "ADMIN").run();

    return new Response("Admin account created.");
}