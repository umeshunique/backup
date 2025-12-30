export default function Test() {
  return (
    <div style={{
      backgroundColor: 'white',
      color: 'black',
      padding: '50px',
      fontSize: '24px',
      minHeight: '100vh'
    }}>
      <h1>TEST PAGE - If you see this, React is working!</h1>
      <p>Current time: {new Date().toLocaleString()}</p>
      <p>If you see this page, the problem is with the main Index component or its dependencies.</p>
    </div>
  );
}
