// /functions/api/admin/membership-requests.js

const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestGet(context) {
    const { env } = context;

    try {
        const { results } = await env.DB.prepare(
            'SELECT id, name, email, message, created_at FROM MembershipRequests WHERE status = \'PENDING\' ORDER BY created_at DESC'
        ).all();
        return jsonResponse(results);
    } catch (e) {
        console.error("Error fetching membership requests:", e);
        return jsonResponse({ message: 'An error occurred while fetching requests.' }, { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { requestId, action, adminUserId } = await request.json();

        if (!requestId || !action || !adminUserId) {
            return jsonResponse({ message: 'Missing required fields.' }, { status: 400 });
        }

        const db = env.DB;

        if (action === 'APPROVE') {
            const request = await db.prepare('SELECT name, email FROM MembershipRequests WHERE id = ?').bind(requestId).first();
            if (!request) {
                return jsonResponse({ message: 'Request not found.' }, { status: 404 });
            }

            // Create a new user
            const newPassword = crypto.randomUUID(); // Generate a secure, random password
            const hashedPassword = await hashPassword(newPassword);
            const referralCode = `REF-${Date.now()}${Math.random().toString(36).substring(2, 6)}`;
            await db.prepare('INSERT OR IGNORE INTO Clients (name, email, password, role, referral_code) VALUES (?, ?, ?, \'MEMBER\', ?)')
                .bind(request.name, request.email, hashedPassword, referralCode)
                .run();

            // --- EMAIL SIMULATION ---
            // In a real application, you would integrate an email service (e.g., SendGrid, Mailgun) here.
            console.log(`\n--- SIMULATING EMAIL ---\nTo: ${request.email}\nSubject: Welcome to the Raven Community!\n\nYour account has been approved. Here are your login credentials:\nUsername: ${request.email}\nPassword: ${newPassword}\n\nPlease change your password after your first login.\n----------------------\n`);

            // Update the request status
            await db.prepare('UPDATE MembershipRequests SET status = \'APPROVED\', reviewed_at = CURRENT_TIMESTAMP, reviewer_id = ? WHERE id = ?')
                .bind(adminUserId, requestId)
                .run();

            return jsonResponse({ message: 'Membership request approved.' });

        } else if (action === 'REJECT') {
            await db.prepare('UPDATE MembershipRequests SET status = \'REJECTED\', reviewed_at = CURRENT_TIMESTAMP, reviewer_id = ? WHERE id = ?')
                .bind(adminUserId, requestId)
                .run();
            return jsonResponse({ message: 'Membership request rejected.' });

        } else {
            return jsonResponse({ message: 'Invalid action.' }, { status: 400 });
        }

    } catch (e) {
        console.error("Membership approval error:", e);
        return jsonResponse({ message: 'An error occurred while processing the request.' }, { status: 500 });
    }
}
