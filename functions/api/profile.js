
// Helper function for consistent JSON responses
const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

/**
 * GET /api/profile
 * Fetches the profile information for the currently authenticated user.
 */
export async function onRequestGet(context) {
    const { env, data } = context;

    // IMPORTANT: This assumes a middleware has authenticated the user
    // and placed their information in context.data.user
    if (!data.user || !data.user.id) {
        return jsonResponse({ message: 'Authentication required.' }, { status: 401 });
    }

    const userId = data.user.id;

    try {
        // Fetch the user's profile data from the Clients table
        const user = await env.DB.prepare(
            'SELECT name, email, bio, profile_image_url, is_profile_public, is_image_public FROM Clients WHERE id = ?'
        ).bind(userId).first();

        if (!user) {
            return jsonResponse({ message: 'User not found.' }, { status: 404 });
        }

        return jsonResponse(user);

    } catch (e) {
        console.error("Profile Fetch Error:", e);
        return jsonResponse({ message: 'An error occurred while fetching the profile.' }, { status: 500 });
    }
}
