import React, { useState, useEffect } from 'react';
import { Payment } from '../../types.ts';
import { DocumentTemplateConfig, getDefaultTemplateConfig } from '../../types/documentTemplates.ts';
import { ReceiptClassique } from './receipts/ReceiptClassique.tsx';
import { ReceiptModerne } from './receipts/ReceiptModerne.tsx';
import { ReceiptSobre } from './receipts/ReceiptSobre.tsx';
import { ReceiptInstitutionnel } from './receipts/ReceiptInstitutionnel.tsx';
import { ReceiptElegant } from './receipts/ReceiptElegant.tsx';
import { ReceiptCompact } from './receipts/ReceiptCompact.tsx';
import { api } from '../../lib/api.ts';

interface CustomizableReceiptProps {
  payment: Payment;
  establishment: any;
  format?: 'A4' | 'A5';
  isDuplicate?: boolean;
  config?: DocumentTemplateConfig | null;
}

export const CustomizableReceipt: React.FC<CustomizableReceiptProps> = ({
  payment,
  establishment,
  format = 'A4',
  isDuplicate = false,
  config: propConfig,
}) => {
  const [loadedConfig, setLoadedConfig] = useState<DocumentTemplateConfig | null>(null);

  const snapshotConfig = (payment as any)?.template_snapshot || null;

  useEffect(() => {
    if (snapshotConfig || propConfig) {
      return;
    }

    let isMounted = true;
    api.getDocumentTemplate('quittance')
      .then((cfg) => {
        if (isMounted && cfg) {
          setLoadedConfig(cfg);
        }
      })
      .catch((err) => {
        console.warn('Impossible de charger le modèle de quittance, utilisation du défaut:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [snapshotConfig, propConfig, establishment?.id]);

  const activeConfig: DocumentTemplateConfig =
    snapshotConfig ||
    propConfig ||
    loadedConfig ||
    getDefaultTemplateConfig('quittance', establishment);

  switch (activeConfig.modelId) {
    case 'moderne':
      return (
        <ReceiptModerne
          payment={payment}
          establishment={establishment}
          format={format}
          isDuplicate={isDuplicate}
          config={activeConfig}
        />
      );
    case 'sobre':
      return (
        <ReceiptSobre
          payment={payment}
          establishment={establishment}
          format={format}
          isDuplicate={isDuplicate}
          config={activeConfig}
        />
      );
    case 'institutionnel':
      return (
        <ReceiptInstitutionnel
          payment={payment}
          establishment={establishment}
          format={format}
          isDuplicate={isDuplicate}
          config={activeConfig}
        />
      );
    case 'elegant':
      return (
        <ReceiptElegant
          payment={payment}
          establishment={establishment}
          format={format}
          isDuplicate={isDuplicate}
          config={activeConfig}
        />
      );
    case 'compact':
      return (
        <ReceiptCompact
          payment={payment}
          establishment={establishment}
          format={format}
          isDuplicate={isDuplicate}
          config={activeConfig}
        />
      );
    case 'classique':
    default:
      return (
        <ReceiptClassique
          payment={payment}
          establishment={establishment}
          format={format}
          isDuplicate={isDuplicate}
          config={activeConfig}
        />
      );
  }
};
