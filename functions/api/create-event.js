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
        const db = context.env.DB;

        // Prepare the SQL statement to prevent SQL injection
        const stmt = db.prepare(
            'INSERT INTO Events (name, description, event_date, location, total_tickets, image_url) VALUES (?, ?, ?, ?, ?, ?)'
        );

        // Bind the values and execute the statement
        await stmt.bind(
            eventData.name,
            eventData.description || '', // Use empty string if description is null
            eventData.event_date,
            eventData.location,
            eventData.total_tickets,
            eventData.image_url || null // Use null if image_url is not provided
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

async function addToWaitlist(db, clientId, appointmentId = null, eventId = null) {
  const stmt = db.prepare(
    `INSERT INTO Waitlist (client_id, appointment_id, event_id) VALUES (?, ?, ?)`
  );
  await stmt.bind(clientId, appointmentId, eventId).run();
  return { success: true, message: "Added to waitlist." };
}

// Example API endpoint
async function handleRequest(request, env) {
  const url = new URL(request.url);

  if (url.pathname === "/api/waitlist" && request.method === "POST") {
    const { client_id, appointment_id, event_id } = await request.json();
    return Response.json(
      await addToWaitlist(env.DB, client_id, appointment_id, event_id)
    );
  }

  // ...other endpoints...
}
