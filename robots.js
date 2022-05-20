import { isupper, intdiv, Direction, Point, makeEnum, arrayRemove, Mulberry32, arrayFind, intcmp, shuffle, isAnyOf, isHexDigit } from './util.js';

/// Global Contants

export const Symbol = makeEnum(["Star", "Moon", "Gear", "Saturn", "Warp"]);
export const Color = makeEnum(["Yellow", "Green", "Red", "Blue"]);
export const State = makeEnum(['Start', 'Bid', 'Solve', 'Demo', 'Free', 'End']);

export class Goal {
	constructor(color = null, symbol = null) {
		Object.defineProperty(this, 'color', { 'value': color });
		Object.defineProperty(this, 'symbol', { 'value': symbol });
	}
	
	static extractSymbol(value) {
		if (value == -1) {
			return null;
		}
		return intdiv(value, 4);
	}
	
	static extractColor(value) {
		if (value == -1) {
			return null;
		} else if (value == Symbol.Warp * 4) {
			return null;
		}
		return value % 4;
	}
	
	static fromInt(goalInt) {
		return new Goal(Goal.extractColor(goalInt), Goal.extractSymbol(goalInt));
	}
	
	static fromCharacter(c) {
		if (c != ' ') {
			if (c == 'W') {
				return new Goal(null, Symbol.Warp);
			} else if (isHexDigit(c)) {
				let goalInt = parseInt(c, 16);
				return Goal.fromInt(goalInt);
			}
		}
		return null;
	}

	toCharacter() {
		if (this.symbol == Symbol.Warp) {
			return 'W';
		} else {
			return this.toInt().toString(16).toUpperCase();
		}
	}
	
	equals(other) {
		if (other == null) {
			return false;
		}
		return this.color == other.color && this.symbol == other.symbol;
	}
	
	toInt() {
		return this.symbol * 4 + this.color;
	}
	
	toString() {
		if (this.symbol == Symbol.Warp) {
			return "(Warp)";
		} else {
			return `(${Color.str(this.color)},${Symbol.str(this.symbol)})`;
		}
	}
}

export class Bumper {
	constructor(color = null, slant = false) {
		Object.defineProperty(this, 'color', { 'value': color });
		Object.defineProperty(this, 'slant', { 'value': slant });
	}

	static getColorMap() {
		let colorMap = new Array(Color.allValues.length);
		colorMap[Color.Yellow] = 'y';
		colorMap[Color.Red] = 'r';
		colorMap[Color.Blue] ='u';
		colorMap[Color.Green] = 'g';
		return colorMap;
	}

	static getReverseColorMap() {
		let colorMap = Bumper.getColorMap();
		let obj = {};
		for (let i = 0; i < colorMap.length; ++i) {
			obj[colorMap[i]] = i;
		}
		return obj;
	}

	static fromInt(value) {
		let slant = false;
		if (value >= Color.allValues.length) {
			value -= Color.allValues.length;
			slant = true;
		}

		if (value >= 0 && value < Color.allValues.length) {
			return new Bumper(value, slant);
		}
		return null;
	}

	toInt() {
		let value = this.color;
		if (this.slant) {
			value += Color.allValues.length;
		}
		return value;
	}

	static fromCharacter(c) {
		let colorMap = Bumper.getReverseColorMap();

		for (let i = 0; i < Color.allValues.length; ++i) {
			let color = colorMap[c.toLowerCase()];
			if (color !== undefined) {
				return new Bumper(color, isupper(c));
			}
		}
		return null;
	}

	toCharacter() {
		let colorMap = Bumper.getColorMap();
		let ch = colorMap[this.color];
		if (this.slant) {
			ch = ch.toUpperCase();
		}
		return ch;
	}

	equals(other) {
		if (other == null) {
			return false;
		}
		return this.color == other.color && this.slant == other.slant;
	}

	rotate90(iterations = 1) {
		if (iterations % 2 == 1) {
			return new Bumper(this.color, !this.slant);
		} else {
			return this;
		}
	}

	toString() {
		return Color.str(this.color) + (this.slant ? " /" : " \\")
	}
}

