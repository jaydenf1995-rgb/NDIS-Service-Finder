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
        displayServices(allServices);
        setupEventListeners();
        updateResultsCount(allServices.length);
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        // Use fallback data
        allServices = getFallbackServices();
        initializeStats();
        displayServices(allServices);
        setupEventListeners();
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

// Fallback data in case JSON fails - UPDATED WITH GOOGLE FORM CATEGORIES
function getFallbackServices() {
    return [
        {
            "id": 1763270139958,
            "name": "Jayden K Farmer",
            "location": "Taree, NSW",
            "services": ["Support Coordination"],
            "registered": "Yes",
            "description": "Experienced support coordinator specializing in complex cases and plan management",
            "address": "17 Dugdale Avenue, Taree",
            "phone": "0478105741",
            "email": "jaydenf1995@gmail.com",
            "photo": "https://drive.google.com/uc?export=view&id=1HUHwtcEqIPGeDxd7COGsyvp_zMNOiHuW",
            "dateAdded": new Date().toISOString()
        },
        {
            "id": 2,
            "name": "Sarah Johnson",
            "location": "Sydney, NSW",
            "services": ["Support Worker", "Respite"],
            "registered": "Yes",
            "description": "Dedicated support worker with 5 years experience in community access and personal care",
            "address": "123 Main Street, Sydney",
            "phone": "0400 000 001",
            "email": "sarah@example.com",
            "photo": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&crop=face",
            "dateAdded": new Date(Date.now() - 86400000).toISOString()
        },
        {
            "id": 3,
            "name": "Michael Chen",
            "location": "Melbourne, VIC",
            "services": ["Occupational Therapy", "Behavioural Specialist"],
            "registered": "Yes",
            "description": "Therapist specializing in behavioral support and occupational therapy",
            "address": "456 Collins Street, Melbourne",
            "phone": "0400 000 002",
            "email": "michael@example.com",
            "photo": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
            "dateAdded": new Date(Date.now() - 172800000).toISOString()
        },
        {
            "id": 4,
            "name": "Sunrise Day Programs",
            "location": "Brisbane, QLD",
            "services": ["Day Programs", "SIL Provider"],
            "registered": "Yes",
            "description": "Comprehensive day programs and supported independent living services",
            "address": "789 Queen Street, Brisbane",
            "phone": "0400 000 003",
            "email": "info@sunriseday.com",
            "photo": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjM0I4MkY2Ii8+Cjx0ZXh0IHg9IjQwIiB5PSI0NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+TkRJUzwvdGV4dD4KPC9zdmc+",
            "dateAdded": new Date(Date.now() - 259200000).toISOString()
        },
        {
            "id": 5,
            "name": "David Wilson - Physio Care",
            "location": "Perth, WA",
            "services": ["Physiotherapist"],
            "registered": "Yes",
            "description": "NDIS registered physiotherapist specializing in mobility and rehabilitation",
            "address": "321 Murray Street, Perth",
            "phone": "0400 000 004",
            "email": "david@physiocare.com",
            "photo": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjM0I4MkY2Ii8+Cjx0ZXh0IHg9IjQwIiB5PSI0NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+TkRJUzwvdGV4dD4KPC9zdmc+",
            "dateAdded": new Date(Date.now() - 345600000).toISOString()
        },
        {
            "id": 6,
            "name": "Plan Management Experts",
            "location": "Adelaide, SA",
            "services": ["Plan Management"],
            "registered": "No",
            "description": "Expert plan management services to help you manage your NDIS funding",
            "address": "654 Rundle Mall, Adelaide",
            "phone": "0400 000 005",
            "email": "admin@planmanagement.com",
            "photo": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjM0I4MkY2Ii8+Cjx0ZXh0IHg9IjQwIiB5PSI0NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+TkRJUzwvdGV4dD4KPC9zdmc+",
            "dateAdded": new Date(Date.now() - 432000000).toISOString()
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

// Create service card HTML
function createServiceCard(service) {
    const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjM0I4MkY2Ii8+Cjx0ZXh0IHg9IjQwIiB5PSI0NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+TkRJUzwvdGV4dD4KPC9zdmc+';
    
    return `
    <li class="service-card">
        <div class="card-header">
            <img src="${service.photo || placeholderImage}" 
                 alt="${service.name}" 
                 class="provider-photo"
                 onerror="this.src='${placeholderImage}'">
            <div class="provider-info">
                <h3>${service.name}</h3>
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
    
    // Apply search filter
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
    
    // Apply current filters
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

// Setup category chips - UPDATED FOR GOOGLE FORM CATEGORIES
function setupCategoryChips() {
    const chips = document.querySelectorAll('.category-chips .chip');
    
    chips.forEach(chip => {
        chip.addEventListener('click', function() {
            // Update active state
            chips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            const category = this.getAttribute('data-category');
            filterByCategory(category);
        });
    });
}

// Filter by category - UPDATED FOR GOOGLE FORM CATEGORIES
function filterByCategory(category) {
    let results = [...allServices];
    
    if (category) {
        results = results.filter(service => 
            service.services.includes(category)
        );
    }
    
    // Apply current search
    const searchBox = document.getElementById('searchBox');
    if (searchBox && searchBox.value.trim()) {
        results = performSearchOnResults(results, searchBox.value);
    }
    
    // Apply advanced filters
    results = applyAdvancedFilters(results);
    
    filteredServices = results;
    displayServices(results);
    updateResultsCount(results.length);
}

// Setup advanced filters - UPDATED FOR GOOGLE FORM CATEGORIES
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

// Apply advanced filters - UPDATED FOR GOOGLE FORM CATEGORIES
function applyAdvancedFiltersHandler() {
    const categoryCheckboxes = document.querySelectorAll('input[name="category"]:checked');
    const registeredFilter = document.getElementById('registeredFilter');
    const sortBy = document.getElementById('sortBy');
    
    currentFilters.categories = Array.from(categoryCheckboxes).map(cb => cb.value);
    currentFilters.registered = registeredFilter ? registeredFilter.value : '';
    currentFilters.sortBy = sortBy ? sortBy.value : 'newest';
    
    let results = [...allServices];
    
    // Apply search first
    const searchBox = document.getElementById('searchBox');
    if (searchBox && searchBox.value.trim()) {
        results = performSearchOnResults(results, searchBox.value);
    }
    
    // Apply advanced filters
    results = applyAdvancedFilters(results);
    
    filteredServices = results;
    displayServices(results);
    updateResultsCount(results.length);
}

// Apply advanced filters to results - UPDATED FOR GOOGLE FORM CATEGORIES
function applyAdvancedFilters(results) {
    let filtered = [...results];
    
    // Category filters
    if (currentFilters.categories.length > 0) {
        filtered = filtered.filter(service =>
            currentFilters.categories.some(category =>
                service.services.includes(category)
            )
        );
    }
    
    // Registered filter
    if (currentFilters.registered) {
        filtered = filtered.filter(service =>
            service.registered === currentFilters.registered
        );
    }
    
    // Sort results
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

// Reset filters - UPDATED FOR GOOGLE FORM CATEGORIES
function resetFiltersHandler() {
    // Reset checkboxes
    document.querySelectorAll('input[name="category"]').forEach(cb => {
        cb.checked = false;
    });
    
    // Reset selects
    const registeredFilter = document.getElementById('registeredFilter');
    const sortBy = document.getElementById('sortBy');
    
    if (registeredFilter) registeredFilter.value = '';
    if (sortBy) sortBy.value = 'newest';
    
    // Reset category chips
    const chips = document.querySelectorAll('.category-chips .chip');
    chips.forEach(chip => chip.classList.remove('active'));
    if (chips.length > 0) chips[0].classList.add('active');
    
    // Reset filter state
    currentFilters = {
        categories: [],
        registered: '',
        sortBy: 'newest'
    };
    
    // Show all services
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
