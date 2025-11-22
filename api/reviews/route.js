import { db } from '@vercel/postgres';

export async function GET() {
  try {
    console.log('📝 Fetching all reviews');
    
    const client = await db.connect();
    
    // Ensure table exists
    await client.sql`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        provider_name VARCHAR(255) NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT NOT NULL,
        author VARCHAR(255) NOT NULL,
        service_id INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    const result = await client.sql`
      SELECT * FROM reviews 
      ORDER BY created_at DESC
      LIMIT 50
    `;
    client.release();
    
    console.log(`✅ Found ${result.rows.length} reviews`);
    
    return Response.json(result.rows);
  } catch (error) {
    console.error('❌ GET Reviews Error:', error);
    return Response.json(
      { error: 'Failed to fetch reviews: ' + error.message }, 
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { rating, comment, author, providerName, serviceId } = await request.json();
    
    console.log('📝 Adding review:', { rating, comment, author, providerName, serviceId });
    
    // Validation
    if (!providerName?.trim() || !comment?.trim() || !author?.trim()) {
      return Response.json(
        { error: 'All fields are required' }, 
        { status: 400 }
      );
    }
    
    if (rating < 1 || rating > 5) {
      return Response.json(
        { error: 'Rating must be between 1 and 5' }, 
        { status: 400 }
      );
    }
    
    const client = await db.connect();
    
    const result = await client.sql`
      INSERT INTO reviews (provider_name, rating, comment, author, service_id)
      VALUES (${providerName.trim()}, ${rating}, ${comment.trim()}, ${author.trim()}, ${serviceId ? parseInt(serviceId) : null})
      RETURNING *
    `;
    client.release();
    
    console.log('✅ Review added successfully:', result.rows[0]);
    
    return Response.json({
      success: true,
      message: "Review submitted!",
      review: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ POST Review Error:', error);
    return Response.json(
      { error: 'Failed to submit review: ' + error.message }, 
      { status: 500 }
    );
  }
}
