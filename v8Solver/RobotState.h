#ifndef ROBOT_STATE_H
#define ROBOT_STATE_H

#include <vector>
#include "Cell.h"

class Point;

class RobotState {
private:
    std::vector<Point> robots;
    bool warp;
    int depth;

public:
    RobotState();
    RobotState(std::vector<Point> robots, bool warp, int depth);

    RobotState(const RobotState &obj);
    RobotState& operator=(const RobotState& robotState2);
    ~RobotState();

    int toInt();
    static std::vector<Point> uncompressIntState(int state, int numRobots);
    bool checkGoal(Point point, Goal goal);
    int getNumRobots();
    Point getRobot(int index);

    int getDepth();
    std::vector<Point> getRobots();
};

#endif
