// supabase.js
// Initialize Supabase client with YOUR credentials
const SUPABASE_URL = 'https://rnfnhvwdzwcvtdcjsesd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZm5odndkendjdnRkY2pzZXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NzU3MjMsImV4cCI6MjA3OTM1MTcyM30.SlA9MHq6vKjKDLMFAIf_mxMuIHrfxz8HJw9ksEo-ST4';

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Review functions
async function addReview(serviceId, name, rating, comment) {
    try {
        console.log('Adding review for service:', serviceId);
        
        const { data, error } = await supabase
            .from('reviews')
            .insert([
                { 
                    service_id: serviceId.toString(), 
                    reviewer_name: name, 
                    rating: parseInt(rating), 
                    comment: comment 
                }
            ])
            .select();

        if (error) {
            console.error('Supabase error adding review:', error);
            alert('Error submitting review: ' + error.message);
            return false;
        }

        console.log('Review added successfully:', data);
        alert('Thank you for your review!');
        return true;
    } catch (error) {
        console.error('Error adding review:', error);
        alert('Error submitting review. Please try again.');
        return false;
    }
}

async function getServiceReviews(serviceId) {
    try {
        console.log('Fetching reviews for service:', serviceId);
        
        const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .eq('service_id', serviceId.toString())
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error fetching reviews:', error);
            return [];
        }

        console.log('Reviews fetched:', data?.length || 0);
        return data || [];
    } catch (error) {
        console.error('Error fetching reviews:', error);
        return [];
    }
}

// Get all reviews for all services
async function getAllReviews() {
    try {
        const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching all reviews:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching all reviews:', error);
        return [];
    }
}

// Calculate average rating for a service
async function getServiceAverageRating(serviceId) {
    const reviews = await getServiceReviews(serviceId);
    if (reviews.length === 0) return 0;
    
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / reviews.length;
}

// Export functions for use in other files
window.supabaseClient = {
    addReview,
    getServiceReviews,
    getAllReviews,
    getServiceAverageRating
};

console.log('✅ supabase.js loaded successfully');
console.log('✅ Supabase URL:', SUPABASE_URL);
console.log('✅ Supabase client initialized:', !!supabase);

// Test the connection immediately
async function testConnection() {
    try {
        console.log('🧪 Testing Supabase connection...');
        const { data, error } = await supabase
            .from('reviews')
            .select('count')
            .limit(1);

        if (error) {
            console.error('❌ Supabase connection test failed:', error);
        } else {
            console.log('✅ Supabase connection test passed!');
            
            // Get total review count
            const { count, error: countError } = await supabase
                .from('reviews')
                .select('*', { count: 'exact', head: true });
                
            if (countError) {
                console.error('❌ Error counting reviews:', countError);
            } else {
                console.log(`✅ Total reviews in database: ${count}`);
            }
        }
    } catch (error) {
        console.error('❌ Supabase test error:', error);
    }
}

// Run the test
testConnection();
