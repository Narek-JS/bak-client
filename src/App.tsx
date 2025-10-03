import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import ImageUpload from './components/ImageUpload';
import VideoProcessor from './components/VideoProcessor';

type AppStep = 'landing' | 'upload' | 'record';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('landing');

  const handleStepChange = (newStep: AppStep) => {
    setStep(newStep);
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 'landing':
        return <LandingPage onStart={() => handleStepChange('upload')} />;
      case 'upload':
        return <ImageUpload onUploadSuccess={() => handleStepChange('record')} />;
      case 'record':
        return <VideoProcessor />;
      default:
        return <LandingPage onStart={() => handleStepChange('upload')} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {renderCurrentStep()}
    </div>
  );
};

export default App;
