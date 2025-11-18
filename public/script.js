// Sample services data with photos - using your current card structure
const sampleServices = [
    {
        id: 1,
        name: "Community Care Support",
        category: "Support Worker",
        description: "Experienced support workers for daily activities and community access",
        phone: "0400 123 456",
        location: "Sydney, NSW",
        isRegistered: "Yes",
        dateAdded: "2024-01-15",
        photo: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop",
        email: "care@community.com"
    },
    {
        id: 2,
        name: "Bright Future SIL",
        category: "SIL Provider", 
        description: "Supported Independent Living accommodations with 24/7 support",
        phone: "0400 234 567", 
        location: "Melbourne, VIC",
        isRegistered: "Yes",
        dateAdded: "2024-01-10",
        photo: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop",
        email: "info@brightfuture.com"
    },
    {
        id: 3,
        name: "Therapy Plus",
        category: "Occupational Therapist",
        description: "NDIS registered occupational therapy services",
        phone: "0400 345 678",
        location: "Brisbane, QLD",
        isRegistered: "Yes",
        dateAdded: "2024-01-12",
        photo: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop",
        email: "hello@therapyplus.com"
    },
    {
        id: 4,
        name: "Day Program Connect",
        category: "Offers Day Programs",
        description: "Engaging day programs and community activities",
        phone: "0400 456 789",
        location: "Perth, WA",
        isRegistered: "No",
        dateAdded: "2024-01-08",
        photo: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400&h=300&fit=crop",
        email: "programs@connect.com"
    },
    {
        id: 5,
        name: "Respite Care Australia",
        category: "Respite",
        description: "Short-term accommodation and respite care services",
        phone: "0400 567 890",
        location: "Adelaide, SA",
        isRegistered: "Yes",
        dateAdded: "2024-01-05",
        photo: "https://images.unsplash.com/photo-1558618666-fcd25856cd8d?w=400&h=300&fit=crop",
        email: "care@respite.com"
    },
    {
        id: 6,
        name: "Allied Health Partners",
        category: "Allied Health Professional",
        description: "Team of physiotherapists, speech pathologists and dietitians",
        phone: "0400 678 901",
        location: "Canberra, ACT",
        isRegistered: "Yes",
        dateAdded: "2024-01-03",
        photo: "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400&h=300&fit=crop",
        email: "team@alliedhealth.com"
    },
    {        id: 7,
        name: "Jayden Farmer",
        category: "Support Coordination",
        description: "They call me Big Bird cause of my massive B..Bird",
        phone: "0400 678 901",
        location: "Taree, NSW",
        isRegistered: "Yes",
        dateAdded: "2025-11-19",
        photo: "https://drive.google.com/uc?export=view&id=1HUHwtcEqIPGeDxd7COGsyvp_zMNOiHuW",
        email: "jaydenf1995@gmail.com"
    }
];

// Global variables for filters
let currentFilters = {
    searchQuery: '',
    categories: [],
    registered: '',
    sortBy: 'newest'
};

// Function to update the statistics
function updateStatistics() {
    const totalServices = sampleServices.length;
    const uniqueLocations = new Set(sampleServices.map(service => service.location));
    const totalLocations = uniqueLocations.size;
    
    document.getElementById('totalServices').textContent = `${totalServices}`;
    document.getElementById('totalLocations').textContent = `${totalLocations}`;
}

function createServiceCard(service) {
    const li = document.createElement('li');
    
    const photoUrl = service.photo || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop';
    
    li.innerHTML = `
        <img src="${photoUrl}" alt="${service.name}" class="service-photo" onerror="this.src='https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop'">
        <div class="service-info">
            <a href="#">${service.name}</a>
            <p>${service.category}</p>
            <p>${service.description}</p>
            <p>📍 ${service.location}</p>
            <p>📞 ${service.phone}</p>
            <p>${service.isRegistered === 'Yes' ? '✅ NDIS Registered' : 'ℹ️ Not NDIS Registered'}</p>
            <div class="quick-contact">
                <button class="contact-btn" onclick="alert('Calling ${service.phone}')">📞 Call</button>
                <button class="contact-btn" onclick="alert('Emailing ${service.email}')">✉️ Email</button>
            </div>
        </div>
        <button class="favorite-btn">♡</button>
    `;
    
    const favoriteBtn = li.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', function() {
        this.classList.toggle('favorited');
        this.textContent = this.classList.contains('favorited') ? '♥' : '♡';
    });
    
    return li;
}