export class RobotState {
	constructor(robots, warp = false, depth = 0) {
		if (warp) {
			let sorted = [...robots];
			sorted.sort(intcmp);
			Object.defineProperty(this, 'robots', { 'value': sorted });
		} else {
			let sorted = robots.slice(1);
			sorted.sort(intcmp);
			Object.defineProperty(this, 'robots', { 'value': sorted });
			this.robots.unshift(robots[0]);
		}
		this.depth = depth;
	}
	
	activeRobot() {
		return this.robots[0];
	}
	
	inactiveRobots() {
		return this.robots.slice(1);
	}
	
	toString() {
		return this.robots.join(':');
	}
}

export class RobotMove {
	constructor(position, direction, previous = null, color = null) {
		Object.defineProperty(this, 'position', { 'value': position });
		Object.defineProperty(this, 'direction', { 'value': direction });
		Object.defineProperty(this, 'previous', { 'value': previous });
		this.color = color;
	}
	
	toString() {
		return `(${this.position},${Direction["str"](this.direction)})`
	}
}

export class Cell {
	constructor(goal = null, bumper = null) {
		Object.defineProperty(this, 'fences', { 'value': [false, false, false, false] });
		this.goal = goal;
		this.bumper = bumper;
	}

	static parseCell(s) {
		let result = new Cell();
		result.fromString(s);
		return result;
	}

	fromString(s) {
		this.goal = Goal.fromCharacter(s[0]);
		this.bumper = Bumper.fromCharacter(s[0]);
		let fence = 0;
		if (s[1] != ' ') {
			fence = parseInt(s[1], 16);
		}
		let cell = this;
		Direction.allValues.forEach(function(i) {
			cell.setFence(i, (fence & 1 << i) != 0);
		});
	}
	
	toString() {
		let result = '';
		if (this.goal != null) {
			result += this.goal.toCharacter();
		} else if (this.bumper != null) {
			result += this.bumper.toCharacter();
		} else {
			result += ' ';
		}
		let fenceInt = this.getFenceInt();
		if (fenceInt == 0) {
			result += ' ';
		} else {
			result += fenceInt.toString(16).toUpperCase();
		}
		return result;
	}

	getFenceInt() {
		let fenceInt = 0;
		let cell = this;
		Direction.allValues.forEach(function(i) {
			if (cell.getFence(i)) {
				fenceInt |= (1 << i);
			}
		});

		return fenceInt;
	}

	getGoal() {
		return this.goal;
	}
	
	setGoal(goal) {
		this.goal = goal;
	}

	getBumper() {
		return this.bumper;
	}
	
	setBumper(bumper) {
		this.bumper = bumper;
	}
	
	getFence(direction) {
		return this.fences[direction];
	}
	
	setFence(direction, value) {
		this.fences[direction] = value;
	}
	
	setFences(fences) {
		for (let i = 0; i < 4; ++i) {
			this.fences[i] = fences[i];
		}
	}
	
	fullyFenced() {
		for (let i = 0; i < 4; ++i) {
			if (!this.getFence(i)) {
				return false;
			}
		}
		return true;
	}
	
	rotate90(rotation = 1) {
		return this.clone(rotation);
	}
	
	clone(rotation = 0) {
		let cell = new Cell(this.goal, this.bumper == null ? null : this.bumper.rotate90(rotation));
		Direction.allValues.forEach(function(i) {
			cell.setFence(Direction.rotate90(i, rotation), this.getFence(i));
		}, this);
		return cell;
	}
}

export class Board {
	constructor(width, height) {
		Object.defineProperty(this, 'points', { 'value': new Array(width * height) });
		Object.defineProperty(this, 'size', { 'value': new Point(width, height) });
		Object.defineProperty(this, 'width', { 'value': width });
		Object.defineProperty(this, 'height', { 'value': height });
		
		for (let y = 0; y < height; ++y) {
			for (let x = 0; x < width; ++x) {
				this.setCell(x, y, new Cell());
			}
		}
	}
	
	static parseBoard(s) {
		let width = 0;
		while (s[width] != '\n') {
			++width;
		}
		width /= 2;
		let height = s.count('\n');
		let board = new Board(width, height);
		
		let currentChar = 0;
		for (let y = 0; y < height; ++y) {
			for (let x = 0; x < width; ++x) {
				let cell = board.getCell(x, y);
				cell.fromString(s.substr(currentChar, 2));
				currentChar += 2;
			}
			++currentChar;
		}
		
		return board;
	}

