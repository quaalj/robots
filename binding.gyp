{
  "targets": [
    {
      "include_dirs": [
        "<!(node -e \"require('nan')\")"
      ],
      "target_name": "addon",
      "sources": [ "./v8Solver/v8Solver.cpp",
                    "./v8Solver/point.cpp",
                    "./v8Solver/cell.cpp",
                     "./v8Solver/board.cpp",
                     "./v8Solver/robotState.cpp"]
    }
  ]
}