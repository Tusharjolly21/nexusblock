import { useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useEditorUi } from "../store/useEditorUi";
import { useApp, selectCurrentFile } from "../store/useApp";
import { useDocStore } from "../store/useDocStore";
import { CodePane } from "./CodePane";
import { generateDsl } from "../lib/ai";
import { applyFlow } from "../dsl/flow/compile";
import { applyErd } from "../dsl/erd/compile";
import { applySequence } from "../dsl/sequence/compile";
import { applyUml } from "../dsl/uml/compile";

const DIAGRAM_TYPES = [
  { id: "flow" as const, label: "Flow chart", icon: "lucide:git-branch" },
  { id: "erd" as const, label: "ERD", icon: "lucide:table-2" },
  {
    id: "sequence" as const,
    label: "Sequence",
    icon: "lucide:arrow-left-right",
  },
  { id: "uml" as const, label: "UML Class", icon: "lucide:box" },
];

const AI_TYPES = [
  {
    id: "arch",
    label: "Architecture Diagram",
    icon: "lucide:layers",
    kind: "flow" as const,
    presetPrompt: "Create a modern multi-tier microservice architecture with load balancers, database clusters, and API gateways."
  },
  {
    id: "flow",
    label: "Flow Chart",
    icon: "lucide:git-branch",
    kind: "flow" as const,
    presetPrompt: "Draw a payment orchestration checkout workflow showing authorization, 3DS verification, fraud checks, and ledger updates."
  },
  {
    id: "erd",
    label: "Entity Relationship",
    icon: "lucide:table-2",
    kind: "erd" as const,
    presetPrompt: "Create a SaaS database schema with accounts, projects, roles, users, invoices, and billing relations."
  },
  {
    id: "seq",
    label: "Sequence Diagram",
    icon: "lucide:arrow-left-right",
    kind: "sequence" as const,
    presetPrompt: "Trace an OAuth sign-in flow between Client app, API gateway, Auth server, and database."
  },
  {
    id: "uml",
    label: "UML Class Diagram",
    icon: "lucide:box",
    kind: "uml" as const,
    presetPrompt: "Create a UML class hierarchy for a PaymentService and its gateway adapters."
  }
];

