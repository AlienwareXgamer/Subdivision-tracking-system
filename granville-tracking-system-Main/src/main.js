import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import "@fortawesome/fontawesome-free/css/all.css";
import "@fortawesome/fontawesome-free/js/all.js";



// createApp(App).use(router).mount('#app')

onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('User is logged in:', user);
      createApp(App)
        .use(router) // Ensure you use the router if you have one
        .mount('#app');
    } else {
      console.log('No user is logged in');
      createApp(App)
        .use(router)
        .mount('#app');
    }
});