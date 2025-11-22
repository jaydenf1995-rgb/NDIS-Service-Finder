// Service data and state
let allServices = [];
let filteredServices = [];
let currentFilters = {
    categories: [],
    registered: '',
    sortBy: 'newest'
};

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded - initializing app...');
    await initializeApp();
    initializeReviewSystem();
});

async function initializeApp() {
    try {
        console.log('Loading services...');
        allServices = await loadServices();
        console.log('Services loaded:', allServices.length);
        
        // Initialize the app
        initializeStats();
        displayServices(allServices);
        setupEventListeners();
        setupServiceCardClicks();
        updateResultsCount(allServices.length);
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        allServices = getFallbackServices();
        initializeStats();
        displayServices(allServices);
        setupEventListeners();
        setupServiceCardClicks();
        updateResultsCount(allServices.length);
    }
}

// Review System Functions
function initializeReviewSystem() {
    loadReviews();
    
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addReview();
        });
    }
}

function addReview() {
    const name = document.getElementById('reviewerName').value.trim();
    const rating = document.getElementById('reviewRating').value;
    const comment = document.getElementById('reviewComment').value.trim();
    
    if (!name || !rating || !comment) {
        alert('Please fill in all fields');
        return;
    }
    
    const review = {
        id: Date.now(),
        name: name,
        rating: parseInt(rating),
        comment: comment,
        date: new Date().toLocaleDateString('en-AU'),
        timestamp: new Date().getTime()
    };
    
    // Get existing reviews
    const existingReviews = JSON.parse(localStorage.getItem('ndisReviews') || '[]');
    
    // Add new review
    existingReviews.unshift(review);
    
    // Save back to localStorage (limit to 100 reviews to prevent storage issues)
    const limitedReviews = existingReviews.slice(0, 100);
    localStorage.setItem('ndisReviews', JSON.stringify(limitedReviews));
    
    // Clear form
    document.getElementById('reviewForm').reset();
    
    // Reload reviews
    loadReviews();
    
    // Show success message
    alert('Thank you for your review!');
}

