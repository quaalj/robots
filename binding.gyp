{
  "targets": [
    {
      "include_dirs": [
        "<!(node -e \"require('nan')\")"
      ],
      "target_name": "addon",
      "sources": [ "./native_solver.cpp",
                    "./point.cpp",
                    "./cell.cpp" ]
    }
  ]
}