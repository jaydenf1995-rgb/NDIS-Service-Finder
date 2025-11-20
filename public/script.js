// Service category mapping
const serviceCategoryMap = {
    'Coordinators': 'Support Coordination',
    'Therapeutic': 'Therapeutic Supports',
    'Support Workers': 'Support Workers'
};

let allServices = [];

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded - initializing app...');
    await initializeApp();
});

async function initializeApp() {
    try {
        console.log('Loading services...');
        allServices = await loadServices();
        console.log('Services loaded:', allServices);
        
        // Initialize the app
        displayServices(allServices);
        setupFilters();
        setupSearch();
        
        console.log('App initialized successfully with', allServices.length, 'services');
    } catch (error) {
        console.error('Failed to initialize app:', error);
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
        // Return fallback data
        return getFallbackServices();
    }
}

// Fallback data in case JSON fails
function getFallbackServices() {
    return [
        {
            "id": 1763270139958,
            "name": "Jayden K Farmer",
            "location": "taree",
            "services": ["Support Coordination"],
            "registered": "Yes",
            "description": "Experienced support coordinator specializing in complex cases",
            "address": "17 dugdale avenue taree",
            "phone": "0478105741",
            "email": "jaydenf1995@gmail.com",
            "photo": "https://drive.google.com/uc?export=view&id=1HUHwtcEqIPGeDxd7COGsyvp_zMNOiHuW"
        },
        {
            "id": 2,
            "name": "Sarah Johnson",
            "location": "Sydney, NSW",
            "services": ["Support Workers", "Therapeutic Supports"],
            "registered": "Yes",
            "description": "Dedicated support worker with 5 years experience",
            "address": "123 Main Street Sydney",
            "phone": "0400 000 001",
            "email": "sarah@example.com",
            "photo": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&crop=face"
        },
        {
            "id": 3,
            "name": "Michael Chen",
            "location": "Melbourne, VIC",
            "services": ["Therapeutic Supports", "Support Coordination"],
            "registered": "Yes",
            "description": "Therapist specializing in behavioral support",
            "address": "456 Collins Street Melbourne",
            "phone": "0400 000 002",
            "email": "michael@example.com",
            "photo": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face"
        }
    ];
}

// Display services in the UI
function displayServices(services) {
    const resultsContainer = document.getElementById('searchResults');
    
    if (!resultsContainer) {
        console.error('searchResults container not found!');
        return;
    }
    
    if (services.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No services found</div>';
        return;
    }
    
    resultsContainer.innerHTML = services.map(service => `
        <div class="service-card" data-services="${service.services.join(',')}">
            <div class="card-header">
                <img src="${service.photo || 'https://via.placeholder.com/80x80/3B82F6/FFFFFF?text=NDIS'}" 
                     alt="${service.name}" 
                     class="provider-photo"
                     onerror="this.src='https://via.placeholder.com/80x80/3B82F6/FFFFFF?text=NDIS'">
                <div class="provider-info">
                    <h3>${service.name}</h3>
                    <p class="provider-location">📍 ${service.location}</p>
                    <p class="provider-registered">${service.registered === 'Yes' ? '✅ Registered NDIS Provider' : '❌ Not Registered'}</p>
                </div>
            </div>
            <div class="card-body">
                <p class="service-description">${service.description}</p>
                <div class="service-tags">
                    ${service.services.map(service => `<span class="service-tag">${service}</span>`).join('')}
                </div>
            </div>
            <div class="card-footer">
                <div class="contact-info">
                    <p>📞 ${service.phone}</p>
                    <p>✉️ ${service.email}</p>
                    <p class="address">🏠 ${service.address}</p>
                </div>
            </div>
        </div>
    `).join('');
}

// Setup filter functionality
function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active state
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Apply filter
            const filter = this.getAttribute('data-filter');
            applyFilter(filter);
        });
    });
}

// Apply filter to services
function applyFilter(category) {
    let filteredServices = [...allServices];
    
    if (category !== 'all') {
        const actualCategory = serviceCategoryMap[category] || category;
        filteredServices = allServices.filter(service => 
            service.services.includes(actualCategory)
        );
    }
    
    // Also apply current search filter
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    if (searchTerm) {
        filteredServices = filteredServices.filter(service =>
            service.name.toLowerCase().includes(searchTerm) ||
            service.location.toLowerCase().includes(searchTerm) ||
            service.services.some(s => s.toLowerCase().includes(searchTerm))
        );
    }
    
    displayServices(filteredServices);
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    
    if (!searchInput) {
        console.error('searchInput element not found!');
        return;
    }
    
    let searchTimeout;
    
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(this.value);
        }, 300);
    });
}

// Perform search
function performSearch(query) {
    const activeFilter = document.querySelector('.filter-btn.active');
    if (!activeFilter) return;
    
    const filterCategory = activeFilter.getAttribute('data-filter');
    let filteredServices = [...allServices];
    
    // Apply category filter first
    if (filterCategory !== 'all') {
        const actualCategory = serviceCategoryMap[filterCategory] || filterCategory;
        filteredServices = allServices.filter(service => 
            service.services.includes(actualCategory)
        );
    }
    
    // Then apply search filter
    if (query.trim()) {
        const searchTerm = query.toLowerCase().trim();
        filteredServices = filteredServices.filter(service =>
            service.name.toLowerCase().includes(searchTerm) ||
            service.location.toLowerCase().includes(searchTerm) ||
            service.services.some(s => s.toLowerCase().includes(searchTerm)) ||
            service.description.toLowerCase().includes(searchTerm)
        );
    }
    
    displayServices(filteredServices);
}
