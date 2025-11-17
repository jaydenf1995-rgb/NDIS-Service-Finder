// User Management
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

// Favorites System
function setupFavorites() {
    if (!localStorage.getItem('favorites')) {
        localStorage.setItem('favorites', JSON.stringify([]));
    }
}

function getFavorites() {
    return JSON.parse(localStorage.getItem('favorites')) || [];
}

function toggleFavorite(serviceId) {
    const favorites = getFavorites();
    const index = favorites.indexOf(serviceId);

    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(serviceId);
    }

    localStorage.setItem('favorites', JSON.stringify(favorites));
    return index === -1;
}

function isFavorite(serviceId) {
    const favorites = getFavorites();
    return favorites.includes(serviceId);
}

function addFavoriteButton(service) {
    const isFav = isFavorite(service.id);
    return `
        <button class="favorite-btn ${isFav ? 'favorited' : ''}"
            onclick="handleFavoriteClick(${service.id}, this)"
            title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
            ♥
        </button>
    `;
}

// Global function for favorite clicks
window.handleFavoriteClick = function(serviceId, button) {
    const wasAdded = toggleFavorite(serviceId);
    button.classList.toggle('favorited', wasAdded);
    button.title = wasAdded ? 'Remove from favorites' : 'Add to favorites';

    // Show a quick confirmation
    const originalText = button.innerHTML;
    button.innerHTML = wasAdded ? '✓' : '♥';
    setTimeout(() => {
        button.innerHTML = originalText;
    }, 500);
};

// Advanced Search and Filtering
let currentFilters = {
    categories: [],
    registered: '',
    sortBy: 'newest'
};

// Initialize statistics
async function initializeStatistics() {
    try {
        const res = await fetch('/api/search');
        const services = await res.json();

        // Count unique locations
        const locations = new Set(services.map(s => s.location?.toLowerCase().trim()).filter(Boolean));

        document.getElementById('totalServices').textContent = services.length;
        document.getElementById('totalLocations').textContent = locations.size;
    } catch (err) {
        console.error('Error loading statistics:', err);
    }
}