	toString() {
		let result = '';
		for (let y = 0; y < this.height; ++y) {
			for (let x = 0; x < this.width; ++x) {
				let cell = this.getCell(x, y);
				result += cell.toString();
			}
			result += '\n';
		}
		return result;
	}
	
	indexify(x, y) {
		return (y * this.size.x) + x;
	}
	
	deindexify(idx) {
		return new point(idx % this.size.x, intdiv(idx, this.size.x));
	}
	
	setCell(...args) {
		if (args.length == 3) {
			this.points[this.indexify(args[0], args[1])] = args[2];
		} else {
			this.setCell(args[0].x, args[0].y, args[1]);
		}
	}
	
	getCell(...args) {
		if (args.length == 2) {
			if (this.contains(...args)) {
				return this.points[this.indexify(args[0], args[1])];
			}
			return null;
		} else {
			return this.getCell(args[0].x, args[0].y);
		}
	}
	
	findGoal(goal) {
		for (let y = 0; y < this.height; ++y) {
			for (let x = 0; x < this.width; ++x) {
				let cell = this.getCell(x, y);
				if (goal.equals(cell.goal)) {
					return new Point(x, y);
				}
			}
		}
		console.assert(false, "Could not find goal %s", goal);
		return null;
	}
	
	contains(...args) {
		if (args.length == 2) {
			return args[0] >= 0 && args[0] < this.width && args[1] >= 0 && args[1] < this.height;
		} else {
			return this.contains(args[0].x, args[0].y)
		}
	}

	isEdge(point, direction) {
		return (point.y == 0 && direction == Direction.Up) ||
				(point.y == this.size.y - 1 && direction == Direction.Down) ||
				(point.x == 0 && direction == Direction.Left) ||
				(point.x == this.size.x - 1 && direction == Direction.Right);
	}

	hasFenceAt(p, direction) {
		return this.hasFenceBetween(p, p.add(Point.fromDirection(direction)));
	}

	setFenceAt(p, direction, value) {
		this.setFenceBetween(p, p.add(Point.fromDirection(direction)), value);
	}
	
	hasFenceBetween(p0, p1) {
		if (!(this.contains(p0) || !this.contains(p1))) {
			return true;
		}
		
		let dirTo1 = (p1.sub(p0)).getDirection();
		let dirTo0 = (p0.sub(p1)).getDirection();

		let cell0 = this.getCell(p0);
		if (cell0 != null && cell0.getFence(dirTo1)) {
			return true;
		}

		let cell1 = this.getCell(p1);
		if (cell1 != null && cell1.getFence(dirTo0)) {
			return true;
		}
		
		return false;
	}

	setFenceBetween(p0, p1, value) {
		if (!(this.contains(p0) || !this.contains(p1))) {
			return;
		}
		
		let dirTo1 = (p1.sub(p0)).getDirection();
		let dirTo0 = (p0.sub(p1)).getDirection();

		let cell0 = this.getCell(p0);
		if (cell0 != null) {
			this.getCell(p0).setFence(dirTo1, value);
		}

		let cell1 = this.getCell(p1);
		if (cell1 != null) {
			this.getCell(p1).setFence(dirTo0, value);
		}
	}
	
	isMoveBlocked(p0, p1) {
		return !this.contains(p0) || !this.contains(p1) || this.hasFenceBetween(p0, p1);
	}
	
	rotate90(iterations) {
		while (iterations < 0) {
			iterations += 4;
		}
		
		let result = null;
		
		if (iterations % 2 == 0) {
			result = new Board(this.width, this.height);
		} else {
			result = new Board(this.height, this.width);
		}
		
		for (let y = 0; y < this.height; ++y) {
			for (let x = 0; x < this.width; ++x) {
				let location = new Point(x, y);
				let cell = this.getCell(x, y);
				result.setCell(location.rotate90(this.size, iterations), cell.rotate90(iterations));
			}
		}
		
		return result;
	}
	
