// Add this at the top of service-details.js
console.log('🔧 service-details.js loaded');
console.log('🔧 window.supabaseClient available:', !!window.supabaseClient);

// Enhanced submitReview function with more debugging
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
// Service Details Page JavaScript
let currentService = null;
let reviews = [];

// Load when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    loadServiceDetails();
});

// Get service ID from URL parameters
function getServiceIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Load service details
async function loadServiceDetails() {
    const serviceId = getServiceIdFromURL();
    
    if (!serviceId) {
        showError();
        return;
    }

    try {
        const services = await loadServices();
        currentService = services.find(service => service.id == serviceId);
        
        if (!currentService) {
            showError();
            return;
        }

        loadReviews(serviceId);
        displayServiceDetails();
        
    } catch (error) {
        console.error('Error loading service details:', error);
        showError();
    }
}

// Load services data
async function loadServices() {
    try {
        const response = await fetch('./services.json');
        if (!response.ok) {
            throw new Error('Failed to load services');
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading services:', error);
        return [];
    }
}

// Load reviews from localStorage
function loadReviews(serviceId) {
    const storedReviews = localStorage.getItem(`reviews_${serviceId}`);
    if (storedReviews) {
        reviews = JSON.parse(storedReviews);
    }
}

// Display service details with stars at top
function displayServiceDetails() {
    const serviceDetails = document.getElementById('serviceDetails');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');

    loadingMessage.style.display = 'none';
    errorMessage.style.display = 'none';

    const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjM0I4MkY2Ii8+Cjx0ZXh0IHg9IjQwIiB5PSI0NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+TkRJUzwvdGV4dD4KPC9zdmc+';

    serviceDetails.innerHTML = `
        <div class="service-header">
            <a href="index.html" class="back-link">← Back to Services</a>
            
            <div class="service-main-info">
                <div class="service-photo-large">
                    <img src="${currentService.photo || placeholderImage}" 
                         alt="${currentService.name}" 
                         onerror="this.src='${placeholderImage}'">
                </div>
                <div class="service-basic-info">
                    <h1>${currentService.name}</h1>
                    
                    <!-- Stars at the top under the name -->
                    <div class="service-rating-header">
                        <div class="rating-stars-large">${generateStarRating(calculateAverageRating())}</div>
                        <span class="rating-text-large">${reviews.length} review${reviews.length !== 1 ? 's' : ''}</span>
                        <span class="rating-average">${calculateAverageRating().toFixed(1)}/5.0</span>
                    </div>
                    
                    <p class="service-location">📍 ${currentService.location}</p>
                    <p class="service-registered">${currentService.registered === 'Yes' ? '✅ Registered NDIS Provider' : '❌ Not Registered'}</p>
                    
                    <div class="service-tags-large">
                        ${currentService.services.map(service => `<span class="service-tag-large">${service}</span>`).join('')}
                    </div>
                </div>
            </div>
        </div>

        <div class="service-content">
            <div class="service-info-section">
                <h2>About This Service</h2>
                <div class="service-description-full">
                    <p>${currentService.description}</p>
                    
                    <div id="aboutMeContent" class="about-me-content">
                        <p>${currentService.aboutMe || '<em>Detailed service description will appear here once provided through Google Forms.</em>'}</p>
                    </div>
                </div>
            </div>

            <div class="contact-info-section">
                <h2>Contact Information</h2>
                <div class="contact-details">
                    <p><strong>Phone:</strong> ${currentService.phone}</p>
                    <p><strong>Email:</strong> <a href="mailto:${currentService.email}">${currentService.email}</a></p>
                    <p><strong>Address:</strong> ${currentService.address}</p>
                </div>
                
                <div class="quick-contact-large">
                    <a href="tel:${currentService.phone}" class="contact-btn-large">
                        📞 Call Now
                    </a>
                    <a href="mailto:${currentService.email}" class="contact-btn-large">
                        ✉️ Email
                    </a>
                </div>
            </div>

            <div class="reviews-section">
                <div class="reviews-header">
                    <h2>Reviews & Feedback</h2>
                </div>

                <div class="add-review-form">
                    <h3>Leave Your Feedback</h3>
                    <form id="reviewForm">
                        <div class="form-group">
                            <label for="reviewerName">Your Name (optional):</label>
                            <input type="text" id="reviewerName" placeholder="Enter your name">
                        </div>
                        
                        <div class="form-group">
                            <label>Your Rating:</label>
                            <div class="star-rating">
                                <input type="radio" id="star5" name="rating" value="5">
                                <label for="star5">★</label>
                                <input type="radio" id="star4" name="rating" value="4">
                                <label for="star4">★</label>
                                <input type="radio" id="star3" name="rating" value="3">
                                <label for="star3">★</label>
                                <input type="radio" id="star2" name="rating" value="2">
                                <label for="star2">★</label>
                                <input type="radio" id="star1" name="rating" value="1">
                                <label for="star1">★</label>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="reviewComment">Your Review:</label>
                            <textarea id="reviewComment" placeholder="Share your experience with this service..." rows="4" required></textarea>
                        </div>
                        
                        <button type="submit" class="primary-btn">Submit Review</button>
                    </form>
                </div>

                <div class="reviews-list">
                    ${reviews.length > 0 ? 
                        reviews.map(review => `
                            <div class="review-item">
                                <div class="review-header">
                                    <div class="reviewer-info">
                                        <strong>${review.reviewerName || 'Anonymous'}</strong>
                                        <span class="review-date">${new Date(review.date).toLocaleDateString()}</span>
                                    </div>
                                    <div class="review-rating">
                                        ${generateStarRating(review.rating)}
                                    </div>
                                </div>
                                <div class="review-comment">
                                    <p>${review.comment}</p>
                                </div>
                            </div>
                        `).join('') : 
                        '<p class="no-reviews">No reviews yet. Be the first to leave feedback!</p>'
                    }
                </div>
            </div>
        </div>
    `;

    document.getElementById('reviewForm').addEventListener('submit', handleReviewSubmit);
}

// Handle review form submission
function handleReviewSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const rating = form.querySelector('input[name="rating"]:checked');
    const comment = document.getElementById('reviewComment').value.trim();
    const reviewerName = document.getElementById('reviewerName').value.trim();
    
    if (!rating) {
        alert('Please select a rating');
        return;
    }
    
    if (!comment) {
        alert('Please write a review');
        return;
    }
    
    const newReview = {
        id: Date.now(),
        rating: parseInt(rating.value),
        comment: comment,
        reviewerName: reviewerName || 'Anonymous',
        date: new Date().toISOString(),
        serviceId: currentService.id
    };
    
    reviews.unshift(newReview);
    saveReviews();
    displayServiceDetails();
    
    form.reset();
    alert('Thank you for your review!');
}

// Save reviews to localStorage
function saveReviews() {
    localStorage.setItem(`reviews_${currentService.id}`, JSON.stringify(reviews));
}

// Calculate average rating
function calculateAverageRating() {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / reviews.length;
}

// Generate star rating HTML
function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '★';
    }
    
    if (hasHalfStar) {
        stars += '½';
    }
    
    for (let i = 0; i < emptyStars; i++) {
        stars += '☆';
    }
    
    return stars;
}

// Show error message
function showError() {
    document.getElementById('loadingMessage').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'block';
    document.getElementById('serviceDetails').style.display = 'none';
}
