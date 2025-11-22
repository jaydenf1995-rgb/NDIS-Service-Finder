// service-details.js - UPDATED FOR SUPABASE
let currentService = null;
const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjM0I4MkY2Ii8+Cjx0ZXh0IHg9IjQwIiB5PSI0NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+TkRJUzwvdGV4dD4KPC9zdmc+';

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 service-details.js loaded');
    console.log('🔧 window.supabaseClient available:', !!window.supabaseClient);
    loadServiceDetails();
});

async function loadServiceDetails() {
    const serviceId = getServiceIdFromURL();
    console.log('🔧 Loading service details for ID:', serviceId);
    
    if (!serviceId) {
        showError();
        return;
    }

    try {
        const service = await fetchServiceById(serviceId);
        console.log('🔧 Fetched service:', service);
        if (service) {
            currentService = service;
            displayServiceDetails(service);
            await loadServiceReviews(serviceId);
        } else {
            showError();
        }
    } catch (error) {
        console.error('Error loading service details:', error);
        showError();
    }
}

function getServiceIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

async function fetchServiceById(serviceId) {
    try {
        const response = await fetch('./services.json');
        if (!response.ok) {
            throw new Error('Failed to fetch services');
        }
        const services = await response.json();
        return services.find(service => service.id == serviceId);
    } catch (error) {
        console.error('Error fetching service:', error);
        return null;
    }
}

function displayServiceDetails(service) {
    const serviceDetails = document.getElementById('serviceDetails');
    const loadingMessage = document.getElementById('loadingMessage');
    
    if (!serviceDetails) {
        console.error('Service details element not found');
        return;
    }

    const servicePhoto = service.photo || placeholderImage;
    
    serviceDetails.innerHTML = `
        <a href="browse.html" class="back-link">← Back to Services</a>
        
        <div class="service-header">
            <div class="service-main-info">
                <div class="service-photo-large">
                    <img src="${servicePhoto}" 
                         alt="${service.name}" 
                         onerror="this.src='${placeholderImage}'">
                </div>
                <div class="service-basic-info">
                    <h1>${service.name}</h1>
                    <p class="service-location">📍 ${service.location}</p>
                    <p class="service-registered">${service.registered === 'Yes' ? '✅ Registered NDIS Provider' : '❌ Not Registered'}</p>
                    <div class="service-tags-large">
                        ${service.services.map(serviceType => `<span class="service-tag-large">${serviceType}</span>`).join('')}
                    </div>
                </div>
            </div>
        </div>

        <div class="service-content">
            <section class="service-info-section">
                <h2>About This Service</h2>
                <div class="service-description-full">
                    <p>${service.description}</p>
                </div>
                ${service.aboutMe ? `
                <div class="about-me-content">
                    <h3>About Me</h3>
                    <p>${service.aboutMe}</p>
                </div>
                ` : ''}
            </section>

            <section class="contact-info-section">
                <h2>Contact Information</h2>
                <div class="contact-details">
                    <p>📞 Phone: <a href="tel:${service.phone}">${service.phone}</a></p>
                    <p>✉️ Email: <a href="mailto:${service.email}">${service.email}</a></p>
                    <p>🏠 Address: ${service.address}</p>
                </div>
                <div class="quick-contact-large">
                    <a href="tel:${service.phone}" class="contact-btn-large">📞 Call Now</a>
                    <a href="mailto:${service.email}" class="contact-btn-large">✉️ Send Email</a>
                </div>
            </section>

            <!-- Reviews Section -->
            <section class="reviews-section">
                <div class="reviews-header">
                    <h2>Customer Reviews</h2>
                    <div class="average-rating" id="averageRating">
                        <div class="rating-stars-large">☆☆☆☆☆</div>
                        <div class="rating-text">Loading reviews...</div>
                    </div>
                </div>

                <!-- Review Form -->
                <div class="review-form">
                    <h3>Leave a Review</h3>
                    <form id="reviewForm">
                        <div class="form-group">
                            <label for="reviewerName">Your Name:</label>
                            <input type="text" id="reviewerName" required placeholder="Enter your name">
                        </div>
                        
                        <div class="form-group">
                            <label for="reviewRating">Rating:</label>
                            <select id="reviewRating" required>
                                <option value="">Select Rating</option>
                                <option value="5">5 Stars - Excellent</option>
                                <option value="4">4 Stars - Very Good</option>
                                <option value="3">3 Stars - Good</option>
                                <option value="2">2 Stars - Fair</option>
                                <option value="1">1 Star - Poor</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="reviewComment">Your Review:</label>
                            <textarea id="reviewComment" required placeholder="Share your experience with this service..."></textarea>
                        </div>
                        
                        <button type="submit" class="submit-btn">Submit Review</button>
                    </form>
                </div>

                <!-- Reviews List -->
                <div class="reviews-list" id="reviewsList">
                    <div class="no-reviews">Loading reviews...</div>
                </div>
            </section>
        </div>
    `;

    // Setup review form handler
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('🔧 Review form submitted');
            await submitReview(service.id);
        });
    } else {
        console.error('❌ Review form not found!');
    }

    if (loadingMessage) loadingMessage.style.display = 'none';
    serviceDetails.style.display = 'block';
    
    console.log('✅ Service details displayed');
}

