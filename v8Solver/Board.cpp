#include "Board.h"
#include "nan.h"
#include "v8.h"
#include "Point.h"
#include "Cell.h"

#include <iostream>
#include <array>

using namespace Nan;

static Direction getBounceDirection(Direction moveDirection, bool slant);

Board::Board() : Board(0, 0) {}

Board::Board(int width, int height) : width(width), height(height) {
    initCells();
}

Board::Board(v8::Local<v8::Object> object) {
    v8::Local<v8::Array> points = v8::Local<v8::Array>::Cast(Get(object, Encode("points", 6, UTF8)).ToLocalChecked());

    width = To<int>(Get(object, Encode("width", 5, UTF8)).ToLocalChecked()).FromJust();
    height = To<int>(Get(object, Encode("height", 6, UTF8)).ToLocalChecked()).FromJust();

    initCells();

    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            if (Has(points, indexify(x, y)).FromJust()) {
                v8::Local<v8::Object> point = To<v8::Object>(Get(points, indexify(x, y)).ToLocalChecked()).ToLocalChecked();
                cells[indexify(x, y)] = new Cell(point);
            }
        }
    }
}

// create a 2-d array  for the board's cells and another for the cache of moves
void Board::initCells() {
    cells.resize(width * height);
    cachedCells.resize(width * height);

    for (int i = 0; i < width * height; i++) {
        cachedCells[i].resize(NUM_DIRECTIONS);
        for(int j = 0; j < NUM_DIRECTIONS; j++) {
            cachedCells[i][j].resize(NUM_ROBOTS);
        }
    }
}

// move a robot on the board
Point Board::doMove(std::vector<Point> &robots, int robotIdx, Direction moveDir, bool allowInvalidEndpoint) {
    bool blocked = false;
    bool isCacheable = true;
    Point robotPos = Point(robots[robotIdx].getX(), robots[robotIdx].getY());
    int startIndex = indexify(robotPos);
    Point *delta = Point::fromDirection(moveDir);

    // TODO: Outlist stuff

    //    if (outList != null) {
    //        outList.length = 0;
    //        outList.push(robotPos);
    //    }

    // Find cached move if available
    Point *targetCell = cachedCells[indexify(robotPos)][robotIdx][moveDir];
    if (targetCell != nullptr) {

        // check to see if there are any other robots in this robot's path
        // if so, don't look up cached value
        bool collision = false;
        for (int i = 0; i < NUM_ROBOTS; i++) {
            if( i == robotIdx ) {
                continue;
            }

            Direction directMoveDirection = robots[i].getDirectPath(&robotPos);
            if (directMoveDirection != Direction::None &&
                Point::fromDirection(directMoveDirection)->equals(delta)) {
                collision = true;
                break;
            }
        }

        // return cached move result if it exists
        if (!collision) {
            Point *nextPosition = cachedCells[indexify(robotPos)][robotIdx][moveDir];

            if (nextPosition != nullptr) {
                // TODO: Outlist stuff

                //if (outList != null)
                //{
                //    outList.push(nextPos);
                //}
                return *nextPosition;
            }
        }
    }

    // Move the robot one cell at a time until it becomes blocked
    Point nextPosition;
    while (!blocked) {
        nextPosition = robotPos.add(delta);

        // if the robot didn't move then return its current position
        if (nextPosition.equals(&robots[robotIdx])) {
            return robots[robotIdx];
        }

        // check if move is blocked by fences, edge of board, or other robots
        blocked = isMoveBlocked(robotPos, nextPosition);
        if (!blocked) {
            for (int i = 0; i < NUM_ROBOTS; i++) {
                if (nextPosition.equals(&robots[i])) {
                    blocked = true;
                    if (i != robotIdx) {
                        isCacheable = false;
                    }

                    break;
                }
            }
        }

        // if move is blocked then the robot is done moving
        if (blocked) {
            // don't allow robot to end on a cell with a bumper
            if (getCell(robotPos)->hasBumper() && !allowInvalidEndpoint) {
                // TODO: more outlist stuff

                /*
                 * if (outList != null) {
						outList.length = 0;
					}
                 */
                robotPos = robots[robotIdx];
            }
            break;
        }

        // the move is valid, so update the robot's position
        robotPos = nextPosition;
        Cell cell = *getCell(robotPos);

        // calculate change in direction if there is a bumper
        if (cell.getBumper() != nullptr && cell.getBumper()->color != robotIdx) {
            // TODO: more more outlist stuff
            /*
             * 	if (outList != null) {
					outList.push(robotPos);
				}
             */
            isCacheable = false;
            moveDir = getBounceDirection(moveDir, cell.getBumper()->slant);
            delta = Point::fromDirection(moveDir);
        }
    }

    // TODO: More outlist
    /*
		if (outList != null) {
			if (!(outList.length == 1 && outList[0] == robotPos)) {
				outList.push(robotPos);
			}
		}
     */

    // cache this move
    if (isCacheable && targetCell == nullptr) {
        cachedCells[startIndex][robotIdx][moveDir] = new Point(robotPos.getX(), robotPos.getY());
    }

    return robotPos;
}

// return the location of the goal
Point Board::findGoal(Goal targetGoal) {
    std::vector<Cell *>::iterator cell = cells.begin();
    for (int i = 0; i < cells.size(); i++) {
        if ((*cell)->goalEquals(targetGoal)) {
            return deindexify(i);
        }

        cell++;
    }

    return Point(-1, -1);
}

// determines if a point is inside the board's borders
bool Board::containsPoint(Point point) {
    return point.getX() >= 0 && point.getX() < width &&
           point.getY() >= 0 && point.getY() < height;
}

bool Board::hasFenceBetween(Point point0, Point point1) {
    Direction dirTo1 = point1.sub(&point0).getDirection();
    Direction dirTo0 = point0.sub(&point1).getDirection();
    Cell *cell0 = getCell(point0);
    Cell *cell1 = getCell(point1);
    bool fenceBetween = false;

    // are both points inside the playable area
    if (!(containsPoint(point0) || !containsPoint(point1))) {
        fenceBetween = true;
    }

    // check for fence from both directions
    if (cell0 != nullptr && cell0->getFence(dirTo1)) {
        fenceBetween = true;
    }

    if (cell1 != nullptr && cell1->getFence(dirTo0)) {
        fenceBetween = true;
    }

    return fenceBetween;
}


bool Board::isMoveBlocked(Point point0, Point point1) {
    return !containsPoint(point0) || !containsPoint(point1) || hasFenceBetween(point0, point1);
}

// calculates the array index of a point on the board
int Board::indexify(Point point) {
    return indexify(point.getX(), point.getY());
}

int Board::indexify(int x, int y) {
    return y * width + x;
}

Cell *Board::getCell(int x, int y) {
    return cells[indexify(x, y)];
}

Cell *Board::getCell(Point point) {
    return getCell(point.getX(), point.getY());
}

Point Board::deindexify(int index) {
    return Point(index % width, index / height);
}

std::string Board::toString() {
    std::string outString;

    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            outString += getCell(x, y)->toString();
        }
        outString += "\n";
    }

    return outString;
}

// determines the change in direction when a robot hits a bumper
static Direction getBounceDirection(Direction moveDirection, bool slant) {
    if (slant) {
        switch (moveDirection) {
            case Up:
                return Right;
            case Left:
                return Down;
            case Right:
                return Up;
            case Down:
                return Left;
            default:
                return moveDirection;
        }
    } else {
        switch (moveDirection) {
            case Up:
                return Left;
            case Right:
                return Down;
            case Left:
                return Up;
            case Down:
                return Right;
            default:
                return moveDirection;
        }
    }
}