export type DiagramKind =
  | 'architecture'
  | 'erd'
  | 'flowchart'
  | 'sequence'
  | 'bpmn'
  | 'security'
  | 'state-machine'
  | 'data-flow'
  | 'network'
  | 'uml-class'
  | 'uml-component'
  | 'uml-deployment';

export interface Point { x: number; y: number; }
export interface Size { w: number; h: number; }

export interface DiagramNode {
  id: string;
  semanticType: string;
  label: string;
  description?: string;
  technology?: string;
  icon?: string;
  parentGroupId?: string;
  position: Point;
  size: Size;
  detailLevel: 1 | 2 | 3 | 4;
  properties: Record<string, any>;
}

export interface DiagramEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  direction: 'forward' | 'reverse' | 'bidirectional';
  protocol?: string;
  communication?: 'sync' | 'async' | 'stream';
  label?: string;
  payload?: string;
  detailLevel: 1 | 2 | 3 | 4;
  failureBehavior?: string;
}

export interface DiagramGroup {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  accent?: 'blue' | 'green' | 'orange' | 'purple' | 'slate' | 'red' | 'cyan' | 'grey';
}

export interface ScenarioStep {
  stepIndex: number;
  focusNodeIds?: string[];
  highlightNodeIds?: string[];
  pulseEdgeIds?: string[];
  dimUnrelated?: boolean;
  notes: string;
  metricOverrides?: Record<string, { cpu?: number; latency?: number; errorRate?: number; load?: number }>;
}

export interface DiagramScenario {
  id: string;
  name: string;
  description: string;
  steps: ScenarioStep[];
}

export interface DiagramAnimation {
  defaultMode: 'none' | 'flow' | 'guided' | 'scenario' | 'simulation';
  flowPaths?: {
    edgeId: string;
    particleCount?: number;
    color?: string;
    speed?: number;
  }[];
}

export interface NexusGraphIR {
  version: string;
  id: string;
  kind: DiagramKind;
  title: string;
  description: string;
  metadata: {
    complexity: 'Starter' | 'Team' | 'Senior' | 'Production';
    provider?: 'aws' | 'azure' | 'gcp' | 'agnostic';
    technologies: string[];
    tags: string[];
    detailLevels: string[];
  };
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups: DiagramGroup[];
  scenarios: DiagramScenario[];
  animation?: DiagramAnimation;
  theme?: {
    mode: 'light' | 'obsidian' | 'custom';
    primaryColor?: string;
  };
}

