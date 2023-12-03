/// <reference lib="dom"/>

/** 落下サイクル(小さい方が速い) */
export const SPEED = 750;

/** ブロック1マスの大きさ */
export const BLOCK_SIZE = 20;

/** ボードサイズ */
export const BOARD_ROW = 20;
export const BOARD_COL = 10;

/** キャンバスの取得 */
export const cvs = document.getElementById('cvs') as HTMLCanvasElement

/** 2dコンテキストを取得 */
export const ctx = cvs.getContext('2d') as CanvasRenderingContext2D

/** キャンバスサイズ */
export const CANVAS_W = BLOCK_SIZE * BOARD_COL;
export const CANVAS_H = BLOCK_SIZE * BOARD_ROW;
cvs.width = CANVAS_W;
cvs.height = CANVAS_H;

//tetの1辺の大きさ
export const TETSIZE = 4;

/** 点数 */
export const score = 0