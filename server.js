const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3001 });

let gameState = {
    grid: Array(5).fill().map(() => Array(5).fill(null)),
    player1Characters: ["P1", "H1", "H2", "P2", "P3"],
    player2Characters: ["P4", "H3", "H4", "P5", "P6"],
    playerTurn: 1,
    killedPlayer1Characters: [],
    killedPlayer2Characters: []
};

console.log("WebSocket server started on ws://localhost:3001");

wss.on('connection', (ws) => {
    console.log("New client connected");
    resetGame(); 
    ws.send(JSON.stringify({ type: 'INIT', gameState }));
    console.log("Sent initial game state to client:", gameState);

    ws.on('message', (message) => {
        console.log("Received message from client:", message);
        const data = JSON.parse(message);

        switch (data.type) {
            case 'PLACE':
                handlePlacement(data.character, data.row, data.col, ws);
                break;
            case 'MOVE':
                handleMove(data.character, data.direction, ws);
                break;
            default:
                console.log("Unknown message type received:", data.type);
        }
    });

    ws.on('close', () => {
        console.log("Client disconnected");
    });
});

function handlePlacement(character, row, col, ws) {
    console.log(`Handling placement: Character = ${character}, Position = (${row}, ${col}), Player Turn = ${gameState.playerTurn}`);

    if (gameState.grid[row][col] !== null) {
        const errorMsg = `Cell (${row}, ${col}) is already occupied.`;
        console.log("Invalid placement:", errorMsg);
        ws.send(JSON.stringify({ type: 'INVALID_MOVE', reason: errorMsg }));
        return;
    }

    const correctRow = gameState.playerTurn === 1 ? 0 : 4;
    if (row !== correctRow) {
        const errorMsg = `You can only place characters on your starting row (${correctRow}).`;
        console.log("Invalid placement:", errorMsg);
        ws.send(JSON.stringify({ type: 'INVALID_MOVE', reason: errorMsg }));
        return;
    }

    gameState.grid[row][col] = character;

    if (gameState.playerTurn === 1) {
        gameState.player1Characters = gameState.player1Characters.filter(char => char !== character);
        if (gameState.player1Characters.length === 0) {
            gameState.playerTurn = 2;
        }
    } else {
        gameState.player2Characters = gameState.player2Characters.filter(char => char !== character);
        if (gameState.player2Characters.length === 0) {
            gameState.playerTurn = 1;
        }
    }

    console.log("Character placed successfully. Updated grid:", gameState.grid);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'UPDATE', gameState }));
        }
    });
}

