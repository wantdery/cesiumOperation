import { createApp } from "vue";
import ElementPlus from "element-plus";
import router from "./router";
import "element-plus/dist/index.css";
import App from "./App.vue";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import "./style.css";

const app = createApp(App);
// app.config.globalProperties.$viewer = null;
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}
app.use(ElementPlus);
app.use(router);
app.mount("#app");
