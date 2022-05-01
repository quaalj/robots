import http from 'http';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import url from 'url';
import crypto from 'crypto';

import { Game, State, Player, Goal, RobotMove } from './robots.js';
import { Point, Direction, arrayRemove, intdiv, isAnyOf, arrayFind, arrayContains } from './util.js';

let directory = fs.realpathSync('.');
const wss = new WebSocketServer({noServer: true});

let contentTypeRedirects = {
	'.html': 'text/html',
	'.js': 'application/javascript',
	'.png': 'image/png',
};

let redirects = {
	'/': '/robots.html',
	'/favicon.ico': '/warp.png',
};

let cachedFiles = {};

var game = new Game();
game.resetGame(4, Math.random() * 2000000000);
game.startBidState();

var clients = {};

var moveSequence = [];
var redoStack = [];

var currentTimerId = null;

class Client {
	constructor(key) {
		this.playerId = null;
		this.socket = null;
		this.key = key;
	}
}

function getContentType(filename) {
	let ext = path.extname(filename)
	return contentTypeRedirects[ext] ?? 'text/html';
}

function serveFile(clientKey, req, res, filename, filedata) {
	//cachedFiles[filename] = filedata;

	if (filedata == null || filedata === undefined) {
		console.log(`File ${filename} not found`);
		res.writeHead(404, {'Content-Type': 'text/html'});
		res.write("404'd");
		return res.end();
	}
	
	let contentType = getContentType(filename);
	let headers = {'Content-Type': contentType,};
	
	if (filename == '/robots.html') {
		headers['Set-Cookie'] = `clientkey=${clientKey}`;
		console.log(`cookie = ${clientKey}`);
	}

	res.writeHead(200, headers);
	res.write(filedata);
	return res.end();
} 

function handleError(clientKey, req, res, err, filename) {
	err = err.toString();
	if (err.search(`Error: ENOENT: no such file or directory, open `) == 0) {
		cachedFiles[filename] = null;
		return serveFile(clientKey, req, res, filename, null);
	}
	console.error(`Could not read ${filename} file: ${err}`);
	res.writeHead(500, {'Content-Type': 'text/html'});
	res.write("500'd");
	return res.end();
}

function parseCookies(request) {
    const list = {};
    const cookieHeader = request.headers?.cookie;
    if (!cookieHeader) return list;

    cookieHeader.split(`;`).forEach(function(cookie) {
        let [ name, ...rest] = cookie.split(`=`);
        name = name?.trim();
        if (!name) return;
        const value = rest.join(`=`).trim();
        if (!value) return;
        list[name] = decodeURIComponent(value);
    });

    return list;
}

function getClientKey(request) {
	let cookies = parseCookies(request);
	let clientKey = cookies['clientkey'] ?? undefined;
	if (clientKey === undefined) {
		clientKey = crypto.randomUUID();
		console.log(`Client generating new cookie ${clientKey}`);
	}
	
	if (clients[clientKey] === undefined) {
		clients[clientKey] = new Client(clientKey);
		console.log(`New Client Object ${clients[clientKey]}`);
	}
	
	return clientKey;
}

function accept(req, res) {
	let clientKey = getClientKey(req);
	
	// all incoming requests must be websockets
	if (!req.headers.upgrade || req.headers.upgrade.toLowerCase() != 'websocket') {
		var q = url.parse(req.url, true);
		let originalUrl = decodeURIComponent(q.pathname);
		let resolvedFile = redirects[originalUrl] ?? originalUrl;
		
		if (cachedFiles[resolvedFile] !== undefined) {
			console.log(`Serving from cache ${resolvedFile}`);
			return serveFile(clientKey, req, res, resolvedFile, cachedFiles[resolvedFile]);
		}
		
		fs.readFile(directory + resolvedFile, function(err, data) {
			if (err != undefined) {
				return handleError(clientKey, req, res, err, resolvedFile);
			}
			return serveFile(clientKey, req, res, resolvedFile, data);
		});
		return;
	}

	// can be Connection: keep-alive, Upgrade
	if (!req.headers.connection.match(/\bupgrade\b/i)) {
		res.end();
		return;
	}

	wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (socket) => {
		onSocketConnect(clientKey, socket);
	});
}

function onSocketConnect(clientKey, ws) {
	let client = clients[clientKey];
	
	if (client === undefined) {
		console.log(`Rejecting client ${clientKey}`);
		ws.send(`REJECT_CLIENT Client must enable cookies`);
		ws.close();
		return;
	}
	
	client.socket = ws;
	
	syncGame(client);
	
	ws.on('message', function (message) {
		console.log(`Player = ${clientKey} : Message = ${message}`);
		onMessage(clients[clientKey], message.toString());
	});

	ws.on('close', function () {
		console.log(`${clientKey} closed the connection.`);
		clients[clientKey].socket = null;
	});
}

