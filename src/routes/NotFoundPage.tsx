import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

export const NotFoundPage = () => {
    const navigate = useNavigate();

    return (
        <div className="page-container">
            <div className="not-found-section" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                textAlign: 'center',
                gap: '2rem'
            }}>
                <div>
                    <h2 style={{ fontSize: '4rem', margin: '0' }}>404</h2>
                    <h3>Page Not Found</h3>
                    <p>The page you're looking for doesn't exist.</p>
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="mode-button"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '1rem 2rem'
                    }}
                >
                    <Home size={24} />
                    <span>Go Home</span>
                </button>
            </div>
        </div>
    );
};
