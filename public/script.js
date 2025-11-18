// Add this to your script.js file
const sampleServices = [
    {
        id: 1,
        name: "Community Care Support",
        category: "Support Worker",
        description: "Experienced support workers for daily activities and community access",
        phone: "0400 123 456",
        location: "Sydney, NSW",
        isRegistered: "Yes",
        dateAdded: "2024-01-15"
    },
    {
        id: 2,
        name: "Bright Future SIL",
        category: "SIL Provider", 
        description: "Supported Independent Living accommodations with 24/7 support",
        phone: "0400 234 567", 
        location: "Melbourne, VIC",
        isRegistered: "Yes",
        dateAdded: "2024-01-10"
    },
    {
        id: 3,
        name: "Therapy Plus",
        category: "Occupational Therapist",
        description: "NDIS registered occupational therapy services",
        phone: "0400 345 678",
        location: "Brisbane, QLD",
        isRegistered: "Yes",
        dateAdded: "2024-01-12"
    }
];

// Function to display services
function displayServices() {
    const serviceList = document.getElementById('serviceList');
    const recentServiceList = document.getElementById('recentServiceList');
    
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
}

function createServiceCard(service) {
    const li = document.createElement('li');
    li.className = 'service-card';
    li.innerHTML = `
        <h3>${service.name}</h3>
        <p class="service-category">${service.category}</p>
        <p class="service-description">${service.description}</p>
        <p class="service-location">📍 ${service.location}</p>
        <p class="service-phone">📞 ${service.phone}</p>
        <p class="service-registered">✅ NDIS Registered: ${service.isRegistered}</p>
    `;
    return li;
}

// Call this when page loads
document.addEventListener('DOMContentLoaded', displayServices);
