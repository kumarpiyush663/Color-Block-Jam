
const CONFIG = {
    CELL_SIZE: 50,
    GAP: 4,
    GRID_W: 6,
    GRID_H: 8,
    ANIMATION_SPEED: 200
};

const COLORS = {
    RED: 'red',
    BLUE: 'blue',
    GREEN: 'green',
    YELLOW: 'yellow',
    PURPLE: 'purple',
    ORANGE: 'orange'
};

// Level 1 Data (Based on Image 1 roughly)
const LEVEL_1 = {
    width: 6,
    height: 6,
    doors: [
        { side: 'top', x: 0, y: -1, width: 6, height: 1, color: COLORS.BLUE },
        { side: 'bottom', x: 0, y: 6, width: 3, height: 1, color: COLORS.PURPLE },
        { side: 'bottom', x: 3, y: 6, width: 3, height: 1, color: COLORS.ORANGE },
        { side: 'left', x: -1, y: 0, width: 1, height: 3, color: COLORS.RED }, // Partial left
        { side: 'left', x: -1, y: 3, width: 1, height: 3, color: COLORS.YELLOW },
        { side: 'right', x: 6, y: 0, width: 1, height: 3, color: COLORS.GREEN },
        { side: 'right', x: 6, y: 3, width: 1, height: 3, color: COLORS.BLUE }
    ],
    blocks: [
        // Top Left Green
        { id: 1, x: 0, y: 0, w: 2, h: 1, color: COLORS.GREEN },
        // Top Right Yellow
        { id: 2, x: 4, y: 0, w: 2, h: 1, color: COLORS.YELLOW },
        // Center Cross (Yellow) - Split into parts for now or simple blocks
        // Let's use simple blocks first
        { id: 3, x: 2, y: 1, w: 2, h: 1, color: COLORS.BLUE },
        { id: 4, x: 0, y: 1, w: 2, h: 2, color: COLORS.PURPLE }, // Big square
        { id: 5, x: 4, y: 1, w: 2, h: 2, color: COLORS.PURPLE },
        { id: 6, x: 2, y: 2, w: 2, h: 2, color: COLORS.YELLOW }, // Center
        { id: 7, x: 0, y: 3, w: 1, h: 3, color: COLORS.BLUE }, // L shape approx
        { id: 8, x: 5, y: 3, w: 1, h: 3, color: COLORS.BLUE },
        { id: 9, x: 1, y: 5, w: 2, h: 1, color: COLORS.RED },
        { id: 10, x: 3, y: 5, w: 2, h: 1, color: COLORS.ORANGE }
    ]
};

class Game {
    constructor() {
        this.boardEl = document.getElementById('game-board');
        this.level = LEVEL_1; // Load level
        this.blocks = JSON.parse(JSON.stringify(this.level.blocks)); // Deep copy
        this.doors = this.level.doors;
        this.selectedBlock = null;
        this.dragStart = { x: 0, y: 0 };
        this.blockStart = { x: 0, y: 0 };

        this.init();
    }

    init() {
        this.renderBoard();
        this.renderDoors();
        this.renderBlocks();
        this.setupInput();
    }

    renderBoard() {
        // Set grid size
        const totalW = this.level.width * (CONFIG.CELL_SIZE + CONFIG.GAP) - CONFIG.GAP;
        const totalH = this.level.height * (CONFIG.CELL_SIZE + CONFIG.GAP) - CONFIG.GAP;

        this.boardEl.style.width = `${totalW + 40}px`; // Padding for walls
        this.boardEl.style.height = `${totalH + 40}px`;
        this.boardEl.style.padding = '20px'; // Space for doors

        // Create grid background cells
        for (let y = 0; y < this.level.height; y++) {
            for (let x = 0; x < this.level.width; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.style.position = 'absolute';
                cell.style.left = `${20 + x * (CONFIG.CELL_SIZE + CONFIG.GAP)}px`;
                cell.style.top = `${20 + y * (CONFIG.CELL_SIZE + CONFIG.GAP)}px`;
                this.boardEl.appendChild(cell);
            }
        }
    }

