/**
 * ================================================================
 * GRAYTECH SYSTEMS - FIBRE COVERAGE APPLICATION
 * ================================================================
 * Architecture: Modular, Event-Driven, Data-First Design
 * Version: 3.0.0 - Enterprise Edition
 * ================================================================
 */

// ================================================================
// DATA LAYER - Fetch & Normalize Coverage Data
// ================================================================

/**
 * Fetches coverage data from external JSON source
 */
async function fetchCoverageData(source = 'data/coverage.json') {
    try {
        const response = await fetch(source);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.standard_tier || !data.special_tier) {
            throw new Error('Invalid data structure: Missing tier definitions');
        }
        return data;
    } catch (error) {
        console.error('[GrayTech] Failed to fetch coverage data:', error);
        return { standard_tier: { packages: [], areas: [] }, special_tier: { packages: [], areas: [] } };
    }
}

/**
 * Normalizes area name for consistent comparison
 */
function normalizeAreaName(name) {
    if (!name) return '';
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Gets all available areas across all tiers
 */
function getAllAreas(data) {
    const areaMap = {};
    if (data.standard_tier && data.standard_tier.areas) {
        data.standard_tier.areas.forEach(area => {
            areaMap[normalizeAreaName(area)] = 'standard';
        });
    }
    if (data.special_tier && data.special_tier.areas) {
        data.special_tier.areas.forEach(area => {
            areaMap[normalizeAreaName(area)] = 'special';
        });
    }
    return areaMap;
}

/**
 * Finds the tier and data for a specific area
 */
function findArea(areaName, data) {
    const normalized = normalizeAreaName(areaName);
    if (!normalized) return null;
    
    if (data.standard_tier && data.standard_tier.areas) {
        const matched = data.standard_tier.areas.find(
            a => normalizeAreaName(a) === normalized
        );
        if (matched) {
            return { tier: 'standard', data: data.standard_tier, matchedName: matched };
        }
    }
    
    if (data.special_tier && data.special_tier.areas) {
        const matched = data.special_tier.areas.find(
            a => normalizeAreaName(a) === normalized
        );
        if (matched) {
            return { tier: 'special', data: data.special_tier, matchedName: matched };
        }
    }
    return null;
}

/**
 * Gets packages for a specific tier
 */
function getPackagesForTier(tier, data) {
    if (tier === 'standard' && data.standard_tier) {
        return data.standard_tier.packages || [];
    }
    if (tier === 'special' && data.special_tier) {
        return data.special_tier.packages || [];
    }
    return [];
}

// ================================================================
// ENHANCED SEARCH ENGINE
// ================================================================

/**
 * Extracts suburb from full address string
 */
function extractSuburbFromAddress(input) {
    if (!input) return '';
    
    let clean = input.toLowerCase().trim();
    clean = clean.replace(/^\d+\s+/, '');
    clean = clean.replace(/\b(?:street|st|avenue|ave|drive|dr|road|rd|lane|ln|close|crescent|cres|boulevard|blvd|court|ct|place|pl|square|sq|parkway|pkwy|way|terrace|ter|walk|wlk|circle|cir|loop|trail|trl)\b/gi, '');
    
    const parts = clean.split(/[,;]|\s+-\s+/).map(p => p.trim());
    const suburbIndicators = ['park', 'view', 'hill', 'rand', 'town', 'city', 'vale', 'wood', 'field', 'gate', 'ridge', 'meadow', 'brook', 'dale', 'hurst', 'ville', 'berg', 'fontein'];
    
    for (const part of parts) {
        const lowerPart = part.toLowerCase();
        for (const indicator of suburbIndicators) {
            if (lowerPart.includes(indicator)) {
                return normalizeAreaName(part);
            }
        }
    }
    
    return normalizeAreaName(parts[parts.length - 1] || parts[0] || input);
}

/**
 * Calculates Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b[i - 1] === a[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

/**
 * Enhanced area matching with fuzzy logic
 */
function matchAreaEnhanced(query, data) {
    const extracted = extractSuburbFromAddress(query);
    if (!extracted) return null;
    
    const allAreas = getAllAreas(data);
    let bestMatch = null;
    let bestScore = 0;
    
    Object.keys(allAreas).forEach(area => {
        const normalizedArea = normalizeAreaName(area);
        
        // Exact match
        if (normalizedArea === extracted) {
            bestMatch = { area, tier: allAreas[area], score: 100, matchType: 'exact' };
            bestScore = 100;
            return;
        }
        
        // Contains match
        if (normalizedArea.includes(extracted) || extracted.includes(normalizedArea)) {
            const score = 90 - Math.abs(normalizedArea.length - extracted.length);
            if (score > bestScore) {
                bestMatch = { area, tier: allAreas[area], score, matchType: 'contains' };
                bestScore = score;
            }
        }
        
        // Fuzzy match
        const distance = levenshteinDistance(extracted, normalizedArea);
        const maxLen = Math.max(extracted.length, normalizedArea.length);
        const score = Math.round((1 - distance / maxLen) * 100);
        if (score > 70 && score > bestScore) {
            bestMatch = { area, tier: allAreas[area], score, matchType: 'fuzzy' };
            bestScore = score;
        }
    });
    
    return bestScore >= 70 ? bestMatch : null;
}

// ================================================================
// BUSINESS LOGIC LAYER
// ================================================================

/**
 * Evaluates coverage feasibility for a given area
 */
function evaluateFeasibility(areaName, data) {
    const normalized = normalizeAreaName(areaName);
    const result = findArea(normalized, data);
    
    if (result) {
        const packages = getPackagesForTier(result.tier, data);
        return {
            area: result.matchedName,
            found: true,
            tier: result.tier,
            packages: packages,
            segmentation: result.tier
        };
    }
    
    return {
        area: areaName,
        found: false,
        tier: null,
        packages: [],
        segmentation: 'out-of-coverage'
    };
}

/**
 * Filters areas by search query
 */
function filterAreas(query, data, maxResults = 10) {
    const normalizedQuery = normalizeAreaName(query);
    if (!normalizedQuery) return [];
    
    const allAreas = getAllAreas(data);
    const results = [];
    
    Object.keys(allAreas).forEach(area => {
        if (area.includes(normalizedQuery) || normalizedQuery.includes(area)) {
            results.push({
                name: area,
                tier: allAreas[area],
                displayName: area.charAt(0).toUpperCase() + area.slice(1)
            });
        }
    });
    
    results.sort((a, b) => {
        const aScore = a.name.length;
        const bScore = b.name.length;
        if (aScore !== bScore) return aScore - bScore;
        return a.name.localeCompare(b.name);
    });
    
    return results.slice(0, maxResults);
}

// ================================================================
// PRESENTATION LAYER
// ================================================================

/**
 * Renders feasibility results to the DOM
 */
function renderResults(result, config) {
    const resultContainer = document.getElementById(config.resultContainer);
    const packageContainer = document.getElementById(config.packageContainer);
    const leadInput = document.getElementById(config.leadInput);
    
    if (!resultContainer) return;
    
    if (result.found) {
        const tierLabel = result.tier === 'standard' ? 'Standard' : 'Special';
        const displayArea = result.area.charAt(0).toUpperCase() + result.area.slice(1);
        
        resultContainer.innerHTML = `
            <div class="result-success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <div>
                    <strong>${displayArea} is covered!</strong>
                    <span>Available on ${tierLabel} tier</span>
                </div>
            </div>
        `;
        resultContainer.className = 'coverage-result success';
        
        // Only render packages if found
        renderPackages(result.packages, packageContainer);
        if (leadInput) leadInput.value = result.segmentation;
        
        const leadArea = document.getElementById('leadArea');
        if (leadArea) leadArea.value = displayArea;
        
    } else {
        const displayArea = result.area.charAt(0).toUpperCase() + result.area.slice(1);
        resultContainer.innerHTML = `
            <div class="result-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <div>
                    <strong>We don't cover ${displayArea} yet</strong>
                    <span>But we're expanding! Drop your email below to be notified.</span>
                </div>
            </div>
        `;
        resultContainer.className = 'coverage-result error';
        
        // Clear packages when not found
        if (packageContainer) {
            packageContainer.innerHTML = '';
            packageContainer.className = 'package-display';
        }
        if (leadInput) leadInput.value = 'out-of-coverage';
        
        renderComingSoonForm(result.area);
    }
}

/**
 * Renders packages to the DOM
 */
function renderPackages(packages, container) {
    const target = typeof container === 'string' ? document.getElementById(container) : container;
    if (!target) return;
    
    if (!packages || packages.length === 0) {
        target.innerHTML = '<p class="no-packages">No packages available for this area</p>';
        return;
    }
    
    let html = '<div class="packages-grid">';
    packages.forEach((pkg, index) => {
        const isFeatured = index === 1 || (packages.length > 1 && index === Math.floor(packages.length / 2));
        html += `
            <div class="package-card ${isFeatured ? 'featured' : ''}">
                ${isFeatured ? '<div class="package-badge">Most Popular</div>' : ''}
                <div class="package-speed">${pkg.speed}</div>
                <div class="package-price">R${pkg.price.toLocaleString()}<span>/month</span></div>
                <ul class="package-features">
                    <li>✓ Unlimited Data</li>
                    <li>✓ Free Installation</li>
                    <li>✓ 24/7 Support</li>
                </ul>
                <button class="package-btn" data-speed="${pkg.speed}" data-price="${pkg.price}">
                    Get Started
                </button>
            </div>
        `;
    });
    html += '</div>';
    target.innerHTML = html;
    target.className = 'package-display visible';
}

/**
 * Renders autocomplete suggestions
 */
function renderSuggestions(suggestions, inputElement, onSelect) {
    const existingContainer = document.querySelector('.autocomplete-container');
    if (existingContainer) existingContainer.remove();
    if (!suggestions || suggestions.length === 0) return;
    
    const container = document.createElement('div');
    container.className = 'autocomplete-container';
    
    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        const displayName = suggestion.displayName || suggestion.name;
        const tierBadge = suggestion.tier === 'standard' 
            ? '<span style="color: #34d399; font-size: 11px; font-weight: 600;">✓ Standard</span>' 
            : '<span style="color: #a855f7; font-size: 11px; font-weight: 600;">⭐ Special</span>';
        
        item.innerHTML = `<span>${displayName}</span>${tierBadge}`;
        item.addEventListener('click', () => onSelect(suggestion.name));
        container.appendChild(item);
    });
    
    inputElement.parentNode.style.position = 'relative';
    inputElement.parentNode.appendChild(container);
}

