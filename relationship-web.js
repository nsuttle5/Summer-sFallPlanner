// Relationship Web Manager
class RelationshipWebManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.nodes = [];
        this.connections = [];
        this.relationships = [];
        this.isDragging = false;
        this.dragNode = null;
        this.dragOffset = { x: 0, y: 0 };
        this.panOffset = { x: 0, y: 0 };
        this.isPanning = false;
        this.lastPanPoint = { x: 0, y: 0 };
        this.scale = 1;
        this.imageCache = new Map(); // Cache for character images
        this.filters = {
            showCharacters: true,
            showLocations: true,
            showLabels: true,
            relationshipType: 'all',
            characterType: 'all'
        };
        
        this.init();
    }

    init() {
        this.canvas = document.getElementById('relationshipCanvas');
        if (!this.canvas) {
            console.error('Canvas not found!');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error('Could not get canvas context!');
            return;
        }
        
        console.log('Canvas initialized:', this.canvas.width, 'x', this.canvas.height);
        
        this.setupCanvas();
        this.loadData();
        this.setupEventListeners();
        this.updateFilters();
        this.generateLayout();
        this.render();
        
        console.log('Relationship web initialization complete');
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        
        // Force the container to have explicit dimensions
        if (!container.offsetWidth || !container.offsetHeight) {
            container.style.width = '100%';
            container.style.height = '600px';
        }
        
        // Get the actual computed size
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Set the actual canvas size in pixels
        this.canvas.width = Math.floor(rect.width * dpr);
        this.canvas.height = Math.floor(rect.height * dpr);
        
        // Scale the canvas back down using CSS
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        // Scale the drawing context to match device pixel ratio
        this.ctx.scale(dpr, dpr);
        
        console.log('Canvas setup:');
        console.log('Container size:', rect.width, 'x', rect.height);
        console.log('Canvas size:', this.canvas.width, 'x', this.canvas.height);
        console.log('Device pixel ratio:', dpr);
        
        // Center the view
        this.panOffset.x = rect.width / 2;
        this.panOffset.y = rect.height / 2;
        
        // Reset scale
        this.scale = 1;
        
        console.log('Pan offset set to:', this.panOffset);
        
        // Draw a test to verify canvas is working
        this.drawCanvasTest();
    }

    drawCanvasTest() {
        this.ctx.save();
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(10, 10, 100, 50);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Canvas Test', 20, 35);
        this.ctx.restore();
        console.log('Canvas test rectangle drawn');
    }

    loadData() {
        // Load characters
        const characters = JSON.parse(localStorage.getItem('summersFallCharacters') || '[]');
        const locations = JSON.parse(localStorage.getItem('summersFallLocations') || '[]');
        this.relationships = JSON.parse(localStorage.getItem('summersFallRelationships') || '[]');

        console.log('=== RELATIONSHIP WEB DEBUG ===');
        console.log('Characters loaded:', characters.length);
        console.log('Locations loaded:', locations.length);
        console.log('Relationships loaded:', this.relationships.length);
        
        if (this.relationships.length > 0) {
            console.log('Sample relationship:', this.relationships[0]);
        }

        this.nodes = [];

        // Add character nodes
        characters.forEach((character, index) => {
            const nodeId = `character_${character.id}`;
            // Position nodes in a tight circle around center
            const angle = (index / characters.length) * 2 * Math.PI;
            const radius = 80; // Much smaller radius
            this.nodes.push({
                id: nodeId,
                type: 'character',
                data: character,
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                radius: this.getNodeRadius(character, 'character'),
                color: this.getNodeColor(character, 'character')
            });
        });

        // Add location nodes
        locations.forEach((location, index) => {
            const nodeId = `location_${location.id}`;
            // Position locations in slightly outer circle
            const angle = (index / locations.length) * 2 * Math.PI;
            const radius = 120; // Much smaller radius
            this.nodes.push({
                id: nodeId,
                type: 'location',
                data: location,
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                radius: 25,
                color: '#27ae60'
            });
        });

        console.log('Total nodes created:', this.nodes.length);
        console.log('Node IDs:', this.nodes.map(n => n.id));

        // Generate connections from relationships
        this.generateConnections();
        this.updateStatistics();
    }

    getNodeRadius(data, type) {
        if (type === 'character') {
            switch (data.characterType) {
                case 'main': return 30;
                case 'side': return 25;
                case 'background': return 20;
                default: return 25;
            }
        }
        return 25;
    }

    getNodeColor(data, type) {
        if (type === 'character') {
            switch (data.characterType) {
                case 'main': return '#f9a749';
                case 'side': return '#456dc3';
                case 'background': return '#879a9a';
                default: return '#456dc3';
            }
        }
        return '#27ae60';
    }

    generateConnections() {
        this.connections = [];
        
        console.log('Generating connections from relationships:', this.relationships);
        console.log('Available nodes:', this.nodes.map(n => n.id));
        
        this.relationships.forEach(rel => {
            console.log('Processing relationship:', rel);
            const sourceNode = this.nodes.find(n => n.id === rel.sourceId);
            const targetNode = this.nodes.find(n => n.id === rel.targetId);
            
            console.log('Source node found:', sourceNode?.id, 'Target node found:', targetNode?.id);
            
            if (sourceNode && targetNode) {
                const connection = {
                    source: sourceNode,
                    target: targetNode,
                    type: rel.type,
                    description: rel.description,
                    strength: rel.strength || 'normal',
                    color: this.getConnectionColor(rel.type),
                    width: this.getConnectionWidth(rel.strength || 'normal')
                };
                this.connections.push(connection);
                console.log('Connection created:', connection);
            } else {
                console.warn('Could not create connection - missing nodes:', {
                    sourceId: rel.sourceId,
                    targetId: rel.targetId,
                    sourceFound: !!sourceNode,
                    targetFound: !!targetNode
                });
            }
        });
        
        console.log('Total connections created:', this.connections.length);
    }

    getConnectionColor(type) {
        const colors = {
            family: '#e74c3c',
            friend: '#3498db',
            enemy: '#8e44ad',
            romantic: '#e91e63',
            professional: '#34495e',
            lives_at: '#27ae60',
            works_at: '#f39c12',
            frequents: '#9b59b6',
            owns: '#16a085'
        };
        return colors[type] || '#646c7d';
    }

    getConnectionWidth(strength) {
        switch (strength) {
            case 'weak': return 1;
            case 'normal': return 2;
            case 'strong': return 3;
            default: return 2;
        }
    }

    generateLayout() {
        if (this.nodes.length === 0) return;

        // Skip force-directed layout for now - use simple positioning
        console.log('Using simple circular layout');
        
        // Automatically center and scale the view after layout
        setTimeout(() => {
            this.centerWeb();
        }, 100);
    }

    setupEventListeners() {
        // Canvas mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));

        // Control event listeners
        document.getElementById('showCharacters').addEventListener('change', (e) => {
            this.filters.showCharacters = e.target.checked;
            this.render();
        });

        document.getElementById('showLocations').addEventListener('change', (e) => {
            this.filters.showLocations = e.target.checked;
            this.render();
        });

        document.getElementById('showLabels').addEventListener('change', (e) => {
            this.filters.showLabels = e.target.checked;
            this.render();
        });

        document.getElementById('relationshipTypeFilter').addEventListener('change', (e) => {
            this.filters.relationshipType = e.target.value;
            this.render();
        });

        document.getElementById('characterTypeFilter').addEventListener('change', (e) => {
            this.filters.characterType = e.target.value;
            this.render();
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.render();
        });
    }

    getMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - this.panOffset.x) / this.scale,
            y: (e.clientY - rect.top - this.panOffset.y) / this.scale
        };
    }

    getNodeAt(x, y) {
        return this.nodes.find(node => {
            if (!this.shouldShowNode(node)) return false;
            const dx = x - node.x;
            const dy = y - node.y;
            return Math.sqrt(dx * dx + dy * dy) <= node.radius;
        });
    }

    handleMouseDown(e) {
        const pos = this.getMousePosition(e);
        const node = this.getNodeAt(pos.x, pos.y);
        
        if (node) {
            this.isDragging = true;
            this.dragNode = node;
            this.dragStarted = false; // Track if we actually started dragging
            this.dragOffset = {
                x: pos.x - node.x,
                y: pos.y - node.y
            };
        } else {
            this.isPanning = true;
            this.lastPanPoint = { x: e.clientX, y: e.clientY };
        }
    }

    handleMouseMove(e) {
        if (this.isDragging && this.dragNode) {
            this.dragStarted = true; // Mark that we've started dragging
            const pos = this.getMousePosition(e);
            this.dragNode.x = pos.x - this.dragOffset.x;
            this.dragNode.y = pos.y - this.dragOffset.y;
            this.render();
        } else if (this.isPanning) {
            const dx = e.clientX - this.lastPanPoint.x;
            const dy = e.clientY - this.lastPanPoint.y;
            
            this.panOffset.x += dx;
            this.panOffset.y += dy;
            
            this.lastPanPoint = { x: e.clientX, y: e.clientY };
            this.render();
        }
    }

    handleMouseUp(e) {
        this.isDragging = false;
        this.dragNode = null;
        this.isPanning = false;
    }

    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.scale = Math.max(0.1, Math.min(3, this.scale * delta));
        this.render();
    }

    handleClick(e) {
        // Removed - using double click for node details instead
    }

    handleDoubleClick(e) {
        // Only show details if we didn't start dragging
        if (!this.dragStarted) {
            const pos = this.getMousePosition(e);
            const node = this.getNodeAt(pos.x, pos.y);
            
            if (node) {
                this.showNodeDetails(node);
            }
        }
        this.dragStarted = false; // Reset for next interaction
    }

    shouldShowNode(node) {
        if (node.type === 'character' && !this.filters.showCharacters) return false;
        if (node.type === 'location' && !this.filters.showLocations) return false;
        
        if (this.filters.characterType !== 'all' && node.type === 'character') {
            if (node.data.characterType !== this.filters.characterType) return false;
        }
        
        return true;
    }

    shouldShowConnection(connection) {
        if (!this.shouldShowNode(connection.source) || !this.shouldShowNode(connection.target)) {
            return false;
        }
        
        if (this.filters.relationshipType !== 'all') {
            return connection.type === this.filters.relationshipType;
        }
        
        return true;
    }

    render() {
        if (!this.ctx) {
            console.error('No canvas context available for rendering');
            return;
        }
        
        console.log('Starting render...');
        
        // Get canvas dimensions (accounting for device pixel ratio)
        const rect = this.canvas.getBoundingClientRect();
        
        // Clear canvas
        this.ctx.clearRect(0, 0, rect.width, rect.height);
        
        // Apply transformations
        this.ctx.save();
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.scale, this.scale);

        // Count what we're about to draw
        const visibleConnections = this.connections.filter(conn => this.shouldShowConnection(conn));
        const visibleNodes = this.nodes.filter(node => this.shouldShowNode(node));
        
        console.log(`Rendering: ${visibleConnections.length} connections, ${visibleNodes.length} nodes`);
        console.log('Canvas size:', rect.width, 'x', rect.height);
        console.log('Pan offset:', this.panOffset, 'Scale:', this.scale);

        // Draw connections first (behind nodes)
        visibleConnections.forEach((connection, index) => {
            console.log(`Drawing connection ${index + 1}/${visibleConnections.length}`);
            this.drawConnection(connection);
        });

        // Draw nodes on top
        visibleNodes.forEach((node, index) => {
            console.log(`Drawing node ${index + 1}/${visibleNodes.length}`);
            this.drawNode(node);
        });

        this.ctx.restore();
        
        // Update empty state
        const hasVisibleNodes = visibleNodes.length > 0;
        document.getElementById('webEmptyState').style.display = hasVisibleNodes ? 'none' : 'block';
        
        console.log('Render complete');
    }

    drawConnection(connection) {
        const { source, target } = connection;
        
        console.log(`Drawing connection from (${source.x}, ${source.y}) to (${target.x}, ${target.y})`);
        
        // Simple line drawing
        this.ctx.save();
        this.ctx.strokeStyle = connection.color;
        this.ctx.lineWidth = Math.max(2, connection.width); // Ensure minimum width
        this.ctx.globalAlpha = 0.8;
        
        // Set line style based on relationship type
        if (connection.type === 'enemy') {
            this.ctx.setLineDash([5, 5]);
        } else if (connection.type === 'frequents') {
            this.ctx.setLineDash([3, 3]);
        } else {
            this.ctx.setLineDash([]);
        }
        
        this.ctx.beginPath();
        this.ctx.moveTo(source.x, source.y);
        this.ctx.lineTo(target.x, target.y);
        this.ctx.stroke();
        
        // Draw connection label at midpoint
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        
        this.ctx.fillStyle = connection.color;
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.globalAlpha = 1;
        
        // Add white background for text
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeText(connection.type, midX, midY);
        this.ctx.fillText(connection.type, midX, midY);
        
        this.ctx.restore();
        
        console.log(`Drew connection: ${source.data.name || source.data.title} → ${target.data.name || target.data.title} (${connection.type})`);
    }

    drawNode(node) {
        console.log(`Drawing node: ${node.data.name || node.data.title} at (${node.x}, ${node.y})`);
        
        // Draw node circle
        this.ctx.save();
        this.ctx.fillStyle = node.color;
        this.ctx.strokeStyle = this.getDarkerColor(node.color);
        this.ctx.lineWidth = 3;
        
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw image or icon
        if (node.type === 'character' && node.data.imageUrl) {
            this.drawCharacterImage(node);
        } else {
            // Draw fallback icon
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = `bold ${Math.max(12, node.radius * 0.6)}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            const icon = node.type === 'character' ? '👤' : '📍';
            this.ctx.fillText(icon, node.x, node.y);
        }

        // Draw label if enabled
        if (this.filters.showLabels) {
            this.ctx.fillStyle = '#2d3436';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 3;
            
            const name = node.data.name || node.data.title || 'Unknown';
            // Add text outline for better visibility
            this.ctx.strokeText(name, node.x, node.y + node.radius + 8);
            this.ctx.fillText(name, node.x, node.y + node.radius + 8);
        }
        
        this.ctx.restore();
    }

    drawCharacterImage(node) {
        // Create image cache if it doesn't exist
        if (!this.imageCache) {
            this.imageCache = new Map();
        }

        const imageUrl = node.data.imageUrl;
        const cacheKey = `${node.id}_${imageUrl}`;

        // Check if image is already cached
        if (this.imageCache.has(cacheKey)) {
            const cachedImage = this.imageCache.get(cacheKey);
            if (cachedImage.complete && cachedImage.naturalWidth > 0) {
                this.drawImageInCircle(cachedImage, node);
                return;
            }
        }

        // Load image if not cached or failed to load
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Handle CORS if needed
        
        img.onload = () => {
            this.imageCache.set(cacheKey, img);
            // Re-render to show the loaded image
            this.render();
        };
        
        img.onerror = () => {
            console.warn(`Failed to load image for ${node.data.name}: ${imageUrl}`);
            // Remove from cache so we don't keep trying
            this.imageCache.delete(cacheKey);
        };
        
        img.src = imageUrl;
        this.imageCache.set(cacheKey, img);
    }

    drawImageInCircle(image, node) {
        // Save context
        this.ctx.save();
        
        // Create circular clipping path
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, node.radius - 3, 0, 2 * Math.PI); // Slightly smaller than border
        this.ctx.clip();
        
        // Calculate image dimensions to fit in circle while maintaining aspect ratio
        const diameter = (node.radius - 3) * 2;
        const aspectRatio = image.width / image.height;
        
        let drawWidth, drawHeight;
        if (aspectRatio > 1) {
            // Image is wider than tall
            drawHeight = diameter;
            drawWidth = diameter * aspectRatio;
        } else {
            // Image is taller than wide or square
            drawWidth = diameter;
            drawHeight = diameter / aspectRatio;
        }
        
        // Center the image in the circle
        const drawX = node.x - drawWidth / 2;
        const drawY = node.y - drawHeight / 2;
        
        // Draw the image
        this.ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
        
        // Restore context
        this.ctx.restore();
    }

    getDarkerColor(color) {
        // Simple color darkening
        const colors = {
            '#f9a749': '#e67e22',
            '#456dc3': '#2c3e50',
            '#879a9a': '#34495e',
            '#27ae60': '#16a085'
        };
        return colors[color] || '#2c3e50';
    }

    updateStatistics() {
        const characterCount = this.nodes.filter(n => n.type === 'character').length;
        const locationCount = this.nodes.filter(n => n.type === 'location').length;
        const connectionCount = this.connections.length;

        document.getElementById('characterCount').textContent = characterCount;
        document.getElementById('locationCount').textContent = locationCount;
        document.getElementById('connectionCount').textContent = connectionCount;
    }

    resetWebLayout() {
        this.generateLayout();
        this.render();
    }

    centerWeb() {
        if (this.nodes.length === 0) {
            console.log('No nodes to center');
            return;
        }
        
        const bounds = this.getNodeBounds();
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        
        console.log('Node bounds:', bounds);
        console.log('Calculated center:', centerX, centerY);
        
        // Get canvas dimensions (accounting for device pixel ratio)
        const rect = this.canvas.getBoundingClientRect();
        
        // Calculate scale to fit all nodes with padding
        const boundsWidth = bounds.maxX - bounds.minX + 200; // Add padding
        const boundsHeight = bounds.maxY - bounds.minY + 200;
        const scaleX = rect.width / boundsWidth;
        const scaleY = rect.height / boundsHeight;
        const newScale = Math.min(scaleX, scaleY, 2); // Allow scaling up to 2x
        
        this.scale = Math.max(0.3, newScale); // Minimum scale of 0.3x
        this.panOffset.x = rect.width / 2 - centerX * this.scale;
        this.panOffset.y = rect.height / 2 - centerY * this.scale;
        
        console.log('Canvas dimensions:', rect.width, 'x', rect.height);
        console.log('New scale:', this.scale);
        console.log('New pan offset:', this.panOffset);
        
        this.render();
    }

    getNodeBounds() {
        if (this.nodes.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        
        let minX = this.nodes[0].x;
        let maxX = this.nodes[0].x;
        let minY = this.nodes[0].y;
        let maxY = this.nodes[0].y;
        
        this.nodes.forEach(node => {
            minX = Math.min(minX, node.x);
            maxX = Math.max(maxX, node.x);
            minY = Math.min(minY, node.y);
            maxY = Math.max(maxY, node.y);
        });
        
        return { minX, maxX, minY, maxY };
    }

    showNodeDetails(node) {
        const modal = document.getElementById('nodeDetailsModal');
        const title = document.getElementById('nodeDetailsTitle');
        const body = document.getElementById('nodeDetailsBody');
        
        title.textContent = `${node.type === 'character' ? 'Character' : 'Location'}: ${node.data.name || node.data.title}`;
        
        let html = '';
        if (node.type === 'character') {
            html = `
                <div class="node-detail-section">
                    <h4>Character Information</h4>
                    <p><strong>Name:</strong> ${node.data.name || 'Unknown'}</p>
                    <p><strong>Type:</strong> ${node.data.characterType || 'Unknown'}</p>
                    <p><strong>Age:</strong> ${node.data.age || 'Unknown'}</p>
                    <p><strong>Occupation:</strong> ${node.data.occupation || 'Unknown'}</p>
                    ${node.data.notes ? `<p><strong>Notes:</strong> ${node.data.notes}</p>` : ''}
                </div>
            `;
        } else {
            html = `
                <div class="node-detail-section">
                    <h4>Location Information</h4>
                    <p><strong>Name:</strong> ${node.data.title || 'Unknown'}</p>
                    <p><strong>Coordinates:</strong> ${node.data.coordinates || 'Unknown'}</p>
                    <p><strong>Description:</strong> ${node.data.description || 'No description'}</p>
                </div>
            `;
        }
        
        // Show connections
        const nodeConnections = this.connections.filter(c => 
            c.source.id === node.id || c.target.id === node.id
        );
        
        if (nodeConnections.length > 0) {
            html += '<div class="node-detail-section"><h4>Relationships</h4><ul>';
            nodeConnections.forEach(conn => {
                const other = conn.source.id === node.id ? conn.target : conn.source;
                const direction = conn.source.id === node.id ? 'to' : 'from';
                html += `<li><strong>${conn.type}</strong> ${direction} ${other.data.name || other.data.title}</li>`;
            });
            html += '</ul></div>';
        }
        
        body.innerHTML = html;
        modal.style.display = 'flex';
    }

    addRelationship(relationship) {
        console.log('Adding relationship:', relationship);
        this.relationships.push(relationship);
        localStorage.setItem('summersFallRelationships', JSON.stringify(this.relationships));
        console.log('Relationships saved. Total count:', this.relationships.length);
        
        // Reload all data to ensure consistency
        this.loadData();
        this.generateLayout();
        this.render();
    }

    updateFilters() {
        // Update filter dropdowns with current data
        this.updateSourceTargetOptions();
    }

    updateSourceTargetOptions() {
        const characters = JSON.parse(localStorage.getItem('summersFallCharacters') || '[]');
        const locations = JSON.parse(localStorage.getItem('summersFallLocations') || '[]');
        
        // This will be called from modal functions
        window.updateSourceOptions = () => {
            const sourceType = document.getElementById('sourceType').value;
            const sourceSelect = document.getElementById('sourceId');
            sourceSelect.innerHTML = '<option value="">Choose...</option>';
            
            if (sourceType === 'character') {
                characters.forEach(char => {
                    sourceSelect.innerHTML += `<option value="character_${char.id}">${char.name}</option>`;
                });
            } else {
                locations.forEach(loc => {
                    sourceSelect.innerHTML += `<option value="location_${loc.id}">${loc.title}</option>`;
                });
            }
        };
        
        window.updateTargetOptions = () => {
            const targetType = document.getElementById('targetType').value;
            const targetSelect = document.getElementById('targetId');
            targetSelect.innerHTML = '<option value="">Choose...</option>';
            
            if (targetType === 'character') {
                characters.forEach(char => {
                    targetSelect.innerHTML += `<option value="character_${char.id}">${char.name}</option>`;
                });
            } else {
                locations.forEach(loc => {
                    targetSelect.innerHTML += `<option value="location_${loc.id}">${loc.title}</option>`;
                });
            }
        };
    }
}

// Initialize the relationship web
let relationshipWeb;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Relationship Web...');
    relationshipWeb = new RelationshipWebManager();
    console.log('Relationship Web initialized:', relationshipWeb);
});

// Modal functions
function openRelationshipModal() {
    const modal = document.getElementById('relationshipModal');
    document.getElementById('relationshipModalTitle').textContent = 'Add Relationship';
    document.getElementById('relationshipForm').reset();
    
    // Update options
    updateSourceOptions();
    updateTargetOptions();
    
    modal.style.display = 'flex';
}

function closeRelationshipModal() {
    document.getElementById('relationshipModal').style.display = 'none';
}

function closeNodeDetailsModal() {
    document.getElementById('nodeDetailsModal').style.display = 'none';
}

function saveRelationship() {
    const form = document.getElementById('relationshipForm');
    
    const sourceType = document.getElementById('sourceType').value;
    const targetType = document.getElementById('targetType').value;
    const sourceId = document.getElementById('sourceId').value;
    const targetId = document.getElementById('targetId').value;
    const type = document.getElementById('relationshipType').value;
    const description = document.getElementById('relationshipDescription').value;
    const strength = document.getElementById('connectionStrength').value;
    
    console.log('=== SAVING RELATIONSHIP ===');
    console.log('Source Type:', sourceType);
    console.log('Target Type:', targetType);
    console.log('Source ID:', sourceId);
    console.log('Target ID:', targetId);
    console.log('Type:', type);
    
    if (!sourceType || !targetType || !sourceId || !targetId || !type) {
        alert('Please fill in all required fields.');
        return;
    }
    
    if (sourceId === targetId) {
        alert('Source and target cannot be the same.');
        return;
    }
    
    const relationship = {
        id: Date.now(),
        sourceType,
        targetType,
        sourceId,
        targetId,
        type,
        description,
        strength,
        timestamp: new Date().toISOString()
    };
    
    console.log('Created relationship object:', relationship);
    
    // Check if the nodes exist
    if (relationshipWeb) {
        const sourceNode = relationshipWeb.nodes.find(n => n.id === sourceId);
        const targetNode = relationshipWeb.nodes.find(n => n.id === targetId);
        console.log('Source node found:', !!sourceNode, sourceNode?.data?.name || sourceNode?.data?.title);
        console.log('Target node found:', !!targetNode, targetNode?.data?.name || targetNode?.data?.title);
    }
    
    relationshipWeb.addRelationship(relationship);
    closeRelationshipModal();
}

function resetWebLayout() {
    if (relationshipWeb) {
        relationshipWeb.resetWebLayout();
    }
}

function centerWeb() {
    if (relationshipWeb) {
        relationshipWeb.centerWeb();
    }
}

function fitToView() {
    if (relationshipWeb) {
        // Reset to simple view
        relationshipWeb.scale = 1;
        
        const rect = relationshipWeb.canvas.getBoundingClientRect();
        relationshipWeb.panOffset.x = rect.width / 2;
        relationshipWeb.panOffset.y = rect.height / 2;
        
        console.log('Reset to default view');
        relationshipWeb.render();
        
        // Then center properly
        setTimeout(() => {
            relationshipWeb.centerWeb();
        }, 100);
    }
}

function reloadWebData() {
    if (relationshipWeb) {
        console.log('Reloading web data...');
        relationshipWeb.loadData();
        relationshipWeb.generateLayout();
        relationshipWeb.render();
    }
}

// Debug function to check localStorage data
function debugRelationshipData() {
    console.log('=== DEBUGGING RELATIONSHIP DATA ===');
    
    const relationships = JSON.parse(localStorage.getItem('summersFallRelationships') || '[]');
    const characters = JSON.parse(localStorage.getItem('summersFallCharacters') || '[]');
    const locations = JSON.parse(localStorage.getItem('summersFallLocations') || '[]');
    
    console.log('Raw relationships data:', relationships);
    console.log('Characters data:', characters.map(c => ({id: c.id, name: c.name})));
    console.log('Locations data:', locations.map(l => ({id: l.id, title: l.title})));
    
    // Check each relationship
    relationships.forEach((rel, index) => {
        console.log(`\nRelationship ${index}:`, rel);
        
        // Check if sourceType/targetType exist
        if (!rel.sourceType) console.log(`  Missing sourceType`);
        if (!rel.targetType) console.log(`  Missing targetType`);
        
        // Try to find entities
        const sourceChar = characters.find(c => c.id === rel.sourceId);
        const sourceLoc = locations.find(l => l.id === rel.sourceId);
        const targetChar = characters.find(c => c.id === rel.targetId);
        const targetLoc = locations.find(l => l.id === rel.targetId);
        
        console.log(`  Source found in characters:`, !!sourceChar, sourceChar?.name);
        console.log(`  Source found in locations:`, !!sourceLoc, sourceLoc?.title);
        console.log(`  Target found in characters:`, !!targetChar, targetChar?.name);
        console.log(`  Target found in locations:`, !!targetLoc, targetLoc?.title);
    });
    
    console.log('=== END DEBUG ===');
}

function testRelationship() {
    if (relationshipWeb && relationshipWeb.nodes.length >= 2) {
        const node1 = relationshipWeb.nodes[0];
        const node2 = relationshipWeb.nodes[1];
        
        const testRel = {
            id: Date.now(),
            sourceId: node1.id,
            targetId: node2.id,
            type: 'friend',
            description: 'Test relationship',
            strength: 'normal',
            timestamp: new Date().toISOString()
        };
        
        console.log('Creating test relationship:', testRel);
        relationshipWeb.addRelationship(testRel);
    } else {
        console.log('Need at least 2 nodes to create test relationship');
        console.log('Current nodes:', relationshipWeb ? relationshipWeb.nodes.length : 'No web manager');
    }
}

function testCanvas() {
    if (relationshipWeb && relationshipWeb.ctx) {
        const ctx = relationshipWeb.ctx;
        const canvas = relationshipWeb.canvas;
        
        console.log('Testing canvas drawing...');
        console.log('Canvas size:', canvas.width, 'x', canvas.height);
        
        // Clear and draw test shapes
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw a big red circle in the center
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 50, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TEST', centerX, centerY);
        
        // Draw a blue rectangle
        ctx.fillStyle = 'blue';
        ctx.fillRect(50, 50, 100, 60);
        
        console.log('Test shapes drawn');
    } else {
        console.log('No canvas context available');
    }
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    const relationshipModal = document.getElementById('relationshipModal');
    const nodeModal = document.getElementById('nodeDetailsModal');
    const manageModal = document.getElementById('manageRelationshipsModal');
    
    if (e.target === relationshipModal) {
        closeRelationshipModal();
    }
    if (e.target === nodeModal) {
        closeNodeDetailsModal();
    }
    if (e.target === manageModal) {
        closeManageRelationshipsModal();
    }
});

// Manage Relationships Modal Functions
function showManageRelationshipsModal() {
    populateRelationshipList();
    document.getElementById('manageRelationshipsModal').style.display = 'block';
}

function closeManageRelationshipsModal() {
    document.getElementById('manageRelationshipsModal').style.display = 'none';
}

function populateRelationshipList() {
    const relationships = JSON.parse(localStorage.getItem('summersFallRelationships') || '[]');
    const characters = JSON.parse(localStorage.getItem('summersFallCharacters') || '[]');
    const locations = JSON.parse(localStorage.getItem('summersFallLocations') || '[]');
    
    console.log('Debug - populateRelationshipList:');
    console.log('Relationships found:', relationships.length);
    console.log('Characters found:', characters.length);
    console.log('Locations found:', locations.length);
    console.log('Character IDs:', characters.map(c => c.id));
    console.log('Location IDs:', locations.map(l => l.id));
    console.log('Raw relationships:', relationships);
    
    const listContainer = document.getElementById('relationshipList');
    listContainer.innerHTML = '';
    
    if (relationships.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; color: #636e72; font-style: italic;">No relationships found.</p>';
        return;
    }
    
    let validRelationships = 0;
    let migratedRelationships = false;
    
    relationships.forEach((rel, index) => {
        console.log(`Processing relationship ${index}:`, rel);
        
        // Migration: If sourceType and targetType are missing, determine them
        if (!rel.sourceType || !rel.targetType) {
            console.log('Migrating legacy relationship:', rel);
            
            // Try to find the source entity
            let sourceEntity = characters.find(c => c.id === rel.sourceId);
            if (sourceEntity) {
                rel.sourceType = 'character';
                console.log('Found source as character:', sourceEntity.name);
            } else {
                sourceEntity = locations.find(l => l.id === rel.sourceId);
                if (sourceEntity) {
                    rel.sourceType = 'location';
                    console.log('Found source as location:', sourceEntity.title);
                } else {
                    console.log('Source entity not found for ID:', rel.sourceId);
                }
            }
            
            // Try to find the target entity
            let targetEntity = characters.find(c => c.id === rel.targetId);
            if (targetEntity) {
                rel.targetType = 'character';
                console.log('Found target as character:', targetEntity.name);
            } else {
                targetEntity = locations.find(l => l.id === rel.targetId);
                if (targetEntity) {
                    rel.targetType = 'location';
                    console.log('Found target as location:', targetEntity.title);
                } else {
                    console.log('Target entity not found for ID:', rel.targetId);
                }
            }
            
            migratedRelationships = true;
            console.log('Migrated relationship result:', {
                id: rel.id,
                sourceType: rel.sourceType,
                targetType: rel.targetType,
                sourceId: rel.sourceId,
                targetId: rel.targetId
            });
        }
        
        const sourceEntity = rel.sourceType === 'character' 
            ? characters.find(c => c.id === rel.sourceId)
            : locations.find(l => l.id === rel.sourceId);
        
        const targetEntity = rel.targetType === 'character'
            ? characters.find(c => c.id === rel.targetId)
            : locations.find(l => l.id === rel.targetId);
        
        console.log(`Source entity (${rel.sourceType}):`, sourceEntity);
        console.log(`Target entity (${rel.targetType}):`, targetEntity);
        
        if (!sourceEntity || !targetEntity) {
            console.log(`Skipping relationship ${index} - missing entities`);
            return; // Skip if entities not found
        }
        
        validRelationships++;
        
        const item = document.createElement('div');
        item.className = 'relationship-item';
        item.innerHTML = `
            <input type="checkbox" data-relationship-index="${index}" />
            <div class="relationship-info">
                <div class="relationship-title">
                    ${sourceEntity.name || sourceEntity.title} → ${targetEntity.name || targetEntity.title}
                </div>
                <div class="relationship-details">
                    <span class="relationship-type-badge type-${rel.type}">${rel.type.replace('_', ' ')}</span>
                    ${rel.description ? `<span style="margin-left: 1rem;">${rel.description}</span>` : ''}
                </div>
            </div>
        `;
        
        listContainer.appendChild(item);
    });
    
    // Save migrated relationships back to localStorage
    if (migratedRelationships) {
        console.log('Saving migrated relationships to localStorage');
        localStorage.setItem('summersFallRelationships', JSON.stringify(relationships));
    }
    
    console.log(`Valid relationships displayed: ${validRelationships}`);
    
    if (validRelationships === 0) {
        if (relationships.length > 0) {
            // Show option to clean up orphaned relationships
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <p style="color: #636e72; font-style: italic; margin-bottom: 1rem;">
                        Found ${relationships.length} relationships, but no valid entities to display.<br>
                        These relationships may reference deleted characters or locations.
                    </p>
                    <button class="btn-danger" onclick="cleanupOrphanedRelationships()" style="margin-top: 1rem;">
                        🧹 Clean Up Orphaned Relationships
                    </button>
                </div>
            `;
        } else {
            listContainer.innerHTML = '<p style="text-align: center; color: #636e72; font-style: italic;">No valid relationships found.</p>';
        }
    }
}

