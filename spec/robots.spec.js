import {Board, Bumper, RobotState, Color, solveBoard, Goal, generateBoard} from "../robots.js";
import {Point, Direction, Mulberry32} from "../util.js";

describe("Board", function() {
    it("moves robots", function() {
        let board = new Board(8, 8);
        let robots = [new Point(3, 3)];
        
        let result = board.doMove(robots, 0, Direction.Right);

        expect(result.x).toBe(7);
        expect(result.y).toBe(3);
    });

    it("bumpers robots", function() {
        let board = new Board(8, 8);
        let robots = [new Point(3, 3)];
        let moves = [];
        let result = null;

        board.getCell(new Point(7, 3)).bumper = new Bumper(1, false);
        result = board.doMove(robots, 0, Direction.Right, moves);
        expect(result.x).toBe(7);
        expect(result.y).toBe(7);
        expect(moves.length).toBe(3);
        expect(moves[1].x).toBe(7);
        expect(moves[1].y).toBe(3);

        board.getCell(new Point(7, 3)).bumper = new Bumper(1, true);
        result = board.doMove(robots, 0, Direction.Right, moves);
        expect(result.x).toBe(7);
        expect(result.y).toBe(0);
        expect(moves.length).toBe(3);
        expect(moves[1].x).toBe(7);
        expect(moves[1].y).toBe(3);

        board.getCell(new Point(3, 7)).bumper = new Bumper(1, false);
        result = board.doMove(robots, 0, Direction.Down, moves);
        expect(result.x).toBe(7);
        expect(result.y).toBe(7);
        expect(moves.length).toBe(3);
        expect(moves[1].x).toBe(3);
        expect(moves[1].y).toBe(7);

        board.getCell(new Point(3, 7)).bumper = new Bumper(1, true);
        result = board.doMove(robots, 0, Direction.Down, moves);
        expect(result.x).toBe(0);
        expect(result.y).toBe(7);
        expect(moves.length).toBe(3);
        expect(moves[1].x).toBe(3);
        expect(moves[1].y).toBe(7);

        board.getCell(new Point(3, 0)).bumper = new Bumper(1, false);
        result = board.doMove(robots, 0, Direction.Up, moves);
        expect(result.x).toBe(0);
        expect(result.y).toBe(0);
        expect(moves.length).toBe(3);
        expect(moves[1].x).toBe(3);
        expect(moves[1].y).toBe(0);

        board.getCell(new Point(3, 0)).bumper = new Bumper(1, true);
        result = board.doMove(robots, 0, Direction.Up, moves);
        expect(result.x).toBe(7);
        expect(result.y).toBe(0);
        expect(moves.length).toBe(3);
        expect(moves[1].x).toBe(3);
        expect(moves[1].y).toBe(0);

        board.getCell(new Point(0, 3)).bumper = new Bumper(1, false);
        result = board.doMove(robots, 0, Direction.Left, moves);
        expect(result.x).toBe(0);
        expect(result.y).toBe(0);
        expect(moves.length).toBe(3);
        expect(moves[1].x).toBe(0);
        expect(moves[1].y).toBe(3);

        board.getCell(new Point(0, 3)).bumper = new Bumper(1, true);
        result = board.doMove(robots, 0, Direction.Left, moves);
        expect(result.x).toBe(0);
        expect(result.y).toBe(7);
        expect(moves.length).toBe(3);
        expect(moves[1].x).toBe(0);
        expect(moves[1].y).toBe(3);
    });

    it("double bumpers robots", function() {
        let board = new Board(8, 8);
        let robots = [new Point(3, 3)];

        board.getCell(new Point(7, 3)).bumper = new Bumper(1, false);
        board.getCell(new Point(7, 7)).bumper = new Bumper(1, true);
        
        let result = board.doMove(robots, 0, Direction.Right);
        expect(result.x).toBe(0);
        expect(result.y).toBe(7);

        board.getCell(new Point(7, 3)).bumper = new Bumper(1, true);
        board.getCell(new Point(7, 0)).bumper = new Bumper(1, false);

        result = board.doMove(robots, 0, Direction.Right);

        expect(result.x).toBe(0);
        expect(result.y).toBe(0);
    });

    it("mega bumpers robots", function() {
        let board = new Board(8, 8);
        let robots = [new Point(0, 0)];
        let moves = [];

        board.getCell(new Point(7, 0)).bumper = new Bumper(1, false);
        for (let i = 1; i <= 6; ++i) {
            board.getCell(new Point(7, i)).bumper = new Bumper(1, (i % 2) == 1);
            board.getCell(new Point(0, i)).bumper = new Bumper(1, (i % 2) == 1);
        }
        board.getCell(new Point(7, 7)).bumper = new Bumper(1, true);

        let result = board.doMove(robots, 0, Direction.Right, moves);
        expect(result.x).toBe(0);
        expect(result.y).toBe(7);
        expect(moves.length).toBe(8 * 2);
    });

    it("disallows loops", function() {
        let board = new Board(8, 8);
        let robots = [new Point(3, 3)];

        board.getCell(new Point(7, 3)).bumper = new Bumper(1, false);
        board.getCell(new Point(7, 7)).bumper = new Bumper(1, true);
        board.getCell(new Point(0, 7)).bumper = new Bumper(1, false);
        board.getCell(new Point(0, 3)).bumper = new Bumper(1, true);
        
        let result = board.doMove(robots, 0, Direction.Right);
        expect(result.x).toBe(3);
        expect(result.y).toBe(3);

        board.getCell(new Point(7, 3)).bumper = new Bumper(1, true);
        board.getCell(new Point(7, 0)).bumper = new Bumper(1, false);
        board.getCell(new Point(0, 0)).bumper = new Bumper(1, true);
        board.getCell(new Point(0, 3)).bumper = new Bumper(1, false);

        result = board.doMove(robots, 0, Direction.Right);

        expect(result.x).toBe(3);
        expect(result.y).toBe(3);
    });

    it("disallows landing on a bumper", function() {
        let board = new Board(8, 8);
        let robots = [new Point(3, 3)];

        board.getCell(new Point(7, 3)).bumper = new Bumper(1, false);
        board.getCell(new Point(7, 7)).bumper = new Bumper(1, false);
        
        let result = board.doMove(robots, 0, Direction.Right);
        expect(result.x).toBe(3);
        expect(result.y).toBe(3);

        board.getCell(new Point(7, 3)).bumper = new Bumper(1, true);
        board.getCell(new Point(7, 0)).bumper = new Bumper(1, true);

        result = board.doMove(robots, 0, Direction.Right);

        expect(result.x).toBe(3);
        expect(result.y).toBe(3);
    });

    it("pass through same color bumper", function() {
        let board = new Board(8, 8);
        let robots = [new Point(3, 3)];

        board.getCell(new Point(5, 3)).bumper = new Bumper(0, false);
        board.getCell(new Point(6, 3)).bumper = new Bumper(1, true);
        
        let result = board.doMove(robots, 0, Direction.Right);
        expect(result.x).toBe(6);
        expect(result.y).toBe(0);
    });

    it("disallow landing on same color bumper", function() {
        let board = new Board(8, 8);
        let robots = [new Point(3, 3)];

        board.getCell(new Point(7, 3)).bumper = new Bumper(0, false);
        
        let result = board.doMove(robots, 0, Direction.Right);
        expect(result.x).toBe(3);
        expect(result.y).toBe(3);
    });

    it("can create a rook-board", function() {
        let board = new Board(4, 4);
        let rookBoard = board.createRookBoard(new Point(2, 2), 3);

        for (let i = 0; i < 4; ++i) {
            for (let j = 0; j < 4; ++j) {
                let indexC = board.indexify(i, j);
                if (i == 2 || j == 2) {
                    expect(rookBoard[indexC]).toBe(0);
                } else {
                    expect(rookBoard[indexC]).toBe(1);
                }
            }
        }
    });

    it("can create a rook-board with bumpers", function() {
        let board = new Board(4, 4);
        let c1 = board.getCell(new Point(2, 0));
        c1.bumper = new Bumper(Color.Yellow, false);
        let c2 = board.getCell(new Point(0, 0));
        c2.bumper = new Bumper(Color.Blue, true);
        let rookBoard = board.createRookBoard(new Point(2, 2), Color.Green);

        for (let i = 0; i < 4; ++i) {
            for (let j = 0; j < 4; ++j) {
                let indexC = board.indexify(i, j);
                if ((i == 0 && j == 0) || (i == 2 && j == 0)) {
                    expect(rookBoard[indexC]).toBe(undefined);
                } else if (i == 2 || j == 2) {
                    expect(rookBoard[indexC]).toBe(0);
                } else if ((i == 1 && j == 0) || (i == 0 && j > 0)) {
                    expect(rookBoard[indexC]).toBe(0);
                } else {
                    expect(rookBoard[indexC]).toBe(1);
                }
            }
        }
    });

    it("can create handle invalid moves with bumpers", function() {
        let board = new Board(4, 4);
        let c1 = board.getCell(new Point(2, 0));
        c1.bumper = new Bumper(Color.Blue, false);
        let c2 = board.getCell(new Point(0, 0));
        c2.bumper = new Bumper(Color.Yellow, true);
        let rookBoard = board.createRookBoard(new Point(2, 2), Color.Yellow);

        for (let i = 0; i < 4; ++i) {
            for (let j = 0; j < 4; ++j) {
                let indexC = board.indexify(i, j);
                if ((i == 0 && j == 0) || (i == 2 && j == 0)) {
                    expect(rookBoard[indexC]).toBe(undefined);
                } else if (i == 2 || j == 2 || (i == 1 && j == 0)) {
                    expect(rookBoard[indexC]).toBe(0);
                } else {
                    expect(rookBoard[indexC]).toBe(1);
                }
            }
        }
    });
});

