interface PlaceholderPageProps {
  title: string;
}

const PlaceholderPage = ({ title }: PlaceholderPageProps) => {
  return (
    <div style={{ padding: '2rem', background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1e293b' }}>{title}</h2>
      <p style={{ color: '#64748b', lineHeight: '1.5' }}>
        This module is currently under development. Please check back later when this feature is released!
      </p>
    </div>
  );
};

export default PlaceholderPage;