	static pasteBoards(boards) {
		let fullHeight = 0;
		let fullWidth = 0;
		for (let y = 0; y < boards.length; ++y) {
			fullHeight += boards[y][0].height;
			if (y == 0) {
				for (let x = 0; x < boards[y].length; ++x) {
					fullWidth += boards[y][x].width;
				}
			}
		}
		
		let result = new Board(fullWidth, fullHeight);
		
		let currentYBase = 0;
		for (let yBoard = 0; yBoard < boards.length; ++yBoard) {
			let currentXBase = 0;
			for (let xBoard = 0; xBoard < boards[yBoard].length; ++xBoard) {
				let currentBoard = boards[yBoard][xBoard];
			
				for (let y = 0; y < currentBoard.height; ++y) {
					for (let x = 0; x < currentBoard.width; ++x) {
						result.setCell(currentXBase + x, currentYBase + y, currentBoard.getCell(x, y).clone());
					}
				}
				
				currentXBase += currentBoard.width;
			}
			
			currentYBase += boards[yBoard][0].height;
		}
	
		return result;
	}
	
	doMove(robots, robotIdx, moveDir, outList = null) {
		let blocked = false;
		let robotPos = robots[robotIdx];

		console.assert(!isNaN(robotPos.x));
		console.assert(!isNaN(robotPos.y));

		let delta = Point.fromDirection(moveDir);
		
		console.assert(!isNaN(delta.x));
		console.assert(!isNaN(delta.y));

		if (outList != null) {
			outList.length = 0;
			outList.push(robotPos);
		}

		while (!blocked) {
			let nextPos = robotPos.add(delta);
			
			if (nextPos.equals(robots[robotIdx])) {
				return robots[robotIdx];
			}
			
			blocked = this.isMoveBlocked(robotPos, nextPos);
			if (!blocked) {
				for (let i = 0; i < robots.length; ++i) {
					if (robots[i].equals(nextPos)) {
						// TODO: maybe implement motion-transfer robots as an optional thing?
						blocked = true;
						break;
					}
				}
			}
			
			if (blocked) {
				let cell = this.getCell(robotPos);
				if (cell.bumper != null) {
					if (outList != null) {
						outList.length = 0;
					}
					robotPos = robots[robotIdx];
				}
				break;
			}

			console.assert(this.contains(nextPos));

			robotPos = nextPos;

			let cell = this.getCell(robotPos);
			if (cell.bumper != null && cell.bumper.color != robotIdx) {
				if (outList != null) {
					outList.push(robotPos);
				}
				moveDir = Direction.bumperSlant(moveDir, cell.bumper.slant);
				delta = Point.fromDirection(moveDir);
			}
		}

		if (outList != null) {
			if (!(outList.length == 1 && outList[0] == robotPos)) {
				outList.push(robotPos);
			}
		}
		return robotPos;
	}
}

export function dumpSolution(board, originalRobots, finalState, stateTree) {
	let currentState = finalState;
	let moves = [];
	
	while (currentState != null) {
		console.assert(currentState in stateTree);
		
		let prevMove = stateTree[currentState];
		if (prevMove == null) {
			break;
		}
		
		moves.push(prevMove);
		currentState = prevMove.previous;
	}
	
	moves.reverse();
	
	// Need to fill in the color information for the concrete solution now
	let currentRobots = [...originalRobots];
	
	for (let i = 0; i < moves.length; ++i) {
		moves[i].color = arrayFind(currentRobots, moves[i].position);
		currentRobots[moves[i].color] = board.doMove(currentRobots, moves[i].color, moves[i].direction);
	}
	
	return moves;
}
	
