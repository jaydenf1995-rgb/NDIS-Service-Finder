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
    }
];

// Function to update the statistics
function updateStatistics() {
    // Count ALL services, not just recent ones
    const totalServices = sampleServices.length;
    
    // Count unique locations (suburbs) from ALL services
    const uniqueLocations = new Set(sampleServices.map(service => service.location));
    const totalLocations = uniqueLocations.size;
    
    // Update the statistics display
    document.getElementById('totalServices').textContent = `${totalServices}`;
    document.getElementById('totalLocations').textContent = `${totalLocations}`;
}

function createServiceCard(service) {
    const li = document.createElement('li');
    
    // Use a placeholder if no photo is available
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
    
    // Add favorite button functionality
    const favoriteBtn = li.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', function() {
        this.classList.toggle('favorited');
        this.textContent = this.classList.contains('favorited') ? '♥' : '♡';
    });
    
    return li;
}

// Function to display services AND update statistics (for home page)
function displayServices() {
    const serviceList = document.getElementById('serviceList');
    const recentServiceList = document.getElementById('recentServiceList');
    const resultsCount = document.getElementById('resultsCount');
    
    // Clear existing content
    serviceList.innerHTML = '';
    recentServiceList.innerHTML = '';
    
    // Add services to main list
    sampleServices.forEach(service => {
        const serviceItem = createServiceCard(service);
        serviceList.appendChild(serviceItem);
    });
    
    // Add recent services (last 3)
    const recentServices = sampleServices.slice(0, 3);
    recentServices.forEach(service => {
        const serviceItem = createServiceCard(service);
        recentServiceList.appendChild(serviceItem);
    });
    
    // Update results count and statistics
    resultsCount.textContent = sampleServices.length;
    updateStatistics();
}

// Browse page functionality
function setupBrowsePage() {
    const serviceList = document.getElementById('serviceList');
    const resultsCount = document.getElementById('resultsCount');
    const noResults = document.getElementById('noResults');
    
    if (serviceList) {
        // Clear existing content
        serviceList.innerHTML = '';
        
        // Add ALL services to the browse page
        sampleServices.forEach(service => {
            const serviceItem = createServiceCard(service);
            serviceList.appendChild(serviceItem);
        });
        
        // Update results count
        if (resultsCount) {
            resultsCount.textContent = sampleServices.length;
        }
        
        // Show/hide no results message
        if (noResults) {
            noResults.style.display = sampleServices.length === 0 ? 'block' : 'none';
        }
    }
}

// Detect which page we're on and load appropriate content
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('recentServiceList')) {
        // Home page - has recent services section
        displayServices();
    } else if (document.getElementById('serviceList')) {
        // Browse page - only has main service list
        setupBrowsePage();
    }
});
