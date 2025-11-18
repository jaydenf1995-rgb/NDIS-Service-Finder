// Sample services data with photos
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

// Function to display services
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
    
    // Update results count
    resultsCount.textContent = sampleServices.length;
}

function createServiceCard(service) {
    const li = document.createElement('li');
    li.className = 'service-card';
    
    // Use a placeholder if no photo is available
    const photoUrl = service.photo || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop';
    
    li.innerHTML = `
        <div class="service-photo">
            <img src="${photoUrl}" alt="${service.name}" onerror="this.src='https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop'">
        </div>
        <div class="service-info">
            <h3>${service.name}</h3>
            <p class="service-category">${service.category}</p>
            <p class="service-description">${service.description}</p>
            <div class="service-details">
                <p class="service-location">📍 ${service.location}</p>
                <p class="service-phone">📞 ${service.phone}</p>
                <p class="service-registered">${service.isRegistered === 'Yes' ? '✅ NDIS Registered' : 'ℹ️ Not NDIS Registered'}</p>
            </div>
        </div>
    `;
    return li;
}

// Call this when page loads
document.addEventListener('DOMContentLoaded', displayServices);
