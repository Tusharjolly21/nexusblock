import { createShapeId, toRichText, type Editor, type TLShapeId, type VecLike } from 'tldraw'
import { createArchNode, connectShapes, createCodeBlock, createGroupFrame } from '../canvas/createNode'
import type { NodeKind } from '../shapes/ArchNodeShape'
import type { GroupAccent } from '../shapes/GroupFrameShape'

export type DiagramCatalogKind = 'architecture' | 'data' | 'flow' | 'sequence' | 'security'

export type DiagramCatalogItem = {
  id: string
  title: string
  subtitle: string
  description: string
  kind: DiagramCatalogKind
  icon: string
  logos: string[]
  tags: string[]
  accent: 'blue' | 'green' | 'orange' | 'pink' | 'purple' | 'slate' | 'red' | 'cyan'
  complexity: 'Starter' | 'Team' | 'Senior'
  insert: (editor: Editor) => void
}

type NodeSpec = {
  key: string
  x: number
  y: number
  label: string
  tech?: string
  kind?: NodeKind
  icon?: string
  w?: number
  h?: number
}

type FrameSpec = {
  x: number
  y: number
  w: number
  h: number
  label: string
  tint?: string
  accent?: GroupAccent
}

type EdgeSpec = [string, string] | [string, string, string]

const catalogOrigin = (editor: Editor, width: number, height: number): VecLike => {
  const center = editor.getViewportPageBounds().center
  return { x: center.x - width / 2, y: center.y - height / 2 }
}

function node(editor: Editor, origin: VecLike, spec: NodeSpec) {
  return createArchNode(editor, {
    kind: spec.kind ?? 'service',
    label: spec.label,
    tech: spec.tech ?? '',
    icon: spec.icon,
    w: spec.w,
    h: spec.h,
    point: { x: origin.x + spec.x, y: origin.y + spec.y },
  })
}

function frame(editor: Editor, origin: VecLike, spec: FrameSpec) {
  return createGroupFrame(editor, {
    x: origin.x + spec.x,
    y: origin.y + spec.y,
    w: spec.w,
    h: spec.h,
    label: spec.label,
    tint: spec.tint ?? '',
    accent: spec.accent ?? 'grey',
  })
}

function connect(editor: Editor, ids: Record<string, TLShapeId>, edges: EdgeSpec[]) {
  return edges.map(([from, to, label]) => {
    const arrow = connectShapes(editor, ids[from], ids[to])
    if (label) {
      editor.updateShape({ id: arrow, type: 'arrow', props: { richText: toRichText(label) } as never })
    }
    return arrow
  })
}

function note(editor: Editor, origin: VecLike, x: number, y: number, title: string, body: string) {
  const id = createShapeId()
  editor.createShape({
    id,
    type: 'note',
    x: origin.x + x,
    y: origin.y + y,
    props: { richText: toRichText(`${title}\n${body}`), color: 'yellow', size: 'm' } as never,
  })
  return id
}

function finish(editor: Editor, ids: TLShapeId[]) {
  editor.select(...ids)
  editor.zoomToSelection({ animation: { duration: 180 } })
}

function insertBlueprint(
  editor: Editor,
  opts: {
    history: string
    width: number
    height: number
    frames?: FrameSpec[]
    nodes: NodeSpec[]
    edges: EdgeSpec[]
    notes?: Array<[number, number, string, string]>
    code?: { x: number; y: number; title: string; language?: string; code: string }
  },
) {
  editor.markHistoryStoppingPoint(opts.history)
  const o = catalogOrigin(editor, opts.width, opts.height)
  const created: TLShapeId[] = []
  for (const f of opts.frames ?? []) created.push(frame(editor, o, f))
  const ids: Record<string, TLShapeId> = {}
  for (const spec of opts.nodes) {
    ids[spec.key] = node(editor, o, spec)
    created.push(ids[spec.key])
  }
  const arrows = connect(editor, ids, opts.edges)
  created.push(...arrows)
  for (const n of opts.notes ?? []) created.push(note(editor, o, ...n))
  if (opts.code) {
    created.push(createCodeBlock(editor, {
      point: { x: o.x + opts.code.x, y: o.y + opts.code.y },
      title: opts.code.title,
      language: opts.code.language,
      code: opts.code.code,
    }))
  }
  finish(editor, created)
}

