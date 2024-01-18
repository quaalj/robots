#include "nan.h"
#include "v8.h"
#include <string>
#include <iostream>
#include <cassert>
#include <vector>
#include <algorithm>
#include <map>
#include <queue>
#include <set>
#include <chrono>

#include "Point.h"
#include "Cell.h"
#include "Board.h"
#include "RobotState.h"
#include "RobotMove.h"

#define MAX_MOVE 25

void readSolverArguments(Nan::NAN_METHOD_ARGS_TYPE info, Board *&board, Cell &goal, std::vector<Point> &robots, int &earlyOut);
Direction getBounceDirection(Direction moveDirection, bool slant);
std::vector<RobotMove> dumpSolution(Board *board, std::vector<Point> originalRobots, RobotState finalState, std::map<int, RobotMove*> stateTree);
std::vector<RobotMove> solveBoard(Nan::NAN_METHOD_ARGS_TYPE info);

NAN_METHOD(fastSolveBoard) {
    // solve board
    std::vector<RobotMove> moves = solveBoard(info);

    // recreate solution
    v8::Local<v8::Array> stateSequence = Nan::New<v8::Array>(moves.size());

    // prepare state sequence to be returned to Node
    for (int i = 0; i < moves.size(); i++) {
        v8::Local<v8::Object> state = Nan::New<v8::Object>();

        v8::Local<v8::String> colorString = Nan::New<v8::String>("color").ToLocalChecked();
        v8::Local<v8::String> directionString = Nan::New<v8::String>("direction").ToLocalChecked();

        Nan::Set(state, colorString, Nan::New<v8::Integer>((int) moves[i].getColor()));
        Nan::Set(state, directionString, Nan::New<v8::Integer>((int) moves[i].getDirection()));

        Nan::Set(stateSequence, i, state);
    }

    // return state sequence
    info.GetReturnValue().Set(stateSequence);
}

std::vector<RobotMove> solveBoard(Nan::NAN_METHOD_ARGS_TYPE info) {
    std::vector<Point> robots;
    std::vector<Point *> outlist;
    Cell goal = Cell();
    int earlyOut;
    Board *board;

    readSolverArguments(info, board, goal, robots, earlyOut);

    // initialize variables
    std::vector<Point> botCopy = robots;
    bool isWarp = goal.getSymbol() == Warp;
    RobotState startingState = RobotState(botCopy, isWarp, 0);
    std::map<int, RobotMove*> visitedStates;

    // set up bucket priority queue
    auto comparator = [](RobotState state0, RobotState state1) {
        return state0.getDepth() > state1.getDepth();
    };
    std::priority_queue<RobotState, std::vector<RobotState>, decltype(comparator)> queue(comparator);

    Point goalPos = board->findGoal(*goal.getGoal());

    visitedStates[startingState.toInt()] = nullptr;
    queue.emplace(startingState);

    // check if starting state is also goal
    if (startingState.checkGoal(goalPos, *goal.getGoal())) {
        if (earlyOut != -1) {
            return {};
        }

        return dumpSolution(board, robots, RobotState(robots, isWarp, 1), visitedStates);
    }

    /*
     * DO PRIORITY ROOKBOARDS LATER
    let priorityRookBoards = new Array(robots.length);
    for (let i = 0; i < robots.length; ++i) {
        if (isWarp || goal.color == i) {
            priorityRookBoards[i] = board.createRookBoard(goalPos, i);
        }
    }

     	function getHeuristic(positions) {
		let result = undefined;
		for (let i = 0; i < robots.length; ++i) {
			if (priorityRookBoards[i] === undefined) {
				continue;
			}
			let currentVal = priorityRookBoards[i][board.indexify(positions[i].x, positions[i].y)];
			if (result === undefined || currentVal < result) {
				result = currentVal;
			}
		}
		return result;
	}
    */

    while (!queue.empty()) {
        // get next move to check
        RobotState currentState = queue.top();
        queue.pop();

        // check each direction for each colour robot
        for (int robot = 0; robot < currentState.getNumRobots(); robot++) {
            for (int direction = 0; direction < 4; direction++) {
                // do move
                std::vector<Point> currentRobotPositions = currentState.getRobots();
                Point result = board->doMove(currentRobotPositions, robot, (Direction) direction, false);

                // escape if the robot did not move
                if (currentState.getRobot(robot).equals(&result)) {
                    continue;
                }

                // store robot positions after the move
                std::vector<Point> robotPositions = currentState.getRobots();
                robotPositions[robot] = result;

                RobotState nextState = RobotState(robotPositions, isWarp, currentState.getDepth() + 1);

                // check if this configuration of robots has been seen before
                if (visitedStates.count(nextState.toInt())) {
                    continue;
                }

                // add this move to the list of robot configurations already seen
                visitedStates[nextState.toInt()] = new RobotMove(currentState.getRobot(robot), (Direction) direction,
                                                                 (Color) robot, currentState);

                // return solution if robot makes it to the goal
                if ((isWarp || robot == goal.getGoal()->color) && result.equals(&goalPos)) {
                    return dumpSolution(board, robots, nextState, visitedStates);
                }

                if (earlyOut == -1 && earlyOut >= nextState.getDepth()) {
                    continue;
                }

                /*
                 * 	 heuristic stuff that doesn't quite work
                 let lowerBoundCost = nextState.depth + getHeuristic(robotPositions);

				if (lowerBoundCost > MAX_MOVE) {
					continue;
				}
                 */

                queue.push(nextState);
            }
        }
    }

    return {};
}

