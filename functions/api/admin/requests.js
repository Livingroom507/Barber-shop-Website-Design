// Helper function for consistent JSON responses
const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

// Main handler for /api/admin/requests
export async function onRequest(context) {
    const { request, env } = context;

    // Ensure the user is an admin (basic check, should be improved with proper auth)
    // For now, we'll assume any access to this endpoint is from an admin.
    // In a real app, you'd verify a JWT or session cookie here.

    if (request.method === 'GET') {
        return await handleGetRequests(context);
    }

    if (request.method === 'POST') {
        return await handlePostApproval(context);
    }

    return jsonResponse({ message: 'Method Not Allowed' }, { status: 405 });
}

/**
 * Handles GET /api/admin/requests
 * Fetches all PENDING profile update requests.
 */
async function handleGetRequests({ env }) {
    try {
        const { results } = await env.DB.prepare(
            `SELECT req.id, req.status, req.created_at,
                    c.name as client_name, c.email as client_email,
                    req.requested_changes
             FROM ProfileUpdateRequests req
             JOIN Clients c ON req.client_id = c.id
             WHERE req.status = 'PENDING'
             ORDER BY req.created_at ASC`
        ).all();

        return jsonResponse(results);
    } catch (e) {
        console.error("Error fetching update requests:", e);
        return jsonResponse({ message: 'Failed to fetch update requests.' }, { status: 500 });
    }
}

/**
 * Handles POST /api/admin/requests
 * Approves a profile update request.
 */
async function handlePostApproval({ request, env }) {
    try {
        const { requestId, adminUserId } = await request.json();

        if (!requestId || !adminUserId) {
            return jsonResponse({ message: 'Request ID and Admin User ID are required.' }, { status: 400 });
        }

        // 1. Fetch the request details
        const req = await env.DB.prepare(
            "SELECT client_id, requested_changes FROM ProfileUpdateRequests WHERE id = ? AND status = 'PENDING'"
        ).bind(requestId).first();

        if (!req) {
            return jsonResponse({ message: 'Pending request not found or already handled.' }, { status: 404 });
        }

        const { client_id, requested_changes } = req;
        const changes = JSON.parse(requested_changes);

        // 2. Apply the changes to the Clients table
        // Note: This is a simple update. A more robust solution would handle partial updates
        // and validate the 'changes' object.
        await env.DB.prepare(
            `UPDATE Clients
             SET is_profile_public = ?, is_image_public = ?, bio = ?, profile_image_url = ?
             WHERE id = ?`
        ).bind(
            changes.is_profile_public,
            changes.is_image_public,
            changes.bio,
            changes.profile_image_url,
            client_id
        ).run();

        // 3. Mark the request as APPROVED
        await env.DB.prepare(
            "UPDATE ProfileUpdateRequests SET status = 'APPROVED', reviewed_at = CURRENT_TIMESTAMP, reviewer_id = ? WHERE id = ?"
        ).bind(adminUserId, requestId).run();

        return jsonResponse({ message: 'Request approved and profile updated successfully.' });

    } catch (e) {
        console.error("Error approving request:", e);
        return jsonResponse({ message: 'Failed to approve request.' }, { status: 500 });
    }
}
