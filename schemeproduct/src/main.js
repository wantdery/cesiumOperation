import "./assets/main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import "element-plus/dist/index.css";

import App from "./App.vue";
import router from "./router";

const app = createApp(App);
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.use(ElementPlus);
app.use(createPinia());
app.use(router);

const longpress = {
  beforeMount(el, binding) {
    // Make sure expression provided is a function
    if (typeof binding.value !== "function") {
      // pass warning to console
      const warn = `[longpress:] provided expression '${binding.expression}' is not a function, but has to be`;
      console.warn(warn);
    }

    // Define variable
    let pressTimer = null;
    let runTimer = null
    // Define funtion handlers
    // Create timeout ( run function after 1s )
    const start = (e) => {
      if (e.type === "click" && e.button !== 0) {
        return;
      }

      // if (pressTimer === null) {
      //   pressTimer = setTimeout(() => {
          // Run function
          handler(e);
      //   }, 700);
      // }
    };
    // Cancel Timeout
    const cancel = () => {
      // Check if timer has a value or not
      if (pressTimer !== null) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      if(runTimer!==null){
        clearInterval(runTimer)
        runTimer=null
      }
    };
    
    // Run Function
    const handler = (e) => {
      runTimer = setInterval(()=>{
        binding.value(e);
      },100)
    };

    // Add Event listeners
    el.addEventListener("mousedown", start);
    el.addEventListener("touchstart", start);
    // Cancel timeouts if this events happen
    el.addEventListener("click", cancel);
    el.addEventListener("mouseup", cancel);
    el.addEventListener("mouseout", cancel);
    el.addEventListener("touchend", cancel);
    el.addEventListener("touchcancel", cancel);

    el._longpress ={ start, cancel }
  },
  // unmounted(el) {
  //   const { start, cancel } = el._longpress;
  //   // 移除事件监听器
  //   el.removeEventListener("mousedown", start);
  //   el.removeEventListener("touchstart", start);
  //   el.removeEventListener("click", cancel);
  //   el.removeEventListener("mouseup", cancel);
  //   el.removeEventListener("mouseout", cancel);
  //   el.removeEventListener("touchend", cancel);
  //   el.removeEventListener("touchcancel", cancel);
  //   // 清理
  //   delete el._longpress;
  // }
};

app.directive('longpress', longpress);
app.mount("#app");