function insertAwsVod(editor: Editor) {
  insertBlueprint(editor, {
    history: 'insert AWS Video-on-Demand',
    width: 6340,
    height: 2269,
    frames: [
      { x: -1680, y: -386, w: 320, h: 608, label: 'Users and Client Applications', accent: 'sky' },
      { x: -665, y: -249, w: 1184, h: 622, label: 'AWS Edge and Access Layer', accent: 'amber' },
      { x: 1488, y: -10, w: 736, h: 808, label: 'Application and Control Plane', accent: 'violet' },
      { x: -912, y: 1055, w: 2048, h: 389, label: 'Secure Media Ingest', accent: 'sky' },
      { x: 2800, y: 896, w: 1216, h: 642, label: 'Media Processing Pipeline', accent: 'amber' },
      { x: 1488, y: -524, w: 1024, h: 416, label: 'Global Playback and Product Experience', accent: 'grey' },
      { x: -2096, y: 738, w: 736, h: 866, label: 'Operations, Reliability and Governance', accent: 'grey' },
    ],
    nodes: [
      // Group: Users and Client Applications
      { key: 'content_admin', x: -1632, y: 46, label: 'Content Admin / Studio', tech: 'Operator Interface', icon: 'lucide:clapperboard' },
      { key: 'viewers', x: -1632, y: -146, label: 'Web, Mobile and Smart TV Viewers', tech: 'Audience Clients', icon: 'lucide:monitor-smartphone' },
      { key: 'video_player', x: -1632, y: -338, label: 'Adaptive Bitrate Video Player', tech: 'HLS Player Framework', icon: 'lucide:circle-play' },

      // Group: AWS Edge and Access Layer
      { key: 'route53', x: -617, y: -127, label: 'Amazon Route 53', tech: 'DNS Routing', icon: 'logos:aws-route53' },
      { key: 'waf_shield', x: -169, y: -144, label: 'AWS WAF + Shield', tech: 'DDoS Protection', icon: 'logos:aws-waf' },
      { key: 'cloudfront', x: 247, y: -201, label: 'Amazon CloudFront CDN', tech: 'Global Edge Cache', icon: 'logos:aws-cloudfront' },
      { key: 'cognito', x: -617, y: 65, label: 'Amazon Cognito', tech: 'User Identity Pool', icon: 'logos:aws-cognito' },
      { key: 'api_gateway', x: -169, y: 169, label: 'Amazon API Gateway', tech: 'REST Edge Controller', icon: 'logos:aws-api-gateway' },

      // Group: Application and Control Plane
      { key: 'upload_service', x: 1952, y: 540, label: 'Lambda Upload Service', tech: 'Presigned Multipart URLs', icon: 'logos:aws-lambda' },
      { key: 'playback_authorization', x: 1536, y: 230, label: 'Lambda Playback Auth', tech: 'Signed URL / Cookie', icon: 'logos:aws-lambda' },
      { key: 'catalog_api', x: 1536, y: 38, label: 'Lambda Catalog API', tech: 'Video Catalog Query', icon: 'logos:aws-lambda' },
      { key: 'video_metadata', x: 1952, y: 348, label: 'Amazon DynamoDB', tech: 'Metadata & State Store', icon: 'logos:aws-dynamodb', kind: 'db' },
      { key: 'secrets_manager', x: 1536, y: 589, label: 'AWS Secrets Manager', tech: 'Encrypted App Config', icon: 'logos:aws-secrets-manager', kind: 'db' },

      // Group: Secure Media Ingest
      { key: 'source_bucket', x: -768, y: 1171, label: 'Amazon S3 Ingest', tech: 'Original Masters', icon: 'logos:aws-s3', kind: 'db' },
      { key: 'eventbridge', x: -384, y: 1103, label: 'Amazon EventBridge', tech: 'Object Created Event', icon: 'logos:aws-eventbridge' },
      { key: 'processing_workflow', x: 64, y: 1176, label: 'AWS Step Functions', tech: 'VOD Orchestrator', icon: 'logos:aws-step-functions' },
      { key: 'media_validation', x: 480, y: 1227, label: 'AWS Lambda Validation', tech: 'FFprobe metadata probe', icon: 'logos:aws-lambda' },
      { key: 'processing_dlq', x: 864, y: 1179, label: 'Amazon SQS DLQ', tech: 'Dead-Letter Queue', icon: 'logos:aws-sqs' },

      // Group: Media Processing Pipeline
      { key: 'media_convert', x: 2944, y: 1329, label: 'AWS Elemental MediaConvert', tech: 'QVBR + ABR Transcoder', icon: 'logos:aws-lambda' },
      { key: 'renditions', x: 3328, y: 1137, label: 'HLS, DASH and MP4 Renditions', tech: 'ABR Playback Profiles', icon: 'lucide:layers-3' },
      { key: 'media_assets', x: 3328, y: 1329, label: 'Thumbnails & Posters', tech: 'Preview clip generators', icon: 'lucide:images' },
      { key: 'distribution_bucket', x: 3744, y: 1073, label: 'Amazon S3 Distribution', tech: 'Versioned assets CDN origin', icon: 'logos:aws-s3', kind: 'db' },
      { key: 'kms', x: 3328, y: 944, label: 'AWS KMS Keys', tech: 'AES-256 Envelope Keys', icon: 'logos:aws-kms', kind: 'db' },

      // Group: Global Playback and Product Experience
      { key: 'origin_access_control', x: 1888, y: -284, label: 'OAC Config', tech: 'CloudFront Origin Access Control', icon: 'logos:aws-cloudfront' },
      { key: 'origin_shield', x: 1536, y: -284, label: 'Origin Shield CDN', tech: 'CloudFront Edge Cache Shield', icon: 'logos:aws-cloudfront' },
      { key: 'playback_events', x: 1536, y: -476, label: 'Playback Events API', tech: 'Event Ingest Endpoint', icon: 'lucide:activity' },
      { key: 'data_firehose', x: 1888, y: -476, label: 'Amazon Data Firehose', tech: 'Real-time log buffer', icon: 'logos:aws-kinesis' },
      { key: 'analytics_lake', x: 2240, y: -476, label: 'Amazon S3 Analytics', tech: 'Analytics Parquet Lake', icon: 'logos:aws-s3', kind: 'db' },

      // Group: Operations, Reliability and Governance
      { key: 'cloudwatch', x: -2048, y: 1428, label: 'Amazon CloudWatch', tech: 'Metrics, Logs & Alarms', icon: 'logos:aws-cloudwatch' },
      { key: 'sns', x: -1632, y: 1253, label: 'Amazon SNS', tech: 'Notifications & Alerts', icon: 'logos:aws-sns' },
      { key: 'xray', x: -2048, y: 786, label: 'AWS X-Ray', tech: 'Request Tracing', icon: 'logos:aws-xray' },
      { key: 'cloudtrail', x: -2048, y: 979, label: 'AWS CloudTrail', tech: 'Governance Audits', icon: 'logos:aws-cloudtrail' },
      { key: 'iam', x: -2048, y: 1171, label: 'AWS IAM Permissions', tech: 'Least Privilege Roles', icon: 'logos:aws-iam' },
    ],
    edges: [
      ['content_admin', 'cognito', 'Sign in'],
      ['content_admin', 'api_gateway', 'Request upload session'],
      ['cognito', 'api_gateway', 'JWT tokens'],
      ['api_gateway', 'upload_service', 'Create presigned multipart upload'],
      ['upload_service', 'content_admin', 'Return upload URLs'],
      ['content_admin', 'source_bucket', 'Upload large source file directly'],
      ['source_bucket', 'eventbridge', 'Object-created event'],
      ['eventbridge', 'processing_workflow', 'Start processing execution'],
      ['eventbridge', 'processing_workflow', 'Resume workflow'],
      ['processing_workflow', 'media_validation', 'Validate file and metadata'],
      ['media_validation', 'processing_dlq', 'Invalid media'],
      ['media_validation', 'media_convert', 'Valid media'],
      ['processing_workflow', 'media_convert', 'Submit and monitor job'],
      ['media_convert', 'eventbridge', 'Job status'],
      ['processing_workflow', 'video_metadata', 'Update processing state'],
      ['processing_workflow', 'sns', 'Publish completion or failure'],
      ['viewers', 'route53', 'Open application'],
      ['route53', 'waf_shield', 'Resolve domains'],
      ['waf_shield', 'cloudfront', 'Protected request'],
      ['viewers', 'cognito', 'Authenticate'],
      ['video_player', 'api_gateway', 'Request playback entitlement'],
      ['api_gateway', 'playback_authorization', 'Authorize title'],
      ['playback_authorization', 'video_metadata', 'Read entitlement'],
      ['playback_authorization', 'video_player', 'Return signed access'],
      ['video_player', 'cloudfront', 'Request manifest and segments'],
      ['cloudfront', 'origin_shield', 'Cache miss'],
      ['origin_shield', 'origin_access_control', 'Private origin request'],
      ['origin_access_control', 'distribution_bucket', 'Fetch assets'],
      ['cloudfront', 'video_player', 'Adaptive bitrate stream'],
      ['api_gateway', 'catalog_api', 'Browse and search catalog'],
      ['catalog_api', 'video_metadata', 'Read video catalog'],
      ['video_player', 'playback_events', 'QoE events'],
      ['playback_events', 'data_firehose', 'Stream events'],
      ['data_firehose', 'analytics_lake', 'Store analytics'],
      ['kms', 'source_bucket', 'Encrypt source'],
      ['kms', 'distribution_bucket', 'Encrypt output'],
      ['secrets_manager', 'upload_service', 'App secrets'],
      ['iam', 'source_bucket', 'Service permissions'],
      ['iam', 'media_convert', 'Service permissions'],
      ['iam', 'processing_workflow', 'Service permissions'],
      ['cloudtrail', 'api_gateway', 'Audit control-plane activity'],
      ['cloudtrail', 'source_bucket', 'Audit bucket activity'],
      ['cloudwatch', 'processing_workflow', 'Workflow telemetry'],
      ['cloudwatch', 'media_convert', 'Transcoding metrics and logs'],
      ['cloudwatch', 'api_gateway', 'API alarms'],
      ['xray', 'api_gateway', 'Trace APIs'],
      ['processing_dlq', 'cloudwatch', 'Alarm on failure'],
      ['cloudwatch', 'sns', 'Alert ops team'],
      ['media_convert', 'renditions', 'Generate ABR renditions'],
      ['media_convert', 'media_assets', 'Generate supporting assets'],
      ['renditions', 'distribution_bucket', 'Write packaged media'],
      ['media_assets', 'distribution_bucket', 'Write images and captions'],
    ],
  })
}

