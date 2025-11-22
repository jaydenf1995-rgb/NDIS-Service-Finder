import { db } from '@vercel/postgres';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    console.log('📝 Fetching reviews for service:', id);
    
    const client = await db.connect();
    
    const result = await client.sql`
      SELECT * FROM reviews 
      WHERE service_id = ${parseInt(id)}
      ORDER BY created_at DESC
    `;
    client.release();
    
    console.log(`✅ Found ${result.rows.length} reviews for service ${id}`);
    
    return Response.json(result.rows);
  } catch (error) {
    console.error('❌ GET Service Reviews Error:', error);
    return Response.json(
      { error: 'Failed to fetch reviews: ' + error.message }, 
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const { rating, comment, author, providerName } = await request.json();
    
    console.log('📝 Adding review for service:', { id, rating, comment, author, providerName });
    
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
      VALUES (${providerName.trim()}, ${rating}, ${comment.trim()}, ${author.trim()}, ${parseInt(id)})
      RETURNING *
    `;
    client.release();
    
    console.log('✅ Service review added successfully:', result.rows[0]);
    
    return Response.json({
      success: true,
      message: "Review submitted!",
      review: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ POST Service Review Error:', error);
    return Response.json(
      { error: 'Failed to submit review: ' + error.message }, 
      { status: 500 }
    );
  }
}
