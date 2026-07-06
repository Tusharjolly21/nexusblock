/**
 * Parser for the Eraser-style sequence-diagram DSL (spec #9).
 *
 * Grammar (line-oriented):
 *   title My flow                       // optional diagram title
 *   participant api                     // explicit participant (order preserved)
 *   participant db as "Postgres"        // participant with a display label
 *   actor user                          // participant drawn as a stick figure
 *   client -> api: POST /orders         // solid call message
 *   api --> client: 201 Created         // dashed return message
 *   api ->> worker: enqueue             // async (open-head) message
 *   client -> client: retry             // self message (loops back)
 *   note over api: validates the body   // annotation anchored to a lifeline
 *   note over client, api: handshake    // note spanning two lifelines
 *
 * Participants are auto-created on first use if never declared, so the shortest
 * useful program is just a list of messages.
 */

export type SeqArrow = "->" | "-->" | "->>" | "-->>";
export type SeqParticipant = { name: string; label: string; actor: boolean };
export type SeqMessage = {
  kind: "message";
  from: string;
  to: string;
  label: string;
  arrow: SeqArrow;
  self: boolean;
};
export type SeqNote = {
  kind: "note";
  targets: string[];
  label: string;
};
export type SeqStep = SeqMessage | SeqNote;
export type SeqError = { line: number; message: string };

export type SeqDoc = {
  title: string;
  participants: Map<string, SeqParticipant>;
  order: string[];
  steps: SeqStep[];
  errors: SeqError[];
};

const ARROWS: SeqArrow[] = ["-->>", "->>", "-->", "->"]; // longest-first for scanning

/** Remove `//` and `#` line comments, ignoring occurrences inside quotes. */
function stripComment(line: string): string {
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') q = !q;
    if (!q && ((c === "/" && line[i + 1] === "/") || c === "#"))
      return line.slice(0, i);
  }
  return line;
}

/** Strip one layer of surrounding quotes, if present. */
function unquote(text: string): string {
  const t = text.trim();
  if (t.length >= 2 && t[0] === '"' && t[t.length - 1] === '"')
    return t.slice(1, -1);
  return t;
}

/** Find the first top-level arrow token (outside quotes) and its position. */
function findArrow(text: string): { index: number; token: SeqArrow } | null {
  let q = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') {
      q = !q;
      continue;
    }
    if (q) continue;
    for (const token of ARROWS) {
      if (text.startsWith(token, i)) return { index: i, token };
    }
  }
  return null;
}

export function parseSequence(source: string): SeqDoc {
  const participants = new Map<string, SeqParticipant>();
  const order: string[] = [];
  const steps: SeqStep[] = [];
  const errors: SeqError[] = [];
  let title = "";

  const ensure = (
    raw: string,
    opts?: { label?: string; actor?: boolean },
  ): string => {
    const name = unquote(raw).trim();
    if (!name) return "";
    const existing = participants.get(name);
    if (existing) {
      if (opts?.label) existing.label = opts.label;
      if (opts?.actor) existing.actor = true;
      return name;
    }
    participants.set(name, {
      name,
      label: opts?.label ?? name,
      actor: !!opts?.actor,
    });
    order.push(name);
    return name;
  };

  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = stripComment(lines[i]).trim();
    if (!line) continue;

    // ---- title ----
    if (/^title\b/i.test(line)) {
      title = unquote(line.replace(/^title\b/i, "").trim());
      continue;
    }

    // ---- participant / actor declaration ----
    const decl = /^(participant|actor)\b(.*)$/i.exec(line);
    if (decl) {
      const isActor = decl[1].toLowerCase() === "actor";
      const rest = decl[2].trim();
      // "name as \"Label\"" | "name"
      const asMatch = /\bas\b/i.exec(rest);
      if (asMatch) {
        const name = rest.slice(0, asMatch.index).trim();
        const label = unquote(rest.slice(asMatch.index + asMatch[0].length));
        if (!name)
          errors.push({
            line: lineNo,
            message: "Participant is missing a name.",
          });
        else ensure(name, { label: label || undefined, actor: isActor });
      } else {
        if (!rest)
          errors.push({
            line: lineNo,
            message: "Participant is missing a name.",
          });
        else ensure(rest, { actor: isActor });
      }
      continue;
    }

    // ---- note over A[, B]: text ----
    const note = /^note\s+(?:over|left of|right of)\s+(.+)$/i.exec(line);
    if (note) {
      const body = note[1];
      const colon = body.indexOf(":");
      if (colon < 0) {
        errors.push({ line: lineNo, message: 'A note needs text after ":".' });
        continue;
      }
      const targets = body
        .slice(0, colon)
        .split(",")
        .map((t) => ensure(t))
        .filter(Boolean);
      const label = unquote(body.slice(colon + 1));
      if (!targets.length)
        errors.push({
          line: lineNo,
          message: "A note must reference at least one participant.",
        });
      else steps.push({ kind: "note", targets, label });
      continue;
    }

    // ---- message: A -> B: text ----
    const arrow = findArrow(line);
    if (!arrow) {
      errors.push({
        line: lineNo,
        message: `Not a valid statement. Use "A -> B: message" or "participant name".`,
      });
      continue;
    }
    const fromRaw = line.slice(0, arrow.index).trim();
    let afterRaw = line.slice(arrow.index + arrow.token.length).trim();
    let label = "";
    const colon = (() => {
      let q = false;
      for (let k = 0; k < afterRaw.length; k++) {
        if (afterRaw[k] === '"') q = !q;
        if (!q && afterRaw[k] === ":") return k;
      }
      return -1;
    })();
    if (colon >= 0) {
      label = unquote(afterRaw.slice(colon + 1));
      afterRaw = afterRaw.slice(0, colon).trim();
    }
    if (!fromRaw || !afterRaw) {
      errors.push({
        line: lineNo,
        message: "A message needs a sender and a receiver.",
      });
      continue;
    }
    const from = ensure(fromRaw);
    const to = ensure(afterRaw);
    steps.push({
      kind: "message",
      from,
      to,
      label,
      arrow: arrow.token,
      self: from === to,
    });
  }

  return { title, participants, order, steps, errors };
}
