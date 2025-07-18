// Concept Gallery JavaScript
class ConceptGallery {
    constructor() {
        this.images = [];
        this.filteredImages = [];
        this.currentImage = null;
        this.allTags = new Set();
        this.activeFilters = new Set(['all']);
        this.currentView = 'grid';
        this.sortBy = 'dateAdded';
        this.sortOrder = 'desc';
        this.imageSize = 250;
        
        this.init();
    }
    
    init() {
        this.loadImages();
        this.setupEventListeners();
        this.updateDisplay();
        this.updateStats();
    }
    
    loadImages() {
        const stored = localStorage.getItem('summersFallConceptArt');
        if (stored) {
            this.images = JSON.parse(stored);
            this.extractAllTags();
        }
        this.filteredImages = [...this.images];
    }
    
    saveImages() {
        localStorage.setItem('summersFallConceptArt', JSON.stringify(this.images));
    }
    
    extractAllTags() {
        this.allTags.clear();
        this.images.forEach(image => {
            image.tags.forEach(tag => this.allTags.add(tag));
        });
    }
    
    setupEventListeners() {
        // Upload functionality
        const uploadArea = document.getElementById('uploadArea');
        const imageUpload = document.getElementById('imageUpload');
        
        uploadArea.addEventListener('click', () => imageUpload.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        
        imageUpload.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });
        
        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterImages();
        });
        
        // Sort controls
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.sortAndFilterImages();
        });
        
        document.getElementById('sortOrder').addEventListener('click', () => {
            this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
            this.updateSortButton();
            this.sortAndFilterImages();
        });
        
        // View controls
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentView = e.target.dataset.view;
                this.updateViewButtons();
                this.updateDisplay();
            });
        });
        
        // Image size control
        document.getElementById('imageSize').addEventListener('input', (e) => {
            this.imageSize = e.target.value;
            this.updateImageSizes();
        });
        
        // Tag input in modal
        document.getElementById('imageTagInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTagToCurrentImage();
            }
        });
        
        // Modal close events
        document.addEventListener('click', (e) => {
            const imageModal = document.getElementById('imageModal');
            const tagModal = document.getElementById('tagModal');
            
            if (e.target === imageModal) {
                this.closeImageModal();
            }
            if (e.target === tagModal) {
                this.closeTagModal();
            }
        });
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('uploadArea').classList.add('dragover');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('uploadArea').classList.remove('dragover');
    }
    
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('uploadArea').classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.type.startsWith('image/')
        );
        
        if (files.length > 0) {
            this.handleFileSelect(files);
        }
    }
    
    handleFileSelect(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                // Check file size (limit to 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    this.showUploadError(`File "${file.name}" is too large. Maximum size is 10MB.`);
                    return;
                }
                this.processImageFile(file);
            } else {
                this.showUploadError(`File "${file.name}" is not a valid image format.`);
            }
        });
    }
    
    processImageFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const imageData = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    name: file.name.replace(/\.[^/.]+$/, ""),
                    description: '',
                    tags: [],
                    dataUrl: e.target.result,
                    fileSize: file.size,
                    dimensions: `${img.width}x${img.height}`,
                    dateAdded: new Date().toISOString(),
                    lastModified: new Date().toISOString()
                };
                
                this.images.unshift(imageData);
                this.extractAllTags();
                this.saveImages();
                this.filterImages();
                this.updateStats();
                this.updateTagFilters();
                
                // Show success feedback
                this.showUploadSuccess(imageData.name);
            };
            img.onerror = () => {
                this.showUploadError(`Failed to load image: ${file.name}`);
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
            this.showUploadError(`Failed to read file: ${file.name}`);
        };
        reader.readAsDataURL(file);
    }
    
    showUploadSuccess(filename) {
        // Visual feedback for successful upload
        const uploadArea = document.getElementById('uploadArea');
        const originalText = uploadArea.innerHTML;
        uploadArea.innerHTML = `
            <div class="upload-icon">✅</div>
            <p><strong>Successfully uploaded: ${filename}</strong></p>
            <p>File has been added to your gallery</p>
        `;
        
        setTimeout(() => {
            uploadArea.innerHTML = originalText;
        }, 3000);
    }
    
    showUploadError(message) {
        const uploadArea = document.getElementById('uploadArea');
        const originalText = uploadArea.innerHTML;
        uploadArea.innerHTML = `
            <div class="upload-icon">❌</div>
            <p><strong>Upload Error</strong></p>
            <p>${message}</p>
        `;
        
        setTimeout(() => {
            uploadArea.innerHTML = originalText;
        }, 4000);
    }
    
    filterImages() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        
        this.filteredImages = this.images.filter(image => {
            // Search filter
            const matchesSearch = !searchTerm || 
                image.name.toLowerCase().includes(searchTerm) ||
                image.description.toLowerCase().includes(searchTerm) ||
                image.tags.some(tag => tag.toLowerCase().includes(searchTerm));
            
            // Tag filter
            const matchesTags = this.activeFilters.has('all') || 
                image.tags.some(tag => this.activeFilters.has(tag));
            
            return matchesSearch && matchesTags;
        });
        
        this.sortAndFilterImages();
    }
    
    sortAndFilterImages() {
        this.filteredImages.sort((a, b) => {
            let valueA, valueB;
            
            switch (this.sortBy) {
                case 'name':
                    valueA = a.name.toLowerCase();
                    valueB = b.name.toLowerCase();
                    break;
                case 'tags':
                    valueA = a.tags.length;
                    valueB = b.tags.length;
                    break;
                case 'size':
                    valueA = a.fileSize;
                    valueB = b.fileSize;
                    break;
                case 'dateAdded':
                default:
                    valueA = new Date(a.dateAdded);
                    valueB = new Date(b.dateAdded);
                    break;
            }
            
            const comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
            return this.sortOrder === 'asc' ? comparison : -comparison;
        });
        
        this.updateDisplay();
        this.updateResultsInfo();
    }
    
    updateDisplay() {
        const grid = document.getElementById('galleryGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (this.filteredImages.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }
        
        emptyState.style.display = 'none';
        
        // Update grid class for view type
        grid.className = `gallery-grid ${this.currentView}-view`;
        
        grid.innerHTML = this.filteredImages.map(image => this.createImageItem(image)).join('');
        
        // Apply image size
        this.updateImageSizes();
    }
    
    createImageItem(image) {
        const tagsHTML = image.tags.map(tag => 
            `<span class="tag-chip">${tag}</span>`
        ).join('');
        
        return `
            <div class="image-item" onclick="conceptGallery.openImageModal('${image.id}')">
                <div class="image-preview">
                    <img src="${image.dataUrl}" alt="${image.name}" loading="lazy">
                    <div class="image-overlay">
                        <div class="overlay-text">View Details</div>
                    </div>
                </div>
                <div class="image-info">
                    <div class="image-title">${image.name}</div>
                    <div class="image-description">${image.description || 'No description'}</div>
                    <div class="image-tags-display">${tagsHTML}</div>
                </div>
            </div>
        `;
    }
    
    updateImageSizes() {
        const items = document.querySelectorAll('.image-item .image-preview');
        items.forEach(item => {
            if (this.currentView === 'grid') {
                item.style.height = `${this.imageSize}px`;
            }
        });
    }
    
    updateViewButtons() {
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === this.currentView) {
                btn.classList.add('active');
            }
        });
    }
    
    updateSortButton() {
        const btn = document.getElementById('sortOrder');
        btn.textContent = this.sortOrder === 'desc' ? '↓' : '↑';
        btn.title = this.sortOrder === 'desc' ? 'Sort Ascending' : 'Sort Descending';
    }
    
    updateResultsInfo() {
        const total = this.filteredImages.length;
        const resultsText = `${total} image${total !== 1 ? 's' : ''}`;
        document.getElementById('resultsCount').textContent = resultsText;
        
        // Update active filters display
        const filterText = this.activeFilters.has('all') ? '' : 
            `• Filtered by: ${Array.from(this.activeFilters).join(', ')}`;
        document.getElementById('activeFilters').textContent = filterText;
    }
    
    updateStats() {
        document.getElementById('totalImages').textContent = this.images.length;
        document.getElementById('uniqueTags').textContent = this.allTags.size;
        
        const totalSize = this.images.reduce((sum, img) => sum + (img.fileSize || 0), 0);
        const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);
        document.getElementById('storageUsed').textContent = `${sizeMB} MB`;
    }
    
    updateTagFilters() {
        const container = document.getElementById('tagFilters');
        const allButton = container.querySelector('[data-tag="all"]');
        
        // Remove existing tag buttons (keep "All")
        container.querySelectorAll('.tag-filter:not([data-tag="all"])').forEach(btn => btn.remove());
        
        // Add tag filter buttons
        Array.from(this.allTags).sort().forEach(tag => {
            const button = document.createElement('button');
            button.className = 'tag-filter';
            button.dataset.tag = tag;
            button.textContent = tag;
            button.addEventListener('click', () => this.toggleTagFilter(tag));
            container.appendChild(button);
        });
    }
    
    toggleTagFilter(tag) {
        if (tag === 'all') {
            this.activeFilters.clear();
            this.activeFilters.add('all');
        } else {
            if (this.activeFilters.has('all')) {
                this.activeFilters.clear();
            }
            
            if (this.activeFilters.has(tag)) {
                this.activeFilters.delete(tag);
                if (this.activeFilters.size === 0) {
                    this.activeFilters.add('all');
                }
            } else {
                this.activeFilters.add(tag);
            }
        }
        
        this.updateTagFilterButtons();
        this.filterImages();
    }
    
    updateTagFilterButtons() {
        document.querySelectorAll('.tag-filter').forEach(btn => {
            btn.classList.remove('active');
            if (this.activeFilters.has(btn.dataset.tag)) {
                btn.classList.add('active');
            }
        });
    }
    
    openImageModal(imageId) {
        this.currentImage = this.images.find(img => img.id === imageId);
        if (!this.currentImage) return;
        
        // Populate modal
        document.getElementById('modalImage').src = this.currentImage.dataUrl;
        document.getElementById('imageName').value = this.currentImage.name;
        document.getElementById('imageDescription').value = this.currentImage.description;
        document.getElementById('imageSize').textContent = this.formatFileSize(this.currentImage.fileSize);
        document.getElementById('imageDimensions').textContent = this.currentImage.dimensions;
        document.getElementById('imageDate').textContent = new Date(this.currentImage.dateAdded).toLocaleDateString();
        
        this.updateModalTags();
        document.getElementById('imageModal').classList.add('show');
    }
    
    updateModalTags() {
        const container = document.getElementById('imageTags');
        container.innerHTML = this.currentImage.tags.map(tag => `
            <span class="image-tag">
                ${tag}
                <button class="tag-remove" onclick="conceptGallery.removeTagFromCurrentImage('${tag}')">×</button>
            </span>
        `).join('');
    }
    
    addTagToCurrentImage() {
        const input = document.getElementById('imageTagInput');
        const tag = input.value.trim().toLowerCase();
        
        if (tag && !this.currentImage.tags.includes(tag)) {
            this.currentImage.tags.push(tag);
            this.updateModalTags();
            input.value = '';
        }
    }
    
    removeTagFromCurrentImage(tag) {
        this.currentImage.tags = this.currentImage.tags.filter(t => t !== tag);
        this.updateModalTags();
    }
    
    saveImageInfo() {
        if (!this.currentImage) return;
        
        this.currentImage.name = document.getElementById('imageName').value || 'Untitled';
        this.currentImage.description = document.getElementById('imageDescription').value;
        this.currentImage.lastModified = new Date().toISOString();
        
        this.extractAllTags();
        this.saveImages();
        this.updateDisplay();
        this.updateTagFilters();
        this.closeImageModal();
    }
    
    closeImageModal() {
        document.getElementById('imageModal').classList.remove('show');
        this.currentImage = null;
    }
    
    deleteImage() {
        if (!this.currentImage) return;
        
        if (confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
            this.images = this.images.filter(img => img.id !== this.currentImage.id);
            this.extractAllTags();
            this.saveImages();
            this.filterImages();
            this.updateStats();
            this.updateTagFilters();
            this.closeImageModal();
        }
    }
    
    downloadImage() {
        if (!this.currentImage) return;
        
        const link = document.createElement('a');
        link.download = this.currentImage.name + '.png';
        link.href = this.currentImage.dataUrl;
        link.click();
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Global functions for HTML onclick handlers
let conceptGallery;

function triggerUpload() {
    document.getElementById('imageUpload').click();
}

function openImageModal(imageId) {
    conceptGallery.openImageModal(imageId);
}

function closeImageModal() {
    conceptGallery.closeImageModal();
}

function saveImageInfo() {
    conceptGallery.saveImageInfo();
}

function deleteImage() {
    conceptGallery.deleteImage();
}

function downloadImage() {
    conceptGallery.downloadImage();
}

function openTagModal() {
    document.getElementById('tagModal').classList.add('show');
}

function closeTagModal() {
    document.getElementById('tagModal').classList.remove('show');
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    conceptGallery = new ConceptGallery();
});