    renderDoors() {
        this.doors.forEach(door => {
            const el = document.createElement('div');
            el.className = `door ${door.color} ${door.side}`;

            // Calculate position
            // Grid starts at 20,20 inside the container
            const left = 20 + door.x * (CONFIG.CELL_SIZE + CONFIG.GAP);
            const top = 20 + door.y * (CONFIG.CELL_SIZE + CONFIG.GAP);
            const width = door.width * (CONFIG.CELL_SIZE + CONFIG.GAP) - CONFIG.GAP;
            const height = door.height * (CONFIG.CELL_SIZE + CONFIG.GAP) - CONFIG.GAP;

            el.style.left = `${left}px`;
            el.style.top = `${top}px`;
            el.style.width = `${width}px`;
            el.style.height = `${height}px`;

            this.boardEl.appendChild(el);
        });
    }

    renderBlocks() {
        // Clear existing blocks if any (except doors/grid)
        const existing = document.querySelectorAll('.block');
        existing.forEach(e => e.remove());

        this.blocks.forEach(block => {
            const el = document.createElement('div');
            el.className = `block ${block.color}`;
            el.id = `block-${block.id}`;
            el.dataset.id = block.id;

            this.updateBlockPosition(el, block);

            // Set size
            el.style.width = `${block.w * CONFIG.CELL_SIZE + (block.w - 1) * CONFIG.GAP}px`;
            el.style.height = `${block.h * CONFIG.CELL_SIZE + (block.h - 1) * CONFIG.GAP}px`;

            this.boardEl.appendChild(el);
        });
    }

    updateBlockPosition(el, block) {
        const left = 20 + block.x * (CONFIG.CELL_SIZE + CONFIG.GAP);
        const top = 20 + block.y * (CONFIG.CELL_SIZE + CONFIG.GAP);
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
    }

    setupInput() {
        let isDragging = false;
        let startX, startY;
        let currentBlock = null;
        let initialBlockX, initialBlockY;
        let dragAxis = null; // 'x' or 'y'
        let moveBounds = { min: -Infinity, max: Infinity };

        const getEventPos = (e) => {
            if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
            return { x: e.clientX, y: e.clientY };
        };

        const startDrag = (e) => {
            if (e.target.classList.contains('block')) {
                // e.preventDefault(); // Allow default for touch scroll until we know it's a drag? No, game is fixed.
                isDragging = true;
                currentBlock = this.blocks.find(b => b.id == e.target.dataset.id);
                const pos = getEventPos(e);
                startX = pos.x;
                startY = pos.y;
                initialBlockX = currentBlock.x;
                initialBlockY = currentBlock.y;
                dragAxis = null;

                // Calculate bounds for this block in both directions
                // We'll compute them on the fly once axis is determined

                e.target.style.zIndex = 100;
                e.target.style.transition = 'none'; // Disable transition during drag
            }
        };

        const moveDrag = (e) => {
            if (!isDragging || !currentBlock) return;

            const pos = getEventPos(e);
            const dx = pos.x - startX;
            const dy = pos.y - startY;

            // Determine axis if not yet set
            if (!dragAxis) {
                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) dragAxis = 'x';
                else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) dragAxis = 'y';

                if (dragAxis) {
                    // Calculate bounds
                    moveBounds = this.calculateMoveBounds(currentBlock, dragAxis);
                }
            }

