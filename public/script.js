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
});

async function initializeApp() {
    try {
        console.log('Loading services...');
        allServices = await loadServices();
        console.log('Services loaded:', allServices.length);
        
        // Initialize the app
        initializeStats();
        await displayServices(allServices);
        setupEventListeners();
        setupServiceCardClicks(); // Make sure this is called
        updateResultsCount(allServices.length);
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        allServices = getFallbackServices();
        initializeStats();
        displayServices(allServices);
        setupEventListeners();
        setupServiceCardClicks(); // And in error case too
        updateResultsCount(allServices.length);
    }
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

// Display services in the UI - UPDATED TO RE-ATTACH CLICKS
async function displayServices(services) {
    const serviceList = document.getElementById('serviceList');
    const recentServiceList = document.getElementById('recentServiceList');
    const noResults = document.getElementById('noResults');
    const noRecentResults = document.getElementById('noRecentResults');
    
    console.log(`🔄 Displaying ${services.length} services`);
    
    // Update filteredServices for click handling
    filteredServices = services;
    
    // Display all services
    if (serviceList) {
        if (services.length === 0) {
            serviceList.innerHTML = '';
            if (noResults) noResults.style.display = 'block';
        } else {
            // Create cards asynchronously
            const cards = await Promise.all(services.map(service => createServiceCard(service)));
            serviceList.innerHTML = cards.join('');
            if (noResults) noResults.style.display = 'none';
            
            console.log(`✅ Displayed ${services.length} services in main grid`);
        }
    }
    
    // Display recent services (last 3) - only on index page
    if (recentServiceList && window.location.pathname.includes('index.html')) {
        const recentServices = services
            .sort((a, b) => new Date(b.dateAdded || b.id) - new Date(a.dateAdded || a.id))
            .slice(0, 3);
            
        if (recentServices.length === 0) {
            recentServiceList.innerHTML = '';
            if (noRecentResults) noRecentResults.style.display = 'block';
        } else {
            const recentCards = await Promise.all(recentServices.map(service => createServiceCard(service)));
            recentServiceList.innerHTML = recentCards.join('');
            if (noRecentResults) noRecentResults.style.display = 'none';
            
            console.log(`✅ Displayed ${recentServices.length} recent services`);
        }
    }
    
    // Click handlers are automatically handled by event delegation
}

// Create service card HTML with stars - UPDATED TO BE ASYNC
async function createServiceCard(service) {
    const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjM0I4MkY2Ii8+Cjx0ZXh0IHg9IjQwIiB5PSI0NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+TkRJUzwvdGV4dD4KPC9zdmc+';
    
    // Get reviews from Supabase instead of localStorage
    let serviceReviews = [];
    let averageRating = 0;
    let reviewCount = 0;
    
    if (window.supabaseClient) {
        serviceReviews = await window.supabaseClient.getServiceReviews(service.id);
        averageRating = await window.supabaseClient.getServiceAverageRating(service.id);
        reviewCount = serviceReviews.length;
    }
    
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
                    <div class="rating-stars-small">${generateStarRating(averageRating)}</div>
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

// FIXED CLICK HANDLER - Replace your current setupServiceCardClicks function
function setupServiceCardClicks() {
    console.log('🔧 Setting up service card clicks...');
    
    document.addEventListener('click', function(event) {
        const serviceCard = event.target.closest('.service-card');
        
        if (serviceCard) {
            console.log('🎯 Service card clicked!');
            
            // Get the service ID from the data attribute
            const serviceId = serviceCard.getAttribute('data-service-id');
            console.log('🔧 Service ID from data attribute:', serviceId);
            
            if (serviceId) {
                // Add click feedback
                serviceCard.style.transform = 'scale(0.98)';
                serviceCard.style.transition = 'transform 0.15s ease';
                
                setTimeout(() => {
                    serviceCard.style.transform = '';
                }, 150);
                
                // Navigate to service details
                console.log('🔧 Navigating to service details page...');
                setTimeout(() => {
                    window.location.href = `service-details.html?id=${serviceId}`;
                }, 200);
            } else {
                console.error('❌ No service ID found on clicked card');
                console.log('Card HTML:', serviceCard.outerHTML);
            }
        }
    });
    
    console.log('✅ Service card click handler setup complete');
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
// ===== SUPABASE DEBUGGING =====
console.log('🔧 script.js loaded successfully');

// Check if Supabase is available
function checkSupabaseStatus() {
    console.log('🔧 Checking Supabase status...');
    console.log('🔧 window.supabaseClient exists:', !!window.supabaseClient);
    
    if (window.supabaseClient) {
        console.log('🔧 Available functions:', Object.keys(window.supabaseClient));
        
        // Test getting reviews for a specific service
        if (window.supabaseClient.getServiceReviews) {
            console.log('🔧 Testing Supabase connection...');
            
            // Test with a known service ID
            const testServiceId = 1763270139958; // Jayden's service
            window.supabaseClient.getServiceReviews(testServiceId)
                .then(reviews => {
                    console.log(`🔧 Test successful: Found ${reviews.length} reviews for service ${testServiceId}`);
                    console.log('🔧 Sample reviews:', reviews);
                })
                .catch(error => {
                    console.error('🔧 Test failed:', error);
                });
        }
    } else {
        console.error('❌ Supabase client not available!');
        console.log('❌ Check if supabase.js is loading before script.js');
    }
}

// Wait a moment for Supabase to initialize, then check status
setTimeout(checkSupabaseStatus, 1000);

// Also check when window loads
window.addEventListener('load', checkSupabaseStatus);




