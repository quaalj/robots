#include "nan.h"
#include "v8.h"
#include <string>
#include <iostream>
#include <cassert>

#include "point.h"
#include "cell.h"

#define BOARD_SIZE_X 16
#define BOARD_SIZE_Y 16
#define NUM_ROBOTS 4
#define NUM_DIRECTIONS 4

using namespace std;
using namespace Nan;
using namespace v8;

// doMove method arguments
Point **robots;
int robotIdx;
Direction moveDir;
Nan::MaybeLocal<Object> outlist = Nan::MaybeLocal<Object>();
bool allowInvalidEndpoint = false;

// cached moves
static Cell *board[BOARD_SIZE_X * BOARD_SIZE_Y] = {0};
static Point *cachedCells[BOARD_SIZE_X * BOARD_SIZE_Y][NUM_DIRECTIONS][NUM_ROBOTS] = {0};

void readArguments(NAN_METHOD_ARGS_TYPE info);
int indexify(Point robotPosition);
Point doMoveAlgorithm();
bool isMoveBlocked(Point robotPos, Point);
Cell *getCell(Point point);
Direction getBounceDirection(Direction moveDirection, bool slant);

NAN_METHOD(loadBoard) {
    // first parameter to loadBoard, a string representation of the board
    Local<String> inString = To<String>(info[0]).ToLocalChecked();
    std::string str(*Nan::Utf8String(inString), inString->Length());

    for (int i = 0; i < BOARD_SIZE_X * BOARD_SIZE_Y; i++) {
        // reset previous board and move cache
        if (board[i] != nullptr) {
            free(board[i]);
        }
        std::memset(cachedCells, 0, sizeof(cachedCells));

        // load board contents from string
        board[i] = new Cell(str[i * 2], str[i * 2 + 1]);
    }
}

NAN_METHOD(doFasterMove) {
    readArguments(info);

    Point returnValue = doMoveAlgorithm();
    info.GetReturnValue().Set(returnValue.toV8());

    for (int i = 0; i < 4; i++) {
        if (robots[i] != nullptr) {
            free(robots[i]);
            robots[i] = nullptr;
        }
    }
    free(robots);
    robots = nullptr;
}

NAN_MODULE_INIT(Initialize) {
        NAN_EXPORT(target, doFasterMove);
        NAN_EXPORT(target, loadBoard);
}

NODE_MODULE(addon, Initialize);

// Only need if this is going into the worker thread
NAN_MODULE_WORKER_ENABLED(addon, Initialize);

void readArguments(NAN_METHOD_ARGS_TYPE info) {
    // read robots list
    Local<Array> robotList = Local<Array>::Cast(info[0]);
    int numRobots = robotList->Length();

    robots = (Point **)malloc(sizeof(Point*) * numRobots);
    for (int i = 0; i < numRobots; i++)
    {
        if (Has(robotList, i).FromJust()) {
            Local<Object> point = To<Object>(Get(robotList, i).ToLocalChecked()).ToLocalChecked();

            robots[i] = new Point(point);
        }
    }

    // read robotIdx
    robotIdx = To<int>(info[1]).FromJust();

    // read moveDir
    moveDir = (Direction)To<int>(info[2]).FromJust();

    // read outlist
    if(info.Length() >= 4 && !info[3]->IsNullOrUndefined()) {
        outlist = To<Object>(info[3]);
    }

    // read allowInvalidEndpoint
    if (info.Length() == 5 && !To<bool>(info[4]).IsNothing()) {
        allowInvalidEndpoint = To<bool>(info[4]).FromJust();
    }
}

Point doMoveAlgorithm() {
    bool blocked = false;
    bool isCacheable = true;
    Point robotPos = Point(robots[robotIdx]->getX(), robots[robotIdx]->getY());
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

            Direction directMoveDirection = robots[i]->getDirectPath(&robotPos);
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
        if (nextPosition.equals(robots[robotIdx])) {
            return *robots[robotIdx];
        }

        // check if move is blocked by fences, edge of board, or other robots
        blocked = isMoveBlocked(robotPos, nextPosition);
        if (!blocked) {
            for (int i = 0; i < NUM_ROBOTS; i++) {
                if (nextPosition.equals(robots[i])) {
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
                robotPos = *robots[robotIdx];
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

// calculates the array index of a point on the board
int indexify(Point robotPosition) {
    return (robotPosition.getY() * BOARD_SIZE_X) + robotPosition.getX();
}

// determines if a point is inside the board's borders
bool boardContains(Point point) {
    return point.getX() >= 0 && point.getX() < BOARD_SIZE_X &&
            point.getY() >= 0 && point.getY() < BOARD_SIZE_Y;
}

Cell *getCell(Point point) {
    return board[indexify(point)];
}

bool hasFenceBetween(Point p0, Point p1) {
    Direction dirTo1 = p1.sub(&p0).getDirection();
    Direction dirTo0 = p0.sub(&p1).getDirection();
    Cell *cell0 = getCell(p0);
    Cell *cell1 = getCell(p1);
    bool fenceBetween = false;

    // are both points inside the playable area
    if (!(boardContains(p0) || !boardContains(p1))) {
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

bool isMoveBlocked(Point p0, Point p1) {
    return !boardContains(p0) || !boardContains(p1) || hasFenceBetween(p0, p1);
}

// determines the change in direction when a robot hits a bumper
Direction getBounceDirection(Direction moveDirection, bool slant) {
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
