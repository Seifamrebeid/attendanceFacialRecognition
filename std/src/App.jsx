import "./App.css";

function App() {
  const sendName = async () => {
    const res = await fetch("http://127.0.0.1:8000/hello", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Seif" }),
    });

    const data = await res.json();
    console.log(data.message);
  };

  return (
    <>
      <div>
        <div>
          <h1>Hello from Deno!</h1>
          <button onClick={sendName}>Send Name</button>
        </div>
      </div>
    </>
  );
}

export default App;