// ================================================================
// COMING SOON FORM
// ================================================================

/**
 * Renders the "Coming Soon" form for out-of-coverage areas
 */
function renderComingSoonForm(area) {
    const container = document.getElementById('comingSoonForm');
    if (!container) return;
    
    const displayArea = area.charAt(0).toUpperCase() + area.slice(1);
    
    container.innerHTML = `
        <div class="coming-soon-form">
            <div class="coming-soon-icon">📡</div>
            <h4>We're Coming to ${displayArea}!</h4>
            <p>Be the first to know when we connect your area.</p>
            <div class="coming-soon-input-group">
                <input type="email" id="futureEmail" placeholder="Enter your email" />
                <button id="futureNotifyBtn">Notify Me</button>
            </div>
            <div id="futureNotification" class="future-notification"></div>
            <small>🔒 Your email is safe with us.</small>
            <div class="coming-soon-vote">
                <span>⭐ ${displayArea} has <span id="voteCount">0</span> votes</span>
                <button id="voteBtn" class="vote-btn">Vote for this area</button>
            </div>
        </div>
    `;
    
    const notifyBtn = document.getElementById('futureNotifyBtn');
    const emailInput = document.getElementById('futureEmail');
    const notification = document.getElementById('futureNotification');
    
    if (notifyBtn && emailInput) {
        notifyBtn.addEventListener('click', function() {
            const email = emailInput.value.trim();
            if (!email || !email.includes('@')) {
                notification.innerHTML = `<span class="error">Please enter a valid email</span>`;
                return;
            }
            
            const leadData = {
                area: area,
                email: email,
                type: 'future-interest',
                timestamp: new Date().toISOString()
            };
            
            saveFutureLead(leadData);
            notification.innerHTML = `<span class="success">✅ Thank you! We'll notify you when ${displayArea} is live.</span>`;
            emailInput.value = '';
            
            if (window.gtag) {
                gtag('event', 'future_lead', { 'area': area, 'email': email });
            }
        });
    }
    
    const voteBtn = document.getElementById('voteBtn');
    const voteCount = document.getElementById('voteCount');
    
    if (voteBtn && voteCount) {
        const votes = JSON.parse(localStorage.getItem('area_votes') || '{}');
        voteCount.textContent = votes[area] || 0;
        
        voteBtn.addEventListener('click', function() {
            const currentVotes = JSON.parse(localStorage.getItem('area_votes') || '{}');
            currentVotes[area] = (currentVotes[area] || 0) + 1;
            localStorage.setItem('area_votes', JSON.stringify(currentVotes));
            voteCount.textContent = currentVotes[area];
            
            if (window.gtag) {
                gtag('event', 'area_vote', { 'area': area, 'votes': currentVotes[area] });
            }
            this.textContent = '✅ Voted!';
            this.disabled = true;
        });
    }
}