// Display services as cards with advanced filtering
async function searchServices() {
    const queryInput = document.getElementById("searchBox");
    const list = document.getElementById("serviceList");
    const noResults = document.getElementById("noResults");
    const resultsCount = document.getElementById("resultsCount");
    const loadingIndicator = document.getElementById("loadingIndicator");
    const allServicesSection = document.getElementById("allServicesSection");

    if (!list) return;

    // Show loading state
    if (loadingIndicator) loadingIndicator.style.display = 'flex';
    if (resultsCount) resultsCount.textContent = '0';

    const query = (queryInput?.value || "").toLowerCase();

    try {
        // Show skeleton loading for main search
        showSkeletonLoading(list);

        let res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        let services = await res.json();

        // Apply advanced filters
        services = applyAdvancedFilters(services);

        // Update results count
        if (resultsCount) resultsCount.textContent = services.length;

        // Clear and populate results
        list.innerHTML = "";
        
        if (!services.length) {
            if (noResults) noResults.style.display = "block";
            // Hide all services section if no results
            if (allServicesSection) allServicesSection.style.display = "none";
            return;
        }

        if (noResults) noResults.style.display = "none";
        if (allServicesSection) allServicesSection.style.display = "block";

        // Show all filtered results
        services.forEach(s => {
            const li = createServiceCard(s, false); // Don't show upgrade buttons on main search
            list.appendChild(li);
        });

        // Load premium and recent services (only if no search query and on homepage)
        if (!query && document.getElementById('premiumServiceList')) {
            loadPremiumServices();
            loadRecentServices();
        } else if (document.getElementById('premiumServiceList')) {
            // Hide premium and recent sections when searching
            document.getElementById('premiumServiceList').parentElement.style.display = 'none';
            document.getElementById('recentServiceList').parentElement.style.display = 'none';
        }

    } catch (err) {
        console.error("Search error:", err);
        if (resultsCount) resultsCount.textContent = '0';
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

// Load premium services for the featured section
async function loadPremiumServices() {
    try {
        const premiumList = document.getElementById('premiumServiceList');
        const noPremiumResults = document.getElementById('noPremiumResults');
        
        if (!premiumList) return;

        let res = await fetch('/api/search');
        let services = await res.json();

        // Filter premium services
        const premiumServices = services.filter(service => service.isPremium === true);

        premiumList.innerHTML = "";
        
        if (!premiumServices.length) {
            if (noPremiumResults) noPremiumResults.style.display = "block";
            return;
        }

        if (noPremiumResults) noPremiumResults.style.display = "none";

        // Show premium services (limit to 6 for display)
        premiumServices.slice(0, 6).forEach(s => {
            const li = createServiceCard(s, false); // No upgrade buttons for premium services
            premiumList.appendChild(li);
        });

    } catch (err) {
        console.error("Error loading premium services:", err);
    }
}

// Load recent services (non-premium, limited to 2)
async function loadRecentServices() {
    try {
        const recentList = document.getElementById('recentServiceList');
        const noRecentResults = document.getElementById('noRecentResults');
        
        if (!recentList) return;

        let res = await fetch('/api/search');
        let services = await res.json();

        // Filter non-premium services and sort by newest
        const nonPremiumServices = services.filter(service => !service.isPremium);
        nonPremiumServices.sort((a, b) => b.id - a.id); // Sort by ID (newest first)

        recentList.innerHTML = "";
        
        if (!nonPremiumServices.length) {
            if (noRecentResults) noRecentResults.style.display = "block";
            return;
        }

        if (noRecentResults) noRecentResults.style.display = "none";

        // Show only 2 most recent services
        nonPremiumServices.slice(0, 2).forEach(s => {
            const li = createServiceCard(s, false); // No upgrade buttons in public view
            recentList.appendChild(li);
        });

    } catch (err) {
        console.error("Error loading recent services:", err);
    }
}

// Create service card HTML (reusable function)
function createServiceCard(s, showUpgradeButton = false) {
    const li = document.createElement("li");

    const photoHTML = s.photo
        ? `<img src="${s.photo}" class="service-photo" alt="${s.name}">`
        : `<span class="service-photo" style="font-size:50px; display:flex;align-items:center;justify-content:center; background: var(--color-2); color: var(--color-4);">📍</span>`;

    const favoriteButton = addFavoriteButton(s);

    // Verification badges
    const badges = [];
    if (s.registered === 'Yes') {
        badges.push('<span class="verification-badge badge-ndis">NDIS Registered</span>');
    }
    if (s.isFeatured) {
        badges.push('<span class="premium-badge">⭐ Premium</span>');
    }

    // Quick contact buttons
    const contactButtons = [];
    if (s.phone) {
        contactButtons.push(`<a href="tel:${s.phone}" class="contact-btn">📞 Call</a>`);
    }
    if (s.email) {
        contactButtons.push(`<a href="mailto:${s.email}" class="contact-btn">✉ Email</a>`);
    }
    if (s.address) {
        contactButtons.push(`<a href="https://maps.google.com/?q=${encodeURIComponent(s.address)}" target="_blank" class="contact-btn">🗺️ Map</a>`);
    }

    // Only show upgrade button if explicitly requested and service is not premium
    // Also check if current user owns this service
    const userOwnsService = currentUser && currentUser.services && currentUser.services.some(userService => userService.id === s.id);
    const upgradeButton = (showUpgradeButton && !s.isFeatured && userOwnsService) 
        ? `<a href="premium.html?id=${s.id}" class="premium-upgrade-link">⭐ Upgrade to Premium</a>`
        : '';

    li.innerHTML = `
        ${photoHTML}
        <div class="service-info">
            ${badges.join('')}
            <div style="display: flex; justify-content: space-between; align-items: start; width: 100%;">
                <a href="service.html?id=${s.id}">${s.name}</a>
                ${favoriteButton}
            </div>
            <p style="display: flex; align-items: center; gap: 5px;">
                <span style="font-size: 1.2em;">📍</span> ${s.location}
            </p>
            <p style="background: var(--color-2); padding: 6px 12px; border-radius: 20px; font-size: 0.9em;">
                ${(s.category || []).join(", ")}
            </p>
            ${s.description ? `<p style="font-size: 0.9em; color: #666;">${s.description.substring(0, 100)}${s.description.length > 100 ? '...' : ''}</p>` : ''}
            ${s.averageRating > 0 ? `
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 5px;">
                    <span style="color: #ffc107; font-size: 1.1em;">${'★'.repeat(Math.round(s.averageRating))}${'☆'.repeat(5-Math.round(s.averageRating))}</span>
                    <span style="color: #666; font-size: 0.9em;">${s.averageRating}/5 (${s.reviewCount} reviews)</span>
                </div>
            ` : ''}
            ${contactButtons.length ? `<div class="quick-contact">${contactButtons.join('')}</div>` : ''}
            ${upgradeButton}
        </div>
    `;

    return li;
}

// Apply advanced filters to services
function applyAdvancedFilters(services) {
    let filtered = [...services];

    // Category filter
    if (currentFilters.categories.length > 0) {
        filtered = filtered.filter(service =>
            service.category && service.category.some(cat =>
                currentFilters.categories.includes(cat)
            )
        );
    }

    // NDIS Registered filter
    if (currentFilters.registered) {
        filtered = filtered.filter(service =>
            service.registered === currentFilters.registered
        );
    }

    // Sort results
    switch (currentFilters.sortBy) {
        case 'newest':
            filtered.sort((a, b) => b.id - a.id);
            break;
        case 'oldest':
            filtered.sort((a, b) => a.id - b.id);
            break;
        case 'name':
            filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
        case 'rating':
            filtered.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
            break;
    }

    return filtered;
}

// Setup advanced filters
function setupAdvancedFilters() {
    const filterToggle = document.getElementById('filterToggle');
    const advancedFilters = document.getElementById('advancedFilters');
    const applyFiltersBtn = document.getElementById('applyFilters');
    const resetFiltersBtn = document.getElementById('resetFilters');
    const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
    const registeredFilter = document.getElementById('registeredFilter');
    const sortBy = document.getElementById('sortBy');

    if (!filterToggle) return;

    // Toggle advanced filters visibility
    filterToggle.addEventListener('click', () => {
        const isVisible = advancedFilters.style.display === 'block';
        advancedFilters.style.display = isVisible ? 'none' : 'block';
        filterToggle.textContent = isVisible ? '📍 Advanced Filters' : '✖ Close Filters';
    });

    // Apply filters
    applyFiltersBtn.addEventListener('click', () => {
        // Get selected categories
        currentFilters.categories = Array.from(categoryCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        // Get other filters
        currentFilters.registered = registeredFilter.value;
        currentFilters.sortBy = sortBy.value;

        // Apply filters and search
        if (window.location.pathname.includes('browse.html')) {
            if (typeof browseServices === 'function') {
                browseServices();
            }
        } else {
            searchServices();
        }

        // Close filters on mobile
        if (window.innerWidth <= 768) {
            advancedFilters.style.display = 'none';
            filterToggle.textContent = '📍 Advanced Filters';
        }
    });

    // Reset filters
    resetFiltersBtn.addEventListener('click', () => {
        // Reset checkboxes
        categoryCheckboxes.forEach(cb => cb.checked = false);

        // Reset selects
        if (registeredFilter) registeredFilter.value = '';
        if (sortBy) sortBy.value = 'newest';

        // Reset filter state
        currentFilters = {
            categories: [],
            registered: '',
            sortBy: 'newest'
        };

        // Refresh search
        if (window.location.pathname.includes('browse.html')) {
            if (typeof browseServices === 'function') {
                browseServices();
            }
        } else {
            searchServices();
        }
    });

    // Auto-apply filters when category chips are used
    setupCategoryChips();
}

// Category chips functionality
function setupCategoryChips() {
    const chips = document.querySelectorAll('.chip');
    const categoryCheckboxes = document.querySelectorAll('input[name="category"]');

    if (!chips.length) return;

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            // Update active state
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            const category = chip.dataset.category;

            // Reset all checkboxes
            categoryCheckboxes.forEach(cb => cb.checked = false);

            // If a specific category is selected, check the corresponding checkbox
            if (category) {
                const correspondingCheckbox = Array.from(categoryCheckboxes).find(cb => cb.value === category);
                if (correspondingCheckbox) {
                    correspondingCheckbox.checked = true;
                }
            }

            // Update filters and search
            currentFilters.categories = category ? [category] : [];
            
            if (window.location.pathname.includes('browse.html')) {
                if (typeof browseServices === 'function') {
                    browseServices();
                }
            } else {
                searchServices();
            }
        });
    });
}