export function solveBoard(board, goal, robots, earlyOut = null) {
	let botCopy = [...robots]
	let isWarp = goal.symbol == Symbol.Warp;
	if (!isWarp) {
		// Move the active robot to the front of the list
		[botCopy[0], botCopy[goal.color]] = [botCopy[goal.color], botCopy[0]]
	}
	
	let startingState = new RobotState(botCopy, isWarp);
	let visitedStates = {};
	visitedStates[startingState] = null;
	
	let queue = [startingState];
	let goalPos = board.findGoal(goal);
	
	// TODO: need to check for _all_ robots for the warp tile
	if (startingState.activeRobot().equals(goalPos)) {
		if (earlyOut != null) {
			return null;
		}
		return dumpSolution(startingState, visitedStates);
	}
	
	while (queue.length > 0) {
		let state = queue.shift();
		console.assert(state.robots.length >= 1);
		console.assert(state in visitedStates);
		console.assert(!state.activeRobot().equals(goalPos));

		for (let robot = 0; robot < state.robots.length; ++robot) {
			for (let dir = 0; dir < 4; ++dir) {
				let result = board.doMove(state.robots, robot, dir);
				// No change, don't process
				if (result.equals(state.robots[robot])) {
					continue;
				}
				
				let robotPositions = [...state.robots]
				robotPositions[robot] = result;
				let nextState = new RobotState(robotPositions, isWarp, state.depth + 1);
				// Already processed this state, skipping
				if (nextState in visitedStates) {
					continue;
				}
				
				visitedStates[nextState] = new RobotMove(state.robots[robot], dir, state);
				
				// TODO: disallow solutions of 1 move, and require the horizontal+vertical rule
				
				if ((robot == 0 || isWarp) && result.equals(goalPos)) {
					// Found solution (if we ever do the motion-transfer version, will need to always the new position for the active robot)
					return dumpSolution(board, robots, nextState, visitedStates);
				}
				
				// Don't push solutions past a certain depth
				if (earlyOut != null && earlyOut >= nextState.depth) {
					continue;
				}

				queue.push(nextState);
			}
		}
	}
	return null;
};

export function generateRobotPlacement(board, rand) {
	let testedSpots = {}
	
	let result = []
	
	while (result.length < 4) {
		let point = rand.randPoint(0, board.width, 0, board.height);
		
		if (point in testedSpots) {
			continue;
		}
		
		let cell = board.getCell(point);

		testedSpots[point] = result.length;
		
		if (cell.fullyFenced() || cell.goal != null || cell.bumper != null) {
			continue;
		}
		
		result.push(point);
	}
	
	return result;
}

export let boardSets = [
	[
		'           1    \n' + 
		'   8        08 1\n' + 
		'  91            \n' + 
		'                \n' + 
		'             8  \n' + 
		' 8          F  1\n' + 
		'      69        \n' + 
		'               F\n',
		'   4 1   8      \n' + 
		'   8   463      \n' + 
		'  96 1          \n' + 
		'            0C 1\n' + 
		'             2  \n' + 
		' 8              \n' + 
		' 2   4F9        \n' + 
		'       2       F\n',
		'           4 1  \n' + 
		'        G       \n' + 
		'   8            \n' + 
		' 463            \n' + 
		'            0C 1\n' + 
		' 8   8       2  \n' + 
		' 2  96F9        \n' + 
		'       2  y    F\n',
		'   4 1 8        \n' + 
		'     493        \n' + 
		'                \n' + 
		'            0C 1\n' + 
		' 469         2  \n' + 
		'   2     8      \n' + 
		' 8      F6 1    \n' + 
		' 2             F\n',
	],
	[
		'           1    \n' + 
		'    r        8  \n' + 
		'     8     483  \n' + 
		'    76D9        \n' + 
		'       2        \n' + 
		'  2C 1          \n' + 
		' 8 2  g         \n' + 
		' 2        WC 1 F\n',
		'         4 1    \n' + 
		'    2C 1        \n' + 
		'     2          \n' + 
		' 4D9         8  \n' + 
		' 8 2       483  \n' + 
		' 2         8    \n' + 
		'          76 1  \n' + 
		'      WC 1     F\n',
		'       4 1      \n' + 
		'           479  \n' + 
		'   8         2  \n' + 
		'  86 1     8    \n' + 
		'         4D3    \n' + 
		'    2C 1      WC\n' + 
		' 8   2         2\n' + 
		' 2             F\n',
		'     4 1        \n' + 
		'         479    \n' + 
		'           2  WC\n' + 
		' 8             2\n' + 
		' 2    2C 1   8  \n' + 
		'   8   2   453  \n' + 
		'  86 1          \n' + 
		'               F\n',
	],
	[
		'         4 1    \n' + 
		'        u       \n' + 
		' 8          3C  \n' + 
		' 2   8      y2  \n' + 
		'    56A9        \n' + 
		'       2   8    \n' + 
		'         4C3    \n' + 
		'               F\n',
		'   4 1   8      \n' + 
		'        56 1    \n' + 
		'                \n' + 
		' 4A9            \n' + 
		'   2       8    \n' + 
		' 8       4C3    \n' + 
		' 2    3C 1      \n' + 
		'       2       F\n',
		'       4 1      \n' + 
		' 4A9         8  \n' + 
		'   2        56 1\n' + 
		'                \n' + 
		'    3C 1       8\n' + 
		' 8   2       4C3\n' + 
		' 2              \n' + 
		'               F\n',
		'       4 1      \n' + 
		'                \n' + 
		'          3C 1  \n' + 
		'     8     2    \n' + 
		' 8  56 1        \n' + 
		' 2 8         4A9\n' + 
		' 4C3           2\n' + 
		'               F\n',
	],
	[
		'     4 1        \n' + 
		'    U        8  \n' + 
		'          1C43  \n' + 
		'           2    \n' + 
		'              r \n' + 
		' 4E9            \n' + 
		' 8 2     8      \n' + 
		' 2      B6 1   F\n',
		'           4 1  \n' + 
		'       8        \n' + 
		'     443        \n' + 
		' 8   8   4B9    \n' + 
		' 2  E6 1   2    \n' + 
		'        1C 1    \n' + 
		'         2      \n' + 
		'               F\n',
		'       4 1      \n' + 
		'          1C 1  \n' + 
		' 4E9       2    \n' + 
		' 8 2         8  \n' + 
		' 2         443  \n' + 
		'     8          \n' + 
		'    B6 1        \n' + 
		'               F\n',
		'     8   4 1    \n' + 
		'   443          \n' + 
		'                \n' + 
		'           4B9  \n' + 
		' 8       8   2  \n' + 
		' 2      E6 1    \n' + 
		'  1C 1          \n' + 
		'   2           F\n',
	],
];

