const contractAddress = 'YOUR_CONTRACT_ADDRESS';  // Add your deployed contract address
const contractABI = [ /* Add your contract ABI here */ ];

let web3;
let gameContract;
let currentAccount;
let currentGameId;

window.addEventListener('load', async () => {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      currentAccount = (await web3.eth.getAccounts())[0];
      document.getElementById("gameStatus").innerText = "Connected account: " + currentAccount;
    } catch (error) {
      console.error("User denied account access", error);
    }
  } else {
    console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
  }

  // Load the contract
  gameContract = new web3.eth.Contract(contractABI, contractAddress);

  // Initialize event listeners
  document.getElementById("createGame").addEventListener('click', createGame);
  document.getElementById("joinGame").addEventListener('click', joinGame);

  initializeBoard();
});

function initializeBoard() {
  const cells = document.querySelectorAll('.cell');
  cells.forEach(cell => {
    cell.addEventListener('click', async () => {
      const row = cell.getAttribute('data-row');
      const col = cell.getAttribute('data-col');
      await makeMove(row, col);
    });
  });
}

async function createGame() {
  try {
    const result = await gameContract.methods.createGame().send({ from: currentAccount });
    currentGameId = result.events.GameCreated.returnValues.gameId;
    document.getElementById("currentGame").innerText = "Current Game ID: " + currentGameId;
    document.getElementById("gameStatus").innerText = "Game created. Waiting for another player to join.";
  } catch (error) {
    console.error("Error creating game", error);
  }
}

async function joinGame() {
  try {
    const gameId = prompt("Enter the Game ID to join:");
    await gameContract.methods.joinGame(gameId).send({ from: currentAccount });
    currentGameId = gameId;
    document.getElementById("currentGame").innerText = "Current Game ID: " + currentGameId;
    document.getElementById("gameStatus").innerText = "Joined game. It's your turn if you're Player 2.";
    updateBoard();
  } catch (error) {
    console.error("Error joining game", error);
  }
}

async function makeMove(row, col) {
  if (!currentGameId) {
    alert("Please create or join a game first.");
    return;
  }
  try {
    await gameContract.methods.makeMove(currentGameId, row, col).send({ from: currentAccount });
    updateBoard();
    updateGameStatus();
  } catch (error) {
    console.error("Error making move", error);
  }
}

async function updateBoard() {
  const boardState = await gameContract.methods.games(currentGameId).call();
  const board = boardState.board;

  const cells = document.querySelectorAll('.cell');
  cells.forEach(cell => {
    const row = cell.getAttribute('data-row');
    const col = cell.getAttribute('data-col');
    const value = board[row][col];

    if (value == '1') {
      cell.innerText = 'X';
    } else if (value == '2') {
      cell.innerText = 'O';
    } else {
      cell.innerText = '';
    }
  });
}

async function updateGameStatus() {
  const game = await gameContract.methods.games(currentGameId).call();
  const { player1, player2, currentPlayer, gameEnded, winner } = game;

  if (gameEnded) {
    if (winner === "0x0000000000000000000000000000000000000000") {
      document.getElementById("gameStatus").innerText = "It's a draw!";
    } else {
      document.getElementById("gameStatus").innerText = "Player " + winner + " won!";
    }
  } else {
    const currentPlayerAddress = currentPlayer == '0' ? player1 : player2;
    document.getElementById("gameStatus").innerText = `Current turn: ${currentPlayerAddress}`;
  }
}
