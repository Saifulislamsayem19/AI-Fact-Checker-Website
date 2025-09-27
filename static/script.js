class FactChecker {
    constructor() {
        this.currentTab = 'url';
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeElements();
    }

    initializeElements() {
        // Get all DOM elements
        this.elements = {
            // Tabs
            tabBtns: document.querySelectorAll('.tab-btn'),
            inputForms: document.querySelectorAll('.input-form'),
            
            // Inputs
            urlInput: document.getElementById('url-input'),
            claimInput: document.getElementById('claim-input'),
            searchInput: document.getElementById('search-input'),
            
            // Submit buttons
            urlSubmit: document.getElementById('url-submit'),
            claimSubmit: document.getElementById('claim-submit'),
            searchSubmit: document.getElementById('search-submit'),
            
            // Results
            loading: document.getElementById('loading'),
            results: document.getElementById('results-display'),
            errorDisplay: document.getElementById('error-display'),
            factCheckResult: document.getElementById('fact-check-result'),
            searchResult: document.getElementById('search-result'),
            
            // Result content
            verdictBadge: document.getElementById('verdict-badge'),
            verdictText: document.getElementById('verdict-text'),
            analyzedClaim: document.getElementById('analyzed-claim'),
            confidenceLevel: document.getElementById('confidence-level'),
            analysisReasoning: document.getElementById('analysis-reasoning'),
            sourcesList: document.getElementById('sources-list'),
            processingTime: document.getElementById('processing-time'),
            
            // Search result content
            searchQuery: document.getElementById('search-query'),
            searchContent: document.getElementById('search-content'),
            searchSourcesList: document.getElementById('search-sources-list'),
            
            // Error content
            errorMessage: document.getElementById('error-message'),
            retryBtn: document.getElementById('retry-btn'),
            
            // Navigation
            navLinks: document.querySelectorAll('.nav-link')
        };
    }

    bindEvents() {
        // Tab switching
        document.addEventListener('click', (e) => {
            if (e.target.matches('.tab-btn') || e.target.closest('.tab-btn')) {
                const btn = e.target.matches('.tab-btn') ? e.target : e.target.closest('.tab-btn');
                this.switchTab(btn.dataset.tab);
            }
        });

        // Submit buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('#url-submit')) {
                e.preventDefault();
                this.handleUrlSubmit();
            } else if (e.target.matches('#claim-submit')) {
                e.preventDefault();
                this.handleClaimSubmit();
            } else if (e.target.matches('#search-submit')) {
                e.preventDefault();
                this.handleSearchSubmit();
            } else if (e.target.matches('#retry-btn')) {
                e.preventDefault();
                this.retryLastAction();
            }
        });

        // Enter key handling
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                const activeForm = document.querySelector('.input-form.active');
                if (activeForm) {
                    const submitBtn = activeForm.querySelector('.submit-btn');
                    if (submitBtn && !submitBtn.disabled) {
                        e.preventDefault();
                        submitBtn.click();
                    }
                }
            }
        });

        // Navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('.nav-link')) {
                e.preventDefault();
                const href = e.target.getAttribute('href');
                if (href.startsWith('#')) {
                    this.smoothScroll(href);
                    this.updateActiveNavLink(e.target);
                }
            }
        });

        // Scroll spy for navigation
        window.addEventListener('scroll', () => {
            this.updateNavigationOnScroll();
        });
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab buttons
        this.elements.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update input forms
        this.elements.inputForms.forEach(form => {
            form.classList.toggle('active', form.id === `${tabName}-form`);
        });
        
        // Clear previous results and errors
        this.hideAllResults();
    }

    async handleUrlSubmit() {
        const url = this.elements.urlInput.value.trim();
        
        if (!this.validateUrl(url)) {
            this.showError('Please enter a valid URL');
            return;
        }

        this.lastAction = () => this.handleUrlSubmit();
        await this.performFactCheck('url', url);
    }

    async handleClaimSubmit() {
        const claim = this.elements.claimInput.value.trim();
        
        if (!claim) {
            this.showError('Please enter a claim to verify');
            return;
        }

        if (claim.length < 10) {
            this.showError('Please enter a more detailed claim');
            return;
        }

        this.lastAction = () => this.handleClaimSubmit();
        await this.performFactCheck('claim', claim);
    }

    async handleSearchSubmit() {
        const query = this.elements.searchInput.value.trim();
        
        if (!query) {
            this.showError('Please enter a search query');
            return;
        }

        this.lastAction = () => this.handleSearchSubmit();
        await this.performSearch(query);
    }

    async performFactCheck(inputType, content) {
        this.showLoading();
        this.disableSubmitButtons();
        
        // Add progress indicators
        const progressMessages = [
            "Analyzing your content...",
            "Searching reputable news sources...",
            "Cross-referencing information...",
            "Evaluating credibility...",
            "Finalizing results..."
        ];
        
        let messageIndex = 0;
        const progressInterval = setInterval(() => {
            if (messageIndex < progressMessages.length - 1) {
                messageIndex++;
                const loadingText = document.querySelector('.loading p');
                if (loadingText) {
                    loadingText.textContent = progressMessages[messageIndex];
                }
            }
        }, 2000);

        try {
            const response = await fetch('/fact-check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input_type: inputType,
                    content: content
                })
            });

            clearInterval(progressInterval);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Fact-check request failed');
            }

            const result = await response.json();
            
            // Add a small delay for better UX (prevents flashing)
            await new Promise(resolve => setTimeout(resolve, 500));
            
            this.displayFactCheckResults(result);
            this.scrollToResults();
            
            // Show success notification
            this.showNotification('Fact-check completed successfully!', 'success');

        } catch (error) {
            clearInterval(progressInterval);
            console.error('Fact-check error:', error);
            this.showError(`Failed to fact-check: ${error.message}`);
            this.showNotification('Fact-check failed. Please try again.', 'error');
        } finally {
            this.enableSubmitButtons();
            this.hideLoading();
        }
    }

    async performSearch(query) {
        this.showLoading();
        this.disableSubmitButtons();

        try {
            const response = await fetch('/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: query
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Search request failed');
            }

            const result = await response.json();
            this.displaySearchResults(result);
            this.scrollToResults();

        } catch (error) {
            console.error('Search error:', error);
            this.showError(`Search failed: ${error.message}`);
        } finally {
            this.enableSubmitButtons();
            this.hideLoading();
        }
    }

    displayFactCheckResults(result) {
        this.hideAllResults();
        
        // Update claim
        this.elements.analyzedClaim.textContent = result.claim;
        
        // Update verdict
        const verdict = result.verdict.toLowerCase();
        this.elements.verdictText.textContent = result.verdict;
        this.elements.verdictBadge.className = `verdict-badge ${verdict}`;
        
        // Update confidence
        this.elements.confidenceLevel.textContent = result.confidence;
        this.elements.confidenceLevel.className = `confidence-level ${result.confidence.toLowerCase()}`;
        
        // Update reasoning
        this.elements.analysisReasoning.textContent = result.reasoning;
        
        // Update sources
        this.displaySources(result.sources, this.elements.sourcesList);
        
        // Update processing time
        if (result.processing_time) {
            this.elements.processingTime.textContent = result.processing_time.toFixed(1);
        }
        
        // Show results
        this.elements.factCheckResult.style.display = 'block';
        this.elements.results.classList.add('show');
    }

    displaySearchResults(result) {
        this.hideAllResults();
        
        // Update search query
        this.elements.searchQuery.textContent = result.query;
        
        // Update search content
        this.elements.searchContent.innerHTML = this.formatSearchContent(result.results);
        
        // Update sources
        this.displaySources(result.sources, this.elements.searchSourcesList);
        
        // Show results
        this.elements.searchResult.style.display = 'block';
        this.elements.results.classList.add('show');
    }

    displaySources(sources, container) {
        if (!sources || sources.length === 0) {
            container.innerHTML = '<p class="no-sources">No specific sources available</p>';
            return;
        }

        container.innerHTML = sources.map(source => {
            const domain = this.extractDomain(source);
            return `
                <a href="${source}" target="_blank" rel="noopener noreferrer" class="source-link">
                    <i class="fas fa-external-link-alt"></i>
                    <div>
                        <strong>${domain}</strong>
                        <small>${source}</small>
                    </div>
                </a>
            `;
        }).join('');
    }

    formatSearchContent(content) {
        // Simple formatting for search results
        const paragraphs = content.split('\n\n');
        return paragraphs
            .filter(p => p.trim())
            .map(p => `<p>${this.escapeHtml(p.trim())}</p>`)
            .join('');
    }

    extractDomain(url) {
        try {
            const domain = new URL(url).hostname;
            return domain.replace('www.', '');
        } catch {
            return 'Source';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    validateUrl(url) {
        try {
            new URL(url);
            return url.startsWith('http://') || url.startsWith('https://');
        } catch {
            return false;
        }
    }

    showLoading() {
        this.hideAllResults();
        this.elements.loading.classList.add('show');
        this.scrollToResults();
    }

    hideLoading() {
        this.elements.loading.classList.remove('show');
    }

    showError(message) {
        this.hideAllResults();
        this.elements.errorMessage.textContent = message;
        this.elements.errorDisplay.classList.add('show');
        this.scrollToResults();
    }

    hideError() {
        this.elements.errorDisplay.classList.remove('show');
    }

    hideAllResults() {
        this.hideLoading();
        this.hideError();
        this.elements.results.classList.remove('show');
        this.elements.factCheckResult.style.display = 'none';
        this.elements.searchResult.style.display = 'none';
    }

    disableSubmitButtons() {
        [this.elements.urlSubmit, this.elements.claimSubmit, this.elements.searchSubmit].forEach(btn => {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            }
        });
    }

    enableSubmitButtons() {
        const buttonConfigs = [
            { btn: this.elements.urlSubmit, html: '<i class="fas fa-check"></i> Fact Check' },
            { btn: this.elements.claimSubmit, html: '<i class="fas fa-check"></i> Verify Claim' },
            { btn: this.elements.searchSubmit, html: '<i class="fas fa-search"></i> Search' }
        ];

        buttonConfigs.forEach(config => {
            if (config.btn) {
                config.btn.disabled = false;
                config.btn.innerHTML = config.html;
            }
        });
    }

    retryLastAction() {
        if (this.lastAction) {
            this.lastAction();
        }
    }

    scrollToResults() {
        setTimeout(() => {
            const resultsSection = document.getElementById('results');
            if (resultsSection) {
                resultsSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }, 100);
    }

    smoothScroll(target) {
        const element = document.querySelector(target);
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    updateActiveNavLink(clickedLink) {
        this.elements.navLinks.forEach(link => {
            link.classList.remove('active');
        });
        clickedLink.classList.add('active');
    }

    updateNavigationOnScroll() {
        const sections = ['home', 'about', 'sources'];
        const scrollPosition = window.scrollY + 100;

        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            const navLink = document.querySelector(`a[href="#${sectionId}"]`);
            
            if (section && navLink) {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                
                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                    this.elements.navLinks.forEach(link => link.classList.remove('active'));
                    navLink.classList.add('active');
                }
            }
        });
    }

    // Utility method for showing notifications (could be extended)
    showNotification(message, type = 'info') {
        // This could be extended to show toast notifications
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.factChecker = new FactChecker();
    
    // Add some console info for developers
    console.log('AI Fact Checker initialized');
    console.log('Available methods:', Object.getOwnPropertyNames(FactChecker.prototype));
});

// Add some global error handling
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    if (window.factChecker) {
        window.factChecker.showError('An unexpected error occurred. Please try again.');
    }
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    if (window.factChecker) {
        window.factChecker.showError('An unexpected error occurred. Please try again.');
    }
});

// Export for potential use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FactChecker;
}