function onMessage(clientKey, message) {
	let lines = message.split('\n');
	if (lines.length <= 0) {
		return;
	}
	
	for (let i = 0; i < lines.length; ++i) {
		let [command, ...args] = lines[i].split(' ');
		command = command.toUpperCase();
		doCommand(clientKey, command, args);
	}
}

function sendAll(message) {
	sendAllExcept(message, null);
}

function sendAllExcept(message, exceptFor) {
	if (exceptFor != null) {
		console.log(`Except for ${exceptFor}`);
	}
	for (const clientKey in clients) {
		console.log(`ClientKey = ${clientKey}`);
		if (clientKey != exceptFor) {
			let client = clients[clientKey];
			if (client !== undefined && client.socket != null) {
				client.socket.send(message);
			}
		}
	}
}

function makeGameStateCommand() {
	let command = `SET_STATE ${game.state}`;
	if (game.currentGoal != null) {
		command += ` ${game.currentGoal.toInt()}`;
	}
	return command;
}

function makeStartTimerCommand() {
	return `START_TIMER ${game.timerStartTime}`;
}

function makeBoardCommand() {
	return `NEW_BOARD ${game.robots.length} ${game.seed}`;
}

function makePlayerVoteCommand(player) {
	return `PLAYER_VOTE ${player.id} ${player.vote}`;
}

function syncGame(client) {
	let commands = [];
	commands.push(makeBoardCommand());
	commands.push(makeGameStateCommand(game.state));
	if (game.originalRobotConfig != null) {
		commands.push(makeRobotResetCommand());
	}
	commands.push(makeRobotMoveAllCommand());
	
	for (let playerId in game.players) {
		let player = game.getPlayer(playerId);
		commands.push(makePlayerJoinedCommand(player.id, player.name));
		if (player.tokens.length > 0) {
			commands.push(makeGivePlayerTokensCommand(playerId, ...player.tokens));
		}
		if (player.vote != null) {
			commands.push(makePlayerVoteCommand(player));
		}
	}
	
	if (client.playerId != null) {
		commands.push(makeAssignPlayerCommand(client.playerId));
	}
	
	for (let i = 0; i < game.playerBids.length; ++i) {
		commands.push(makePlayerBidCommand(game.playerBids[i].playerId));
	}
	
	if (game.state == State.Bid) {
		if (game.timerStartTime != null) {
			commands.push(makeStartTimerCommand());
		}
	} else if (game.state == State.Solve) {
		if (game.timerStartTime != null) {
			commands.push(makeStartSolveCommand());
		}
	}

	client.socket.send(commands.join('\n'));
}

function makePlayerJoinedCommand(playerId, playerName) {
	return `PLAYER_JOINED ${playerId} ${playerName}`;
}

function makeGivePlayerTokensCommand(playerId, ...tokens) {
	let command = `GIVE_TOKENS ${playerId}`;
	for (let i = 0; i < tokens.length; ++i) {
		command += ` ${tokens[i].toInt()}`;
	}
	return command;
}

function makePlayerBidCommand(playerId) {
	let playerBid = game.getBid(playerId);
	if (playerBid == null) {
		`PLAYER_BID ${playerId} 0 0`;
	}
	return `PLAYER_BID ${playerId} ${playerBid.amount} ${playerBid.timestamp}`;
}

function makeRobotAllCommand(command, positions) {
	for (let i = 0; i < positions.length; ++i) {
		command += ` ${positions[i].x} ${positions[i].y}`;
	}
	if (game.state == State.Solve) {
		command += ` ${moveSequence.length}`;
	}
	return command;
}

function makeRobotResetCommand() {
	let command = 'ROBOT_RESET';
	if (game.originalRobotConfig == null) {
		game.autoResetRobots();
	}
	return makeRobotAllCommand(command, game.originalRobotConfig);
}

function makeRobotMoveAllCommand() {
	return makeRobotAllCommand('ROBOT_MOVEALL', game.getRobotPositions());
}

function makeRobotMoveCommand(robotId) {
	let pos = game.robots[robotId];
	let command = `ROBOT_MOVE ${robotId} ${pos.x} ${pos.y}`;
	if (game.state == State.Solve) {
		command += ` ${moveSequence.length}`;
	}
	return command;
}

function makeAssignPlayerCommand(playerId) {
	let player = game.getPlayer(playerId);
	return `ASSIGN_PLAYER ${player.id} ${player.name}`;
}

function makeTimeSyncCommand(origTime, serverTime) {
	return `TIME_SYNC ${origTime} ${serverTime}`;
}