function handleMove(character, direction, ws) {
    console.log(`Handling move: Character = ${character}, Direction = ${direction}, Player Turn = ${gameState.playerTurn}`);

    const { grid, playerTurn, killedPlayer1Characters, killedPlayer2Characters } = gameState;

    // Check if it's the correct player's turn
    if ((playerTurn === 1 && character.startsWith('P4')) || (playerTurn === 1 && character.startsWith('P5')) || (playerTurn === 1 && character.startsWith('P6')) || (playerTurn === 1 && character.startsWith('H3')) || (playerTurn === 1 && character.startsWith('H4'))) {
        ws.send(JSON.stringify({ type: 'INVALID_MOVE', reason: "It's Player 1's turn." }));
        return;
    }
    if ((playerTurn === 2 && character.startsWith('P1')) || (playerTurn === 2 && character.startsWith('P2')) || (playerTurn === 2 && character.startsWith('P3')) || (playerTurn === 2 && character.startsWith('H1')) || (playerTurn === 2 && character.startsWith('H2'))) {
        ws.send(JSON.stringify({ type: 'INVALID_MOVE', reason: "It's Player 2's turn." }));
        return;
    }

    
    const validPawnDirections = ['L', 'R', 'F', 'B'];
    const validHero1And3Directions = ['L', 'R', 'F', 'B'];
    const validHero2And4Directions = ['FL', 'FR', 'BL', 'BR'];

    let validDirections = [];

    if (character.startsWith('P')) {
        validDirections = validPawnDirections;
    } else if (character === 'H1' || character === 'H3') {
        validDirections = validHero1And3Directions;
    } else if (character === 'H2' || character === 'H4') {
        validDirections = validHero2And4Directions;
    }

    if (!validDirections.includes(direction)) {
        const errorMsg = `${character} cannot move in direction '${direction}'.`;
        console.log("Invalid move:", errorMsg);
        ws.send(JSON.stringify({ type: 'INVALID_MOVE', reason: errorMsg }));
        return;
    }

    const [row, col] = findCharacterPosition(character);

    if (row === -1) {
        const errorMsg = `${character} is not found on the grid.`;
        console.log("Invalid move:", errorMsg);
        ws.send(JSON.stringify({ type: 'INVALID_MOVE', reason: errorMsg }));
        return;
    }

    let newRow = row;
    let newCol = col;
    let cellsToCheck = [];

    if (character.startsWith('P4') || character.startsWith('P5') || character.startsWith('P6')) {
        switch (direction) {
            case 'L': newCol -= 1; break;
            case 'R': newCol += 1; break;
            case 'F': newRow -= 1; break;
            case 'B': newRow += 1; break;
            default: return;
        }
    } else if (character.startsWith('P1') || character.startsWith('P2') || character.startsWith('P3')) {
        switch (direction) {
            case 'R': newCol -= 1; break;
            case 'L': newCol += 1; break;
            case 'B': newRow -= 1; break;
            case 'F': newRow += 1; break;
            default: return;
        }
    } else if (character.startsWith('H1')) {
        switch (direction) {
            case 'R': cellsToCheck.push([newRow, newCol - 1], [newRow, newCol - 2]); newCol -= 2; break;
            case 'L': cellsToCheck.push([newRow, newCol + 1], [newRow, newCol + 2]); newCol += 2; break;
            case 'B': cellsToCheck.push([newRow - 1, newCol], [newRow - 2, newCol]); newRow -= 2; break;
            case 'F': cellsToCheck.push([newRow + 1, newCol], [newRow + 2, newCol]); newRow += 2; break;
            default: return;
        }
    } else if (character.startsWith('H3')) {
        switch (direction) {
            case 'L': cellsToCheck.push([newRow, newCol - 1], [newRow, newCol - 2]); newCol -= 2; break;
            case 'R': cellsToCheck.push([newRow, newCol + 1], [newRow, newCol + 2]); newCol += 2; break;
            case 'F': cellsToCheck.push([newRow - 1, newCol], [newRow - 2, newCol]); newRow -= 2; break;
            case 'B': cellsToCheck.push([newRow + 1, newCol], [newRow + 2, newCol]); newRow += 2; break;
            default: return;
        }
    } else if (character.startsWith('H2')) {
        switch (direction) {
            case 'BR': cellsToCheck.push([newRow - 1, newCol - 1], [newRow - 2, newCol - 2]); newRow -= 2; newCol -= 2; break;
            case 'BL': cellsToCheck.push([newRow - 1, newCol + 1], [newRow - 2, newCol + 2]); newRow -= 2; newCol += 2; break;
            case 'FR': cellsToCheck.push([newRow + 1, newCol - 1], [newRow + 2, newCol - 2]); newRow += 2; newCol -= 2; break;
            case 'FL': cellsToCheck.push([newRow + 1, newCol + 1], [newRow + 2, newCol + 2]); newRow += 2; newCol += 2; break;
            default: return;
        }
    } else if (character.startsWith('H4')) {
        switch (direction) {
            case 'FL': cellsToCheck.push([newRow - 1, newCol - 1], [newRow - 2, newCol - 2]); newRow -= 2; newCol -= 2; break;
            case 'FR': cellsToCheck.push([newRow - 1, newCol + 1], [newRow - 2, newCol + 2]); newRow -= 2; newCol += 2; break;
            case 'BL': cellsToCheck.push([newRow + 1, newCol - 1], [newRow + 2, newCol - 2]); newRow += 2; newCol -= 2; break;
            case 'BR': cellsToCheck.push([newRow + 1, newCol + 1], [newRow + 2, newCol + 2]); newRow += 2; newCol += 2; break;
            default: return;
        }
    }

    cellsToCheck.forEach(([r, c]) => {
        if (r >= 0 && r < 5 && c >= 0 && c < 5) {
            const targetCell = grid[r][c];
            if (playerTurn === 1 && ["P4", "P5", "P6", "H3", "H4"].includes(targetCell)) {
                console.log(`Player 1 killed Player 2's character: ${targetCell}`);
                gameState.killedPlayer2Characters.push(targetCell);
                gameState.grid[r][c] = null;
            }
            if (playerTurn === 2 && ["P1", "P2", "P3", "H1", "H2"].includes(targetCell)) {
                console.log(`Player 2 killed Player 1's character: ${targetCell}`);
                gameState.killedPlayer1Characters.push(targetCell);
                gameState.grid[r][c] = null;
            }
        }
    });

    if (newRow >= 0 && newRow < 5 && newCol >= 0 && newCol < 5) {
        const targetCell = grid[newRow][newCol];
        if (targetCell === null) {
            console.log(`Moving ${character} to (${newRow}, ${newCol})`);
            gameState.grid[row][col] = null;
            gameState.grid[newRow][newCol] = character;
            gameState.playerTurn = playerTurn === 1 ? 2 : 1;
        } else {
            const errorMsg = "Invalid move. Target cell is occupied.";
            console.log("Invalid move:", errorMsg);
            ws.send(JSON.stringify({ type: 'INVALID_MOVE', reason: errorMsg }));
            return;
        }
    } else {
        const errorMsg = "Move out of bounds.";
        console.log("Invalid move:", errorMsg);
        ws.send(JSON.stringify({ type: 'INVALID_MOVE', reason: errorMsg }));
        return;
    }

    if (gameState.killedPlayer1Characters.length === 5) {
        broadcastGameOver(2);
    } else if (gameState.killedPlayer2Characters.length === 5) {
        broadcastGameOver(1);
    } else {
        console.log("Broadcasting updated game state:", gameState);
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'UPDATE', gameState }));
            }
        });
    }
}

function findCharacterPosition(character) {
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            if (gameState.grid[row][col] === character) {
                return [row, col];
            }
        }
    }
    return [-1, -1];
}

function broadcastGameOver(winner) {
    console.log(`Player ${winner} wins the game!`);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'WIN', winner }));
        }
    });
    resetGame();
}

function resetGame() {
    console.log("Resetting game state");
    gameState = {
        grid: Array(5).fill().map(() => Array(5).fill(null)),
        player1Characters: ["P1", "H1", "H2", "P2", "P3"],
        player2Characters: ["P4", "H3", "H4", "P5", "P6"],
        playerTurn: 1,
        killedPlayer1Characters: [],
        killedPlayer2Characters: []
    };
}
