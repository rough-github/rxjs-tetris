/// <reference lib="dom"/>
import { BLOCK_SIZE } from "./vars.ts";

//キャンバスの取得
export const stocked = document.getElementById("stocked") as HTMLCanvasElement;
export const stockedCtx = stocked.getContext("2d") as CanvasRenderingContext2D;

//次のミノのボードサイズ
export const STOCKED_BOARD_ROW = 6;
export const STOCKED_BOARD_COL = 6;

export const STOCKED_CANVAS_W = BLOCK_SIZE * STOCKED_BOARD_COL;
export const STOCKED_CANVAS_H = BLOCK_SIZE * STOCKED_BOARD_ROW;
stocked.width = STOCKED_CANVAS_W;
stocked.height = STOCKED_CANVAS_H;