// generate a list of moves to recreate the solution
std::vector<RobotMove> dumpSolution(Board *board, std::vector<Point> originalRobots, RobotState finalState, std::map<int, RobotMove*> stateTree) {
    RobotState currentState = finalState;
    std::vector<Point> currentRobots = originalRobots;
    std::vector<RobotMove> moves;

    // recreate sequence of moves
    while (!currentState.getRobots().empty()) {
        std::map<int, RobotMove*>::iterator curr = stateTree.find(currentState.toInt());

        if ( curr != stateTree.end() ) {

            RobotMove *prevMove = curr->second;
            if (prevMove == nullptr) {
                break;
            }

            moves.emplace_back(*prevMove);
            currentState = prevMove->getPrevious();
        }
    }

    std::reverse(moves.begin(), moves.end());

    // Get color information
    for (int i = 0; i < moves.size(); i++) {
        Point currPosition = moves[i].getPosition();
        auto iterator = currentRobots.begin();

        for(int j = 0; j < currentRobots.size(); j++) {
            if ((*iterator).equals(&currPosition)) {
                moves[i].setColor((Color)j);
                currentRobots[j] = board->doMove(currentRobots, j, moves[i].getDirection(), false);
                break;
            }

            iterator++;
        }
    }

    return moves;
}


void readSolverArguments(Nan::NAN_METHOD_ARGS_TYPE info, Board *&board, Cell &goal, std::vector<Point> &robots, int &earlyOut) {
    // read board
    v8::Local<v8::Object> boardArg = Nan::To<v8::Object>(info[0]).ToLocalChecked();
    board = new Board(boardArg);

    // read goal
    v8::Local<v8::Object> goalArg = Nan::To<v8::Object>(info[1]).ToLocalChecked();
    Color goalColor = (Color)Nan::To<int>(Nan::Get(goalArg, Encode("color", 5, Nan::UTF8)).ToLocalChecked()).FromJust();
    Symbol goalSymbol = (Symbol)Nan::To<int>(Nan::Get(goalArg, Encode("symbol", 6, Nan::UTF8)).ToLocalChecked()).FromJust();

    goal.setGoal(goalColor, goalSymbol);

    // read robots
    v8::Local<v8::Array> robotList = v8::Local<v8::Array>::Cast(info[2]);

    for (int i = 0; i < (int)robotList->Length(); i++) {
        if (Nan::Has(robotList, i).FromJust()) {
            v8::Local<v8::Object> point = Nan::To<v8::Object>(Nan::Get(robotList, i).ToLocalChecked()).ToLocalChecked();
            robots.emplace_back(point);
        }
    }

    // read option earlyOut
    if (info.Length() == 4 && !Nan::To<bool>(info[3]).IsNothing()) {
        earlyOut = Nan::To<int>(info[3]).FromJust();
    } else {
        earlyOut = -1;
    }
}

NAN_MODULE_INIT(Initialize) {
    NAN_EXPORT(target, fastSolveBoard);
}

NODE_MODULE(addon, Initialize);

// Only need if this is going into the worker thread
NAN_MODULE_WORKER_ENABLED(addon, Initialize);