export function generateBoard(seed = 0) {
	let baseBoard = new Board(4, 4);
	baseBoard.getCell(0, 0).setFence(0, true);

	let rand = new Mulberry32(seed);
	let boards = []

	for (let i = 0; i < 4; ++i) {
		boards.push(boardSets[i][rand.randInt(0, boardSets[i].length - 1)]);
	}

	shuffle(boards, rand.randRaw());

	let result = Board.pasteBoards(
		[
			[Board.parseBoard(boards[0]).rotate90(0), Board.parseBoard(boards[3]).rotate90(1)], 
			[Board.parseBoard(boards[1]).rotate90(3), Board.parseBoard(boards[2]).rotate90(2)]
		]
	);
	
	return result;
}

export class Player {
	constructor(id, name) {
		Object.defineProperty(this, 'id', { 'value': id });
		this.name = name;
		this.vote = null;
		Object.defineProperty(this, 'tokens', { 'value': new Array() });
	}
	
	scoreGoal(goal) {
		this.tokens.push(goal);
	}
	
	getScore() {
		return this.tokens.length;
	}
}

export class PlayerBid {
	constructor(playerId, amount, timestamp) {
		Object.defineProperty(this, 'playerId', { 'value': playerId });
		this.amount = amount;
		this.timestamp = timestamp;
	}

	static compare(lhs, rhs) {
		if (lhs.amount == rhs.amount) {
			return lhs.timestamp - rhs.timestamp;
		} else {
			return lhs.amount - rhs.amount;
		}
	}
}

export class Game {
	constructor() {
		// Settings:
		this.allowMultipleBids = false;
		this.bidTimeout = 60.0;
		this.solveTimeout = 60.0;
		this.earlyOut = 2;
		
		this.players = {};
		this.timerCountdown = null;
		
		this.resetGame(4, 0);
	}
	
	resetGame(numRobots, boardSeed) {
		this.seed = boardSeed;
		this.rand = new Mulberry32(boardSeed);
		this.board = generateBoard(this.rand.randRaw());
		this.robots = [];
		for (let i = 0; i < 4; ++i) {
			this.robots.push(new Point(i, 0));
		}
		
		this.goalsRemaining = []
		for (let i = 0; i <= 16; ++i) {
			this.goalsRemaining.push(Goal.fromInt(i));
		}
		
		this.state = State.Start;
		this.currentGoal = null;
		
		this.originalRobotConfig = null;
		this.playerBids = [];
		this.currentSolveBid = null;
	}
	
