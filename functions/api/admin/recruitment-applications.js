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
                "SELECT name, email FROM RecruitmentApplications WHERE id = ? AND status = 'PENDING'"
            ).bind(applicationId).first();

            if (!application) {
                return jsonResponse({ message: 'Pending application not found or already handled.' }, { status: 404 });
            }

            // 2. Check if client exists, if not create one
            let client = await db.prepare("SELECT id FROM Clients WHERE email = ?").bind(application.email).first();
            if (client) {
                // Update existing client's role
                await db.prepare("UPDATE Clients SET role = 'A-TEAM' WHERE id = ?").bind(client.id).run();
            } else {
                // Create a new client
                const tempPassword = Math.random().toString(36).slice(-8); // Generate a random password
                // In a real app, you would email this password to the user.
                console.log(`Generated temporary password for ${application.email}: ${tempPassword}`);
                
                // You should hash the password before storing it.
                // For simplicity, we are storing it as plain text.
                await db.prepare(
                    "INSERT INTO Clients (name, email, password, role) VALUES (?, ?, ?, 'A-TEAM')"
                ).bind(application.name, application.email, tempPassword).run();
            }

            // 3. Mark the application as APPROVED
            await db.prepare(
                "UPDATE RecruitmentApplications SET status = 'APPROVED' WHERE id = ?"
            ).bind(applicationId).run();

            return jsonResponse({ message: 'Application approved successfully.' });

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
        return jsonResponse({ message: 'Failed to process application.' }, { status: 500 });
    }
}