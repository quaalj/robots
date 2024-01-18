#ifndef BOARD_H
#define BOARD_H

#include "v8.h"
#include "Point.h"
#include <string>
#include <vector>
#include <array>

class Cell;
class Point;
struct Goal;

class Board {
private:
    const int NUM_ROBOTS = 4;
    const int NUM_DIRECTIONS = 4;

    int width;
    int height;
    std::vector<Cell *> cells;
    std::vector<std::vector<std::vector<Point *>>> cachedCells;

    void initCells();

public:
    Board();
    Board(int width, int height);
    Board(v8::Local<v8::Object> object);

    bool containsPoint(Point point);
    bool hasFenceBetween(Point point0, Point point1);
    bool isMoveBlocked(Point p0, Point p1);
    Point doMove(std::vector<Point> &robots, int robotIdx, Direction moveDir, bool allowInvalidEndpoint);
    Point findGoal(Goal targetGoal);

    Cell *getCell(int x, int y);
    Cell *getCell(Point point);

    int indexify(Point point);
    int indexify(int x, int y);
    Point deindexify(int index);

    std::string toString();
};

#endif
