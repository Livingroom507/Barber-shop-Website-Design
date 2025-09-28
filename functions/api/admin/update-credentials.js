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
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * POST /api/admin/update-credentials
 * Updates the email and/or password for the admin user.
 */
export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { currentEmail, newEmail, newPassword } = await request.json();

        if (!currentEmail || (!newEmail && !newPassword)) {
            return jsonResponse({ message: 'Current email and either a new email or new password are required.' }, { status: 400 });
        }

        // 1. Find the admin user by their current email
        const adminUser = await env.DB.prepare(
            "SELECT id, role FROM Clients WHERE email = ? AND role = 'ADMIN'"
        ).bind(currentEmail).first();

        if (!adminUser) {
            return jsonResponse({ message: 'Admin user not found or you do not have permission to perform this action.' }, { status: 404 });
        }

        // 2. Prepare the update query
        let queryParts = [];
        let bindings = [];

        if (newEmail) {
            queryParts.push('email = ?');
            bindings.push(newEmail);
        }

        if (newPassword) {
            queryParts.push('password = ?');
            const hashedPassword = await hashPassword(newPassword);
            bindings.push(hashedPassword);
        }

        if (queryParts.length === 0) {
            return jsonResponse({ message: 'No new information provided to update.' }, { status: 400 });
        }

        // Add the admin user's ID to the bindings for the WHERE clause
        bindings.push(adminUser.id);

        const query = `UPDATE Clients SET ${queryParts.join(', ')} WHERE id = ?`;

        // 3. Execute the update
        await env.DB.prepare(query).bind(...bindings).run();

        return jsonResponse({ message: 'Admin credentials updated successfully.' });

    } catch (e) {
        console.error("Admin Update Error:", e);
        // Check for unique constraint violation on email
        if (e.cause?.message?.includes('UNIQUE constraint failed: Clients.email')) {
            return jsonResponse({ message: 'This email address is already in use.' }, { status: 409 });
        }
        return jsonResponse({ message: 'An error occurred while updating credentials.' }, { status: 500 });
    }
}
