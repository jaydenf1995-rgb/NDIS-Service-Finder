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
    // ... (keep all your other sample services here)
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

// Function to display services AND update statistics
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

// Call this when page loads
document.addEventListener('DOMContentLoaded', displayServices);

