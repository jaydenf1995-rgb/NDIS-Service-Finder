// review-api.js - Use Postgres API endpoints instead of Supabase
// This file replaces supabase.js to use the Postgres backend API

// Review functions using Postgres API
async function addReview(serviceId, name, rating, comment) {
    try {
        console.log('Adding review for service:', serviceId);
        
        const response = await fetch(`/api/service/${serviceId}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                rating: parseInt(rating),
                comment: comment,
                author: name || 'Anonymous'
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log('Review added successfully:', result);
        alert('Thank you for your review!');
        return true;
    } catch (error) {
        console.error('Error adding review:', error);
        alert('Error submitting review: ' + error.message);
        return false;
    }
}

async function getServiceReviews(serviceId) {
    try {
        console.log('Fetching reviews for service:', serviceId);
        
        const response = await fetch(`/api/service/${serviceId}/reviews`);
        
        if (!response.ok) {
            console.error('Error fetching reviews:', response.status);
            return [];
        }

        const reviews = await response.json();
        console.log('Reviews fetched:', reviews?.length || 0);
        
        // Transform Postgres format to match expected format
        return reviews.map(review => ({
            id: review.id,
            service_id: review.service_id,
            reviewer_name: review.author || 'Anonymous',
            rating: review.rating,
            comment: review.comment,
            created_at: review.created_at
        }));
    } catch (error) {
        console.error('Error fetching reviews:', error);
        return [];
    }
}

// Get all reviews for all services
async function getAllReviews() {
    try {
        // Note: This endpoint doesn't exist yet, but you could add it if needed
        console.warn('getAllReviews: No API endpoint available');
        return [];
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

// Export functions for use in other files (maintain same interface as Supabase)
window.supabaseClient = {
    addReview,
    getServiceReviews,
    getAllReviews,
    getServiceAverageRating
};

console.log('✅ review-api.js loaded successfully');
console.log('✅ Using Postgres API endpoints for reviews');