/**
 * Saves future lead to localStorage
 */
function saveFutureLead(leadData) {
    const leads = JSON.parse(localStorage.getItem('future_leads') || '[]');
    leads.push(leadData);
    localStorage.setItem('future_leads', JSON.stringify(leads));
    console.log('[GrayTech] Future lead saved:', leadData);
}

// ================================================================
// LOCATION DETECTION - Use My Location
// ================================================================

/**
 * Initializes the "Use My Location" feature
 */
function initLocationDetection() {
    const locationBtn = document.getElementById('locationBtn');
    if (!locationBtn) return;
    
    locationBtn.addEventListener('click', function() {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported. Please enter your suburb manually.');
            return;
        }
        
        this.classList.add('loading');
        this.innerHTML = 'Detecting...';
        
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const { latitude, longitude } = position.coords;
                
                fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`
                )
                .then(response => response.json())
                .then(data => {
                    const address = data.address || {};
                    const suburb = address.suburb || address.town || address.city || address.village;
                    
                    locationBtn.classList.remove('loading');
                    locationBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                        </svg>
                        Use My Location
                    `;
                    
                    if (suburb) {
                        const searchInput = document.getElementById('searchInput');
                        if (searchInput) {
                            searchInput.value = suburb;
                            const event = new Event('input', { bubbles: true });
                            searchInput.dispatchEvent(event);
                        }
                        showLocationSuccess(suburb);
                    } else {
                        alert('Could not determine your suburb. Please enter it manually.');
                    }
                })
                .catch(() => {
                    locationBtn.classList.remove('loading');
                    locationBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                        </svg>
                        Use My Location
                    `;
                    alert('Could not determine your location. Please enter your suburb manually.');
                });
            },
            function(error) {
                locationBtn.classList.remove('loading');
                locationBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                    </svg>
                    Use My Location
                `;
                
                let message = 'Unable to get your location. ';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        message += 'Please allow location access.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message += 'Location unavailable.';
                        break;
                    case error.TIMEOUT:
                        message += 'Request timed out.';
                        break;
                    default:
                        message += 'Please enter your suburb manually.';
                }
                alert(message);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

/**
 * Shows a success message when location is detected
 */
function showLocationSuccess(suburb) {
    const resultContainer = document.getElementById('coverageResult');
    if (!resultContainer) return;
    
    const displayArea = suburb.charAt(0).toUpperCase() + suburb.slice(1);
    
    resultContainer.innerHTML = `
        <div class="result-success" style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(34,197,94,0.1);border-radius:8px;border:1px solid #22c55e;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" style="width:20px;height:20px;flex-shrink:0;">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <div>
                <strong style="color:var(--white);font-size:14px;">📍 Location detected: ${displayArea}</strong>
                <span style="color:var(--gray);font-size:12px;display:block;">Checking coverage...</span>
            </div>
        </div>
    `;
    resultContainer.className = 'coverage-result success';
}

// ================================================================
// LEAD CAPTURE FORM HANDLING
// ================================================================

/**
 * Shows the lead capture form (Step 3)
 */
function showLeadForm(area, pkg, tier) {
    const step3 = document.getElementById('step3');
    if (!step3) return;
    
    document.getElementById('leadArea').value = area;
    document.getElementById('leadPackage').value = pkg;
    document.getElementById('leadSegmentation').value = tier;
    
    document.getElementById('summaryArea').textContent = area;
    document.getElementById('summaryPackage').textContent = pkg;
    document.getElementById('summaryTier').textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
    
    step3.style.display = 'block';
    step3.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    if (window.gtag) {
        gtag('event', 'view_lead_form', { 'area': area, 'package': pkg, 'tier': tier });
    }
}

/**
 * Handles lead form submission
 */
function handleLeadSubmit(event) {
    event.preventDefault();
    
    const form = document.getElementById('leadForm');
    const submitBtn = document.getElementById('submitLead');
    const successDiv = document.getElementById('formSuccess');
    
    let isValid = true;
    
    // Name validation
    const name = document.getElementById('leadName');
    const nameError = document.getElementById('nameError');
    if (name.value.trim().length < 2) {
        name.classList.add('error');
        nameError.classList.add('visible');
        isValid = false;
    } else {
        name.classList.remove('error');
        name.classList.add('success');
        nameError.classList.remove('visible');
    }
    
    // Email validation
    const email = document.getElementById('leadEmail');
    const emailError = document.getElementById('emailError');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.value.trim())) {
        email.classList.add('error');
        emailError.classList.add('visible');
        isValid = false;
    } else {
        email.classList.remove('error');
        email.classList.add('success');
        emailError.classList.remove('visible');
    }
    
    // Phone validation
    const phone = document.getElementById('leadPhone');
    const phoneError = document.getElementById('phoneError');
    const phoneRegex = /^[0-9+\s\-()]{10,15}$/;
    if (!phoneRegex.test(phone.value.trim())) {
        phone.classList.add('error');
        phoneError.classList.add('visible');
        isValid = false;
    } else {
        phone.classList.remove('error');
        phone.classList.add('success');
        phoneError.classList.remove('visible');
    }
    
    // Consent validation
    const consent = document.getElementById('leadConsent');
    const consentError = document.getElementById('consentError');
    if (!consent.checked) {
        consentError.classList.add('visible');
        isValid = false;
    } else {
        consentError.classList.remove('visible');
    }
    
    if (!isValid) {
        const firstError = form.querySelector('.error');
        if (firstError) firstError.focus();
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    
    const formData = {
        name: name.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim(),
        address: document.getElementById('leadAddress').value.trim(),
        notes: document.getElementById('leadNotes').value.trim(),
        area: document.getElementById('leadArea').value,
        package: document.getElementById('leadPackage').value,
        segmentation: document.getElementById('leadSegmentation').value,
        consent: consent.checked,
        timestamp: new Date().toISOString()
    };
    
    console.log('[GrayTech] Lead submitted:', formData);
    
    if (window.gtag) {
        gtag('event', 'lead_submission', {
            'area': formData.area,
            'package': formData.package,
            'tier': formData.segmentation
        });
    }
    
    // Send to backend
    fetch('leads.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            form.style.display = 'none';
            successDiv.style.display = 'block';
            document.getElementById('confirmEmail').textContent = formData.email;
            document.getElementById('confirmReference').textContent = data.lead_id || 'GTS-' + Date.now().toString().slice(-6);
            
            if (window.gtag) {
                gtag('event', 'conversion', {
                    'send_to': 'G-XXXXXXXXXX',
                    'value': 1.0,
                    'currency': 'ZAR'
                });
            }
        } else {
            alert('There was an error submitting your application. Please try again.');
        }
    })
    .catch(error => {
        console.error('[GrayTech] Lead submission error:', error);
        alert('Network error. Please check your connection and try again.');
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
    });
}