// Function to clean up orphaned relationships
function cleanupOrphanedRelationships() {
    if (!confirm('This will delete all relationships that reference non-existent characters or locations. Are you sure?')) {
        return;
    }
    
    const relationships = JSON.parse(localStorage.getItem('summersFallRelationships') || '[]');
    const characters = JSON.parse(localStorage.getItem('summersFallCharacters') || '[]');
    const locations = JSON.parse(localStorage.getItem('summersFallLocations') || '[]');
    
    const validRelationships = relationships.filter(rel => {
        // Check if source entity exists
        const sourceExists = characters.some(c => c.id === rel.sourceId) || 
                           locations.some(l => l.id === rel.sourceId);
        
        // Check if target entity exists  
        const targetExists = characters.some(c => c.id === rel.targetId) || 
                           locations.some(l => l.id === rel.targetId);
        
        return sourceExists && targetExists;
    });
    
    console.log(`Cleaned up relationships: ${relationships.length} -> ${validRelationships.length}`);
    
    localStorage.setItem('summersFallRelationships', JSON.stringify(validRelationships));
    
    // Refresh the relationship web
    if (window.relationshipWebManager) {
        relationshipWebManager.loadData();
        relationshipWebManager.render();
    }
    
    // Refresh the modal
    populateRelationshipList();
    
    alert(`Cleaned up ${relationships.length - validRelationships.length} orphaned relationships.`);
}

function deleteSelectedRelationships() {
    const checkboxes = document.querySelectorAll('#relationshipList input[type="checkbox"]:checked');
    
    if (checkboxes.length === 0) {
        alert('Please select at least one relationship to delete.');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete ${checkboxes.length} relationship(s)? This action cannot be undone.`)) {
        return;
    }
    
    const relationships = JSON.parse(localStorage.getItem('summersFallRelationships') || '[]');
    const indicesToDelete = Array.from(checkboxes).map(cb => parseInt(cb.dataset.relationshipIndex));
    
    // Sort indices in descending order to delete from the end first
    indicesToDelete.sort((a, b) => b - a);
    
    indicesToDelete.forEach(index => {
        relationships.splice(index, 1);
    });
    
    localStorage.setItem('summersFallRelationships', JSON.stringify(relationships));
    
    // Refresh the list and the web visualization
    populateRelationshipList();
    if (window.relationshipWebManager) {
        relationshipWebManager.loadData();
        relationshipWebManager.render();
    }
    
    console.log(`Deleted ${checkboxes.length} relationship(s)`);
}
