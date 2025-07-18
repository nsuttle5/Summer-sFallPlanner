// Brainstorm Canvas JavaScript
class BrainstormCanvas {
    constructor() {
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.currentTool = 'text';
        this.currentColor = '#3a5a9a';
        this.brushSize = 3;
        
        // Debounced save system
        this.saveTimeout = null;
        this.pendingSave = false;
        
        this.elements = {
            texts: [],
            stickies: [],
            arrows: [],
            drawings: []
        };
        
        // Undo/Redo system
        this.history = [];
        this.historyStep = -1;
        this.maxHistorySteps = 50;
        
        this.clickPosition = { x: 0, y: 0 };
        this.draggedElement = null;
        this.dragOffset = { x: 0, y: 0 };
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupTools();
        this.loadFromStorage();
        
        // Initialize undo/redo system with initial state
        this.saveState();
    }
    
    setupCanvas() {
        // Set canvas size to container size
        const container = document.querySelector('.canvas-container');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        // Set up drawing context
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.globalAlpha = 0.8;
    }
    
    setupEventListeners() {
        // Simple canvas drawing events
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.currentTool === 'draw') {
                e.preventDefault();
                const pos = this.getMousePos(e);
                this.isDrawing = true;
                this.ctx.beginPath();
                this.ctx.moveTo(pos.x, pos.y);
                this.ctx.strokeStyle = this.currentColor;
                this.ctx.lineWidth = this.brushSize;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDrawing && this.currentTool === 'draw') {
                const pos = this.getMousePos(e);
                this.ctx.lineTo(pos.x, pos.y);
                this.ctx.stroke();
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (this.isDrawing && this.currentTool === 'draw') {
                this.isDrawing = false;
                this.ctx.beginPath();
                // Use debounced save to prevent lag
                this.debouncedSave();
            }
        });
        
        this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
        
        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setTool(btn.dataset.tool);
            });
        });
        
        // Color picker
        document.getElementById('colorPicker').addEventListener('change', (e) => {
            this.currentColor = e.target.value;
        });
        
        // Brush size
        const brushSize = document.getElementById('brushSize');
        brushSize.addEventListener('input', (e) => {
            this.brushSize = e.target.value;
            document.getElementById('brushSizeDisplay').textContent = e.target.value + 'px';
        });
        
        // Action buttons
        document.getElementById('clearCanvas').addEventListener('click', this.clearCanvas.bind(this));
        document.getElementById('undoAction').addEventListener('click', this.undo.bind(this));
        document.getElementById('redoAction').addEventListener('click', this.redo.bind(this));
        document.getElementById('saveCanvas').addEventListener('click', this.saveCanvas.bind(this));
        document.getElementById('loadCanvas').addEventListener('click', this.loadCanvas.bind(this));
        
        // Modal events
        this.setupModalEvents();
        
        // Window resize
        window.addEventListener('resize', () => {
            setTimeout(() => this.setupCanvas(), 100);
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    this.undo();
                } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    this.redo();
                }
            }
        });
    }
    
    setupModalEvents() {
        // Text modal
        const textModal = document.getElementById('textModal');
        const textInput = document.getElementById('textInput');
        
        document.getElementById('addText').addEventListener('click', () => {
            const text = textInput.value.trim();
            if (text) {
                if (this.editingElement) {
                    // Update existing element
                    this.updateTextElement(this.editingElement, text);
                    this.editingElement = null;
                    document.getElementById('addText').textContent = 'Add Text';
                } else {
                    // Create new element
                    this.addTextElement(text, this.clickPosition.x, this.clickPosition.y);
                }
                textInput.value = '';
                textModal.classList.add('hidden');
            }
        });
        
        document.getElementById('cancelText').addEventListener('click', () => {
            textModal.classList.add('hidden');
            this.editingElement = null;
            document.getElementById('addText').textContent = 'Add Text';
        });
        
        // Sticky modal
        const stickyModal = document.getElementById('stickyModal');
        const stickyInput = document.getElementById('stickyInput');
        
        document.getElementById('addSticky').addEventListener('click', () => {
            const text = stickyInput.value.trim();
            if (text) {
                const selectedColor = document.querySelector('.color-option.selected').dataset.color;
                if (this.editingElement) {
                    // Update existing element
                    this.updateStickyNote(this.editingElement, text, selectedColor);
                    this.editingElement = null;
                    document.getElementById('addSticky').textContent = 'Add Note';
                } else {
                    // Create new element
                    this.addStickyNote(text, this.clickPosition.x, this.clickPosition.y, selectedColor);
                }
                stickyInput.value = '';
                stickyModal.classList.add('hidden');
            }
        });
        
        document.getElementById('cancelSticky').addEventListener('click', () => {
            stickyModal.classList.add('hidden');
            this.editingElement = null;
            document.getElementById('addSticky').textContent = 'Add Note';
        });
        
        // Sticky color picker
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
            });
        });
    }
    
    setupTools() {
        // Set initial brush size display
        document.getElementById('brushSizeDisplay').textContent = this.brushSize + 'px';
    }
    
    setTool(tool) {
        // Reset drawing state when changing tools
        if (this.isDrawing) {
            this.isDrawing = false;
            this.ctx.beginPath();
        }
        
        this.currentTool = tool;
        
        // Update active button
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
        
        // Change cursor
        switch(tool) {
            case 'draw':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'text':
            case 'sticky':
                this.canvas.style.cursor = 'text';
                break;
            default:
                this.canvas.style.cursor = 'default';
        }
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }
    
    getTouchPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.touches[0].clientX - rect.left) * scaleX,
            y: (e.touches[0].clientY - rect.top) * scaleY
        };
    }
    
    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        
        if (this.currentTool === 'draw') {
            e.preventDefault();
            this.isDrawing = true;
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
            this.ctx.strokeStyle = this.currentColor;
            this.ctx.lineWidth = this.brushSize;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
        }
    }
    
    handleMouseMove(e) {
        if (!this.isDrawing || this.currentTool !== 'draw') return;
        
        // Check if mouse is over canvas
        const rect = this.canvas.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || 
            e.clientY < rect.top || e.clientY > rect.bottom) {
            return; // Don't draw if mouse is outside canvas
        }
        
        const pos = this.getMousePos(e);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
    }
    
    handleMouseUp(e) {
        if (this.currentTool === 'draw' && this.isDrawing) {
            this.isDrawing = false;
            this.ctx.beginPath();
            this.saveDrawing();
            this.saveState();
        } else if (this.isDrawing) {
            // Failsafe: reset drawing state even if tool changed
            this.isDrawing = false;
            this.ctx.beginPath();
        }
    }
    
    handleCanvasClick(e) {
        // Don't handle clicks when drawing tool is active
        if (this.currentTool === 'draw') return;
        
        const pos = this.getMousePos(e);
        this.clickPosition = pos;
        
        // Safety check: if draw tool is selected but we're in a bad state, reset
        if (this.currentTool === 'draw' && this.isDrawing) {
            this.resetDrawingState();
            return;
        }
        
        switch(this.currentTool) {
            case 'text':
                document.getElementById('textModal').classList.remove('hidden');
                document.getElementById('textInput').focus();
                break;
            case 'sticky':
                document.getElementById('stickyModal').classList.remove('hidden');
                document.getElementById('stickyInput').focus();
                break;
        }
    }
    
    // Touch event handlers
    handleTouchStart(e) {
        e.preventDefault();
        const pos = this.getTouchPos(e);
        
        if (this.currentTool === 'draw') {
            this.isDrawing = true;
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
            this.ctx.strokeStyle = this.currentColor;
            this.ctx.lineWidth = this.brushSize;
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (!this.isDrawing || this.currentTool !== 'draw') return;
        
        const pos = this.getTouchPos(e);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        if (this.currentTool === 'draw' && this.isDrawing) {
            this.isDrawing = false;
            this.ctx.beginPath();
            this.saveDrawing();
            this.saveState();
        }
    }
    
    addTextElement(text, x, y) {
        const fontSize = document.getElementById('fontSize').value;
        const isBold = document.getElementById('boldText').checked;
        const isItalic = document.getElementById('italicText').checked;
        
        const textElement = document.createElement('div');
        textElement.className = 'text-element';
        textElement.textContent = text;
        textElement.style.left = x + 'px';
        textElement.style.top = y + 'px';
        textElement.style.fontSize = fontSize + 'px';
        textElement.style.fontWeight = isBold ? 'bold' : 'normal';
        textElement.style.fontStyle = isItalic ? 'italic' : 'normal';
        textElement.style.color = this.currentColor;
        
        this.makeDraggable(textElement);
        document.getElementById('textElements').appendChild(textElement);
        
        this.elements.texts.push({
            text, x, y, fontSize, isBold, isItalic, color: this.currentColor
        });
        
        this.saveToStorage();
        this.saveState();
    }
    
    addStickyNote(text, x, y, color) {
        const stickyNote = document.createElement('div');
        stickyNote.className = 'sticky-note';
        stickyNote.textContent = text;
        stickyNote.style.left = x + 'px';
        stickyNote.style.top = y + 'px';
        stickyNote.style.backgroundColor = color;
        
        this.makeDraggable(stickyNote);
        document.getElementById('stickyNotes').appendChild(stickyNote);
        
        this.elements.stickies.push({
            text, x, y, color
        });
        
        this.saveToStorage();
        this.saveState();
    }
    
    makeDraggable(element) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(element.style.left) || 0;
            startTop = parseInt(element.style.top) || 0;
            element.style.zIndex = 1000;
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            element.style.left = (startLeft + deltaX) + 'px';
            element.style.top = (startTop + deltaY) + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.zIndex = '';
                this.saveToStorage();
                this.saveState();
            }
        });
        
        // Click to edit text elements
        element.addEventListener('click', (e) => {
            if (!isDragging && (element.classList.contains('text-element') || element.classList.contains('sticky-note'))) {
                e.stopPropagation();
                this.editElement(element);
            }
        });
        
        // Add delete button on hover
        this.addDeleteButton(element);
    }
    
    saveDrawing() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.elements.drawings.push(imageData);
        this.saveToStorage();
    }
    
    clearCanvas() {
        this.showClearConfirmation();
    }
    
    showClearConfirmation() {
        const confirmModal = document.createElement('div');
        confirmModal.className = 'confirm-modal';
        confirmModal.innerHTML = `
            <div class="confirm-content">
                <h3>Clear Canvas</h3>
                <p>Are you sure you want to clear the entire canvas?<br><strong>This action can be undone with Ctrl+Z.</strong></p>
                <div class="confirm-actions">
                    <button class="confirm-cancel">Cancel</button>
                    <button class="confirm-delete">Clear Canvas</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(confirmModal);
        
        confirmModal.querySelector('.confirm-delete').addEventListener('click', () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            document.getElementById('textElements').innerHTML = '';
            document.getElementById('stickyNotes').innerHTML = '';
            document.getElementById('arrows').innerHTML = '';
            
            this.elements = {
                texts: [],
                stickies: [],
                arrows: [],
                drawings: []
            };
            
            this.saveToStorage();
            this.saveState();
            confirmModal.remove();
        });
        
        confirmModal.querySelector('.confirm-cancel').addEventListener('click', () => {
            confirmModal.remove();
        });
        
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) {
                confirmModal.remove();
            }
        });
    }
    
    saveCanvas() {
        // Save as image
        const link = document.createElement('a');
        link.download = 'character-brainstorm-' + new Date().toISOString().slice(0, 10) + '.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }
    
    loadCanvas() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                        this.ctx.drawImage(img, 0, 0);
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    }
    
    saveToStorage() {
        // Save elements to localStorage
        const data = {
            elements: this.elements,
            canvasData: this.canvas.toDataURL()
        };
        localStorage.setItem('brainstormCanvas', JSON.stringify(data));
    }
    
    loadFromStorage() {
        const saved = localStorage.getItem('brainstormCanvas');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                
                // Restore canvas drawing
                if (data.canvasData) {
                    const img = new Image();
                    img.onload = () => {
                        this.ctx.drawImage(img, 0, 0);
                    };
                    img.src = data.canvasData;
                }
                
                // Restore elements
                if (data.elements) {
                    this.elements = data.elements;
                    this.restoreElements();
                }
            } catch (e) {
                // Error loading saved data - start fresh
                this.elements = { textElements: [], stickyElements: [], drawings: [] };
            }
        }
    }
    
    restoreElements() {
        // Restore text elements
        this.elements.texts.forEach(textData => {
            this.addTextElement(textData.text, textData.x, textData.y);
        });
        
        // Restore sticky notes
        this.elements.stickies.forEach(stickyData => {
            this.addStickyNote(stickyData.text, stickyData.x, stickyData.y, stickyData.color);
        });
    }
    
    editElement(element) {
        if (element.classList.contains('text-element')) {
            this.editTextElement(element);
        } else if (element.classList.contains('sticky-note')) {
            this.editStickyNote(element);
        }
    }
    
    editTextElement(element) {
        const currentText = element.textContent;
        const currentColor = element.style.color;
        const currentFontSize = parseInt(element.style.fontSize);
        const isBold = element.style.fontWeight === 'bold';
        const isItalic = element.style.fontStyle === 'italic';
        
        // Populate modal with current values
        document.getElementById('textInput').value = currentText;
        document.getElementById('colorPicker').value = this.rgbToHex(currentColor) || this.currentColor;
        document.getElementById('fontSize').value = currentFontSize || 18;
        document.getElementById('boldText').checked = isBold;
        document.getElementById('italicText').checked = isItalic;
        
        // Show modal
        const textModal = document.getElementById('textModal');
        textModal.classList.remove('hidden');
        document.getElementById('textInput').focus();
        
        // Store reference to element being edited
        this.editingElement = element;
        
        // Update button text
        document.getElementById('addText').textContent = 'Update Text';
    }
    
    editStickyNote(element) {
        const currentText = element.textContent;
        const currentColor = element.style.backgroundColor;
        
        // Populate modal with current values
        document.getElementById('stickyInput').value = currentText;
        
        // Select the matching color option
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.color === currentColor) {
                option.classList.add('selected');
            }
        });
        
        // Show modal
        const stickyModal = document.getElementById('stickyModal');
        stickyModal.classList.remove('hidden');
        document.getElementById('stickyInput').focus();
        
        // Store reference to element being edited
        this.editingElement = element;
        
        // Update button text
        document.getElementById('addSticky').textContent = 'Update Note';
    }
    
    updateTextElement(element, text) {
        const fontSize = document.getElementById('fontSize').value;
        const isBold = document.getElementById('boldText').checked;
        const isItalic = document.getElementById('italicText').checked;
        const color = document.getElementById('colorPicker').value;
        
        element.textContent = text;
        element.style.fontSize = fontSize + 'px';
        element.style.fontWeight = isBold ? 'bold' : 'normal';
        element.style.fontStyle = isItalic ? 'italic' : 'normal';
        element.style.color = color;
        
        this.saveToStorage();
        this.saveState();
    }
    
    updateStickyNote(element, text, color) {
        element.textContent = text;
        element.style.backgroundColor = color;
        
        this.saveToStorage();
        this.saveState();
    }
    
    addDeleteButton(element) {
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete element';
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showDeleteConfirmation(element);
        });
        
        element.appendChild(deleteBtn);
        
        // Show/hide delete button on hover
        element.addEventListener('mouseenter', () => {
            deleteBtn.style.opacity = '1';
        });
        
        element.addEventListener('mouseleave', () => {
            deleteBtn.style.opacity = '0';
        });
    }
    
    showDeleteConfirmation(element) {
        // Create custom confirmation modal
        const confirmModal = document.createElement('div');
        confirmModal.className = 'confirm-modal';
        confirmModal.innerHTML = `
            <div class="confirm-content">
                <h3>Delete Element</h3>
                <p>Are you sure you want to delete this ${element.classList.contains('text-element') ? 'text' : 'sticky note'}?</p>
                <div class="confirm-actions">
                    <button class="confirm-cancel">Cancel</button>
                    <button class="confirm-delete">Delete</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(confirmModal);
        
        // Handle confirmation
        confirmModal.querySelector('.confirm-delete').addEventListener('click', () => {
            element.remove();
            this.saveToStorage();
            this.saveState();
            confirmModal.remove();
        });
        
        confirmModal.querySelector('.confirm-cancel').addEventListener('click', () => {
            confirmModal.remove();
        });
        
        // Close on background click
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) {
                confirmModal.remove();
            }
        });
    }
    
    rgbToHex(rgb) {
        if (!rgb || rgb === 'rgb(45, 52, 54)') return '#2d3436';
        
        const result = rgb.match(/\d+/g);
        if (!result) return null;
        
        return "#" + ((1 << 24) + (parseInt(result[0]) << 16) + (parseInt(result[1]) << 8) + parseInt(result[2])).toString(16).slice(1);
    }
    
    saveState() {
        // Remove any redo history when a new action is performed
        this.history = this.history.slice(0, this.historyStep + 1);
        
        // Create a lightweight snapshot - avoid expensive canvas operations
        const state = {
            canvasData: this.getCanvasDataAsync(),
            elements: {
                texts: [...this.elements.texts],
                stickies: [...this.elements.stickies],
                arrows: [...this.elements.arrows],
                drawings: [...this.elements.drawings]
            },
            textElements: this.cloneElementsHTML('textElements'),
            stickyElements: this.cloneElementsHTML('stickyNotes')
        };
        
        this.history.push(state);
        
        // Limit history size
        if (this.history.length > this.maxHistorySteps) {
            this.history.shift();
        } else {
            this.historyStep++;
        }
        
        this.updateUndoRedoButtons();
    }
    
    cloneElementsHTML(containerId) {
        const container = document.getElementById(containerId);
        const elements = [];
        
        Array.from(container.children).forEach(element => {
            elements.push({
                html: element.outerHTML,
                left: element.style.left,
                top: element.style.top
            });
        });
        
        return elements;
    }
    
    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.restoreState(this.history[this.historyStep]);
            this.updateUndoRedoButtons();
        }
    }
    
    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            this.restoreState(this.history[this.historyStep]);
            this.updateUndoRedoButtons();
        }
    }
    
    restoreState(state) {
        // Clear current state
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        document.getElementById('textElements').innerHTML = '';
        document.getElementById('stickyNotes').innerHTML = '';
        
        // Restore canvas
        if (state.canvasData) {
            if (state.canvasData instanceof ImageData) {
                // Fast restore from ImageData
                this.ctx.putImageData(state.canvasData, 0, 0);
            } else {
                // Fallback for data URL format
                const img = new Image();
                img.onload = () => {
                    this.ctx.drawImage(img, 0, 0);
                };
                img.src = state.canvasData;
            }
        }
        
        // Restore elements data
        this.elements = {
            texts: [...state.elements.texts],
            stickies: [...state.elements.stickies],
            arrows: [...state.elements.arrows],
            drawings: [...state.elements.drawings]
        };
        
        // Restore HTML elements
        this.restoreHTMLElements('textElements', state.textElements);
        this.restoreHTMLElements('stickyNotes', state.stickyElements);
    }
    
    restoreHTMLElements(containerId, elementsData) {
        const container = document.getElementById(containerId);
        
        elementsData.forEach(elementData => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = elementData.html;
            const element = tempDiv.firstChild;
            
            // Restore position
            element.style.left = elementData.left;
            element.style.top = elementData.top;
            
            // Re-attach event listeners
            this.makeDraggable(element);
            
            container.appendChild(element);
        });
    }
    
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoAction');
        const redoBtn = document.getElementById('redoAction');
        
        undoBtn.disabled = this.historyStep <= 0;
        redoBtn.disabled = this.historyStep >= this.history.length - 1;
        
        // Update button appearance
        if (undoBtn.disabled) {
            undoBtn.style.opacity = '0.5';
            undoBtn.style.cursor = 'not-allowed';
        } else {
            undoBtn.style.opacity = '1';
            undoBtn.style.cursor = 'pointer';
        }
        
        if (redoBtn.disabled) {
            redoBtn.style.opacity = '0.5';
            redoBtn.style.cursor = 'not-allowed';
        } else {
            redoBtn.style.opacity = '1';
            redoBtn.style.cursor = 'pointer';
        }
    }
    
    // Debounced save system to prevent lag
    debouncedSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.saveTimeout = setTimeout(() => {
            this.performAsyncSave();
        }, 500); // Wait 500ms after user stops drawing
    }
    
    performAsyncSave() {
        if (this.pendingSave) return; // Prevent overlapping saves
        
        this.pendingSave = true;
        
        // Use requestAnimationFrame for optimal timing
        requestAnimationFrame(() => {
            try {
                this.saveState();
                this.pendingSave = false;
            } catch (error) {
                console.warn('Save failed:', error);
                this.pendingSave = false;
            }
        });
    }

    resetDrawingState() {
        this.isDrawing = false;
        this.ctx.beginPath();
        this.canvas.style.cursor = this.currentTool === 'draw' ? 'crosshair' : 
                                   (this.currentTool === 'text' || this.currentTool === 'sticky') ? 'text' : 'default';
    }

    getCanvasDataAsync() {
        // Use ImageData instead of toDataURL for much better performance
        try {
            return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        } catch (error) {
            // Fallback to toDataURL if ImageData fails
            return this.canvas.toDataURL('image/png', 0.8);
        }
    }
}

// Initialize the brainstorm canvas when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new BrainstormCanvas();
});
