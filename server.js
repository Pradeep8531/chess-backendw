const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let gameState = {
    grid: [
        Array(5).fill(null),
        Array(5).fill(null),
        Array(5).fill(null),
        Array(5).fill(null),
        Array(5).fill(null)
    ],
    player1Characters: ["P1", "H1", "H2", "P2", "P3"],
    player2Characters: ["P4", "H3", "H4", "P5", "P6"],
    playerTurn: 1,
    killedPlayer1Characters: [],
    killedPlayer2Characters: []
};

app.use(express.static('public'));

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.send(JSON.stringify({
        type: 'INIT',
        gameState
    }));

    ws.on('message', (message) => {
        console.log(`Received message: ${message}`);
        const parsedMessage = JSON.parse(message);

        if (parsedMessage.type === 'MOVE') {
            // Update the game state based on the move
            const { character, direction, playerTurn } = parsedMessage;
            const newGrid = [...gameState.grid];
            const [row, col] = findCharacterPosition(character, newGrid);

            if (row !== -1 && col !== -1) {
                let newRow = row;
                let newCol = col;
                let cellsToCheck = [];

                if (character.startsWith('P')) {
                    switch (direction) {
                        case 'L': newCol -= 1; break;
                        case 'R': newCol += 1; break;
                        case 'F': newRow -= 1; break;
                        case 'B': newRow += 1; break;
                        default: break;
                    }
                } else if (character.startsWith('H')) {
                    switch (direction) {
                        case 'R': newCol += 1; break;
                        case 'L': newCol -= 1; break;
                        case 'F': newRow -= 1; break;
                        case 'B': newRow += 1; break;
                        default: break;
                    }
                }

                if (newRow >= 0 && newRow < 5 && newCol >= 0 && newCol < 5) {
                    const cell = newGrid[newRow][newCol];
                    if (cell && cell !== character) {
                        if (playerTurn === 1) {
                            gameState.killedPlayer2Characters.push(cell);
                        } else {
                            gameState.killedPlayer1Characters.push(cell);
                        }
                        newGrid[newRow][newCol] = character;
                        newGrid[row][col] = null;
                    }
                }

                gameState.grid = newGrid;
                gameState.playerTurn = playerTurn === 1 ? 2 : 1;

                if (gameState.killedPlayer1Characters.length === 5) {
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'WIN',
                                winner: 'Player 2'
                            }));
                        }
                    });
                } else if (gameState.killedPlayer2Characters.length === 5) {
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'WIN',
                                winner: 'Player 1'
                            }));
                        }
                    });
                } else {
                    wss.clients.forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'UPDATE',
                                gameState
                            }));
                        }
                    });
                }
            }
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

function findCharacterPosition(character, grid) {
    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[i].length; j++) {
            if (grid[i][j] === character) {
                return [i, j];
            }
        }
    }
    return [-1, -1];
}

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
