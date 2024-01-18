#ifndef ROBOTS_ROBOTMOVE_H
#define ROBOTS_ROBOTMOVE_H

#include "Point.h"
#include "Cell.h"
#include "RobotState.h"

class RobotMove {
private:
    Point position;
    Direction direction;
    Color color;
    RobotState previous;

public:
    RobotMove(Point position, Direction direction, Color color, RobotState previous) : position(position), direction(direction), color(color), previous(previous) {};

    Point getPosition() { return position; }
    Direction getDirection() { return direction; }
    Color getColor() { return color; }
    RobotState getPrevious() { return previous;}

    std::string toString() { return position.toString() + " " + std::to_string(direction);}
    void setColor(Color color) { this->color = color; }
};

#endif //ROBOTS_ROBOTMOVE_H