function clearTimer() {
	if (currentTimerId != null) {
		clearTimeout(currentTimerId);
		currentTimerId = null;
	}
}

function endBidState() {
	console.log('Ending bidding state');
	clearTimer();
	game.startSolveState();
	updateSolveState();
}

function advanceSolveState() {
	console.log('Advancing solve state');
	clearTimer();
	game.advanceSolveState();
	updateSolveState();
}

function makeStartSolveCommand() {
	return `START_SOLVE ${game.getSolvingPlayer()} ${game.timerStartTime}`;
}

function updateSolveState() {
	if (game.state == State.Solve) {
		moveSequence = [];
		redoStack = [];
		let commands = [makeGameStateCommand(State.Solve), makeRobotResetCommand(), makeStartSolveCommand()]
		sendAll(commands.join('\n'));
		currentTimerId = setTimeout(advanceSolveState, Math.floor(game.solveTimeout * 1000));
	} else {
		sendAll(makeGameStateCommand(State.Free));
	}
}

let stateVotes = {}
stateVotes[State.Bid] = ['SKIPBID'];
stateVotes[State.Demo] = ['SKIPDEMO'];
stateVotes[State.Free] = ['DEMO', 'NEXT'];

let consensusVotes = ['SKIPBID', 'SKIPDEMO', 'NEXT'];

function votesInState(state) {
	let list = stateVotes[state];
	if (list !== undefined) {
		return list;
	}
	return [];
}

function voteAllowedInState(state, vote) {
	let list = stateVotes[state];
	if (list !== undefined) {
		return list.includes(vote);
	}
	return false;
}

function stateOptionIndex(state, vote) {
	let list = stateVotes[state];
	if (list !== undefined) {
		return arrayFind(list, vote);
	}
	return -1;
}

function checkVoteState(players, state) {
	let votes = {};
	let numVotes = 0;
	let numPlayers = Object.keys(players).length;
	
	let maxVotes = -1;
	let maxVoteType = null;
	
	for (let playerId in players) {
		let player = players[playerId];
		if (!voteAllowedInState(state, player.vote)) {
			player.vote = null;
			continue;
		}
		numVotes += 1;
		
		if (player.vote in votes) {
			votes[player.vote] += 1;
		} else {
			votes[player.vote] = 1;
		}
	}
	
	if (numVotes <= 0) {
		return null;
	}
	
	let stateVoteSort = function(lhs, rhs) {
		if (lhs[1] == rhs[1]) {
			let lhsStateIdx = stateOptionIndex(state, lhs[0]);
			let rhsStateIdx = stateOptionIndex(state, rhs[0]);
			return lhsStateIdx - rhsStateIdx;
		}
		return lhs[1] - rhs[1];
	}
	
	let sortedVotes = Object.entries(votes).sort(stateVoteSort).reverse();
	let remainingVotes = numPlayers - numVotes;
	
	let secondMostVotes = 0;
	if (sortedVotes.length > 1) {
		secondMostVotes = sortedVotes[1][1];
	}
	
	// These bids require consensus (or at least all people to have voted)
	if (arrayContains(consensusVotes, sortedVotes[0][0])) {
		console.log(`Remaining votes ${remainingVotes}`);
		if (remainingVotes == 0) {
			return sortedVotes[0][0];
		} else {
			return null;
		}
	}
	
	if (secondMostVotes + remainingVotes >= numVotes && remainingVotes > 0) {
		return null;
	}
	
	return sortedVotes[0][0];
}

function nextRound() {
	game.startBidState();
	let commands = [makeGameStateCommand(game.state), makeRobotResetCommand()]
	sendAll(commands.join('\n'));
}

function executeVote(vote) {
	console.log(`Majority has voted ${vote}`);
	
	if (!voteAllowedInState(game.state, vote)) {
		console.log(`Error: vote ${vote} not allowed in state ${game.state}`);
		return false;
	}
	
	if (vote == 'SKIPBID') {
		endBidState();
	} else if (isAnyOf(vote, 'SKIPDEMO', 'NEXT')) {
		nextRound();
	} else if (vote == 'DEMO') {
		// TODO: demo state
	}
}

function clearVotes() {
	game.clearVotes();
}

