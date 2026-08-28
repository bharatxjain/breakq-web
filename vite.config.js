import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// GitHub Pages has no server-side rewrites, so a direct hit on a client route
// like /admin or /about 404s. Duplicating the built index.html as 404.html
// makes Pages serve the app shell for any unknown path (without changing the
// URL), and React Router renders the right page.
function spaFallback404() {
  let outDir = 'dist'
  return {
    name: 'spa-fallback-404',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const index = path.resolve(outDir, 'index.html')
      if (fs.existsSync(index)) {
        fs.copyFileSync(index, path.resolve(outDir, '404.html'))
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), spaFallback404()],
})