// Filter and search functions
function filterServices() {
    let filteredServices = [...sampleServices];
    
    // Search filter
    if (currentFilters.searchQuery) {
        const query = currentFilters.searchQuery.toLowerCase();
        filteredServices = filteredServices.filter(service => 
            service.name.toLowerCase().includes(query) ||
            service.description.toLowerCase().includes(query) ||
            service.location.toLowerCase().includes(query) ||
            service.category.toLowerCase().includes(query)
        );
    }
    
    // Category filter
    if (currentFilters.categories.length > 0) {
        filteredServices = filteredServices.filter(service =>
            currentFilters.categories.includes(service.category)
        );
    }
    
    // Registered filter
    if (currentFilters.registered) {
        filteredServices = filteredServices.filter(service =>
            service.isRegistered === currentFilters.registered
        );
    }
    
    // Sort results
    filteredServices = sortServices(filteredServices, currentFilters.sortBy);
    
    return filteredServices;
}

function sortServices(services, sortBy) {
    switch (sortBy) {
        case 'newest':
            return services.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
        case 'oldest':
            return services.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
        case 'name':
            return services.sort((a, b) => a.name.localeCompare(b.name));
        default:
            return services;
    }
}

function displayFilteredServices(services, targetElementId = 'serviceList') {
    const serviceList = document.getElementById(targetElementId);
    const resultsCount = document.getElementById('resultsCount');
    const noResults = document.getElementById('noResults');
    const noRecentResults = document.getElementById('noRecentResults');
    
    if (serviceList) {
        serviceList.innerHTML = '';
        
        services.forEach(service => {
            const serviceItem = createServiceCard(service);
            serviceList.appendChild(serviceItem);
        });
        
        if (resultsCount) {
            resultsCount.textContent = services.length;
        }
        
        // Handle no results messages for different pages
        if (noResults) {
            noResults.style.display = services.length === 0 ? 'block' : 'none';
        }
        if (noRecentResults && targetElementId === 'recentServiceList') {
            noRecentResults.style.display = services.length === 0 ? 'block' : 'none';
        }
    }
}

