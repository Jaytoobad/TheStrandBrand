import { PostHog } from 'npm:posthog-node/edge';

const projectToken = Deno.env.get('POSTHOG_PROJECT_TOKEN');
const apiHost = Deno.env.get('POSTHOG_HOST');

function createPostHogClient() {
  if (!projectToken && Deno.env.get('DENO_ENV') === 'development') {
    throw new Error('POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_PROJECT_TOKEN is configured');
  }
  if (!apiHost && Deno.env.get('DENO_ENV') === 'development') {
    throw new Error('POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_HOST is configured');
  }
  if (!projectToken || !apiHost) return null;

  return new PostHog(projectToken, { host: apiHost });
}

export async function captureServerEvent(
  distinctId: string | null,
  event: string,
  properties: Record<string, unknown>,
) {
  const client = createPostHogClient();
  if (!client || !distinctId) return;

  client.capture({ distinctId, event, properties });
  await client.shutdown();
}
