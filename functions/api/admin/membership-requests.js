import { sendEmail } from '../email';

const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestGet(context) {
    const { env } = context;

    try {
        const { results } = await env.DB.prepare(
            'SELECT id, name, email, message, created_at FROM MembershipRequests WHERE status = \'PENDING\' ORDER BY created_at DESC'
        ).all();
        return jsonResponse(results);
    } catch (e) {
        console.error("Error fetching membership requests:", e);
        return jsonResponse({ message: 'An error occurred while fetching requests.' }, { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { requestId, action, adminUserId } = await request.json();

        if (!requestId || !action || !adminUserId) {
            return jsonResponse({ message: 'Missing required fields.' }, { status: 400 });
        }

        const db = env.DB;

        if (action === 'APPROVE') {
            const membershipRequest = await db.prepare('SELECT name, email FROM MembershipRequests WHERE id = ?').bind(requestId).first();
            if (!membershipRequest) {
                return jsonResponse({ message: 'Request not found.' }, { status: 404 });
            }

            const existingClient = await db.prepare('SELECT id FROM Clients WHERE email = ?').bind(membershipRequest.email).first();

            if (existingClient) {
                // User already exists, send a notification
                if (env.MAILGUN_API_KEY && env.MAILGUN_DOMAIN) {
                    try {
                        await sendEmail({
                            to: membershipRequest.email,
                            from: `A-TEAM <noreply@${env.MAILGUN_DOMAIN}>`,
                            subject: 'Raven Community Membership Approved',
                            text: `Your membership to the Raven Community has been approved. You can log in with your existing credentials.`,
                            env: env,
                        });
                    } catch (emailError) {
                        console.error("Error sending approval notification email:", emailError);
                    }
                }
            } else {
                // New user, create account and send welcome email
                const newPassword = crypto.randomUUID();
                const hashedPassword = await hashPassword(newPassword);
                const referralCode = `REF-${Date.now()}${Math.random().toString(36).substring(2, 6)}`;
                await db.prepare('INSERT INTO Clients (name, email, password, role, referral_code) VALUES (?, ?, ?, \'MEMBER\', ?)')
                    .bind(membershipRequest.name, membershipRequest.email, hashedPassword, referralCode)
                    .run();

                if (env.MAILGUN_API_KEY && env.MAILGUN_DOMAIN) {
                    try {
                        await sendEmail({
                            to: membershipRequest.email,
                            from: `A-TEAM <noreply@${env.MAILGUN_DOMAIN}>`,
                            subject: 'Welcome to the Raven Community!',
                            text: `Your account has been approved. Here are your login credentials:\nUsername: ${membershipRequest.email}\nPassword: ${newPassword}\n\nPlease change your password after your first login.`,
                            env: env,
                        });
                    } catch (emailError) {
                        console.error("Error sending welcome email:", emailError);
                    }
                }
            }

            // Update the request status
            await db.prepare('UPDATE MembershipRequests SET status = \'APPROVED\', reviewed_at = CURRENT_TIMESTAMP, reviewer_id = ? WHERE id = ?')
                .bind(adminUserId, requestId)
                .run();

            return jsonResponse({ message: 'Membership request approved.' });

        } else if (action === 'REJECT') {
            await db.prepare('UPDATE MembershipRequests SET status = \'REJECTED\', reviewed_at = CURRENT_TIMESTAMP, reviewer_id = ? WHERE id = ?')
                .bind(adminUserId, requestId)
                .run();
            return jsonResponse({ message: 'Membership request rejected.' });

        } else {
            return jsonResponse({ message: 'Invalid action.' }, { status: 400 });
        }

    } catch (e) {
        console.error("Membership approval error:", e);
        return jsonResponse({ message: 'An error occurred while processing the request.' }, { status: 500 });
    }
}
