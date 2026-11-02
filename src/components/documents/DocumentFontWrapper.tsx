import React from 'react';
import { DocumentFont } from '../../types/documentTemplates.ts';

interface DocumentFontWrapperProps {
  font: DocumentFont;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const getFontFamilyCss = (font: DocumentFont): string => {
  switch (font) {
    case 'merriweather':
      return "'Merriweather', 'Georgia', Cambria, serif";
    case 'roboto':
      return "'Roboto', 'Helvetica Neue', Arial, sans-serif";
    case 'courier':
      return "'Courier New', Courier, monospace";
    case 'inter':
    default:
      return "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  }
};

export const DocumentFontWrapper: React.FC<DocumentFontWrapperProps> = ({
  font,
  children,
  className = '',
  style = {},
}) => {
  const fontFamily = getFontFamilyCss(font);

  return (
    <div
      className={`printable-document text-slate-900 ${className}`}
      style={{
        fontFamily,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