function insertRealtimeMessaging(editor: Editor) {
  insertBlueprint(editor, {
    history: 'insert Real-Time Messaging Platform',
    width: 7000,
    height: 2700,
    frames: [
      { x: -1750, y: -450, w: 320, h: 704, label: 'Client Applications', accent: 'sky' },
      { x: -850, y: -450, w: 1184, h: 750, label: 'Global Edge and Connection Layer', accent: 'amber' },
      { x: 600, y: -600, w: 1050, h: 550, label: 'Identity, Device Trust and Key Management', accent: 'violet' },
      { x: 600, y: 150, w: 1400, h: 1000, label: 'Regional Messaging Control Plane', accent: 'sky' },
      { x: 2350, y: 100, w: 1550, h: 1000, label: 'Ordering, Durable Storage and Event Backbone', accent: 'amber' },
      { x: 4200, y: -450, w: 1150, h: 900, label: 'Media Delivery and Push Notifications', accent: 'grey' },
      { x: 4200, y: 650, w: 1350, h: 800, label: 'Cross-Region Continuity and Failover', accent: 'grey' },
      { x: -2300, y: 650, w: 800, h: 1000, label: 'Operations, Reliability and Governance', accent: 'grey' },
    ],
    nodes: [
      // Group: Client Applications
      { key: 'sender_device', x: -1702, y: -402, label: 'Sender Mobile Device', tech: 'End-to-End Encryption Client', icon: 'lucide:smartphone' },
      { key: 'recipient_device', x: -1702, y: -210, label: 'Recipient Mobile Device', tech: 'Online or Offline Recipient', icon: 'lucide:smartphone' },
      { key: 'web_client', x: -1702, y: -18, label: 'Web and Desktop Client', tech: 'Linked Device Session', icon: 'lucide:monitor' },

      // Group: Global Edge and Connection Layer
      { key: 'global_dns', x: -802, y: -402, label: 'Anycast DNS', tech: 'Latency-Based Routing', icon: 'lucide:globe' },
      { key: 'global_load_balancer', x: -450, y: -402, label: 'Global Load Balancer', tech: 'Health-Aware Routing', icon: 'lucide:network' },
      { key: 'websocket_gateway', x: -50, y: -402, label: 'WebSocket Gateway Fleet', tech: 'Long-Lived TLS Connections', icon: 'lucide:radio' },
      { key: 'api_gateway', x: -450, y: -130, label: 'HTTPS API Gateway', tech: 'Uploads & Device APIs', icon: 'logos:aws-api-gateway' },
      { key: 'edge_rate_limiter', x: -50, y: -130, label: 'Distributed Rate Limiter', tech: 'Per User & IP Quotas', icon: 'lucide:gauge' },

      // Group: Identity, Device Trust and Key Management
      { key: 'auth_service', x: 648, y: -552, label: 'Authentication Service', tech: 'Access & Refresh Tokens', icon: 'lucide:shield-check' },
      { key: 'device_registry', x: 1000, y: -552, label: 'Device Registry', tech: 'Trusted session states', icon: 'lucide:smartphone', kind: 'db' },
      { key: 'key_directory', x: 1352, y: -552, label: 'Public Key Directory', tech: 'Signed Prekeys Directory', icon: 'lucide:key-round' },
      { key: 'abuse_detection', x: 824, y: -312, label: 'Abuse & Spam Detection', tech: 'Behavior Metadata Signals', icon: 'lucide:shield-alert' },
      { key: 'token_cache', x: 1176, y: -312, label: 'Session Cache', tech: 'Redis Authorization Cache', icon: 'logos:redis', kind: 'db' },

      // Group: Regional Messaging Control Plane
      { key: 'chat_ingress', x: 648, y: 198, label: 'Chat Ingress Service', tech: 'Validate Envelope Membership', icon: 'lucide:messages-square' },
      { key: 'idempotency_service', x: 1000, y: 198, label: 'Idempotency Service', tech: 'Client Message Dedup', icon: 'lucide:copy-check' },
      { key: 'conversation_service', x: 1352, y: 198, label: 'Conversation Service', tech: 'Membership Fanout Policy', icon: 'lucide:users' },
      { key: 'presence_service', x: 1648, y: 198, label: 'Presence Service', tech: 'Online Typing & State', icon: 'lucide:activity' },
      { key: 'delivery_router', x: 824, y: 486, label: 'Message Delivery Router', tech: 'Online Fanout Router', icon: 'lucide:route' },
      { key: 'receipt_service', x: 1176, y: 486, label: 'Delivery Receipt Service', tech: 'Sent, Delivered & Read logs', icon: 'lucide:check-check' },
      { key: 'history_service', x: 1528, y: 486, label: 'Message History Service', tech: 'Cursor Reconnect Sync', icon: 'lucide:history' },
      { key: 'session_registry', x: 824, y: 774, label: 'Active Session Registry', tech: 'User-Gateway session map', icon: 'logos:redis', kind: 'db' },
      { key: 'offline_delivery', x: 1176, y: 774, label: 'Offline Delivery Coordinator', tech: 'Push triggers dispatcher', icon: 'lucide:inbox' },
      { key: 'group_fanout_worker', x: 1528, y: 774, label: 'Group Fanout Workers', tech: 'Asynchronous group fanout', icon: 'lucide:git-fork' },

      // Group: Ordering, Durable Storage and Event Backbone
      { key: 'message_stream', x: 2398, y: 148, label: 'Message Stream', tech: 'Kafka Partitioned Stream', icon: 'logos:kafka-icon', kind: 'queue' },
      { key: 'receipt_stream', x: 2750, y: 148, label: 'Receipt & Presence Stream', tech: 'Independent Event Path', icon: 'logos:kafka-icon', kind: 'queue' },
      { key: 'message_store', x: 3102, y: 148, label: 'Durable Message Store', tech: 'Cassandra Time-Ordered Rows', icon: 'logos:cassandra', kind: 'db' },
      { key: 'conversation_store', x: 3454, y: 148, label: 'Conversation Store', tech: 'Roles & Sequence DB', icon: 'lucide:database', kind: 'db' },
      { key: 'dedup_store', x: 2574, y: 436, label: 'Message Dedup Store', tech: 'Short-TTL Message IDs', icon: 'lucide:database-zap', kind: 'db' },
      { key: 'pending_store', x: 2926, y: 436, label: 'Pending Delivery Store', tech: 'Per-Device Delivery Cursors', icon: 'lucide:database-clock', kind: 'db' },
      { key: 'search_index', x: 3278, y: 436, label: 'Encrypted Metadata Search', tech: 'Server-visible Search Index', icon: 'lucide:search', kind: 'db' },
      { key: 'retention_worker', x: 2750, y: 724, label: 'Retention & Deletion Workers', tech: 'Holds & TTL enforcement', icon: 'lucide:trash-2' },
      { key: 'change_data_capture', x: 3150, y: 724, label: 'CDC Replication Stream', tech: 'Cross-Region CDC Feed', icon: 'lucide:refresh-cw', kind: 'queue' },

      // Group: Media Delivery and Push Notifications
      { key: 'media_upload_service', x: 4248, y: -402, label: 'Media Upload Service', tech: 'Signed Multipart Sessions', icon: 'lucide:upload-cloud' },
      { key: 'encrypted_object_storage', x: 4600, y: -402, label: 'Encrypted Object Storage', tech: 'Client-Encrypted Media', icon: 'lucide:hard-drive', kind: 'db' },
      { key: 'media_processing', x: 4952, y: -402, label: 'Media Processing Service', tech: 'Format validation & metadata', icon: 'lucide:image' },
      { key: 'media_cdn', x: 4600, y: -130, label: 'Global Media CDN', tech: 'Short-Lived Signed URLs CDN', icon: 'lucide:cloud' },
      { key: 'push_service', x: 4248, y: 142, label: 'Push Notification Service', tech: 'Minimal Payload Trigger', icon: 'lucide:bell' },
      { key: 'mobile_push_providers', x: 4600, y: 142, label: 'APNs & FCM', tech: 'Platform Push Providers', icon: 'lucide:send' },

      // Group: Cross-Region Continuity and Failover
      { key: 'home_region_directory', x: 4248, y: 698, label: 'Global Region Directory', tech: 'User Region Affinity affinity', icon: 'lucide:map-pinned', kind: 'db' },
      { key: 'replication_pipeline', x: 4600, y: 698, label: 'Asynchronous Replication Pipeline', tech: 'Durable CDC pipeline', icon: 'lucide:refresh-ccw', kind: 'queue' },
      { key: 'secondary_message_store', x: 4952, y: 698, label: 'Secondary Region Store', tech: 'Warm DR Replica DB', icon: 'lucide:database-backup', kind: 'db' },
      { key: 'failover_controller', x: 5248, y: 698, label: 'Failover Controller', tech: 'Fencing & routing control', icon: 'lucide:life-buoy' },
      { key: 'replay_coordinator', x: 4600, y: 986, label: 'Recovery Coordinator', tech: 'Rebuild cursors & state', icon: 'lucide:rotate-cw' },
      { key: 'conflict_guard', x: 4952, y: 986, label: 'Writer Epoch Guard', tech: 'Single writer protection', icon: 'lucide:lock-keyhole' },

      // Group: Operations, Reliability and Governance
      { key: 'telemetry_collector', x: -2252, y: 698, label: 'OTel Collectors', tech: 'Metrics, logs & traces exporter', icon: 'logos:opentelemetry-icon' },
      { key: 'metrics_store', x: -1900, y: 698, label: 'SLO Metrics Store', tech: 'Prometheus-compatible store', icon: 'logos:prometheus' },
      { key: 'dashboards', x: -2252, y: 938, label: 'Grafana Dashboards', tech: 'SLO Latency visualization', icon: 'logos:grafana' },
      { key: 'alerting', x: -1900, y: 938, label: 'SLO Alerting Engine', tech: ' Burn rate alert notifications', icon: 'lucide:siren' },
      { key: 'audit_archive', x: -2252, y: 1178, label: 'Immutable Audit logs', tech: 'Security and admin logs archive', icon: 'lucide:scroll-text', kind: 'db' },
      { key: 'capacity_controller', x: -1900, y: 1178, label: 'Autoscale Controller', tech: 'Partition scale controls', icon: 'lucide:chart-no-axes-combined' }
    ],
    edges: [
      ['sender_device', 'global_dns', 'Resolve messaging endpoint'],
      ['recipient_device', 'global_dns', 'Resolve messaging endpoint'],
      ['web_client', 'global_dns', 'Resolve messaging endpoint'],
      ['global_dns', 'global_load_balancer', 'Route to nearest region'],
      ['global_load_balancer', 'websocket_gateway', 'Establish TLS connection'],
      ['global_load_balancer', 'api_gateway', 'Route HTTPS API traffic'],
      ['websocket_gateway', 'auth_service', 'Validate access token'],
      ['api_gateway', 'auth_service', 'Authorize API request'],
      ['auth_service', 'token_cache', 'Read auth state'],
      ['auth_service', 'device_registry', 'Verify device'],
      ['websocket_gateway', 'edge_rate_limiter', 'Enforce quotas'],
      ['edge_rate_limiter', 'chat_ingress', 'Forward message envelope'],
      ['websocket_gateway', 'session_registry', 'Register user session'],
      ['websocket_gateway', 'presence_service', 'Heartbeat events'],
      ['sender_device', 'key_directory', 'Fetch identity keys'],
      ['sender_device', 'websocket_gateway', 'Send encrypted message'],
      ['chat_ingress', 'abuse_detection', 'Evaluate abuse signals'],
      ['chat_ingress', 'idempotency_service', 'Validate message ID'],
      ['idempotency_service', 'dedup_store', 'Reserve dedup key'],
      ['chat_ingress', 'conversation_service', 'Verify membership fanout'],
      ['conversation_service', 'conversation_store', 'Read roles states'],
      ['chat_ingress', 'message_store', 'Persist message'],
      ['message_store', 'chat_ingress', 'Write ack'],
      ['chat_ingress', 'sender_device', 'Return status'],
      ['chat_ingress', 'message_stream', 'Publish ordered event'],
      ['message_stream', 'group_fanout_worker', 'Expand group recipients'],
      ['message_stream', 'delivery_router', 'Consume message events'],
      ['group_fanout_worker', 'delivery_router', 'Submit recipient delivery tasks'],
      ['delivery_router', 'session_registry', 'Resolve active sessions'],
      ['delivery_router', 'websocket_gateway', 'Route message to gateway'],
      ['websocket_gateway', 'recipient_device', 'Deliver message'],
      ['delivery_router', 'offline_delivery', 'No active session'],
      ['offline_delivery', 'pending_store', 'Record pending delivery'],
      ['offline_delivery', 'push_service', 'Request wake-up push'],
      ['push_service', 'mobile_push_providers', 'Send push request'],
      ['mobile_push_providers', 'recipient_device', 'Wake application'],
      ['recipient_device', 'websocket_gateway', 'Reconnect & send receipt'],
      ['websocket_gateway', 'receipt_service', 'Forward receipts'],
      ['receipt_service', 'receipt_stream', 'Publish receipt event'],
      ['receipt_service', 'message_store', 'Update state'],
      ['receipt_stream', 'delivery_router', 'Route receipt to sender'],
      ['api_gateway', 'history_service', 'Request history sync'],
      ['history_service', 'message_store', 'Read time-ordered messages'],
      ['history_service', 'pending_store', 'Read delivery cursor'],
      ['history_service', 'recipient_device', 'Return missed messages'],
      ['sender_device', 'api_gateway', 'Request signed media upload'],
      ['api_gateway', 'media_upload_service', 'Create upload session'],
      ['media_upload_service', 'sender_device', 'Return upload URLs'],
      ['sender_device', 'encrypted_object_storage', 'Upload encrypted media'],
      ['encrypted_object_storage', 'media_processing', 'Validate format'],
      ['encrypted_object_storage', 'media_cdn', 'Serve media origin'],
      ['media_cdn', 'recipient_device', 'Download encrypted media'],
      ['websocket_gateway', 'home_region_directory', 'Resolve home region'],
      ['message_store', 'change_data_capture', 'Emit message CDC'],
      ['change_data_capture', 'replication_pipeline', 'Replicate CDC feed'],
      ['replication_pipeline', 'secondary_message_store', 'Write DR Replica'],
      ['failover_controller', 'global_load_balancer', 'Shift traffic'],
      ['failover_controller', 'conflict_guard', 'Issue writer epoch'],
      ['conflict_guard', 'secondary_message_store', 'Permit recovery mode writes'],
      ['secondary_message_store', 'replay_coordinator', 'Provide cursors'],
      ['replay_coordinator', 'delivery_router', 'Resume pending delivery'],
      ['retention_worker', 'message_store', 'Apply holds policy'],
      ['retention_worker', 'encrypted_object_storage', 'Delete expired objects'],
      ['search_index', 'history_service', 'Resolve search filters'],
      ['websocket_gateway', 'telemetry_collector', 'Connection telemetry'],
      ['chat_ingress', 'telemetry_collector', 'Ingress trace metrics'],
      ['delivery_router', 'telemetry_collector', 'Router delay telemetry'],
      ['message_stream', 'telemetry_collector', 'Partition lag metrics'],
      ['telemetry_collector', 'metrics_store', 'Export SLO metrics'],
      ['metrics_store', 'dashboards', 'SLO dashboards'],
      ['metrics_store', 'alerting', 'Evaluate SLO alerts'],
      ['auth_service', 'audit_archive', 'Audit identities state'],
      ['key_directory', 'audit_archive', 'Audit keys rotation state'],
      ['capacity_controller', 'websocket_gateway', 'Scale gateway capacity'],
      ['capacity_controller', 'message_stream', 'Rebalance stream partitions']
    ]
  })
}

