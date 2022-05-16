import { Board, Bumper } from "../robots.js";
import { Point, Direction } from "../util.js";
import assert from 'assert';

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
});