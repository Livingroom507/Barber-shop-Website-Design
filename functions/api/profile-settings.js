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
    const { env, request } = context;
    const { email, is_profile_public, is_image_public, bio, profile_image_url } = await request.json();
    if (!email) {
        return new Response(JSON.stringify({ message: "Email required" }), { status: 400 });
    }
    await env.DB.prepare(
        "UPDATE Clients SET is_profile_public = ?, is_image_public = ?, bio = ?, profile_image_url = ? WHERE email = ?"
    ).bind(is_profile_public, is_image_public, bio, profile_image_url, email).run();
    return new Response(JSON.stringify({ message: "Profile updated" }), { headers: { "Content-Type": "application/json" } });
}
