import { useEffect, useRef, useState } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { Icon } from "@iconify/react";
import { useDocStore } from "../store/useDocStore";
import { useApp, selectCurrentFile } from "../store/useApp";
import { useAuth } from "../store/useAuth";
import { useTheme, isDarkTone } from "../store/useTheme";
import { useEditorUi } from "../store/useEditorUi";
import { cloudEnabled, pullContent, pushContent } from "../sync/cloud";
import { applyFlow } from "../dsl/flow/compile";
import { parseFlow } from "../dsl/flow/parse";
import { applyErd } from "../dsl/erd/compile";
import { parseErd } from "../dsl/erd/parse";
import { applySequence } from "../dsl/sequence/compile";
import { parseSequence } from "../dsl/sequence/parse";
import { applyUml } from "../dsl/uml/compile";
import { parseUml } from "../dsl/uml/parse";
import { setupDslLanguage, DSL_LANG } from "../dsl/monaco";
import {
  serializeErdFromCanvas,
  serializeFlowFromCanvas,
} from "../dsl/serialize";
import { generateDsl, isAiConfigured } from "../lib/ai";
import { LoadingAnimation } from "./LoadingAnimation";

type DslError = { line: number; message: string };
type DslType = "flow" | "erd" | "sequence" | "uml";

const FLOW_SENIOR_SAMPLE = `// Payment orchestration flow — clean production overview
direction right

"Channels" [label: "Channels", color: blue, pos: 100 100, size: 240 280] {
  "Web checkout" [icon: monitor, color: blue, pos: 120 150]
  "Mobile app" [icon: smartphone, color: blue, pos: 120 270]
}

"Edge" [label: "Edge and API", color: cyan, pos: 400 100, size: 260 400] {
  "CDN / WAF" [shape: hexagon, icon: logos:cloudflare-icon, color: cyan, pos: 420 150]
  "API Gateway" [icon: logos:aws-api-gateway, color: orange, pos: 420 270]
  "Auth decision" [shape: diamond, icon: shield-check, color: purple, label: "Authorized?", pos: 420 390]
}

"Core services" [label: "Core services", color: green, pos: 720 100, size: 260 400] {
  "Checkout API" [icon: shopping-cart, color: green, pos: 740 150]
  "Payment service" [icon: workflow, color: green, pos: 740 270]
  "Provider router" [shape: diamond, icon: route, color: violet, pos: 740 390]
}

"Async and data" [label: "Async and data", color: pink, pos: 1040 100, size: 260 520] {
  "Orders DB" [shape: cylinder, icon: logos:postgresql, color: blue, pos: 1060 150]
  "Payment events" [shape: cylinder, icon: logos:kafka-icon, color: pink, pos: 1060 270]
  "Worker pool" [icon: boxes, color: orange, pos: 1060 390]
  "Ledger DB" [shape: cylinder, icon: database, color: green, pos: 1060 510]
}

"Operations" [label: "Operations", color: slate, pos: 720 540, size: 260 280] {
  "Metrics" [icon: activity, color: slate, pos: 740 590]
  "Alerting" [icon: bell, color: red, pos: 740 710]
}

"Web checkout" > "CDN / WAF"
"Mobile app" > "CDN / WAF"
"CDN / WAF" > "API Gateway"
"API Gateway" > "Auth decision"
"Auth decision" > "Checkout API": valid
"Auth decision" > "Alerting" [color: red]: reject
"Checkout API" > "Orders DB"
"Checkout API" > "Payment service"
"Payment service" > "Provider router": route
"Provider router" > "Payment events": authorized
"Payment events" > "Worker pool"
"Worker pool" > "Ledger DB"
"Payment service" --> "Metrics": latency
"Metrics" > "Alerting": threshold
`;

