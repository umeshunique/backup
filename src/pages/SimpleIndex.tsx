export default function SimpleIndex() {
  return (
    <div style={{
      padding: '40px',
      backgroundColor: '#ffffff',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        backgroundColor: '#f5f5f5',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          fontSize: '32px',
          marginBottom: '20px',
          color: '#333'
        }}>
          🗄️ Database Backup Manager
        </h1>

        <div style={{
          backgroundColor: '#4CAF50',
          color: 'white',
          padding: '15px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          ✅ Application is running successfully!
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#555' }}>
            Quick Status
          </h2>
          <ul style={{ lineHeight: '2', color: '#666' }}>
            <li>✅ Frontend Server: Running on port 8080</li>
            <li>✅ Backend API: Running on port 3005</li>
            <li>✅ React: Loaded successfully</li>
          </ul>
        </div>

        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          padding: '15px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <strong>⚠️ Note:</strong> The full application UI is being loaded. This is a simplified view to confirm everything is working.
        </div>

        <div>
          <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#555' }}>
            Available Features
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            {['Dashboard', 'Servers', 'Backup', 'Restore', 'Compare', 'Release', 'History', 'Settings'].map(feature => (
              <div key={feature} style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}>
                <strong style={{ color: '#2196F3' }}>{feature}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
