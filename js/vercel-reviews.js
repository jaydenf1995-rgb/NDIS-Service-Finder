// /js/vercel-reviews.js
class VercelReviewSystem {
    constructor(serviceId = null) {
        this.serviceId = serviceId; // For service-specific reviews
        this.reviews = [];
        this.init();
    }

    async init() {
        await this.loadReviews();
        this.setupEventListeners();
        this.setupStarRating();
    }

    async loadReviews() {
        try {
            let url = '/api/reviews';
            if (this.serviceId) {
                url = `/api/service/${this.serviceId}/reviews`;
            }
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch reviews');
            
            this.reviews = await response.json();
            this.displayReviews();
        } catch (error) {
            console.error('Error loading reviews:', error);
            this.showNotification('Error loading reviews', 'error');
        }
    }

    async addReview(reviewData) {
        try {
            // If we have a service ID, use service-specific endpoint
            let url = '/api/reviews';
            if (this.serviceId) {
                url = `/api/service/${this.serviceId}/reviews`;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reviewData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to submit review');
            }

            const newReview = await response.json();
            this.reviews.unshift(newReview.review || newReview);
            this.displayReviews();
            this.showNotification('Review submitted successfully!');
            
        } catch (error) {
            console.error('Error adding review:', error);
            this.showNotification(error.message || 'Error submitting review', 'error');
        }
    }

    displayReviews() {
        const container = document.getElementById('reviews-container');
        if (!container) return;

        if (this.reviews.length === 0) {
            container.innerHTML = `
                <div class="no-reviews">
                    <p>No reviews yet. Be the first to share your experience!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.reviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <h4>${this.escapeHtml(review.provider_name)}</h4>
                    <div class="rating">
                        ${this.generateStars(review.rating)}
                        <span class="rating-number">(${review.rating}/5)</span>
                    </div>
                </div>
                <p class="review-comment">"${this.escapeHtml(review.comment)}"</p>
                <div class="review-footer">
                    <span class="review-author">- ${this.escapeHtml(review.author)}</span>
                    <span class="review-date">${this.formatDate(review.created_at)}</span>
                </div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        const reviewForm = document.getElementById('reviewForm');
        if (reviewForm) {
            reviewForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit(reviewForm);
            });
        }

        // Add event listener for service selection if it exists
        const serviceSelect = document.getElementById('serviceSelect');
        if (serviceSelect) {
            serviceSelect.addEventListener('change', (e) => {
                this.serviceId = e.target.value;
                this.loadReviews();
            });
        }
    }

    setupStarRating() {
        const stars = document.querySelectorAll('.star-rating .star');
        stars.forEach(star => {
            star.addEventListener('click', () => {
                const rating = parseInt(star.getAttribute('data-rating'));
                document.getElementById('rating').value = rating;
                
                // Update star display
                stars.forEach(s => {
                    const starRating = parseInt(s.getAttribute('data-rating'));
                    s.textContent = starRating <= rating ? '★' : '☆';
                    s.style.color = starRating <= rating ? '#ffc107' : '#ddd';
                });
            });

            // Add hover effects
            star.addEventListener('mouseenter', () => {
                const rating = parseInt(star.getAttribute('data-rating'));
                stars.forEach(s => {
                    const starRating = parseInt(s.getAttribute('data-rating'));
                    if (starRating <= rating) {
                        s.style.color = '#ffc107';
                    }
                });
            });

            star.addEventListener('mouseleave', () => {
                const currentRating = parseInt(document.getElementById('rating').value) || 0;
                stars.forEach(s => {
                    const starRating = parseInt(s.getAttribute('data-rating'));
                    s.style.color = starRating <= currentRating ? '#ffc107' : '#ddd';
                });
            });
        });
    }

    handleFormSubmit(form) {
        const formData = new FormData(form);
        const reviewData = {
            providerName: formData.get('providerName'),
            rating: parseInt(formData.get('rating')),
            comment: formData.get('comment'),
            author: formData.get('author')
        };

        // Validate form
        if (!reviewData.providerName || !reviewData.rating || !reviewData.comment || !reviewData.author) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        if (reviewData.rating < 1 || reviewData.rating > 5) {
            this.showNotification('Please select a rating', 'error');
            return;
        }

        this.addReview(reviewData);
        form.reset();
        
        // Reset stars
        const stars = document.querySelectorAll('.star-rating .star');
        stars.forEach(star => {
            star.textContent = '☆';
            star.style.color = '#ddd';
        });
    }

    generateStars(rating) {
        return '★'.repeat(rating) + '☆'.repeat(5 - rating);
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-AU', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return 'Recently';
        }
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    showNotification(message, type = 'success') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 2rem;
            background: ${type === 'success' ? '#4CAF50' : '#f44336'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            animation: slideInRight 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 4000);
    }
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .star-rating .star {
        cursor: pointer;
        transition: color 0.2s;
        font-size: 1.5rem;
    }
    
    .review-card {
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 1rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .no-reviews {
        text-align: center;
        padding: 2rem;
        color: #666;
        font-style: italic;
    }
`;
document.head.appendChild(style);

// Initialize based on page context
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on a service page (has service ID in URL)
    const urlParams = new URLSearchParams(window.location.search);
    const serviceId = urlParams.get('id');
    
    // Or check if we're on a dedicated reviews page
    const isReviewsPage = window.location.pathname.includes('reviews') || 
                         document.getElementById('reviews-container');
    
    if (isReviewsPage) {
        window.reviewSystem = new VercelReviewSystem(serviceId);
    }
});
