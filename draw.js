import { Point, Direction, intdiv } from "./util.js";
import { Color, Symbol, Goal } from "./robots.js";

export function clearCanvas(canvas) {
	let ctx = canvas.getContext("2d");
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export const TILE_SIZE = 32;

export function getSymbolImage(symbol) {
	if (symbol == Symbol.Star) {
		return document.getElementById('star');
	} else if (symbol == Symbol.Moon) {
		return document.getElementById('moon');
	} else if (symbol == Symbol.Gear) {
		return document.getElementById('gear');
	} else if (symbol == Symbol.Saturn) {
		return document.getElementById('saturn');
	} else if (symbol == Symbol.Warp) {
		return document.getElementById('warp');
	} else {
		return null;
	}
}

export function getRobotImage(color) {
	if (color == Color.Yellow) {
		return document.getElementById('yellow');
	} else if (color == Color.Green) {
		return document.getElementById('green');
	} else if (color == Color.Red) {
		return document.getElementById('red');
	} else if (color == Color.Blue) {
		return document.getElementById('blue');
	} else {
		return null;
	}
}

export function getColorValue(color) {
	if (color == Color.Yellow) {
		return "#FFFF00";
	} else if (color == Color.Green) {
		return "#00FF00";
	} else if (color == Color.Red) {
		return "#FF2200";
	} else if (color == Color.Blue) {
		return "#0077FF";
	} else {
		return "#FFFFFF";
	}
}

export function drawGoal(goal, canvas, offset) {
	let ctx = canvas.getContext("2d");
	ctx.strokeStyle = "#000000";
	ctx.lineWidth = 2;
	ctx.fillStyle = getColorValue(goal.color);
	ctx.beginPath();
	ctx.arc(offset.x + 16, offset.y + 16, 13, 0, 2 * Math.PI);
	ctx.fill();
	ctx.stroke();
	let image = getSymbolImage(goal.symbol);
	if (image == null) {
		console.log("Here");
	}
	ctx.drawImage(image, offset.x, offset.y);
}

export function drawStartPoint(position, color, canvas, offset) {
	let ctx = canvas.getContext("2d");
	ctx.strokeStyle = getColorValue(color);
	ctx.lineWidth = 5;
	ctx.globalAlpha = 0.3;
	let currentDraw = position.mul(TILE_SIZE).add(offset).add(new Point(TILE_SIZE / 2, TILE_SIZE / 2));
	let radius = TILE_SIZE / 2.15;
	ctx.beginPath();
	ctx.arc(currentDraw.x, currentDraw.y, radius, 0, 2 * Math.PI);
	ctx.stroke();
	ctx.globalAlpha = 1.0;
}

export function drawBoard(board, canvas, offset = new Point(0, 0), drawBorder = false) {
	let ctx = canvas.getContext("2d");

	for (let y = 0; y < board.size.y; ++y) {
		for (let x = 0; x < board.size.x; ++x) {
			let cell = board.getCell(x, y);
			let cellPos = (new Point(x * TILE_SIZE, y * TILE_SIZE)).add(offset);
			ctx.lineWidth = 1;
			if (cell.fullyFenced()) {
				ctx.fillStyle = "#c3c3c3";
				ctx.fillRect(cellPos.x, cellPos.y, TILE_SIZE, TILE_SIZE);
			} else {
				ctx.strokeStyle = "#a0a0a0";
				ctx.strokeRect(cellPos.x, cellPos.y, TILE_SIZE, TILE_SIZE);
			}
		}
	}
	
	for (let y = 0; y < board.size.y; ++y) {
		for (let x = 0; x < board.size.x; ++x) {
			let cell = board.getCell(x, y);
			let cellPos = (new Point(x * TILE_SIZE, y * TILE_SIZE)).add(offset);
			let goal = cell.getGoal();
			
			if (goal != null) {
				drawGoal(goal, canvas, cellPos);
			}
		}
	}
	
	for (let y = 0; y < board.size.y; ++y) {
		for (let x = 0; x < board.size.x; ++x) {
			let cell = board.getCell(x, y);
			let cellPos = (new Point(x * TILE_SIZE, y * TILE_SIZE)).add(offset);
			Direction.allValues.forEach(function(i) {
                let isFence = cell.getFence(i);
                let isEdge = board.isEdge(new Point(x, y), i) && drawBorder;

				if (isFence || isEdge) {
					let center = cellPos.add(TILE_SIZE / 2, TILE_SIZE / 2);
					
					let dir = Point.fromDirection(i).mul(TILE_SIZE / 2);
					let left = Point.fromDirection(Direction.rotate90(i, -1)).mul(TILE_SIZE / 2 + 2);
					let right = Point.fromDirection(Direction.rotate90(i, 1)).mul(TILE_SIZE / 2 + 2);
					
					ctx.strokeStyle = "#777777";
                    if (isFence) {
                        ctx.strokeStyle = "#000000";
                    }
					ctx.lineWidth = 4;
					ctx.beginPath();
					let startPos = center.add(dir).add(left);
					let endPos = startPos.add(right.mul(2));
					ctx.moveTo(startPos.x, startPos.y);
					ctx.lineTo(endPos.x, endPos.y);
					ctx.stroke();
				}
			});
		}
	}
}

export function getMousePos(canvas, event) {
	let rect = canvas.getBoundingClientRect();
	return new Point(event.clientX - rect.left, event.clientY - rect.top);
}

export function getCellFromPos(mousePos) {
	return new Point(intdiv(mousePos.x, TILE_SIZE), intdiv(mousePos.y, TILE_SIZE));
}

export function getEdgeFromPos(mousePos) {
    let cell = getCellFromPos(mousePos);
    let cellMod = mousePos.sub(cell.mul(TILE_SIZE));
    let cellModInv = (new Point(TILE_SIZE, TILE_SIZE)).sub(cellMod);

    let listing = new Array(4);
    listing[Direction.Left] = cellMod.x;
    listing[Direction.Right] = cellModInv.x;
    listing[Direction.Up] = cellMod.y;
    listing[Direction.Down] = cellModInv.y;

    let minVal = Math.min(...listing);
    return listing.indexOf(minVal);
}