	getNewPlayerKey() {
		let keys = Object.keys(this.players);
		let maxKey = 0;
		for (let i = 0; i < keys.length; ++i) {
			maxKey = Math.max(maxKey, keys[i]);
		}
		
		++maxKey;
		return maxKey
	}

	getNumPlayers() {
		return Object.keys(this.players).length;
	}
	
	getPlayer(playerId) {
		return this.players[playerId];
	}

	addPlayer(defaultName = null, forceId = null) {
		if (forceId == null) {
			forceId = this.getNewPlayerKey();
		}

		this.players[forceId] = new Player(forceId, defaultName);

		return forceId;
	}

	getPlayers(sorted = false) {
		let players = [];
		for (let playerId in this.players) {
			players.push(this.players[playerId]);
		}

		if (sorted) {
			players.sort(function(x, y) {
				return x.tokens.length - y.tokens.length;
			});
		}

		return players;
	}

	giveToken(playerId, ...tokens) {
		let targetPlayer = this.getPlayer(playerId);
		for (let i = 0; i < tokens.length; ++i) {
			let goal = tokens[i];
			arrayRemove(this.goalsRemaining, goal);
			if (targetPlayer.tokens.indexOf(goal) == -1) {
				targetPlayer.tokens.push(goal);
			}
		}
		
	}

	giveTokens(playerId, tokens) {
		this.giveToken(playerId, ...tokens);
	}
	
	makeValidName(name) {
		if (this.isNameAllowed(name)) {
			return name;
		}
		let modName = name;
		let sequence = 1;
		do {
			modName = `${name}${sequence}`
			++sequence;
		} while (!this.isNameAllowed(modName));
		return modName;
	}
	
	isNameAllowed(name) {
		let keys = Object.keys(this.players);
		for (let i = 0; i < keys.length; ++i) {
			if (name == this.players[keys[i]].name) {
				return false;
			}
		}
		return true;
	}
	
	renamePlayer(playerId, name) {
		this.players[playerId].name = name;
		return name;
	}
	
	removePlayer(playerId) {
		if (this.players[playerId] !== undefined) {
			// TODO: return unused tokens to the pool?
			delete this.players[playerId];
		}
		this.removeBid(playerId);
	}
	
	rearrangeRobots() {
		this.robots = generateRobotPlacement(this.board, this.rand);
	}
	
	getState() {
		return this.state;
	}
	
	playerAllowedMove(playerId) {
		if (isAnyOf(this.state, State.End, State.Free)) {
			return true;
		} else if (this.state == State.Solve) {
			return this.getSolvingPlayer() != null && playerId != null && this.getSolvingPlayer() == playerId;
		}
		return false;
	}
	
	getSolvingPlayer() {
		if (this.state == State.Solve && this.currentSolveBid != null && this.currentSolveBid < this.playerBids.length) {
			return this.playerBids[this.currentSolveBid].playerId;
		}
		return null;
	}
	
	moveRobot(robotId, direction, outMoves = null) {
		this.robots[robotId] = this.board.doMove(this.robots, robotId, direction, outMoves);
		return this.robots[robotId];
	}
	
	getRobotPositions() {
		let result = []
		for (let i = 0; i < this.robots.length; ++i) {
			result.push(this.robots[i]);
		}
		return result;
	}
	
	setRobotPositions(positions) {
		for (let i = 0; i < this.robots.length; ++i) {
			this.robots[i] = positions[i];
		}
	}
	
	resetRobotPositions() {
		console.assert(this.originalRobotConfig != null);
		this.setRobotPositions(this.originalRobotConfig);
	}
	
	autoResetRobots() {
		if (this.originalRobotConfig == null) {
			this.originalRobotConfig = this.getRobotPositions();
		} else {
			this.robots = []
			for (let i = 0; i < this.originalRobotConfig.length; ++i) {
				this.robots.push(this.originalRobotConfig[i]);
			}
		}
	}
	
	getBid(playerId) {
		for (let i = 0; i < this.playerBids.length; ++i) {
			if (this.playerBids[i].playerId == playerId) {
				return this.playerBids[i];
			}
		}
		return null;
	}
	
