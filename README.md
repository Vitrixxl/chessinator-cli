# chessinator-cli

A terminal-based chess puzzle trainer that uses Lichess's puzzle database. Train your brain before your coding session!

## Features

- Interactive CLI chess puzzle interface with beautiful Unicode pieces
- Automatic download and setup of Lichess puzzle database (~5,4M+ puzzles)
- Progress tracking (tracks solved puzzles)

## Prerequisites

You need to have these tools installed:

- [Bun](https://bun.sh) - JavaScript runtime
- [zstd](https://github.com/facebook/zstd) - Decompression utility (for build process)

### Installing prerequisites

**macOS:**
```bash
brew install bun zstd
```

**Linux (Arch):**
```bash
pacman -S bun zstd
```

**Linux (Debian/Ubuntu):**
```bash
# Bun
curl -fsSL https://bun.sh/install | bash

# zstd
sudo apt install zstd
```

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd chessinator-cli
```

2. Install dependencies:
```bash
bun install
```

3. Build the project:
```bash
bun run build.ts
```

This will:
- Build the application
- Download the Lichess puzzle database (~300MB compressed)
- Decompress and convert it to SQLite format
- Create the `puzzle.db` database with:
  - `puzzle` table: All puzzles from Lichess
  - `solved` table: Your progress tracker
- Clean up temporary files

**Note:** The first build will take some time due to the database download. Subsequent builds will skip this step if `puzzle.db` already exists.

## Usage

To run the app:

```bash
bun run index.ts
```

Or after building, run the compiled version:

```bash
bun ./dist/index.js
```

### How to play

1. The board is displayed with the current position
2. Type your move in standard algebraic notation (e.g., `Nf3`, `e4`, `Qxd5`)
3. Press Enter to submit
4. If correct, the opponent's move will be played automatically
5. Continue until you solve the puzzle
6. The app will automatically load the next unsolved puzzle

## Development

Run in development mode with hot reload:

```bash
bun --hot index.ts
```

## Project Structure

```
chessinator-cli/
├── index.tsx          # Main app with React (Ink) UI
├── build.ts           # Build script with database setup
├── puzzle.db          # SQLite database (generated)
└── dist/              # Compiled output
```

## Database Schema

### puzzle table
- `puzzleId`: Unique puzzle identifier
- `fen`: Chess position in FEN notation
- `moves`: Space-separated UCI moves
- `themes`: Space-separated puzzle themes
- `gameUrl`: Link to original game on Lichess

### solved table
- `id`: Puzzle ID that you've solved

## Acknowledgments

- Puzzle database from [Lichess](https://database.lichess.org/)
- Built with [Bun](https://bun.sh), [Ink](https://github.com/vadimdemedes/ink), and [chess.js](https://github.com/jhlywa/chess.js)
