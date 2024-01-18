#include "Point.h"
#include "nan.h"
#include "v8.h"
#include <iostream>

using namespace Nan;
using namespace v8;

// Points representing LEFT, UP, RIGHT, and DOWN
Point *Point::CardinalPoints[4] = {new Point(-1, 0), new Point(0, -1), new Point(1, 0), new Point(0, 1)};

Point::Point() : x(0), y(0) {};

Point::Point(int x, int y) : x(x), y(y) {}

Point::Point(v8::Local<v8::Object> object) {
    x = To<int>(Get(object, Encode("x", 1, UTF8)).ToLocalChecked()).FromJust();
    y = To<int>(Get(object, Encode("y", 1, UTF8)).ToLocalChecked()).FromJust();
}

Point::Point(const Point &point2) {
    x = point2.x;
    y = point2.y;
}

Point &Point::operator=(const Point &point2) {
    x = point2.x;
    y = point2.y;

    return *this;
}

Point::~Point() = default;


v8::Local<v8::Object> Point::toV8() {
    Local<Object> ret = New<Object>();

    Nan::Set(ret, Encode("x", 1, UTF8), New<Number>(x));
    Nan::Set(ret, Encode("y", 1, UTF8), New<Number>(y));

    return ret;
}

// converts a direction to its Point representation
Point *Point::fromDirection(Direction direction) {
    if (direction >= 0 && direction <= 4) {
        return Point::CardinalPoints[direction];
    } else {
        return new Point(0, 0);
    }
}

Direction Point::getDirectPath(const Point *point2) {
    Point direction = Point(x - point2->x, y - point2->y);
    return direction.getDirection();
}

// Converts Point to direction
Direction Point::getDirection() {
    if (x == 0) {
        if (y > 0) {
            return Down;
        } else if (y < 0) {
            return Up;
        }
    } else if (y == 0) {
        if (x > 0) {
            return Right;
        } else if (x < 0) {
            return Left;
        }
    }

    return Direction::None;
}

Point Point::sub(Point *point2) {
    if (point2 == nullptr) point2 = new Point(0,0);
    return *(new Point(x - point2->x, y - point2->y));
}

Point Point::add(Point *point2) {
    if (point2 == nullptr) point2 = new Point(0,0);
    return *(new Point(x + point2->x, y + point2->y));
}

bool Point::equals(const Point *point2) {
    return x == point2->x && y == point2->y;
}

int Point::getX() {
    return x;
}

int Point::getY() {
    return y;
}

void Point::setX(int x) { this->x = x;}

void Point::setY(int y) { this->y = y;}

std::string Point::toString() {
    return "(" + std::to_string(x) + "," + std::to_string(y) + ")";
}
