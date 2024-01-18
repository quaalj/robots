import {solveBoard, Game, Board, Goal, RobotMove} from './robots.js'
import {Point} from './util.js'
import {parentPort} from "worker_threads"

import createRequire from "node:module";
let require = createRequire.createRequire(import.meta.url);
let {fastSolveBoard} = require('./build/Release/addon');

function compactSolution(stateSequence) {
    let msg = [];
    for(let move in stateSequence) {
        msg.push({'color' : stateSequence[move].color, 'direction' : stateSequence[move].direction});
    }
    return msg;
}

parentPort.on("message", function(e) {
    let board = Board.parseBoard(e.boardString);
    let goal = new Goal(e.goalColor, e.goalSymbol);
    let robots = e.robots;
    let seed = e.boardSeed;

    for(let i in robots) {
        robots[i] = new Point(robots[i].x, robots[i].y);
    }

    setTimeout(() => runSolver(board, goal, robots, seed), 1);
});

function runSolver(board, goal, robots, seed) {
    console.log("Starting solver");

    try {
        //let stateSequence = solveBoard(board, goal, robots, null);
        //let stateSequence = solveBoard(board, goal, robots, null, doFasterMove, loadBoard);
        //console.log(board.toString());
        let solverStartTime = Date.now();
        //if (fastSolveBoard) {
            let stateSequence = fastSolveBoard(board, goal, robots, null);
        let fastSolveTime = Date.now() - solverStartTime;
        console.log("Fast found a " + stateSequence.length + " in : " + fastSolveTime);
        solverStartTime = Date.now();
        //} else {
            stateSequence = solveBoard(board, goal, robots, null);
            let slowSolveTime = Date.now() - solverStartTime;
        //}
        console.log("Slow found a " + stateSequence.length + " in : " + slowSolveTime);
        console.log("seed:" + seed);
        let msg = {'solution' : compactSolution(stateSequence), 'goalColor' : goal.color, 'goalSymbol' : goal.symbol, 'robots':robots, 'seed' : seed};
        console.log(`Worker found solution in ${(Date.now() - solverStartTime)/1000} seconds`);
        parentPort.postMessage(msg);
        parentPort.close();
    } catch (err) {
        console.log("Solver error: " + err.toString());

    }
}

