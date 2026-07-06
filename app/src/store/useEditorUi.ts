import { create } from "zustand";
import type { DocVersion } from "../canvas/versions";

export type InspectorTab = "style" | "layers" | "comments" | "linter";
/** Which surfaces are visible: canvas only, canvas+doc split, or doc only. */
export type ViewMode = "canvas" | "split" | "doc";
/** Default line style applied to newly created connectors. */
export type ConnectorStyle = "straight" | "curved" | "elbow";
/** Which diagram-as-code language the DSL panel is editing. */
export type DslType = "flow" | "erd" | "sequence" | "uml";

type EditorUiState = {
  viewMode: ViewMode;
  /** Doc pane width as % of the split (canvas gets the rest). */
  splitDocPct: number;
  /** Default style for new connectors (auto-applied, eraser-like). */
  connectorStyle: ConnectorStyle;
  leftDocOpen: boolean;
  dslOpen: boolean;
  inspectorOpen: boolean;
  focusMode: boolean;
  readOnly: boolean;
  inspectorTab: InspectorTab;
  bottomHeight: number;
  /** Width of the right-side diagram-as-code panel. */
  dslWidth: number;
  /** Active diagram-as-code language. */
  dslType: DslType;

  setViewMode: (mode: ViewMode) => void;
  toggleDoc: () => void;
  setSplitDocPct: (pct: number) => void;
  setConnectorStyle: (style: ConnectorStyle) => void;
  toggleLeftDoc: () => void;
  setLeftDocOpen: (open: boolean) => void;
  toggleDsl: () => void;
  setDslOpen: (open: boolean) => void;
  toggleInspector: () => void;
  setInspectorOpen: (open: boolean) => void;
  toggleFocusMode: () => void;
  setFocusMode: (open: boolean) => void;
  toggleReadOnly: () => void;
  setReadOnly: (open: boolean) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setBottomHeight: (height: number) => void;
  setDslWidth: (width: number) => void;
  setDslType: (type: DslType) => void;

  isPresenting: boolean;
  currentSlideIndex: number;
  slideIds: string[];
  startPresentation: (slideIds: string[], startIndex?: number) => void;
  stopPresentation: () => void;
  setCurrentSlideIndex: (index: number) => void;
  nextSlide: () => void;
  prevSlide: () => void;

  diffVersion: DocVersion | null;
  setDiffVersion: (version: DocVersion | null) => void;

  highlightedShapeId: string | null;
  setHighlightedShapeId: (id: string | null) => void;

  driftedShapeIds: string[];
  setDriftedShapeIds: (ids: string[]) => void;

  traceFlowActive: boolean;
  setTraceFlowActive: (active: boolean) => void;

  flowAnimationStyle: 'particle' | 'dashes' | 'laser' | 'droplet';
  setFlowAnimationStyle: (style: 'particle' | 'dashes' | 'laser' | 'droplet') => void;
};

export const useEditorUi = create<EditorUiState>((set) => ({
  viewMode: "canvas",
  splitDocPct: 42,
  connectorStyle: "elbow",
  leftDocOpen: true,
  dslOpen: false,
  inspectorOpen: false,
  focusMode: false,
  readOnly: false,
  inspectorTab: "style",
  bottomHeight: 260,
  dslWidth: 460,
  dslType: "flow",

  setViewMode: (viewMode) => set({ viewMode }),
  // Rail/topbar "docs" toggle: canvas ⇄ split (keeps doc beside the canvas).
  toggleDoc: () =>
    set((s) => ({ viewMode: s.viewMode === "canvas" ? "split" : "canvas" })),
  setSplitDocPct: (pct) =>
    set({ splitDocPct: Math.max(24, Math.min(68, pct)) }),
  setConnectorStyle: (connectorStyle) => set({ connectorStyle }),
  toggleLeftDoc: () => set((s) => ({ leftDocOpen: !s.leftDocOpen })),
  setLeftDocOpen: (leftDocOpen) => set({ leftDocOpen }),
  toggleDsl: () => set((s) => ({ dslOpen: !s.dslOpen })),
  setDslOpen: (dslOpen) => set({ dslOpen }),
  toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),
  setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
  setFocusMode: (focusMode) => set({ focusMode }),
  toggleReadOnly: () => set((s) => ({ readOnly: !s.readOnly })),
  setReadOnly: (readOnly) => set({ readOnly }),
  setInspectorTab: (inspectorTab) => set({ inspectorTab, inspectorOpen: true }),
  setBottomHeight: (height) =>
    set({ bottomHeight: Math.max(180, Math.min(420, height)) }),
  setDslWidth: (width) =>
    set({ dslWidth: Math.max(340, Math.min(760, width)) }),
  setDslType: (dslType) => set({ dslType }),

  isPresenting: false,
  currentSlideIndex: 0,
  slideIds: [],
  startPresentation: (slideIds, startIndex = 0) =>
    set({
      isPresenting: true,
      slideIds,
      currentSlideIndex: Math.max(0, Math.min(slideIds.length - 1, startIndex)),
    }),
  stopPresentation: () => set({ isPresenting: false, slideIds: [], currentSlideIndex: 0 }),
  setCurrentSlideIndex: (currentSlideIndex) => set({ currentSlideIndex }),
  nextSlide: () =>
    set((s) => {
      if (s.currentSlideIndex >= s.slideIds.length - 1) return {};
      return { currentSlideIndex: s.currentSlideIndex + 1 };
    }),
  prevSlide: () =>
    set((s) => {
      if (s.currentSlideIndex <= 0) return {};
      return { currentSlideIndex: s.currentSlideIndex - 1 };
    }),

  diffVersion: null,
  setDiffVersion: (diffVersion) => set({ diffVersion }),

  highlightedShapeId: null,
  setHighlightedShapeId: (highlightedShapeId) => set({ highlightedShapeId }),

  driftedShapeIds: [],
  setDriftedShapeIds: (driftedShapeIds) => set({ driftedShapeIds }),

  traceFlowActive: false,
  setTraceFlowActive: (traceFlowActive) => set({ traceFlowActive }),

  flowAnimationStyle: 'particle',
  setFlowAnimationStyle: (flowAnimationStyle) => set({ flowAnimationStyle }),
}));