export const DIAGRAM_CATALOG: DiagramCatalogItem[] = [
  {
    id: 'aws-vod',
    title: 'AWS Video-on-Demand',
    subtitle: 'Route 53, CloudFront, S3 source, Lambda, MediaConvert, DynamoDB',
    description: 'Production-ready video ingestion and transcode pipeline running on AWS serverless services.',
    kind: 'architecture',
    icon: 'logos:aws',
    logos: ['logos:aws-route53', 'logos:aws-cloudfront', 'logos:aws-s3', 'logos:aws-lambda', 'logos:aws-dynamodb'],
    tags: ['AWS', 'Serverless', 'VOD', 'Transcode'],
    accent: 'orange',
    complexity: 'Senior',
    insert: insertAwsVod,
  },
  {
    id: 'global-realtime-messaging',
    title: 'Global Real-Time Messaging',
    subtitle: 'WebSockets, Kafka, Cassandra, Redis, OTel',
    description: 'A global, low-latency messaging infrastructure featuring WebSocket gateways, distributed session registry, scyllaDB durable message store, Anycast routing, and push services.',
    kind: 'architecture',
    icon: 'lucide:messages-square',
    logos: ['logos:kafka-icon', 'logos:cassandra', 'logos:redis', 'logos:opentelemetry-icon', 'logos:prometheus'],
    tags: ['Agnostic', 'WebSockets', 'Kafka', 'Cassandra', 'Redis'],
    accent: 'blue',
    complexity: 'Senior',
    insert: insertRealtimeMessaging,
  },
  {
    id: 'simple-notification-service',
    title: 'Simple Notification Service',
    subtitle: 'Shopify, RabbitMQ, PostgreSQL, Twilio, SendGrid',
    description: 'A beginner-friendly cloud notification service architecture capable of processing multi-channel notifications asynchronously.',
    kind: 'architecture',
    icon: 'lucide:bell-ring',
    logos: ['logos:shopify', 'logos:rabbitmq-icon', 'logos:postgresql', 'logos:twilio', 'logos:sendgrid-icon'],
    tags: ['Agnostic', 'Notifications', 'RabbitMQ', 'PostgreSQL', 'Twilio'],
    accent: 'blue',
    complexity: 'Starter',
    insert: insertSimpleNotification,
  },
  {
    id: 'image-upload-processing',
    title: 'Image Upload and Processing Pipeline',
    subtitle: 'S3, RabbitMQ, Rust, Sharp, Cloudflare, MongoDB',
    description: 'An intermediate media processing architecture displaying multi-worker validation, resizing, CDN delivery caching and metadata indexing.',
    kind: 'architecture',
    icon: 'lucide:upload-cloud',
    logos: ['logos:aws-s3', 'logos:rabbitmq-icon', 'logos:rust', 'logos:cloudflare', 'logos:mongodb-icon'],
    tags: ['Agnostic', 'Media', 'S3', 'RabbitMQ', 'Rust', 'MongoDB'],
    accent: 'orange',
    complexity: 'Team',
    insert: insertImageUpload,
  },
  {
    id: 'simple-url-shortener',
    title: 'Simple URL Shortener',
    subtitle: 'Cloudflare, NGINX, Kong, Redis, PostgreSQL, Kafka',
    description: 'A starter distributed systems architecture showing domain routing, rate limiting, distributed short ID generation, fast cache lookups and asynchronous analytics.',
    kind: 'architecture',
    icon: 'lucide:link',
    logos: ['logos:cloudflare', 'logos:nginx', 'logos:kong', 'logos:redis', 'logos:postgresql'],
    tags: ['Agnostic', 'Shortener', 'Redis', 'PostgreSQL', 'Kafka'],
    accent: 'purple',
    complexity: 'Starter',
    insert: insertSimpleUrlShortener,
  },
]