	removeBid(playerId) {
		for (let i = 0; i < this.playerBids.length; ++i) {
			if (this.playerBids[i].playerId == playerId) {
				this.playerBids.splice(i, 1);
			}
		}
	}

	setBid(playerId, bidAmount, forceTimeout = null) {
		if (this.state == State.Bid) {
			let playerBid = this.getBid(playerId);
			let modifiedBid = false;
			console.assert(playerBid == null || playerBid.playerId == playerId);

			if (forceTimeout == null) {
				forceTimeout = Date.now() + 123456;
			}

			if (this.allowMultipleBids || playerBid == null) {
				if (this.timerStartTime == null) {
					this.startBidTimer(forceTimeout);
				}
				
				if (playerBid == null) {
					this.playerBids.push(new PlayerBid(playerId, bidAmount, forceTimeout));
				} else {
					playerBid.timestamp = forceTimout;
					playerBid.amount = bidAmount;
				}
			}
		}
		
		return null;
	}

	startBidTimer(timestamp) {
		console.assert(this.timerStartTime == null);
		this.timerStartTime = timestamp;
	}
	
	resetBids() {
		this.playerBids = [];
	}

	startBidState() {
		this.clearVotes();
		if (this.goalsRemaining.length > 0) {
			this.state = State.Bid;
			let targetGoalIdx = Math.floor(this.rand.randFloat() * this.goalsRemaining.length);
			this.currentGoal = this.goalsRemaining[targetGoalIdx];
			let valid = false;
			
			while (!valid) {
				this.rearrangeRobots();
				// check if there are solutions that are less than 'earlyOut' and disallow them
				if (this.earlyOut != null) {
					let result = solveBoard(this.board, this.currentGoal, this.getRobotPositions(), this.earlyOut);
					valid = result == null;
				} else {
					valid = true;
				}
			}

			this.timerStartTime = null;
			this.currentSolveBid = null;
			this.resetBids();
			this.originalRobotConfig = this.getRobotPositions();
		} else {
			this.state = State.End;
		}
	}
	
	startSolveState() {
		this.clearVotes();
		this.state = State.Solve;
		// TODO: add an option to do the stupid compare mode
		this.playerBids.sort(PlayerBid.compare);
		this.currentSolveBid = -1;
		this.advanceSolveState();
	}
	
	advanceSolveState() {
		this.clearVotes();
		this.resetRobotPositions();
		++this.currentSolveBid;
		if (this.currentSolveBid < this.playerBids.length) {
			this.timerStartTime = Date.now() + 123456;
		} else {
			this.startFreeState();
		}
	}
	
	checkSolveSolution() {
		if (this.state == State.Solve) {
			let isSolved = false;
			let goalSpace = this.board.findGoal(this.currentGoal);
			
			if (this.currentGoal.symbol == Symbol.Warp) {
				for (let i = 0; i < this.robots.length; ++i) {
					if (this.robots[i].equals(goalSpace)) {
						isSolved = true;
						break;
					}
				}
			} else {
				isSolved = this.robots[this.currentGoal.color].equals(goalSpace);
			}
			
			if (isSolved) {
				this.giveToken(this.getSolvingPlayer(), this.currentGoal);
				this.startFreeState();
			}

			return isSolved;
		}
		return false;
	}
	
	startFreeState() {
		this.clearVotes();
		this.state = State.Free;
		this.timerStartTime = null;
		this.currentSolveBid = null;
		this.playerBids = [];
	}
	
	startDemoState() {
		this.clearVotes();
		this.state = State.Demo;
		this.timerStartTime = null;
		this.currentSolveBid = null;
		this.playerBids = [];
		this.autoResetRobots();
	}
	
	canAutoStartSolve() {
		//return false;
		if (this.playerBids.length == this.players.length) {
			if (this.allowMultipleBids) {
				let minBid = this.earlyOut == null ? 2 : this.earlyOut + 1;
				for (let i = 0; i < this.playerBids.length; ++i) {
					if (this.playerBids[i].amount > minBid) {
						return false;
					}
				}
			}
				
			return true;
		}
	}
	
	clearVotes() {
		for (let playerId in this.players) {
			let player = this.players[playerId];
			player.vote = null;
		}
	}
}