export function RightDslPanel() {
  const width = useEditorUi((s) => s.dslWidth);
  const setWidth = useEditorUi((s) => s.setDslWidth);
  const setDslOpen = useEditorUi((s) => s.setDslOpen);
  const dslType = useEditorUi((s) => s.dslType);
  const setDslType = useEditorUi((s) => s.setDslType);
  const file = useApp(selectCurrentFile);
  const fileId = file?.id ?? 'scratch';
  const editor = useDocStore((s) => s.editor);
  const start = useRef<{ x: number; width: number } | null>(null);

  const [tab, setTab] = useState<'code' | 'ai'>('code');
  const [prompt, setPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);



  const handleGenerate = async () => {
    const text = prompt.trim();
    if (!text || aiBusy) return;
    setAiBusy(true);
    setAiError(null);

    try {
      const compiledDsl = await generateDsl({
        kind: dslType,
        prompt: text,
        currentDsl: ""
      });

      const storageKey = `nb-code-${fileId}-${dslType}`;
      localStorage.setItem(storageKey, compiledDsl);
      window.dispatchEvent(new Event('nb-sync-code'));

      if (editor) {
        const applyDiagram =
          dslType === "erd"
            ? applyErd
            : dslType === "sequence"
              ? applySequence
              : dslType === "uml"
                ? applyUml
                : applyFlow;

        await applyDiagram(editor, compiledDsl);
      }
      setPrompt("");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI Compilation failed.");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div
      className="relative flex flex-none flex-col border-l border-line bg-surface"
      style={{ width }}
    >
      {/* left-edge resize handle */}
      <div
        className="group absolute -left-1 top-0 z-10 h-full w-2 cursor-ew-resize"
        onPointerDown={(e) => {
          start.current = { x: e.clientX, width };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          setWidth(start.current.width - (e.clientX - start.current.x));
        }}
        onPointerUp={() => {
          start.current = null;
        }}
      >
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:bg-ink/20" />
      </div>

      {/* Header Panel Tabs */}
      <div className="flex h-11 flex-none items-center gap-1 border-b border-line bg-paper px-3">
        <div className="flex items-center gap-1.5 rounded-lg bg-surface p-0.5 border border-line">
          <button
            onClick={() => setTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${tab === 'code' ? 'bg-paper shadow-sm text-ink' : 'text-grey-3 hover:text-ink'}`}
          >
            <Icon icon="lucide:code-2" width={13} />
            Code
          </button>
          <button
            onClick={() => setTab('ai')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${tab === 'ai' ? 'bg-paper shadow-sm text-ink' : 'text-grey-3 hover:text-ink'}`}
          >
            <Icon icon="lucide:sparkles" width={13} className="text-blue-500" />
            Ask AI
          </button>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setDslOpen(false)}
            title="Close panel"
            className="grid h-8 w-8 place-items-center rounded-lg text-grey-4 hover:bg-grey-1 hover:text-ink"
          >
            <Icon icon="lucide:x" width={15} />
          </button>
        </div>
      </div>

      {tab === 'code' ? (
        <>
          {/* diagram-type selector */}
          <div className="flex flex-none items-center gap-1 border-b border-line bg-surface px-3 py-1.5">
            <span className="mr-1 font-mono text-[10px] uppercase tracking-widest text-grey-3">
              Type
            </span>
            {DIAGRAM_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setDslType(t.id)}
                className={
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors " +
                  (dslType === t.id
                    ? "bg-ink text-paper"
                    : "text-grey-4 hover:bg-grey-1 hover:text-ink")
                }
              >
                <Icon icon={t.icon} width={13} /> {t.label}
              </button>
            ))}
          </div>

          {/* editor */}
          <div className="min-h-0 flex-1">
            <CodePane />
          </div>

          {/* bottom status bar */}
          <div className="flex h-7 flex-none items-center justify-between border-t border-line bg-paper px-3 font-mono text-[10px] text-grey-3">
            <span className="flex items-center gap-1.5">
              <Icon icon="lucide:git-branch" width={11} /> code → canvas
            </span>
            <a
              href="/guide/diagram-as-code"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-ink"
            >
              <Icon icon="lucide:graduation-cap" width={11} /> Learn the syntax
            </a>
          </div>
        </>
      ) : (
        /* Ask AI / Chat Pane */
        <div className="flex flex-1 flex-col overflow-hidden bg-surface">
          <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-paper">
            <h2 className="text-sm font-bold text-ink flex items-center gap-1.5">
              <Icon icon="lucide:sparkles" className="text-blue-500 animate-pulse" />
              New Chat
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setPrompt("")}
                className="p-1 hover:bg-grey-1 rounded text-grey-3 hover:text-ink"
                title="New Chat"
              >
                <Icon icon="lucide:plus" width={14} />
              </button>
              <button className="p-1 hover:bg-grey-1 rounded text-grey-3 hover:text-ink" title="History">
                <Icon icon="lucide:history" width={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {aiError && (
              <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-600 font-semibold">
                {aiError}
              </div>
            )}

            <div>
              <h3 className="text-xs font-bold text-grey-3 uppercase tracking-wider mb-3">What would you like to create?</h3>
              <div className="grid grid-cols-2 gap-2">
                {AI_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setPrompt(t.presetPrompt);
                      setDslType(t.kind);
                    }}
                    className={`flex flex-col items-center justify-center p-4 border rounded-2xl transition-all text-center group ${dslType === t.kind && prompt === t.presetPrompt ? 'border-blue-500 bg-blue-50/20' : 'border-line bg-paper hover:border-blue-500 hover:shadow-md'}`}
                  >
                    <div className="h-10 w-10 grid place-items-center rounded-full bg-blue-50 text-blue-500 group-hover:scale-110 transition-transform mb-2">
                      <Icon icon={t.icon} width={20} />
                    </div>
                    <span className="text-xs font-semibold text-ink leading-tight text-center">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-grey-3 uppercase tracking-wider mb-3">Already have something to start with?</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPrompt("Generate an enterprise microservices template diagram")}
                  className="flex flex-col items-center justify-center p-3 border border-line bg-paper rounded-xl hover:border-ink transition-colors text-center"
                >
                  <Icon icon="lucide:book-open" className="text-grey-3 mb-1" width={16} />
                  <span className="text-[10px] font-bold text-ink">Template</span>
                </button>
                <button
                  onClick={() => setPrompt("Parse schemas to generate architectural nodes")}
                  className="flex flex-col items-center justify-center p-3 border border-line bg-paper rounded-xl hover:border-ink transition-colors text-center"
                >
                  <Icon icon="lucide:file-text" className="text-grey-3 mb-1" width={16} />
                  <span className="text-[10px] font-bold text-ink">File</span>
                </button>
                <button
                  onClick={() => setPrompt("Scan git repository compose details and draw diagrams")}
                  className="flex flex-col items-center justify-center p-3 border border-line bg-paper rounded-xl hover:border-ink transition-colors text-center"
                >
                  <Icon icon="lucide:github" className="text-grey-3 mb-1" width={16} />
                  <span className="text-[10px] font-bold text-ink">Git Repo</span>
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-line bg-paper p-3 space-y-2.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-grey-3">
              <span>AI GENERATION</span>
              <span className="text-emerald-500">Premium Plan Active</span>
            </div>
            
            <div className="border border-line rounded-2xl bg-surface p-2 focus-within:border-blue-500 transition-colors">
              <textarea
                placeholder="Describe what to create or edit... (e.g. Draw a multi-tier AWS architecture)"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-20 bg-transparent text-xs text-ink outline-none resize-none placeholder-grey-3"
              />
              <div className="flex items-center justify-between pt-2 border-t border-line/40">
                <button className="p-1.5 hover:bg-grey-1 rounded-full text-grey-3 hover:text-ink">
                  <Icon icon="lucide:plus" width={15} />
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={aiBusy || !prompt.trim()}
                  className="h-7 w-7 grid place-items-center rounded-full bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-40 disabled:hover:bg-blue-500 transition-colors shadow-sm"
                >
                  {aiBusy ? (
                    <Icon icon="lucide:loader-2" className="animate-spin text-white" width={14} />
                  ) : (
                    <Icon icon="lucide:arrow-up" width={14} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
