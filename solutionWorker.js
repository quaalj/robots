import {solveBoard, Game, Board, Goal, RobotMove} from './robots.js'
import {Point} from './util.js'
import {parentPort} from "worker_threads"

import createRequire from "node:module";
let require = createRequire.createRequire(import.meta.url);

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

    // use v8 solver, if available
    let solver;
    try {
        let {fastSolveBoard} = require('./build/Release/addon');
        solver = fastSolveBoard;
    } catch(e) {
        solver = solveBoard;
    }

    try {

        let stateSequence = solver(board, goal, robots, null);
        console.log(solver.name);

        let msg = {'solution' : compactSolution(stateSequence), 'goalColor' : goal.color, 'goalSymbol' : goal.symbol, 'robots':robots, 'seed' : seed};
        console.log(`Worker found solution`);
        parentPort.postMessage(msg);
        parentPort.close();
    } catch (err) {
        console.log("Solver error: " + err.toString());

    }
}

