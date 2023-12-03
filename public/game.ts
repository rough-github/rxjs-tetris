import { minoColors, MinoType, minoTypes, Rotated_T_Mino } from "./mino.ts";
import {
  BLOCK_SIZE,
  BOARD_COL,
  BOARD_ROW,
  CANVAS_H,
  CANVAS_W,
  ctx,
  SPEED,
  TETSIZE,
} from "./vars.ts";
import {
  filter,
  fromEvent,
  iif,
  interval,
  map,
  merge,
  mergeMap,
  NEVER,
  of,
  shareReplay,
  Subject,
  switchMap,
  takeUntil,
  tap,
  zip,
} from "https://code4fukui.github.io/rxjs-es/rxjs.js";
// } from "https://deno.land/x/rxjs@v1.0.2/mod.ts";
import { isEqual } from "https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.min.js";
import { NEXT_CANVAS_H, NEXT_CANVAS_W, nextCtx } from "./next-mino-vars.ts";
import {
  STOCKED_CANVAS_H,
  STOCKED_CANVAS_W,
  stockedCtx,
} from "./stocked-mino-vars.ts";

// ゲームオーバーフラグ
const isGameOver$ = new Subject<void>();

// ---------- ↓ 初期化時の処理 ↓ ----------

// ボード本体
const board: number[][] = [];

/**
 * ボードを初期化
 */
const initializeBoard = () => {
  for (let y = 0; y < BOARD_ROW; y++) {
    board[y] = [];
    for (let x = 0; x < BOARD_COL; x++) {
      board[y][x] = 0;
    }
  }
};

/**
 * テトリミノのindexを抽選
 */
const generateRandomMinoIdx = () =>
  Math.floor(Math.random() * (minoTypes.length - 1)) + 1;

/** ゲーム開始 */
const startTetris$ = of(undefined);

// ---------- ↑ 初期化時の処理 ↑ ----------

// ---------- ↓ ミノに関する情報 ↓ ----------

/** 対象のミノ */
let mino: MinoType | undefined = undefined;

/** 対象のミノのID */
let minoIndex: number | undefined = undefined;

/** 対象のミノ */
let nextMino: MinoType | undefined = undefined;

/** 次のミノのID */
let nextMinoIndex: number | undefined = undefined;

/** ストックしたミノ */
let stockedMino: MinoType | undefined = undefined;

/** ストックしたミノのID */
let stockedMinoIndex: number | undefined = undefined;

/** y座標 */
let position_y = -1;

/** x座標 */
let position_x = BOARD_COL / 2 - TETSIZE / 2;

/** 対象のミノ */
const mino$ = of(undefined).pipe(switchMap(() => of(mino)));

/** 対象のミノ */
const nextMino$ = of(undefined).pipe(switchMap(() => of(nextMino)));

/** ストックのミノ */
const stockedMino$ = of(undefined).pipe(switchMap(() => of(stockedMino)));

/** 対象のミノのID */
const minoIndex$ = of(undefined).pipe(switchMap(() => of(minoIndex)));

/** 次のミノのID */
const nextMinoIndex$ = of(undefined).pipe(switchMap(() => of(nextMinoIndex)));

/** 次のミノのID */
const stockedMinoIndex$ = of(undefined).pipe(
  switchMap(() => of(stockedMinoIndex)),
);

/** 対象のミノの位置 (x軸) */
const minoPositionX$ = of(undefined).pipe(switchMap(() => of(position_x)));

/** 対象のミノの位置 (y軸) */
const minoPositionY$ = of(undefined).pipe(switchMap(() => of(position_y)));

/**
 * 呼び出される度にy座標を1マス下げる
 */
const moveDown$ = of(undefined).pipe(switchMap(() => of(++position_y)));

/**
 * 呼び出される度にx座標を1マス左へ
 */
const moveLeft$ = of(undefined).pipe(switchMap(() => of(--position_x)));

/**
 * 呼び出される度にx座標を1マス右へ
 */
const moveRight$ = of(undefined).pipe(switchMap(() => of(++position_x)));

