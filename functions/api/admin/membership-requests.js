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
    console.log('Membership approval POST request received.');

    try {
        const { requestId, action, adminUserId } = await request.json();
        console.log(`Processing action: ${action} for request ID: ${requestId}`);

        if (!requestId || !action || !adminUserId) {
            console.error('Missing required fields.');
            return jsonResponse({ message: 'Missing required fields.' }, { status: 400 });
        }

        const db = env.DB;

        // Fetch the admin's numeric ID from their email
        const admin = await db.prepare('SELECT id FROM Clients WHERE email = ?').bind(adminUserId).first();
        if (!admin) {
            console.error(`Admin user with email ${adminUserId} not found.`);
            return jsonResponse({ message: 'Admin user not found.' }, { status: 404 });
        }
        const adminId = admin.id;

        if (action === 'APPROVE') {
            console.log('Action is APPROVE. Fetching membership request...');
            const membershipRequest = await db.prepare('SELECT name, email FROM MembershipRequests WHERE id = ?').bind(requestId).first();
            
            if (!membershipRequest) {
                console.error(`Membership request with ID ${requestId} not found.`);
                return jsonResponse({ message: 'Request not found.' }, { status: 404 });
            }
            console.log(`Found request for email: ${membershipRequest.email}`);

            console.log('Checking for existing client...');
            // Fetch role to handle multi-role logic
            const existingClient = await db.prepare('SELECT id, role FROM Clients WHERE email = ?').bind(membershipRequest.email).first();

            if (existingClient) {
                console.log(`Client already exists with role(s): ${existingClient.role}`);
                const roles = existingClient.role ? existingClient.role.split(',') : [];
                if (!roles.includes('MEMBER')) {
                    roles.push('MEMBER');
                    const newRoleString = roles.join(',');
                    console.log(`Updating client role to: "${newRoleString}"`);
                    await db.prepare('UPDATE Clients SET role = ? WHERE id = ?')
                        .bind(newRoleString, existingClient.id)
                        .run();
                    console.log('Client role updated successfully.');
                } else {
                    console.log('Client is already a MEMBER. No role update needed.');
                }

                console.log('Sending notification email.');
                if (env.MAILGUN_API_KEY && env.MAILGUN_DOMAIN) {
                    try {
                        await sendEmail({
                            to: membershipRequest.email,
                            from: `A-TEAM <noreply@${env.MAILGUN_DOMAIN}>`,
                            subject: 'Raven Community Membership Approved',
                            text: `Your membership to the Raven Community has been approved. You can log in with your existing credentials.`,
                            env: env,
                        });
                        console.log('Approval notification email sent successfully.');
                    } catch (emailError) {
                        console.error("Error sending approval notification email:", emailError);
                    }
                }
            } else {
                console.log('Client does not exist. Creating new client with MEMBER role...');
                const newPassword = crypto.randomUUID();
                const hashedPassword = await hashPassword(newPassword);
                const referralCode = `REF-${Date.now()}${Math.random().toString(36).substring(2, 6)}`;
                
                console.log('Inserting new client into database...');
                await db.prepare('INSERT INTO Clients (name, email, password, role, referral_code) VALUES (?, ?, ?, \'MEMBER\', ?)')
                    .bind(membershipRequest.name, membershipRequest.email, hashedPassword, referralCode)
                    .run();
                console.log('New client inserted successfully.');

                console.log('Sending welcome email...');
                if (env.MAILGUN_API_KEY && env.MAILGUN_DOMAIN) {
                    try {
                        await sendEmail({
                            to: membershipRequest.email,
                            from: `A-TEAM <noreply@${env.MAILGUN_DOMAIN}>`,
                            subject: 'Welcome to the Raven Community!',
                            text: `Your account has been approved. Here are your login credentials:\nUsername: ${membershipRequest.email}\nPassword: ${newPassword}\n\nPlease change your password after your first login.`,
                            env: env,
                        });
                        console.log('Welcome email sent successfully.');
                    } catch (emailError) {
                        console.error("Error sending welcome email:", emailError);
                    }
                }
            }

            console.log('Updating membership request status to APPROVED...');
            await db.prepare('UPDATE MembershipRequests SET status = \'APPROVED\', reviewed_at = CURRENT_TIMESTAMP, reviewer_id = ? WHERE id = ?')
                .bind(adminId, requestId)
                .run();
            console.log('Membership request status updated.');

            return jsonResponse({ message: 'Membership request approved.' });

        } else if (action === 'REJECT') {
            await db.prepare('UPDATE MembershipRequests SET status = \'REJECTED\', reviewed_at = CURRENT_TIMESTAMP, reviewer_id = ? WHERE id = ?')
                .bind(adminId, requestId)
                .run();
            return jsonResponse({ message: 'Membership request rejected.' });

        } else {
            return jsonResponse({ message: 'Invalid action.' }, { status: 400 });
        }

    } catch (e) {
        console.error("FATAL Membership approval error:", e);
        return jsonResponse({ message: 'An error occurred while processing the request.' }, { status: 500 });
    }
}
