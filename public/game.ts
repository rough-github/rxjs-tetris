import {
  filter,
  fromEvent,
  iif,
  interval,
  map,
  merge,
  mergeMap,
  NEVER,
  Observable,
  of,
  shareReplay,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from "https://code4fukui.github.io/rxjs-es/rxjs.js";
// } from "https://deno.land/x/rxjs@v1.0.2/mod.ts";
import { isEqual, shuffle } from "https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.min.js";
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
import { minoColors, MinoType, minoTypes, Rotated_T_Mino } from "./mino.ts";
import { NEXT_CANVAS_H, NEXT_CANVAS_W, nextCtx } from "./next-mino-vars.ts";
import {
  STOCKED_CANVAS_H,
  STOCKED_CANVAS_W,
  stockedCtx,
} from "./stocked-mino-vars.ts";

// ---------- ↓ 初期化時の処理 ↓ ----------

// ボード本体
const board: number[][] = [];

/**
 * ボードを初期化
 */
const initializeBoard$ = <T>(source$: Observable<T>): Observable<T> =>
  source$.pipe(
    tap(() => {
      for (let y = 0; y < BOARD_ROW; y++) {
        board[y] = [];
        for (let x = 0; x < BOARD_COL; x++) {
          board[y][x] = 0;
        }
      }
    }),
  );

/** ミノのindexの配列 */
let MinoIndexes: number[] = []

/**
 * テトリミノのindexを抽選
 */
const generateRandomMinoIdx = (): number => {
  if (MinoIndexes.length === 0) {
    MinoIndexes = arrageNumbers()
  }
  const idx = MinoIndexes[0]
  MinoIndexes.shift()

  return idx
}

/** 1 ~ 7までの数字の配列を作成 */
const arrageNumbers = (): number[] => shuffle([...Array(7).keys()].map(i => ++i))

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

/**
 * 呼び出される度にy座標を1マス下げる
 */
const moveDown$ = of(undefined).pipe(tap(() => ++position_y));

/**
 * 呼び出される度にx座標を1マス左へ
 */
const moveLeft$ = of(undefined).pipe(tap(() => --position_x));

/**
 * 呼び出される度にx座標を1マス右へ
 */
const moveRight$ = of(undefined).pipe(tap(() => ++position_x));

/** ミノをセットする */
const setMino$ = <T>(source$: Observable<T>): Observable<T> => {
  return source$.pipe(
    // ミノをセット
    tap(() => {
      position_x = BOARD_COL / 2 - TETSIZE / 2;
      position_y = -1;
      minoIndex = nextMinoIndex === undefined
        ? generateRandomMinoIdx()
        : nextMinoIndex;
      mino = minoTypes[minoIndex];
    }),
    // 次のミノをセット
    tap(() => {
      nextMinoIndex = generateRandomMinoIdx();
      nextMino = minoTypes[nextMinoIndex];
    }),
  );
};

// ---------- ↑ ミノに関する情報 ↑ ----------

// ---------- ↓ 得点に関する情報 ↓ ----------

const showScore = () => {
  const scoreEl = document.getElementById("score");
  if (scoreEl) {
    const score = scoreEl.textContent;
    window.alert(`ゲームーオーバーです。点数は${score}点でした。`);
  }
};

/** 得点を追加 */
const addScore$ = (source$: Observable<number>): Observable<number> =>
  source$.pipe(
    tap((clearLineCount) => {
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

// ---------- ↑ 得点に関する情報 ↑ ----------

// ---------- ↓ テトリス描画関連 ↓ ----------

/**
 * ミノを描画する
 */
const draw$ = <T>(source$: Observable<T>): Observable<T> =>
  source$.pipe(
    tap(() => draw(mino!, position_x, position_y, minoIndex!)),
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
};

const nextMinoDraw$ = <T>(source$: Observable<T>): Observable<T> =>
  source$.pipe(
    tap(() => nextMinoDraw(nextMino!, nextMinoIndex!)),
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
};

/**
 * 次のミノを描画する
 */
const stockedMinoDraw$ = <T>(source$: Observable<T>): Observable<T> =>
  source$.pipe(
    tap(() => stockedMinoDraw(stockedMino!, stockedMinoIndex!)),
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

/** 動きが止まったミノをボード座標に書き写す */
const fixTet$ = <T>(source$: Observable<T>): Observable<T> =>
  source$.pipe(
    tap(() => {
      for (let y = 0; y < TETSIZE; y++) {
        for (let x = 0; x < TETSIZE; x++) {
          if (mino![y][x]) {
            //ボードに書き込む
            board[position_y + y][position_x + x] = minoIndex!;
          }
        }
      }
    }),
  );

/** 揃っている行があれば消す */
const clearLine$ = <T>(source$: Observable<T>): Observable<number> =>
  source$.pipe(
    map(() => {
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

      return clearLineCount;
    }),
  );

// ---------- ↑ テトリス描画関連 ↑ ----------

// ---------- ↓ ゲームの終了処理関連 ↓ ----------

// ゲームオーバーフラグ
const isGameOver$ = new Subject<void>();

/**
 * ゲームオーバーかcheckする
 */
const checkGameOver$ = <T>(source$: Observable<T>): Observable<boolean> =>
  source$.pipe(
    mergeMap(() => canMinoMove$(0, 1)),
    tap((canMove) => {
      if (!canMove) {
        // ゲームーオーバー
        isGameOver$.next();
        showScore();
      }
    }),
  );

/** タイマーを走らせる */
const startTimer$ = interval(1000).pipe(
  takeUntil(isGameOver$),
  tap((count) => {
    const timeEl = document.getElementById("time");
    if (timeEl) {
      timeEl.textContent = (180 - count).toString();
      if (count === 180) {
        isGameOver$.next();
      }
    }
  }),
);

// ---------- ↑ ゲームの終了処理関連 ↑ ----------

// ---------- ↓ テトリス移動関連 ↓ ----------

/** 下に動かせない時の処理 */
const cantMove$ = of(undefined).pipe(
  // ミノをその場所に固定
  fixTet$,
  // 行が揃っていれば削除
  clearLine$,
  // 得点を加算
  addScore$,
  // ミノをセット
  setMino$,
  // ゲームオーバーかcheckする
  checkGameOver$,
  // 次のミノを描画
  nextMinoDraw$,
);

/** ミノが移動可能かどうか */
const canMinoMove$ = (
  dx: number,
  dy: number,
): Observable<boolean> =>
  of(undefined).pipe(
    filter(() => !!mino),
    switchMap(() => of(canMove(dx, dy, position_x, position_y, mino!))),
  );

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
const minoMoveDown$ = canMinoMove$(0, 1).pipe(
  switchMap((data) =>
    iif(
      () => data,
      moveDown$,
      cantMove$,
    )
  ),
);

// ---------- ↑ テトリス移動関連 ↑ ----------

// ---------- ↓ ミノ回転関連 ↓ ----------

/** ミノを回転させる */
const createRotateMino$ = <T>(source$: Observable<T>): Observable<void> =>
  source$.pipe(
    map(() => createRotateMino(mino!)),
    switchMap((newMino) => {
      if (canMove(0, 0, position_x, position_y, newMino)) {
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

/** ストックにミノがあれば交換して、なければストックする */
const stockOrExchangeMino$ = <T>(
  source$: Observable<T>,
): Observable<void | boolean> =>
  source$.pipe(
    switchMap(() =>
      iif(
        () => !!stockedMino,
        // 交換
        exchangeMino$,
        // ストック
        stockMino$,
      )
    ),
  );

/** ミノをストックに入れる */
const stockMino$ = of(undefined).pipe(
  tap(() => stockMino(mino!, minoIndex!)),
  stockedMinoDraw$,
  setMino$,
);

const stockMino = (mino: MinoType, minoInidex: number) => {
  stockedMino = mino;
  stockedMinoIndex = minoInidex;
};

/** ミノをストックにあるものと交換できたら交換する */
const exchangeMino$ = of(undefined).pipe(
  map(() => canMove(0, 0, position_x, position_y, stockedMino!)),
  filter((canExchange) => canExchange),
  tap(() => exchangeMino()),
  stockedMinoDraw$,
);

/** ミノをストックにあるものと交換する */
const exchangeMino = () => {
  // ミノを入換え
  const tempMino = stockedMino;
  stockedMino = mino!;
  mino = tempMino;

  // ミノのIDを
  const tempMinoIndex = minoIndex;
  minoIndex = stockedMinoIndex;
  stockedMinoIndex = tempMinoIndex;
};

// ---------- ↑ ミノ交換関連 ↑ ----------

// ---------- ↓ キーボード操作関連 ↓ ----------

const keyboardEvent$ = fromEvent<KeyboardEvent>(document, "keydown").pipe(
  shareReplay(1),
);

const keyDown$ = keyboardEvent$.pipe(
  filter((e: KeyboardEvent) => e.code === "ArrowDown"),
).pipe(
  switchMap(() => canMinoMove$(0, 1)),
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
  switchMap(() => canMinoMove$(-1, 0)),
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
  switchMap(() => canMinoMove$(1, 0)),
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
  createRotateMino$,
);

const keyEscape$ = keyboardEvent$.pipe(
  filter((e: KeyboardEvent) => e.code === "Escape"),
).pipe(
  stockOrExchangeMino$,
);
const keyboardEventListener$ = merge(
  keyDown$,
  keyLeft$,
  keyRight$,
  keySpace$,
  keyEscape$,
);

// ---------- ↑ キーボード操作関連 ↑ ----------

// ---------- ↓ ゲームシステム関連 ↓ ----------

/** ゲームの初期化 */
const initializedGame$ = startTetris$.pipe(
  // ボードの初期化
  initializeBoard$,
  // ミノをセット
  setMino$,
  // 最初のミノを描画
  draw$,
  // 次のミノの描画
  nextMinoDraw$,
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
      // 制限時間のタイマーをセット
      startTimer$,
    )
  ),
  // 描画
  draw$,
);

// ---------- ↑ ゲームシステム関連 ↑ ----------

// ---------- テトリスを開始する ----------
// ゲームの更新処理を購読してゲームスタート
document.addEventListener("DOMContentLoaded", function () {
  // ゲームの更新処理を購読してゲームスタート
  gameInterval$.subscribe(() => {});
});