            if (dragAxis) {
                e.preventDefault();
                const el = document.getElementById(`block-${currentBlock.id}`);
                const baseLeft = 20 + initialBlockX * (CONFIG.CELL_SIZE + CONFIG.GAP);
                const baseTop = 20 + initialBlockY * (CONFIG.CELL_SIZE + CONFIG.GAP);

                if (dragAxis === 'x') {
                    // Clamp dx
                    // Convert bounds (grid units) to pixels relative to start
                    // min grid delta = moveBounds.min - initialBlockX
                    const minPx = (moveBounds.min - initialBlockX) * (CONFIG.CELL_SIZE + CONFIG.GAP);
                    const maxPx = (moveBounds.max - initialBlockX) * (CONFIG.CELL_SIZE + CONFIG.GAP);

                    // Add some "rubber band" or just hard clamp? Hard clamp is better for sliding puzzles.
                    // But we want to allow "exiting" which might be outside normal bounds?
                    // calculateMoveBounds should include exit positions.

                    const clampedDx = Math.max(minPx, Math.min(maxPx, dx));
                    el.style.left = `${baseLeft + clampedDx}px`;
                    el.style.top = `${baseTop}px`;
                } else {
                    const minPx = (moveBounds.min - initialBlockY) * (CONFIG.CELL_SIZE + CONFIG.GAP);
                    const maxPx = (moveBounds.max - initialBlockY) * (CONFIG.CELL_SIZE + CONFIG.GAP);

                    const clampedDy = Math.max(minPx, Math.min(maxPx, dy));
                    el.style.left = `${baseLeft}px`;
                    el.style.top = `${baseTop + clampedDy}px`;
                }
            }
        };

        const endDrag = (e) => {
            if (!isDragging || !currentBlock) return;
            isDragging = false;

            const el = document.getElementById(`block-${currentBlock.id}`);
            el.style.zIndex = 2;
            el.style.transition = 'all 0.2s ease'; // Re-enable transition

            if (!dragAxis) {
                // Didn't move enough
                currentBlock = null;
                return;
            }

            // Calculate final grid position
            const rect = el.getBoundingClientRect();
            const boardRect = this.boardEl.getBoundingClientRect();
            const relativeX = rect.left - boardRect.left - 20;
            const relativeY = rect.top - boardRect.top - 20;

            let newGridX = initialBlockX;
            let newGridY = initialBlockY;

            if (dragAxis === 'x') {
                newGridX = Math.round(relativeX / (CONFIG.CELL_SIZE + CONFIG.GAP));
            } else {
                newGridY = Math.round(relativeY / (CONFIG.CELL_SIZE + CONFIG.GAP));
            }

            // Check exit
            // If the new position is "outside" or overlapping a door significantly
            // We can reuse checkExit logic or just check if we reached the "exit" bound

            // Let's just update position and check exit
            // Because we clamped to valid moves, this new position MUST be valid (or an exit)

            // Special case: If we are at the "exit" bound, trigger exit
            // But wait, rounding might put us back in grid if we didn't drag far enough?
            // Or if we dragged fully out?

            // Let's verify validity one last time just in case
            if (this.isValidMove(currentBlock, newGridX, newGridY)) {
                if (this.checkExit(currentBlock, newGridX, newGridY)) {
                    this.removeBlock(currentBlock);
                } else {
                    currentBlock.x = newGridX;
                    currentBlock.y = newGridY;
                    this.updateBlockPosition(el, currentBlock);
                }
            } else {
                // Should not happen with clamping, but fallback
                this.updateBlockPosition(el, currentBlock);
            }

            currentBlock = null;
            dragAxis = null;
        };

        this.boardEl.addEventListener('mousedown', startDrag);
        window.addEventListener('mousemove', moveDrag);
        window.addEventListener('mouseup', endDrag);

        this.boardEl.addEventListener('touchstart', startDrag, { passive: false });
        window.addEventListener('touchmove', moveDrag, { passive: false });
        window.addEventListener('touchend', endDrag);
    }

    calculateMoveBounds(block, axis) {
        // Find the range [min, max] of grid coordinates the block can move to along 'axis'
        // without colliding with other blocks or walls (unless matching door).

        let min = -Infinity;
        let max = Infinity;

        // Current pos
        const startVal = (axis === 'x') ? block.x : block.y;

        // Scan Negative
        // We want to find the lowest value `i` such that all positions from `i` to `startVal` are valid.
        // Actually, we scan outwards from startVal.
        // The first invalid position defines the bound.

        // Scan backwards from startVal - 1
        for (let i = startVal - 1; i >= -2; i--) {
            const testX = (axis === 'x') ? i : block.x;
            const testY = (axis === 'y') ? i : block.y;

            if (!this.isValidMove(block, testX, testY)) {
                min = i + 1; // The last valid position was i + 1
                break;
            }
        }
        // If we never hit an invalid move (e.g. clear path to -2), then min is -2?
        // But -2 is "outside". isValidMove handles "outside" logic (only valid if door).
        // So if -2 is valid, it means we can go there.
        if (min === -Infinity) min = -1; // Default to boundary if no collision found earlier? 
        // Actually if the loop finishes without break, it means -2 was valid. So min is -2.
        // But let's stick to the loop logic. If loop finishes, min is still -Infinity.
        // This means everything down to -2 was valid.
        if (min === -Infinity) min = -2;


        // Scan Positive
        const limit = (axis === 'x') ? this.level.width + 1 : this.level.height + 1;
        for (let i = startVal + 1; i <= limit; i++) {
            const testX = (axis === 'x') ? i : block.x;
            const testY = (axis === 'y') ? i : block.y;

            if (!this.isValidMove(block, testX, testY)) {
                max = i - 1; // The last valid position was i - 1
                break;
            }
        }
        if (max === Infinity) max = limit; // If we reached limit and it was valid

        return { min, max };
    }

    isValidMove(block, targetX, targetY) {
        // 1. Check boundaries (allow 1 step outside for doors)
        if (targetX < -1 || targetX > this.level.width ||
            targetY < -1 || targetY > this.level.height) {
            return false;
        }

        // 2. Check collision with other blocks
        // We need to check if the target rectangle overlaps with any other block's rectangle
        for (let other of this.blocks) {
            if (other.id === block.id) continue;

            if (targetX < other.x + other.w &&
                targetX + block.w > other.x &&
                targetY < other.y + other.h &&
                targetY + block.h > other.y) {
                return false;
            }
        }

        // 3. Check collision with walls (non-door boundaries)
        // This is tricky. We implicitly treat anything outside 0..width-1 as a wall,
        // UNLESS it matches a door.

        // Check if any part of the block is outside the grid
        const isOutside = (
            targetX < 0 ||
            targetY < 0 ||
            targetX + block.w > this.level.width ||
            targetY + block.h > this.level.height
        );

        if (isOutside) {
            // If outside, it MUST be overlapping a matching door
            // And ONLY a matching door

            // Let's check overlap with doors
            let touchingMatchingDoor = false;
            let touchingWrongWall = false;

            // Define block rect in grid coords
            const bLeft = targetX;
            const bRight = targetX + block.w;
            const bTop = targetY;
            const bBottom = targetY + block.h;

            // Check against grid boundaries
            // If any part is < 0, check if there is a door there
            if (bLeft < 0) {
                // Left edge check
                if (!this.isDoorAt('left', bTop, bBottom, block.color)) return false;
            }
            if (bTop < 0) {
                // Top edge check
                if (!this.isDoorAt('top', bLeft, bRight, block.color)) return false;
            }
            if (bRight > this.level.width) {
                // Right edge check
                if (!this.isDoorAt('right', bTop, bBottom, block.color)) return false;
            }
            if (bBottom > this.level.height) {
                // Bottom edge check
                if (!this.isDoorAt('bottom', bLeft, bRight, block.color)) return false;
            }

            return true;
        }

        return true;
    }

    isDoorAt(side, start, end, color) {
        // Check if there is a door on this side that covers the range [start, end]
        // and has the matching color.
        // Note: start/end are grid coordinates along the edge.

        // Find doors on this side
        const sideDoors = this.doors.filter(d => d.side === side);

        // For the block to pass, every unit of its edge that is outside must be covered by a matching door
        // Simplification: Just check if the block center or majority overlaps?
        // Strict: The entire edge segment that is crossing the boundary must match the door.

        // Let's iterate over the units of the block that are "out"
        // But actually, the isValidMove passes "targetX, targetY".
        // If targetX = -1, then the block is at x=-1. It's fully outside on the left?
        // Or partially?
        // If block is 2 wide, and targetX = -1. It spans -1 to 1.
        // The part at -1 is outside. The part at 0 is inside.
        // The part at -1 must match a door.

        // Let's simplify: You can only exit if you are FULLY aligned with a door?
        // Or if you just touch it?
        // Let's say: If you move to a position where you overlap a door, it's valid IF colors match.

        for (let d of sideDoors) {
            if (d.color !== color) continue;

            // Check overlap
            // Door range
            let dStart, dEnd;
            if (side === 'top' || side === 'bottom') {
                dStart = d.x;
                dEnd = d.x + d.width;
            } else {
                dStart = d.y;
                dEnd = d.y + d.height;
            }

            // Block range on that axis
            // If side is top/bottom, we care about x overlap
            // If side is left/right, we care about y overlap
            if (start >= dStart && end <= dEnd) {
                return true;
            }
        }

        return false;
    }

    checkExit(block, x, y) {
        // If the block is substantially outside the grid, remove it
        // We already validated it matches the door in isValidMove

        if (x < 0 || y < 0 || x + block.w > this.level.width || y + block.h > this.level.height) {
            return true;
        }
        return false;
    }

    removeBlock(block) {
        const idx = this.blocks.indexOf(block);
        if (idx > -1) {
            this.blocks.splice(idx, 1);
            const el = document.getElementById(`block-${block.id}`);

            // Animation
            el.style.transition = 'all 0.3s ease';
            el.style.transform = 'scale(0)';
            el.style.opacity = '0';

            setTimeout(() => {
                el.remove();
                this.checkWin();
            }, 300);
        }
    }

    checkWin() {
        if (this.blocks.length === 0) {
            setTimeout(() => {
                alert("LEVEL CLEARED!");
                // Reset or Next Level
                location.reload();
            }, 500);
        }
    }
}

// Start Game
window.onload = () => {
    const game = new Game();
};