describe("RobotState", function() {
    it("Can compress to int state", function() {
        let robots = [new Point(0, 0), new Point(1, 1), new Point(2, 2), new Point(3, 3)];
        let state = new RobotState(robots, true, 0);
        let intState = state.toInt();

        expect(intState).toBe(0x33221100);

        let outRobots = RobotState.uncompressIntState(intState, robots.length);

        expect(outRobots.length).toBe(robots.length);
        for (let i = 0; i < robots.length; ++i) {
            expect(outRobots[i].x).toBe(robots[i].x);
            expect(outRobots[i].y).toBe(robots[i].y);
        }
    });
});

describe("solveBoard", function() {
    it("Works", function() {
        let board = new Board(4, 4);
        let goalCell = board.getCell(new Point(1, 1));
        goalCell.goal = new Goal(2, Symbol.Star);
        let robots = [new Point(0, 0), new Point(0, 3), new Point(3, 3)];
        let solution = solveBoard(board, goalCell.goal, robots);
        expect(solution.length).toBe(4);
    });

    it("solves troublesome board", function() {
        let rand = new Mulberry32(325538665.35267997);
        let board = generateBoard(rand.randRaw());

        let goalCell = board.getCell(new Point(2, 14));
        goalCell.goal = new Goal(1, Symbol.Gear);

        let robots = [new Point(4, 0), new Point(0, 4), new Point(8, 9), new Point(2, 2)];

        let solution = solveBoard(board, goalCell.goal, robots);

        expect(solution.length).toBe(7);
    });

    it("solves another troublesome board", function() {
        let rand = new Mulberry32(325538665.35267997);
        let board = generateBoard(rand.randRaw());

        let goalCell = board.getCell(new Point(1, 9));
        goalCell.goal = new Goal(0, Symbol.Star);

        let robots = [new Point(15, 15), new Point(1, 4), new Point(13, 14), new Point(2, 7)];

        let solution = solveBoard(board, goalCell.goal, robots);

        expect(solution.length).toBe(8);
    })
});