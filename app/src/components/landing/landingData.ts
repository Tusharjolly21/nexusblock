export type Tier = {
  name: string
  price: string
  cadence: string
  tagline: string
  cta: string
  featured?: boolean
  features: string[]
}

export const TIERS: Tier[] = [
  {
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    tagline: 'For individuals and side projects.',
    cta: 'Start free',
    features: ['3 files', '3 AI credits', 'Unlimited guests', 'Diagram-as-code', '3000+ tech icons', 'Export PNG / SVG'],
  },
  {
    name: 'Pro',
    price: '$12',
    cadence: 'flat / month',
    tagline: 'For engineers who diagram daily.',
    cta: 'Go Pro',
    featured: true,
    features: ['Unlimited files', '40 AI credits', 'Real-time collaboration', 'Version history', 'Custom icons', 'PDF + Markdown export', 'Comments & tagging'],
  },
  {
    name: 'Team',
    price: '$29',
    cadence: 'flat / month',
    tagline: 'For teams keeping architecture honest.',
    cta: 'Start a team',
    features: ['Everything in Pro', '250 AI credits', 'Live infra sync + drift', 'Visual version diffs', 'GitHub integration', 'SAML SSO', 'Private & team files'],
  },
]

export type TemplateCard = {
  name: string
  kind: string
  icon: string
  accent: string
  stack: string[]
  metric: string
}

export const TEMPLATE_CARDS: TemplateCard[] = [
  { name: 'System architecture', kind: 'Cloud', icon: 'logos:cloudflare-icon', accent: '#f6821f', stack: ['logos:nextjs-icon', 'logos:nodejs-icon', 'logos:postgresql'], metric: '7 nodes' },
  { name: 'Microservices', kind: 'Cloud', icon: 'logos:kubernetes', accent: '#326ce5', stack: ['logos:docker-icon', 'logos:redis', 'logos:kafka-icon'], metric: '12 services' },
  { name: 'AWS reference', kind: 'Cloud', icon: 'logos:aws', accent: '#ff9900', stack: ['logos:aws-lambda', 'logos:aws-s3', 'logos:aws-dynamodb'], metric: 'Well-architected' },
  { name: 'Kubernetes cluster', kind: 'Infra', icon: 'logos:kubernetes', accent: '#326ce5', stack: ['logos:helm', 'logos:prometheus', 'logos:grafana'], metric: '3 zones' },
  { name: 'Sequence diagram', kind: 'Flow', icon: 'logos:grpc', accent: '#244c5a', stack: ['logos:react', 'logos:fastapi-icon', 'logos:postgresql'], metric: 'Request trace' },
  { name: 'Entity relationship', kind: 'Data', icon: 'logos:postgresql', accent: '#336791', stack: ['logos:mysql', 'logos:mongodb-icon', 'logos:supabase-icon'], metric: '18 tables' },
  { name: 'Flowchart', kind: 'Flow', icon: 'logos:figma', accent: '#a259ff', stack: ['logos:notion-icon', 'logos:slack-icon', 'logos:linear-icon'], metric: 'Decision tree' },
  { name: 'Design doc', kind: 'Docs', icon: 'logos:markdown', accent: '#111111', stack: ['logos:github-icon', 'logos:notion-icon', 'logos:openai-icon'], metric: 'RFC ready' },
  { name: 'CI/CD pipeline', kind: 'Infra', icon: 'logos:github-actions', accent: '#2088ff', stack: ['logos:docker-icon', 'logos:terraform-icon', 'logos:vercel-icon'], metric: 'Deploy path' },
  { name: 'Event-driven', kind: 'Cloud', icon: 'logos:kafka-icon', accent: '#111111', stack: ['logos:rabbitmq-icon', 'logos:aws-sqs', 'logos:nats-icon'], metric: 'Async map' },
  { name: 'Network topology', kind: 'Infra', icon: 'logos:nginx', accent: '#009639', stack: ['logos:cloudflare-icon', 'logos:microsoft-azure', 'logos:google-cloud'], metric: 'Edge routes' },
  { name: 'Data pipeline', kind: 'Data', icon: 'logos:snowflake-icon', accent: '#29b5e8', stack: ['logos:dbt-icon', 'logos:airflow-icon', 'logos:bigquery-icon'], metric: 'Batch + stream' },
]