/** ミノをセット */
const setMino = () => {
  position_x = BOARD_COL / 2 - TETSIZE / 2;
  position_y = -1;
  minoIndex = nextMinoIndex === undefined
    ? generateRandomMinoIdx()
    : nextMinoIndex;
  nextMinoIndex = generateRandomMinoIdx();
  mino = minoTypes[minoIndex];
  nextMino = minoTypes[nextMinoIndex];
};

// ---------- ↑ ミノに関する情報 ↑ ----------

// ---------- ↓ テトリス移動関連 ↓ ----------

// 下に行けない
const cantMove$ = zip([
  mino$,
  minoPositionX$,
  minoPositionY$,
  minoIndex$,
]).pipe(
  // ミノをその場所に固定
  switchMap(([mino, minoPositionX, minoPositionY, minoIndex]) =>
    fixTet(mino!, minoPositionX, minoPositionY, minoIndex!)
  ),
  // 行が揃っていれば削除
  switchMap(() => clearLine()),
  switchMap((clearLineCount) => addScore(clearLineCount)),
  tap(() => setMino()),
  switchMap(() => nextMinoDraw$),
  // ミノをセットした後に下に動けなかったらゲームオーバー
  switchMap(() => checkGameOver$),
);

/** ミノが移動可能かどうか */
const canMinoMove = (
  dx: number,
  dy: number,
) =>
  zip([
    mino$,
    minoPositionX$,
    minoPositionY$,
  ]).pipe(map(([mino, minoPositionX, minoPositionY]) =>
    canMove(dx, dy, minoPositionX, minoPositionY, mino!)
  ));

/**
 * 指定された方向に移動できるか？
 * @param dx x方向移動量
 * @param dy y方向移動量
 * @param offsetX 動かすミノの場所 (x軸方向)
 * @param offsetY 動かすミノの場所 (y軸方向)
 * @param nowTet 動かすミノ
 * @returns 移動できるかどうか
 */
const canMove = (
  dx: number,
  dy: number,
  offsetX: number,
  offsetY: number,
  nowMino: MinoType,
) => {
  for (let y = 0; y < TETSIZE; y++) {
    for (let x = 0; x < TETSIZE; x++) {
      //その場所にブロックがあれば
      if (nowMino[y][x]) {
        //ボード座標に変換（offsetX(-2~8)+x(0~3)+移動量(-1~1)
        const nx = offsetX + x + dx;
        const ny = offsetY + y + dy;
        if (
          //調査する座標がボード外だったらできない
          ny < 0 ||
          nx < 0 ||
          ny >= BOARD_ROW ||
          nx >= BOARD_COL ||
          //移動したいボード上の場所にすでに存在してたらできない
          board[ny][nx]
        ) {
          //移動できない
          return false;
        }
      }
    }
  }
  //移動できる
  return true;
};

/**
 * ミノを下に移動させる
 */
const minoMoveDown$ = canMinoMove(0, 1).pipe(
  switchMap((data) =>
    iif(
      () => data,
      moveDown$,
      cantMove$,
    )
  ),
);

// ---------- ↑ テトリス移動関連 ↑ ----------

// ---------- ↓ キーボード操作関連 ↓ ----------

const keyboardEvent$ = fromEvent<KeyboardEvent>(document, "keydown").pipe(
  shareReplay(1),
);

const keyDown$ = keyboardEvent$.pipe(
  filter((e: KeyboardEvent) => e.code === "ArrowDown"),
).pipe(
  switchMap(() => canMinoMove(0, 1)),
  switchMap((data) =>
    iif(
      () => data,
      moveDown$,
      NEVER,
    )
  ),
);

const keyLeft$ = keyboardEvent$.pipe(
  filter((e: KeyboardEvent) => e.code === "ArrowLeft"),
).pipe(
  switchMap(() => canMinoMove(-1, 0)),
  switchMap((data) =>
    iif(
      () => data,
      moveLeft$,
      NEVER,
    )
  ),
);

const keyRight$ = keyboardEvent$.pipe(
  filter((e: KeyboardEvent) => e.code === "ArrowRight"),
).pipe(
  switchMap(() => canMinoMove(1, 0)),
  switchMap((data) =>
    iif(
      () => data,
      moveRight$,
      NEVER,
    )
  ),
);

