// ============= SUDOKU WEB WORKER =============
// Version 9.8
// Handles puzzle generation in background thread to prevent UI blocking

class SudokuEngine {
    constructor() {
        this.board = Array(81).fill(0);
        this.solution = Array(81).fill(0);
        this.fixed = Array(81).fill(false);
        this.notes = Array(81).fill(null).map(() => new Set());
    }

    generateComplete() {
        this.board = Array(81).fill(0);
        this.fillDiagonalBlocks();
        this.fillRemaining(0);
        return [...this.board];
    }

    fillDiagonalBlocks() {
        for (let block = 0; block < 3; block++) {
            const startRow = block * 3;
            const startCol = block * 3;
            const nums = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
            
            let idx = 0;
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    const pos = (startRow + r) * 9 + (startCol + c);
                    this.board[pos] = nums[idx++];
                }
            }
        }
    }

    fillRemaining(pos) {
        while (pos < 81 && this.board[pos] !== 0) {
            pos++;
        }
        
        if (pos >= 81) return true;

        const numbers = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        
        for (let num of numbers) {
            if (this.isValid(pos, num)) {
                this.board[pos] = num;
                if (this.fillRemaining(pos + 1)) return true;
                this.board[pos] = 0;
            }
        }
        return false;
    }

    isValid(pos, num) {
        const row = Math.floor(pos / 9);
        const col = pos % 9;

        for (let c = 0; c < 9; c++) {
            if (this.board[row * 9 + c] === num) return false;
        }

        for (let r = 0; r < 9; r++) {
            if (this.board[r * 9 + col] === num) return false;
        }

        const blockRow = Math.floor(row / 3) * 3;
        const blockCol = Math.floor(col / 3) * 3;
        for (let r = blockRow; r < blockRow + 3; r++) {
            for (let c = blockCol; c < blockCol + 3; c++) {
                if (this.board[r * 9 + c] === num) return false;
            }
        }
        return true;
    }

    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    generatePuzzle(difficulty = 'medium') {
        const cellsToRemove = { 
            easy: 38,
            medium: 48,
            hard: 58,
            expert: 64
        };
        
        const startTime = performance.now();
        
        // Step 1: Generate complete solution
        const complete = this.generateComplete();
        this.solution = [...complete];
        this.board = [...complete];
        this.fixed = Array(81).fill(true);

        const target = cellsToRemove[difficulty] || 48;
        
        // Step 2: Create symmetric pairs
        const symmetricPairs = this.createSymmetricPairs();
        this.shuffleArray(symmetricPairs);
        
        let removed = 0;
        let attempts = 0;
        const maxAttempts = 250;
        const MAX_TIME = 15000; // 15 second timeout
        
        // Phase 1: Symmetric removal
        for (let pair of symmetricPairs) {
            if (removed >= target) break;
            if (attempts >= maxAttempts) break;
            if (performance.now() - startTime > MAX_TIME) break;
            
            attempts++;
            
            const backup1 = this.board[pair[0]];
            const backup2 = this.board[pair[1]];
            
            this.board[pair[0]] = 0;
            if (pair[0] !== pair[1]) {
                this.board[pair[1]] = 0;
            }
            
            if (this.hasUniqueSolution()) {
                this.fixed[pair[0]] = false;
                if (pair[0] !== pair[1]) {
                    this.fixed[pair[1]] = false;
                    removed += 2;
                } else {
                    removed += 1;
                }
                attempts = 0;
            } else {
                this.board[pair[0]] = backup1;
                if (pair[0] !== pair[1]) {
                    this.board[pair[1]] = backup2;
                }
            }
        }
        
        // Phase 2: Single cell removal
        if (removed < target) {
            const remainingCells = [];
            for (let i = 0; i < 81; i++) {
                if (this.board[i] !== 0) {
                    remainingCells.push(i);
                }
            }
            
            this.shuffleArray(remainingCells);
            
            attempts = 0;
            for (let pos of remainingCells) {
                if (removed >= target) break;
                if (attempts >= maxAttempts * 2) break;
                if (performance.now() - startTime > MAX_TIME) break;
                
                attempts++;
                const backup = this.board[pos];
                this.board[pos] = 0;
                
                if (this.hasUniqueSolution()) {
                    this.fixed[pos] = false;
                    removed++;
                    attempts = 0;
                } else {
                    this.board[pos] = backup;
                }
            }
        }

        this.notes = Array(81).fill(null).map(() => new Set());
        
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        const symmetryPercent = this.getSymmetryPercent();
        
        return {
            board: [...this.board],
            solution: [...this.solution],
            fixed: [...this.fixed],
            metadata: {
                difficulty,
                cellsRemoved: removed,
                cluesGiven: 81 - removed,
                symmetry: symmetryPercent,
                generationTime: duration
            }
        };
    }

    createSymmetricPairs() {
        const pairs = [];
        const used = new Set();
        
        for (let i = 0; i < 81; i++) {
            if (used.has(i)) continue;
            
            const symmetric = 80 - i;
            
            if (i === symmetric) {
                pairs.push([i, i]);
                used.add(i);
            } else if (!used.has(symmetric)) {
                pairs.push([i, symmetric]);
                used.add(i);
                used.add(symmetric);
            }
        }
        
        return pairs;
    }

    getSymmetryPercent() {
        let symmetricPairs = 0;
        let totalPairs = 0;
        
        for (let i = 0; i < 41; i++) {
            const symmetric = 80 - i;
            totalPairs++;
            
            const isEmpty1 = this.board[i] === 0;
            const isEmpty2 = this.board[symmetric] === 0;
            
            if (isEmpty1 === isEmpty2) {
                symmetricPairs++;
            }
        }
        
        return symmetricPairs / totalPairs;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    hasUniqueSolution() {
        const solutions = [];
        const board = [...this.board];
        this.solveCount(board, solutions, 2);
        return solutions.length === 1;
    }

    solveCount(board, solutions, limit) {
        if (solutions.length >= limit) return;
        const pos = board.indexOf(0);
        if (pos === -1) {
            solutions.push([...board]);
            return;
        }
        for (let num = 1; num <= 9; num++) {
            const tempBoard = [...board];
            this.board = tempBoard;
            if (this.isValid(pos, num)) {
                tempBoard[pos] = num;
                this.solveCount(tempBoard, solutions, limit);
            }
        }
        this.board = board;
    }

    getConflicts(pos, num) {
        const conflicts = new Set();
        const row = Math.floor(pos / 9);
        const col = pos % 9;

        for (let c = 0; c < 9; c++) {
            const checkPos = row * 9 + c;
            if (checkPos !== pos && this.board[checkPos] === num) {
                conflicts.add(checkPos);
            }
        }

        for (let r = 0; r < 9; r++) {
            const checkPos = r * 9 + col;
            if (checkPos !== pos && this.board[checkPos] === num) {
                conflicts.add(checkPos);
            }
        }

        const blockRow = Math.floor(row / 3) * 3;
        const blockCol = Math.floor(col / 3) * 3;
        for (let r = blockRow; r < blockRow + 3; r++) {
            for (let c = blockCol; c < blockCol + 3; c++) {
                const checkPos = r * 9 + c;
                if (checkPos !== pos && this.board[checkPos] === num) {
                    conflicts.add(checkPos);
                }
            }
        }

        return conflicts;
    }

    countNumber(num) {
        let count = 0;
        for (let i = 0; i < 81; i++) {
            if (this.board[i] === num) count++;
        }
        return count;
    }
}

// ============= WORKER MESSAGE HANDLER =============

let currentEngine = null;

self.onmessage = function(e) {
    const { action, difficulty, seed } = e.data;
    
    try {
        if (action === 'GENERATE') {
            const startTime = performance.now();
            
            // Set seed if provided
            if (seed) {
                Math.random = () => {
                    const x = Math.sin(seed++) * 10000;
                    return x - Math.floor(x);
                };
            }
            
            // Create new engine instance
            currentEngine = new SudokuEngine();
            
            // Generate puzzle
            const result = currentEngine.generatePuzzle(difficulty);
            
            const timeSpent = Math.round(performance.now() - startTime);
            
            // Send success response
            self.postMessage({
                status: 'SUCCESS',
                board: result.board,
                solution: result.solution,
                fixed: result.fixed,
                metadata: result.metadata,
                timeSpent: timeSpent
            });
            
        } else if (action === 'CANCEL') {
            // Cancel current generation (if possible)
            currentEngine = null;
            self.postMessage({
                status: 'CANCELLED'
            });
        }
        
    } catch (error) {
        // Send error response
        self.postMessage({
            status: 'ERROR',
            error: error.message,
            stack: error.stack
        });
    }
};
