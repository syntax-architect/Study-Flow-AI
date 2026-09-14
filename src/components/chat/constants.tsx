import React from 'react';
import { Calculator, Lightbulb, CheckCircle, BookOpen } from 'lucide-react';

export const presetQueries = [
  {
    label: 'Solve Equation',
    text: 'Walk me through the steps to solve this differential equation.',
    icon: <Calculator className="w-4 h-4 text-blue-500" />,
  },
  {
    label: 'Explain Concept',
    text: "Explain Newton's Third Law as if I were a 5-year-old.",
    icon: <Lightbulb className="w-4 h-4 text-emerald-500" />,
  },
  {
    label: 'Check My Work',
    text: 'I got x=42 for this mechanics problem, can you verify my derivation?',
    icon: <CheckCircle className="w-4 h-4 text-purple-500" />,
  },
  {
    label: 'Generate Quiz',
    text: 'Give me 3 practice questions on rigid body dynamics.',
    icon: <BookOpen className="w-4 h-4 text-rose-500" />,
  },
];