const ERD_SENIOR_SAMPLE = `// Commerce ERD — readable domain model
// Edit entities, fields, icons, colors, and relationship cardinality.
// Cardinality: < one-to-many, > many-to-one, - one-to-one, <> many-to-many

accounts [icon: building-2, color: blue, pos: 100 100] {
  id uuid pk
  name varchar
  status varchar
  createdAt timestamptz
}

customers [icon: users, color: green, pos: 100 360] {
  id uuid pk
  accountId uuid
  email citext
  lifecycle varchar
  createdAt timestamptz
}

orders [icon: shopping-cart, color: orange, pos: 450 100] {
  id uuid pk
  accountId uuid
  customerId uuid
  status varchar
  totalCents bigint
  placedAt timestamptz
}

order_items [icon: list, color: orange, pos: 800 100] {
  id uuid pk
  orderId uuid
  productId uuid
  quantity int
  unitPriceCents bigint
}

products [icon: package, color: purple, pos: 1150 100] {
  id uuid pk
  sku varchar
  name varchar
  active boolean
}

payments [icon: credit-card, color: pink, pos: 450 360] {
  id uuid pk
  orderId uuid
  provider varchar
  status varchar
  amountCents bigint
  authorizedAt timestamptz
}

ledger_entries [icon: database, color: green, pos: 800 360] {
  id uuid pk
  paymentId uuid
  orderId uuid
  entryType varchar
  amountCents bigint
  bookedAt timestamptz
}

webhooks [icon: radio, color: cyan, pos: 1150 360] {
  id uuid pk
  provider varchar
  eventType varchar
  paymentId uuid
  receivedAt timestamptz
}

accounts.id < customers.accountId
accounts.id < orders.accountId
customers.id < orders.customerId
orders.id < order_items.orderId
products.id < order_items.productId
orders.id < payments.orderId
payments.id < ledger_entries.paymentId
orders.id < ledger_entries.orderId
payments.id < webhooks.paymentId
`;

export const FLOW_INCIDENT_SAMPLE = `// Incident response workflow — escalation with explicit ownership
direction right

"Alert fired" [shape: oval, icon: bell, color: red, pos: 100 190] > "Triage severity" [shape: diamond, icon: alert-triangle, color: orange, pos: 340 190]
"Triage severity" > "Open incident room" [icon: message-square, color: orange, pos: 580 90]: SEV1 / SEV2
"Triage severity" > "Create backlog item" [icon: list-plus, color: blue, pos: 580 290]: low impact
"Open incident room" > "Assign incident commander" [icon: user-check, color: purple, pos: 820 90]
"Assign incident commander" > "Stabilize service" [shape: rectangle, icon: activity, color: green, pos: 1060 90]
"Stabilize service" > "Rollback deployment" [icon: rotate-ccw, color: red, pos: 1300 30]: bad release
"Stabilize service" > "Scale capacity" [icon: trending-up, color: green, pos: 1300 130]: saturation
"Stabilize service" > "Patch config" [icon: settings, color: blue, pos: 1300 230]: misconfig
"Rollback deployment" > "Customer comms" [icon: mail, color: blue, pos: 1540 130]
"Scale capacity" > "Customer comms"
"Patch config" > "Customer comms"
"Customer comms" > "Postmortem" [shape: document, icon: file-text, color: slate, pos: 1540 290]
"Postmortem" > "Action items" [shape: rectangle, icon: check-square, color: green, pos: 1780 290]
`;

export const ERD_AUTH_SAMPLE = `// Multi-tenant auth and permissions model
organizations [icon: building-2, color: blue, pos: 100 100] {
  id uuid pk
  name varchar
  slug varchar
  createdAt timestamptz
}

memberships [icon: users, color: purple, pos: 450 100] {
  id uuid pk
  organizationId uuid
  userId uuid
  roleId uuid
  status varchar
}

users [icon: user, color: blue, pos: 800 100] {
  id uuid pk
  email citext
  displayName varchar
  mfaEnabled boolean
}

roles [icon: shield, color: orange, pos: 100 360] {
  id uuid pk
  organizationId uuid
  name varchar
  systemRole boolean
}

permissions [icon: key, color: green, pos: 800 360] {
  id uuid pk
  resource varchar
  action varchar
}

role_permissions [icon: link, color: green, pos: 450 360] {
  roleId uuid pk
  permissionId uuid pk
}

sessions [icon: monitor, color: cyan, pos: 1150 100] {
  id uuid pk
  userId uuid
  organizationId uuid
  ipAddress inet
  expiresAt timestamptz
}

organizations.id < memberships.organizationId
users.id < memberships.userId
roles.id < memberships.roleId
organizations.id < roles.organizationId
roles.id < role_permissions.roleId
permissions.id < role_permissions.permissionId
users.id < sessions.userId
organizations.id < sessions.organizationId
`;

