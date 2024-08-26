**5x5 Grid Game Backend**

This is the backend server implementation for a 5x5 grid-based game where two players deploy and move teams of characters. 
The backend handles the game logic, including character placement, movement, and combat, using WebSocket communication with the frontend.

**Features**

WebSocket Server: Handles real-time communication between the game server and clients.
Game State Management: Manages the game state, including the grid, character positions, and player turns.
Character Placement: Allows players to place characters on their starting row during the setup phase.
Character Movement: Supports various character movements based on the type of character (Pawn, Hero1, Hero2).
Combat Mechanics: Handles combat when a character moves into an opponent's character, removing the opponent's character from the game.
Game Over Handling: Detects when a player wins by eliminating all opponent characters and broadcasts the game-over state to all clients.

Installation
1) Clone this repository to your local machine: **git clone <repository-url>**
2) Navigate to the project directory: **cd 5x5-grid-game-backend**
3) Install the required dependencies: **npm install**

Running the Server
To start the WebSocket server, run: **node server.js**
(The server will start on ws://localhost:3001)
