import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  isGlass?: boolean;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  isGlass = false,
  hoverEffect = true,
  ...props
}) => {
  const classes = `
    ${isGlass ? 'glass-panel' : 'bg-surface'}
    ${hoverEffect ? 'card-hoverable' : ''}
    ${className}
  `.trim();

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};
