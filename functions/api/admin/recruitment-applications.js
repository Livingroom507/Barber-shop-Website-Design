import { sendEmail } from '../email';

// Helper function for consistent JSON responses
const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

// Main handler for /api/admin/recruitment-applications
export async function onRequest(context) {
    const { request, env } = context;

    // In a real app, you'd verify a JWT or session cookie here to ensure the user is an admin.

    if (request.method === 'GET') {
        return await handleGetApplications(context);
    }

    if (request.method === 'POST') {
        return await handlePostApproval(context);
    }

    return jsonResponse({ message: 'Method Not Allowed' }, { status: 405 });
}

/**
 * Handles GET /api/admin/recruitment-applications
 * Fetches all recruitment applications.
 */
async function handleGetApplications({ env }) {
    try {
        const { results } = await env.DB.prepare(
            `SELECT * FROM RecruitmentApplications ORDER BY created_at DESC`
        ).all();

        return jsonResponse(results);
    } catch (e) {
        console.error("Error fetching recruitment applications:", e);
        return jsonResponse({ message: 'Failed to fetch recruitment applications.' }, { status: 500 });
    }
}

/**
 * Handles POST /api/admin/recruitment-applications
 * Approves or rejects a recruitment application.
 */
async function handlePostApproval({ request, env }) {
    try {
        const { applicationId, action, adminUserId } = await request.json();

        if (!applicationId || !action || !adminUserId) {
            return jsonResponse({ message: 'Application ID, action, and Admin User ID are required.' }, { status: 400 });
        }

        const db = env.DB;

        if (action === 'APPROVE') {
            // 1. Fetch the application details
            const application = await db.prepare(
                "SELECT name, email, facebook_url, instagram_url, tiktok_url, youtube_url, twitter_url FROM RecruitmentApplications WHERE id = ? AND status = 'PENDING'"
            ).bind(applicationId).first();

            if (!application) {
                return jsonResponse({ message: 'Pending application not found or already handled.' }, { status: 404 });
            }

            let mailgunResponse = null;

            // 2. Check if client exists, if not create one
            let client = await db.prepare("SELECT id FROM Clients WHERE email = ?").bind(application.email).first();
            if (client) {
                // Update existing client's role
                await db.prepare("UPDATE Clients SET role = 'A-TEAM', facebook_url = ?, instagram_url = ?, tiktok_url = ?, youtube_url = ?, twitter_url = ? WHERE id = ?").bind(application.facebook_url, application.instagram_url, application.tiktok_url, application.youtube_url, application.twitter_url, client.id).run();
                // Optionally, send a notification email that their role has been updated
                // For now, we simulate a successful response as no email is sent for existing clients in this path.
                mailgunResponse = { message: 'Client role updated, no new email sent.' };
            } else {
                // Create a new client
                const tempPassword = Math.random().toString(36).slice(-8);
                const hashedPassword = await hashPassword(tempPassword);

                await db.prepare(
                    "INSERT INTO Clients (name, email, password, role, facebook_url, instagram_url, tiktok_url, youtube_url, twitter_url) VALUES (?, ?, ?, 'A-TEAM', ?, ?, ?, ?, ?)"
                ).bind(application.name, application.email, hashedPassword, application.facebook_url, application.instagram_url, application.tiktok_url, application.youtube_url, application.twitter_url).run();

                // Send welcome email
                mailgunResponse = await sendEmail({
                    to: application.email,
                    from: `postmaster@${env.MAILGUN_DOMAIN}`,
                    subject: 'Welcome to the A-Team!',
                    text: `Welcome! Your temporary password is ${tempPassword}. Please log in and change it.`,
                    html: `<p>Welcome! Your temporary password is <strong>${tempPassword}</strong>. Please log in and change it.</p>`,
                    env: env
                });
            }

            // 3. Mark the application as APPROVED
            await db.prepare(
                "UPDATE RecruitmentApplications SET status = 'APPROVED' WHERE id = ?"
            ).bind(applicationId).run();

            return jsonResponse({ message: 'Application approved successfully.', mailgunInfo: mailgunResponse });

        } else if (action === 'REJECT') {
            // Mark the application as REJECTED
            await db.prepare(
                "UPDATE RecruitmentApplications SET status = 'REJECTED' WHERE id = ?"
            ).bind(applicationId).run();

            return jsonResponse({ message: 'Application rejected.' });
        } else {
            return jsonResponse({ message: 'Invalid action.' }, { status: 400 });
        }

    } catch (e) {
        console.error("Error processing application:", e);
        return jsonResponse({ message: 'Failed to process application.', error: e.message }, { status: 500 });
    }
}

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}