// ================================================================
// VOICE SEARCH - FIXED
// ================================================================

/**
 * Initializes voice search
 */
function initVoiceSearch() {
    const voiceBtn = document.getElementById('voiceSearchBtn');
    if (!voiceBtn) return;
    
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        voiceBtn.style.display = 'none';
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-ZA';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    
    let isListening = false;
    
    voiceBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (isListening) {
            try {
                recognition.stop();
            } catch (error) {
                console.warn('Error stopping recognition:', error);
            }
            this.classList.remove('listening');
            isListening = false;
            return;
        }
        
        try {
            recognition.start();
            this.classList.add('listening');
            isListening = true;
        } catch (error) {
            console.warn('Speech recognition error:', error);
            this.classList.remove('listening');
            isListening = false;
            
            // Show feedback to user
            const resultContainer = document.getElementById('coverageResult');
            if (resultContainer) {
                resultContainer.innerHTML = `
                    <div class="result-error">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                        <div>
                            <strong>Voice search unavailable</strong>
                            <span>Please type your suburb instead.</span>
                        </div>
                    </div>
                `;
                resultContainer.className = 'coverage-result error';
            }
        }
    });
    
    recognition.onstart = function() {
        voiceBtn.classList.add('listening');
        isListening = true;
    };
    
    recognition.onresult = function(event) {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript;
        const searchInput = document.getElementById('searchInput');
        
        if (searchInput && transcript) {
            searchInput.value = transcript.trim();
            // Trigger search
            const inputEvent = new Event('input', { bubbles: true });
            searchInput.dispatchEvent(inputEvent);
        }
    };
    
    recognition.onerror = function(event) {
        console.warn('Speech recognition error:', event.error);
        voiceBtn.classList.remove('listening');
        isListening = false;
        
        // Show feedback to user for permission errors
        if (event.error === 'not-allowed') {
            const resultContainer = document.getElementById('coverageResult');
            if (resultContainer) {
                resultContainer.innerHTML = `
                    <div class="result-error">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                        <div>
                            <strong>Microphone access denied</strong>
                            <span>Please allow microphone access or type your suburb manually.</span>
                        </div>
                    </div>
                `;
                resultContainer.className = 'coverage-result error';
            }
        }
    };
    
    recognition.onend = function() {
        voiceBtn.classList.remove('listening');
        isListening = false;
    };
}