// Skeleton loading animation
function showSkeletonLoading(list) {
    list.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-card';
        skeleton.innerHTML = `
            <div class="skeleton-photo skeleton"></div>
            <div class="skeleton-text">
                <div class="skeleton-line short skeleton"></div>
                <div class="skeleton-line medium skeleton"></div>
                <div class="skeleton-line skeleton"></div>
            </div>
        `;
        list.appendChild(skeleton);
    }
}

// Handle Add Service Form Submission
function setupAddServiceForm() {
    const form = document.getElementById("addServiceForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');
        const messageEl = document.getElementById("message");

        // Disable button to prevent multiple submissions
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";

        if (messageEl) {
            messageEl.textContent = "";
            messageEl.style.color = "";
        }

        try {
            const formData = new FormData(form);

            const response = await fetch("/api/add", {
                method: "POST",
                body: formData
            });

            const result = await response.json();

            if (messageEl) {
                if (result.success || result.message) {
                    messageEl.textContent = result.message || "Service submitted for approval!";
                    messageEl.style.color = "green";
                    form.reset(); // Clear the form
                } else {
                    messageEl.textContent = result.error || "Failed to submit service. Please try again.";
                    messageEl.style.color = "red";
                }
            }

        } catch (error) {
            console.error("Submission error:", error);
            if (messageEl) {
                messageEl.textContent = "Network error. Please check your connection and try again.";
                messageEl.style.color = "red";
            }
        } finally {
            // Re-enable button
            submitButton.disabled = false;
            submitButton.textContent = "Submit Service";
        }
    });
}

