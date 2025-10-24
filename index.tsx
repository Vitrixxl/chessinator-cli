import { render, Text, Box } from "ink";
import {
  Chess,
  Move,
  type Color,
  type PieceSymbol,
  type Square,
} from "chess.js";
import { SQL } from "bun";
import React from "react";
import TextInput from "ink-text-input";
import envPaths from "env-paths";
import path from "node:path";
const paths = envPaths("chessinator-cli", { suffix: "" });
const db = new SQL(`sqlite://${path.resolve(paths.data, "puzzle.db")}`);

// TYPES
type Board = ({
  square: Square;
  type: PieceSymbol;
  color: Color;
} | null)[][];

type Puzzle = {
  puzzleId: string;
  fen: string;
  moves: string[];
  themes: string[];
  gameUrl: string;
};
type RawPuzzle = {
  puzzleId: string;
  fen: string;
  moves: string;
  themes: string;
  gameUrl: string;
};

// Utils
const parseRawPuzzle = (rawPuzzle: RawPuzzle): Puzzle => {
  return {
    ...rawPuzzle,
    moves: rawPuzzle.moves.split(" "),
    themes: rawPuzzle.themes.split(" "),
  };
};

const getBaseData = async () => {
  const [{ solved }] = await db<{ solved: number }[]>`
SELECT COUNT(*) as solved FROM solved
`;
  const [{ total }] = await db<{ total: number }[]>`
SELECT COUNT(*) as total FROM puzzle
`;

  const [rawPuzzle] = await db<RawPuzzle[]>`
SELECT puzzleId as puzzleId , fen as fen,moves as moves,themes as themes,gameUrl as gameUrl from  puzzle order by puzzleId asc  limit 1 offset ${solved} 
`;
  const puzzle = parseRawPuzzle(rawPuzzle);
  return { solved, total, puzzle };
};

const initChess = (chess: Chess, puzzle: Puzzle) => {
  chess.load(puzzle.fen);
  chess.move(uciToMoveObject(puzzle.moves[0]));
};

const uciToMoveObject = (uci: string) => {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promo = uci.length === 5 ? (uci[4].toLowerCase() as any) : undefined;
  return { from, to, promotion: promo };
};

const moveToUci = (move: Move) => {
  return `${move.from}${move.to}${move.promotion ?? ""}`;
};

const pieceMaper = (type: PieceSymbol, color: Color): string => {
  const pieces = {
    w: {
      b: "󰡜",
      r: "󰡛",
      q: "󰡚",
      p: "󰡙",
      n: "󰡘",
      k: "󰡗",
    },
    b: {
      b: "󰡜",
      r: "󰡛",
      q: "󰡚",
      p: "󰡙",
      n: "󰡘",
      k: "󰡗",
    },
  };
  return pieces[color][type];
};

const handleFinish = async (id: string) => {
  await db`
  INSERT INTO solved (id) values (${id})
  `.catch((e) => console.error(e));
  setTimeout(() => unmount(), 200);
};

const chess = new Chess();
const { puzzle, solved, total } = await getBaseData();
initChess(chess, puzzle);

const color = chess.turn();

const BoardComponent = ({
  board,
  playerColor,
}: {
  board: Board;
  playerColor: Color;
}) => {
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

  const displayBoard =
    playerColor === "b"
      ? [...board].reverse().map((row) => [...row].reverse())
      : board;
  const displayFiles = playerColor === "b" ? [...files].reverse() : files;
  const displayRanks = playerColor === "b" ? [...ranks].reverse() : ranks;

  return (
    <Box paddingY={2} flexDirection="column">
      {displayBoard.map((row, rowIndex) => (
        <Box key={rowIndex}>
          <Text color="gray" dimColor>
            {displayRanks[rowIndex]}{" "}
          </Text>
          {row.map((cell, colIndex) => {
            const isLightSquare = (rowIndex + colIndex) % 2 === 0;
            const squareBgColor = isLightSquare ? "#F0D9B5" : "#B58863";

            if (cell) {
              const pieceChar = pieceMaper(cell.type, cell.color);
              const pieceColor = cell.color === "w" ? "#FFFFFF" : "#000000";

              return (
                <Box
                  key={colIndex}
                  backgroundColor={squareBgColor}
                  paddingX={1}
                >
                  <Text color={pieceColor}>{pieceChar}</Text>
                </Box>
              );
            } else {
              return (
                <Box
                  key={colIndex}
                  backgroundColor={squareBgColor}
                  paddingX={1}
                >
                  <Text> </Text>
                </Box>
              );
            }
          })}
        </Box>
      ))}
      <Box>
        <Text>{"   "}</Text>
        {displayFiles.map((file) => (
          <Text key={file} color="gray" dimColor>
            {file}
            {"  "}
          </Text>
        ))}
      </Box>
    </Box>
  );
};

const App = () => {
  const [board, setBoard] = React.useState(chess.board());
  const [value, setValue] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);
  const [finish, setIsFinish] = React.useState(false);
  const moveCountRef = React.useRef(1);

  const handleInvalidMove = () => {
    setError("This move isn't valid");
    setValue("");
    return;
  };
  const handleWrongMove = () => {
    setError("Oops, wrong move !");
    setValue("");
    return;
  };
  const handleSubmit = async (move: string) => {
    if (!chess.moves().find((m) => m == move)) {
      handleInvalidMove();
      return;
    }
    setError(null);

    const m = chess.move(move);
    const uciMove = moveToUci(m);
    if (uciMove != puzzle.moves[moveCountRef.current]) {
      chess.undo();
      handleWrongMove();
      return;
    }
    setError(null);
    setValue("");

    moveCountRef.current += 1;
    setBoard(chess.board());
    if (moveCountRef.current == puzzle.moves.length) {
      handleFinish(puzzle.puzzleId);
      setIsFinish(true);
      return;
    }
    setTimeout(async () => {
      chess.move(uciToMoveObject(puzzle.moves[moveCountRef.current]));
      moveCountRef.current += 1;

      setBoard(chess.board());
    }, 200);
  };

  return (
    <Box flexDirection="column">
      <Box
        borderColor="cyan"
        borderStyle="bold"
        borderLeft={false}
        borderRight={false}
        flexDirection="column"
      >
        <Text bold color={"blue"}>
          WELCOME TO CHESSINATOR-CLI
        </Text>
        <Text color={"cyan"}>Train your brain before your coding session</Text>
      </Box>
      <BoardComponent board={board} playerColor={color} />
      {!finish ? (
        <>
          <Box
            width={"100%"}
            backgroundColor=""
            borderStyle={"bold"}
            borderColor={"gray"}
            borderLeft={false}
            borderRight={false}
            justifyContent="space-between"
          >
            <Box>
              <Text>{">"} </Text>
              <Text color={"white"}>
                <TextInput
                  value={value}
                  onChange={setValue}
                  placeholder={`Write your move here... (${color == "b" ? "Black" : "White"} turn)`}
                  onSubmit={handleSubmit}
                />
              </Text>
            </Box>
            <Text>
              {solved} / {total}
            </Text>
          </Box>
          {/* <Text>Moves : {chess.moves().map((m) => m + ",")}</Text> */}
          {error && <Text color={"red"}>{error}</Text>}
        </>
      ) : (
        <Text color="green">Congrats you finish this puzzle !</Text>
      )}
    </Box>
  );
};

const { waitUntilExit, unmount } = render(<App />);

await waitUntilExit();
