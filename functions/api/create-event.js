export async function onRequest(context) {
    // Only allow POST requests
    if (context.request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        // Parse the JSON body from the request
        const eventData = await context.request.json();

        // Validate the incoming data (basic validation)
        if (!eventData.name || !eventData.event_date || !eventData.location || !eventData.total_tickets) {
            return new Response(JSON.stringify({ message: 'Missing required fields' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Get the D1 database binding
        const db = context.env.barbershop_db;

        // Prepare the SQL statement to prevent SQL injection
        const stmt = db.prepare(
            'INSERT INTO Events (name, description, event_date, location, total_tickets) VALUES (?, ?, ?, ?, ?)'
        );

        // Bind the values and execute the statement
        await stmt.bind(
            eventData.name,
            eventData.description || '', // Use empty string if description is null
            eventData.event_date,
            eventData.location,
            eventData.total_tickets
        ).run();

        // Return a success response
        return new Response(JSON.stringify({ message: 'Event created successfully' }), {
            status: 201, // 201 Created
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        // Log the error for debugging
        console.error('Error creating event:', error);

        // Return a generic error response
        return new Response(JSON.stringify({ message: 'Internal Server Error', error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