const keySpace$ = keyboardEvent$.pipe(
  filter((e: KeyboardEvent) => e.code === "Space"),
).pipe(
  switchMap(() => createRotateMino$),
);

const keyEscape$ = keyboardEvent$.pipe(
  filter((e: KeyboardEvent) => e.code === "Escape"),
).pipe(
  switchMap(() => stockOrExchangeMino$),
);
const keyboardEventListener$ = merge(
  keyDown$,
  keyLeft$,
  keyRight$,
  keySpace$,
  keyEscape$,
);

// ---------- ↑ キーボード操作関連 ↑ ----------

// ---------- ↓ ミノ回転関連 ↓ ----------

/** ミノを回転させる */
const createRotateMino$ = mino$.pipe(
  map((mino) => createRotateMino(mino as MinoType)),
  switchMap((newMino) =>
    zip([
      of(newMino),
      minoPositionX$,
      minoPositionY$,
    ])
  ),
  switchMap(([newMino, minoPositionX, minoPositionY]) => {
    if (canMove(0, 0, minoPositionX, minoPositionY, newMino)) {
      mino = newMino;
      return of(undefined);
    }
    return NEVER;
  }),
);

/** ミノを回転させる */
const createRotateMino = (mino: MinoType) => {
  //新しいtetを作る
  const newMino: MinoType = [];
  for (let y = 0; y < TETSIZE; y++) {
    newMino[y] = [];
    for (let x = 0; x < TETSIZE; x++) {
      //時計回りに90度回転させる
      newMino[y][x] = mino[TETSIZE - 1 - x][y];
    }
  }
  return newMino;
};

// ---------- ↑ ミノ回転関連 ↑ ----------

// ---------- ↓ ミノ交換関連 ↓ ----------

const stockOrExchangeMino$ = stockedMino$.pipe(
  switchMap((stockedMino) =>
    iif(
      () => !!stockedMino,
      // 交換
      exchangeMino$,
      // ストック
      stockMino$,
    )
  ),
);

const stockMino$ = zip([
  mino$,
  minoIndex$,
]).pipe(
  tap(([mino, minoIndex]) => stockMino(mino!, minoIndex!)),
  switchMap(() => stockedMinoDraw$),
  tap(() => setMino()),
);

const stockMino = (mino: MinoType, minoInidex: number) => {
  stockedMino = mino;
  stockedMinoIndex = minoInidex;
};

const exchangeMino$ = zip([
  minoPositionX$,
  minoPositionY$,
  stockedMino$,
]).pipe(
  switchMap(([minoPositionX, minoPositionY, stockedMino]) =>
    exchangeMino(minoPositionX!, minoPositionY!, stockedMino!)
  ),
  switchMap(() => stockedMinoDraw$),
);

const exchangeMino = (
  minoPositionX: number,
  minoPositionY: number,
  currentStockedMino: MinoType,
) => {
  if (canMove(0, 0, minoPositionX, minoPositionY, currentStockedMino)) {
    // ミノを入換え
    const tempMino = stockedMino;
    stockedMino = mino!;
    mino = tempMino;

    // ミノのIDを
    const tempMinoIndex = minoIndex;
    minoIndex = stockedMinoIndex;
    stockedMinoIndex = tempMinoIndex;

    return of(undefined);
  } else {
    return NEVER;
  }
};

// ---------- ↑ ミノ交換関連 ↑ ----------

// ---------- ↓ テトリス描画関連 ↓ ----------

/**
 * ミノを描画する
 */
const draw$ = zip([
  mino$,
  minoPositionX$,
  minoPositionY$,
  minoIndex$,
]).pipe(
  // ミノをその場所に固定
  mergeMap(([mino, minoPositionX, minoPositionY, minoIndex]) =>
    draw(mino!, minoPositionX, minoPositionY, minoIndex!)
  ),
);

/**
 * 描画処理
 * @param mino 対象のミノ
 * @param minoPositionX ミノのx座標
 * @param minoPositionY ミノのy座標
 * @param minoIndex ミノのID
 */
