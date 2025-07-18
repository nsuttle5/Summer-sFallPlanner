// Quest Manager JavaScript
class QuestManager {
    constructor() {
        this.quests = [];
        this.filteredQuests = [];
        this.characters = [];
        this.locations = [];
        this.editingQuestId = null;
        
        this.init();
    }
    
    init() {
        this.loadQuests();
        this.loadCharacters();
        this.loadLocations();
        this.setupEventListeners();
        this.populateCharacterAndLocationSelects();
        this.displayQuests();
    }
    
    loadQuests() {
        const stored = localStorage.getItem('summersFallQuests');
        this.quests = stored ? JSON.parse(stored) : [];
        this.filteredQuests = [...this.quests];
    }
    
    loadCharacters() {
        const stored = localStorage.getItem('summersFallCharacters');
        this.characters = stored ? JSON.parse(stored) : [];
    }
    
    loadLocations() {
        const stored = localStorage.getItem('summersFallLocations');
        this.locations = stored ? JSON.parse(stored) : [];
    }
    
    saveQuests() {
        localStorage.setItem('summersFallQuests', JSON.stringify(this.quests));
    }
    
    setupEventListeners() {
        // Search functionality
        document.getElementById('questSearchInput').addEventListener('input', (e) => {
            this.filterQuests();
        });
        
        // Filter controls
        document.getElementById('statusFilter').addEventListener('change', () => {
            this.filterQuests();
        });
        
        document.getElementById('typeFilter').addEventListener('change', () => {
            this.filterQuests();
        });
        
        // Form submission
        document.getElementById('questForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveQuest();
        });
        
