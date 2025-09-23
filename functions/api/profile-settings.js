
// Helper function for consistent JSON responses
const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

/**
 * POST /api/profile-settings
 * Updates the privacy settings for the currently authenticated user.
 */
export async function onRequestPost(context) {
    const { request, env, data } = context;

    // IMPORTANT: Assumes authentication middleware
    if (!data.user || !data.user.id) {
        return jsonResponse({ message: 'Authentication required.' }, { status: 401 });
    }

    const userId = data.user.id;

    try {
        const { is_profile_public, is_image_public } = await request.json();

        // Basic validation
        if (typeof is_profile_public !== 'boolean' || typeof is_image_public !== 'boolean') {
            return jsonResponse({ message: 'Invalid settings format.' }, { status: 400 });
        }

        // Update the user's settings in the database
        await env.DB.prepare(
            'UPDATE Clients SET is_profile_public = ?, is_image_public = ? WHERE id = ?'
        )
        .bind(is_profile_public ? 1 : 0, is_image_public ? 1 : 0, userId)
        .run();

        return jsonResponse({ message: 'Settings updated successfully.' });

    } catch (e) {
        console.error("Settings Update Error:", e);
        return jsonResponse({ message: 'An error occurred while updating settings.' }, { status: 500 });
    }
}
