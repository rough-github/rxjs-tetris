/// <reference lib="dom"/>
import { BLOCK_SIZE } from "./vars.ts";

//キャンバスの取得
export const next = document.getElementById('next') as HTMLCanvasElement
export const nextCtx = next.getContext('2d') as CanvasRenderingContext2D

//次のミノのボードサイズ
export const NEXT_BOARD_ROW = 6;
export const NEXT_BOARD_COL = 6;

export const NEXT_CANVAS_W = BLOCK_SIZE * NEXT_BOARD_COL;
export const NEXT_CANVAS_H = BLOCK_SIZE * NEXT_BOARD_ROW;
next.width = NEXT_CANVAS_W;
next.height = NEXT_CANVAS_H;