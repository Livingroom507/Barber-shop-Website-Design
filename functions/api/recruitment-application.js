// /functions/api/recruitment-application.js

const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const data = await request.json();

        if (!data.name || !data.email || !data.resume_url || !data.photo_id_url || !data.background_check_url) {
            return jsonResponse({ message: 'Missing required fields.' }, { status: 400 });
        }

        await env.DB.prepare(`
            INSERT INTO RecruitmentApplications 
            (name, email, resume_url, photo_id_url, background_check_url, facebook_url, instagram_url, tiktok_url, youtube_url, twitter_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            data.name, data.email, data.resume_url, data.photo_id_url, data.background_check_url, 
            data.facebook_url, data.instagram_url, data.tiktok_url, data.youtube_url, data.twitter_url
        ).run();

        return jsonResponse({ message: 'Application submitted successfully!' });

    } catch (e) {
        console.error("Recruitment Application Error:", e);
        return jsonResponse({ message: 'An error occurred while submitting your application.' }, { status: 500 });
    }
}
