import { injectAnalytics } from '@vercel/analytics/sveltekit';

injectAnalytics({ mode: import.meta.env.MODE === 'development' ? 'development' : 'production' });