function insertSimpleNotification(editor: Editor) {
  insertBlueprint(editor, {
    history: 'insert Simple Notification Service',
    width: 2300,
    height: 1250,
    frames: [
      { label: 'Event Producers', x: 80, y: 170, w: 360, h: 760, accent: 'sky' },
      { label: 'Notification API', x: 530, y: 250, w: 360, h: 600, accent: 'amber' },
      { label: 'Processing', x: 980, y: 130, w: 430, h: 850, accent: 'violet' },
      { label: 'Delivery Providers', x: 1500, y: 110, w: 390, h: 900, accent: 'amber' },
      { label: 'Storage and Monitoring', x: 1980, y: 220, w: 270, h: 700, accent: 'grey' }
    ],
    nodes: [
      { key: 'order_service', x: 130, y: 280, w: 240, h: 110, label: 'Order Service', tech: 'Event Producer', icon: 'logos:shopify' },
      { key: 'account_service', x: 130, y: 500, w: 240, h: 110, label: 'Account Service', tech: 'Event Producer', icon: 'lucide:user-round-cog' },
      { key: 'admin_panel', x: 130, y: 720, w: 240, h: 110, label: 'Admin Panel', tech: 'Operator Dashboard', icon: 'lucide:panel-top' },
      { key: 'notification_api', x: 590, y: 360, w: 240, h: 120, label: 'Notification API', tech: 'Ingress Controller', icon: 'lucide:bell-ring' },
      { key: 'template_service', x: 590, y: 600, w: 240, h: 120, label: 'Template Service', tech: 'Handlebars Engine', icon: 'lucide:file-text' },
      { key: 'notification_queue', x: 1040, y: 250, w: 260, h: 120, label: 'Notification Queue', tech: 'AMQP Exchange Broker', icon: 'logos:rabbitmq-icon', kind: 'queue' },
      { key: 'notification_worker', x: 1040, y: 500, w: 260, h: 120, label: 'Notification Worker', tech: 'Node.js Consumer', icon: 'logos:nodejs-icon' },
      { key: 'retry_queue', x: 1040, y: 750, w: 260, h: 120, label: 'Retry Queue', tech: 'DLQ with Backoff', icon: 'logos:rabbitmq-icon', kind: 'queue' },
      { key: 'email_provider', x: 1560, y: 240, w: 250, h: 110, label: 'Email Provider', tech: 'SendGrid API Delivery', icon: 'logos:sendgrid-icon' },
      { key: 'sms_provider', x: 1560, y: 470, w: 250, h: 110, label: 'SMS Provider', tech: 'Twilio SMS API Gateway', icon: 'logos:twilio' },
      { key: 'push_provider', x: 1560, y: 700, w: 250, h: 110, label: 'Push Provider', tech: 'Firebase Cloud Messaging', icon: 'logos:firebase' },
      { key: 'notification_db', x: 2010, y: 330, w: 210, h: 120, label: 'Notification Database', tech: 'PostgreSQL Relational DB', icon: 'logos:postgresql', kind: 'db' },
      { key: 'delivery_log', x: 2010, y: 550, w: 210, h: 120, label: 'Delivery Log', tech: 'Elasticsearch Index', icon: 'logos:elasticsearch', kind: 'db' },
      { key: 'monitoring', x: 2010, y: 770, w: 210, h: 120, label: 'Monitoring', tech: 'Datadog Agent & Dashboards', icon: 'logos:datadog' }
    ],
    edges: [
      ['order_service', 'notification_api', 'Order confirmation event'],
      ['account_service', 'notification_api', 'Password reset event'],
      ['admin_panel', 'notification_api', 'Send campaign'],
      ['notification_api', 'template_service', 'Load message template'],
      ['template_service', 'notification_db', 'Read template and preferences'],
      ['notification_api', 'notification_queue', 'Publish notification job'],
      ['notification_queue', 'notification_worker', 'Consume job'],
      ['notification_worker', 'email_provider', 'Send email'],
      ['notification_worker', 'sms_provider', 'Send SMS'],
      ['notification_worker', 'push_provider', 'Send push notification'],
      ['email_provider', 'delivery_log', 'Delivery result'],
      ['sms_provider', 'delivery_log', 'Delivery result'],
      ['push_provider', 'delivery_log', 'Delivery result'],
      ['notification_worker', 'retry_queue', 'Temporary failure'],
      ['retry_queue', 'notification_worker', 'Retry with backoff'],
      ['notification_worker', 'notification_db', 'Update notification status'],
      ['delivery_log', 'monitoring', 'Metrics and failure counts']
    ]
  })
}