// ================================================================
// MAP TOGGLE - FIXED
// ================================================================

/**
 * Initializes map toggle functionality
 */
function initMapToggle() {
    const showMapBtn = document.getElementById('showMapBtn');
    const hideMapBtn = document.getElementById('hideMapBtn');
    const mapSection = document.getElementById('mapSection');
    
    if (showMapBtn && mapSection) {
        showMapBtn.addEventListener('click', function() {
            mapSection.style.display = 'block';
            mapSection.classList.add('visible');
            // Refresh map if it exists
            if (window.mapInstance) {
                setTimeout(() => {
                    window.mapInstance.invalidateSize();
                }, 300);
            }
            // Scroll to map
            setTimeout(() => {
                mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        });
    }
    
    if (hideMapBtn && mapSection) {
        hideMapBtn.addEventListener('click', function() {
            mapSection.style.display = 'none';
            mapSection.classList.remove('visible');
        });
    }
}

// ================================================================
// SEARCH ENGINE
// ================================================================

/**
 * Initializes the search engine with autocomplete
 */
async function initSearchEngine(config) {
    const coverageData = await fetchCoverageData(config.dataSource);
    const input = document.getElementById(config.inputId);
    if (!input) {
        console.warn('[GrayTech] Input field not found');
        return { coverageData, executeSearch: () => {} };
    }
    
    // Clear packages initially - important fix!
    const packageContainer = document.getElementById(config.packageContainer);
    if (packageContainer) {
        packageContainer.innerHTML = '';
        packageContainer.className = 'package-display';
    }
    
    // Clear results initially
    const resultContainer = document.getElementById(config.resultContainer);
    if (resultContainer) {
        resultContainer.innerHTML = '';
        resultContainer.className = '';
    }
    
    function executeSearch(query) {
        const resultContainer = document.getElementById(config.resultContainer);
        const packageContainer = document.getElementById(config.packageContainer);
        
        if (resultContainer) {
            resultContainer.innerHTML = `
                <div class="skeleton-loading">
                    <div class="skeleton-line long"></div>
                    <div class="skeleton-line medium"></div>
                    <div class="skeleton-line short"></div>
                </div>
            `;
            resultContainer.className = 'coverage-result loading';
        }
        
        const matched = matchAreaEnhanced(query, coverageData);
        
        if (!query.trim()) {
            if (resultContainer) {
                resultContainer.innerHTML = '';
                resultContainer.className = '';
            }
            if (packageContainer) {
                packageContainer.innerHTML = '';
                packageContainer.className = 'package-display';
            }
            return;
        }
        
        setTimeout(() => {
            if (matched) {
                const result = evaluateFeasibility(matched.area, coverageData);
                renderResults(result, {
                    resultContainer: config.resultContainer,
                    packageContainer: config.packageContainer,
                    leadInput: config.leadInput
                });
                
                if (window.gtag) {
                    gtag('event', 'coverage_found', {
                        'area': matched.area,
                        'tier': matched.tier,
                        'match_type': matched.matchType
                    });
                }
            } else {
                const extractedSuburb = extractSuburbFromAddress(query);
                renderResults({
                    area: extractedSuburb || query,
                    found: false,
                    tier: null,
                    packages: [],
                    segmentation: 'out-of-coverage'
                }, {
                    resultContainer: config.resultContainer,
                    packageContainer: config.packageContainer,
                    leadInput: config.leadInput
                });
                
                if (window.gtag) {
                    gtag('event', 'coverage_not_found', {
                        'search_query': query,
                        'extracted_suburb': extractedSuburb
                    });
                }
            }
        }, 500);
    }
    
    function handleSuggestionSelect(areaName) {
        input.value = areaName.charAt(0).toUpperCase() + areaName.slice(1);
        const container = document.querySelector('.autocomplete-container');
        if (container) container.remove();
        executeSearch(areaName);
    }
    
    const checkBtn = document.getElementById('coverageCheckBtn');
    if (checkBtn) {
        checkBtn.addEventListener('click', function() {
            const query = input.value.trim();
            if (query) {
                executeSearch(query);
            } else {
                const resultContainer = document.getElementById(config.resultContainer);
                if (resultContainer) {
                    resultContainer.innerHTML = `<div class="result-error">Please enter a suburb</div>`;
                    resultContainer.className = 'coverage-result error';
                }
            }
        });
    }
    
    input.addEventListener('input', function() {
        const query = this.value;
        if (!query.trim()) {
            const container = document.querySelector('.autocomplete-container');
            if (container) container.remove();
            // Clear results and packages when input is cleared
            const resultContainer = document.getElementById(config.resultContainer);
            if (resultContainer) {
                resultContainer.innerHTML = '';
                resultContainer.className = '';
            }
            const packageContainer = document.getElementById(config.packageContainer);
            if (packageContainer) {
                packageContainer.innerHTML = '';
                packageContainer.className = 'package-display';
            }
            return;
        }
        const matches = filterAreas(query, coverageData);
        renderSuggestions(matches, this, handleSuggestionSelect);
    });
    
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const query = this.value.trim();
            const container = document.querySelector('.autocomplete-container');
            if (container) container.remove();
            if (query) executeSearch(query);
        }
    });
    
    input.addEventListener('blur', function() {
        setTimeout(() => {
            const container = document.querySelector('.autocomplete-container');
            if (container) container.remove();
        }, 200);
    });
    
    return { coverageData, executeSearch };
}