function loadReviews() {
    const reviewsContainer = document.getElementById('reviewsContainer');
    if (!reviewsContainer) return;
    
    const reviews = JSON.parse(localStorage.getItem('ndisReviews') || '[]');
    
    if (reviews.length === 0) {
        reviewsContainer.innerHTML = '<p class="no-reviews">No reviews yet. Be the first to leave a review!</p>';
        return;
    }
    
    reviewsContainer.innerHTML = reviews.map(review => `
        <div class="review-item">
            <div class="review-header">
                <strong>${escapeHtml(review.name)}</strong>
                <div class="review-rating">
                    ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                    <span class="rating-value">(${review.rating}/5)</span>
                </div>
            </div>
            <div class="review-date">${review.date}</div>
            <div class="review-comment">${escapeHtml(review.comment)}</div>
        </div>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load services from JSON file
async function loadServices() {
    try {
        console.log('Fetching services.json...');
        const response = await fetch('./services.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const services = await response.json();
        console.log('Successfully loaded services:', services.length);
        return services;
    } catch (error) {
        console.error('Error loading services:', error);
        return getFallbackServices();
    }
}

// Fallback data in case JSON fails
function getFallbackServices() {
    return [
        {
            "id": 1763270139958,
            "name": "Jayden K Farmer",
            "location": "Taree, NSW",
            "services": ["Support Coordination"],
            "registered": "Yes",
            "description": "Experienced support coordinator specializing in complex cases and plan management",
            "aboutMe": "With over 5 years of experience in the disability sector, I specialize in helping participants navigate the NDIS system.",
            "address": "17 Dugdale Avenue, Taree",
            "phone": "0478105741",
            "email": "jaydenf1995@gmail.com",
            "photo": "images/jayden-farmer.jpg",
            "dateAdded": new Date().toISOString()
        },
        {
            "id": 2,
            "name": "Sarah Johnson",
            "location": "Sydney, NSW",
            "services": ["Support Worker", "Respite"],
            "registered": "Yes",
            "description": "Dedicated support worker with 5 years experience in community access and personal care",
            "aboutMe": "I'm passionate about supporting individuals to live their best lives.",
            "address": "123 Main Street, Sydney",
            "phone": "0400 000 001",
            "email": "sarah@example.com",
            "photo": "images/sarah-johnson.jpg",
            "dateAdded": new Date(Date.now() - 86400000).toISOString()
        }
    ];
}

// Initialize statistics
function initializeStats() {
    const totalServices = document.getElementById('totalServices');
    const totalLocations = document.getElementById('totalLocations');
    
    if (totalServices) {
        totalServices.textContent = allServices.length;
    }
    
    if (totalLocations) {
        const uniqueLocations = new Set(allServices.map(service => service.location));
        totalLocations.textContent = uniqueLocations.size;
    }
}

// Display services in the UI
function displayServices(services) {
    const serviceList = document.getElementById('serviceList');
    const recentServiceList = document.getElementById('recentServiceList');
    const noResults = document.getElementById('noResults');
    const noRecentResults = document.getElementById('noRecentResults');
    
    // Display all services
    if (serviceList) {
        if (services.length === 0) {
            serviceList.innerHTML = '';
            if (noResults) noResults.style.display = 'block';
        } else {
            serviceList.innerHTML = services.map(service => createServiceCard(service)).join('');
            if (noResults) noResults.style.display = 'none';
        }
    }
    
    // Display recent services (last 3)
    if (recentServiceList) {
        const recentServices = services
            .sort((a, b) => new Date(b.dateAdded || b.id) - new Date(a.dateAdded || a.id))
            .slice(0, 3);
            
        if (recentServices.length === 0) {
            recentServiceList.innerHTML = '';
            if (noRecentResults) noRecentResults.style.display = 'block';
        } else {
            recentServiceList.innerHTML = recentServices.map(service => createServiceCard(service)).join('');
            if (noRecentResults) noRecentResults.style.display = 'none';
        }
    }
}

// Create service card HTML with stars
function createServiceCard(service) {
    const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjM0I4MkY2Ii8+Cjx0ZXh0IHg9IjQwIiB5PSI0NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+TkRJUzwvdGV4dD4KPC9zdmc+';
    
    // Calculate rating for this service
    const serviceReviews = getServiceReviews(service.id);
    const averageRating = calculateServiceRating(serviceReviews);
    const reviewCount = serviceReviews.length;
    
    return `
    <li class="service-card">
        <div class="card-header">
            <img src="${service.photo || placeholderImage}" 
                 alt="${service.name}" 
                 class="provider-photo"
                 onerror="this.src='${placeholderImage}'">
            <div class="provider-info">
                <h3>${service.name}</h3>
                
                <!-- Stars on service card -->
                <div class="service-card-rating">
                    <div class="rating-stars-small">${generateStarRatingSmall(averageRating)}</div>
                    ${reviewCount > 0 ? `<span class="rating-count">(${reviewCount})</span>` : '<span class="no-reviews-text">No reviews yet</span>'}
                </div>
                
                <p class="provider-location">📍 ${service.location}</p>
                <p class="provider-registered">${service.registered === 'Yes' ? '✅ Registered NDIS Provider' : '❌ Not Registered'}</p>
            </div>
        </div>
        <div class="card-body">
            <p class="service-description">${service.description}</p>
            <div class="service-tags">
                ${service.services.map(serviceType => `<span class="service-tag">${serviceType}</span>`).join('')}
            </div>
        </div>
        <div class="card-footer">
            <div class="contact-info">
                <p>📞 ${service.phone}</p>
                <p>✉️ ${service.email}</p>
                <p class="address">🏠 ${service.address}</p>
            </div>
        </div>
    </li>
    `;
}

// Rating helper functions
function getServiceReviews(serviceId) {
    const storedReviews = localStorage.getItem(`reviews_${serviceId}`);
    return storedReviews ? JSON.parse(storedReviews) : [];
}

function calculateServiceRating(reviews) {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / reviews.length;
}

function generateStarRatingSmall(rating) {
    return generateStarRating(rating);
}

function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
        stars += '★';
    }
    
    // Half star
    if (hasHalfStar) {
        stars += '½';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
        stars += '☆';
    }
    
    return stars;
}

// Make service cards clickable
function setupServiceCardClicks() {
    document.addEventListener('click', function(event) {
        const serviceCard = event.target.closest('.service-card');
        if (serviceCard) {
            // Add click feedback
            serviceCard.style.transform = 'scale(0.98)';
            setTimeout(() => {
                serviceCard.style.transform = '';
            }, 150);
            
            // Find the service
            const services = document.querySelectorAll('.service-card');
            let serviceIndex = Array.from(services).indexOf(serviceCard);
            const service = filteredServices[serviceIndex] || allServices[serviceIndex];
            
            if (service) {
                setTimeout(() => {
                    window.location.href = `service-details.html?id=${service.id}`;
                }, 200);
            }
        }
    });
}

// Setup all event listeners
function setupEventListeners() {
    setupSearch();
    setupFilterToggle();
    setupCategoryChips();
    setupAdvancedFilters();
}

// Setup search functionality
function setupSearch() {
    const searchBox = document.getElementById('searchBox');
    
    if (!searchBox) return;
    
    let searchTimeout;
    
    searchBox.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        
        searchTimeout = setTimeout(() => {
            performSearch(this.value);
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }, 500);
    });
}

// Perform search
function performSearch(query) {
    let results = [...allServices];
    
    if (query.trim()) {
        const searchTerm = query.toLowerCase().trim();
        results = results.filter(service =>
            service.name.toLowerCase().includes(searchTerm) ||
            service.location.toLowerCase().includes(searchTerm) ||
            service.services.some(s => s.toLowerCase().includes(searchTerm)) ||
            service.description.toLowerCase().includes(searchTerm) ||
            service.address.toLowerCase().includes(searchTerm)
        );
    }
    
    results = applyAdvancedFilters(results);
    filteredServices = results;
    displayServices(results);
    updateResultsCount(results.length);
}

// Setup filter toggle
function setupFilterToggle() {
    const filterToggle = document.getElementById('filterToggle');
    const advancedFilters = document.getElementById('advancedFilters');
    
    if (filterToggle && advancedFilters) {
        filterToggle.addEventListener('click', function() {
            const isVisible = advancedFilters.style.display === 'block';
            advancedFilters.style.display = isVisible ? 'none' : 'block';
            this.textContent = isVisible ? '📍 Advanced Filters' : '📍 Hide Filters';
        });
    }
}

// Setup category chips
function setupCategoryChips() {
    const chips = document.querySelectorAll('.category-chips .chip');
    
    chips.forEach(chip => {
        chip.addEventListener('click', function() {
            chips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            const category = this.getAttribute('data-category');
            filterByCategory(category);
        });
    });
}

// Filter by category
function filterByCategory(category) {
    let results = [...allServices];
    
    if (category) {
        results = results.filter(service => 
            service.services.includes(category)
        );
    }
    
    const searchBox = document.getElementById('searchBox');
    if (searchBox && searchBox.value.trim()) {
        results = performSearchOnResults(results, searchBox.value);
    }
    
    results = applyAdvancedFilters(results);
    filteredServices = results;
    displayServices(results);
    updateResultsCount(results.length);
}

// Setup advanced filters
function setupAdvancedFilters() {
    const applyFiltersBtn = document.getElementById('applyFilters');
    const resetFiltersBtn = document.getElementById('resetFilters');
    
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyAdvancedFiltersHandler);
    }
    
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetFiltersHandler);
    }
}

// Apply advanced filters
function applyAdvancedFiltersHandler() {
    const categoryCheckboxes = document.querySelectorAll('input[name="category"]:checked');
    const registeredFilter = document.getElementById('registeredFilter');
    const sortBy = document.getElementById('sortBy');
    
    currentFilters.categories = Array.from(categoryCheckboxes).map(cb => cb.value);
    currentFilters.registered = registeredFilter ? registeredFilter.value : '';
    currentFilters.sortBy = sortBy ? sortBy.value : 'newest';
    
    let results = [...allServices];
    
    const searchBox = document.getElementById('searchBox');
    if (searchBox && searchBox.value.trim()) {
        results = performSearchOnResults(results, searchBox.value);
    }
    
    results = applyAdvancedFilters(results);
    filteredServices = results;
    displayServices(results);
    updateResultsCount(results.length);
}

// Apply advanced filters to results
function applyAdvancedFilters(results) {
    let filtered = [...results];
    
    if (currentFilters.categories.length > 0) {
        filtered = filtered.filter(service =>
            currentFilters.categories.some(category =>
                service.services.includes(category)
            )
        );
    }
    
    if (currentFilters.registered) {
        filtered = filtered.filter(service =>
            service.registered === currentFilters.registered
        );
    }
    
    filtered = sortServices(filtered, currentFilters.sortBy);
    return filtered;
}

// Perform search on given results
function performSearchOnResults(results, query) {
    if (!query.trim()) return results;
    
    const searchTerm = query.toLowerCase().trim();
    return results.filter(service =>
        service.name.toLowerCase().includes(searchTerm) ||
        service.location.toLowerCase().includes(searchTerm) ||
        service.services.some(s => s.toLowerCase().includes(searchTerm)) ||
        service.description.toLowerCase().includes(searchTerm) ||
        service.address.toLowerCase().includes(searchTerm)
    );
}

// Sort services
function sortServices(services, sortBy) {
    const sorted = [...services];
    
    switch (sortBy) {
        case 'newest':
            return sorted.sort((a, b) => new Date(b.dateAdded || b.id) - new Date(a.dateAdded || a.id));
        case 'oldest':
            return sorted.sort((a, b) => new Date(a.dateAdded || a.id) - new Date(b.dateAdded || b.id));
        case 'name':
            return sorted.sort((a, b) => a.name.localeCompare(b.name));
        default:
            return sorted;
    }
}

// Reset filters
function resetFiltersHandler() {
    document.querySelectorAll('input[name="category"]').forEach(cb => {
        cb.checked = false;
    });
    
    const registeredFilter = document.getElementById('registeredFilter');
    const sortBy = document.getElementById('sortBy');
    
    if (registeredFilter) registeredFilter.value = '';
    if (sortBy) sortBy.value = 'newest';
    
    const chips = document.querySelectorAll('.category-chips .chip');
    chips.forEach(chip => chip.classList.remove('active'));
    if (chips.length > 0) chips[0].classList.add('active');
    
    currentFilters = {
        categories: [],
        registered: '',
        sortBy: 'newest'
    };
    
    const searchBox = document.getElementById('searchBox');
    if (searchBox) searchBox.value = '';
    
    filteredServices = allServices;
    displayServices(allServices);
    updateResultsCount(allServices.length);
}

// Update results count
function updateResultsCount(count) {
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        resultsCount.textContent = count;
    }
}
