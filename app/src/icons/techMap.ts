/**
 * Map a technology keyword (from the DSL `[tech]` token or the node label) to a
 * real Iconify logo id, so compiled diagrams show actual tech icons instead of
 * generic glyphs. Unknown tech falls back to '' → the node's kind glyph.
 */
const TECH_ICONS: Record<string, string> = {
  // frameworks / runtimes
  nextjs: 'logos:nextjs-icon',
  next: 'logos:nextjs-icon',
  react: 'logos:react',
  vue: 'logos:vue',
  svelte: 'logos:svelte-icon',
  angular: 'logos:angular-icon',
  node: 'logos:nodejs-icon',
  nodejs: 'logos:nodejs-icon',
  express: 'logos:express',
  fastify: 'logos:fastify-icon',
  nestjs: 'logos:nestjs',
  django: 'logos:django-icon',
  flask: 'logos:flask',
  fastapi: 'logos:fastapi-icon',
  rails: 'logos:rails',
  spring: 'logos:spring-icon',
  graphql: 'logos:graphql',
  trpc: 'logos:trpc',
  // languages
  typescript: 'logos:typescript-icon',
  javascript: 'logos:javascript',
  python: 'logos:python',
  go: 'logos:go',
  golang: 'logos:go',
  rust: 'logos:rust',
  java: 'logos:java',
  ruby: 'logos:ruby',
  php: 'logos:php',
  // datastores
  postgres: 'logos:postgresql',
  postgresql: 'logos:postgresql',
  rds: 'logos:postgresql',
  mysql: 'logos:mysql',
  mariadb: 'logos:mariadb-icon',
  mongo: 'logos:mongodb-icon',
  mongodb: 'logos:mongodb-icon',
  redis: 'logos:redis',
  sqlite: 'logos:sqlite',
  elasticsearch: 'logos:elasticsearch',
  elastic: 'logos:elasticsearch',
  cassandra: 'logos:cassandra',
  dynamodb: 'logos:aws-dynamodb',
  supabase: 'logos:supabase-icon',
  firebase: 'logos:firebase',
  snowflake: 'logos:snowflake-icon',
  clickhouse: 'logos:clickhouse',
  // messaging / queues
  kafka: 'logos:kafka-icon',
  rabbitmq: 'logos:rabbitmq-icon',
  nats: 'logos:nats-icon',
  bullmq: 'logos:redis',
  sqs: 'logos:aws-sqs',
  celery: 'logos:celery-icon',
  // cloud / infra
  aws: 'logos:aws',
  s3: 'logos:aws-s3',
  lambda: 'logos:aws-lambda',
  gcp: 'logos:google-cloud',
  azure: 'logos:microsoft-azure',
  docker: 'logos:docker-icon',
  kubernetes: 'logos:kubernetes',
  k8s: 'logos:kubernetes',
  nginx: 'logos:nginx',
  terraform: 'logos:terraform-icon',
  cloudflare: 'logos:cloudflare-icon',
  vercel: 'logos:vercel-icon',
  netlify: 'logos:netlify-icon',
  heroku: 'logos:heroku-icon',
  // saas
  stripe: 'logos:stripe',
  github: 'logos:github-icon',
  gitlab: 'logos:gitlab',
  slack: 'logos:slack-icon',
  sentry: 'logos:sentry-icon',
  datadog: 'logos:datadog',
  auth0: 'logos:auth0-icon',
  clerk: 'logos:clerk',
  twilio: 'logos:twilio-icon',
  openai: 'logos:openai-icon',
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** All recognised `[tech]` tokens — used to power DSL autocomplete. */
export const TECH_KEYS: string[] = Object.keys(TECH_ICONS)

/**
 * Resolve the best Iconify id for a node. Tries the explicit `[tech]` token
 * first, then each word of the label. Returns '' when nothing matches.
 */
export function iconForTech(tech: string, label: string): string {
  const techKey = norm(tech)
  if (techKey && TECH_ICONS[techKey]) return TECH_ICONS[techKey]

  for (const word of label.split(/\s+/)) {
    const key = norm(word)
    if (key && TECH_ICONS[key]) return TECH_ICONS[key]
  }
  return ''
}
