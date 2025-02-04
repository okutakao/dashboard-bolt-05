import React from 'react';
import { Check, Pencil, FileText, Loader2 } from 'lucide-react';

type Step = {
  id: number;
  label: string;
  icon: React.ReactNode;
  status: 'completed' | 'current' | 'upcoming';
};

type StepIndicatorProps = {
  currentStep: number;
};

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const steps: Step[] = [
    {
      id: 1,
      label: 'アウトライン作成',
      icon: <Pencil className="h-5 w-5" />,
      status: currentStep > 1 ? 'completed' : currentStep === 1 ? 'current' : 'upcoming'
    },
    {
      id: 2,
      label: '記事生成',
      icon: <Loader2 className="h-5 w-5" />,
      status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'current' : 'upcoming'
    },
    {
      id: 3,
      label: '編集・確認',
      icon: <FileText className="h-5 w-5" />,
      status: currentStep === 3 ? 'current' : 'upcoming'
    }
  ];

  return (
    <div className="py-4">
      <div className="max-w-3xl mx-auto">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between">
            {steps.map((step, stepIdx) => (
              <li key={step.id} className="relative flex items-center">
                <div className="flex items-center">
                  <span
                    className={`w-8 h-8 flex items-center justify-center rounded-full
                      ${step.status === 'completed' ? 'bg-blue-600' : 
                        step.status === 'current' ? 'bg-blue-100 border-2 border-blue-600' : 
                        'bg-gray-100 border-2 border-gray-300'}`}
                  >
                    {step.status === 'completed' ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <span className={step.status === 'current' ? 'text-blue-600' : 'text-gray-500'}>
                        {step.icon}
                      </span>
                    )}
                  </span>
                  <span
                    className={`ml-3 text-sm font-medium
                      ${step.status === 'completed' ? 'text-blue-600' :
                        step.status === 'current' ? 'text-blue-600' :
                        'text-gray-500'}`}
                  >
                    {step.label}
                  </span>
                </div>
                {stepIdx !== steps.length - 1 && (
                  <div className="hidden md:block w-full bg-gray-200 h-0.5 mx-4" />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  );
}