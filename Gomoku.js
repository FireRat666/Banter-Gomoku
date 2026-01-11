(function () {
    /**
     * Banter Gomoku (Five in a Row) Embed Script
     * A fully synced multiplayer Gomoku game for Banter.
     */

    // --- Configuration ---
    const config = {
        boardPosition: new BS.Vector3(0, 1.5, 0),
        boardRotation: new BS.Vector3(0, 0, 0),
        boardScale: new BS.Vector3(1, 1, 1),
        resetPosition: new BS.Vector3(0, -1.2, 0),
        resetRotation: new BS.Vector3(0, 0, 0),
        resetScale: new BS.Vector3(1, 1, 1),
        instance: window.location.href.split('?')[0],
        hideUI: false,
        boardSize: 15 // Standard is 15x15 or 19x19. 15 is a good start.
    };

    const COLORS = {
        board: '#D2B48C',    // Wooden Board Color
        player1: '#000000',  // Black stone
        player2: '#FFFFFF',  // White stone
        empty: '#FFFFFF',    // Empty slot (will be invisible)
        winHighlight: '#00FF00', // Green highlight for winning pieces
    };

    // Helper to parse Vector3
    const parseVector3 = (str, defaultVal) => {
        if (!str) return defaultVal;
        const s = str.trim();
        if (s.includes(' ')) {
            const parts = s.split(' ').map(Number);
            if (parts.length >= 3) return new BS.Vector3(parts[0], parts[1], parts[2]);
        }
        return defaultVal;
    };

    // Parse URL params
    const currentScript = document.currentScript;
    if (currentScript) {
        const url = new URL(currentScript.src);
        const params = new URLSearchParams(url.search);

        if (params.has('hideUI')) config.hideUI = params.get('hideUI') === 'true';
        if (params.has('instance')) config.instance = params.get('instance');
        if (params.has('boardSize')) config.boardSize = parseInt(params.get('boardSize'), 10) || 15;

        config.boardScale = parseVector3(params.get('boardScale'), config.boardScale);
        config.boardPosition = parseVector3(params.get('boardPosition'), config.boardPosition);
        config.boardRotation = parseVector3(params.get('boardRotation'), config.boardRotation);

        config.resetScale = parseVector3(params.get('resetScale'), config.resetScale);
        config.resetPosition = parseVector3(params.get('resetPosition'), config.resetPosition);
        config.resetRotation = parseVector3(params.get('resetRotation'), config.resetRotation);
    }

    // --- Game Logic ---
    class GomokuGame {
        constructor(rows, cols) {
            this.rows = rows;
            this.cols = cols;
            this.board = this.createEmptyBoard();
            this.currentPlayer = 1; // 1 = Black, 2 = White
            this.winner = null;
            this.winningCells = [];
            this.gameOver = false;
        }

        createEmptyBoard() {
            return Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));
        }

        reset() {
            this.board = this.createEmptyBoard();
            this.currentPlayer = 1;
            this.winner = null;
            this.winningCells = [];
            this.gameOver = false;
        }

        loadState(state) {
            this.board = state.board;
            this.currentPlayer = state.currentPlayer;
            this.winner = state.winner;
            if (this.winner) {
                this.checkWin(); // Recalculate winningCells for display
                this.gameOver = true;
            } else {
                this.winningCells = [];
                this.gameOver = this.checkDraw();
            }
        }

        getState() {
            return {
                board: this.board,
                currentPlayer: this.currentPlayer,
                winner: this.winner,
                lastModified: Date.now()
            };
        }

        simulatePlay(row, col) {
            if (this.gameOver || this.board[row][col] !== 0) return null;

            const boardCopy = this.board.map(r => [...r]);
            boardCopy[row][col] = this.currentPlayer;

            let nextPlayer = (this.currentPlayer === 1 ? 2 : 1);
            let nextWinner = null;
            let nextGameOver = false;

            const tempGame = new GomokuGame(this.rows, this.cols);
            tempGame.board = boardCopy;
            tempGame.currentPlayer = this.currentPlayer;

            if (tempGame.checkWin()) {
                nextWinner = this.currentPlayer;
                nextGameOver = true;
            } else if (tempGame.checkDraw()) {
                nextWinner = 'draw';
                nextGameOver = true;
            }

            return {
                board: boardCopy,
                currentPlayer: nextGameOver ? this.currentPlayer : nextPlayer,
                winner: nextWinner,
                lastModified: Date.now()
            };
        }

        checkDraw() {
            return this.board.every(row => row.every(cell => cell !== 0));
        }

        checkWin() {
            const directions = [
                [0, 1],  // Horizontal
                [1, 0],  // Vertical
                [1, 1],  // Diagonal /
                [1, -1]  // Diagonal \
            ];

            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    const player = this.board[r][c];
                    if (player === 0) continue;

                    for (const [dr, dc] of directions) {
                        let cells = [[r, c]];
                        let count = 1;
                        // Check in one direction
                        for (let i = 1; i < 5; i++) {
                            const nr = r + dr * i;
                            const nc = c + dc * i;
                            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.board[nr][nc] === player) {
                                cells.push([nr, nc]);
                                count++;
                            } else {
                                break;
                            }
                        }

                        if (count >= 5) {
                            this.winningCells = cells;
                            return true;
                        }
                    }
                }
            }
            return false;
        }
    }

    // --- Banter Visuals ---
    const state = {
        root: null,
        piecesRoot: null,
        slots: [], // 2D array of GameObjects for pieces
        cells: [], // 2D array of clickable cell GameObjects
        isSyncing: false,
        game: new GomokuGame(config.boardSize, config.boardSize)
    };

    function hexToVector4(hex, alpha = 1.0) {
        let c = hex.substring(1);
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        return new BS.Vector4(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255, alpha);
    }

    async function init() {
        if (!window.BS) {
            console.error("Banter SDK not found!");
            return;
        }
        BS.BanterScene.GetInstance().On("unity-loaded", setupScene);
    }

    async function setupScene() {
        console.log("Gomoku: Setup Scene Started");
        state.root = await new BS.GameObject("Gomoku_Root").Async();
        let t = await state.root.AddComponent(new BS.Transform());
        t.position = config.boardPosition;
        t.localEulerAngles = config.boardRotation;
        t.localScale = config.boardScale;

        const rows = config.boardSize;
        const cols = config.boardSize;
        const gap = 0.1; // Space between lines
        const boardDimension = (cols - 1) * gap;
        const boardThickness = 0.02;

        // Create the board base
        const boardBase = await createBanterObject(state.root, BS.GeometryType.BoxGeometry,
            { width: boardDimension + gap, height: boardDimension + gap, depth: boardThickness },
            COLORS.board, new BS.Vector3(0, 0, -boardThickness / 2));

        // --- Construct Grid ---
        const gridRoot = await new BS.GameObject("Grid_Root").Async();
        await gridRoot.SetParent(state.root, false);
        await gridRoot.AddComponent(new BS.Transform());
        const lineThickness = 0.005;

        for (let i = 0; i < rows; i++) {
            const pos = (i - (rows - 1) / 2) * gap;
            // Vertical Line
            await createBanterObject(gridRoot, BS.GeometryType.BoxGeometry,
                { width: lineThickness, height: boardDimension, depth: lineThickness },
                '#000000', new BS.Vector3(pos, 0, 0.01));
            // Horizontal Line
            await createBanterObject(gridRoot, BS.GeometryType.BoxGeometry,
                { width: boardDimension, height: lineThickness, depth: lineThickness },
                '#000000', new BS.Vector3(0, pos, 0.01));
        }

        // --- Create Clickable Intersections and Piece Placeholders ---
        state.piecesRoot = await new BS.GameObject("Pieces_Root").Async();
        await state.piecesRoot.SetParent(state.root, false);
        await state.piecesRoot.AddComponent(new BS.Transform());

        const pieceSize = gap * 0.4;

        for (let r = 0; r < rows; r++) {
            state.slots[r] = [];
            state.cells[r] = [];
            for (let c = 0; c < cols; c++) {
                const x = (c - (cols - 1) / 2) * gap;
                const y = (r - (rows - 1) / 2) * -gap; // Invert Y

                // Invisible clickable cell at intersection
                const cellObj = await createBanterObject(state.root, BS.GeometryType.BoxGeometry,
                    { width: gap, height: gap, depth: 0.05 },
                    '#FFFFFF', new BS.Vector3(x, y, 0), true, 0.0);

                cellObj.name = `Cell_${r}_${c}`;
                cellObj.On('click', () => {
                    console.log(`Gomoku: Cell ${r}, ${c} clicked`);
                    handleCellClick(r, c);
                });
                state.cells[r][c] = cellObj;

                // Visible piece placeholder (starts inactive)
                // Use CylinderGeometry for Go stones
                const piece = await createBanterObject(state.piecesRoot, BS.GeometryType.CylinderGeometry,
                    { radius: pieceSize, height: 0.02 },
                    COLORS.player1,
                    new BS.Vector3(x, y, 0.04)
                );
                await piece.SetLayer(5); // Ensure it's on UI layer
                piece.SetActive(false);
                state.slots[r][c] = piece;
            }
        }

        // Reset Button
        if (!config.hideUI) {
            const resetBtn = await createBanterObject(state.root, BS.GeometryType.BoxGeometry,
                { width: 0.3, height: 0.1, depth: 0.05 },
                '#333333', config.resetPosition, true
            );
            let rt = resetBtn.GetComponent(BS.ComponentType.Transform);
            rt.localEulerAngles = config.resetRotation;
            rt.localScale = config.resetScale;

            resetBtn.On('click', () => {
                console.log("Gomoku: Reset clicked");
                state.game.reset();
                syncState();
            });
        }

        setupListeners();
        checkForExistingState();
        console.log("Gomoku: Setup Scene Complete");
    }

    function getGeoArgs(type, dims) {
        // Defaults: width=1, height=1, depth=1, segments=24, radius=0.5
        const w = dims.width || 1;
        const h = dims.height || 1;
        const d = dims.depth || 1;
        const r = dims.radius || 0.5;

        // We only need to pass arguments up to what is required for the specific geometry.
        // Box: type, null, w, h, d (5 args)
        // Circle/Sphere: need radius (9th arg)

        if (type === BS.GeometryType.BoxGeometry) {
            return [type, null, w, h, d];
        } else {
            // For Cylinder, Sphere, Circle, etc that likely need radius or segments.
            // Arguments: type, param, w, h, d, wSeg, hSeg, dSeg, radius, segments
            // Cylinder needs radiusTop/Bottom (args 16, 17) to respect size.
            const PI2 = 6.283185;
            return [
                type, null, w, h, d,
                1, 1, 1,
                r, 24,
                0, PI2, 0, PI2,
                8, false,
                r, r // radiusTop, radiusBottom
            ];
        }
    }

    async function createBanterObject(parent, type, dims, colorHex, pos, hasCollider = false, opacity = 1.0) {
        const obj = await new BS.GameObject("Geo").Async();
        await obj.SetParent(parent, false);

        let t = await obj.AddComponent(new BS.Transform());
        if (pos) t.localPosition = pos;

        const fullArgs = getGeoArgs(type, dims);
        await obj.AddComponent(new BS.BanterGeometry(...fullArgs));

        const color = hexToVector4(colorHex, opacity);

        const shader = opacity < 1.0 ? "Unlit/DiffuseTransparent" : "Unlit/Diffuse";
        await obj.AddComponent(new BS.BanterMaterial(shader, "", color, BS.MaterialSide.Front, false));

        if (hasCollider) {
            let colSize = new BS.Vector3(dims.width || 1, dims.height || 1, dims.depth || 1);
            await obj.AddComponent(new BS.BoxCollider(true, new BS.Vector3(0, 0, 0), colSize));
            await obj.SetLayer(5);
        }

        return obj;
    }

    function handleCellClick(row, col) {
        if (state.game.winner) return;
        if (state.isSyncing) {
            console.log("Gomoku: Input Locked (Syncing)");
            return;
        }

        const nextState = state.game.simulatePlay(row, col);
        if (nextState) {
            console.log("Gomoku: Locking Input & Sending Move...");
            state.isSyncing = true;
            syncState(nextState);
        }
    }

    function syncState(newState) {
        const key = `gomoku_game_${config.instance}`;
        const data = newState || state.game.getState();
        BS.BanterScene.GetInstance().SetPublicSpaceProps({ [key]: JSON.stringify(data) });
    }

    function updateVisuals() {
        for (let r = 0; r < config.boardSize; r++) {
            for (let c = 0; c < config.boardSize; c++) {
                const cell = state.game.board[r][c];
                const pieceObj = state.slots[r][c];
                const mat = pieceObj.GetComponent(BS.ComponentType.BanterMaterial);

                if (!mat) continue;

                if (cell === 0) {
                    pieceObj.SetActive(false);
                } else {
                    let colorHex;
                    if (cell === 1) {
                        colorHex = COLORS.player1;
                    } else { // cell === 2
                        colorHex = COLORS.player2;
                    }

                    if (state.game.winningCells.some(([wr, wc]) => wr === r && wc === c)) {
                        colorHex = COLORS.winHighlight;
                    }



                    mat.color = hexToVector4(colorHex);
                    pieceObj.SetActive(true);
                }
            }
        }
    }

    async function checkForExistingState() {
        const key = `gomoku_game_${config.instance}`;
        const scene = BS.BanterScene.GetInstance();

        const getProp = () => {
            const s = scene.spaceState;
            return (s.public && s.public[key]) || (s.protected && s.protected[key]);
        };
        let val = getProp();

        if (val) {
            try {
                const data = JSON.parse(val);
                state.game.loadState(data);
                updateVisuals();
            } catch (e) {
                console.error("Failed to parse gomoku state", e);
            }
        }
    }

    function setupListeners() {
        const key = `gomoku_game_${config.instance}`;
        BS.BanterScene.GetInstance().On("space-state-changed", e => {
            const changes = e.detail.changes;
            if (changes && changes.find(c => c.property === key)) {
                const scene = BS.BanterScene.GetInstance();
                const s = scene.spaceState;
                const val = (s.public && s.public[key]) || (s.protected && s.protected[key]);

                if (val) {
                    try {
                        console.log("Gomoku: Received State Change -> Loading & Unlocking");
                        const data = JSON.parse(val);
                        state.game.loadState(data);
                        updateVisuals();
                        state.isSyncing = false;
                    } catch (e) { console.error(e); }
                }
            }
        });
    }

    init();
})();
