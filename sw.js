import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

precacheAndRoute(self.__WB_MANIFEST)

// Cache CSS and font files with CacheFirst strategy.
// JS files are intentionally excluded: app JS is already handled by
// precacheAndRoute above, and caching Worker scripts or their dynamic
// module imports via CacheFirst can cause opaque errors in Chrome when
// the cached Response lacks metadata the module loader expects.
registerRoute(
  ({ url }) => url.pathname.match(/\.(css|woff2?)$/),
  new CacheFirst({ cacheName: 'static-cache' })
)
