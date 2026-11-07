import { createApp } from "vue";
import { applySavedFont } from "./fonts";
import App, { router } from "./App";
import "./index.css";

applySavedFont();
createApp(App).use(router).mount("#root");
