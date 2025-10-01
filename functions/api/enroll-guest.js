// /functions/api/enroll-guest.js

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

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { eventId, guestName, guestEmail, affiliateEmail } = await request.json();

        if (!eventId || !guestName || !guestEmail || !affiliateEmail) {
            return jsonResponse({ message: 'Missing required fields.' }, { status: 400 });
        }

        const db = env.DB;

        // 1. Get Affiliate ID
        const affiliate = await db.prepare('SELECT id FROM Clients WHERE email = ? AND (role = \'A-TEAM\' OR role = \'ADMIN\')').bind(affiliateEmail).first();
        if (!affiliate) {
            return jsonResponse({ message: 'Affiliate not found.' }, { status: 404 });
        }

        // 2. Find or Create Guest
        let guest;
        const existingGuest = await db.prepare('SELECT id FROM Clients WHERE email = ?').bind(guestEmail).first();
        if (existingGuest) {
            guest = existingGuest;
        } else {
            const referralCode = `REF-${Date.now()}${Math.random().toString(36).substring(2, 6)}`;
            const placeholderPassword = await hashPassword(crypto.randomUUID());
            const { meta } = await db.prepare('INSERT INTO Clients (name, email, password, referral_code) VALUES (?, ?, ?, ?);')
                .bind(guestName, guestEmail, placeholderPassword, referralCode)
                .run();
            guest = { id: meta.last_row_id };
        }

        // 3. Create Event Booking
        // First, check if the guest is already booked for this event
        const existingBooking = await db.prepare('SELECT id FROM EventBookings WHERE client_id = ? AND event_id = ?').bind(guest.id, eventId).first();
        if (existingBooking) {
            return jsonResponse({ message: 'This guest is already enrolled in this event.' }, { status: 409 });
        }

        await db.prepare('INSERT INTO EventBookings (client_id, event_id, tickets_booked) VALUES (?, ?, 1)').bind(guest.id, eventId).run();

        // 4. Update Event Tickets Sold
        await db.prepare('UPDATE Events SET tickets_sold = tickets_sold + 1 WHERE id = ?').bind(eventId).run();

        // 5. Create Referral Reward
        await db.prepare('INSERT INTO ReferralRewards (referrer_id, referred_id) VALUES (?, ?)').bind(affiliate.id, guest.id).run();

        return jsonResponse({ message: 'Guest enrolled successfully!' });

    } catch (e) {
        console.error("Enrollment Error:", e);
        return jsonResponse({ message: 'An error occurred during enrollment.' }, { status: 500 });
    }
}
