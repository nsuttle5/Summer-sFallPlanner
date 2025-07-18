// Character List JavaScript
class CharacterList {
    constructor() {
        this.characters = [];
        this.filteredCharacters = [];
        this.sortBy = 'name';
        this.sortOrder = 'asc';
        this.expandedItems = new Set();
        
        this.init();
    }
    
    init() {
        this.loadCharacters();
        this.setupEventListeners();
        this.displayCharacters();
    }
    
    loadCharacters() {
        const stored = localStorage.getItem('summersFallCharacters');
        this.characters = stored ? JSON.parse(stored) : [];
        this.filteredCharacters = [...this.characters];
    }
    
    setupEventListeners() {
        // Search functionality
        document.getElementById('listSearchInput').addEventListener('input', (e) => {
            this.filterCharacters(e.target.value);
        });
        
        // Sort controls
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.sortCharacters();
        });
        
        document.getElementById('toggleSort').addEventListener('click', () => {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            this.sortCharacters();
            this.updateSortButton();
        });
        
        // View controls
        document.getElementById('expandAll').addEventListener('click', () => {
            this.expandAll();
        });
        
        document.getElementById('collapseAll').addEventListener('click', () => {
            this.collapseAll();
        });
        
        // Quick add form
        document.getElementById('quickAddForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addQuickCharacter();
        });
    }
    
    filterCharacters(searchTerm) {
        const term = searchTerm.toLowerCase();
        this.filteredCharacters = this.characters.filter(character => 
            character.name.toLowerCase().includes(term) ||
            (character.occupation && character.occupation.toLowerCase().includes(term)) ||
            (character.address && character.address.toLowerCase().includes(term)) ||
            (character.likes && character.likes.toLowerCase().includes(term)) ||
            (character.dislikes && character.dislikes.toLowerCase().includes(term)) ||
            (character.notes && character.notes.toLowerCase().includes(term)) ||
            (character.characterType && this.getCharacterTypeLabel(character.characterType).toLowerCase().includes(term))
        );
        
        this.displayCharacters();
    }
    
    sortCharacters() {
        this.filteredCharacters.sort((a, b) => {
            let valueA = a[this.sortBy] || '';
            let valueB = b[this.sortBy] || '';
            
            // Handle different data types
            if (this.sortBy === 'age') {
                valueA = parseInt(valueA) || 0;
                valueB = parseInt(valueB) || 0;
            } else if (this.sortBy === 'dateAdded') {
                valueA = new Date(a.dateAdded || 0);
                valueB = new Date(b.dateAdded || 0);
            } else if (this.sortBy === 'characterType') {
                // Custom sort order for character types: Main -> Side -> Background
                const typeOrder = { 'main': 0, 'side': 1, 'background': 2 };
                valueA = typeOrder[valueA] !== undefined ? typeOrder[valueA] : 1; // Default to side
                valueB = typeOrder[valueB] !== undefined ? typeOrder[valueB] : 1;
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
        
        this.displayCharacters();
    }
    
    updateSortButton() {
        const button = document.getElementById('toggleSort');
        button.textContent = this.sortOrder === 'asc' ? '↑' : '↓';
        button.title = this.sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending';
    }
    
    expandAll() {
        const items = document.querySelectorAll('.character-item');
        items.forEach(item => {
            item.classList.add('expanded');
            this.expandedItems.add(item.dataset.characterId);
        });
    }
    
    collapseAll() {
        const items = document.querySelectorAll('.character-item');
        items.forEach(item => {
            item.classList.remove('expanded');
        });
        this.expandedItems.clear();
    }
    
    displayCharacters() {
        const container = document.getElementById('characterList');
        const emptyState = document.getElementById('listEmptyState');
        
        if (this.filteredCharacters.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        container.innerHTML = this.filteredCharacters.map(character => 
            this.createCharacterListItem(character)
        ).join('');
        
        // Restore expanded states
        this.expandedItems.forEach(id => {
            const item = document.querySelector(`[data-character-id="${id}"]`);
            if (item) item.classList.add('expanded');
        });
        
        // Add click listeners for expand/collapse
        container.querySelectorAll('.character-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.classList.contains('action-btn-small')) return;
                this.toggleCharacterExpansion(header.closest('.character-item'));
            });
        });
        
        // Add delete button listeners
        container.querySelectorAll('.delete-character').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteCharacter(btn.dataset.characterId);
            });
        });
    }
    
    createCharacterListItem(character) {
        const avatar = character.imageUrl ? 
            `<img src="${character.imageUrl}" alt="${character.name}" class="character-avatar">` :
            `<div class="character-avatar">${character.name.charAt(0).toUpperCase()}</div>`;
        
        const quickDetails = [
            character.age ? `Age ${character.age}` : null,
            character.occupation || null,
            character.address || null
        ].filter(Boolean).join(' • ');
        
        const conceptArt = [character.conceptArt, character.conceptArt2, character.conceptArt3]
            .filter(Boolean)
            .map(url => `<img src="${url}" alt="Concept art" class="concept-thumbnail">`)
            .join('');
        
        return `
            <div class="character-item" data-character-id="${character.id}">
                <div class="character-header">
                    <div class="character-basic-info">
                        ${avatar}
                        <div class="character-name-info">
                            <div class="character-name-with-badge">
                                <h3>${character.name}</h3>
                                <span class="character-type-badge ${character.characterType || 'side'}">${this.getCharacterTypeLabel(character.characterType)}</span>
                            </div>
                            <div class="character-quick-details">${quickDetails || 'No details added'}</div>
                        </div>
                    </div>
                    <div class="expand-arrow">▼</div>
                </div>
                
                <div class="character-details">
                    <div class="details-grid">
                        <div class="detail-section">
                            <h4>Basic Information</h4>
                            <div class="detail-field">
                                <span class="detail-label">Age:</span>
                                <span class="detail-value ${!character.age ? 'empty' : ''}">${character.age || 'Not specified'}</span>
                            </div>
                            <div class="detail-field">
                                <span class="detail-label">Height:</span>
                                <span class="detail-value ${!character.height ? 'empty' : ''}">${character.height || 'Not specified'}</span>
                            </div>
                            <div class="detail-field">
                                <span class="detail-label">Occupation:</span>
                                <span class="detail-value ${!character.occupation ? 'empty' : ''}">${character.occupation || 'Not specified'}</span>
                            </div>
                            <div class="detail-field">
                                <span class="detail-label">Address:</span>
                                <span class="detail-value ${!character.address ? 'empty' : ''}">${character.address || 'Not specified'}</span>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h4>Personality</h4>
                            <div class="detail-field">
                                <span class="detail-label">Likes:</span>
                                <span class="detail-value ${!character.likes ? 'empty' : ''}">${character.likes || 'None listed'}</span>
                            </div>
                            <div class="detail-field">
                                <span class="detail-label">Dislikes:</span>
                                <span class="detail-value ${!character.dislikes ? 'empty' : ''}">${character.dislikes || 'None listed'}</span>
                            </div>
                        </div>
                        
                        ${character.notes ? `
                        <div class="detail-section">
                            <h4>Notes & Story Ideas</h4>
                            <div class="detail-field">
                                <span class="detail-value">${character.notes}</span>
                            </div>
                        </div>
                        ` : ''}
                        
                        ${conceptArt ? `
                        <div class="detail-section">
                            <h4>Concept Art</h4>
                            <div class="concept-gallery">
                                ${conceptArt}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="character-actions">
                        <a href="main.html?edit=${character.id}" class="action-btn-small edit">✏️ Edit</a>
                        <button class="action-btn-small delete delete-character" data-character-id="${character.id}">🗑️ Delete</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    toggleCharacterExpansion(item) {
        const characterId = item.dataset.characterId;
        
        if (item.classList.contains('expanded')) {
            item.classList.remove('expanded');
            this.expandedItems.delete(characterId);
        } else {
            item.classList.add('expanded');
            this.expandedItems.add(characterId);
        }
    }
    
    deleteCharacter(characterId) {
        if (confirm('Are you sure you want to delete this character? This action cannot be undone.')) {
            this.characters = this.characters.filter(c => c.id !== characterId);
            this.filteredCharacters = this.filteredCharacters.filter(c => c.id !== characterId);
            
            // Update localStorage
            localStorage.setItem('summersFallCharacters', JSON.stringify(this.characters));
            
            this.displayCharacters();
        }
    }
    
    addQuickCharacter() {
        const name = document.getElementById('quickName').value.trim();
        const occupation = document.getElementById('quickOccupation').value.trim();
        const age = document.getElementById('quickAge').value;
        
        if (!name) return;
        
        const character = {
            id: Date.now().toString(),
            name: name,
            characterType: 'side', // Default to side character
            occupation: occupation,
            age: age,
            dateAdded: new Date().toISOString(),
            imageUrl: '',
            conceptArt: '',
            conceptArt2: '',
            conceptArt3: '',
            height: '',
            address: '',
            likes: '',
            dislikes: '',
            notes: ''
        };
        
        this.characters.unshift(character);
        this.filteredCharacters = [...this.characters];
        
        // Update localStorage
        localStorage.setItem('summersFallCharacters', JSON.stringify(this.characters));
        
        // Clear form and close modal
        document.getElementById('quickAddForm').reset();
        closeAddModal();
        
        this.displayCharacters();
    }
    
    getCharacterTypeLabel(type) {
        switch(type) {
            case 'main': return 'Main';
            case 'side': return 'Side';
            case 'background': return 'BG';
            default: return 'Side';
        }
    }
}

// Modal functions
function openAddModal() {
    document.getElementById('addCharacterModal').classList.add('show');
}

function closeAddModal() {
    document.getElementById('addCharacterModal').classList.remove('show');
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new CharacterList();
});

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('addCharacterModal');
    if (e.target === modal) {
        closeAddModal();
    }
});