const SEQ_CHECKOUT_SAMPLE = `// Checkout sequence — request lifecycle across services
// Arrows: -> call, --> return, ->> async. "note over A, B: text" annotates.
title Checkout request

actor user
participant web as "Web app"
participant api as "Checkout API"
participant pay as "Payment service"
participant db as "Postgres"

user -> web: Click "Pay"
web -> api: POST /orders
api -> db: INSERT order (pending)
db --> api: order id
note over api, pay: authorize before capture
api -> pay: authorize(card, amount)
pay ->> api: authorized
api -> db: UPDATE order (paid)
api --> web: 201 Created
web --> user: Show receipt
`;

export const SEQ_AUTH_SAMPLE = `// OAuth login sequence — third-party sign-in
title Sign in with provider

actor user
participant app as "Our app"
participant idp as "Identity provider"
participant api as "Backend API"

user -> app: Click "Sign in"
app -> idp: Redirect /authorize
idp --> user: Login + consent
user -> idp: Approve
idp --> app: code
app -> api: exchange(code)
api -> idp: POST /token
idp --> api: access + id token
api -> api: verify + create session
api --> app: session cookie
app --> user: Signed in
`;

export const FLOW_MICROSERVICES_SAMPLE = `// Microservices Gateway & Event Broker architecture
direction right

"Ingress" [label: "Ingress Router", color: blue, pos: 100 100, size: 240 300] {
  "API Gateway" [icon: logos:aws-api-gateway, color: blue, pos: 120 150]
  "Auth Service" [icon: shield-check, color: purple, pos: 120 270]
}

"Services" [label: "Microservices", color: green, pos: 440 100, size: 260 420] {
  "Order Service" [icon: shopping-cart, color: green, pos: 460 150]
  "Payment Service" [icon: credit-card, color: green, pos: 460 270]
  "Notify Service" [icon: mail, color: green, pos: 460 390]
}

"Brokers" [label: "Event & Message Brokers", color: pink, pos: 800 100, size: 260 300] {
  "Kafka Broker" [shape: cylinder, icon: logos:kafka-icon, color: pink, pos: 820 150]
  "Redis Cache" [shape: cylinder, icon: logos:redis, color: red, pos: 820 270]
}

"API Gateway" > "Auth Service": authenticate
"API Gateway" > "Order Service": place order
"Order Service" > "Redis Cache": verify stock
"Order Service" > "Kafka Broker": emit order_created
"Kafka Broker" > "Payment Service": consume order_created
"Payment Service" > "Kafka Broker": emit payment_processed
"Kafka Broker" > "Notify Service": consume payment_processed
`;

export const FLOW_GITOPS_SAMPLE = `// GitOps Deployment & Kubernetes CD Pipeline
direction right

"Developer" [icon: user, color: blue, pos: 100 170] > "GitHub Repo" [icon: logos:github-icon, color: slate, pos: 340 170]: git push

"CI Pipeline" [label: "Continuous Integration", color: orange, pos: 580 50, size: 280 420] {
  "GitHub Actions" [icon: workflow, color: orange, pos: 600 100]
  "Docker Build" [icon: logos:docker-icon, color: cyan, pos: 600 220]
  "Registry" [shape: cylinder, icon: logos:aws-ecr, color: orange, label: "ECR Container Registry", pos: 600 340]
}

"CD Pipeline" [label: "Continuous Deployment", color: green, pos: 960 110, size: 280 300] {
  "ArgoCD" [icon: logos:argocd-icon, color: red, label: "ArgoCD Controller", pos: 980 160]
  "EKS Cluster" [shape: hexagon, icon: logos:aws-eks, color: blue, label: "Amazon EKS", pos: 980 280]
}

"GitHub Repo" > "GitHub Actions": webhook trigger
"GitHub Actions" > "Docker Build": build image
"Docker Build" > "Registry": push container image
"ArgoCD" > "GitHub Repo": poll repo state
"ArgoCD" > "Registry": fetch latest tag
"ArgoCD" > "EKS Cluster": sync manifest state
`;