        // Close modal when clicking outside
        document.getElementById('questModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeQuestModal();
            }
        });
    }
    
    populateCharacterAndLocationSelects() {
        const questGiverSelect = document.getElementById('questGiver');
        const questLocationSelect = document.getElementById('questLocation');
        const questCharactersDiv = document.getElementById('questCharacters');
        
        // Clear existing options
        questGiverSelect.innerHTML = '<option value="">No specific quest giver</option>';
        questLocationSelect.innerHTML = '<option value="">No specific location</option>';
        questCharactersDiv.innerHTML = '';
        
        // Populate quest giver (characters)
        this.characters.forEach(character => {
            const option = document.createElement('option');
            option.value = character.id;
            option.textContent = character.name;
            questGiverSelect.appendChild(option);
        });
        
        // Populate locations
        this.locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location.id;
            option.textContent = location.name;
            questLocationSelect.appendChild(option);
        });
        
        // Populate character checkboxes
        this.characters.forEach(character => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'character-checkbox';
            checkboxDiv.innerHTML = `
                <input type="checkbox" id="char_${character.id}" value="${character.id}">
                <label for="char_${character.id}">${character.name}</label>
            `;
            questCharactersDiv.appendChild(checkboxDiv);
        });
    }
    
    filterQuests() {
        const searchTerm = document.getElementById('questSearchInput').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;
        const typeFilter = document.getElementById('typeFilter').value;
        
        this.filteredQuests = this.quests.filter(quest => {
            // Search filter
            const matchesSearch = !searchTerm || 
                quest.name.toLowerCase().includes(searchTerm) ||
                quest.description.toLowerCase().includes(searchTerm) ||
                quest.objective.toLowerCase().includes(searchTerm) ||
                quest.involvedCharacters.some(charId => {
                    const character = this.characters.find(c => c.id === charId);
                    return character && character.name.toLowerCase().includes(searchTerm);
                });
            
            // Status filter
            const matchesStatus = statusFilter === 'all' || quest.status === statusFilter;
            
            // Type filter
            const matchesType = typeFilter === 'all' || quest.type === typeFilter;
            
            return matchesSearch && matchesStatus && matchesType;
        });
        
        this.displayQuests();
    }
    
    displayQuests() {
        const grid = document.getElementById('questGrid');
        const emptyState = document.getElementById('questEmptyState');
        
        if (this.filteredQuests.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        grid.innerHTML = this.filteredQuests.map(quest => 
            this.createQuestCard(quest)
        ).join('');
    }
    
    createQuestCard(quest) {
        const questGiver = quest.questGiver ? 
            this.characters.find(c => c.id === quest.questGiver)?.name : 'Unknown';
        const primaryLocation = quest.primaryLocation ? 
            this.locations.find(l => l.id === quest.primaryLocation)?.name : 'No specific location';
        
        const involvedCharacterNames = quest.involvedCharacters
            .map(charId => this.characters.find(c => c.id === charId)?.name)
            .filter(Boolean);
        
        const stepsHtml = quest.steps.map((step, index) => `
            <div class="quest-step-item">
                <div class="step-number">${index + 1}</div>
                <div class="step-content">
                    <div class="step-title">${step.title}</div>
                    ${step.description ? `<div class="step-description">${step.description}</div>` : ''}
                </div>
            </div>
        `).join('');
        
        return `
            <div class="quest-card ${quest.type}-quest" data-quest-id="${quest.id}">
                <div class="quest-header">
                    <div class="quest-title-section">
                        <h3 class="quest-title">${quest.name}</h3>
                        <div class="quest-badges">
                            <span class="quest-badge type-${quest.type}">${this.getTypeLabel(quest.type)}</span>
                            <span class="quest-badge status-${quest.status}">${this.getStatusLabel(quest.status)}</span>
                            <span class="quest-badge priority-${quest.priority}">${this.getPriorityLabel(quest.priority)}</span>
                        </div>
                    </div>
                    <div class="quest-actions">
                        <button class="btn-icon btn-edit" onclick="questManager.editQuest('${quest.id}')" title="Edit Quest">✏️</button>
                        <button class="btn-icon btn-delete" onclick="questManager.deleteQuest('${quest.id}')" title="Delete Quest">🗑️</button>
                    </div>
                </div>
                
                ${quest.description ? `<div class="quest-description">${quest.description}</div>` : ''}
                
                ${quest.objective ? `
                    <div class="quest-objective">
                        <h4>Main Objective</h4>
                        <p>${quest.objective}</p>
                    </div>
                ` : ''}
                
                ${quest.steps.length > 0 ? `
                    <div class="quest-steps">
                        <h4>Quest Steps (${quest.steps.length})</h4>
                        ${stepsHtml}
                    </div>
                ` : ''}
                
                <div class="quest-info-grid">
                    ${quest.questGiver ? `
                        <div class="quest-info-section">
                            <h4>Quest Giver</h4>
                            <p>${questGiver}</p>
                        </div>
                    ` : ''}
                    
                    ${quest.primaryLocation ? `
                        <div class="quest-info-section">
                            <h4>Primary Location</h4>
                            <p>${primaryLocation}</p>
                        </div>
                    ` : ''}
                    
                    ${quest.reward ? `
                        <div class="quest-info-section">
                            <h4>Reward</h4>
                            <p>${quest.reward}</p>
                        </div>
                    ` : ''}
                    
                    ${quest.consequences ? `
                        <div class="quest-info-section">
                            <h4>Consequences</h4>
                            <p>${quest.consequences}</p>
                        </div>
                    ` : ''}
                </div>
                
                ${involvedCharacterNames.length > 0 ? `
                    <div class="quest-info-section">
                        <h4>Involved Characters</h4>
                        <div class="character-list">
                            ${involvedCharacterNames.map(name => `<span class="character-tag">${name}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    getTypeLabel(type) {
        const labels = {
            'main': 'Main Quest',
            'side': 'Side Quest',
            'fetch': 'Fetch',
            'combat': 'Combat',
            'social': 'Social',
            'exploration': 'Exploration'
        };
        return labels[type] || type;
    }
    
    getStatusLabel(status) {
        const labels = {
            'planning': 'Planning',
            'active': 'Active',
            'completed': 'Completed',
            'cancelled': 'Cancelled'
        };
        return labels[status] || status;
    }
    
    getPriorityLabel(priority) {
        const labels = {
            'low': 'Low',
            'medium': 'Medium',
            'high': 'High',
            'critical': 'Critical'
        };
        return labels[priority] || priority;
    }
    
    openQuestModal(questId = null) {
        const modal = document.getElementById('questModal');
        const title = document.getElementById('questModalTitle');
        const form = document.getElementById('questForm');
        
        if (questId) {
            // Editing existing quest
            this.editingQuestId = questId;
            const quest = this.quests.find(q => q.id === questId);
            title.textContent = 'Edit Quest';
            this.populateQuestForm(quest);
        } else {
            // Adding new quest
            this.editingQuestId = null;
            title.textContent = 'Add New Quest';
            form.reset();
            this.resetQuestSteps();
            this.clearCharacterSelections();
        }
        
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    
    populateQuestForm(quest) {
        document.getElementById('questName').value = quest.name || '';
        document.getElementById('questType').value = quest.type || 'side';
        document.getElementById('questStatus').value = quest.status || 'planning';
        document.getElementById('questPriority').value = quest.priority || 'medium';
        document.getElementById('questDescription').value = quest.description || '';
        document.getElementById('questObjective').value = quest.objective || '';
        document.getElementById('questGiver').value = quest.questGiver || '';
        document.getElementById('questLocation').value = quest.primaryLocation || '';
        document.getElementById('questReward').value = quest.reward || '';
        document.getElementById('questConsequences').value = quest.consequences || '';
        document.getElementById('questNotes').value = quest.notes || '';
        
        // Populate quest steps
        this.resetQuestSteps();
        quest.steps.forEach((step, index) => {
            if (index > 0) this.addQuestStep(); // Add additional steps if needed
            const stepDiv = document.querySelectorAll('.quest-step')[index];
            stepDiv.querySelector('.step-title').value = step.title;
            stepDiv.querySelector('.step-description').value = step.description;
        });
        
        // Select involved characters
        this.clearCharacterSelections();
        quest.involvedCharacters.forEach(charId => {
            const checkbox = document.getElementById(`char_${charId}`);
            if (checkbox) checkbox.checked = true;
        });
    }
    
    closeQuestModal() {
        const modal = document.getElementById('questModal');
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        this.editingQuestId = null;
    }
    
    saveQuest() {
        const formData = this.collectQuestFormData();
        
        if (!formData.name.trim()) {
            alert('Please enter a quest name.');
            return;
        }
        
        if (this.editingQuestId) {
            // Update existing quest
            const index = this.quests.findIndex(q => q.id === this.editingQuestId);
            this.quests[index] = { ...this.quests[index], ...formData };
        } else {
            // Add new quest
            const newQuest = {
                id: Date.now().toString(),
                dateCreated: new Date().toISOString(),
                ...formData
            };
            this.quests.push(newQuest);
        }
        
        this.saveQuests();
        this.filterQuests();
        this.closeQuestModal();
    }
    
    collectQuestFormData() {
        const steps = [];
        document.querySelectorAll('.quest-step').forEach(stepDiv => {
            const title = stepDiv.querySelector('.step-title').value.trim();
            const description = stepDiv.querySelector('.step-description').value.trim();
            if (title) {
                steps.push({ title, description });
            }
        });
        
        const involvedCharacters = [];
        document.querySelectorAll('#questCharacters input[type="checkbox"]:checked').forEach(checkbox => {
            involvedCharacters.push(checkbox.value);
        });
        
        return {
            name: document.getElementById('questName').value.trim(),
            type: document.getElementById('questType').value,
            status: document.getElementById('questStatus').value,
            priority: document.getElementById('questPriority').value,
            description: document.getElementById('questDescription').value.trim(),
            objective: document.getElementById('questObjective').value.trim(),
            questGiver: document.getElementById('questGiver').value,
            primaryLocation: document.getElementById('questLocation').value,
            reward: document.getElementById('questReward').value.trim(),
            consequences: document.getElementById('questConsequences').value.trim(),
            notes: document.getElementById('questNotes').value.trim(),
            steps: steps,
            involvedCharacters: involvedCharacters,
            lastModified: new Date().toISOString()
        };
    }
    
    editQuest(questId) {
        this.openQuestModal(questId);
    }
    
    deleteQuest(questId) {
        if (confirm('Are you sure you want to delete this quest? This action cannot be undone.')) {
            this.quests = this.quests.filter(q => q.id !== questId);
            this.saveQuests();
            this.filterQuests();
        }
    }
    
    addQuestStep() {
        const stepsContainer = document.getElementById('questSteps');
        const stepCount = stepsContainer.querySelectorAll('.quest-step').length + 1;
        
        const stepDiv = document.createElement('div');
        stepDiv.className = 'quest-step';
        stepDiv.dataset.step = stepCount;
        stepDiv.innerHTML = `
            <div class="step-header">
                <span class="step-number">Step ${stepCount}</span>
                <button type="button" class="btn-remove-step" onclick="removeQuestStep(this)">×</button>
            </div>
            <div class="step-content">
                <input type="text" class="step-title" placeholder="Step title..." required>
                <textarea class="step-description" placeholder="Step description..." rows="2"></textarea>
            </div>
        `;
        
        stepsContainer.appendChild(stepDiv);
        this.updateRemoveStepButtons();
    }
    
    updateRemoveStepButtons() {
        const steps = document.querySelectorAll('.quest-step');
        steps.forEach((step, index) => {
            const removeBtn = step.querySelector('.btn-remove-step');
            removeBtn.style.display = steps.length > 1 ? 'flex' : 'none';
            
            // Update step numbers
            const stepNumber = step.querySelector('.step-number');
            stepNumber.textContent = `Step ${index + 1}`;
        });
    }
    
    resetQuestSteps() {
        const stepsContainer = document.getElementById('questSteps');
        stepsContainer.innerHTML = `
            <div class="quest-step" data-step="1">
                <div class="step-header">
                    <span class="step-number">Step 1</span>
                    <button type="button" class="btn-remove-step" onclick="removeQuestStep(this)" style="display: none;">×</button>
                </div>
                <div class="step-content">
                    <input type="text" class="step-title" placeholder="Step title..." required>
                    <textarea class="step-description" placeholder="Step description..." rows="2"></textarea>
                </div>
            </div>
        `;
    }
    
    clearCharacterSelections() {
        document.querySelectorAll('#questCharacters input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
    }
}

// Global functions for HTML onclick handlers
let questManager;

function openQuestModal() {
    questManager.openQuestModal();
}

function closeQuestModal() {
    questManager.closeQuestModal();
}

function addQuestStep() {
    questManager.addQuestStep();
}

function removeQuestStep(button) {
    const stepDiv = button.closest('.quest-step');
    const stepsContainer = document.getElementById('questSteps');
    
    if (stepsContainer.querySelectorAll('.quest-step').length > 1) {
        stepDiv.remove();
        questManager.updateRemoveStepButtons();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    questManager = new QuestManager();
});