// ================================================================
// MAP INTEGRATION
// ================================================================

/**
 * Initializes the map integration module
 */
async function initMapModule(config) {
    const container = document.getElementById(config.mapContainerId);
    if (!container) return null;
    
    const defaultCenter = config.defaultCenter || { lat: -26.2041, lng: 28.0473 };
    const defaultZoom = config.defaultZoom || 12;
    
    let mapInstance = null;
    let marker = null;
    
    async function reverseGeocode(lat, lng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`
            );
            if (!response.ok) throw new Error('Geocoding failed');
            const data = await response.json();
            const address = data.address || {};
            return address.suburb || address.town || address.city || address.village || null;
        } catch (error) {
            console.error('[GrayTech] Reverse geocoding error:', error);
            return null;
        }
    }
    
    async function handleLocationSelect(lat, lng) {
        const suburb = await reverseGeocode(lat, lng);
        if (suburb) {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = suburb;
                const event = new Event('input', { bubbles: true });
                searchInput.dispatchEvent(event);
            }
        } else {
            const resultContainer = document.getElementById('coverageResult');
            if (resultContainer) {
                resultContainer.innerHTML = `
                    <div class="result-error">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                        <div>
                            <strong>Location not recognized</strong>
                            <span>Please try again or enter your suburb manually</span>
                        </div>
                    </div>
                `;
            }
        }
    }
    
    if (typeof L === 'undefined') {
        console.error('[GrayTech] Leaflet library not loaded');
        return null;
    }
    
    mapInstance = L.map(container.id).setView([defaultCenter.lat, defaultCenter.lng], defaultZoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstance);
    
    // Store map instance globally for refresh
    window.mapInstance = mapInstance;
    
    mapInstance.on('click', function(e) {
        const { lat, lng } = e.latlng;
        if (marker) mapInstance.removeLayer(marker);
        marker = L.marker([lat, lng]).addTo(mapInstance);
        handleLocationSelect(lat, lng);
    });
    
    const pinBtn = document.getElementById('pinMapBtn');
    if (pinBtn) {
        pinBtn.addEventListener('click', function() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    function(position) {
                        const { latitude, longitude } = position.coords;
                        mapInstance.setView([latitude, longitude], 15);
                        if (marker) mapInstance.removeLayer(marker);
                        marker = L.marker([latitude, longitude]).addTo(mapInstance);
                        handleLocationSelect(latitude, longitude);
                    },
                    function(error) {
                        console.error('[GrayTech] Geolocation error:', error);
                        alert('Unable to get your location.');
                    }
                );
            } else {
                alert('Geolocation is not supported by your browser.');
            }
        });
    }
    
    return mapInstance;
}

// ================================================================
// REGIONS & AREAS
// ================================================================

/**
 * Maps areas to regions
 */
function getAreaRegionMap(data) {
    const map = {};
    const regionGroups = {
        'johannesburg': ['alexandra', 'johannesburg', 'midrand', 'sandton', 'fourways', 'randburg', 'roodepoort', 'soweto', 'abbotsford', 'atholl', 'bryanston', 'bruma', 'cyrildene', 'douglasdale', 'emmarentia', 'fairland', 'ferndale', 'greenside', 'houghton estate', 'hyde park', 'illovo', 'killarney', 'linden', 'lone hill', 'melrose', 'melville', 'morningside', 'norwood', 'orange grove', 'parkmore', 'parkhurst', 'parkview', 'rosebank', 'sunninghill', 'westcliff'],
        'pretoria': ['pretoria', 'centurion', 'akasia', 'atteridgeville', 'bronkhorstspruit', 'cullinan', 'ekangala', 'ga-rankuwa', 'hammanskraal', 'irene', 'mamelodi', 'soshanguve', 'hatfield', 'arcadia', 'brooklyn', 'garsfontein', 'faerie glen', 'menlo park'],
        'east-rand': ['alberton', 'bedfordview', 'benoni', 'boksburg', 'brakpan', 'daveyton', 'duduza', 'edenvale', 'germiston', 'katlehong', 'kempton park', 'kwathema', 'nigel', 'reiger park', 'springs', 'tembisa', 'thokoza', 'tsakane', 'vosloorus', 'wattville'],
        'west-rand': ['krugersdorp', 'kagiso', 'magaliesburg', 'randfontein', 'westonaria', 'mohlakeng', 'toekomsrus', 'carletonville', 'khutsong', 'fochville'],
        'vaal': ['boipatong', 'bophelong', 'evaton', 'sebokeng', 'sharpeville', 'vanderbijlpark', 'vereeniging', 'meyerton', 'heidelberg', 'ratanda']
    };
    
    if (data.standard_tier && data.standard_tier.areas) {
        data.standard_tier.areas.forEach(area => {
            const lowerArea = area.toLowerCase();
            for (const [region, areas] of Object.entries(regionGroups)) {
                if (areas.includes(lowerArea)) {
                    map[area] = region;
                    break;
                }
            }
        });
    }
    
    if (data.special_tier && data.special_tier.areas) {
        data.special_tier.areas.forEach(area => {
            map[area] = 'special';
        });
    }
    
    return map;
}

/**
 * Renders regions to the DOM
 */
function renderRegions(data) {
    const regions = {
        'johannesburg': { grid: 'johannesburg-grid', count: 'johannesburg-count' },
        'pretoria': { grid: 'pretoria-grid', count: 'pretoria-count' },
        'east-rand': { grid: 'east-rand-grid', count: 'east-rand-count' },
        'west-rand': { grid: 'west-rand-grid', count: 'west-rand-count' },
        'vaal': { grid: 'vaal-grid', count: 'vaal-count' },
        'special': { grid: 'special-grid', count: 'special-count' }
    };

    const areaRegionMap = getAreaRegionMap(data);

    Object.keys(regions).forEach(key => {
        const areas = Object.keys(areaRegionMap).filter(area => areaRegionMap[area] === key);
        const grid = document.getElementById(regions[key].grid);
        const count = document.getElementById(regions[key].count);
        
        if (grid) {
            grid.innerHTML = areas.map(area => `
                <span class="area-tag">${area.charAt(0).toUpperCase() + area.slice(1)}</span>
            `).join('');
        }
        if (count) {
            count.textContent = `${areas.length} areas`;
        }
    });
}

/**
 * Initializes region tabs
 */
function initRegionTabs(data) {
    const tabs = document.querySelectorAll('.region-tab');
    const container = document.getElementById('regionGridContainer');
    if (!tabs.length || !container) return;
    
    const allAreas = getAllAreas(data);
    const areaRegionMap = getAreaRegionMap(data);
    
    function renderAreas(region) {
        let areas = [];
        if (region === 'all') {
            areas = Object.keys(allAreas);
        } else {
            areas = Object.keys(areaRegionMap).filter(area => areaRegionMap[area] === region);
        }
        
        if (areas.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--gray);padding:20px;">No areas found in this region.</p>';
            return;
        }
        
        container.innerHTML = areas.map(area => {
            const tier = allAreas[area];
            const displayName = area.charAt(0).toUpperCase() + area.slice(1);
            const badgeClass = tier === 'standard' ? 'standard' : 'special';
            const badgeText = tier === 'standard' ? 'Standard' : 'Special';
            return `
                <div class="region-item" data-area="${area}" data-tier="${tier}">
                    ${displayName}
                    <span class="tier-badge ${badgeClass}">${badgeText}</span>
                </div>
            `;
        }).join('');
        
        container.querySelectorAll('.region-item').forEach(item => {
            item.addEventListener('click', function() {
                const area = this.dataset.area;
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = area.charAt(0).toUpperCase() + area.slice(1);
                    const event = new Event('input', { bubbles: true });
                    searchInput.dispatchEvent(event);
                }
            });
        });
    }
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            renderAreas(this.dataset.region);
        });
    });
    
    renderAreas('all');
}

/**
 * Renders pricing to the DOM
 */
function renderPricing(data) {
    const pricingGrid = document.getElementById('pricingGrid');
    if (!pricingGrid) return;
    
    const standardPackages = data.standard_tier?.packages || [];
    if (standardPackages.length === 0) {
        pricingGrid.innerHTML = '<p>No pricing available</p>';
        return;
    }
    
    pricingGrid.innerHTML = standardPackages.map((pkg, index) => {
        const isFeatured = index === 1 || (standardPackages.length > 1 && index === Math.floor(standardPackages.length / 2));
        return `
            <div class="pricing-card ${isFeatured ? 'featured' : ''}">
                ${isFeatured ? '<div class="pricing-badge">Most Popular</div>' : ''}
                <div class="pricing-speed">${pkg.speed}</div>
                <div class="pricing-price">R${pkg.price.toLocaleString()}<span>/month</span></div>
                <ul class="pricing-features">
                    <li>✓ Unlimited Data</li>
                    <li>✓ Free Installation</li>
                    <li>✓ 24/7 Support</li>
                    <li>✓ Standard Areas</li>
                </ul>
                <button class="pricing-btn" data-speed="${pkg.speed}" data-price="${pkg.price}">
                    Get Started
                </button>
            </div>
        `;
    }).join('');
}

// ================================================================
// APPLICATION INITIALIZATION
// ================================================================

/**
 * Main application initialization
 */
async function initApp() {
    console.log('[GrayTech] Initializing Coverage Application...');
    
    const config = {
        dataSource: 'data/coverage.json',
        inputId: 'searchInput',
        resultContainer: 'coverageResult',
        packageContainer: 'packageDisplay',
        leadInput: 'leadSegmentation',
        mapContainerId: 'coverageMap',
        defaultCenter: { lat: -26.2041, lng: 28.0473 },
        defaultZoom: 12
    };
    
    try {
        const coverageData = await fetchCoverageData(config.dataSource);
        renderRegions(coverageData);
        renderPricing(coverageData);
        
        const { executeSearch } = await initSearchEngine(config);
        
        await initMapModule({
            mapContainerId: config.mapContainerId,
            coverageData: coverageData,
            defaultCenter: config.defaultCenter,
            defaultZoom: config.defaultZoom,
            onLocationResolved: function(suburb) {
                const searchInput = document.getElementById(config.inputId);
                if (searchInput) {
                    searchInput.value = suburb;
                    const event = new Event('input', { bubbles: true });
                    searchInput.dispatchEvent(event);
                }
            }
        });
        
        // Initialize map toggle
        initMapToggle();
        
        // Initialize voice search
        initVoiceSearch();
        
        // Initialize location detection
        initLocationDetection();
        
        // Initialize region tabs
        initRegionTabs(coverageData);
        
        // Lead form submission
        const leadForm = document.getElementById('leadForm');
        if (leadForm) {
            leadForm.addEventListener('submit', handleLeadSubmit);
        }
        
        // Package button click handlers
        document.addEventListener('click', function(e) {
            const packageBtn = e.target.closest('.package-btn, .pricing-btn');
            if (packageBtn) {
                e.preventDefault();
                const area = document.getElementById('leadArea').value || 
                            document.querySelector('.result-success strong')?.textContent?.replace(' is covered!', '') || 
                            'Unknown';
                const pkg = packageBtn.dataset.speed || packageBtn.textContent.trim();
                const tier = document.getElementById('leadSegmentation').value || 'standard';
                showLeadForm(area, pkg, tier);
            }
        });
        
        console.log('[GrayTech] Application initialized successfully.');
        
        window.GrayTech = {
            coverageData,
            executeSearch,
            evaluateFeasibility,
            getAllAreas,
            filterAreas,
            showLeadForm,
            matchAreaEnhanced
        };
        
    } catch (error) {
        console.error('[GrayTech] Initialization error:', error);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);