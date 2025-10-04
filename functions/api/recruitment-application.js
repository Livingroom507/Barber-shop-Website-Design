export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const db = env.DB;
        const data = await request.json();

        // Basic validation
        if (!data.name || !data.email) {
            return new Response(JSON.stringify({ message: 'Name and email are required.' }), { status: 400 });
        }

        // Check if an application with this email already exists
        const existingApplication = await db.prepare('SELECT id FROM RecruitmentApplications WHERE email = ?').bind(data.email).first();
        if (existingApplication) {
            return new Response(JSON.stringify({ message: 'An application with this email address has already been submitted.' }), { status: 409 });
        }

        const stmt = db.prepare(`
            INSERT INTO RecruitmentApplications (name, email, resume_url, photo_id_url, background_check_url, facebook_url, instagram_url, tiktok_url, youtube_url, twitter_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `);

        await stmt.bind(
            data.name,
            data.email,
            data.resume_url,
            data.photo_id_url,
            data.background_check_url,
            data.facebook_url,
            data.instagram_url,
            data.tiktok_url,
            data.youtube_url,
            data.twitter_url
        ).run();

        return new Response(JSON.stringify({ message: 'Application submitted successfully!' }), { status: 200 });

    } catch (error) {
        console.error('Error submitting application:', error);
        return new Response(JSON.stringify({ message: 'DATABASE_ERROR_OCCURRED', error: error.message }), { status: 500 });
    }
}