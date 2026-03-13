import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  ({ url }) => url.pathname.match(/\.(js|css|woff2?)$/),
  new CacheFirst({ cacheName: 'static-cache' })
)
