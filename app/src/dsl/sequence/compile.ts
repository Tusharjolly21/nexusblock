import { createShapeId, toRichText, type Editor } from "tldraw";
import {
  parseSequence,
  type SeqDoc,
  type SeqError,
  type SeqArrow,
} from "./parse";

/**
 * Compile the sequence-diagram DSL to native tldraw shapes (spec #9).
 *
 * Sequence layout is deterministic, not force-directed, so we place shapes on a
 * fixed grid instead of using ELK: each participant owns a vertical column with
 * a header box + a dashed lifeline; each message is a horizontal arrow between
 * two lifelines at an increasing y; notes are boxes spanning their targets.
 * Replaces the current page (one-way, like the flow and ERD DSLs).
 */

const COL_GAP = 220; // horizontal distance between participant columns
const HEAD_W = 168; // participant header box width
const HEAD_H = 56; // participant header box height
const TOP = 96; // y of the participant headers (leaves room for a title)
const FIRST_STEP = TOP + HEAD_H + 64; // y of the first message
const STEP_GAP = 74; // vertical distance between steps
const SELF_LOOP = 40; // width of a self-message loop
const PAD_X = 80; // left/right page padding

// Solid calls get a filled arrowhead; async (>>) messages get an open "bar"
// tick so they read differently. tldraw heads: none|arrow|dot|bar|diamond.
const ARROW_SPEC: Record<
  SeqArrow,
  { end: "arrow" | "bar"; dash: "solid" | "dashed" }
> = {
  "->": { end: "arrow", dash: "solid" },
  "-->": { end: "arrow", dash: "dashed" },
  "->>": { end: "bar", dash: "solid" },
  "-->>": { end: "bar", dash: "dashed" },
};

export async function applySequence(
  editor: Editor,
  source: string,
): Promise<SeqError[]> {
  const doc = parseSequence(source);
  if (doc.participants.size === 0) return doc.errors;

  // Column x-centre for each participant, in declaration order.
  const centre = new Map<string, number>();
  doc.order.forEach((name, i) =>
    centre.set(name, PAD_X + HEAD_W / 2 + i * COL_GAP),
  );

  const totalSteps = doc.steps.length;
  const bottom = FIRST_STEP + Math.max(totalSteps, 1) * STEP_GAP + 24;
  const lifelineTop = TOP + HEAD_H;

  // Replace the page.
  const existing = Array.from(editor.getCurrentPageShapeIds());
  if (existing.length) editor.deleteShapes(existing);

  // ---- optional title ----
  if (doc.title) {
    const id = createShapeId();
    editor.createShape({
      id,
      type: "text",
      x: PAD_X,
      y: 32,
      props: {
        richText: toRichText(doc.title),
        size: "l",
        font: "sans",
        color: "black",
      } as never,
    });
  }

  // ---- participant headers + lifelines ----
  for (const [name, p] of doc.participants) {
    const cx = centre.get(name)!;
    // header box
    const boxId = createShapeId();
    editor.createShape({
      id: boxId,
      type: "geo",
      x: cx - HEAD_W / 2,
      y: TOP,
      props: {
        w: HEAD_W,
        h: HEAD_H,
        geo: p.actor ? "ellipse" : "rectangle",
        richText: toRichText(p.label),
        fill: "solid",
        color: "black",
        size: "s",
        font: "sans",
        align: "middle",
        verticalAlign: "middle",
      } as never,
    });
    // dashed vertical lifeline beneath the header
    const lineId = createShapeId();
    editor.createShape({
      id: lineId,
      type: "line",
      x: cx,
      y: lifelineTop,
      props: {
        dash: "dashed",
        color: "grey",
        size: "s",
        points: {
          a1: { id: "a1", index: "a1", x: 0, y: 0 },
          a2: { id: "a2", index: "a2", x: 0, y: bottom - lifelineTop },
        },
      } as never,
    });
  }

  // ---- steps (messages + notes) ----
  doc.steps.forEach((step, i) => {
    const y = FIRST_STEP + i * STEP_GAP;

    if (step.kind === "note") {
      const xs = step.targets
        .map((t) => centre.get(t)!)
        .filter((n) => n != null);
      if (!xs.length) return;
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const w = Math.max(HEAD_W, maxX - minX + 120);
      const id = createShapeId();
      editor.createShape({
        id,
        type: "geo",
        x: (minX + maxX) / 2 - w / 2,
        y: y - 20,
        props: {
          w,
          h: 44,
          geo: "rectangle",
          richText: toRichText(step.label),
          fill: "semi",
          color: "yellow",
          size: "s",
          font: "sans",
          align: "middle",
          verticalAlign: "middle",
        } as never,
      });
      return;
    }

    const fromX = centre.get(step.from)!;
    const toX = centre.get(step.to)!;
    const spec = ARROW_SPEC[step.arrow];
    const arrowId = createShapeId();

    if (step.self) {
      // self-message: a little rectangular loop back to the same lifeline
      editor.createShape({
        id: arrowId,
        type: "arrow",
        x: fromX,
        y,
        props: {
          start: { x: 0, y: 0 },
          end: { x: 0, y: 34 },
          bend: SELF_LOOP,
          kind: "arc",
          color: "black",
          size: "s",
          dash: spec.dash,
          arrowheadStart: "none",
          arrowheadEnd: spec.end,
          ...(step.label ? { richText: toRichText(step.label) } : {}),
        } as never,
      });
      return;
    }

    editor.createShape({
      id: arrowId,
      type: "arrow",
      x: fromX,
      y,
      props: {
        start: { x: 0, y: 0 },
        end: { x: toX - fromX, y: 0 },
        kind: "elbow",
        color: "black",
        size: "s",
        dash: spec.dash,
        arrowheadStart: "none",
        arrowheadEnd: spec.end,
        ...(step.label ? { richText: toRichText(step.label) } : {}),
      } as never,
    });
  });

  editor.selectNone();
  editor.zoomToFit({ animation: { duration: 200 } });
  return doc.errors;
}

export type { SeqDoc };
