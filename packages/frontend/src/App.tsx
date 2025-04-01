import { useEffect, useState } from "react";
import "./App.css";
import { getSelf } from "./api/hello";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";

function App() {
  const [count, setCount] = useState(0);
  const [hello, setHello] = useState<string | null>(null);

  useEffect(() => {
    getSelf().then((data) => setHello(JSON.stringify(data)));
  }, []);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>{hello}</p>
      </div>
    </>
  );
}

export default App;
