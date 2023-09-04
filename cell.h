#ifndef CELL_H
#define CELL_H

#include <string>

enum Color : int {Yellow, Green, Red, Blue};
enum Symbol : int {Star, Moon , Gear, Saturn, Warp};
enum Direction : int;

typedef struct Bumper {
    Color color;
    bool slant;
} Bumper;

typedef struct Goal {
    Color color;
    Symbol symbol;
} Goal;

class Cell {
private:
    Bumper *bumper = nullptr;
    Goal *goal = nullptr;
    bool fences[4] = {0};

    void extractGoal(char s);
    void extractBumper(char s);
    void extractFence(char s);

public:
    Cell(char attr1, char attr2);

    std::string toString();
    bool getFence(Direction);

    Bumper *getBumper();
    Goal *getGoal();

    bool hasBumper();
    bool hasGoal();
};

#endif
