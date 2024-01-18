#include "RobotState.h"
#include "Point.h"
#include "Cell.h"
#include <vector>

RobotState::RobotState() {
    robots = std::vector<Point>();
    warp = false;
    depth = 0;
}

RobotState::RobotState(std::vector<Point> robots, bool warp, int depth) : robots(robots), warp(warp), depth(depth) {}

RobotState::RobotState(const RobotState &obj) {
    robots = obj.robots;
    warp = obj.warp;
    depth = obj.depth;
}

RobotState &RobotState::operator=(const RobotState &robotState2) {
    robots = robotState2.robots;
    warp = robotState2.warp;
    depth = robotState2.depth;

    return *this;
}

RobotState::~RobotState() = default;

// generates an integer representation of this state
int RobotState::toInt() {
    int result = 0;

    for (int i = 0; i < robots.size(); i++) {
        result |= (robots[i].getX() & 0x0F) << (i * 8);
        result |= (robots[i].getY() & 0x0F) << (i * 8 + 4);
    }

    return result;
}

// convert an integer to a robotState
std::vector<Point> RobotState::uncompressIntState(int state, int numRobots) {
    std::vector<Point> robots = std::vector<Point>(4);

    for (int i = 0; i < numRobots; i++) {
        int x = (state >> (i * 8)) & 0x0F;
        int y = (state >> (i * 8 + 4)) & 0x0F;
        robots.emplace_back(x, y);
    }

    return robots;
}

// check if a robot is at the goal
bool RobotState::checkGoal(Point cell, Goal goal) {
    bool result = false;
    auto it = robots.begin();

    for (int i = 0; i < robots.size(); i++) {
        if ((goal.color == i || goal.symbol == Warp) && (*it).equals(&cell)) {
            result = true;
        }
    }

    return result;
}

int RobotState::getNumRobots() {
    return robots.size();
}

Point RobotState::getRobot(int index) {
    if (index >= 0 && index < robots.size()) {
        return robots[index];
    } else {
        return Point(-1, -1);
    }
}

int RobotState::getDepth() {
    return depth;
}

std::vector<Point> RobotState::getRobots() {
    return robots;
}