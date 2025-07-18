// Locations JavaScript
class LocationDirectory {
    constructor() {
        this.locations = [];
        this.filteredLocations = [];
        this.sortBy = 'name';
        this.sortOrder = 'asc';
        this.expandedItems = new Set();
        this.worldMap = null;
        
        this.init();
    }
    
    init() {
        this.loadLocations();
        this.loadWorldMap();
        this.setupEventListeners();
        this.displayLocations();
        this.displayWorldMap();
    }
    
    loadLocations() {
        const stored = localStorage.getItem('summersFallLocations');
        this.locations = stored ? JSON.parse(stored) : [];
        this.filteredLocations = [...this.locations];
    }
    
    loadWorldMap() {
        const stored = localStorage.getItem('summersFallWorldMap');
        this.worldMap = stored ? JSON.parse(stored) : null;
    }
    
    saveWorldMap() {
        localStorage.setItem('summersFallWorldMap', JSON.stringify(this.worldMap));
    }
    
    setupEventListeners() {
        // Search functionality
        document.getElementById('locationSearchInput').addEventListener('input', (e) => {
            this.filterLocations(e.target.value);
        });
        
        // Sort controls
        document.getElementById('locationSortBy').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.sortLocations();
        });
        
        document.getElementById('toggleLocationSort').addEventListener('click', () => {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            this.sortLocations();
            this.updateSortButton();
        });
        
        // View controls
        document.getElementById('expandAllLocations').addEventListener('click', () => {
            this.expandAll();
        });
        
        document.getElementById('collapseAllLocations').addEventListener('click', () => {
            this.collapseAll();
        });
        
        // Add location form
        document.getElementById('addLocationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addLocation();
        });
        
        // Map upload functionality
        this.setupMapUpload();
    }
    
    setupMapUpload() {
        const uploadArea = document.getElementById('mapUploadArea');
        const mapUpload = document.getElementById('mapUpload');
        
        uploadArea.addEventListener('click', () => mapUpload.click());
        uploadArea.addEventListener('dragover', this.handleMapDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleMapDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleMapDrop.bind(this));
        
        mapUpload.addEventListener('change', (e) => {
            this.handleMapFileSelect(e.target.files);
        });
    }
    
    handleMapDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('mapUploadArea').classList.add('dragover');
    }
    
    handleMapDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('mapUploadArea').classList.remove('dragover');
    }
    
    handleMapDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('mapUploadArea').classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.type.startsWith('image/')
        );
        
        if (files.length > 0) {
            this.handleMapFileSelect(files);
        }
    }
    
    handleMapFileSelect(files) {
        const file = files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.showMapPreview(e.target.result, file.name);
            };
            reader.readAsDataURL(file);
        }
    }
    
    showMapPreview(dataUrl, fileName) {
        const previewSection = document.getElementById('mapPreview');
        const previewImage = document.getElementById('mapPreviewImage');
        const saveBtn = document.getElementById('saveMapBtn');
        const mapNameInput = document.getElementById('mapName');
        
        previewImage.src = dataUrl;
        previewSection.style.display = 'block';
        saveBtn.style.display = 'inline-block';
        
        // Set default name from filename
        mapNameInput.value = fileName.replace(/\.[^/.]+$/, "");
        
        // Store the data temporarily
        this.tempMapData = {
            dataUrl: dataUrl,
            fileName: fileName
        };
    }
    
    filterLocations(searchTerm) {
        const term = searchTerm.toLowerCase();
        this.filteredLocations = this.locations.filter(location => 
            location.name.toLowerCase().includes(term) ||
            (location.type && location.type.toLowerCase().includes(term)) ||
            (location.address && location.address.toLowerCase().includes(term)) ||
            (location.description && location.description.toLowerCase().includes(term)) ||
            (location.history && location.history.toLowerCase().includes(term)) ||
            (location.characters && location.characters.toLowerCase().includes(term)) ||
            (location.notes && location.notes.toLowerCase().includes(term))
        );
        
        this.displayLocations();
    }
    
    sortLocations() {
        this.filteredLocations.sort((a, b) => {
            let valueA = a[this.sortBy] || '';
            let valueB = b[this.sortBy] || '';
            
            // Handle different data types
            if (this.sortBy === 'dateAdded') {
                valueA = new Date(a.dateAdded || 0);
                valueB = new Date(b.dateAdded || 0);
            } else if (this.sortBy === 'importance') {
                const importanceOrder = { 'high': 3, 'medium': 2, 'low': 1 };
                valueA = importanceOrder[valueA] || 0;
                valueB = importanceOrder[valueB] || 0;
            } else {
                valueA = valueA.toString().toLowerCase();
                valueB = valueB.toString().toLowerCase();
            }
            
            if (this.sortOrder === 'asc') {
                return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
            } else {
                return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
            }
        });
        
        this.displayLocations();
    }
    
    updateSortButton() {
        const button = document.getElementById('toggleLocationSort');
        button.textContent = this.sortOrder === 'asc' ? '↑' : '↓';
        button.title = this.sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending';
    }
    
    expandAll() {
        const items = document.querySelectorAll('.location-item');
        items.forEach(item => {
            item.classList.add('expanded');
            this.expandedItems.add(item.dataset.locationId);
        });
    }
    
    collapseAll() {
        const items = document.querySelectorAll('.location-item');
        items.forEach(item => {
            item.classList.remove('expanded');
        });
        this.expandedItems.clear();
    }
    
    displayLocations() {
        const container = document.getElementById('locationList');
        const emptyState = document.getElementById('locationEmptyState');
        
        if (this.filteredLocations.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        container.innerHTML = this.filteredLocations.map(location => 
            this.createLocationListItem(location)
        ).join('');
        
        // Restore expanded states
        this.expandedItems.forEach(id => {
            const item = document.querySelector(`[data-location-id="${id}"]`);
            if (item) item.classList.add('expanded');
        });
        
        // Add click listeners for expand/collapse
        container.querySelectorAll('.location-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.classList.contains('action-btn-small')) return;
                this.toggleLocationExpansion(header.closest('.location-item'));
            });
        });
        
        // Add delete button listeners
        container.querySelectorAll('.delete-location').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteLocation(btn.dataset.locationId);
            });
        });
    }
    
    createLocationListItem(location) {
        const icon = location.imageUrl ? 
            `<img src="${location.imageUrl}" alt="${location.name}" class="location-icon">` :
            `<div class="location-icon ${location.type}"></div>`;
        
        const quickDetails = [
            location.address || null,
        ].filter(Boolean).join(' • ');
        
        const characterTags = location.characters ? 
            location.characters.split(',').map(char => 
                `<span class="character-tag">${char.trim()}</span>`
            ).join('') : '';
        
        return `
            <div class="location-item" data-location-id="${location.id}">
                <div class="location-header">
                    <div class="location-basic-info">
                        ${icon}
                        <div class="location-name-info">
                            <h3>${location.name}</h3>
                            <div class="location-quick-details">
                                <span class="location-type-badge">${location.type || 'other'}</span>
                                <span class="importance-badge importance-${location.importance || 'medium'}">${location.importance || 'medium'} importance</span>
                                ${quickDetails ? `<span>${quickDetails}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="expand-arrow">▼</div>
                </div>
                
                <div class="location-details">
                    ${location.imageUrl ? `<img src="${location.imageUrl}" alt="${location.name}" class="location-image">` : ''}
                    
                    <div class="location-details-grid">
                        <div class="location-detail-section">
                            <h4>Basic Information</h4>
                            <div class="location-detail-field">
                                <span class="location-detail-label">Type:</span>
                                <span class="location-detail-value">${location.type || 'Not specified'}</span>
                            </div>
                            <div class="location-detail-field">
                                <span class="location-detail-label">Address/Area:</span>
                                <span class="location-detail-value ${!location.address ? 'empty' : ''}">${location.address || 'Not specified'}</span>
                            </div>
                            <div class="location-detail-field">
                                <span class="location-detail-label">Story Importance:</span>
                                <span class="location-detail-value">${location.importance || 'medium'} importance</span>
                            </div>
                        </div>
                        
                        ${location.description ? `
                        <div class="location-detail-section">
                            <h4>Description</h4>
                            <div class="location-detail-field">
                                <span class="location-detail-value">${location.description}</span>
                            </div>
                        </div>
                        ` : ''}
                        
                        ${location.history ? `
                        <div class="location-detail-section">
                            <h4>History & Backstory</h4>
                            <div class="location-detail-field">
                                <span class="location-detail-value">${location.history}</span>
                            </div>
                        </div>
                        ` : ''}
                        
                        ${location.characters ? `
                        <div class="location-detail-section">
                            <h4>Associated Characters</h4>
                            <div class="location-detail-field">
                                <span class="location-detail-value">${location.characters}</span>
                                <div class="character-connections">
                                    ${characterTags}
                                </div>
                            </div>
                        </div>
                        ` : ''}
                        
                        ${location.notes ? `
                        <div class="location-detail-section">
                            <h4>Story Notes & Ideas</h4>
                            <div class="location-detail-field">
                                <span class="location-detail-value">${location.notes}</span>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="location-actions">
                        <button class="action-btn-small edit edit-location" data-location-id="${location.id}">✏️ Edit</button>
                        <button class="action-btn-small delete delete-location" data-location-id="${location.id}">🗑️ Delete</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    toggleLocationExpansion(item) {
        const locationId = item.dataset.locationId;
        
        if (item.classList.contains('expanded')) {
            item.classList.remove('expanded');
            this.expandedItems.delete(locationId);
        } else {
            item.classList.add('expanded');
            this.expandedItems.add(locationId);
        }
    }
    
    deleteLocation(locationId) {
        if (confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
            this.locations = this.locations.filter(l => l.id !== locationId);
            this.filteredLocations = this.filteredLocations.filter(l => l.id !== locationId);
            
            // Update localStorage
            localStorage.setItem('summersFallLocations', JSON.stringify(this.locations));
            
            this.displayLocations();
        }
    }
    
    addLocation() {
        const location = {
            id: Date.now().toString(),
            name: document.getElementById('locationName').value.trim(),
            type: document.getElementById('locationType').value,
            address: document.getElementById('locationAddress').value.trim(),
            importance: document.getElementById('locationImportance').value,
            imageUrl: document.getElementById('locationImageUrl').value.trim(),
            description: document.getElementById('locationDescription').value.trim(),
            history: document.getElementById('locationHistory').value.trim(),
            characters: document.getElementById('locationCharacters').value.trim(),
            notes: document.getElementById('locationNotes').value.trim(),
            dateAdded: new Date().toISOString()
        };
        
        if (!location.name) return;
        
        this.locations.unshift(location);
        this.filteredLocations = [...this.locations];
        
        // Update localStorage
        localStorage.setItem('summersFallLocations', JSON.stringify(this.locations));
        
        // Clear form and close modal
        document.getElementById('addLocationForm').reset();
        closeAddLocationModal();
        
        this.displayLocations();
    }
    
    displayWorldMap() {
        // Create or update world map display section
        const controlsSection = document.querySelector('.controls');
        let mapDisplay = document.getElementById('worldMapDisplay');
        
        if (this.worldMap && !mapDisplay) {
            mapDisplay = document.createElement('div');
            mapDisplay.id = 'worldMapDisplay';
            mapDisplay.className = 'current-map-display';
            mapDisplay.innerHTML = `
                <h3>World Map: ${this.worldMap.name}</h3>
                <div class="current-map-container">
                    <img src="${this.worldMap.dataUrl}" alt="${this.worldMap.name}" onclick="openMapModal()">
                </div>
                <div class="map-info">
                    <p><strong>Description:</strong> ${this.worldMap.description || 'No description'}</p>
                    <p><strong>Imported:</strong> ${new Date(this.worldMap.dateAdded).toLocaleDateString()}</p>
                </div>
                <div class="map-actions">
                    <button class="btn-remove-map" onclick="locationDirectory.removeWorldMap()">Remove Map</button>
                </div>
            `;
            controlsSection.insertAdjacentElement('afterend', mapDisplay);
        } else if (!this.worldMap && mapDisplay) {
            mapDisplay.remove();
        }
    }
    
    saveMap() {
        if (!this.tempMapData) return;
        
        const mapName = document.getElementById('mapName').value.trim();
        const mapDescription = document.getElementById('mapDescription').value.trim();
        
        if (!mapName) {
            alert('Please enter a name for the map.');
            return;
        }
        
        this.worldMap = {
            id: Date.now().toString(),
            name: mapName,
            description: mapDescription,
            dataUrl: this.tempMapData.dataUrl,
            fileName: this.tempMapData.fileName,
            dateAdded: new Date().toISOString()
        };
        
        this.saveWorldMap();
        this.displayWorldMap();
        this.closeMapImportModal();
        
        // Clear temporary data
        this.tempMapData = null;
    }
    
    removeWorldMap() {
        if (confirm('Are you sure you want to remove the world map? This action cannot be undone.')) {
            this.worldMap = null;
            localStorage.removeItem('summersFallWorldMap');
            this.displayWorldMap();
        }
    }
    
    openMapImportModal() {
        document.getElementById('mapImportModal').classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    
    closeMapImportModal() {
        const modal = document.getElementById('mapImportModal');
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        
        // Reset modal state
        document.getElementById('mapPreview').style.display = 'none';
        document.getElementById('saveMapBtn').style.display = 'none';
        document.getElementById('mapName').value = '';
        document.getElementById('mapDescription').value = '';
        this.tempMapData = null;
    }
}

// Global variable for the location directory instance
let locationDirectory;

// Modal functions
function openAddLocationModal() {
    document.getElementById('addLocationModal').classList.add('show');
}

function closeAddLocationModal() {
    document.getElementById('addLocationModal').classList.remove('show');
}

// Map import functions
function openMapImportModal() {
    locationDirectory.openMapImportModal();
}

function closeMapImportModal() {
    locationDirectory.closeMapImportModal();
}

function saveMap() {
    locationDirectory.saveMap();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    locationDirectory = new LocationDirectory();
});

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const addModal = document.getElementById('addLocationModal');
    const mapModal = document.getElementById('mapImportModal');
    
    if (e.target === addModal) {
        closeAddLocationModal();
    }
    if (e.target === mapModal) {
        closeMapImportModal();
    }
});
