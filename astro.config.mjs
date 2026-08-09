// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://sakhtanie.ir',
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Keep executable JavaScript in same-origin files so script-src 'self'
      // can be enforced without nonces, hashes, or unsafe-inline.
      assetsInlineLimit: 0,
    },
  },

  integrations: [sitemap()]
});
