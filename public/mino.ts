/** ミノの型 */
export type MinoType = Array<Array<0 | 1>>

/** O ミノ */
export const O_Mino: MinoType = [
  [0, 0, 0, 0],
  [0, 1, 1, 0],
  [0, 1, 1, 0],
  [0, 0, 0, 0]
]

/** T ミノ */
export const T_Mino: MinoType = [
  [0, 0, 0, 0],
  [0, 1, 0, 0],
  [1, 1, 1, 0],
  [0, 0, 0, 0],
]

/** Z ミノ */
export const Z_Mino: MinoType = [
  [0, 0, 0, 0],
  [1, 1, 0, 0],
  [0, 1, 1, 0],
  [0, 0, 0, 0],
]

/** S ミノ */
export const S_Mino: MinoType = [
  [0, 0, 0, 0],
  [0, 0, 1, 1],
  [0, 1, 1, 0],
  [0, 0, 0, 0],
]

/** I ミノ */
export const I_Mino: MinoType = [
  [0, 0, 0, 0],
  [1, 1, 1, 1],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
]

/** J ミノ */
export const J_Mino: MinoType = [
  [0, 0, 0, 0],
  [1, 1, 1, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 0],
]

/** L ミノ */
export const L_Mino: MinoType = [
  [0, 0, 0, 0],
  [0, 0, 1, 0],
  [1, 1, 1, 0],
  [0, 0, 0, 0],
]

/** 空 ミノ */
export const Empty_Mino: MinoType = []


//テトリミノの種類
export const minoTypes: MinoType[] = [
  Empty_Mino,
  O_Mino,
  T_Mino,
  Z_Mino,
  S_Mino,
  I_Mino,
  J_Mino,
  L_Mino
]

//テトリミノの色
export const minoColors = [
  '', // 基本呼ばれない
  '#f6fe85', // O
  '#956daf', // T
  '#f94246', // Z
  '#7ced77', // S
  '#07e0e7', // I
  '#0072bc', // J
  '#f2b907', // L
] as const

/** 回転した T ミノ */
export const Rotated_T_Mino: MinoType[] = [
  [
    [0, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 1, 0, 0],
    [0, 0, 0, 0],
  ],
  [
    [0, 0, 0, 0],
    [0, 1, 0, 0],
    [1, 1, 1, 0],
    [0, 0, 0, 0],
  ],
  [
    [0, 0, 0, 0],
    [0, 1, 1, 1],
    [0, 0, 1, 0],
    [0, 0, 0, 0],
  ],
  [
    [0, 0, 0, 0],
    [0, 0, 1, 0],
    [0, 1, 1, 0],
    [0, 0, 1, 0],
  ],
]