const draw = (
  mino: number[][],
  minoPositionX: number,
  minoPositionY: number,
  minoIndex: number,
) => {
  //塗りに黒を設定
  ctx.fillStyle = "#eceae8";
  //キャンバスを塗りつぶす
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  //ボードに存在しているブロックを塗る
  for (let y = 0; y < BOARD_ROW; y++) {
    for (let x = 0; x < BOARD_COL; x++) {
      if (board[y][x]) {
        drawBlock(ctx, x, y, board[y][x]);
      }
    }
  }

  //テトリミノの描画
  for (let y = 0; y < TETSIZE; y++) {
    for (let x = 0; x < TETSIZE; x++) {
      if (mino[y][x]) {
        drawBlock(ctx, minoPositionX + x, minoPositionY + y, minoIndex);
      }
    }
  }

  return of(undefined);
};

/**
 * 次のミノを描画する
 */
const nextMinoDraw$ = zip([
  nextMino$,
  nextMinoIndex$,
]).pipe(
  // ミノをその場所に固定
  mergeMap(([nextMino, nextMinoIndex]) =>
    nextMinoDraw(nextMino!, nextMinoIndex!)
  ),
);

/**
 * 描画処理
 * @param mino 対象のミノ
 * @param minoPositionX ミノのx座標
 * @param minoPositionY ミノのy座標
 * @param minoIndex ミノのID
 */
const nextMinoDraw = (mino: number[][], minoIndex: number) => {
  //塗りに黒を設定
  nextCtx.fillStyle = "#eceae8";
  //キャンバスを塗りつぶす
  nextCtx.fillRect(0, 0, NEXT_CANVAS_W, NEXT_CANVAS_H);

  //テトリミノの描画
  for (let y = 0; y < TETSIZE; y++) {
    for (let x = 0; x < TETSIZE; x++) {
      if (mino[y][x]) {
        drawBlock(nextCtx, x + 1, y + 1, minoIndex);
      }
    }
  }

  return of(undefined);
};

/**
 * 次のミノを描画する
 */
const stockedMinoDraw$ = zip([
  stockedMino$,
  stockedMinoIndex$,
]).pipe(
  // ミノをその場所に固定
  mergeMap(([stockedMino, stockedMinoIndex]) =>
    stockedMinoDraw(stockedMino!, stockedMinoIndex!)
  ),
);

/**
 * 描画処理
 * @param mino 対象のミノ
 * @param minoPositionX ミノのx座標
 * @param minoPositionY ミノのy座標
 * @param minoIndex ミノのID
 */
const stockedMinoDraw = (mino: number[][], minoIndex: number) => {
  //塗りに黒を設定
  stockedCtx.fillStyle = "#eceae8";
  //キャンバスを塗りつぶす
  stockedCtx.fillRect(0, 0, STOCKED_CANVAS_W, STOCKED_CANVAS_H);

  //テトリミノの描画
  for (let y = 0; y < TETSIZE; y++) {
    for (let x = 0; x < TETSIZE; x++) {
      if (mino[y][x]) {
        drawBlock(stockedCtx, x + 1, y + 1, minoIndex);
      }
    }
  }

  return of(undefined);
};

/**
 * ブロック一つを描画する
 * @param x x座標
 * @param y y座標
 * @param minoIndex
 */
const drawBlock = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  minoIndex: number,
) => {
  const px = x * BLOCK_SIZE;
  const py = y * BLOCK_SIZE;
  //塗りを設定
  ctx.fillStyle = minoColors[minoIndex];
  ctx.fillRect(px, py, BLOCK_SIZE, BLOCK_SIZE);
  //線を設定
  ctx.strokeStyle = "black";
  //線を描画
  ctx.strokeRect(px, py, BLOCK_SIZE, BLOCK_SIZE);
};

/**
 * 動きが止まったミノをボード座標に書き写す
 * @param mino 対象のミノ
 * @param minoPositionX ミノのx座標
 * @param minoPositionY ミノのy座標
 * @param minoIndex ミノのID
 */
