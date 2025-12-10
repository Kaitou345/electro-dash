import React, { ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  className?: string;
}

export default function Container({ children, className = '' }: ContainerProps) {
  return (
    <div className={`w-full h-full max-w-7xl px-4 md:px-8 lg:px-12 mx-auto ${className}`}>
      {children}
    </div>
  );
}