// Setup search and filter event listeners
function setupSearchAndFilters() {
    // Search box
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
        searchBox.addEventListener('input', function(e) {
            currentFilters.searchQuery = e.target.value;
            const filteredServices = filterServices();
            
            // Update both service lists on home page, or just one on browse page
            if (document.getElementById('recentServiceList')) {
                // Home page - update both sections
                const recentServices = filteredServices.slice(0, 3);
                displayFilteredServices(recentServices, 'recentServiceList');
                displayFilteredServices(filteredServices, 'serviceList');
            } else {
                // Browse page - update main list only
                displayFilteredServices(filteredServices, 'serviceList');
            }
        });
    }
    
    // Category checkboxes
    const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
    categoryCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            currentFilters.categories = Array.from(categoryCheckboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);
            const filteredServices = filterServices();
            
            if (document.getElementById('recentServiceList')) {
                const recentServices = filteredServices.slice(0, 3);
                displayFilteredServices(recentServices, 'recentServiceList');
                displayFilteredServices(filteredServices, 'serviceList');
            } else {
                displayFilteredServices(filteredServices, 'serviceList');
            }
        });
    });
    
    // Registered filter
    const registeredFilter = document.getElementById('registeredFilter');
    if (registeredFilter) {
        registeredFilter.addEventListener('change', function(e) {
            currentFilters.registered = e.target.value;
            const filteredServices = filterServices();
            
            if (document.getElementById('recentServiceList')) {
                const recentServices = filteredServices.slice(0, 3);
                displayFilteredServices(recentServices, 'recentServiceList');
                displayFilteredServices(filteredServices, 'serviceList');
            } else {
                displayFilteredServices(filteredServices, 'serviceList');
            }
        });
    }
    
    // Sort by
    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
        sortBy.addEventListener('change', function(e) {
            currentFilters.sortBy = e.target.value;
            const filteredServices = filterServices();
            
            if (document.getElementById('recentServiceList')) {
                const recentServices = filteredServices.slice(0, 3);
                displayFilteredServices(recentServices, 'recentServiceList');
                displayFilteredServices(filteredServices, 'serviceList');
            } else {
                displayFilteredServices(filteredServices, 'serviceList');
            }
        });
    }
    
    // Category chips
    const categoryChips = document.querySelectorAll('.category-chips .chip');
    categoryChips.forEach(chip => {
        chip.addEventListener('click', function() {
            // Remove active class from all chips
            categoryChips.forEach(c => c.classList.remove('active'));
            // Add active class to clicked chip
            this.classList.add('active');
            
            const category = this.dataset.category;
            if (category === '') {
                // Clear category filter
                currentFilters.categories = [];
                categoryCheckboxes.forEach(cb => cb.checked = false);
            } else {
                // Set category filter
                currentFilters.categories = [category];
                categoryCheckboxes.forEach(cb => {
                    cb.checked = cb.value === category;
                });
            }
            
            const filteredServices = filterServices();
            
            if (document.getElementById('recentServiceList')) {
                const recentServices = filteredServices.slice(0, 3);
                displayFilteredServices(recentServices, 'recentServiceList');
                displayFilteredServices(filteredServices, 'serviceList');
            } else {
                displayFilteredServices(filteredServices, 'serviceList');
            }
        });
    });
    
    // Filter toggle
    const filterToggle = document.getElementById('filterToggle');
    const advancedFilters = document.getElementById('advancedFilters');
    if (filterToggle && advancedFilters) {
        filterToggle.addEventListener('click', function() {
            const isVisible = advancedFilters.style.display !== 'none';
            advancedFilters.style.display = isVisible ? 'none' : 'block';
            this.textContent = isVisible ? '📍 Advanced Filters' : '📍 Hide Filters';
        });
    }
    
    // Reset filters
    const resetFilters = document.getElementById('resetFilters');
    if (resetFilters) {
        resetFilters.addEventListener('click', function() {
            // Reset all filters
            currentFilters = {
                searchQuery: '',
                categories: [],
                registered: '',
                sortBy: 'newest'
            };
            
            // Reset UI elements
            if (searchBox) searchBox.value = '';
            categoryCheckboxes.forEach(cb => cb.checked = false);
            if (registeredFilter) registeredFilter.value = '';
            if (sortBy) sortBy.value = 'newest';
            
            // Reset category chips
            categoryChips.forEach((chip, index) => {
                chip.classList.toggle('active', index === 0); // First chip (All Services) active
            });
            
            // Show all services
            const allServices = filterServices();
            if (document.getElementById('recentServiceList')) {
                const recentServices = allServices.slice(0, 3);
                displayFilteredServices(recentServices, 'recentServiceList');
                displayFilteredServices(allServices, 'serviceList');
            } else {
                displayFilteredServices(allServices, 'serviceList');
            }
        });
    }
    
    // Apply filters button
    const applyFilters = document.getElementById('applyFilters');
    if (applyFilters) {
        applyFilters.addEventListener('click', function() {
            const filteredServices = filterServices();
            if (document.getElementById('recentServiceList')) {
                const recentServices = filteredServices.slice(0, 3);
                displayFilteredServices(recentServices, 'recentServiceList');
                displayFilteredServices(filteredServices, 'serviceList');
            } else {
                displayFilteredServices(filteredServices, 'serviceList');
            }
        });
    }
}

// Home page functionality
function setupHomePage() {
    // Display initial services
    const recentServices = sampleServices.slice(0, 3);
    displayFilteredServices(recentServices, 'recentServiceList');
    displayFilteredServices(sampleServices, 'serviceList');
    updateStatistics();
    
    // Setup search and filters
    setupSearchAndFilters();
}

// Browse page functionality
function setupBrowsePage() {
    // Display all services initially
    displayFilteredServices(sampleServices, 'serviceList');
    // Setup search and filters
    setupSearchAndFilters();
}

// Detect which page we're on and load appropriate content
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('recentServiceList')) {
        // Home page - has recent services section
        setupHomePage();
    } else if (document.getElementById('serviceList')) {
        // Browse page - only has main service list
        setupBrowsePage();
    }
});

