import "./styles.css";
import { GameApp } from "./app/game-app";

const app = new GameApp();
app.start();
if (import.meta.hot) import.meta.hot.dispose(() => app.dispose());
