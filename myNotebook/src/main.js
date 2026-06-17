import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './stores'
import { icons } from '@/utils/icons'
import './style.css'

const faviconLink = document.querySelector("link[rel*='icon']") || document.createElement('link')
faviconLink.rel = 'icon'
faviconLink.type = 'image/png'
faviconLink.href = icons.favicon
document.head.appendChild(faviconLink)

const app = createApp(App)

app.use(pinia)
app.use(router)
app.mount('#app')
