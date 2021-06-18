
let active = true;
let gameState = ["", "", "", "", "", "", "", "", ""];

const winningMessage = () => `Player ${currentPlayer} has won!`;
const drawMessage = () => `It's a draw!`;
const Pturn = () => `It's ${currentPlayer}'s turn`;

var currentPlayer = "X";

window.onload = (event) => {
	document.querySelectorAll('.cell').forEach(cell => cell.addEventListener('click', cell_click));
	document.querySelector('.t-t-t-restart').addEventListener('click', handleRestartGame);

	var statusDisplay = document.querySelector('.status');

	statusDisplay.innerHTML = Pturn();
};

function cell_click(eventCell) {

	const clickedCell = eventCell.target;

	const index = parseInt(clickedCell.getAttribute('index'));

	if (gameState[index] !== "" || !active) {
		return;
	}
	gameState[index] = currentPlayer;
	clickedCell.innerHTML = currentPlayer;
	validateResult();
}

function validateResult() {
	var status = document.querySelector('.status');

	let roundWon = false;
	for (let i = 0; i <= 7; i++) {
		const winCondition = winningConditions[i];
		let a = gameState[winCondition[0]];
		let b = gameState[winCondition[1]];
		let c = gameState[winCondition[2]];
		if (a === '' || b === '' || c === '') {
			continue;
		}
		if (a === b && b === c) {
			roundWon = true;
			break
		}
	}
	if (roundWon) {
		status.innerHTML = winningMessage();
		active = false;
		return;
	}
	let roundDraw = !gameState.includes("");
	if (roundDraw) {
		status.innerHTML = drawMessage();
		active = false;
		return;
	}

	var statusDisplay = document.querySelector('.status');

	currentPlayer = currentPlayer === "X" ? "O" : "X";
	statusDisplay.innerHTML = Pturn();
}

function handleRestartGame() {
	var statusDisplay = document.querySelector('.status');

	active = true;
	currentPlayer = "X";
	gameState = ["", "", "", "", "", "", "", "", ""];
	statusDisplay.innerHTML = Pturn();
	document.querySelectorAll('.cell')
		.forEach(cell => cell.innerHTML = "");
}
const winningConditions = [
	[0, 1, 2],
	[3, 4, 5],
	[6, 7, 8],
	[0, 3, 6],
	[1, 4, 7],
	[2, 5, 8],
	[0, 4, 8],
	[2, 4, 6]
];