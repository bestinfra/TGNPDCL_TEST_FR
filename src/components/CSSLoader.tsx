import React, { useEffect } from 'react';
interface CSSLoaderProps {
  cssFiles?: string[];
  fallbackEnabled?: boolean;
}
const CSSLoader: React.FC<CSSLoaderProps> = ({ 
  cssFiles = ['global.css', 'default.css', 'custom.css'], 
  fallbackEnabled = true 
}) => {
    useEffect(() => {
    const loadCSSFromHost = async () => {
      for (const cssFile of cssFiles) {
        try {
          const response = await fetch(`http://localhost:3000/assets/${cssFile}`);
          if (response.ok) {
            const cssContent = await response.text();
            const styleElement = document.createElement('style');
            styleElement.id = `federated-${cssFile}`;
            styleElement.textContent = cssContent;
            const existingStyle = document.getElementById(`federated-${cssFile}`);
            if (existingStyle) {
              existingStyle.remove();
            }
            document.head.appendChild(styleElement);
          } else {
            throw new Error(`Failed to load ${cssFile}: ${response.status}`);
          }
        } catch (error) {
          console.warn(`Failed to load federated CSS ${cssFile}:`, error);
          if (fallbackEnabled) {
          }
        }
      }
    };
    loadCSSFromHost();
  }, [cssFiles, fallbackEnabled]);
  return null;
};
export default CSSLoader;