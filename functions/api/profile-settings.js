// Helper function for consistent JSON responses
const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

/**
 * POST /api/profile-settings
 * Submits a request to update a user's profile settings.
 * These changes require admin approval.
 */
export async function onRequestPost(context) {
    const { env, request } = context;

    try {
        const { email, is_profile_public, is_image_public, bio, profile_image_url } = await request.json();

        if (!email) {
            return jsonResponse({ message: "Email is required to submit an update request." }, { status: 400 });
        }

        // 1. Find the client ID based on the email
        const client = await env.DB.prepare("SELECT id FROM Clients WHERE email = ?").bind(email).first();

        if (!client) {
            return jsonResponse({ message: "User not found." }, { status: 404 });
        }

        // 2. Consolidate the requested changes into a single JSON object
        const requested_changes = JSON.stringify({
            is_profile_public,
            is_image_public,
            bio,
            profile_image_url
        });

        // 3. Insert the request into the ProfileUpdateRequests table
        await env.DB.prepare(
            "INSERT INTO ProfileUpdateRequests (client_id, requested_changes) VALUES (?, ?)"
        ).bind(client.id, requested_changes).run();

        return jsonResponse({ message: "Your profile update request has been submitted for approval." }, { status: 202 }); // 202 Accepted

    } catch (e) {
        console.error("Profile Settings Request Error:", e);
        return jsonResponse({ message: "An error occurred while submitting your request." }, { status: 500 });
    }
}