export const SEED_TEMPLATES: NexusGraphIR[] = [
  {
    version: '1.0.0',
    id: 'aws-vod-pipeline',
    kind: 'architecture',
    title: 'AWS Serverless Video-on-Demand Ingestion',
    description: 'A production-grade ingestion and media processing pipeline on AWS using Route 53, CloudFront, S3 upload, API Gateway, Lambda, MediaConvert and DynamoDB.',
    metadata: {
      complexity: 'Production',
      provider: 'aws',
      technologies: ['Route53', 'CloudFront', 'S3', 'Lambda', 'MediaConvert', 'DynamoDB'],
      tags: ['video-on-demand', 'media-processing', 'cloudfront', 'mediaconvert', 'analytics'],
      detailLevels: ['Executive', 'Engineering', 'Production']
    },
    nodes: [
      // Group: Users and Client Applications
      { id: 'content_admin', semanticType: 'external', label: 'Content Admin / Studio', technology: 'Operator Interface', icon: 'lucide:clapperboard', position: { x: -1632, y: 46 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'viewers', semanticType: 'external', label: 'Web, Mobile and Smart TV Viewers', technology: 'Audience Clients', icon: 'lucide:monitor-smartphone', position: { x: -1632, y: -146 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'video_player', semanticType: 'external', label: 'Adaptive Bitrate Video Player', technology: 'HLS Player Framework', icon: 'lucide:circle-play', position: { x: -1632, y: -338 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },

      // Group: AWS Edge and Access Layer
      { id: 'route53', semanticType: 'service', label: 'Amazon Route 53', technology: 'DNS Routing', icon: 'logos:aws-route53', position: { x: -617, y: -127 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'waf_shield', semanticType: 'service', label: 'AWS WAF + Shield', technology: 'DDoS Protection', icon: 'logos:aws-waf', position: { x: -169, y: -144 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'cloudfront', semanticType: 'service', label: 'Amazon CloudFront CDN', technology: 'Global Edge Cache', icon: 'logos:aws-cloudfront', position: { x: 247, y: -201 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'cognito', semanticType: 'service', label: 'Amazon Cognito', technology: 'User Identity Pool', icon: 'logos:aws-cognito', position: { x: -617, y: 65 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'api_gateway', semanticType: 'service', label: 'Amazon API Gateway', technology: 'REST Edge Controller', icon: 'logos:aws-api-gateway', position: { x: -169, y: 169 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },

      // Group: Application and Control Plane
      { id: 'upload_service', semanticType: 'service', label: 'Lambda Upload Service', technology: 'Presigned Multipart URLs', icon: 'logos:aws-lambda', position: { x: 1952, y: 540 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'playback_authorization', semanticType: 'service', label: 'Lambda Playback Auth', technology: 'Signed URL / Cookie', icon: 'logos:aws-lambda', position: { x: 1536, y: 230 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'catalog_api', semanticType: 'service', label: 'Lambda Catalog API', technology: 'Video Catalog Query', icon: 'logos:aws-lambda', position: { x: 1536, y: 38 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'video_metadata', semanticType: 'db', label: 'Amazon DynamoDB', technology: 'Metadata & State Store', icon: 'logos:aws-dynamodb', position: { x: 1952, y: 348 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'secrets_manager', semanticType: 'db', label: 'AWS Secrets Manager', technology: 'Encrypted App Config', icon: 'logos:aws-secrets-manager', position: { x: 1536, y: 589 }, size: { w: 224, h: 128 }, detailLevel: 3, properties: {} },

      // Group: Secure Media Ingest
      { id: 'source_bucket', semanticType: 'db', label: 'Amazon S3 Ingest', technology: 'Original Masters', icon: 'logos:aws-s3', position: { x: -768, y: 1171 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'eventbridge', semanticType: 'service', label: 'Amazon EventBridge', technology: 'Object Created Event', icon: 'logos:aws-eventbridge', position: { x: -384, y: 1103 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'processing_workflow', semanticType: 'service', label: 'AWS Step Functions', technology: 'VOD Orchestrator', icon: 'logos:aws-step-functions', position: { x: 64, y: 1176 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'media_validation', semanticType: 'service', label: 'AWS Lambda Validation', technology: 'FFprobe metadata probe', icon: 'logos:aws-lambda', position: { x: 480, y: 1227 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'processing_dlq', semanticType: 'queue', label: 'Amazon SQS DLQ', technology: 'Dead-Letter Queue', icon: 'logos:aws-sqs', position: { x: 864, y: 1179 }, size: { w: 224, h: 128 }, detailLevel: 3, properties: {} },

      // Group: Media Processing Pipeline
      { id: 'media_convert', semanticType: 'service', label: 'AWS Elemental MediaConvert', technology: 'QVBR + ABR Transcoder', icon: 'logos:aws-lambda', position: { x: 2944, y: 1329 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'renditions', semanticType: 'service', label: 'HLS, DASH and MP4 Renditions', technology: 'ABR Playback Profiles', icon: 'lucide:layers-3', position: { x: 3328, y: 1137 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'media_assets', semanticType: 'service', label: 'Thumbnails & Posters', technology: 'Preview clip generators', icon: 'lucide:images', position: { x: 3328, y: 1329 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'distribution_bucket', semanticType: 'db', label: 'Amazon S3 Distribution', technology: 'Versioned assets CDN origin', icon: 'logos:aws-s3', position: { x: 3744, y: 1073 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'kms', semanticType: 'db', label: 'AWS KMS Keys', technology: 'AES-256 Envelope Keys', icon: 'logos:aws-kms', position: { x: 3328, y: 944 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },

      // Group: Global Playback and Product Experience
      { id: 'origin_access_control', semanticType: 'service', label: 'OAC Config', technology: 'CloudFront Origin Access Control', icon: 'logos:aws-cloudfront', position: { x: 1888, y: -284 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'origin_shield', semanticType: 'service', label: 'Origin Shield CDN', technology: 'CloudFront Edge Cache Shield', icon: 'logos:aws-cloudfront', position: { x: 1536, y: -284 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'playback_events', semanticType: 'service', label: 'Playback Events API', technology: 'Event Ingest Endpoint', icon: 'lucide:activity', position: { x: 1536, y: -476 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'data_firehose', semanticType: 'queue', label: 'Amazon Data Firehose', technology: 'Real-time log buffer', icon: 'logos:aws-kinesis', position: { x: 1888, y: -476 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'analytics_lake', semanticType: 'db', label: 'Amazon S3 Analytics', technology: 'Analytics Parquet Lake', icon: 'logos:aws-s3', position: { x: 2240, y: -476 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },

      // Group: Operations, Reliability and Governance
      { id: 'cloudwatch', semanticType: 'service', label: 'Amazon CloudWatch', technology: 'Metrics, Logs & Alarms', icon: 'logos:aws-cloudwatch', position: { x: -2048, y: 1428 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'sns', semanticType: 'service', label: 'Amazon SNS', technology: 'Notifications & Alerts', icon: 'logos:aws-sns', position: { x: -1632, y: 1253 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'xray', semanticType: 'service', label: 'AWS X-Ray', technology: 'Request Tracing', icon: 'logos:aws-xray', position: { x: -2048, y: 786 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'cloudtrail', semanticType: 'service', label: 'AWS CloudTrail', technology: 'Governance Audits', icon: 'logos:aws-cloudtrail', position: { x: -2048, y: 979 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'iam', semanticType: 'service', label: 'AWS IAM Permissions', technology: 'Least Privilege Roles', icon: 'logos:aws-iam', position: { x: -2048, y: 1171 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} }
    ],
    edges: [
      { id: 'e01', sourceNodeId: 'content_admin', targetNodeId: 'cognito', direction: 'forward', label: 'Sign in', detailLevel: 2 },
      { id: 'e02', sourceNodeId: 'content_admin', targetNodeId: 'api_gateway', direction: 'forward', label: 'Request upload session', detailLevel: 1 },
      { id: 'e03', sourceNodeId: 'cognito', targetNodeId: 'api_gateway', direction: 'forward', label: 'JWT tokens', detailLevel: 2 },
      { id: 'e04', sourceNodeId: 'api_gateway', targetNodeId: 'upload_service', direction: 'forward', label: 'Create presigned multipart upload', detailLevel: 2 },
      { id: 'e05', sourceNodeId: 'upload_service', targetNodeId: 'content_admin', direction: 'forward', label: 'Return upload URLs', detailLevel: 2 },
      { id: 'e06', sourceNodeId: 'content_admin', targetNodeId: 'source_bucket', direction: 'forward', label: 'Upload large source file directly', detailLevel: 1 },
      { id: 'e07', sourceNodeId: 'source_bucket', targetNodeId: 'eventbridge', direction: 'forward', label: 'Object-created event', detailLevel: 2 },
      { id: 'e08', sourceNodeId: 'eventbridge', targetNodeId: 'processing_workflow', direction: 'forward', label: 'Start processing execution', detailLevel: 2 },
      { id: 'e09', sourceNodeId: 'eventbridge', targetNodeId: 'processing_workflow', direction: 'forward', label: 'Resume workflow', detailLevel: 2 },
      { id: 'e10', sourceNodeId: 'processing_workflow', targetNodeId: 'media_validation', direction: 'forward', label: 'Validate file and metadata', detailLevel: 2 },
      { id: 'e11', sourceNodeId: 'media_validation', targetNodeId: 'processing_dlq', direction: 'forward', label: 'Invalid media', detailLevel: 3 },
      { id: 'e12', sourceNodeId: 'media_validation', targetNodeId: 'media_convert', direction: 'forward', label: 'Valid media', detailLevel: 2 },
      { id: 'e13', sourceNodeId: 'processing_workflow', targetNodeId: 'media_convert', direction: 'forward', label: 'Submit and monitor job', detailLevel: 2 },
      { id: 'e14', sourceNodeId: 'media_convert', targetNodeId: 'eventbridge', direction: 'forward', label: 'Job status', detailLevel: 2 },
      { id: 'e15', sourceNodeId: 'processing_workflow', targetNodeId: 'video_metadata', direction: 'forward', label: 'Update processing state', detailLevel: 2 },
      { id: 'e16', sourceNodeId: 'processing_workflow', targetNodeId: 'sns', direction: 'forward', label: 'Publish completion or failure', detailLevel: 2 },
      { id: 'e17', sourceNodeId: 'viewers', targetNodeId: 'route53', direction: 'forward', label: 'Open application', detailLevel: 1 },
      { id: 'e18', sourceNodeId: 'route53', targetNodeId: 'waf_shield', direction: 'forward', label: 'Resolve domains', detailLevel: 2 },
      { id: 'e19', sourceNodeId: 'waf_shield', targetNodeId: 'cloudfront', direction: 'forward', label: 'Protected request', detailLevel: 2 },
      { id: 'e20', sourceNodeId: 'viewers', targetNodeId: 'cognito', direction: 'forward', label: 'Authenticate', detailLevel: 2 },
      { id: 'e21', sourceNodeId: 'video_player', targetNodeId: 'api_gateway', direction: 'forward', label: 'Request playback entitlement', detailLevel: 1 },
      { id: 'e22', sourceNodeId: 'api_gateway', targetNodeId: 'playback_authorization', direction: 'forward', label: 'Authorize title', detailLevel: 2 },
      { id: 'e23', sourceNodeId: 'playback_authorization', targetNodeId: 'video_metadata', direction: 'forward', label: 'Read entitlement', detailLevel: 2 },
      { id: 'e24', sourceNodeId: 'playback_authorization', targetNodeId: 'video_player', direction: 'forward', label: 'Return signed access', detailLevel: 2 },
      { id: 'e25', sourceNodeId: 'video_player', targetNodeId: 'cloudfront', direction: 'forward', label: 'Request manifest and segments', detailLevel: 1 },
      { id: 'e26', sourceNodeId: 'cloudfront', targetNodeId: 'origin_shield', direction: 'forward', label: 'Cache miss', detailLevel: 2 },
      { id: 'e27', sourceNodeId: 'origin_shield', targetNodeId: 'origin_access_control', direction: 'forward', label: 'Private origin request', detailLevel: 2 },
      { id: 'e28', sourceNodeId: 'origin_access_control', targetNodeId: 'distribution_bucket', direction: 'forward', label: 'Fetch assets', detailLevel: 2 },
      { id: 'e29', sourceNodeId: 'cloudfront', targetNodeId: 'video_player', direction: 'forward', label: 'Adaptive bitrate stream', detailLevel: 1 },
      { id: 'e30', sourceNodeId: 'api_gateway', targetNodeId: 'catalog_api', direction: 'forward', label: 'Browse and search catalog', detailLevel: 2 },
      { id: 'e31', sourceNodeId: 'catalog_api', targetNodeId: 'video_metadata', direction: 'forward', label: 'Read video catalog', detailLevel: 2 },
      { id: 'e32', sourceNodeId: 'video_player', targetNodeId: 'playback_events', direction: 'forward', label: 'QoE events', detailLevel: 2 },
      { id: 'e33', sourceNodeId: 'playback_events', targetNodeId: 'data_firehose', direction: 'forward', label: 'Stream events', detailLevel: 2 },
      { id: 'e34', sourceNodeId: 'data_firehose', targetNodeId: 'analytics_lake', direction: 'forward', label: 'Store analytics', detailLevel: 2 },
      { id: 'e35', sourceNodeId: 'kms', targetNodeId: 'source_bucket', direction: 'forward', label: 'Encrypt source', detailLevel: 2 },
      { id: 'e36', sourceNodeId: 'kms', targetNodeId: 'distribution_bucket', direction: 'forward', label: 'Encrypt output', detailLevel: 2 },
      { id: 'e37', sourceNodeId: 'secrets_manager', targetNodeId: 'upload_service', direction: 'forward', label: 'App secrets', detailLevel: 3 },
      { id: 'e38', sourceNodeId: 'iam', targetNodeId: 'source_bucket', direction: 'forward', label: 'Service permissions', detailLevel: 2 },
      { id: 'e39', sourceNodeId: 'iam', targetNodeId: 'media_convert', direction: 'forward', label: 'Service permissions', detailLevel: 2 },
      { id: 'e40', sourceNodeId: 'iam', targetNodeId: 'processing_workflow', direction: 'forward', label: 'Service permissions', detailLevel: 2 },
      { id: 'e41', sourceNodeId: 'cloudtrail', targetNodeId: 'api_gateway', direction: 'forward', label: 'Audit control-plane activity', detailLevel: 2 },
      { id: 'e42', sourceNodeId: 'cloudtrail', targetNodeId: 'source_bucket', direction: 'forward', label: 'Audit bucket activity', detailLevel: 2 },
      { id: 'e43', sourceNodeId: 'cloudwatch', targetNodeId: 'processing_workflow', direction: 'forward', label: 'Workflow telemetry', detailLevel: 2 },
      { id: 'e44', sourceNodeId: 'cloudwatch', targetNodeId: 'media_convert', direction: 'forward', label: 'Transcoding metrics and logs', detailLevel: 2 },
      { id: 'e45', sourceNodeId: 'cloudwatch', targetNodeId: 'api_gateway', direction: 'forward', label: 'API alarms', detailLevel: 2 },
      { id: 'e46', sourceNodeId: 'xray', targetNodeId: 'api_gateway', direction: 'forward', label: 'Trace APIs', detailLevel: 2 },
      { id: 'e47', sourceNodeId: 'processing_dlq', targetNodeId: 'cloudwatch', direction: 'forward', label: 'Alarm on failure', detailLevel: 2 },
      { id: 'e48', sourceNodeId: 'cloudwatch', targetNodeId: 'sns', direction: 'forward', label: 'Alert ops team', detailLevel: 2 },
      { id: 'e49', sourceNodeId: 'media_convert', targetNodeId: 'renditions', direction: 'forward', label: 'Generate ABR renditions', detailLevel: 2 },
      { id: 'e50', sourceNodeId: 'media_convert', targetNodeId: 'media_assets', direction: 'forward', label: 'Generate supporting assets', detailLevel: 2 },
      { id: 'e51', sourceNodeId: 'renditions', targetNodeId: 'distribution_bucket', direction: 'forward', label: 'Write packaged media', detailLevel: 2 },
      { id: 'e52', sourceNodeId: 'media_assets', targetNodeId: 'distribution_bucket', direction: 'forward', label: 'Write images and captions', detailLevel: 2 }
    ],
    groups: [
      { id: 'users', label: 'Users and Client Applications', x: -1680, y: -386, w: 320, h: 608, accent: 'blue' },
      { id: 'edge_access', label: 'AWS Edge and Access Layer', x: -665, y: -249, w: 1184, h: 622, accent: 'orange' },
      { id: 'control_plane', label: 'Application and Control Plane', x: 1488, y: -10, w: 736, h: 808, accent: 'purple' },
      { id: 'media_ingest', label: 'Secure Media Ingest', x: -912, y: 1055, w: 2048, h: 389, accent: 'blue' },
      { id: 'processing', label: 'Media Processing Pipeline', x: 2800, y: 896, w: 1216, h: 642, accent: 'orange' },
      { id: 'delivery', label: 'Global Playback and Product Experience', x: 1488, y: -524, w: 1024, h: 416, accent: 'green' },
      { id: 'operations', label: 'Operations, Reliability and Governance', x: -2096, y: 738, w: 736, h: 866, accent: 'slate' }
    ],
    scenarios: []
  },
  {
    version: '1.0.0',
    id: 'global-realtime-messaging',
    kind: 'architecture',
    title: 'Global Real-Time Messaging Platform',
    description: 'A global, low-latency messaging infrastructure featuring WebSocket gateways, distributed session registry, scyllaDB durable message store, Anycast routing, and push services.',
    metadata: {
      complexity: 'Production',
      provider: 'agnostic',
      technologies: ['WebSockets', 'Kafka', 'Cassandra', 'Redis', 'OTel'],
      tags: ['real-time-chat', 'websocket', 'kafka', 'cassandra', 'presence', 'multi-region'],
      detailLevels: ['Executive', 'Engineering', 'Production']
    },
    nodes: [
      // Group: Client Applications
      { id: 'sender_device', semanticType: 'external', label: 'Sender Mobile Device', technology: 'End-to-End Encryption Client', icon: 'lucide:smartphone', position: { x: -1702, y: -402 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'recipient_device', semanticType: 'external', label: 'Recipient Mobile Device', technology: 'Online or Offline Recipient', icon: 'lucide:smartphone', position: { x: -1702, y: -210 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'web_client', semanticType: 'external', label: 'Web and Desktop Client', technology: 'Linked Device Session', icon: 'lucide:monitor', position: { x: -1702, y: -18 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },

      // Group: Global Edge and Connection Layer
      { id: 'global_dns', semanticType: 'service', label: 'Anycast DNS', technology: 'Latency-Based Routing', icon: 'lucide:globe', position: { x: -802, y: -402 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'global_load_balancer', semanticType: 'service', label: 'Global Load Balancer', technology: 'Health-Aware Routing', icon: 'lucide:network', position: { x: -450, y: -402 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'websocket_gateway', semanticType: 'service', label: 'WebSocket Gateway Fleet', technology: 'Long-Lived TLS Connections', icon: 'lucide:radio', position: { x: -50, y: -402 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'api_gateway', semanticType: 'service', label: 'HTTPS API Gateway', technology: 'Uploads & Device APIs', icon: 'logos:aws-api-gateway', position: { x: -450, y: -130 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'edge_rate_limiter', semanticType: 'service', label: 'Distributed Rate Limiter', technology: 'Per User & IP Quotas', icon: 'lucide:gauge', position: { x: -50, y: -130 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },

      // Group: Identity, Device Trust and Key Management
      { id: 'auth_service', semanticType: 'service', label: 'Authentication Service', technology: 'Access & Refresh Tokens', icon: 'lucide:shield-check', position: { x: 648, y: -552 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'device_registry', semanticType: 'db', label: 'Device Registry', technology: 'Trusted session states', icon: 'lucide:smartphone', position: { x: 1000, y: -552 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'key_directory', semanticType: 'service', label: 'Public Key Directory', technology: 'Signed Prekeys Directory', icon: 'lucide:key-round', position: { x: 1352, y: -552 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'abuse_detection', semanticType: 'service', label: 'Abuse & Spam Detection', technology: 'Behavior Metadata Signals', icon: 'lucide:shield-alert', position: { x: 824, y: -312 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'token_cache', semanticType: 'db', label: 'Session Cache', technology: 'Redis Authorization Cache', icon: 'logos:redis', position: { x: 1176, y: -312 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },

      // Group: Regional Messaging Control Plane
      { id: 'chat_ingress', semanticType: 'service', label: 'Chat Ingress Service', technology: 'Validate Envelope Membership', icon: 'lucide:messages-square', position: { x: 648, y: 198 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'idempotency_service', semanticType: 'service', label: 'Idempotency Service', technology: 'Client Message Dedup', icon: 'lucide:copy-check', position: { x: 1000, y: 198 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'conversation_service', semanticType: 'service', label: 'Conversation Service', technology: 'Membership Fanout Policy', icon: 'lucide:users', position: { x: 1352, y: 198 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'presence_service', semanticType: 'service', label: 'Presence Service', technology: 'Online Typing & State', icon: 'lucide:activity', position: { x: 1648, y: 198 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'delivery_router', semanticType: 'service', label: 'Message Delivery Router', technology: 'Online Fanout Router', icon: 'lucide:route', position: { x: 824, y: 486 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'receipt_service', semanticType: 'service', label: 'Delivery Receipt Service', technology: 'Sent, Delivered & Read logs', icon: 'lucide:check-check', position: { x: 1176, y: 486 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'history_service', semanticType: 'service', label: 'Message History Service', technology: 'Cursor Reconnect Sync', icon: 'lucide:history', position: { x: 1528, y: 486 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'session_registry', semanticType: 'db', label: 'Active Session Registry', technology: 'User-Gateway session map', icon: 'logos:redis', position: { x: 824, y: 774 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'offline_delivery', semanticType: 'service', label: 'Offline Delivery Coordinator', technology: 'Push triggers dispatcher', icon: 'lucide:inbox', position: { x: 1176, y: 774 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'group_fanout_worker', semanticType: 'service', label: 'Group Fanout Workers', technology: 'Asynchronous group fanout', icon: 'lucide:git-fork', position: { x: 1528, y: 774 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },

      // Group: Ordering, Durable Storage and Event Backbone
      { id: 'message_stream', semanticType: 'queue', label: 'Message Stream', technology: 'Kafka Partitioned Stream', icon: 'logos:kafka-icon', position: { x: 2398, y: 148 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'receipt_stream', semanticType: 'queue', label: 'Receipt & Presence Stream', technology: 'Independent Event Path', icon: 'logos:kafka-icon', position: { x: 2750, y: 148 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'message_store', semanticType: 'db', label: 'Durable Message Store', technology: 'Cassandra Time-Ordered Rows', icon: 'logos:cassandra', position: { x: 3102, y: 148 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'conversation_store', semanticType: 'db', label: 'Conversation Store', technology: 'Roles & Sequence DB', icon: 'lucide:database', position: { x: 3454, y: 148 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'dedup_store', semanticType: 'db', label: 'Message Dedup Store', technology: 'Short-TTL Message IDs', icon: 'lucide:database-zap', position: { x: 2574, y: 436 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'pending_store', semanticType: 'db', label: 'Pending Delivery Store', technology: 'Per-Device Delivery Cursors', icon: 'lucide:database-clock', position: { x: 2926, y: 436 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'search_index', semanticType: 'db', label: 'Encrypted Metadata Search', technology: 'Server-visible Search Index', icon: 'lucide:search', position: { x: 3278, y: 436 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'retention_worker', semanticType: 'service', label: 'Retention & Deletion Workers', technology: 'Holds & TTL enforcement', icon: 'lucide:trash-2', position: { x: 2750, y: 724 }, size: { w: 224, h: 128 }, detailLevel: 3, properties: {} },
      { id: 'change_data_capture', semanticType: 'queue', label: 'CDC Replication Stream', technology: 'Cross-Region CDC Feed', icon: 'lucide:refresh-cw', position: { x: 3150, y: 724 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },

      // Group: Media Delivery and Push Notifications
      { id: 'media_upload_service', semanticType: 'service', label: 'Media Upload Service', technology: 'Signed Multipart Sessions', icon: 'lucide:upload-cloud', position: { x: 4248, y: -402 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'encrypted_object_storage', semanticType: 'db', label: 'Encrypted Object Storage', technology: 'Client-Encrypted Media', icon: 'lucide:hard-drive', position: { x: 4600, y: -402 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'media_processing', semanticType: 'service', label: 'Media Processing Service', technology: 'Format validation & metadata', icon: 'lucide:image', position: { x: 4952, y: -402 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'media_cdn', semanticType: 'service', label: 'Global Media CDN', technology: 'Short-Lived Signed URLs CDN', icon: 'lucide:cloud', position: { x: 4600, y: -130 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'push_service', semanticType: 'service', label: 'Push Notification Service', technology: 'Minimal Payload Trigger', icon: 'lucide:bell', position: { x: 4248, y: 142 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'mobile_push_providers', semanticType: 'external', label: 'APNs & FCM', technology: 'Platform Push Providers', icon: 'lucide:send', position: { x: 4600, y: 142 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },

      // Group: Cross-Region Continuity and Failover
      { id: 'home_region_directory', semanticType: 'db', label: 'Global Region Directory', technology: 'User Region Affinity affinity', icon: 'lucide:map-pinned', position: { x: 4248, y: 698 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'replication_pipeline', semanticType: 'queue', label: 'Asynchronous Replication Pipeline', technology: 'Durable CDC pipeline', icon: 'lucide:refresh-ccw', position: { x: 4600, y: 698 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'secondary_message_store', semanticType: 'db', label: 'Secondary Region Store', technology: 'Warm DR Replica DB', icon: 'lucide:database-backup', position: { x: 4952, y: 698 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'failover_controller', semanticType: 'service', label: 'Failover Controller', technology: 'Fencing & routing control', icon: 'lucide:life-buoy', position: { x: 5248, y: 698 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'replay_coordinator', semanticType: 'service', label: 'Recovery Coordinator', technology: 'Rebuild cursors & state', icon: 'lucide:rotate-cw', position: { x: 4600, y: 986 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'conflict_guard', semanticType: 'service', label: 'Writer Epoch Guard', technology: 'Single writer protection', icon: 'lucide:lock-keyhole', position: { x: 4952, y: 986 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },

      // Group: Operations, Reliability and Governance
      { id: 'telemetry_collector', semanticType: 'service', label: 'OTel Collectors', technology: 'Metrics, logs & traces exporter', icon: 'logos:opentelemetry-icon', position: { x: -2252, y: 698 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'metrics_store', semanticType: 'service', label: 'SLO Metrics Store', technology: 'Prometheus-compatible store', icon: 'logos:prometheus', position: { x: -1900, y: 698 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'dashboards', semanticType: 'service', label: 'Grafana Dashboards', technology: 'SLO Latency visualization', icon: 'logos:grafana', position: { x: -2252, y: 938 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'alerting', semanticType: 'service', label: 'SLO Alerting Engine', technology: ' Burn rate alert notifications', icon: 'lucide:siren', position: { x: -1900, y: 938 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'audit_archive', semanticType: 'db', label: 'Immutable Audit logs', technology: 'Security and admin logs archive', icon: 'lucide:scroll-text', position: { x: -2252, y: 1178 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'capacity_controller', semanticType: 'service', label: 'Autoscale Controller', technology: 'Partition scale controls', icon: 'lucide:chart-no-axes-combined', position: { x: -1900, y: 1178 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} }
    ],
    edges: [
      { id: 'e01', sourceNodeId: 'sender_device', targetNodeId: 'global_dns', direction: 'forward', label: 'Resolve messaging endpoint', detailLevel: 2 },
      { id: 'e02', sourceNodeId: 'recipient_device', targetNodeId: 'global_dns', direction: 'forward', label: 'Resolve messaging endpoint', detailLevel: 2 },
      { id: 'e03', sourceNodeId: 'web_client', targetNodeId: 'global_dns', direction: 'forward', label: 'Resolve messaging endpoint', detailLevel: 2 },
      { id: 'e04', sourceNodeId: 'global_dns', targetNodeId: 'global_load_balancer', direction: 'forward', label: 'Route to nearest region', detailLevel: 1 },
      { id: 'e05', sourceNodeId: 'global_load_balancer', targetNodeId: 'websocket_gateway', direction: 'forward', label: 'Establish TLS connection', detailLevel: 1 },
      { id: 'e06', sourceNodeId: 'global_load_balancer', targetNodeId: 'api_gateway', direction: 'forward', label: 'Route HTTPS API traffic', detailLevel: 1 },
      { id: 'e07', sourceNodeId: 'websocket_gateway', targetNodeId: 'auth_service', direction: 'forward', label: 'Validate access token', detailLevel: 2 },
      { id: 'e08', sourceNodeId: 'api_gateway', targetNodeId: 'auth_service', direction: 'forward', label: 'Authorize API request', detailLevel: 2 },
      { id: 'e09', sourceNodeId: 'auth_service', targetNodeId: 'token_cache', direction: 'forward', label: 'Read auth state', detailLevel: 2 },
      { id: 'e10', sourceNodeId: 'auth_service', targetNodeId: 'device_registry', direction: 'forward', label: 'Verify device', detailLevel: 2 },
      { id: 'e11', sourceNodeId: 'websocket_gateway', targetNodeId: 'edge_rate_limiter', direction: 'forward', label: 'Enforce quotas', detailLevel: 2 },
      { id: 'e12', sourceNodeId: 'edge_rate_limiter', targetNodeId: 'chat_ingress', direction: 'forward', label: 'Forward message envelope', detailLevel: 2 },
      { id: 'e13', sourceNodeId: 'websocket_gateway', targetNodeId: 'session_registry', direction: 'forward', label: 'Register user session', detailLevel: 2 },
      { id: 'e14', sourceNodeId: 'websocket_gateway', targetNodeId: 'presence_service', direction: 'forward', label: 'Heartbeat events', detailLevel: 2 },
      { id: 'e15', sourceNodeId: 'sender_device', targetNodeId: 'key_directory', direction: 'forward', label: 'Fetch identity keys', detailLevel: 2 },
      { id: 'e16', sourceNodeId: 'sender_device', targetNodeId: 'websocket_gateway', direction: 'forward', label: 'Send encrypted message', detailLevel: 1 },
      { id: 'e17', sourceNodeId: 'chat_ingress', targetNodeId: 'abuse_detection', direction: 'forward', label: 'Evaluate abuse signals', detailLevel: 2 },
      { id: 'e18', sourceNodeId: 'chat_ingress', targetNodeId: 'idempotency_service', direction: 'forward', label: 'Validate message ID', detailLevel: 2 },
      { id: 'e19', sourceNodeId: 'idempotency_service', targetNodeId: 'dedup_store', direction: 'forward', label: 'Reserve dedup key', detailLevel: 2 },
      { id: 'e20', sourceNodeId: 'chat_ingress', targetNodeId: 'conversation_service', direction: 'forward', label: 'Verify membership fanout', detailLevel: 2 },
      { id: 'e21', sourceNodeId: 'conversation_service', targetNodeId: 'conversation_store', direction: 'forward', label: 'Read roles states', detailLevel: 2 },
      { id: 'e22', sourceNodeId: 'chat_ingress', targetNodeId: 'message_store', direction: 'forward', label: 'Persist message', detailLevel: 1 },
      { id: 'e23', sourceNodeId: 'message_store', targetNodeId: 'chat_ingress', direction: 'forward', label: 'Write ack', detailLevel: 2 },
      { id: 'e24', sourceNodeId: 'chat_ingress', targetNodeId: 'sender_device', direction: 'forward', label: 'Return status', detailLevel: 2 },
      { id: 'e25', sourceNodeId: 'chat_ingress', targetNodeId: 'message_stream', direction: 'forward', label: 'Publish ordered event', detailLevel: 1 },
      { id: 'e26', sourceNodeId: 'message_stream', targetNodeId: 'group_fanout_worker', direction: 'forward', label: 'Expand group recipients', detailLevel: 2 },
      { id: 'e27', sourceNodeId: 'message_stream', targetNodeId: 'delivery_router', direction: 'forward', label: 'Consume message events', detailLevel: 1 },
      { id: 'e28', sourceNodeId: 'group_fanout_worker', targetNodeId: 'delivery_router', direction: 'forward', label: 'Submit recipient delivery tasks', detailLevel: 2 },
      { id: 'e29', sourceNodeId: 'delivery_router', targetNodeId: 'session_registry', direction: 'forward', label: 'Resolve active sessions', detailLevel: 2 },
      { id: 'e30', sourceNodeId: 'delivery_router', targetNodeId: 'websocket_gateway', direction: 'forward', label: 'Route message to gateway', detailLevel: 1 },
      { id: 'e31', sourceNodeId: 'websocket_gateway', targetNodeId: 'recipient_device', direction: 'forward', label: 'Deliver message', detailLevel: 1 },
      { id: 'e32', sourceNodeId: 'delivery_router', targetNodeId: 'offline_delivery', direction: 'forward', label: 'No active session', detailLevel: 2 },
      { id: 'e33', sourceNodeId: 'offline_delivery', targetNodeId: 'pending_store', direction: 'forward', label: 'Record pending delivery', detailLevel: 2 },
      { id: 'e34', sourceNodeId: 'offline_delivery', targetNodeId: 'push_service', direction: 'forward', label: 'Request wake-up push', detailLevel: 2 },
      { id: 'e35', sourceNodeId: 'push_service', targetNodeId: 'mobile_push_providers', direction: 'forward', label: 'Send push request', detailLevel: 2 },
      { id: 'e36', sourceNodeId: 'mobile_push_providers', targetNodeId: 'recipient_device', direction: 'forward', label: 'Wake application', detailLevel: 2 },
      { id: 'e37', sourceNodeId: 'recipient_device', targetNodeId: 'websocket_gateway', direction: 'forward', label: 'Reconnect & send receipt', detailLevel: 2 },
      { id: 'e38', sourceNodeId: 'websocket_gateway', targetNodeId: 'receipt_service', direction: 'forward', label: 'Forward receipts', detailLevel: 2 },
      { id: 'e39', sourceNodeId: 'receipt_service', targetNodeId: 'receipt_stream', direction: 'forward', label: 'Publish receipt event', detailLevel: 2 },
      { id: 'e40', sourceNodeId: 'receipt_service', targetNodeId: 'message_store', direction: 'forward', label: 'Update state', detailLevel: 2 },
      { id: 'e41', sourceNodeId: 'receipt_stream', targetNodeId: 'delivery_router', direction: 'forward', label: 'Route receipt to sender', detailLevel: 2 },
      { id: 'e42', sourceNodeId: 'api_gateway', targetNodeId: 'history_service', direction: 'forward', label: 'Request history sync', detailLevel: 2 },
      { id: 'e43', sourceNodeId: 'history_service', targetNodeId: 'message_store', direction: 'forward', label: 'Read time-ordered messages', detailLevel: 2 },
      { id: 'e44', sourceNodeId: 'history_service', targetNodeId: 'pending_store', direction: 'forward', label: 'Read delivery cursor', detailLevel: 2 },
      { id: 'e45', sourceNodeId: 'history_service', targetNodeId: 'recipient_device', direction: 'forward', label: 'Return missed messages', detailLevel: 2 },
      { id: 'e46', sourceNodeId: 'sender_device', targetNodeId: 'api_gateway', direction: 'forward', label: 'Request signed media upload', detailLevel: 1 },
      { id: 'e47', sourceNodeId: 'api_gateway', targetNodeId: 'media_upload_service', direction: 'forward', label: 'Create upload session', detailLevel: 2 },
      { id: 'e48', sourceNodeId: 'media_upload_service', targetNodeId: 'sender_device', direction: 'forward', label: 'Return upload URLs', detailLevel: 2 },
      { id: 'e49', sourceNodeId: 'sender_device', targetNodeId: 'encrypted_object_storage', direction: 'forward', label: 'Upload encrypted media', detailLevel: 1 },
      { id: 'e50', sourceNodeId: 'encrypted_object_storage', targetNodeId: 'media_processing', direction: 'forward', label: 'Validate format', detailLevel: 2 },
      { id: 'e51', sourceNodeId: 'encrypted_object_storage', targetNodeId: 'media_cdn', direction: 'forward', label: 'Serve media origin', detailLevel: 2 },
      { id: 'e52', sourceNodeId: 'media_cdn', targetNodeId: 'recipient_device', direction: 'forward', label: 'Download encrypted media', detailLevel: 1 },
      { id: 'e53', sourceNodeId: 'websocket_gateway', targetNodeId: 'home_region_directory', direction: 'forward', label: 'Resolve home region', detailLevel: 2 },
      { id: 'e54', sourceNodeId: 'message_store', targetNodeId: 'change_data_capture', direction: 'forward', label: 'Emit message CDC', detailLevel: 2 },
      { id: 'e55', sourceNodeId: 'change_data_capture', targetNodeId: 'replication_pipeline', direction: 'forward', label: 'Replicate CDC feed', detailLevel: 2 },
      { id: 'e56', sourceNodeId: 'replication_pipeline', targetNodeId: 'secondary_message_store', direction: 'forward', label: 'Write DR Replica', detailLevel: 2 },
      { id: 'e57', sourceNodeId: 'failover_controller', targetNodeId: 'global_load_balancer', direction: 'forward', label: 'Shift traffic', detailLevel: 2 },
      { id: 'e58', sourceNodeId: 'failover_controller', targetNodeId: 'conflict_guard', direction: 'forward', label: 'Issue writer epoch', detailLevel: 2 },
      { id: 'e59', sourceNodeId: 'conflict_guard', targetNodeId: 'secondary_message_store', direction: 'forward', label: 'Permit recovery mode writes', detailLevel: 2 },
      { id: 'secondary_message_store', sourceNodeId: 'secondary_message_store', targetNodeId: 'replay_coordinator', direction: 'forward', label: 'Provide cursors', detailLevel: 2 },
      { id: 'e61', sourceNodeId: 'replay_coordinator', targetNodeId: 'delivery_router', direction: 'forward', label: 'Resume pending delivery', detailLevel: 2 },
      { id: 'e62', sourceNodeId: 'retention_worker', targetNodeId: 'message_store', direction: 'forward', label: 'Apply holds policy', detailLevel: 2 },
      { id: 'e63', sourceNodeId: 'retention_worker', targetNodeId: 'encrypted_object_storage', direction: 'forward', label: 'Delete expired objects', detailLevel: 2 },
      { id: 'e64', sourceNodeId: 'search_index', targetNodeId: 'history_service', direction: 'forward', label: 'Resolve search filters', detailLevel: 2 },
      { id: 'e65', sourceNodeId: 'websocket_gateway', targetNodeId: 'telemetry_collector', direction: 'forward', label: 'Connection telemetry', detailLevel: 2 },
      { id: 'e66', sourceNodeId: 'chat_ingress', targetNodeId: 'telemetry_collector', direction: 'forward', label: 'Ingress trace metrics', detailLevel: 2 },
      { id: 'e67', sourceNodeId: 'delivery_router', targetNodeId: 'telemetry_collector', direction: 'forward', label: 'Router delay telemetry', detailLevel: 2 },
      { id: 'e68', sourceNodeId: 'message_stream', targetNodeId: 'telemetry_collector', direction: 'forward', label: 'Partition lag metrics', detailLevel: 2 },
      { id: 'e69', sourceNodeId: 'telemetry_collector', targetNodeId: 'metrics_store', direction: 'forward', label: 'Export SLO metrics', detailLevel: 2 },
      { id: 'e70', sourceNodeId: 'metrics_store', targetNodeId: 'dashboards', direction: 'forward', label: 'SLO dashboards', detailLevel: 2 },
      { id: 'e71', sourceNodeId: 'metrics_store', targetNodeId: 'alerting', direction: 'forward', label: 'Evaluate SLO alerts', detailLevel: 2 },
      { id: 'e72', sourceNodeId: 'auth_service', targetNodeId: 'audit_archive', direction: 'forward', label: 'Audit identities state', detailLevel: 2 },
      { id: 'e73', sourceNodeId: 'key_directory', targetNodeId: 'audit_archive', direction: 'forward', label: 'Audit keys rotation state', detailLevel: 2 },
      { id: 'e74', sourceNodeId: 'capacity_controller', targetNodeId: 'websocket_gateway', direction: 'forward', label: 'Scale gateway capacity', detailLevel: 2 },
      { id: 'e75', sourceNodeId: 'capacity_controller', targetNodeId: 'message_stream', direction: 'forward', label: 'Rebalance stream partitions', detailLevel: 2 }
    ],
    groups: [
      { id: 'clients', label: 'Client Applications', x: -1750, y: -450, w: 320, h: 704, accent: 'blue' },
      { id: 'edge_connection', label: 'Global Edge and Connection Layer', x: -850, y: -450, w: 1184, h: 750, accent: 'orange' },
      { id: 'identity_security', label: 'Identity, Device Trust and Key Management', x: 600, y: -600, w: 1050, h: 550, accent: 'purple' },
      { id: 'messaging_core', label: 'Regional Messaging Control Plane', x: 600, y: 150, w: 1400, h: 1000, accent: 'blue' },
      { id: 'ordering_storage', label: 'Ordering, Durable Storage and Event Backbone', x: 2350, y: 100, w: 1550, h: 1000, accent: 'orange' },
      { id: 'media_notifications', label: 'Media Delivery and Push Notifications', x: 4200, y: -450, w: 1150, h: 900, accent: 'green' },
      { id: 'cross_region', label: 'Cross-Region Continuity and Failover', x: 4200, y: 650, w: 1350, h: 800, accent: 'green' },
      { id: 'operations', label: 'Operations, Reliability and Governance', x: -2300, y: 650, w: 800, h: 1000, accent: 'slate' }
    ],
    scenarios: []
  },
  {
    version: '1.0.0',
    id: 'global-payment-processing',
    kind: 'architecture',
    title: 'Global Payment Processing and Ledger Platform',
    description: 'A robust global double-entry ledger and card processing infrastructure featuring routing orchestrator, transaction safety outbox, balanced journal store, payout scheduler, and multi-region continuity.',
    metadata: {
      complexity: 'Senior',
      provider: 'agnostic',
      technologies: ['Idempotency', 'Outbox', 'Double-Entry', 'Kafka', 'Fencing'],
      tags: ['payments', 'double-entry-ledger', 'card-processing', 'fraud', 'reconciliation', 'multi-region'],
      detailLevels: ['Executive', 'Engineering', 'Production']
    },
    nodes: [
      // Group: Customers, Merchants and Operations
      { id: 'customer', semanticType: 'external', label: 'Customer', technology: 'Web, Mobile or In-Store Buyer', icon: 'lucide:user', position: { x: -1782, y: -452 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'merchant_checkout', semanticType: 'external', label: 'Merchant Checkout', technology: 'Hosted Fields or Payment SDK', icon: 'lucide:shopping-cart', position: { x: -1782, y: -260 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'merchant_backend', semanticType: 'external', label: 'Merchant Backend', technology: 'Orders & Payment Intents', icon: 'lucide:server', position: { x: -1782, y: -68 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'merchant_ops', semanticType: 'external', label: 'Merchant Operations', technology: 'Refunds, Disputes & Reporting', icon: 'lucide:briefcase-business', position: { x: -1782, y: 124 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'finance_ops', semanticType: 'external', label: 'Finance and Treasury Team', technology: 'Settlement & Reconciliation', icon: 'lucide:landmark', position: { x: -1782, y: 316 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },

      // Group: Global Edge and Merchant API Layer
      { id: 'global_dns', semanticType: 'service', label: 'Anycast DNS', technology: 'Latency & Health-Based Routing', icon: 'lucide:globe', position: { x: -1002, y: -452 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'waf_ddos', semanticType: 'service', label: 'WAF and DDoS Protection', technology: 'Bot & Payload Filtering', icon: 'lucide:shield', position: { x: -650, y: -452 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'api_gateway', semanticType: 'service', label: 'Payment API Gateway', technology: 'REST, Webhooks & SDK API', icon: 'logos:aws-api-gateway', position: { x: -250, y: -452 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'merchant_auth', semanticType: 'service', label: 'Merchant Authentication', technology: 'API Keys & OAuth Clients', icon: 'lucide:badge-check', position: { x: -826, y: -180 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'distributed_rate_limiter', semanticType: 'service', label: 'Distributed Rate Limiter', technology: 'Merchant & IP Quotas', icon: 'lucide:gauge', position: { x: -474, y: -180 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'request_normalizer', semanticType: 'service', label: 'Request Validation', technology: 'Schema & Currency Rules', icon: 'lucide:list-checks', position: { x: -122, y: -180 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'edge_token_cache', semanticType: 'db', label: 'Authorization Cache', technology: 'Redis Config State Cache', icon: 'logos:redis', position: { x: -650, y: 124 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'webhook_ingress', semanticType: 'service', label: 'Provider Webhook Ingress', technology: 'Signature validation state', icon: 'lucide:webhook', position: { x: -250, y: 124 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },

      // Group: Payment Control Plane
      { id: 'idempotency_service', semanticType: 'service', label: 'Idempotency Service', technology: 'Exactly-Once enforcement key', icon: 'lucide:copy-check', position: { x: 548, y: -452 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'payment_orchestrator', semanticType: 'service', label: 'Payment Orchestrator', technology: 'Auth, Capture, Refund, Void', icon: 'lucide:workflow', position: { x: 900, y: -452 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'payment_state_machine', semanticType: 'service', label: 'Payment State Machine', technology: 'Valid transitions manager', icon: 'lucide:git-branch', position: { x: 1252, y: -452 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'routing_engine', semanticType: 'service', label: 'Processor Routing Engine', technology: 'Cost and health router', icon: 'lucide:route', position: { x: 1604, y: -452 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'fraud_engine', semanticType: 'service', label: 'Fraud and Risk Engine', technology: 'Velocity & ML risk rules', icon: 'lucide:shield-alert', position: { x: 548, y: -164 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'tokenization_service', semanticType: 'service', label: 'PAN Tokenization Service', technology: 'Network Tokens Isolation', icon: 'lucide:credit-card', position: { x: 900, y: -164 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'three_ds_service', semanticType: 'service', label: '3-D Secure Service', technology: 'SCA & Liability Shift', icon: 'lucide:shield-check', position: { x: 1252, y: -164 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'connector_manager', semanticType: 'service', label: 'Connector Manager', technology: 'Timeouts & circuit breakers', icon: 'lucide:plug-zap', position: { x: 1604, y: -164 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'payment_repository', semanticType: 'db', label: 'Payment Repository', technology: 'Attempts & references DB', icon: 'lucide:database', position: { x: 724, y: 124 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'idempotency_store', semanticType: 'db', label: 'Idempotency Store', technology: 'Redis request hash memory', icon: 'lucide:database-zap', position: { x: 1076, y: 124 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'payment_outbox', semanticType: 'db', label: 'Payment Outbox DB', technology: 'Transactional events queue', icon: 'lucide:outbox', position: { x: 1428, y: 124 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'payment_event_bus', semanticType: 'queue', label: 'Payment Event Bus', technology: 'Partitioned Kafka Backbone', icon: 'logos:kafka-icon', position: { x: 1076, y: 412 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'ambiguity_resolver', semanticType: 'service', label: 'Ambiguity Resolver', technology: 'Status query coordinator', icon: 'lucide:search-check', position: { x: 1428, y: 412 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },

      // Group: PCI Zone and External Payment Rails
      { id: 'token_vault', semanticType: 'db', label: 'Token Vault', technology: 'Encrypted PAN tokens vault', icon: 'lucide:vault', position: { x: 2398, y: -452 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'hsm_cluster', semanticType: 'db', label: 'HSM Cluster', technology: 'PIN & Cryptogram operations', icon: 'lucide:key-square', position: { x: 2750, y: -452 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'network_token_provider', semanticType: 'external', label: 'Network Token Provider', technology: 'Token lifecycle provider', icon: 'lucide:badge-dollar-sign', position: { x: 3102, y: -452 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'acquirer_connector_a', semanticType: 'integration', label: 'Primary Acquirer Connector', technology: 'Authorization API broker', icon: 'lucide:plug', position: { x: 2398, y: -164 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'acquirer_connector_b', semanticType: 'integration', label: 'Secondary Acquirer Connector', technology: 'Failover API broker', icon: 'lucide:plug', position: { x: 2750, y: -164 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'card_network', semanticType: 'external', label: 'Card Network', technology: 'Visa / MasterCard Schemes', icon: 'lucide:network', position: { x: 3102, y: -164 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'issuer_bank', semanticType: 'external', label: 'Issuing Bank', technology: 'Account credit balance decider', icon: 'lucide:landmark', position: { x: 3454, y: -164 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'bank_transfer_rail', semanticType: 'external', label: 'Bank Transfer Rail', technology: 'ACH, Faster Payments rail', icon: 'lucide:arrow-left-right', position: { x: 2574, y: 124 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'wallet_provider', semanticType: 'external', label: 'Digital Wallet Provider', technology: 'Wallet Token authorization', icon: 'lucide:wallet-cards', position: { x: 2926, y: 124 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'provider_status_store', semanticType: 'db', label: 'Provider Health Store', technology: 'Latency & error circuit status', icon: 'lucide:activity', position: { x: 3278, y: 124 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'provider_callback_queue', semanticType: 'queue', label: 'Callback Queue', technology: 'Verified update queue stream', icon: 'lucide:list-restart', position: { x: 2926, y: 412 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },

      // Group: Immutable Accounting, Balances and Merchant Events
      { id: 'ledger_command_service', semanticType: 'service', label: 'Ledger Command Service', technology: 'Validate Balanced Journal entries', icon: 'lucide:notebook-tabs', position: { x: 4198, y: -452 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'journal_store', semanticType: 'db', label: 'Immutable Journal Store', technology: 'Append-Only Double-Entry journal', icon: 'lucide:database-lock', position: { x: 4550, y: -452 }, size: { w: 224, h: 128 }, detailLevel: 1, properties: {} },
      { id: 'ledger_outbox', semanticType: 'db', label: 'Ledger Outbox Store', technology: 'Journal events committed queue', icon: 'lucide:outbox', position: { x: 4902, y: -452 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'balance_projector', semanticType: 'service', label: 'Balance Projector', technology: 'Available & pending balance engine', icon: 'lucide:calculator', position: { x: 5254, y: -452 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'balance_store', semanticType: 'db', label: 'Balance Store', technology: 'Read-Optimized Balance cache', icon: 'lucide:database-zap', position: { x: 5254, y: -164 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'merchant_event_service', semanticType: 'service', label: 'Merchant Event Service', technology: 'Deliver merchant events API', icon: 'lucide:radio-tower', position: { x: 4198, y: -164 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'webhook_delivery', semanticType: 'service', label: 'Webhook Delivery Service', technology: 'Signed dispatch & retry engine', icon: 'lucide:webhook', position: { x: 4550, y: -164 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'webhook_delivery_store', semanticType: 'db', label: 'Webhook Attempt Store', technology: 'Delivered history tracking DB', icon: 'lucide:database-clock', position: { x: 4902, y: -164 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'dispute_service', semanticType: 'service', label: 'Dispute & Chargeback Service', technology: 'Deadline provisional poster', icon: 'lucide:gavel', position: { x: 4198, y: 124 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'refund_service', semanticType: 'service', label: 'Refund Service', technology: 'Full or partial refund service', icon: 'lucide:rotate-ccw', position: { x: 4550, y: 124 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'reporting_store', semanticType: 'db', label: 'Reporting Store', technology: 'Merchant payout lookup tables', icon: 'lucide:chart-no-axes-combined', position: { x: 4902, y: 124 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'event_archive', semanticType: 'db', label: 'Financial Event Archive', technology: 'Long-term immutable archive', icon: 'lucide:archive', position: { x: 5254, y: 124 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'webhook_dlq', semanticType: 'queue', label: 'Webhook DLQ', technology: 'Exhausted webhook queue', icon: 'lucide:mail-warning', position: { x: 4550, y: 412 }, size: { w: 224, h: 128 }, detailLevel: 3, properties: {} },
      { id: 'ledger_verifier', semanticType: 'service', label: 'Ledger Invariant Verifier', technology: 'Invariant validation engine', icon: 'lucide:badge-check', position: { x: 5078, y: 412 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },

      // Group: Clearing, Settlement and Reconciliation
      { id: 'settlement_scheduler', semanticType: 'service', label: 'Settlement Scheduler', technology: 'Cutoffs & Payout batch window', icon: 'lucide:calendar-clock', position: { x: 4198, y: 998 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'payout_service', semanticType: 'service', label: 'Merchant Payout Service', technology: 'Safeguarded payout dispatcher', icon: 'lucide:hand-coins', position: { x: 4550, y: 998 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'treasury_accounts', semanticType: 'external', label: 'Treasury Bank Accounts', technology: 'safeguarded payouts bank API', icon: 'lucide:landmark', position: { x: 4902, y: 998 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'settlement_file_ingest', semanticType: 'service', label: 'Settlement File Ingest', technology: 'Ingests clearing bank reports', icon: 'lucide:file-down', position: { x: 5254, y: 998 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'reconciliation_engine', semanticType: 'service', label: 'Reconciliation Engine', technology: 'Clearing journal matching engine', icon: 'lucide:scale', position: { x: 4374, y: 1286 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'reconciliation_store', semanticType: 'db', label: 'Reconciliation Store', technology: 'Match results exceptions DB', icon: 'lucide:database', position: { x: 4726, y: 1286 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'exception_queue', semanticType: 'queue', label: 'Exception Queue', technology: 'Mismatched transaction queue', icon: 'lucide:triangle-alert', position: { x: 5078, y: 1286 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'finance_case_manager', semanticType: 'service', label: 'Case Manager Service', technology: 'Manual cases dispatcher tool', icon: 'lucide:folder-search', position: { x: 4726, y: 1574 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },

      // Group: Regional Continuity and Write Fencing
      { id: 'payment_home_region', semanticType: 'db', label: 'Payment Region Directory', technology: 'Merchant region affinity map', icon: 'lucide:map-pinned', position: { x: 6048, y: -452 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'change_capture', semanticType: 'queue', label: 'Change Data Capture Stream', technology: 'Kafka committed journal CDC stream', icon: 'lucide:refresh-cw', position: { x: 6400, y: -452 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'replication_pipeline', semanticType: 'queue', label: 'Replication Pipeline', technology: 'Regional commit replicate', icon: 'lucide:refresh-ccw', position: { x: 6752, y: -452 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'secondary_payment_store', semanticType: 'db', label: 'Secondary Payment Store', technology: 'Replicated warmup DB', icon: 'lucide:database-backup', position: { x: 7048, y: -452 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'secondary_journal_store', semanticType: 'db', label: 'Secondary Journal Store', technology: 'Replicated Immutable Journal', icon: 'lucide:book-lock', position: { x: 6224, y: -164 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'writer_epoch_guard', semanticType: 'service', label: 'Writer Epoch Guard', technology: 'Ledger writing epoch protector', icon: 'lucide:shield-ban', position: { x: 6576, y: -164 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'failover_controller', semanticType: 'service', label: 'Failover Controller', technology: 'Traffic recovery check coordinator', icon: 'lucide:heart-pulse', position: { x: 6928, y: -164 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'recovery_replayer', semanticType: 'service', label: 'Recovery Replayer', technology: 'Resume unpublished events', icon: 'lucide:history', position: { x: 6400, y: 124 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'provider_reconciliation_guard', semanticType: 'service', label: 'Provider Reconcile Guard', technology: 'Queries external provider status', icon: 'lucide:search-check', position: { x: 6752, y: 124 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },

      // Group: Observability, Security and Governance
      { id: 'telemetry_collector', semanticType: 'service', label: 'OTel Collectors', technology: 'Traces, metrics, logs exporter', icon: 'logos:opentelemetry-icon', position: { x: 6048, y: 798 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'metrics_store', semanticType: 'service', label: 'Metrics and SLO Store', technology: 'Prometheus metric backend', icon: 'logos:prometheus', position: { x: 6400, y: 798 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'dashboards', semanticType: 'service', label: 'Operations Dashboards', technology: 'Grafana dashboards panel', icon: 'logos:grafana', position: { x: 6752, y: 798 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'alerting', semanticType: 'service', label: 'Financial SLO Alerts', technology: 'Alerting engine notifications', icon: 'lucide:bell-ring', position: { x: 7048, y: 798 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'audit_archive', semanticType: 'db', label: 'Audit Log Archive', technology: 'Audit trails restore store', icon: 'lucide:archive-restore', position: { x: 6224, y: 1086 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'secrets_manager', semanticType: 'db', label: 'Secrets Key Manager', technology: 'Credential and key storage', icon: 'lucide:key-round', position: { x: 6576, y: 1086 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'access_control', semanticType: 'service', label: 'Access Control Service', technology: 'Least privilege auth provider', icon: 'lucide:user-lock', position: { x: 6928, y: 1086 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'compliance_policy', semanticType: 'service', label: 'Compliance Policy Engine', technology: 'PCI & residency checks engine', icon: 'lucide:scroll-text', position: { x: 6224, y: 1374 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'capacity_controller', semanticType: 'service', label: 'Capacity Controller', technology: 'Autoscale partitions optimizer', icon: 'lucide:sliders-horizontal', position: { x: 6576, y: 1374 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'synthetic_payments', semanticType: 'service', label: 'Synthetic Payment Probes', technology: 'Provider mock probe scheduler', icon: 'lucide:flask-conical', position: { x: 6928, y: 1374 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} },
      { id: 'incident_timeline', semanticType: 'service', label: 'Incident Timeline Store', technology: 'Deployments incident history DB', icon: 'lucide:clock-3', position: { x: 6576, y: 1662 }, size: { w: 224, h: 128 }, detailLevel: 2, properties: {} }
    ],
    edges: [
      { id: 'e01', sourceNodeId: 'customer', targetNodeId: 'merchant_checkout', direction: 'forward', label: 'Approve purchase', detailLevel: 2 },
      { id: 'e02', sourceNodeId: 'merchant_checkout', targetNodeId: 'merchant_backend', direction: 'forward', label: 'Create order', detailLevel: 1 },
      { id: 'e03', sourceNodeId: 'merchant_backend', targetNodeId: 'global_dns', direction: 'forward', label: 'Confirm payment intent', detailLevel: 1 },
      { id: 'e04', sourceNodeId: 'merchant_ops', targetNodeId: 'global_dns', direction: 'forward', label: 'Refund/dispute action', detailLevel: 2 },
      { id: 'e05', sourceNodeId: 'global_dns', targetNodeId: 'waf_ddos', direction: 'forward', label: 'Route to nearest region', detailLevel: 1 },
      { id: 'e06', sourceNodeId: 'waf_ddos', targetNodeId: 'api_gateway', direction: 'forward', label: 'Forward accepted request', detailLevel: 1 },
      { id: 'e07', sourceNodeId: 'api_gateway', targetNodeId: 'merchant_auth', direction: 'forward', label: 'Authenticate merchant', detailLevel: 2 },
      { id: 'e08', sourceNodeId: 'merchant_auth', targetNodeId: 'edge_token_cache', direction: 'forward', label: 'Read auth state', detailLevel: 2 },
      { id: 'e09', sourceNodeId: 'api_gateway', targetNodeId: 'distributed_rate_limiter', direction: 'forward', label: 'Enforce quotas', detailLevel: 2 },
      { id: 'e10', sourceNodeId: 'distributed_rate_limiter', targetNodeId: 'request_normalizer', direction: 'forward', label: 'Validate request', detailLevel: 2 },
      { id: 'e11', sourceNodeId: 'request_normalizer', targetNodeId: 'idempotency_service', direction: 'forward', label: 'Submit normalized op', detailLevel: 2 },
      { id: 'e12', sourceNodeId: 'idempotency_service', targetNodeId: 'idempotency_store', direction: 'forward', label: 'Check request hash', detailLevel: 2 },
      { id: 'e13', sourceNodeId: 'idempotency_service', targetNodeId: 'payment_orchestrator', direction: 'forward', label: 'Execute once', detailLevel: 1 },
      { id: 'e14', sourceNodeId: 'payment_orchestrator', targetNodeId: 'payment_state_machine', direction: 'forward', label: 'Validate state transition', detailLevel: 2 },
      { id: 'e15', sourceNodeId: 'payment_orchestrator', targetNodeId: 'fraud_engine', direction: 'forward', label: 'Evaluate risk', detailLevel: 1 },
      { id: 'e16', sourceNodeId: 'fraud_engine', targetNodeId: 'payment_orchestrator', direction: 'forward', label: 'Risk result', detailLevel: 2 },
      { id: 'e17', sourceNodeId: 'payment_orchestrator', targetNodeId: 'tokenization_service', direction: 'forward', label: 'Resolve payment method', detailLevel: 2 },
      { id: 'e18', sourceNodeId: 'tokenization_service', targetNodeId: 'token_vault', direction: 'forward', label: 'Resolve PAN mapping', detailLevel: 2 },
      { id: 'e19', sourceNodeId: 'token_vault', targetNodeId: 'hsm_cluster', direction: 'forward', label: 'HSM operation', detailLevel: 2 },
      { id: 'e20', sourceNodeId: 'tokenization_service', targetNodeId: 'network_token_provider', direction: 'forward', label: 'Provision token', detailLevel: 2 },
      { id: 'e21', sourceNodeId: 'payment_orchestrator', targetNodeId: 'three_ds_service', direction: 'forward', label: 'Perform SCA', detailLevel: 2 },
      { id: 'e22', sourceNodeId: 'three_ds_service', targetNodeId: 'merchant_checkout', direction: 'forward', label: 'Customer challenge', detailLevel: 2 },
      { id: 'e23', sourceNodeId: 'payment_orchestrator', targetNodeId: 'routing_engine', direction: 'forward', label: 'Select route', detailLevel: 2 },
      { id: 'e24', sourceNodeId: 'routing_engine', targetNodeId: 'provider_status_store', direction: 'forward', label: 'Read health success metrics', detailLevel: 2 },
      { id: 'e25', sourceNodeId: 'routing_engine', targetNodeId: 'connector_manager', direction: 'forward', label: 'Provide connector candidates', detailLevel: 2 },
      { id: 'e26', sourceNodeId: 'connector_manager', targetNodeId: 'acquirer_connector_a', direction: 'forward', label: 'Send primary auth request', detailLevel: 1 },
      { id: 'e27', sourceNodeId: 'connector_manager', targetNodeId: 'acquirer_connector_b', direction: 'forward', label: 'Fail over', detailLevel: 2 },
      { id: 'e28', sourceNodeId: 'connector_manager', targetNodeId: 'wallet_provider', direction: 'forward', label: 'Wallet auth', detailLevel: 2 },
      { id: 'e29', sourceNodeId: 'connector_manager', targetNodeId: 'bank_transfer_rail', direction: 'forward', label: 'Bank instruction', detailLevel: 2 },
      { id: 'e30', sourceNodeId: 'acquirer_connector_a', targetNodeId: 'card_network', direction: 'forward', label: 'Route auth', detailLevel: 1 },
      { id: 'e31', sourceNodeId: 'acquirer_connector_b', targetNodeId: 'card_network', direction: 'forward', label: 'Route auth alternate', detailLevel: 2 },
      { id: 'e32', sourceNodeId: 'card_network', targetNodeId: 'issuer_bank', direction: 'forward', label: 'Request issuer decision', detailLevel: 1 },
      { id: 'e33', sourceNodeId: 'issuer_bank', targetNodeId: 'card_network', direction: 'forward', label: 'Return decision', detailLevel: 1 },
      { id: 'e34', sourceNodeId: 'card_network', targetNodeId: 'acquirer_connector_a', direction: 'forward', label: 'Return auth result', detailLevel: 1 },
      { id: 'e35', sourceNodeId: 'acquirer_connector_a', targetNodeId: 'connector_manager', direction: 'forward', label: 'Normalized response', detailLevel: 2 },
      { id: 'e36', sourceNodeId: 'connector_manager', targetNodeId: 'payment_orchestrator', direction: 'forward', label: 'Return provider result', detailLevel: 2 },
      { id: 'e37', sourceNodeId: 'connector_manager', targetNodeId: 'ambiguity_resolver', direction: 'forward', label: 'Escalate timeout', detailLevel: 2 },
      { id: 'e38', sourceNodeId: 'ambiguity_resolver', targetNodeId: 'acquirer_connector_a', direction: 'forward', label: 'Query status before retry', detailLevel: 2 },
      { id: 'e39', sourceNodeId: 'webhook_ingress', targetNodeId: 'provider_callback_queue', direction: 'forward', label: 'Enqueue verified callback', detailLevel: 2 },
      { id: 'e40', sourceNodeId: 'provider_callback_queue', targetNodeId: 'payment_orchestrator', direction: 'forward', label: 'Apply state idempotently', detailLevel: 2 },
      { id: 'e41', sourceNodeId: 'payment_orchestrator', targetNodeId: 'payment_repository', direction: 'forward', label: 'Persist state', detailLevel: 2 },
      { id: 'e42', sourceNodeId: 'payment_orchestrator', targetNodeId: 'payment_outbox', direction: 'forward', label: 'Commit event', detailLevel: 2 },
      { id: 'e43', sourceNodeId: 'payment_outbox', targetNodeId: 'payment_event_bus', direction: 'forward', label: 'Publish event', detailLevel: 1 },
      { id: 'e44', sourceNodeId: 'payment_orchestrator', targetNodeId: 'idempotency_service', direction: 'forward', label: 'Store response', detailLevel: 2 },
      { id: 'e45', sourceNodeId: 'payment_event_bus', targetNodeId: 'ledger_command_service', direction: 'forward', label: 'Translate to journal command', detailLevel: 1 },
      { id: 'e46', sourceNodeId: 'ledger_command_service', targetNodeId: 'journal_store', direction: 'forward', label: 'Append double-entry', detailLevel: 1 },
      { id: 'e47', sourceNodeId: 'ledger_command_service', targetNodeId: 'ledger_outbox', direction: 'forward', label: 'Commit journal event', detailLevel: 2 },
      { id: 'e48', sourceNodeId: 'ledger_outbox', targetNodeId: 'payment_event_bus', direction: 'forward', label: 'Publish ledger event', detailLevel: 2 },
      { id: 'e49', sourceNodeId: 'payment_event_bus', targetNodeId: 'balance_projector', direction: 'forward', label: 'Project balances', detailLevel: 2 },
      { id: 'e50', sourceNodeId: 'balance_projector', targetNodeId: 'balance_store', direction: 'forward', label: 'Update balance view', detailLevel: 2 },
      { id: 'e51', sourceNodeId: 'payment_event_bus', targetNodeId: 'merchant_event_service', direction: 'forward', label: 'Consume events', detailLevel: 2 },
      { id: 'e52', sourceNodeId: 'merchant_event_service', targetNodeId: 'webhook_delivery_store', direction: 'forward', label: 'Create delivery log', detailLevel: 2 },
      { id: 'e53', sourceNodeId: 'merchant_event_service', targetNodeId: 'webhook_delivery', direction: 'forward', label: 'Queue webhook', detailLevel: 2 },
      { id: 'e54', sourceNodeId: 'webhook_delivery', targetNodeId: 'merchant_backend', direction: 'forward', label: 'Deliver signed webhook', detailLevel: 1 },
      { id: 'e55', sourceNodeId: 'webhook_delivery', targetNodeId: 'webhook_delivery_store', direction: 'forward', label: 'Record response', detailLevel: 2 },
      { id: 'e56', sourceNodeId: 'webhook_delivery', targetNodeId: 'webhook_dlq', direction: 'forward', label: 'Move to DLQ', detailLevel: 3 },
      { id: 'e57', sourceNodeId: 'payment_event_bus', targetNodeId: 'reporting_store', direction: 'forward', label: 'Build reporting views', detailLevel: 2 },
      { id: 'e58', sourceNodeId: 'payment_event_bus', targetNodeId: 'event_archive', direction: 'forward', label: 'Archive history', detailLevel: 2 },
      { id: 'e59', sourceNodeId: 'merchant_ops', targetNodeId: 'refund_service', direction: 'forward', label: 'Create refund', detailLevel: 2 },
      { id: 'e60', sourceNodeId: 'refund_service', targetNodeId: 'payment_orchestrator', direction: 'forward', label: 'Execute refund', detailLevel: 2 },
      { id: 'e61', sourceNodeId: 'merchant_ops', targetNodeId: 'dispute_service', direction: 'forward', label: 'Review chargeback', detailLevel: 2 },
      { id: 'e62', sourceNodeId: 'dispute_service', targetNodeId: 'ledger_command_service', direction: 'forward', label: 'Post dispute entry', detailLevel: 2 },
      { id: 'e63', sourceNodeId: 'dispute_service', targetNodeId: 'event_archive', direction: 'forward', label: 'Archive evidence', detailLevel: 2 },
      { id: 'e64', sourceNodeId: 'ledger_verifier', targetNodeId: 'journal_store', direction: 'forward', label: 'Verify balances', detailLevel: 2 },
      { id: 'e65', sourceNodeId: 'settlement_scheduler', targetNodeId: 'balance_store', direction: 'forward', label: 'Read payable balance', detailLevel: 2 },
      { id: 'e66', sourceNodeId: 'settlement_scheduler', targetNodeId: 'payout_service', direction: 'forward', label: 'Create payout batch', detailLevel: 2 },
      { id: 'e67', sourceNodeId: 'payout_service', targetNodeId: 'treasury_accounts', direction: 'forward', label: 'Submit payout instruction', detailLevel: 2 },
      { id: 'e68', sourceNodeId: 'payout_service', targetNodeId: 'ledger_command_service', direction: 'forward', label: 'Record payout entries', detailLevel: 2 },
      { id: 'e69', sourceNodeId: 'settlement_file_ingest', targetNodeId: 'reconciliation_engine', direction: 'forward', label: 'Provide bank rows', detailLevel: 2 },
      { id: 'e70', sourceNodeId: 'journal_store', targetNodeId: 'reconciliation_engine', direction: 'forward', label: 'Provide journal entries', detailLevel: 2 },
      { id: 'e71', sourceNodeId: 'payment_repository', targetNodeId: 'reconciliation_engine', direction: 'forward', label: 'Provide provider ref', detailLevel: 2 },
      { id: 'e72', sourceNodeId: 'reconciliation_engine', targetNodeId: 'reconciliation_store', direction: 'forward', label: 'Store matches exceptions', detailLevel: 2 },
      { id: 'e73', sourceNodeId: 'reconciliation_engine', targetNodeId: 'exception_queue', direction: 'forward', label: 'Publish exception', detailLevel: 2 },
      { id: 'e74', sourceNodeId: 'exception_queue', targetNodeId: 'finance_case_manager', direction: 'forward', label: 'Open manual case', detailLevel: 2 },
      { id: 'e75', sourceNodeId: 'finance_ops', targetNodeId: 'finance_case_manager', direction: 'forward', label: 'Resolve exception', detailLevel: 2 },
      { id: 'e76', sourceNodeId: 'finance_case_manager', targetNodeId: 'reconciliation_store', direction: 'forward', label: 'Record resolution', detailLevel: 2 },
      { id: 'e77', sourceNodeId: 'payment_repository', targetNodeId: 'change_capture', direction: 'forward', label: 'Capture changes', detailLevel: 2 },
      { id: 'e78', sourceNodeId: 'journal_store', targetNodeId: 'change_capture', direction: 'forward', label: 'Capture changes journal', detailLevel: 2 },
      { id: 'e79', sourceNodeId: 'change_capture', targetNodeId: 'replication_pipeline', direction: 'forward', label: 'Replicate commit stream', detailLevel: 2 },
      { id: 'e80', sourceNodeId: 'replication_pipeline', targetNodeId: 'secondary_payment_store', direction: 'forward', label: 'Apply payment state', detailLevel: 2 },
      { id: 'e81', sourceNodeId: 'replication_pipeline', targetNodeId: 'secondary_journal_store', direction: 'forward', label: 'Apply journal state', detailLevel: 2 },
      { id: 'e82', sourceNodeId: 'api_gateway', targetNodeId: 'payment_home_region', direction: 'forward', label: 'Resolve write region', detailLevel: 2 },
      { id: 'e83', sourceNodeId: 'failover_controller', targetNodeId: 'writer_epoch_guard', direction: 'forward', label: 'Issue writer epoch', detailLevel: 2 },
      { id: 'e84', sourceNodeId: 'failover_controller', targetNodeId: 'global_dns', direction: 'forward', label: 'Shift traffic', detailLevel: 2 },
      { id: 'e85', sourceNodeId: 'writer_epoch_guard', targetNodeId: 'secondary_journal_store', direction: 'forward', label: 'Permit ledger writing', detailLevel: 2 },
      { id: 'e86', sourceNodeId: 'secondary_payment_store', targetNodeId: 'recovery_replayer', direction: 'forward', label: 'Provide replicated payments', detailLevel: 2 },
      { id: 'e87', sourceNodeId: 'secondary_journal_store', targetNodeId: 'recovery_replayer', direction: 'forward', label: 'Provide replicated journal', detailLevel: 2 },
      { id: 'e88', sourceNodeId: 'recovery_replayer', targetNodeId: 'provider_reconciliation_guard', direction: 'forward', label: 'Inspect operations status', detailLevel: 2 },
      { id: 'e89', sourceNodeId: 'provider_reconciliation_guard', targetNodeId: 'acquirer_connector_a', direction: 'forward', label: 'Query provider status', detailLevel: 2 },
      { id: 'e90', sourceNodeId: 'recovery_replayer', targetNodeId: 'payment_event_bus', direction: 'forward', label: 'Resume events', detailLevel: 2 },
      { id: 'e91', sourceNodeId: 'api_gateway', targetNodeId: 'telemetry_collector', direction: 'forward', label: 'API metrics logs', detailLevel: 2 },
      { id: 'e92', sourceNodeId: 'payment_orchestrator', targetNodeId: 'telemetry_collector', direction: 'forward', label: 'Payment metrics logs', detailLevel: 2 },
      { id: 'e93', sourceNodeId: 'connector_manager', targetNodeId: 'telemetry_collector', direction: 'forward', label: 'Provider latency metrics', detailLevel: 2 },
      { id: 'e94', sourceNodeId: 'ledger_command_service', targetNodeId: 'telemetry_collector', direction: 'forward', label: 'Ledger metrics log', detailLevel: 2 },
      { id: 'e95', sourceNodeId: 'reconciliation_engine', targetNodeId: 'telemetry_collector', direction: 'forward', label: 'Reconciliation telemetry', detailLevel: 2 },
      { id: 'e96', sourceNodeId: 'telemetry_collector', targetNodeId: 'metrics_store', direction: 'forward', label: 'Export metrics logs', detailLevel: 2 },
      { id: 'e97', sourceNodeId: 'metrics_store', targetNodeId: 'dashboards', direction: 'forward', label: 'Operational dashboards', detailLevel: 2 },
      { id: 'e98', sourceNodeId: 'metrics_store', targetNodeId: 'alerting', direction: 'forward', label: 'Evaluate SLO alerts', detailLevel: 2 },
      { id: 'e99', sourceNodeId: 'merchant_auth', targetNodeId: 'audit_archive', direction: 'forward', label: 'Record admin changes', detailLevel: 2 },
      { id: 'e100', sourceNodeId: 'ledger_command_service', targetNodeId: 'audit_archive', direction: 'forward', label: 'Record ledger correction controls', detailLevel: 2 },
      { id: 'e101', sourceNodeId: 'secrets_manager', targetNodeId: 'connector_manager', direction: 'forward', label: 'Provide credentials', detailLevel: 2 },
      { id: 'e102', sourceNodeId: 'access_control', targetNodeId: 'merchant_ops', direction: 'forward', label: 'Enforce access policy', detailLevel: 2 },
      { id: 'e103', sourceNodeId: 'compliance_policy', targetNodeId: 'token_vault', direction: 'forward', label: 'Apply PCI scope', detailLevel: 2 },
      { id: 'e104', sourceNodeId: 'compliance_policy', targetNodeId: 'event_archive', direction: 'forward', label: 'Apply policy controls', detailLevel: 2 },
      { id: 'e105', sourceNodeId: 'capacity_controller', targetNodeId: 'api_gateway', direction: 'forward', label: 'Autoscale edge', detailLevel: 2 },
      { id: 'e106', sourceNodeId: 'capacity_controller', targetNodeId: 'payment_event_bus', direction: 'forward', label: 'Rebalance event partitions', detailLevel: 2 },
      { id: 'e107', sourceNodeId: 'synthetic_payments', targetNodeId: 'global_dns', direction: 'forward', label: 'Run probes checks', detailLevel: 2 },
      { id: 'e108', sourceNodeId: 'synthetic_payments', targetNodeId: 'webhook_delivery', direction: 'forward', label: 'Verify webhooks', detailLevel: 2 },
      { id: 'e109', sourceNodeId: 'incident_timeline', targetNodeId: 'dashboards', direction: 'forward', label: 'Overlay events timelines', detailLevel: 2 }
    ],
    groups: [
      { id: 'channels', label: 'Customers, Merchants and Operations', x: -1850, y: -500, w: 360, h: 980, accent: 'blue' },
      { id: 'global_edge', label: 'Global Edge and Merchant API Layer', x: -1050, y: -500, w: 1250, h: 980, accent: 'orange' },
      { id: 'payment_control', label: 'Payment Control Plane', x: 500, y: -500, w: 1500, h: 1180, accent: 'purple' },
      { id: 'pci_external', label: 'PCI Zone and External Payment Rails', x: 2350, y: -500, w: 1450, h: 1180, accent: 'purple' },
      { id: 'ledger_accounting', label: 'Immutable Accounting, Balances and Merchant Events', x: 4150, y: -500, w: 1550, h: 1250, accent: 'orange' },
      { id: 'settlement_reconciliation', label: 'Clearing, Settlement and Reconciliation', x: 4150, y: 950, w: 1550, h: 950, accent: 'green' },
      { id: 'continuity', label: 'Regional Continuity and Write Fencing', x: 6000, y: -500, w: 1350, h: 1020, accent: 'blue' },
      { id: 'operations', label: 'Observability, Security and Governance', x: 6000, y: 750, w: 1350, h: 1150, accent: 'slate' }
    ],
    scenarios: [
      {
        id: 'card_auth',
        name: 'Card Auth & Ledger Commit',
        description: 'Happy path execution mapping card authorization and transactional double-entry ledger writing.',
        steps: [
          { stepIndex: 1, focusNodeIds: ['customer', 'merchant_checkout', 'merchant_backend', 'global_dns', 'waf_ddos', 'api_gateway'], pulseEdgeIds: ['e01', 'e02', 'e03', 'e05', 'e06'], notes: 'Customer enters card data; backend initiates payment request.' },
          { stepIndex: 2, focusNodeIds: ['merchant_auth', 'distributed_rate_limiter', 'request_normalizer', 'idempotency_service', 'idempotency_store'], pulseEdgeIds: ['e07', 'e09', 'e10', 'e11', 'e12'], notes: 'System authenticates request, verifies idempotency key and normalized attributes.' },
          { stepIndex: 3, focusNodeIds: ['payment_orchestrator', 'payment_state_machine', 'fraud_engine', 'tokenization_service', 'token_vault', 'hsm_cluster'], pulseEdgeIds: ['e13', 'e14', 'e15', 'e16', 'e17', 'e18', 'e19'], notes: 'Payment risk assessed; PAN mappings resolved securely inside HSM token vault.' },
          { stepIndex: 4, focusNodeIds: ['routing_engine', 'provider_status_store', 'connector_manager', 'acquirer_connector_a', 'card_network', 'issuer_bank'], pulseEdgeIds: ['e23', 'e24', 'e25', 'e26', 'e30', 'e32', 'e33', 'e34', 'e35', 'e36'], notes: 'Processor auth request is submitted and accepted by the issuer bank.' },
          { stepIndex: 5, focusNodeIds: ['payment_orchestrator', 'payment_repository', 'payment_outbox', 'idempotency_service'], pulseEdgeIds: ['e41', 'e42', 'e44'], notes: 'Saves attempt state and queues transactional outbox event.' },
          { stepIndex: 6, focusNodeIds: ['payment_outbox', 'payment_event_bus', 'ledger_command_service', 'journal_store', 'ledger_outbox'], pulseEdgeIds: ['e43', 'e45', 'e46', 'e47', 'e48'], notes: 'Ledger commits append-only double-entry debits and credits.' },
          { stepIndex: 7, focusNodeIds: ['payment_event_bus', 'balance_projector', 'balance_store', 'merchant_event_service', 'webhook_delivery', 'merchant_backend'], pulseEdgeIds: ['e49', 'e50', 'e51', 'e53', 'e54'], notes: 'Merchant notified via signed callback webhooks.' }
        ]
      },
      {
        id: 'ambiguous_timeout',
        name: 'Ambiguous Timeout & Recovery',
        description: 'Flow analysis of safety checks when processor timeouts happen.',
        steps: [
          { stepIndex: 1, focusNodeIds: ['connector_manager', 'acquirer_connector_a', 'ambiguity_resolver'], pulseEdgeIds: ['e26', 'e37'], notes: 'Processor request times out; state becomes ambiguous.' },
          { stepIndex: 2, focusNodeIds: ['ambiguity_resolver', 'acquirer_connector_a', 'provider_status_store'], pulseEdgeIds: ['e38', 'e24'], notes: 'Resolver queries the provider status directly before any retries.' },
          { stepIndex: 3, focusNodeIds: ['webhook_ingress', 'provider_callback_queue', 'payment_orchestrator', 'payment_repository'], pulseEdgeIds: ['e39', 'e40', 'e41'], notes: 'Provider callback applies outcome idempotently.' },
          { stepIndex: 4, focusNodeIds: ['payment_outbox', 'payment_event_bus', 'ledger_command_service', 'journal_store'], pulseEdgeIds: ['e43', 'e45', 'e46'], notes: 'Stores resolved entry, preventing duplicates.' }
        ]
      },
      {
        id: 'settlement',
        name: 'Settlement & Reconciliation',
        description: 'Reconciliation ledger and bank reports clearing.',
        steps: [
          { stepIndex: 1, focusNodeIds: ['settlement_scheduler', 'balance_store', 'payout_service', 'treasury_accounts'], pulseEdgeIds: ['e65', 'e66', 'e67'], notes: 'Scheduler pulls balances and initiates treasury payouts.' },
          { stepIndex: 2, focusNodeIds: ['payout_service', 'ledger_command_service', 'journal_store'], pulseEdgeIds: ['e68', 'e46'], notes: 'Payouts recorded in double-entry journal store.' },
          { stepIndex: 3, focusNodeIds: ['settlement_file_ingest', 'reconciliation_engine', 'journal_store', 'payment_repository'], pulseEdgeIds: ['e69', 'e70', 'e71'], notes: 'Ingested processor clearing logs matched with internal states.' },
          { stepIndex: 4, focusNodeIds: ['reconciliation_engine', 'reconciliation_store', 'exception_queue', 'finance_case_manager', 'finance_ops'], pulseEdgeIds: ['e72', 'e73', 'e74', 'e75'], notes: 'Exceptions queued and assigned to cases.' }
        ]
      },
      {
        id: 'regional_failover',
        name: 'Regional Failover & Fencing',
        description: 'Failover transition with active ledger write fencing.',
        steps: [
          { stepIndex: 1, focusNodeIds: ['payment_repository', 'journal_store', 'change_capture', 'replication_pipeline', 'secondary_payment_store', 'secondary_journal_store'], pulseEdgeIds: ['e77', 'e78', 'e79', 'e80', 'e81'], notes: 'Committed ledger data continuously replicated to backup region.' },
          { stepIndex: 2, focusNodeIds: ['failover_controller', 'writer_epoch_guard', 'global_dns'], pulseEdgeIds: ['e83', 'e84'], notes: 'Traffic shifted after writer epoch fencing completes.' },
          { stepIndex: 3, focusNodeIds: ['writer_epoch_guard', 'secondary_journal_store', 'secondary_payment_store', 'recovery_replayer'], pulseEdgeIds: ['e85', 'e86', 'e87'], notes: 'Secondary region claims authoritative single-writer status.' },
          { stepIndex: 4, focusNodeIds: ['recovery_replayer', 'provider_reconciliation_guard', 'acquirer_connector_a', 'payment_event_bus'], pulseEdgeIds: ['e88', 'e89', 'e90'], notes: 'Resolver queries providers before resuming outbox replay.' }
        ]
      }
    ]
  },
  {
    version: '1.0.0',
    id: 'simple-notification-service',
    kind: 'architecture',
    title: 'Simple Notification Service',
    description: 'A beginner-friendly cloud notification service architecture capable of processing multi-channel notifications (email, SMS, push) asynchronously.',
    metadata: {
      complexity: 'Starter',
      provider: 'agnostic',
      technologies: ['Shopify', 'RabbitMQ', 'PostgreSQL', 'Elasticsearch', 'Twilio', 'SendGrid', 'Datadog'],
      tags: ['notifications', 'email', 'sms', 'push', 'queue'],
      detailLevels: ['Executive', 'Engineering']
    },
    nodes: [
      { id: 'order_service', semanticType: 'service', label: 'Order Service', technology: 'Event Producer', icon: 'logos:shopify', position: { x: 130, y: 280 }, size: { w: 240, h: 110 }, detailLevel: 1, properties: {}, parentGroupId: 'producers' },
      { id: 'account_service', semanticType: 'service', label: 'Account Service', technology: 'Event Producer', icon: 'lucide:user-round-cog', position: { x: 130, y: 500 }, size: { w: 240, h: 110 }, detailLevel: 1, properties: {}, parentGroupId: 'producers' },
      { id: 'admin_panel', semanticType: 'client', label: 'Admin Panel', technology: 'Operator Dashboard', icon: 'lucide:panel-top', position: { x: 130, y: 720 }, size: { w: 240, h: 110 }, detailLevel: 1, properties: {}, parentGroupId: 'producers' },
      { id: 'notification_api', semanticType: 'service', label: 'Notification API', technology: 'Ingress Controller', icon: 'lucide:bell-ring', position: { x: 590, y: 360 }, size: { w: 240, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'api' },
      { id: 'template_service', semanticType: 'service', label: 'Template Service', technology: 'Handlebars Engine', icon: 'lucide:file-text', position: { x: 590, y: 600 }, size: { w: 240, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'api' },
      { id: 'notification_queue', semanticType: 'queue', label: 'Notification Queue', technology: 'AMQP Exchange Broker', icon: 'logos:rabbitmq-icon', position: { x: 1040, y: 250 }, size: { w: 260, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'processing' },
      { id: 'notification_worker', semanticType: 'service', label: 'Notification Worker', technology: 'Node.js Consumer', icon: 'logos:nodejs-icon', position: { x: 1040, y: 500 }, size: { w: 260, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'processing' },
      { id: 'retry_queue', semanticType: 'queue', label: 'Retry Queue', technology: 'DLQ with Backoff', icon: 'logos:rabbitmq-icon', position: { x: 1040, y: 750 }, size: { w: 260, h: 120 }, detailLevel: 2, properties: {}, parentGroupId: 'processing' },
      { id: 'email_provider', semanticType: 'external', label: 'Email Provider', technology: 'SendGrid API Delivery', icon: 'logos:sendgrid-icon', position: { x: 1560, y: 240 }, size: { w: 250, h: 110 }, detailLevel: 1, properties: {}, parentGroupId: 'providers' },
      { id: 'sms_provider', semanticType: 'external', label: 'SMS Provider', technology: 'Twilio SMS API Gateway', icon: 'logos:twilio', position: { x: 1560, y: 470 }, size: { w: 250, h: 110 }, detailLevel: 1, properties: {}, parentGroupId: 'providers' },
      { id: 'push_provider', semanticType: 'external', label: 'Push Provider', technology: 'Firebase Cloud Messaging', icon: 'logos:firebase', position: { x: 1560, y: 700 }, size: { w: 250, h: 110 }, detailLevel: 1, properties: {}, parentGroupId: 'providers' },
      { id: 'notification_db', semanticType: 'db', label: 'Notification Database', technology: 'PostgreSQL Relational DB', icon: 'logos:postgresql', position: { x: 2010, y: 330 }, size: { w: 210, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'storage' },
      { id: 'delivery_log', semanticType: 'db', label: 'Delivery Log', technology: 'Elasticsearch Index', icon: 'logos:elasticsearch', position: { x: 2010, y: 550 }, size: { w: 210, h: 120 }, detailLevel: 2, properties: {}, parentGroupId: 'storage' },
      { id: 'monitoring', semanticType: 'service', label: 'Monitoring', technology: 'Datadog Agent & Dashboards', icon: 'logos:datadog', position: { x: 2010, y: 770 }, size: { w: 210, h: 120 }, detailLevel: 2, properties: {}, parentGroupId: 'storage' }
    ],
    edges: [
      { id: 'e01', sourceNodeId: 'order_service', targetNodeId: 'notification_api', direction: 'forward', label: 'Order confirmation event', detailLevel: 1 },
      { id: 'e02', sourceNodeId: 'account_service', targetNodeId: 'notification_api', direction: 'forward', label: 'Password reset event', detailLevel: 1 },
      { id: 'e03', sourceNodeId: 'admin_panel', targetNodeId: 'notification_api', direction: 'forward', label: 'Send campaign', detailLevel: 1 },
      { id: 'e04', sourceNodeId: 'notification_api', targetNodeId: 'template_service', direction: 'forward', label: 'Load message template', detailLevel: 1 },
      { id: 'e05', sourceNodeId: 'template_service', targetNodeId: 'notification_db', direction: 'forward', label: 'Read template and preferences', detailLevel: 1 },
      { id: 'e06', sourceNodeId: 'notification_api', targetNodeId: 'notification_queue', direction: 'forward', label: 'Publish notification job', detailLevel: 1 },
      { id: 'e07', sourceNodeId: 'notification_queue', targetNodeId: 'notification_worker', direction: 'forward', label: 'Consume job', detailLevel: 1 },
      { id: 'e08', sourceNodeId: 'notification_worker', targetNodeId: 'email_provider', direction: 'forward', label: 'Send email', detailLevel: 1 },
      { id: 'e09', sourceNodeId: 'notification_worker', targetNodeId: 'sms_provider', direction: 'forward', label: 'Send SMS', detailLevel: 1 },
      { id: 'e10', sourceNodeId: 'notification_worker', targetNodeId: 'push_provider', direction: 'forward', label: 'Send push notification', detailLevel: 1 },
      { id: 'e11', sourceNodeId: 'email_provider', targetNodeId: 'delivery_log', direction: 'forward', label: 'Delivery result', detailLevel: 2 },
      { id: 'e12', sourceNodeId: 'sms_provider', targetNodeId: 'delivery_log', direction: 'forward', label: 'Delivery result', detailLevel: 2 },
      { id: 'e13', sourceNodeId: 'push_provider', targetNodeId: 'delivery_log', direction: 'forward', label: 'Delivery result', detailLevel: 2 },
      { id: 'e14', sourceNodeId: 'notification_worker', targetNodeId: 'retry_queue', direction: 'forward', label: 'Temporary failure', detailLevel: 2 },
      { id: 'e15', sourceNodeId: 'retry_queue', targetNodeId: 'notification_worker', direction: 'forward', label: 'Retry with backoff', detailLevel: 2 },
      { id: 'e16', sourceNodeId: 'notification_worker', targetNodeId: 'notification_db', direction: 'forward', label: 'Update notification status', detailLevel: 1 },
      { id: 'e17', sourceNodeId: 'delivery_log', targetNodeId: 'monitoring', direction: 'forward', label: 'Metrics and failure counts', detailLevel: 2 }
    ],
    groups: [
      { id: 'producers', label: 'Event Producers', x: 80, y: 170, w: 360, h: 760, accent: 'blue' },
      { id: 'api', label: 'Notification API', x: 530, y: 250, w: 360, h: 600, accent: 'orange' },
      { id: 'processing', label: 'Processing', x: 980, y: 130, w: 430, h: 850, accent: 'purple' },
      { id: 'providers', label: 'Delivery Providers', x: 1500, y: 110, w: 390, h: 900, accent: 'red' },
      { id: 'storage', label: 'Storage and Monitoring', x: 1980, y: 220, w: 270, h: 700, accent: 'slate' }
    ],
    scenarios: [
      {
        id: 'send_notification',
        name: 'Send Notification Flow',
        description: 'Guided walkthrough of the notification delivery pipeline.',
        steps: [
          { stepIndex: 1, focusNodeIds: ['notification_api', 'template_service'], pulseEdgeIds: ['e04'], notes: 'Validate the request and render the template.' },
          { stepIndex: 2, focusNodeIds: ['notification_queue', 'notification_worker'], pulseEdgeIds: ['e06', 'e07'], notes: 'Process the message asynchronously.' },
          { stepIndex: 3, focusNodeIds: ['email_provider', 'sms_provider', 'push_provider'], pulseEdgeIds: ['e08', 'e09', 'e10'], notes: 'Deliver through the selected channel.' },
          { stepIndex: 4, focusNodeIds: ['delivery_log', 'notification_db'], pulseEdgeIds: ['e11', 'e12', 'e13', 'e16'], notes: 'Store the delivery result.' }
        ]
      }
    ]
  },
  {
    version: '1.0.0',
    id: 'image-upload-processing',
    kind: 'architecture',
    title: 'Image Upload and Processing Pipeline',
    description: 'An intermediate media processing architecture displaying multi-worker validation, resizing, CDN delivery caching and metadata indexing.',
    metadata: {
      complexity: 'Team',
      provider: 'agnostic',
      technologies: ['NodeJS', 'Python', 'Rust', 'Go', 'S3', 'RabbitMQ', 'Cloudflare', 'MongoDB', 'Datadog'],
      tags: ['image-upload', 'object-storage', 'queue', 'cdn'],
      detailLevels: ['Executive', 'Engineering']
    },
    nodes: [
      { id: 'user', semanticType: 'client', label: 'User', technology: 'Client Browser', icon: 'lucide:user', position: { x: 115, y: 350 }, size: { w: 220, h: 110 }, detailLevel: 1, properties: {}, parentGroupId: 'clients' },
      { id: 'web_app', semanticType: 'client', label: 'Web or Mobile App', technology: 'Frontend Interface', icon: 'lucide:monitor-smartphone', position: { x: 115, y: 590 }, size: { w: 220, h: 110 }, detailLevel: 1, properties: {}, parentGroupId: 'clients' },
      { id: 'api_gateway', semanticType: 'service', label: 'API Gateway', technology: 'AWS API Gateway', icon: 'logos:aws-api-gateway', position: { x: 520, y: 300 }, size: { w: 250, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'api' },
      { id: 'upload_service', semanticType: 'service', label: 'Upload Service', technology: 'Node.js Endpoint', icon: 'logos:nodejs-icon', position: { x: 520, y: 550 }, size: { w: 250, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'api' },
      { id: 'metadata_service', semanticType: 'service', label: 'Metadata Service', technology: 'Python Endpoint', icon: 'logos:python', position: { x: 520, y: 780 }, size: { w: 250, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'api' },
      { id: 'source_storage', semanticType: 'db', label: 'Source Image Storage', technology: 'AWS S3 Ingest', icon: 'logos:aws-s3', position: { x: 990, y: 240 }, size: { w: 260, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'ingest' },
      { id: 'upload_events', semanticType: 'queue', label: 'Upload Event Queue', technology: 'RabbitMQ Event Queue', icon: 'logos:rabbitmq-icon', position: { x: 990, y: 500 }, size: { w: 260, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'ingest' },
      { id: 'validation_worker', semanticType: 'service', label: 'Validation Worker', technology: 'Rust Checker', icon: 'logos:rust', position: { x: 990, y: 760 }, size: { w: 260, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'ingest' },
      { id: 'resize_worker', semanticType: 'service', label: 'Resize Worker', technology: 'Sharp Image Node.js', icon: 'logos:nodejs-icon', position: { x: 1500, y: 240 }, size: { w: 260, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'processing' },
      { id: 'optimization_worker', semanticType: 'service', label: 'Optimization Worker', technology: 'Go Optimizer', icon: 'logos:go', position: { x: 1500, y: 500 }, size: { w: 260, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'processing' },
      { id: 'processed_storage', semanticType: 'db', label: 'Processed Image Storage', technology: 'AWS S3 Output', icon: 'logos:aws-s3', position: { x: 1500, y: 760 }, size: { w: 260, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'processing' },
      { id: 'cdn', semanticType: 'service', label: 'Image CDN', technology: 'Cloudflare Edge CDN', icon: 'logos:cloudflare', position: { x: 2000, y: 280 }, size: { w: 230, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'delivery' },
      { id: 'metadata_db', semanticType: 'db', label: 'Metadata Database', technology: 'MongoDB Atlas NoSQL', icon: 'logos:mongodb-icon', position: { x: 2000, y: 540 }, size: { w: 230, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'delivery' },
      { id: 'monitoring', semanticType: 'service', label: 'Monitoring', technology: 'Datadog metrics dashboards', icon: 'logos:datadog', position: { x: 2000, y: 800 }, size: { w: 230, h: 120 }, detailLevel: 2, properties: {}, parentGroupId: 'delivery' }
    ],
    edges: [
      { id: 'e01', sourceNodeId: 'user', targetNodeId: 'web_app', direction: 'forward', label: 'Select image', detailLevel: 1 },
      { id: 'e02', sourceNodeId: 'web_app', targetNodeId: 'api_gateway', direction: 'forward', label: 'Request upload session', detailLevel: 1 },
      { id: 'e03', sourceNodeId: 'api_gateway', targetNodeId: 'upload_service', direction: 'forward', label: 'Create upload URL', detailLevel: 1 },
      { id: 'e04', sourceNodeId: 'upload_service', targetNodeId: 'web_app', direction: 'forward', label: 'Return signed upload URL', detailLevel: 1 },
      { id: 'e05', sourceNodeId: 'web_app', targetNodeId: 'source_storage', direction: 'forward', label: 'Upload original image', detailLevel: 1 },
      { id: 'e06', sourceNodeId: 'source_storage', targetNodeId: 'upload_events', direction: 'forward', label: 'Object-created event', detailLevel: 1 },
      { id: 'e07', sourceNodeId: 'upload_events', targetNodeId: 'validation_worker', direction: 'forward', label: 'Validate image', detailLevel: 1 },
      { id: 'e08', sourceNodeId: 'validation_worker', targetNodeId: 'resize_worker', direction: 'forward', label: 'Valid image', detailLevel: 1 },
      { id: 'e09', sourceNodeId: 'validation_worker', targetNodeId: 'monitoring', direction: 'forward', label: 'Invalid image alert', detailLevel: 2 },
      { id: 'e10', sourceNodeId: 'resize_worker', targetNodeId: 'optimization_worker', direction: 'forward', label: 'Create size variants', detailLevel: 1 },
      { id: 'e11', sourceNodeId: 'optimization_worker', targetNodeId: 'processed_storage', direction: 'forward', label: 'Write WebP and thumbnails', detailLevel: 1 },
      { id: 'e12', sourceNodeId: 'processed_storage', targetNodeId: 'cdn', direction: 'forward', label: 'Serve cached images', detailLevel: 1 },
      { id: 'e13', sourceNodeId: 'metadata_service', targetNodeId: 'metadata_db', direction: 'forward', label: 'Store image metadata', detailLevel: 1 },
      { id: 'e14', sourceNodeId: 'optimization_worker', targetNodeId: 'metadata_service', direction: 'forward', label: 'Publish processing result', detailLevel: 1 },
      { id: 'e15', sourceNodeId: 'web_app', targetNodeId: 'cdn', direction: 'forward', label: 'Request image', detailLevel: 1 },
      { id: 'e16', sourceNodeId: 'cdn', targetNodeId: 'web_app', direction: 'forward', label: 'Deliver optimized image', detailLevel: 1 },
      { id: 'e17', sourceNodeId: 'resize_worker', targetNodeId: 'monitoring', direction: 'forward', label: 'Processing metrics', detailLevel: 2 },
      { id: 'e18', sourceNodeId: 'optimization_worker', targetNodeId: 'monitoring', direction: 'forward', label: 'Optimization metrics', detailLevel: 2 }
    ],
    groups: [
      { id: 'clients', label: 'Clients', x: 70, y: 220, w: 300, h: 650, accent: 'blue' },
      { id: 'api', label: 'API Layer', x: 460, y: 180, w: 380, h: 720, accent: 'orange' },
      { id: 'ingest', label: 'Upload and Ingest', x: 930, y: 120, w: 420, h: 850, accent: 'purple' },
      { id: 'processing', label: 'Image Processing', x: 1440, y: 120, w: 420, h: 850, accent: 'red' },
      { id: 'delivery', label: 'Delivery and Data', x: 1950, y: 160, w: 330, h: 800, accent: 'slate' }
    ],
    scenarios: [
      {
        id: 'upload_and_process',
        name: 'Upload & Process Flow',
        description: 'Chronological timeline of image processing workers.',
        steps: [
          { stepIndex: 1, focusNodeIds: ['web_app', 'upload_service'], pulseEdgeIds: ['e02', 'e03'], notes: 'The client requests a signed upload URL.' },
          { stepIndex: 2, focusNodeIds: ['source_storage', 'upload_events'], pulseEdgeIds: ['e05', 'e06'], notes: 'The original image is uploaded and triggers processing.' },
          { stepIndex: 3, focusNodeIds: ['validation_worker', 'resize_worker', 'optimization_worker'], pulseEdgeIds: ['e07', 'e08', 'e10'], notes: 'Validate, resize, and optimize the image.' },
          { stepIndex: 4, focusNodeIds: ['processed_storage', 'cdn'], pulseEdgeIds: ['e11', 'e12'], notes: 'Store and deliver optimized variants.' }
        ]
      }
    ]
  },
  {
    version: '1.0.0',
    id: 'simple-url-shortener',
    kind: 'architecture',
    title: 'Simple URL Shortener',
    description: 'A starter distributed systems architecture showing domain routing, rate limiting, distributed short ID generation, fast cache lookups and asynchronous analytics.',
    metadata: {
      complexity: 'Starter',
      provider: 'agnostic',
      technologies: ['Cloudflare', 'NGINX', 'Kong', 'NodeJS', 'Go', 'Rust', 'Redis', 'PostgreSQL', 'Kafka', 'Python', 'ClickHouse'],
      tags: ['url-shortener', 'cache', 'redirect', 'analytics'],
      detailLevels: ['Executive', 'Engineering']
    },
    nodes: [
      { id: 'user', semanticType: 'client', label: 'User', technology: 'Client Browser', icon: 'lucide:user', position: { x: 120, y: 280 }, size: { w: 220, h: 110 }, detailLevel: 1, properties: {}, parentGroupId: 'clients' },
      { id: 'browser', semanticType: 'client', label: 'Web or Mobile App', technology: 'Frontend App', icon: 'lucide:monitor-smartphone', position: { x: 120, y: 500 }, size: { w: 220, h: 110 }, detailLevel: 1, properties: {}, parentGroupId: 'clients' },
      { id: 'dns', semanticType: 'service', label: 'DNS', technology: 'Cloudflare DNS', icon: 'logos:cloudflare', position: { x: 520, y: 260 }, size: { w: 220, h: 110 }, detailLevel: 1, properties: {}, parentGroupId: 'edge_layer' },
      { id: 'load_balancer', semanticType: 'service', label: 'Load Balancer', technology: 'NGINX proxy', icon: 'logos:nginx', position: { x: 520, y: 480 }, size: { w: 220, h: 110 }, detailLevel: 1, properties: {}, parentGroupId: 'edge_layer' },
      { id: 'api_gateway', semanticType: 'service', label: 'API Gateway', technology: 'Kong Gateway', icon: 'logos:kong', position: { x: 520, y: 700 }, size: { w: 220, h: 110 }, detailLevel: 1, properties: {}, parentGroupId: 'edge_layer' },
      { id: 'shortener_service', semanticType: 'service', label: 'Shortener Service', technology: 'Node.js service', icon: 'logos:nodejs-icon', position: { x: 980, y: 250 }, size: { w: 260, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'application' },
      { id: 'redirect_service', semanticType: 'service', label: 'Redirect Service', technology: 'Go redirect engine', icon: 'logos:go', position: { x: 980, y: 500 }, size: { w: 260, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'application' },
      { id: 'id_generator', semanticType: 'service', label: 'ID Generator', technology: 'Rust ID Factory', icon: 'logos:rust', position: { x: 980, y: 750 }, size: { w: 260, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'application' },
      { id: 'cache', semanticType: 'db', label: 'Redis Cache', technology: 'Redis Memory Store', icon: 'logos:redis', position: { x: 1520, y: 250 }, size: { w: 250, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'data' },
      { id: 'url_database', semanticType: 'db', label: 'URL Database', technology: 'PostgreSQL Relational DB', icon: 'logos:postgresql', position: { x: 1520, y: 500 }, size: { w: 250, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'data' },
      { id: 'event_queue', semanticType: 'queue', label: 'Click Event Queue', technology: 'Apache Kafka Event Buffer', icon: 'logos:kafka-icon', position: { x: 1520, y: 750 }, size: { w: 250, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'data' },
      { id: 'analytics_worker', semanticType: 'service', label: 'Analytics Worker', technology: 'Python Stream Reader', icon: 'logos:python', position: { x: 1950, y: 470 }, size: { w: 210, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'analytics' },
      { id: 'analytics_db', semanticType: 'db', label: 'Analytics Store', technology: 'ClickHouse Column DB', icon: 'logos:clickhouse', position: { x: 1950, y: 650 }, size: { w: 210, h: 120 }, detailLevel: 1, properties: {}, parentGroupId: 'analytics' }
    ],
    edges: [
      { id: 'e01', sourceNodeId: 'user', targetNodeId: 'browser', direction: 'forward', label: 'Enter long URL or open short URL', detailLevel: 1 },
      { id: 'e02', sourceNodeId: 'browser', targetNodeId: 'dns', direction: 'forward', label: 'Resolve domain', detailLevel: 1 },
      { id: 'e03', sourceNodeId: 'dns', targetNodeId: 'load_balancer', direction: 'forward', label: 'Route request', detailLevel: 1 },
      { id: 'e04', sourceNodeId: 'load_balancer', targetNodeId: 'api_gateway', direction: 'forward', label: 'Forward request', detailLevel: 1 },
      { id: 'e05', sourceNodeId: 'api_gateway', targetNodeId: 'shortener_service', direction: 'forward', label: 'Create short URL', detailLevel: 1 },
      { id: 'e06', sourceNodeId: 'shortener_service', targetNodeId: 'id_generator', direction: 'forward', label: 'Generate short code', detailLevel: 1 },
      { id: 'e07', sourceNodeId: 'shortener_service', targetNodeId: 'url_database', direction: 'forward', label: 'Store URL mapping', detailLevel: 1 },
      { id: 'e08', sourceNodeId: 'shortener_service', targetNodeId: 'cache', direction: 'forward', label: 'Warm cache', detailLevel: 1 },
      { id: 'e09', sourceNodeId: 'api_gateway', targetNodeId: 'redirect_service', direction: 'forward', label: 'Resolve short URL', detailLevel: 1 },
      { id: 'e10', sourceNodeId: 'redirect_service', targetNodeId: 'cache', direction: 'forward', label: 'Read cached URL', detailLevel: 1 },
      { id: 'e11', sourceNodeId: 'cache', targetNodeId: 'url_database', direction: 'forward', label: 'Cache miss', detailLevel: 2 },
      { id: 'e12', sourceNodeId: 'redirect_service', targetNodeId: 'browser', direction: 'forward', label: 'HTTP 301 or 302 redirect', detailLevel: 1 },
      { id: 'e13', sourceNodeId: 'redirect_service', targetNodeId: 'event_queue', direction: 'forward', label: 'Publish click event', detailLevel: 1 },
      { id: 'e14', sourceNodeId: 'event_queue', targetNodeId: 'analytics_worker', direction: 'forward', label: 'Consume events', detailLevel: 1 },
      { id: 'e15', sourceNodeId: 'analytics_worker', targetNodeId: 'analytics_db', direction: 'forward', label: 'Store aggregated metrics', detailLevel: 1 }
    ],
    groups: [
      { id: 'clients', label: 'Clients', x: 80, y: 180, w: 300, h: 680, accent: 'blue' },
      { id: 'edge_layer', label: 'Edge Layer', x: 470, y: 180, w: 360, h: 680, accent: 'orange' },
      { id: 'application', label: 'Application Services', x: 920, y: 120, w: 430, h: 820, accent: 'purple' },
      { id: 'data', label: 'Data Layer', x: 1460, y: 120, w: 420, h: 820, accent: 'red' },
      { id: 'analytics', label: 'Analytics', x: 1940, y: 360, w: 240, h: 420, accent: 'slate' }
    ],
    scenarios: [
      {
        id: 'create_short_url',
        name: 'Create Short URL',
        description: 'Lifecycle of creating a short URL code.',
        steps: [
          { stepIndex: 1, focusNodeIds: ['browser', 'api_gateway'], pulseEdgeIds: ['e01', 'e02', 'e03', 'e04'], notes: 'Request reaches gateway.' },
          { stepIndex: 2, focusNodeIds: ['shortener_service', 'id_generator'], pulseEdgeIds: ['e05', 'e06'], notes: 'Generate a unique short code.' },
          { stepIndex: 3, focusNodeIds: ['url_database', 'cache'], pulseEdgeIds: ['e07', 'e08'], notes: 'Persist the mapping and warm the cache.' }
        ]
      },
      {
        id: 'open_short_url',
        name: 'Open Short URL',
        description: 'Lifecycle of redirecting and capturing analytics.',
        steps: [
          { stepIndex: 1, focusNodeIds: ['browser', 'redirect_service'], pulseEdgeIds: ['e09', 'e12'], notes: 'The redirect request reaches the redirect service.' },
          { stepIndex: 2, focusNodeIds: ['cache'], pulseEdgeIds: ['e10'], notes: 'Resolve from cache when possible.' },
          { stepIndex: 3, focusNodeIds: ['event_queue', 'analytics_worker'], pulseEdgeIds: ['e13', 'e14'], notes: 'Record the click asynchronously.' }
        ]
      }
    ]
  }
];