export const FLOW_MULTIREGION_SAMPLE = `// Multi-Region Active-Passive Database Replication
direction down

"DNS" [label: "Traffic Management", color: blue, pos: 100 50, size: 260 180] {
  "Route 53" [icon: logos:aws-route53, color: blue, pos: 120 100]
}

"Region US-East" [label: "US East (Primary)", color: green, pos: 100 280, size: 260 300] {
  "App Server East" [icon: server, color: green, pos: 120 330]
  "Primary DB" [shape: cylinder, icon: logos:postgresql, color: blue, pos: 120 450]
}

"Region US-West" [label: "US West (DR / Replica)", color: purple, pos: 460 280, size: 260 300] {
  "App Server West" [icon: server, color: purple, pos: 480 330]
  "Replica DB" [shape: cylinder, icon: logos:postgresql, color: blue, pos: 480 450]
}

"Route 53" > "App Server East": 90% traffic
"Route 53" > "App Server West": 10% traffic
"App Server East" > "Primary DB": write / read
"App Server West" > "Replica DB": read only
"Primary DB" --> "Replica DB" [color: orange]: cross-region replication
`;

export const ERD_SAAS_SAMPLE = `// SaaS Subscription and Billing model schema
organizations [icon: building-2, color: blue, pos: 100 100] {
  id uuid pk
  name varchar
  slug varchar
  createdAt timestamptz
}

users [icon: user, color: blue, pos: 100 360] {
  id uuid pk
  organizationId uuid
  email citext
  displayName varchar
}

billing_plans [icon: list, color: orange, pos: 450 100] {
  id uuid pk
  name varchar
  priceCents bigint
  billingInterval varchar
}

subscriptions [icon: credit-card, color: green, pos: 800 100] {
  id uuid pk
  organizationId uuid
  planId uuid
  status varchar
  currentPeriodEnd timestamptz
}

invoices [icon: file-text, color: pink, pos: 800 360] {
  id uuid pk
  subscriptionId uuid
  amountCents bigint
  status varchar
  dueDate timestamptz
}

organizations.id < users.organizationId
organizations.id < subscriptions.organizationId
billing_plans.id < subscriptions.planId
subscriptions.id < invoices.subscriptionId
`;

export const ERD_INVENTORY_SAMPLE = `// E-Commerce Order & Inventory Management Schema
products [icon: package, color: blue, pos: 100 100] {
  id uuid pk
  sku varchar
  name varchar
  priceCents bigint
}

warehouses [icon: home, color: purple, pos: 100 360] {
  id uuid pk
  name varchar
  location varchar
}

inventory_items [icon: list, color: green, pos: 450 100] {
  id uuid pk
  productId uuid
  warehouseId uuid
  quantity int
}

orders [icon: shopping-cart, color: orange, pos: 800 100] {
  id uuid pk
  customerEmail varchar
  status varchar
  totalAmount bigint
}

order_items [icon: list, color: orange, pos: 1150 100] {
  id uuid pk
  orderId uuid
  productId uuid
  quantity int
}

shipments [icon: truck, color: cyan, pos: 800 360] {
  id uuid pk
  orderId uuid
  warehouseId uuid
  trackingNumber varchar
  status varchar
}

products.id < inventory_items.productId
warehouses.id < inventory_items.warehouseId
orders.id < order_items.orderId
products.id < order_items.productId
orders.id < shipments.orderId
warehouses.id < shipments.warehouseId
`;

export const ERD_SOCIAL_SAMPLE = `// Social Network Graph database schema
profiles [icon: user, color: blue, pos: 100 100] {
  id uuid pk
  username varchar
  bio varchar
  avatarUrl varchar
}

posts [icon: file-text, color: green, pos: 450 100] {
  id uuid pk
  authorId uuid
  content text
  createdAt timestamptz
}

comments [icon: message-square, color: orange, pos: 800 100] {
  id uuid pk
  postId uuid
  authorId uuid
  body text
  createdAt timestamptz
}

follows [icon: users, color: purple, pos: 100 360] {
  followerId uuid pk
  followingId uuid pk
  createdAt timestamptz
}

likes [icon: heart, color: red, pos: 450 360] {
  profileId uuid pk
  postId uuid pk
}

profiles.id < posts.authorId
posts.id < comments.postId
profiles.id < comments.authorId
profiles.id < follows.followerId
profiles.id < follows.followingId
profiles.id < likes.profileId
posts.id < likes.postId
`;