function insertImageUpload(editor: Editor) {
  insertBlueprint(editor, {
    history: 'insert Image Upload and Processing Pipeline',
    width: 2350,
    height: 1250,
    frames: [
      { label: 'Clients', x: 70, y: 220, w: 300, h: 650, accent: 'sky' },
      { label: 'API Layer', x: 460, y: 180, w: 380, h: 720, accent: 'amber' },
      { label: 'Upload and Ingest', x: 930, y: 120, w: 420, h: 850, accent: 'violet' },
      { label: 'Image Processing', x: 1440, y: 120, w: 420, h: 850, accent: 'amber' },
      { label: 'Delivery and Data', x: 1950, y: 160, w: 330, h: 800, accent: 'grey' }
    ],
    nodes: [
      { key: 'user', x: 115, y: 350, w: 220, h: 110, label: 'User', tech: 'Client Browser', icon: 'lucide:user' },
      { key: 'web_app', x: 115, y: 590, w: 220, h: 110, label: 'Web or Mobile App', tech: 'Frontend Interface', icon: 'lucide:monitor-smartphone' },
      { key: 'api_gateway', x: 520, y: 300, w: 250, h: 120, label: 'API Gateway', tech: 'AWS API Gateway', icon: 'logos:aws-api-gateway' },
      { key: 'upload_service', x: 520, y: 550, w: 250, h: 120, label: 'Upload Service', tech: 'Node.js Endpoint', icon: 'logos:nodejs-icon' },
      { key: 'metadata_service', x: 520, y: 780, w: 250, h: 120, label: 'Metadata Service', tech: 'Python Endpoint', icon: 'logos:python' },
      { key: 'source_storage', x: 990, y: 240, w: 260, h: 120, label: 'Source Image Storage', tech: 'AWS S3 Ingest', icon: 'logos:aws-s3', kind: 'db' },
      { key: 'upload_events', x: 990, y: 500, w: 260, h: 120, label: 'Upload Event Queue', tech: 'RabbitMQ Event Queue', icon: 'logos:rabbitmq-icon', kind: 'queue' },
      { key: 'validation_worker', x: 990, y: 760, w: 260, h: 120, label: 'Validation Worker', tech: 'Rust Checker', icon: 'logos:rust' },
      { key: 'resize_worker', x: 1500, y: 240, w: 260, h: 120, label: 'Resize Worker', tech: 'Sharp Image Node.js', icon: 'logos:nodejs-icon' },
      { key: 'optimization_worker', x: 1500, y: 500, w: 260, h: 120, label: 'Optimization Worker', tech: 'Go Optimizer', icon: 'logos:go' },
      { key: 'processed_storage', x: 1500, y: 760, w: 260, h: 120, label: 'Processed Image Storage', tech: 'AWS S3 Output', icon: 'logos:aws-s3', kind: 'db' },
      { key: 'cdn', x: 2000, y: 280, w: 230, h: 120, label: 'Image CDN', tech: 'Cloudflare Edge CDN', icon: 'logos:cloudflare' },
      { key: 'metadata_db', x: 2000, y: 540, w: 230, h: 120, label: 'Metadata Database', tech: 'MongoDB Atlas NoSQL', icon: 'logos:mongodb-icon', kind: 'db' },
      { key: 'monitoring', x: 2000, y: 800, w: 230, h: 120, label: 'Monitoring', tech: 'Datadog metrics dashboards', icon: 'logos:datadog' }
    ],
    edges: [
      ['user', 'web_app', 'Select image'],
      ['web_app', 'api_gateway', 'Request upload session'],
      ['api_gateway', 'upload_service', 'Create upload URL'],
      ['upload_service', 'web_app', 'Return signed upload URL'],
      ['web_app', 'source_storage', 'Upload original image'],
      ['source_storage', 'upload_events', 'Object-created event'],
      ['upload_events', 'validation_worker', 'Validate image'],
      ['validation_worker', 'resize_worker', 'Valid image'],
      ['validation_worker', 'monitoring', 'Invalid image alert'],
      ['resize_worker', 'optimization_worker', 'Create size variants'],
      ['optimization_worker', 'processed_storage', 'Write WebP and thumbnails'],
      ['processed_storage', 'cdn', 'Serve cached images'],
      ['metadata_service', 'metadata_db', 'Store image metadata'],
      ['optimization_worker', 'metadata_service', 'Publish processing result'],
      ['web_app', 'cdn', 'Request image'],
      ['cdn', 'web_app', 'Deliver optimized image'],
      ['resize_worker', 'monitoring', 'Processing metrics'],
      ['optimization_worker', 'monitoring', 'Optimization metrics']
    ]
  })
}

