let characters = JSON.parse(localStorage.getItem('summersFallCharacters')) || [];
let editingCharacterId = null;

function createCharacterCard(character) {
    const card = document.createElement('div');
    card.className = 'character-card';
    card.draggable = true;
    card.dataset.characterId = character.id;
    card.dataset.characterType = character.characterType || 'side';
    
    // Add character type styling
    const typeClass = character.characterType === 'main' ? 'main-character' : 
                      character.characterType === 'background' ? 'background-character' : 
                      'side-character';
    card.classList.add(typeClass);
    card.innerHTML = `
        <div class="drag-handle">⋮⋮</div>
        <div class="concept-art-section">
            <div class="concept-art">
                ${character.conceptArt ? 
                    `<img src="${character.conceptArt}" alt="${character.name} concept art" onerror="this.parentElement.innerHTML='<div class=\\'concept-art-placeholder\\'><div class=\\'icon\\'>🎨</div><div>Concept Art<br>Not Available</div></div>'">` : 
                    `<div class="concept-art-placeholder"><div class="icon">🎨</div><div>Concept Art<br>Not Available</div></div>`
                }
            </div>
            <div class="concept-art">
                ${character.conceptArt2 ? 
                    `<img src="${character.conceptArt2}" alt="${character.name} concept art 2" onerror="this.parentElement.innerHTML='<div class=\\'concept-art-placeholder\\'><div class=\\'icon\\'>🎨</div><div>Concept Art 2<br>Not Available</div></div>'">` : 
                    `<div class="concept-art-placeholder"><div class="icon">🎨</div><div>Concept Art 2<br>Not Available</div></div>`
                }
            </div>
            <div class="concept-art">
                ${character.conceptArt3 ? 
                    `<img src="${character.conceptArt3}" alt="${character.name} concept art 3" onerror="this.parentElement.innerHTML='<div class=\\'concept-art-placeholder\\'><div class=\\'icon\\'>🎨</div><div>Concept Art 3<br>Not Available</div></div>'">` : 
                    `<div class="concept-art-placeholder"><div class="icon">🎨</div><div>Concept Art 3<br>Not Available</div></div>`
                }
            </div>
        </div>
        
        <div class="character-info">
            <div class="character-header">
                <div class="character-image">
                    ${character.imageUrl ? 
                        `<img src="${character.imageUrl}" alt="${character.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.parentElement.innerHTML='<span>${getInitials(character.name)}</span>'">` : 
                        `<span>${getInitials(character.name)}</span>`
                    }
                </div>
                <div>
                    <div class="character-name">
                        ${character.name}
                        <span class="character-type-badge ${character.characterType || 'side'}">${getCharacterTypeLabel(character.characterType)}</span>
                    </div>
                    <div class="character-occupation">${character.occupation || 'Unknown Occupation'}</div>
                </div>
            </div>
            
            <div class="character-details">
                <div class="detail-row">
                    <div class="detail-item age">
                        <div class="detail-label">Age</div>
                        <div class="detail-value">${character.age || 'Unknown'}</div>
                    </div>
                    <div class="detail-item height">
                        <div class="detail-label">Height</div>
                        <div class="detail-value">${character.height || 'Unknown'}</div>
                    </div>
                </div>
                
                <div class="detail-item address">
                    <div class="detail-label">Address</div>
                    <div class="detail-value">${character.address || 'Unknown'}</div>
                </div>
                
                ${character.likes ? `
                    <div class="detail-item likes">
                        <div class="detail-label">Likes</div>
                        <div class="detail-value">${character.likes}</div>
                    </div>
                ` : ''}
                
                ${character.dislikes ? `
                    <div class="detail-item dislikes">
                        <div class="detail-label">Dislikes</div>
                        <div class="detail-value">${character.dislikes}</div>
                    </div>
                ` : ''}
                
                ${character.notes ? `
                    <div class="detail-item notes">
                        <div class="detail-label">📝 Notes</div>
                        <div class="detail-value">${character.notes}</div>
                    </div>
                ` : ''}
            </div>
            
            <div class="character-actions">
                <button class="edit-btn" onclick="openModal('${character.id}')">Edit</button>
                <button class="delete-btn" onclick="deleteCharacter('${character.id}')">Delete</button>
            </div>
        </div>
    `;
    
    // Add drag event listeners
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('drop', handleDrop);
    card.addEventListener('dragend', handleDragEnd);
    
    return card;
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    renderCharacters();
    setupEventListeners();
});

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const filteredCharacters = characters.filter(character => 
                character.name.toLowerCase().includes(searchTerm) ||
                (character.occupation && character.occupation.toLowerCase().includes(searchTerm)) ||
                (character.address && character.address.toLowerCase().includes(searchTerm))
            );
            renderCharacters(filteredCharacters);
        });
    } else {
        console.error('Search input element not found');
    }

    // Form submission
    const characterForm = document.getElementById('characterForm');
    if (characterForm) {
        characterForm.addEventListener('submit', function(e) {
            console.log('Form submit event triggered');
            e.preventDefault();
            saveCharacter();
        });
        console.log('Character form event listener attached successfully');
    } else {
        console.error('Character form element not found');
    }

    // Close modal when clicking outside
    const characterModal = document.getElementById('characterModal');
    if (characterModal) {
        characterModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    } else {
        console.error('Character modal element not found');
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function openModal(characterId = null) {
    const modal = document.getElementById('characterModal');
    const form = document.getElementById('characterForm');
    const title = document.getElementById('modalTitle');

    if (characterId) {
        // Editing existing character
        editingCharacterId = characterId;
        const character = characters.find(c => c.id === characterId);
        title.textContent = 'Edit Character';
        
        // Populate form with character data
        document.getElementById('name').value = character.name || '';
        document.getElementById('characterType').value = character.characterType || 'side';
        document.getElementById('imageUrl').value = character.imageUrl || '';
        document.getElementById('conceptArt').value = character.conceptArt || '';
        document.getElementById('conceptArt2').value = character.conceptArt2 || '';
        document.getElementById('conceptArt3').value = character.conceptArt3 || '';
        document.getElementById('age').value = character.age || '';
        document.getElementById('height').value = character.height || '';
        document.getElementById('occupation').value = character.occupation || '';
        document.getElementById('address').value = character.address || '';
        document.getElementById('likes').value = character.likes || '';
        document.getElementById('dislikes').value = character.dislikes || '';
        document.getElementById('notes').value = character.notes || '';
    } else {
        // Adding new character
        editingCharacterId = null;
        title.textContent = 'Add New Character';
        form.reset();
    }

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('characterModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    editingCharacterId = null;
}

function saveCharacter() {
    console.log('saveCharacter function called');
    
    const formData = {
        name: document.getElementById('name').value.trim(),
        characterType: document.getElementById('characterType').value,
        imageUrl: document.getElementById('imageUrl').value.trim(),
        conceptArt: document.getElementById('conceptArt').value.trim(),
        conceptArt2: document.getElementById('conceptArt2').value.trim(),
        conceptArt3: document.getElementById('conceptArt3').value.trim(),
        age: document.getElementById('age').value,
        height: document.getElementById('height').value.trim(),
        occupation: document.getElementById('occupation').value.trim(),
        address: document.getElementById('address').value.trim(),
        likes: document.getElementById('likes').value.trim(),
        dislikes: document.getElementById('dislikes').value.trim(),
        notes: document.getElementById('notes').value.trim()
    };

    console.log('Form data collected:', formData);

    if (!formData.name) {
        alert('Please enter a character name.');
        return;
    }

    if (editingCharacterId) {
        // Update existing character
        const index = characters.findIndex(c => c.id === editingCharacterId);
        characters[index] = { ...characters[index], ...formData };
    } else {
        // Add new character
        const newCharacter = {
            id: generateId(),
            ...formData,
            dateAdded: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };
        characters.push(newCharacter);
        console.log('New character added:', newCharacter);
    }

    localStorage.setItem('summersFallCharacters', JSON.stringify(characters));
    console.log('Characters saved to localStorage:', characters);
    console.log('Total characters count:', characters.length);
    renderCharacters();
    closeModal();
}

function deleteCharacter(characterId) {
    if (confirm('Are you sure you want to delete this character?')) {
        characters = characters.filter(c => c.id !== characterId);
        localStorage.setItem('summersFallCharacters', JSON.stringify(characters));
        renderCharacters();
    }
}

function getInitials(name) {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
}

function getCharacterTypeLabel(type) {
    switch(type) {
        case 'main': return 'Main';
        case 'side': return 'Side';
        case 'background': return 'BG';
        default: return 'Side';
    }
}

function renderCharacters(charactersToRender = characters) {
    const grid = document.getElementById('characterGrid');
    const emptyState = document.getElementById('emptyState');
    
    grid.innerHTML = '';
    
    if (charactersToRender.length === 0) {
        if (characters.length === 0) {
            emptyState.style.display = 'block';
        } else {
            // Show "no results" message for search
            grid.innerHTML = `
                <div class="empty-state">
                    <h3>No Characters Found</h3>
                    <p>Try adjusting your search terms.</p>
                </div>
            `;
        }
        return;
    }
    
    emptyState.style.display = 'none';
    charactersToRender.forEach(character => {
        grid.appendChild(createCharacterCard(character));
    });
}

// Drag and Drop Variables
let draggedElement = null;
let placeholder = null;

// Drag and Drop Functions
function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    if (draggedElement !== this) {
        const draggedId = draggedElement.dataset.characterId;
        const targetId = this.dataset.characterId;
        
        // Find indices
        const draggedIndex = characters.findIndex(c => c.id === draggedId);
        const targetIndex = characters.findIndex(c => c.id === targetId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
            // Reorder array
            const draggedCharacter = characters.splice(draggedIndex, 1)[0];
            characters.splice(targetIndex, 0, draggedCharacter);
            
            // Save and re-render
            localStorage.setItem('summersFallCharacters', JSON.stringify(characters));
            renderCharacters();
        }
    }
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedElement = null;
}

// Drag and Drop functionality
function initializeDragAndDrop() {
    const charactersContainer = document.querySelector('.character-grid');
    
    if (!charactersContainer) {
        console.log('Character grid not found, skipping drag and drop initialization');
        return;
    }
    
    charactersContainer.addEventListener('dragstart', function(e) {
        if (e.target.classList.contains('character-card')) {
            draggedElement = e.target;
            e.target.style.opacity = '0.5';
            
            // Create placeholder
            placeholder = document.createElement('div');
            placeholder.className = 'drop-placeholder';
            placeholder.innerHTML = '<div class="placeholder-text">Drop character here</div>';
        }
    });

    charactersContainer.addEventListener('dragend', function(e) {
        if (e.target.classList.contains('character-card')) {
            e.target.style.opacity = '';
            if (placeholder && placeholder.parentNode) {
                placeholder.remove();
            }
            draggedElement = null;
        }
    });

    charactersContainer.addEventListener('dragover', function(e) {
        e.preventDefault();
        if (!draggedElement) return;

        const afterElement = getDragAfterElement(charactersContainer, e.clientY);
        
        if (afterElement == null) {
            if (placeholder.parentNode !== charactersContainer) {
                charactersContainer.appendChild(placeholder);
            }
        } else {
            if (placeholder.parentNode !== charactersContainer || 
                charactersContainer.querySelector('.drop-placeholder').nextElementSibling !== afterElement) {
                charactersContainer.insertBefore(placeholder, afterElement);
            }
        }
    });

    charactersContainer.addEventListener('drop', function(e) {
        e.preventDefault();
        if (!draggedElement || !placeholder) return;

        // Get the new position
        const allCards = Array.from(charactersContainer.querySelectorAll('.character-card:not([style*="opacity"])'));
        const placeholderIndex = Array.from(charactersContainer.children).indexOf(placeholder);
        
        // Remove placeholder
        placeholder.remove();
        
        // Get the character ID and find its index in the array
        const draggedId = draggedElement.dataset.characterId;
        const draggedCharacterIndex = characters.findIndex(char => char.id === draggedId);
        const draggedCharacter = characters[draggedCharacterIndex];
        
        // Remove from old position
        characters.splice(draggedCharacterIndex, 1);
        
        // Calculate new index (accounting for removed element)
        let newIndex = placeholderIndex;
        if (draggedCharacterIndex < placeholderIndex) {
            newIndex--;
        }
        
        // Insert at new position
        characters.splice(newIndex, 0, draggedCharacter);
        
        // Save and refresh
        localStorage.setItem('summersFallCharacters', JSON.stringify(characters));
        renderCharacters();
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.character-card:not([style*="opacity"])')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Initialize drag and drop when characters are displayed
const originalRenderCharacters = renderCharacters;
renderCharacters = function(charactersToRender = characters) {
    originalRenderCharacters(charactersToRender);
    initializeDragAndDrop();
};

// Add some sample data if no characters exist
if (characters.length === 0) {
    const sampleCharacters = [
        {
            id: generateId(),
            name: "Elena Hartwell",
            imageUrl: "",
            conceptArt: "",
            conceptArt2: "",
            conceptArt3: "",
            age: "28",
            height: "5'6\"",
            occupation: "Library Curator",
            address: "42 Maple Street",
            likes: "Ancient books, herbal tea, rainy afternoons, mystery novels",
            dislikes: "Loud noises, crowded spaces, burnt coffee",
            notes: "Potential love interest for Marcus? Has a secret family history with the town's founding. Knows more about the old library basement than she lets on.",
            createdAt: new Date().toISOString()
        },
        {
            id: generateId(),
            name: "Marcus Chen",
            imageUrl: "",
            conceptArt: "",
            conceptArt2: "",
            conceptArt3: "",
            age: "34",
            height: "5'10\"",
            occupation: "Bakery Owner",
            address: "15 Commerce Avenue",
            likes: "Early mornings, fresh bread, community events, classical music",
            dislikes: "Wasted food, dishonesty, winter storms",
            notes: "Central character - everyone knows him. Has financial troubles but won't accept help. His bakery is the town's social hub. Childhood friends with Elena?",
            createdAt: new Date().toISOString()
        }
    ];
    
    localStorage.setItem('summersFallCharacters', JSON.stringify(sampleCharacters));
    characters = sampleCharacters;
}
