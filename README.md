# PLC-Quest

An interactive PLC learning game with animated conveyors, ladder logic lessons, and a system-building sandbox.

## Run locally

Requires Python 3 for the local web server. No build step or package installation is needed.

```sh
python -m http.server 8000 --directory dist
```

Open http://localhost:8000 in your browser.

## Included

- 30 guided lessons with logic testing, feedback, and hints after three failed attempts.
- Random challenges and weak-spot practice.
- Live conveyor simulation with sensors, stops, lifts, and reject stations.
- Straight, square-loop, and oval-loop layouts.
- Sandbox ladder builder, named system saves, and commissioning checks.
- Scan and rung stepping, I/O monitoring, and troubleshooting missions.

Progress and saved systems are stored in the browser's local storage.

## Saved Classic version

The preserved version is in `dist/saved/2026-10-07/`. With the server running, open http://localhost:8000/saved/2026-10-07/ or use the Classic link in the game.

`release-history.json` records the restore point. This upload preserves the current Workshop game and the Classic snapshot from October 7, 2026.

## Project structure

`dist/` contains the complete static app, including HTML, CSS, JavaScript, and the playable Classic snapshot.

This is an educational simulation. Completing the game does not grant an official PLC certification.
