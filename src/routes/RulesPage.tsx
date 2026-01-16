import { useNavigate } from 'react-router-dom';
import { RulesPage as RulesPageComponent } from '../components/RulesPage';

export const RulesPage = () => {
    const navigate = useNavigate();

    const handleBack = () => {
        navigate(-1); // Go back to previous page
    };

    return <RulesPageComponent onBack={handleBack} />;
};
