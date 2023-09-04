#include "cell.h"

#include <cstdlib>
#include <cctype>
#include <string>
#include <iostream>

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

bool Cell::getFence(Direction direction) {
    return fences[direction];
}