const UML_SENIOR_SAMPLE = `// E-Commerce Domain Model — UML Class Diagram
class PaymentService [icon: server, color: green] {
  - gateway: Gateway
  - logger: Logger
  + charge(amount: Double): Receipt
  + refund(id: String): Boolean
}

class Gateway [icon: cpu, color: blue] {
  + authorize(): Token
  + capture(): Receipt
}

class Customer [icon: user, color: orange] {
  - email: String
  + pay(amount: Double): Receipt
}

Customer --> PaymentService : uses
PaymentService --> Gateway : delegates
`;



const STARTERS: Record<DslType, string> = {
  flow: FLOW_SENIOR_SAMPLE,
  erd: ERD_SENIOR_SAMPLE,
  sequence: SEQ_CHECKOUT_SAMPLE,
  uml: UML_SENIOR_SAMPLE,
};

const LEGACY_STARTER_MARKERS: Record<DslType, string> = {
  flow: '// Flow chart — define nodes and relationships "A > B"',
  erd: '// ERD — define entities in "{ }", then relationships',
  sequence: '// Sequence — "A -> B: message" between participants',
  uml: '// E-Commerce Domain Model — UML Class Diagram',
};

function codeFromStorage(storageKey: string, dslType: DslType) {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return STARTERS[dslType];
  const isOldBundledStarter =
    saved.includes(LEGACY_STARTER_MARKERS[dslType]) ||
    saved.includes("Payment orchestration flow — production checkout path") ||
    saved.includes(
      "Commerce ERD — orders, payments, ledger, inventory, and audit",
    );
  if (!isOldBundledStarter) return saved;
  localStorage.setItem(storageKey, STARTERS[dslType]);
  return STARTERS[dslType];
}

/**
 * Diagram-as-code pane (Phase 3). Flow-chart and ERD DSLs compile to native
 * shapes via ELK auto-layout, with syntax highlighting, autocomplete, and live
 * error markers. Apply writes code to canvas; Pull canvas serializes editable
 * diagram shapes back into source so the user can customize from either side.
 */
