#ifndef CELL_H
#define CELL_H

#include <string>
#include "v8.h"

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
    Cell();
    Cell(char attr1, char attr2);
    Cell(v8::Local<v8::Object> object);

    std::string toString();
    bool getFence(Direction);
    bool goalEquals(Goal goal2);

    Bumper *getBumper();
    Goal *getGoal();

    void setBumper(Color color, bool slant);
    void setGoal(Color color, Symbol symbol);

    bool hasBumper();
    bool hasGoal();

    Symbol getSymbol();
};

#endif
