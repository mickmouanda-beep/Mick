import React from 'react';
import { Payment, Establishment } from '../types.ts';
import { DocumentTemplateConfig } from '../types/documentTemplates.ts';
import { CustomizableReceipt } from './documents/CustomizableReceipt.tsx';

interface PrintableReceiptProps {
  payment: Payment;
  establishment: Establishment;
  format?: 'A4' | 'A5';
  isDuplicate?: boolean;
  config?: DocumentTemplateConfig | null;
}

export const PrintableReceipt: React.FC<PrintableReceiptProps> = ({
  payment,
  establishment,
  format = 'A4',
  isDuplicate = false,
  config,
}) => {
  return (
    <CustomizableReceipt
      payment={payment}
      establishment={establishment}
      format={format}
      isDuplicate={isDuplicate}
      config={config}
    />
  );
};
