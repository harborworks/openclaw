function App() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <img src="/logo.svg" alt="Harbor Works" width={80} height={80} />
      <h1 style={{ marginTop: 24, fontSize: 32, fontWeight: 600 }}>
        Harbor Works
      </h1>
    </div>
  );
}

export default App;