async function loadServiceReviews(serviceId) {
    const reviewsList = document.getElementById('reviewsList');
    const averageRating = document.getElementById('averageRating');
    
    if (!reviewsList) {
        console.error('Reviews list element not found');
        return;
    }

    if (!window.supabaseClient) {
        console.error('❌ Supabase client not available in service-details!');
        reviewsList.innerHTML = '<div class="no-reviews">Review system not available. Please refresh the page.</div>';
        return;
    }

    try {
        console.log('🔧 Loading reviews for service:', serviceId);
        const reviews = await window.supabaseClient.getServiceReviews(serviceId);
        const avgRating = await window.supabaseClient.getServiceAverageRating(serviceId);
        
        console.log('🔧 Reviews loaded:', reviews.length, 'Average rating:', avgRating);
        
        // Update average rating display
        if (averageRating) {
            averageRating.innerHTML = `
                <div class="rating-stars-large">${generateStarRating(avgRating)}</div>
                <div class="rating-text">Based on <span id="reviewCount">${reviews.length}</span> reviews</div>
            `;
        }
        
        // Display reviews
        if (reviews.length === 0) {
            reviewsList.innerHTML = '<div class="no-reviews">No reviews yet. Be the first to leave a review!</div>';
        } else {
            reviewsList.innerHTML = reviews.map(review => `
                <div class="review-item">
                    <div class="review-header">
                        <div class="reviewer-info">
                            <strong>${escapeHtml(review.reviewer_name)}</strong>
                            <div class="review-date">${new Date(review.created_at).toLocaleDateString('en-AU')}</div>
                        </div>
                        <div class="review-rating">
                            ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                            <span class="rating-value">(${review.rating}/5)</span>
                        </div>
                    </div>
                    <div class="review-comment">${escapeHtml(review.comment)}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('❌ Error loading reviews:', error);
        reviewsList.innerHTML = '<div class="no-reviews">Error loading reviews. Please try again.</div>';
    }
}

async function submitReview(serviceId) {
    console.log('🔧 submitReview called with serviceId:', serviceId);
    
    if (!window.supabaseClient) {
        console.error('❌ Supabase client not available in submitReview!');
        alert('Review system not available. Please try again later.');
        return;
    }

    const name = document.getElementById('reviewerName').value.trim();
    const rating = document.getElementById('reviewRating').value;
    const comment = document.getElementById('reviewComment').value.trim();
    
    console.log('🔧 Form data:', { name, rating, comment });
    
    if (!name || !rating || !comment) {
        alert('Please fill in all fields');
        return;
    }

    console.log('🔧 Calling supabaseClient.addReview...');
    const success = await window.supabaseClient.addReview(serviceId, name, rating, comment);
    console.log('🔧 addReview result:', success);
    
    if (success) {
        document.getElementById('reviewForm').reset();
        await loadServiceReviews(serviceId); // Reload reviews to show the new one
    }
}

function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '★';
    if (hasHalfStar) stars += '½';
    for (let i = 0; i < emptyStars; i++) stars += '☆';
    return stars;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError() {
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'block';
}
