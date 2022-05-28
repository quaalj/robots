import { Point } from "../util.js";

describe("Point", function() {
    it("can be used in a Map", function() {
        let m = new Map();

        m.set(new Point(0, 1).toString(), 'a');
        
        expect(m.get(new Point(0, 1).toString())).toBe('a');

    });

});