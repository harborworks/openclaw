function App() {
  return (
    <>
      <style>{`
        :root {
          --navy: #0a1628;
          --white: #ffffff;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          color: var(--white);
          background: var(--navy);
          -webkit-font-smoothing: antialiased;
        }
      `}</style>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/logo.svg" alt="Harbor Works" width={36} height={36} />
          <span
            style={{
              fontSize: "1.35rem",
              fontWeight: 700,
              letterSpacing: "-0.025em",
            }}
          >
            Harbor Works
          </span>
        </div>
      </div>
    </>
  );
}

export default App;