function doCommand(client, command, args) {
	if (command == 'SYNC_TIME') {
		client.socket.send(makeTimeSyncCommand(args[0], Date.now()));
	} else if (command == 'JOIN_GAME') {
		let desiredName = game.makeValidName(args[0]);
		client.playerId = game.addPlayer(null, desiredName);
		client.cachedName = game.players[client.playerId].name;
		
		let playerJoinedCommand = makePlayerJoinedCommand(client.playerId, client.cachedName);
		let commands = [playerJoinedCommand, makeAssignPlayerCommand(client.playerId)];
		client.socket.send(commands.join('\n'));
		
		sendAllExcept(playerJoinedCommand, client.key);
	} else if (command == 'LEAVE_GAME') {
		if (client.playerId != null) {
			let playerId = client.playerId;
			client.playerId = null;
			game.removePlayer(playerId);
			
			if (game.state == State.Solve && game.getSolvingPlayer() == playerId) {
				// TODO: concat these commands with the player leaving command
				advanceSolveState();
			}
			
			sendAll(`PLAYER_LEFT ${playerId}`);
		}
	} else if (command == 'PLAYER_RENAME') {
		let playerId = parseInt(args[0]);
		let newName = game.renamePlayer(playerId, game.makeValidName(args[1]));
		sendAll(`PLAYER_RENAME ${playerId} ${newName}`);
	} else if (command == 'MAKE_BID') {
		if (client.playerId != null && game.getState() == State.Bid) {
			let bidAmount = parseInt(args[0]);
			let isFirstBid = game.timerStartTime == null;
			game.setBid(client.playerId, bidAmount);
			
			let commands = [makePlayerBidCommand(client.playerId)];

			if (isFirstBid) {
				commands.push(makeStartTimerCommand());
				currentTimerId = setTimeout(endBidState, Math.floor(game.bidTimeout * 1000));
			}
			
			sendAll(commands.join('\n'));

			// TODO: concat this with the previous commands
			// Also TODO: don't send the timer if this is triggered (a bit of an edge case, since it occurs with only 1 player)
			if (!game.allowMultipleBids && game.playerBids.length == game.getNumPlayers()) {
				endBidState();
			}
		}
	} else if (command == 'FREE_MOVE_ROBOT') {
		if (game.state == State.Free) {
			let robotId = parseInt(args[0]);
			let pos = new Point(parseInt(args[1]), parseInt(args[2]));
			game.robots[robotId] = pos;
			let commands = [makeRobotMoveCommand(robotId)];
			sendAll(commands.join('\n'));
		}
	} else if (command == 'MOVE_ROBOT') {
		if (client.playerId != null && game.playerAllowedMove(client.playerId)) {
			let robotId = parseInt(args[0]);
			let direction = parseInt(args[1]);
			let isFree = game.state == State.Free;
			
			if (!isFree) {
				moveSequence.push(new RobotMove(game.robots[robotId], direction, null, robotId));
			}
			game.moveRobot(robotId, direction);
			let commands = [makeRobotMoveCommand(robotId)];
			
			if (game.state == State.Solve && game.getSolvingPlayer() == client.playerId) {
				let currentBid = game.playerBids[game.currentSolveBid];
				
				if (moveSequence.length <= currentBid.amount && game.checkSolveSolution()) {
					clearTimer();
					let playerCommands = [];
					commands.push(makeGivePlayerTokensCommand(client.playerId, game.currentGoal));
					commands.push(makeGameStateCommand(game.state));
				}
			}

			sendAll(commands.join('\n'));
		}
	} else if (command == 'REDO_ROBOT') {
		if (client.playerId != null && game.getState() == State.Solve && game.playerAllowedMove(client.playerId) && redoStack.length > 0) {
			let addMove = redoStack.pop();
			game.moveRobot(addMove.color, addMove.direction);
			moveSequence.push(addMove);
			sendAll(makeRobotMoveCommand(addMove.color));
		}
	} else if (command == 'UNDO_ROBOT') {
		if (client.playerId != null && game.getState() == State.Solve && game.playerAllowedMove(client.playerId) && moveSequence.length > 0) {
			let lastMove = moveSequence.pop();
			game.robots[lastMove.color] = lastMove.position;
			redoStack.push(lastMove);
			sendAll(makeRobotMoveCommand(lastMove.color));
		}
	} else if (command == 'RESET_ROBOTS') {
		if (client.playerId != null && game.playerAllowedMove(client.playerId)) {
			game.resetRobotPositions();
			let command = makeRobotMoveAllCommand();
			sendAllExcept(command, client.key);
		}
	} else if (command == 'SKIP_SOLVE') {
		if (game.state == State.Solve && client.playerId == game.getSolvingPlayer()) {
			advanceSolveState();
		}
	} else if (command == 'VOTE') {
		let player = game.getPlayer(client.playerId);
		if (player.vote == null) {
			let didVote = voteAllowedInState(game.state, args[0]);
			if (didVote) {
				player.vote = args[0];
				let majorityVote = checkVoteState(game.players, game.state);
				if (majorityVote == null) {
					sendAll(makePlayerVoteCommand(player));
				} else {
					executeVote(majorityVote);
				}
			}
		}
	}
}

http.createServer(accept).listen(8080);
