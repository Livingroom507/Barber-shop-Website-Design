// /functions/api/public-profiles.js

const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

export async function onRequestGet(context) {
    const { env } = context;

    try {
        const db = env.DB;
        const { results } = await db.prepare(`
            SELECT
                name,
                created_at,
                bio,
                CASE WHEN is_image_public = 1 THEN profile_image_url ELSE NULL END as profile_image_url,
                facebook_url,
                instagram_url,
                tiktok_url,
                youtube_url,
                twitter_url
            FROM
                Clients
            WHERE
                is_profile_public = 1
            ORDER BY
                created_at DESC
        `).all();

        return jsonResponse(results);

    } catch (e) {
        console.error("Public Profiles Error:", e);
        return jsonResponse({ message: 'An error occurred while fetching public profiles.' }, { status: 500 });
    }
}