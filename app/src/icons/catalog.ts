/**
 * Curated icon catalog, grouped into categories — the browse view of the icon
 * library (Eraser-style). Search hits the full Iconify index; this is just the
 * hand-picked "featured" set shown before the user types.
 *
 * All ids are Iconify names (mostly the `logos:` set). Any that don't resolve
 * simply render nothing — search covers the long tail.
 */
export type IconCategory = {
  name: string
  icons: string[]
}

export const ICON_CATEGORIES: IconCategory[] = [
  {
    name: 'Cloud',
    icons: [
      'logos:aws',
      'logos:google-cloud',
      'logos:microsoft-azure',
      'logos:digital-ocean',
      'logos:cloudflare-icon',
      'logos:vercel-icon',
      'logos:heroku-icon',
      'logos:netlify-icon',
    ],
  },
  {
    name: 'Containers & Infra',
    icons: [
      'logos:docker-icon',
      'logos:kubernetes',
      'logos:nginx',
      'logos:terraform-icon',
      'logos:ansible',
      'logos:helm',
      'logos:prometheus',
      'logos:grafana',
    ],
  },
  {
    name: 'Databases',
    icons: [
      'logos:postgresql',
      'logos:mysql',
      'logos:mongodb-icon',
      'logos:redis',
      'logos:sqlite',
      'logos:elasticsearch',
      'logos:supabase-icon',
      'logos:snowflake-icon',
    ],
  },
  {
    name: 'Messaging',
    icons: [
      'logos:kafka-icon',
      'logos:rabbitmq-icon',
      'logos:nats-icon',
      'logos:aws-sqs',
      'logos:google-cloud',
      'logos:celery-icon',
    ],
  },
  {
    name: 'Languages',
    icons: [
      'logos:javascript',
      'logos:typescript-icon',
      'logos:python',
      'logos:go',
      'logos:rust',
      'logos:java',
      'logos:ruby',
      'logos:php',
    ],
  },
  {
    name: 'Frameworks',
    icons: [
      'logos:react',
      'logos:nextjs-icon',
      'logos:vue',
      'logos:svelte-icon',
      'logos:nodejs-icon',
      'logos:django-icon',
      'logos:fastapi-icon',
      'logos:tailwindcss-icon',
    ],
  },
  {
    name: 'Tools & SaaS',
    icons: [
      'logos:github-icon',
      'logos:gitlab',
      'logos:stripe',
      'logos:slack-icon',
      'logos:sentry-icon',
      'logos:datadog',
      'logos:jira',
      'logos:figma',
    ],
  },
]
