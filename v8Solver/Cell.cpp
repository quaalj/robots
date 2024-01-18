#include "Cell.h"
#include "nan.h"
#include "v8.h"

#include <cstdlib>
#include <cctype>
#include <string>
#include <iostream>

using namespace Nan;

Cell::Cell() = default;

Cell::Cell(v8::Local<v8::Object> object) {
    v8::Local<v8::Array> fencesArg = v8::Local<v8::Array>::Cast(Get(object, Encode("fences", 6, UTF8)).ToLocalChecked());
    v8::MaybeLocal<v8::Value> goalArg = Get(object, Encode("goal", 4, UTF8));
    v8::MaybeLocal<v8::Value> bumperArg = Get(object, Encode("bumper", 6, UTF8));

    // read fences
    for (int i = 0; i < 4; i++) {
        fences[i] = To<bool>(Get(fencesArg, i).ToLocalChecked()).FromJust();
    }

    // read goal
    if (!goalArg.IsEmpty() && !goalArg.ToLocalChecked()->IsNullOrUndefined()) {
        v8::Local<v8::Object> goalChecked = To<v8::Object>(goalArg.ToLocalChecked()).ToLocalChecked();

        Color goalColor = (Color)To<int>(Get(goalChecked, Encode("color", 5, UTF8)).ToLocalChecked()).FromJust();
        Symbol goalSymbol = (Symbol)To<int>(Get(goalChecked, Encode("symbol", 6, UTF8)).ToLocalChecked()).FromJust();
        setGoal(goalColor, goalSymbol);
    }

    // read bumper
    if (!bumperArg.IsEmpty() && !bumperArg.ToLocalChecked()->IsNullOrUndefined()) {
        v8::Local<v8::Object> bumperChecked = To<v8::Object>(bumperArg.ToLocalChecked()).ToLocalChecked();

        Color bumperColor = (Color)To<int>(Get(bumperChecked, Encode("color", 5, UTF8)).ToLocalChecked()).FromJust();
        bool bumperSlant = To<bool>(Get(bumperChecked, Encode("slant", 5, UTF8)).ToLocalChecked()).FromJust();
        setBumper(bumperColor, bumperSlant);
    }
}

// creates a cell from its two character string representation
Cell::Cell(char a1, char a2) {
    extractGoal(a1);
    extractBumper(a1);
    extractFence(a2);
}

void Cell::extractGoal(char s) {
    char attr1[2] = {s, '\0'};
    int goalInt = (int)strtol(attr1, nullptr, 16);

    // W = Warp, otherwise the goal's color is the int % 4 and the goal's
    // symbol is the int / 4
    if (s != ' ') {
        if (s == 'W') {
            goal = (Goal *)malloc(sizeof(Goal));
            goal->symbol = Warp;
        } else if (std::isupper(s) && (goalInt != 0 || s == '0')) {
            goal = (Goal *)malloc(sizeof(Goal));

            goal->color = static_cast<Color>(goalInt % 4);
            goal->symbol = static_cast<Symbol>(goalInt / 4);
        }
    }
}

void Cell::extractBumper(char s) {
    // determine the bumper's color
    switch (std::tolower(s)) {
        case 'y':
            bumper = (Bumper *)malloc(sizeof(Bumper));
            bumper->color = Yellow;
            break;
        case 'r':
            bumper = (Bumper *)malloc(sizeof(Bumper));
            bumper->color = Red;
            break;
        case 'u':
            bumper = (Bumper *)malloc(sizeof(Bumper));
            bumper->color = Blue;
            break;
        case 'g':
            bumper = (Bumper *)malloc(sizeof(Bumper));
            bumper->color = Green;
    }

    // determine the direction of the bumper
    if (bumper != nullptr) {
        if (std::isupper(s)) {
            bumper->slant = true;
        }
    }
}

void Cell::extractFence(char s) {
    char attr1[2] = {s, '\0'};
    int fence = (int)strtol(attr1, nullptr, 16);

    // 4 bit field containing the fence's direction in the cell
    if (s != ' ') {
        for (int i = 0; i < 4; i++) {
            fences[i] = (fence & 1 << i) != 0;
        }
    }
}

bool Cell::goalEquals(Goal goal2) {
    return hasGoal() && goal->symbol == goal2.symbol && goal->color == goal2.color;
}

std::string Cell::toString() {
    const char BLANK_CHAR = '_';
    char outString[3] = {0};
    int fenceInt = 0;

    if (hasGoal()) {
        if (goal->symbol == Warp) {
            outString[0] = 'W';
        } else {
            std::sprintf (&outString[0], "%01x", (goal->symbol * 4) + goal->color);
        }
    } else if (hasBumper()) {
        switch (bumper->color) {
            case Yellow:
                outString[0] = 'y';
                break;
            case Green:
                outString[0]  = 'g';
                break;
            case Red:
                outString[0]  = 'r';
                break;
            case Blue:
                outString[0]  = 'u';
                break;
        }

        if (bumper->slant == false) {
            outString[0]  = (char)((int)outString[0]  + 32);
        }
    } else {
        outString[0]  = BLANK_CHAR;
    }

    for (int i = 0; i < 4; i++) {
        if (fences[i]) {
            fenceInt |= 1 << i;
        }
    }

    if (fenceInt == 0) {
        outString[1] = BLANK_CHAR;
    } else {
        std::sprintf(&outString[1], "%01x", fenceInt);
    }

    return outString;
}

bool Cell::hasBumper() {
    return bumper != nullptr;
}

bool Cell::hasGoal() {
    return goal != nullptr;
}

Bumper *Cell::getBumper() {
    return bumper;
}

Goal *Cell::getGoal() {
    return goal;
}

void Cell::setBumper(Color color, bool slant) {
    bumper = new Bumper();
    bumper->color = color;
    bumper->slant = slant;
}

void Cell::setGoal(Color color, Symbol symbol) {
    goal = new Goal();
    goal->color = color;
    goal->symbol = symbol;
}

bool Cell::getFence(Direction direction) {
    return fences[direction];
}

Symbol Cell::getSymbol() {
    return goal->symbol;
}
