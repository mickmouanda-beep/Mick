import React from 'react';
import { SchoolClass, Establishment } from '../types.ts';
import { DocumentTemplateConfig } from '../types/documentTemplates.ts';
import { CustomizableReportCard } from './documents/CustomizableReportCard.tsx';

interface PrintableReportCardProps {
  report: any;
  establishment: Establishment;
  schoolClass: SchoolClass;
  term: string;
  classAverage?: number | null;
  config?: DocumentTemplateConfig | null;
}

export const PrintableReportCard: React.FC<PrintableReportCardProps> = ({
  report,
  establishment,
  schoolClass,
  term,
  classAverage,
  config,
}) => {
  return (
    <CustomizableReportCard
      report={report}
      establishment={establishment}
      schoolClass={schoolClass}
      term={term}
      classAverage={classAverage}
      config={config}
    />
  );
};
