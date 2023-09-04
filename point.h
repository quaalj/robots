#ifndef POINT_H
#define POINT_H

#include <string>

namespace v8 {
    class Object;

    template <typename = v8::Object>
    class Local;
}

enum Direction {Left, Up, Right, Down, None};

class Point {
private:
    int x;
    int y;

public:
    static Point *CardinalPoints[4];

    Point();
    Point(int x, int y);
    Point(v8::Local<v8::Object> object);

    ~Point();
    Point(const Point &obj);
    Point& operator=(const Point& point2);

    static Point *fromDirection(Direction direction);

    Direction getDirectPath(const Point *point2);
    Direction getDirection();
    bool equals(const Point *point2);
    Point sub(Point *point2);
    Point add(Point *point2);
    v8::Local<v8::Object> toV8();

    int getX();
    int getY();
    void setX(int x);
    void setY(int y);
    std::string toString();
};

#endif