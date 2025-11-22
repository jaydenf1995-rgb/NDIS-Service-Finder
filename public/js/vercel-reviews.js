class VercelReviewSystem {
    constructor(serviceId = null) {
        this.serviceId = serviceId;
        this.reviews = [];
        console.log('🚀 Review system initializing for service:', this.serviceId);
        this.init();
    }

    async init() {
        await this.loadReviews();
        this.setupEventListeners();
        this.setupStarRating();
    }

    async loadReviews() {
        try {
            let url = this.serviceId 
                ? `/api/service/${this.serviceId}/reviews`
                : '/api/reviews';
            
            console.log('📡 Fetching from:', url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            this.reviews = await response.json();
            console.log('✅ Loaded reviews:', this.reviews);
            this.displayReviews();
            
        } catch (error) {
            console.error('❌ Error loading reviews:', error);
            this.showNotification('Error loading reviews. Please try again.', 'error');
        }
    }

    async addReview(reviewData) {
        try {
            let url = this.serviceId 
                ? `/api/service/${this.serviceId}/reviews`
                : '/api/reviews';

            // Add serviceId to review data for general reviews
            if (!this.serviceId) {
                reviewData.serviceId = null;
            }

            console.log('📤 Submitting to:', url, reviewData);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reviewData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to submit review');
            }

            console.log('✅ Review submitted:', result);
            
            // Reload reviews to get the latest
            await this.loadReviews();
            this.showNotification('Review submitted successfully!');
            
        } catch (error) {
            console.error('❌ Error adding review:', error);
            this.showNotification(error.message, 'error');
        }
    }

    displayReviews() {
        const container = document.getElementById('reviews-container');
        if (!container) {
            console.log('⚠️ No reviews container found');
            return;
        }

        if (this.reviews.length === 0) {
            container.innerHTML = `
                <div class="no-reviews">
                    <p>No reviews yet. Be the first to share your experience!</p>
                </div>
            `;
            return;
        }

        console.log('🖥️ Displaying', this.reviews.length, 'reviews');
        
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
    }

    setupStarRating() {
        const stars = document.querySelectorAll('.star-rating .star');
        let currentRating = 0;

        stars.forEach(star => {
            star.addEventListener('click', () => {
                currentRating = parseInt(star.getAttribute('data-rating'));
                document.getElementById('rating').value = currentRating;
                
                stars.forEach(s => {
                    const starRating = parseInt(s.getAttribute('data-rating'));
                    s.textContent = starRating <= currentRating ? '★' : '☆';
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
        stars.forEach(star => star.textContent = '☆');
        document.getElementById('rating').value = '';
    }

    generateStars(rating) {
        return '★'.repeat(rating) + '☆'.repeat(5 - rating);
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-AU');
        } catch (error) {
            return 'Recently';
        }
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        const div = document.createElement('div');
        div.textContent = unsafe;
        return div.innerHTML;
    }

    showNotification(message, type = 'success') {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());

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
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 4000);
    }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const serviceId = urlParams.get('id');
    
    window.reviewSystem = new VercelReviewSystem(serviceId);
});