function insertSimpleUrlShortener(editor: Editor) {
  insertBlueprint(editor, {
    history: 'insert Simple URL Shortener',
    width: 2200,
    height: 1200,
    frames: [
      { label: 'Clients', x: 80, y: 180, w: 300, h: 680, accent: 'sky' },
      { label: 'Edge Layer', x: 470, y: 180, w: 360, h: 680, accent: 'amber' },
      { label: 'Application Services', x: 920, y: 120, w: 430, h: 820, accent: 'violet' },
      { label: 'Data Layer', x: 1460, y: 120, w: 420, h: 820, accent: 'amber' },
      { label: 'Analytics', x: 1940, y: 360, w: 240, h: 420, accent: 'grey' }
    ],
    nodes: [
      { key: 'user', x: 120, y: 280, w: 220, h: 110, label: 'User', tech: 'Client Browser', icon: 'lucide:user' },
      { key: 'browser', x: 120, y: 500, w: 220, h: 110, label: 'Web or Mobile App', tech: 'Frontend App', icon: 'lucide:monitor-smartphone' },
      { key: 'dns', x: 520, y: 260, w: 220, h: 110, label: 'DNS', tech: 'Cloudflare DNS', icon: 'logos:cloudflare' },
      { key: 'load_balancer', x: 520, y: 480, w: 220, h: 110, label: 'Load Balancer', tech: 'NGINX proxy', icon: 'logos:nginx' },
      { key: 'api_gateway', x: 520, y: 700, w: 220, h: 110, label: 'API Gateway', tech: 'Kong Gateway', icon: 'logos:kong' },
      { key: 'shortener_service', x: 980, y: 250, w: 260, h: 120, label: 'Shortener Service', tech: 'Node.js service', icon: 'logos:nodejs-icon' },
      { key: 'redirect_service', x: 980, y: 500, w: 260, h: 120, label: 'Redirect Service', tech: 'Go redirect engine', icon: 'logos:go' },
      { key: 'id_generator', x: 980, y: 750, w: 260, h: 120, label: 'ID Generator', tech: 'Rust ID Factory', icon: 'logos:rust' },
      { key: 'cache', x: 1520, y: 250, w: 250, h: 120, label: 'Redis Cache', tech: 'Redis Memory Store', icon: 'logos:redis', kind: 'db' },
      { key: 'url_database', x: 1520, y: 500, w: 250, h: 120, label: 'URL Database', tech: 'PostgreSQL Relational DB', icon: 'logos:postgresql', kind: 'db' },
      { key: 'event_queue', x: 1520, y: 750, w: 250, h: 120, label: 'Click Event Queue', tech: 'Apache Kafka Event Buffer', icon: 'logos:kafka-icon', kind: 'queue' },
      { key: 'analytics_worker', x: 1950, y: 470, w: 210, h: 120, label: 'Analytics Worker', tech: 'Python Stream Reader', icon: 'logos:python' },
      { key: 'analytics_db', x: 1950, y: 650, w: 210, h: 120, label: 'Analytics Store', tech: 'ClickHouse Column DB', icon: 'logos:clickhouse', kind: 'db' }
    ],
    edges: [
      ['user', 'browser', 'Enter long URL or open short URL'],
      ['browser', 'dns', 'Resolve domain'],
      ['dns', 'load_balancer', 'Route request'],
      ['load_balancer', 'api_gateway', 'Forward request'],
      ['api_gateway', 'shortener_service', 'Create short URL'],
      ['shortener_service', 'id_generator', 'Generate short code'],
      ['shortener_service', 'url_database', 'Store URL mapping'],
      ['shortener_service', 'cache', 'Warm cache'],
      ['api_gateway', 'redirect_service', 'Resolve short URL'],
      ['redirect_service', 'cache', 'Read cached URL'],
      ['cache', 'url_database', 'Cache miss'],
      ['redirect_service', 'browser', 'HTTP 301 or 302 redirect'],
      ['redirect_service', 'event_queue', 'Publish click event'],
      ['event_queue', 'analytics_worker', 'Consume events'],
      ['analytics_worker', 'analytics_db', 'Store aggregated metrics']
    ]
  })
}

