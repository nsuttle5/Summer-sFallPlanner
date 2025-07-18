// Story Editor JavaScript
class StoryEditor {
    constructor() {
        this.chapters = [];
        this.currentChapter = null;
        this.autoSaveInterval = null;
        this.references = {
            characters: [],
            locations: []
        };
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 50;
        
        this.init();
    }
    
    init() {
        this.loadStoryData();
        this.loadReferences();
        this.setupEventListeners();
        this.displayChapters();
        this.setupAutoSave();
        this.updateWordCount();
        
        // Create default chapter if none exist
        if (this.chapters.length === 0) {
            this.addChapter('Chapter 1', true);
        } else {
            this.loadChapter(this.chapters[0].id);
        }
        
        // Initialize undo/redo button states
        this.updateUndoRedoButtons();
    }
    
    setupChapterDragAndDrop() {
        const chapterItems = document.querySelectorAll('.chapter-item');
        const container = document.getElementById('chapterList');
        let draggedElement = null;
        let placeholder = null;
        
        chapterItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedElement = item;
                item.classList.add('dragging');
                
                // Create a placeholder element
                placeholder = document.createElement('div');
                placeholder.className = 'chapter-placeholder';
                placeholder.innerHTML = '<div class="placeholder-text">Drop chapter here</div>';
                
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', item.outerHTML);
                
                // Prevent the click event from firing when drag starts
                setTimeout(() => {
                    item.style.opacity = '0.5';
                }, 0);
            });
            
            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
                item.style.opacity = '1';
                
                // Remove any remaining placeholder
                if (placeholder && placeholder.parentNode) {
                    placeholder.parentNode.removeChild(placeholder);
                }
                
                draggedElement = null;
                placeholder = null;
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                if (draggedElement && draggedElement !== item) {
                    const rect = item.getBoundingClientRect();
                    const midpoint = rect.top + rect.height / 2;
                    
                    // Remove existing placeholder
                    if (placeholder && placeholder.parentNode) {
                        placeholder.parentNode.removeChild(placeholder);
                    }
                    
                    if (e.clientY < midpoint) {
                        // Insert before current item
                        container.insertBefore(placeholder, item);
                    } else {
                        // Insert after current item
                        const nextSibling = item.nextElementSibling;
                        if (nextSibling) {
                            container.insertBefore(placeholder, nextSibling);
                        } else {
                            container.appendChild(placeholder);
                        }
                    }
                }
            });
            
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                
                if (draggedElement && draggedElement !== item) {
                    const draggedIndex = parseInt(draggedElement.dataset.chapterIndex);
                    const targetIndex = parseInt(item.dataset.chapterIndex);
                    
                    this.reorderChapters(draggedIndex, targetIndex, e.clientY < item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2);
                }
            });
        });
        
        // Handle drops on the container itself (empty space)
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            // If dragging over empty space at the bottom
            if (draggedElement && !e.target.closest('.chapter-item')) {
                // Remove existing placeholder
                if (placeholder && placeholder.parentNode) {
                    placeholder.parentNode.removeChild(placeholder);
                }
                container.appendChild(placeholder);
            }
        });
        
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            
            // If dropped on empty space, move to end
            if (draggedElement && !e.target.closest('.chapter-item')) {
                const draggedIndex = parseInt(draggedElement.dataset.chapterIndex);
                this.reorderChapters(draggedIndex, this.chapters.length - 1, false);
            }
        });
    }
    
    reorderChapters(fromIndex, toIndex, insertBefore = false) {
        // Adjust toIndex if inserting before
        if (insertBefore && fromIndex < toIndex) {
            toIndex--;
        } else if (!insertBefore && fromIndex > toIndex) {
            toIndex++;
        }
        
        // Don't do anything if dropping on the same position
        if (fromIndex === toIndex) return;
        
        // Move the chapter in the array
        const movedChapter = this.chapters.splice(fromIndex, 1)[0];
        this.chapters.splice(toIndex, 0, movedChapter);
        
        // Save and refresh display
        this.saveStoryData();
        this.displayChapters();
        
        // Visual feedback
        const movedChapterElement = document.querySelector(`[data-chapter-id="${movedChapter.id}"]`);
        if (movedChapterElement) {
            movedChapterElement.style.background = '#f9a749';
            setTimeout(() => {
                movedChapterElement.style.background = '';
            }, 1000);
        }
    }
    
    loadStoryData() {
        const stored = localStorage.getItem('summersFallStory');
        if (stored) {
            const data = JSON.parse(stored);
            this.chapters = data.chapters || [];
        }
    }
    
    loadReferences() {
        // Load characters
        const characters = localStorage.getItem('summersFallCharacters');
        if (characters) {
            this.references.characters = JSON.parse(characters);
        }
        
        // Load locations
        const locations = localStorage.getItem('summersFallLocations');
        if (locations) {
            this.references.locations = JSON.parse(locations);
        }
        
        this.displayReferences();
    }
    
    setupEventListeners() {
        const editor = document.getElementById('textEditor');
        const chapterTitle = document.getElementById('chapterTitle');
        const chapterTags = document.getElementById('chapterTags');
        
        // Editor content changes
        editor.addEventListener('input', () => {
            this.updateWordCount();
            this.saveCurrentChapter();
        });
        
        // Chapter title changes
        chapterTitle.addEventListener('input', () => {
            this.saveCurrentChapter();
            this.updateChapterInList();
        });
        
        // Chapter tags changes
        chapterTags.addEventListener('input', () => {
            this.saveCurrentChapter();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    this.undo();
                } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
                    e.preventDefault();
                    this.redo();
                }
            }
        });
        
        // Modal form submissions
        document.getElementById('branchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.insertBranch();
        });
        
        document.getElementById('noteForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.insertNote();
        });
        
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            const branchModal = document.getElementById('branchModal');
            const noteModal = document.getElementById('noteModal');
            
            if (e.target === branchModal) {
                this.closeBranchModal();
            }
            if (e.target === noteModal) {
                this.closeNoteModal();
            }
        });
    }
    
    setupAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            this.saveStoryData();
        }, 30000); // Auto-save every 30 seconds
    }
    
    updateWordCount() {
        const editor = document.getElementById('textEditor');
        const text = editor.textContent || editor.innerText || '';
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        document.getElementById('wordCount').textContent = `${words.length} words`;
    }
    
    // Undo/Redo System
    saveStateForUndo() {
        if (!this.currentChapter) return;
        
        const state = {
            chapterId: this.currentChapter.id,
            title: document.getElementById('chapterTitle').value,
            tags: document.getElementById('chapterTags').value,
            content: document.getElementById('textEditor').innerHTML,
            timestamp: Date.now()
        };
        
        // Don't save if it's the same as the last state
        const lastState = this.undoStack[this.undoStack.length - 1];
        if (lastState && lastState.content === state.content && 
            lastState.title === state.title && lastState.tags === state.tags) {
            return;
        }
        
        this.undoStack.push(state);
        
        // Limit undo stack size
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
        
        // Clear redo stack when new action is performed
        this.redoStack = [];
        this.updateUndoRedoButtons();
    }
    
    undo() {
        if (this.undoStack.length === 0) return;
        
        // Save current state to redo stack
        const currentState = {
            chapterId: this.currentChapter.id,
            title: document.getElementById('chapterTitle').value,
            tags: document.getElementById('chapterTags').value,
            content: document.getElementById('textEditor').innerHTML,
            timestamp: Date.now()
        };
        this.redoStack.push(currentState);
        
        // Restore previous state
        const previousState = this.undoStack.pop();
        this.restoreState(previousState);
        this.updateUndoRedoButtons();
    }
    
    redo() {
        if (this.redoStack.length === 0) return;
        
        // Save current state to undo stack
        const currentState = {
            chapterId: this.currentChapter.id,
            title: document.getElementById('chapterTitle').value,
            tags: document.getElementById('chapterTags').value,
            content: document.getElementById('textEditor').innerHTML,
            timestamp: Date.now()
        };
        this.undoStack.push(currentState);
        
        // Restore next state
        const nextState = this.redoStack.pop();
        this.restoreState(nextState);
        this.updateUndoRedoButtons();
    }
    
    restoreState(state) {
        if (!state || !this.currentChapter) return;
        
        document.getElementById('chapterTitle').value = state.title;
        document.getElementById('chapterTags').value = state.tags;
        document.getElementById('textEditor').innerHTML = state.content;
        
        // Update current chapter data
        this.currentChapter.title = state.title;
        this.currentChapter.tags = state.tags;
        this.currentChapter.content = state.content;
        this.currentChapter.lastModified = new Date().toISOString();
        
        this.updateWordCount();
        this.updateChapterInList();
        this.saveStoryData();
    }
    
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        if (undoBtn) {
            undoBtn.disabled = this.undoStack.length === 0;
            undoBtn.title = this.undoStack.length > 0 ? 
                `Undo (${this.undoStack.length} actions available)` : 
                'Nothing to undo';
        }
        
        if (redoBtn) {
            redoBtn.disabled = this.redoStack.length === 0;
            redoBtn.title = this.redoStack.length > 0 ? 
                `Redo (${this.redoStack.length} actions available)` : 
                'Nothing to redo';
        }
    }
    
    addChapter(title = null, makeActive = false) {
        const chapter = {
            id: Date.now().toString(),
            title: title || `Chapter ${this.chapters.length + 1}`,
            content: '',
            tags: '',
            wordCount: 0,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };
        
        this.chapters.push(chapter);
        this.displayChapters();
        this.saveStoryData();
        
        if (makeActive) {
            this.loadChapter(chapter.id);
        }
        
        return chapter.id;
    }
    
    loadChapter(chapterId) {
        const chapter = this.chapters.find(c => c.id === chapterId);
        if (!chapter) return;
        
        // Save current state before switching chapters
        if (this.currentChapter) {
            this.saveCurrentChapter();
        }
        
        this.currentChapter = chapter;
        
        // Update UI
        document.getElementById('chapterTitle').value = chapter.title;
        document.getElementById('chapterTags').value = chapter.tags;
        document.getElementById('textEditor').innerHTML = chapter.content;
        
        // Update active chapter in sidebar
        document.querySelectorAll('.chapter-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-chapter-id="${chapterId}"]`)?.classList.add('active');
        
        // Clear undo/redo stacks when switching chapters
        this.undoStack = [];
        this.redoStack = [];
        this.updateUndoRedoButtons();
        
        this.updateWordCount();
    }
    
    saveCurrentChapter() {
        if (!this.currentChapter) return;
        
        const editor = document.getElementById('textEditor');
        const title = document.getElementById('chapterTitle').value;
        const tags = document.getElementById('chapterTags').value;
        
        this.currentChapter.title = title || `Chapter ${this.chapters.indexOf(this.currentChapter) + 1}`;
        this.currentChapter.content = editor.innerHTML;
        this.currentChapter.tags = tags;
        this.currentChapter.lastModified = new Date().toISOString();
        
        // Update word count
        const text = editor.textContent || editor.innerText || '';
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        this.currentChapter.wordCount = words.length;
    }
    
    updateChapterInList() {
        if (!this.currentChapter) return;
        
        const chapterElement = document.querySelector(`[data-chapter-id="${this.currentChapter.id}"]`);
        if (chapterElement) {
            const titleElement = chapterElement.querySelector('h4');
            if (titleElement) {
                titleElement.textContent = this.currentChapter.title;
            }
        }
    }
    
    deleteChapter(chapterId) {
        if (this.chapters.length <= 1) {
            alert('You must have at least one chapter.');
            return;
        }
        
        if (confirm('Are you sure you want to delete this chapter? This action cannot be undone.')) {
            this.chapters = this.chapters.filter(c => c.id !== chapterId);
            
            if (this.currentChapter && this.currentChapter.id === chapterId) {
                this.loadChapter(this.chapters[0].id);
            }
            
            this.displayChapters();
            this.saveStoryData();
        }
    }
    
    displayChapters() {
        const container = document.getElementById('chapterList');
        
        container.innerHTML = this.chapters.map((chapter, index) => `
            <div class="chapter-item" 
                 data-chapter-id="${chapter.id}" 
                 data-chapter-index="${index}"
                 draggable="true"
                 onclick="storyEditor.loadChapter('${chapter.id}')">
                <div class="drag-handle">⋮⋮</div>
                <div class="chapter-content">
                    <h4>${chapter.title}</h4>
                    <div class="chapter-info">
                        ${chapter.wordCount} words • ${new Date(chapter.lastModified).toLocaleDateString()}
                        <button onclick="event.stopPropagation(); storyEditor.deleteChapter('${chapter.id}')" class="delete-btn-small">🗑️</button>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add drag and drop event listeners
        this.setupChapterDragAndDrop();
    }
    
    displayReferences() {
        const characterRefs = document.getElementById('characterRefs');
        const locationRefs = document.getElementById('locationRefs');
        
        // Display character references
        characterRefs.innerHTML = this.references.characters.map(char => 
            `<span class="ref-tag" onclick="storyEditor.insertReference('${char.name}')" title="Click to insert '${char.name}' into your story">${char.name}</span>`
        ).join('');
        
        // Display location references
        locationRefs.innerHTML = this.references.locations.map(loc => 
            `<span class="ref-tag" onclick="storyEditor.insertReference('${loc.name}')" title="Click to insert '${loc.name}' into your story">${loc.name}</span>`
        ).join('');
    }
    
    insertReference(name) {
        const editor = document.getElementById('textEditor');
        
        // Focus the editor first to ensure it's the active element
        editor.focus();
        
        const selection = window.getSelection();
        let range;
        
        // Get or create a range in the editor
        if (selection.rangeCount > 0 && editor.contains(selection.getRangeAt(0).commonAncestorContainer)) {
            range = selection.getRangeAt(0);
        } else {
            // If no selection in editor, place at the end
            range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false); // Collapse to end
        }
        
        // Create the reference span
        const span = document.createElement('span');
        span.style.backgroundColor = '#f9a749';
        span.style.padding = '2px 4px';
        span.style.borderRadius = '3px';
        span.style.fontWeight = 'bold';
        span.style.color = '#2d3436';
        span.textContent = name;
        
        // Add a space after the reference for easier editing
        const spaceNode = document.createTextNode(' ');
        
        // Insert the reference and space
        range.deleteContents();
        range.insertNode(spaceNode);
        range.insertNode(span);
        
        // Move cursor after the inserted content
        range.setStartAfter(spaceNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        
        this.saveCurrentChapter();
        this.updateWordCount();
    }
    
    formatText(command) {
        this.saveStateForUndo();
        document.execCommand(command, false, null);
        this.saveCurrentChapter();
    }
    
    addBranch() {
        document.getElementById('branchModal').classList.add('show');
    }
    
    addChoice() {
        this.insertChoiceBlock();
    }
    
    insertChoiceBlock() {
        this.saveStateForUndo();
        
        const editor = document.getElementById('textEditor');
        const selection = window.getSelection();
        
        const choiceDiv = document.createElement('div');
        choiceDiv.className = 'story-branch';
        choiceDiv.innerHTML = `
            <div class="branch-title">Player Choice</div>
            <div class="branch-choices">
                <div class="choice-item">
                    <div class="choice-text">Option 1:</div>
                    <div class="choice-outcome">Describe the outcome...</div>
                </div>
                <div class="choice-item">
                    <div class="choice-text">Option 2:</div>
                    <div class="choice-outcome">Describe the outcome...</div>
                </div>
            </div>
        `;
        
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.insertNode(choiceDiv);
        } else {
            editor.appendChild(choiceDiv);
        }
        
        this.saveCurrentChapter();
    }
    
    insertBranch() {
        this.saveStateForUndo();
        
        const title = document.getElementById('branchTitle').value;
        const description = document.getElementById('branchDescription').value;
        const choices = this.collectChoicesFromModal();
        
        const editor = document.getElementById('textEditor');
        const selection = window.getSelection();
        
        const branchDiv = document.createElement('div');
        branchDiv.className = 'story-branch';
        
        let choicesHTML = choices.map(choice => `
            <div class="choice-item">
                <div class="choice-text">${choice.text}</div>
                <div class="choice-outcome">${choice.outcome}</div>
            </div>
        `).join('');
        
        branchDiv.innerHTML = `
            <div class="branch-title">${title}</div>
            <div style="margin: 0.5rem 0; font-style: italic;">${description}</div>
            <div class="branch-choices">${choicesHTML}</div>
        `;
        
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.insertNode(branchDiv);
        } else {
            editor.appendChild(branchDiv);
        }
        
        this.closeBranchModal();
        this.saveCurrentChapter();
    }
    
    collectChoicesFromModal() {
        const choiceItems = document.querySelectorAll('#choicesList .choice-item');
        const choices = [];
        
        choiceItems.forEach(item => {
            const text = item.querySelector('.choice-input').value;
            const outcome = item.querySelector('.choice-outcome').value;
            if (text.trim()) {
                choices.push({ text, outcome });
            }
        });
        
        return choices;
    }
    
    addNote() {
        document.getElementById('noteModal').classList.add('show');
    }
    
    insertNote() {
        this.saveStateForUndo();
        
        const type = document.getElementById('noteType').value;
        const content = document.getElementById('noteContent').value;
        
        const typeLabels = {
            dev: 'DEVELOPMENT NOTE',
            idea: 'ALTERNATIVE IDEA',
            reminder: 'REMINDER',
            research: 'RESEARCH NEEDED'
        };
        
        const editor = document.getElementById('textEditor');
        const selection = window.getSelection();
        
        const noteDiv = document.createElement('div');
        noteDiv.className = 'story-note';
        noteDiv.innerHTML = `
            <div class="note-type">${typeLabels[type]}</div>
            <div class="note-content">${content}</div>
        `;
        
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.insertNode(noteDiv);
        } else {
            editor.appendChild(noteDiv);
        }
        
        this.closeNoteModal();
        this.saveCurrentChapter();
    }
    
    saveStory() {
        this.saveCurrentChapter();
        this.saveStoryData();
        
        // Visual feedback
        const saveBtn = document.querySelector('[onclick="saveStory()"]');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '✅ Saved';
        setTimeout(() => {
            saveBtn.textContent = originalText;
        }, 2000);
    }
    
    saveStoryData() {
        this.saveCurrentChapter();
        const data = {
            chapters: this.chapters,
            lastSaved: new Date().toISOString()
        };
        localStorage.setItem('summersFallStory', JSON.stringify(data));
    }
    
    closeBranchModal() {
        document.getElementById('branchModal').classList.remove('show');
        document.getElementById('branchForm').reset();
        this.resetChoicesModal();
    }
    
    closeNoteModal() {
        document.getElementById('noteModal').classList.remove('show');
        document.getElementById('noteForm').reset();
    }
    
    resetChoicesModal() {
        const choicesList = document.getElementById('choicesList');
        choicesList.innerHTML = `
            <div class="choice-item">
                <input type="text" placeholder="Choice 1" class="choice-input">
                <textarea placeholder="Outcome..." class="choice-outcome"></textarea>
            </div>
            <div class="choice-item">
                <input type="text" placeholder="Choice 2" class="choice-input">
                <textarea placeholder="Outcome..." class="choice-outcome"></textarea>
            </div>
        `;
    }
}

// Global functions for HTML onclick handlers
let storyEditor;

function addChapter() {
    storyEditor.addChapter();
}

function formatText(command) {
    storyEditor.formatText(command);
}

function addBranch() {
    storyEditor.addBranch();
}

function addChoice() {
    storyEditor.addChoice();
}

function addNote() {
    storyEditor.addNote();
}

function saveStory() {
    storyEditor.saveStory();
}

function undoAction() {
    storyEditor.undo();
}

function redoAction() {
    storyEditor.redo();
}

function toggleReferences() {
    const panel = document.getElementById('referencesPanel');
    panel.classList.toggle('hidden');
}

function addChoiceToModal() {
    const choicesList = document.getElementById('choicesList');
    const choiceCount = choicesList.children.length + 1;
    
    const choiceDiv = document.createElement('div');
    choiceDiv.className = 'choice-item';
    choiceDiv.innerHTML = `
        <input type="text" placeholder="Choice ${choiceCount}" class="choice-input">
        <textarea placeholder="Outcome..." class="choice-outcome"></textarea>
        <button type="button" onclick="this.parentElement.remove()">Remove</button>
    `;
    
    choicesList.appendChild(choiceDiv);
}

function closeBranchModal() {
    storyEditor.closeBranchModal();
}

function closeNoteModal() {
    storyEditor.closeNoteModal();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    storyEditor = new StoryEditor();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (storyEditor) {
        storyEditor.saveStoryData();
        if (storyEditor.autoSaveInterval) {
            clearInterval(storyEditor.autoSaveInterval);
        }
    }
});
