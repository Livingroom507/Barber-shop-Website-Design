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

        // 2. Fetch the current client data to use as a base
        const currentClient = await env.DB.prepare(
            "SELECT is_profile_public, is_image_public, bio, profile_image_url FROM Clients WHERE id = ?"
        ).bind(client_id).first();

        if (!currentClient) {
            return jsonResponse({ message: 'Client to be updated not found.' }, { status: 404 });
        }

        // 3. Merge the changes onto the current data
        const updatedData = { ...currentClient, ...changes };

        // 4. Apply the merged changes to the Clients table, converting booleans to integers
        await env.DB.prepare(
            `UPDATE Clients
             SET is_profile_public = ?, is_image_public = ?, bio = ?, profile_image_url = ?
             WHERE id = ?`
        ).bind(
            updatedData.is_profile_public ? 1 : 0,
            updatedData.is_image_public ? 1 : 0,
            updatedData.bio,
            updatedData.profile_image_url,
            client_id
        ).run();

        // 5. Mark the request as APPROVED
        await env.DB.prepare(
            "UPDATE ProfileUpdateRequests SET status = 'APPROVED', reviewed_at = CURRENT_TIMESTAMP, reviewer_id = ? WHERE id = ?"
        ).bind(adminUserId, requestId).run();

        return jsonResponse({ message: 'Request approved and profile updated successfully.' });

    } catch (e) {
        console.error("Error approving request:", e);
        // Temporarily return the specific error for debugging
        return jsonResponse({ message: 'Failed to approve request.', error: e.message }, { status: 500 });
    }
}