export function CodePane() {
  const editor = useDocStore((s) => s.editor);
  const markSaved = useDocStore((s) => s.markSaved);
  const file = useApp(selectCurrentFile);
  const tone = useTheme((s) => s.tone);
  const dslType = useEditorUi((s) => s.dslType);
  const dslOpen = useEditorUi((s) => s.dslOpen);
  const canEdit = !file?.sharedFrom || file.sharedRole === "edit";
  const uid = useAuth((s) => s.uid);
  const ownerUid = file?.sharedFrom ?? uid;
  const storageKey = `nb-code-${file?.id ?? "scratch"}-${dslType}`;
  const parse =
    dslType === "erd"
      ? parseErd
      : dslType === "sequence"
        ? parseSequence
        : dslType === "uml"
          ? parseUml
          : parseFlow;
  const applyDiagram =
    dslType === "erd"
      ? applyErd
      : dslType === "sequence"
        ? applySequence
        : dslType === "uml"
          ? applyUml
          : applyFlow;

  const [code, setCode] = useState(() => codeFromStorage(storageKey, dslType));
  const [errors, setErrors] = useState<DslError[]>([]);
  const [busy, setBusy] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const modelRef = useRef<ReturnType<Parameters<OnMount>[0]["getModel"]>>(null);

  const [localSyncActive, setLocalSyncActive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const codeRef = useRef(code);



  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // Connect to local sync socket on localhost
  useEffect(() => {
    if (window.location.hostname !== 'localhost') return;

    let ws: WebSocket | null = null;
    let timer: any = null;

    const connect = () => {
      ws = new WebSocket('ws://localhost:8788');
      wsRef.current = ws;

      ws.onopen = () => {
        setLocalSyncActive(true);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'update' && msg.dslType === dslType) {
            if (msg.dsl !== codeRef.current) {
              setCode(msg.dsl);
              localStorage.setItem(storageKey, msg.dsl);
              lint(msg.dsl);
              if (editor && canEdit) {
                applyDiagram(editor, msg.dsl).catch(() => {});
              }
            }
          }
        } catch (err) {
          console.error('[Sync] Socket update error:', err);
        }
      };

      ws.onclose = () => {
        setLocalSyncActive(false);
        wsRef.current = null;
        timer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dslType, editor, canEdit, storageKey]);

  useEffect(() => {
    const next = codeFromStorage(storageKey, dslType);
    setCode(next);
    lint(next);

    const handleSync = () => {
      const updated = codeFromStorage(storageKey, dslType);
      setCode(updated);
      lint(updated);
    };
    window.addEventListener('nb-sync-code', handleSync);
    return () => window.removeEventListener('nb-sync-code', handleSync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dslType, storageKey]);

  useEffect(() => {
    if (!file?.id || !ownerUid || !cloudEnabled()) return;
    let cancelled = false;
    void pullContent(ownerUid, file.id).then((content) => {
      const remote = content?.code?.[dslType];
      if (cancelled || !remote) return;
      setCode(remote);
      localStorage.setItem(storageKey, remote);
      lint(remote);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.id, ownerUid, dslType, storageKey]);

  const persistCode = (next: string) => {
    localStorage.setItem(storageKey, next);
    if (file?.id && ownerUid && cloudEnabled()) {
      pushContent(ownerUid, file.id, { code: { [dslType]: next } }).catch(
        () => {},
      );
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'update', dslType, dsl: next }));
    }
  };

  // Recompute inline diagnostics (parse-level) and paint Monaco markers.
  const lint = (src: string) => {
    const { errors: errs } = parse(src);
    setErrors(errs);
    const monaco = monacoRef.current;
    const model = modelRef.current;
    if (!monaco || !model) return;
    monaco.editor.setModelMarkers(
      model,
      "nbdsl",
      errs
        .filter((e) => e.line > 0)
        .map((e) => ({
          startLineNumber: e.line,
          endLineNumber: e.line,
          startColumn: 1,
          endColumn: model.getLineMaxColumn(e.line),
          message: e.message,
          severity: monaco.MarkerSeverity.Error,
        })),
    );
  };

  const onChange = (v?: string) => {
    if (!canEdit) return;
    const next = v ?? "";
    setCode(next);
    persistCode(next);
    lint(next);
  };

  const applyToCanvas = async () => {
    if (!editor || !canEdit) return;
    setBusy(true);
    try {
      setErrors(await applyDiagram(editor, code));
      markSaved();
    } finally {
      setBusy(false);
    }
  };

  const runAi = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || aiBusy || !canEdit) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const dsl = await generateDsl({
        kind: dslType,
        prompt,
        currentDsl: code,
      });
      setCode(dsl);
      persistCode(dsl);
      lint(dsl);
      setAiPrompt("");
      setAiOpen(false);
      // Draw it immediately so the user sees the result on the canvas.
      if (editor && canEdit) {
        setBusy(true);
        try {
          setErrors(await applyDiagram(editor, dsl));
          markSaved();
        } finally {
          setBusy(false);
        }
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setAiBusy(false);
    }
  };



  // Sequence diagrams are generated top-down and have no stable reverse mapping
  // from arbitrary canvas shapes, so "Pull canvas" is only offered for flow/ERD.
  const canPull = dslType === "flow" || dslType === "erd";
  const pullCanvas = () => {
    if (!editor || !canEdit || !canPull) return;
    const next =
      dslType === "erd"
        ? serializeErdFromCanvas(editor)
        : serializeFlowFromCanvas(editor);
    setCode(next);
    persistCode(next);
    lint(next);
  };

  useEffect(() => {
    if (dslOpen) {
      const timer = setTimeout(() => {
        pullCanvas();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [dslOpen, dslType]);

  const errCount = errors.filter((e) => e.line >= 0).length;

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex items-center gap-2 text-xs">
          {errCount === 0 ? (
            <span className="flex items-center gap-1 font-medium text-grey-4">
              <Icon icon="lucide:check-circle-2" width={13} /> No issues
            </span>
          ) : (
            <span className="flex items-center gap-1 font-medium text-ink">
              <Icon icon="lucide:alert-circle" width={13} /> {errCount} issue
              {errCount > 1 ? "s" : ""}
            </span>
          )}
          {localSyncActive && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-500" />
              Local Sync Active
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {canPull && (
            <button
              onClick={pullCanvas}
              disabled={!editor || !canEdit}
              title="Generate editable DSL from the current canvas"
              className="flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-semibold text-grey-4 transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
            >
              <Icon icon="lucide:download" width={12} />
              Pull canvas
            </button>
          )}
          {isAiConfigured && (
            <button
              onClick={() => {
                setAiOpen((v) => !v);
                setAiError(null);
              }}
              disabled={!canEdit}
              title="Generate this diagram from a description"
              className={
                "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors disabled:opacity-40 " +
                (aiOpen
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-grey-4 hover:border-ink hover:text-ink")
              }
            >
              <Icon icon="lucide:sparkles" width={12} />
              Ask AI
            </button>
          )}
          <button
            onClick={applyToCanvas}
            disabled={busy || !editor || !canEdit}
            className="flex h-8 min-w-[72px] items-center justify-center gap-1.5 rounded-full bg-ink px-3.5 text-xs font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? (
              <LoadingAnimation
                size="sm"
                variant="rotate8"
                label=""
                color="var(--color-paper)"
                className="-my-1 scale-75"
              />
            ) : (
              <>
                <Icon icon="lucide:play" width={12} />
                Apply
              </>
            )}
          </button>
        </div>
      </div>

      {aiOpen && (
        <div className="border-b border-line bg-paper px-3 py-2">
          <div className="flex items-center gap-2">
            <Icon
              icon="lucide:sparkles"
              width={14}
              className="shrink-0 text-grey-4"
            />
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void runAi();
                if (e.key === "Escape") setAiOpen(false);
              }}
              autoFocus
              disabled={aiBusy}
              placeholder={
                dslType === "erd"
                  ? "Describe a data model, e.g. “blog with users, posts, comments”"
                  : "Describe a flow, e.g. “checkout with a payment provider and webhook”"
              }
              className="h-8 w-full rounded-lg border border-line bg-surface px-2.5 text-sm text-ink outline-none placeholder:text-grey-3 focus:border-ink disabled:opacity-60"
            />
            <button
              onClick={() => void runAi()}
              disabled={!aiPrompt.trim() || aiBusy}
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-ink px-3 text-xs font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {aiBusy ? (
                <LoadingAnimation
                  size="sm"
                  variant="rotate8"
                  label=""
                  color="var(--color-paper)"
                  className="-my-1 scale-75"
                />
              ) : (
                <>
                  <Icon icon="lucide:arrow-up" width={12} /> Generate
                </>
              )}
            </button>
          </div>
          {aiError && <p className="mt-1.5 text-xs text-red-500">{aiError}</p>}
        </div>
      )}



      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language={DSL_LANG}
          value={code}
          onChange={onChange}
          beforeMount={(monaco) => setupDslLanguage(monaco)}
          onMount={(ed, monaco) => {
            monacoRef.current = monaco;
            modelRef.current = ed.getModel();
            lint(code);
          }}
          theme={isDarkTone(tone) ? "vs-dark" : "vs"}
          options={{
            readOnly: !canEdit,
            fontSize: 13,
            fontFamily: "JetBrains Mono, monospace",
            minimap: { enabled: false },
            lineNumbers: "on",
            wordWrap: "on",
            scrollBeyondLastLine: false,
            padding: { top: 12 },
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            tabSize: 2,
          }}
        />
      </div>

      {errors.length > 0 && (
        <div className="max-h-32 overflow-y-auto border-t border-line bg-paper p-3">
          {errors.map((e, i) => (
            <p key={i} className="font-mono text-xs text-grey-4">
              {e.line ? `line ${e.line}: ` : ""}
              {e.message}
            </p>
          ))}
        </div>
      )}    </div>
  );
}