// Handle Pending Services Display
function setupPendingServices() {
    const pendingList = document.getElementById("pendingList");
    if (!pendingList) return;

    async function loadPendingServices() {
        try {
            const res = await fetch("/api/pending");
            const pendingServices = await res.json();

            pendingList.innerHTML = "";
            if (!pendingServices.length) {
                pendingList.innerHTML = "<li>No pending services awaiting approval</li>";
                return;
            }

            pendingServices.forEach(service => {
                const li = document.createElement("li");
                li.style.cssText = `
                    background: white;
                    padding: 15px;
                    margin: 10px 0;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                `;

                const photoHTML = service.photo
                    ? `<img src="${service.photo}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-right: 15px; border: 3px solid var(--color-4);">`
                    : "";

                li.innerHTML = `
                    <div style="display: flex; align-items: start;">
                        ${photoHTML}
                        <div style="flex: 1;">
                            <h3>${service.name}</h3>
                            <p><strong>Location:</strong> ${service.location}</p>
                            <p><strong>Categories:</strong> ${(service.category || []).join(", ")}</p>
                            <p><strong>Description:</strong> ${service.description}</p>
                            <p><strong>Contact:</strong> ${service.phone} | ${service.email}</p>
                            <div style="margin-top: 10px;">
                                <button onclick="approveService(${service.id})" style="background: green; color: white; border: none; padding: 12px 20px; border-radius: 4px; margin-right: 10px; cursor: pointer; min-height: 44px;">Approve</button>
                                <button onclick="deleteService(${service.id})" style="background: red; color: white; border: none; padding: 12px 20px; border-radius: 4px; cursor: pointer; min-height: 44px;">Delete</button>
                            </div>
                        </div>
                    </div>
                `;

                pendingList.appendChild(li);
            });

        } catch (err) {
            console.error("Error loading pending services:", err);
            pendingList.innerHTML = "<li>Error loading pending services</li>";
        }
    }

    // Add global functions for approve/delete
    window.approveService = async function(id) {
        try {
            const res = await fetch(`/api/approve/${id}`, { method: "POST" });
            const result = await res.json();
            alert(result.message || "Service approved!");
            loadPendingServices();
        } catch (err) {
            console.error("Error approving service:", err);
            alert("Error approving service");
        }
    };

    window.deleteService = async function(id) {
        if (!confirm("Are you sure you want to delete this pending service?")) return;
        try {
            const res = await fetch(`/api/delete/${id}`, { method: "DELETE" });
            const result = await res.json();
            alert(result.message || "Service deleted!");
            loadPendingServices();
        } catch (err) {
            console.error("Error deleting service:", err);
            alert("Error deleting service");
        }
    };

    loadPendingServices();
}

// User login status management
function checkLoginStatus() {
    currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const loginLink = document.getElementById('loginLink');
    const dashboardLink = document.getElementById('dashboardLink');
    
    if (currentUser && loginLink && dashboardLink) {
        loginLink.style.display = 'none';
        dashboardLink.style.display = 'inline';
        dashboardLink.innerHTML = `👤 ${currentUser.name}`;
    }
}

// Logout function
function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    window.location.href = 'index.html';
}

// Initialize everything
document.addEventListener("DOMContentLoaded", () => {
    setupFavorites();
    initializeStatistics();
    checkLoginStatus();

    // Only run search on pages that have these elements
    if (document.getElementById("serviceList") && !window.location.pathname.includes('browse.html')) {
        searchServices();
        document.getElementById("searchBox")?.addEventListener("input", searchServices);
        setupAdvancedFilters();
    }

    // Setup form submission on add service page
    setupAddServiceForm();

    // Setup pending services on admin page
    if (window.location.pathname.includes('admin.html')) {
        setupPendingServices();
    }

    // Add logout functionality if logout button exists
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});