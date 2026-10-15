import { COLORS, PALETTE, TRANSPARENT } from "../palette";

export type SpriteRows = readonly string[];

const OUTLINE = "k";

const RGB: Readonly<Record<string, readonly [number, number, number]>> =
  Object.fromEntries(
    Object.entries(PALETTE).map(([key, color]) => {
      const hex = Number.parseInt(COLORS[color].slice(1), 16);
      return [key, [hex >> 16, (hex >> 8) & 0xff, hex & 0xff]];
    }),
  );

export function blank(width: number, height: number): string[] {
  return Array.from({ length: height }, () => TRANSPARENT.repeat(width));
}

export function pad(rows: SpriteRows, size = 1): string[] {
  const width = (rows[0]?.length ?? 0) + size * 2;
  return stamp(blank(width, rows.length + size * 2), rows, size, size);
}

export function mirror(rows: SpriteRows): string[] {
  return rows.map((row) => [...row].reverse().join(""));
}

export function silhouette(rows: SpriteRows, key: string): string[] {
  return rows.map((row) =>
    [...row].map((pixel) => (pixel === TRANSPARENT ? pixel : key)).join(""),
  );
}

export function keep(
  rows: SpriteRows,
  wanted: (row: number, column: number, pixel: string) => boolean,
): string[] {
  return rows.map((line, row) =>
    [...line]
      .map((pixel, column) =>
        wanted(row, column, pixel) ? pixel : TRANSPARENT,
      )
      .join(""),
  );
}

export function repaint(
  rows: SpriteRows,
  paints: Readonly<Record<string, string>>,
): string[] {
  return rows.map((line) =>
    [...line].map((pixel) => paints[pixel] ?? pixel).join(""),
  );
}

export function rotate(rows: SpriteRows): string[] {
  const width = rows[0]?.length ?? 0;
  return Array.from({ length: width }, (_, x) =>
    rows
      .map((row) => row[x])
      .reverse()
      .join(""),
  );
}

export function stamp(
  base: SpriteRows,
  part: SpriteRows,
  left: number,
  top: number,
): string[] {
  return base.map((row, y) => {
    const source = part[y - top];
    if (source === undefined) {
      return row;
    }
    return [...row]
      .map((pixel, x) => {
        const paint = source[x - left];
        return paint === undefined || paint === TRANSPARENT ? pixel : paint;
      })
      .join("");
  });
}

function opaque(rows: SpriteRows, x: number, y: number): boolean {
  const pixel = rows[y]?.[x];
  return pixel !== undefined && pixel !== TRANSPARENT;
}

export function outline(rows: SpriteRows): string[] {
  return rows.map((row, y) =>
    [...row]
      .map((pixel, x) =>
        pixel === TRANSPARENT &&
        (opaque(rows, x - 1, y) ||
          opaque(rows, x + 1, y) ||
          opaque(rows, x, y - 1) ||
          opaque(rows, x, y + 1))
          ? OUTLINE
          : pixel,
      )
      .join(""),
  );
}

export function rgba(rows: SpriteRows): Uint8ClampedArray<ArrayBuffer> {
  const width = rows[0]?.length ?? 0;
  const data = new Uint8ClampedArray(width * rows.length * 4);
  rows.forEach((row, y) => {
    [...row].forEach((pixel, x) => {
      const color = RGB[pixel];
      if (!color) {
        return;
      }
      const offset = (y * width + x) * 4;
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = 255;
    });
  });
  return data;
}

export function toCanvas(rows: SpriteRows): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = rows[0]?.length ?? 0;
  canvas.height = rows.length;
  canvas
    .getContext("2d")
    ?.putImageData(
      new ImageData(rgba(rows), canvas.width, canvas.height),
      0,
      0,
    );
  return canvas;
}