const fixTet = (
  mino: number[][],
  minoPositionX: number,
  minoPositionY: number,
  minoIndex: number,
) => {
  for (let y = 0; y < TETSIZE; y++) {
    for (let x = 0; x < TETSIZE; x++) {
      if (mino[y][x]) {
        //ボードに書き込む
        board[minoPositionY + y][minoPositionX + x] = minoIndex;
      }
    }
  }
  return of(undefined);
};

/** 揃っている行があれば消す */
const clearLine = () => {
  /** 削除する行 */
  let clearLineCount = 0;

  //ボードの行を上から調査
  for (let y = 0; y < BOARD_ROW; y++) {
    // 一列揃ってると仮定する(フラグ)
    let isLineOK = true;
    // 列に0が入っていないか調査
    for (let x = 0; x < BOARD_COL; x++) {
      if (board[y][x] === 0) {
        // 0が入ってたのでフラグをfalse
        isLineOK = false;
        break;
      }
    }
    if (isLineOK) {
      // 消した行のカウントをインクリメント
      clearLineCount++;
      // ここに来るということはその列が揃っていたことを意味する
      // その行から上に向かってfor文を動かす
      for (let ny = y; ny > 0; ny--) {
        for (let nx = 0; nx < BOARD_COL; nx++) {
          //一列上の情報をコピーする
          board[ny][nx] = board[ny - 1][nx];
        }
      }
    }
  }

  return of(clearLineCount);
};

// ---------- ↑ テトリス描画関連 ↑ ----------

// ---------- ↓ ゲームシステム関連 ↓ ----------

/** ゲームの初期化 */
const initializedGame$ = startTetris$.pipe(
  // ボードの初期化
  tap(() => initializeBoard()),
  // ミノをセット
  tap(() => setMino()),
  // 最初のミノを描画
  switchMap(() => draw$),
  // 次のミノの描画
  switchMap(() => nextMinoDraw$),
);

/** ゲーム処理全体 */
const gameInterval$ = initializedGame$.pipe(
  // ゲームのタイマーをスタートして、キーボード操作も受け付ける
  switchMap(() =>
    merge(
      // ゲーム更新を走らせる
      interval(SPEED).pipe(
        // ミノを落とす
        switchMap(() => minoMoveDown$),
        // ゲームオーバーの時は止める
        takeUntil(isGameOver$),
      ),
      // キーボードイベントを処理
      keyboardEventListener$.pipe(
        takeUntil(isGameOver$),
      ),
    )
  ),
  // 描画
  mergeMap(() => draw$),
);

/**
 * ゲームオーバーかcheckする
 */
const checkGameOver$ = canMinoMove(0, 1).pipe(
  filter((data) => !data),
  tap(() => showScore()),
  tap(() => isGameOver$.next()),
);

const showScore = () => {
  const scoreEl = document.getElementById("score");
  if (scoreEl) {
    const score = scoreEl.textContent;
    window.alert(`ゲームーオーバーです。点数は${score}点でした。`);
  }
};

/** 特典を追加 */
const addScore = (clearLineCount: number) =>
  mino$.pipe(
    tap((mino) => {
      const scoreEl = document.getElementById("score");
      if (scoreEl) {
        const nowScore = Number(scoreEl.textContent);
        let baseScore = 0;
        baseScore += clearLineCount * 100;

        // テトリス！！
        if (clearLineCount === 4) {
          baseScore += 400;
        }

        // Tスピン！！
        if (Rotated_T_Mino.some((m) => isEqual(m, mino))) {
          switch (clearLineCount) {
            case 2:
              baseScore *= 2;
              break;
            case 3:
              baseScore *= 3;
              break;
            default:
              break;
          }
        }
        scoreEl.textContent = (nowScore + baseScore).toString();
      }
    }),
  );

// ---------- ↑ ゲームシステム関連 ↑ ----------

// ---------- テトリスを開始する ----------
// ゲームの更新処理を購読してゲームスタート
document.addEventListener("DOMContentLoaded", function () {
  // ゲームの更新処理を購読してゲームスタート
  gameInterval$.subscribe(() => {});
});
