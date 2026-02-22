export interface NoteAnchor {
  xFactor: number;
  yFactor: number;
}

// 9 distinct anchors that deliberately avoid the top-left corner of the cell.
const NOTE_ANCHORS: NoteAnchor[] = [
  { xFactor: 0.5, yFactor: 0.22 },
  { xFactor: 0.8, yFactor: 0.22 },
  { xFactor: 0.2, yFactor: 0.44 },
  { xFactor: 0.5, yFactor: 0.44 },
  { xFactor: 0.8, yFactor: 0.44 },
  { xFactor: 0.2, yFactor: 0.66 },
  { xFactor: 0.5, yFactor: 0.66 },
  { xFactor: 0.8, yFactor: 0.66 },
  { xFactor: 0.5, yFactor: 0.86 },
];

export function getNoteAnchor(note: number): NoteAnchor | null {
  if (note < 1 || note > 9) return null;
  return NOTE_ANCHORS[note - 1];
}
