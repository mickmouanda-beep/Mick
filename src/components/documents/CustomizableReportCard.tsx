import React, { useState, useEffect } from 'react';
import { DocumentTemplateConfig, getDefaultTemplateConfig } from '../../types/documentTemplates.ts';
import { BulletinClassique } from './bulletins/BulletinClassique.tsx';
import { BulletinModerne } from './bulletins/BulletinModerne.tsx';
import { BulletinSobre } from './bulletins/BulletinSobre.tsx';
import { BulletinInstitutionnel } from './bulletins/BulletinInstitutionnel.tsx';
import { BulletinElegant } from './bulletins/BulletinElegant.tsx';
import { BulletinCompact } from './bulletins/BulletinCompact.tsx';
import { api } from '../../lib/api.ts';

interface CustomizableReportCardProps {
  report: any;
  establishment: any;
  schoolClass: any;
  term: string;
  classAverage?: number | null;
  config?: DocumentTemplateConfig | null;
}

export const CustomizableReportCard: React.FC<CustomizableReportCardProps> = ({
  report,
  establishment,
  schoolClass,
  term,
  classAverage,
  config: propConfig,
}) => {
  const [loadedConfig, setLoadedConfig] = useState<DocumentTemplateConfig | null>(null);

  const snapshotConfig = report?.template_snapshot || null;

  useEffect(() => {
    if (snapshotConfig || propConfig) {
      return;
    }

    let isMounted = true;
    api.getDocumentTemplate('bulletin')
      .then((cfg) => {
        if (isMounted && cfg) {
          setLoadedConfig(cfg);
        }
      })
      .catch((err) => {
        console.warn('Impossible de charger le modèle de bulletin, utilisation du défaut:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [snapshotConfig, propConfig, establishment?.id]);

  const activeConfig: DocumentTemplateConfig =
    snapshotConfig ||
    propConfig ||
    loadedConfig ||
    getDefaultTemplateConfig('bulletin', establishment);

  switch (activeConfig.modelId) {
    case 'moderne':
      return (
        <BulletinModerne
          report={report}
          establishment={establishment}
          schoolClass={schoolClass}
          term={term}
          classAverage={classAverage}
          config={activeConfig}
        />
      );
    case 'sobre':
      return (
        <BulletinSobre
          report={report}
          establishment={establishment}
          schoolClass={schoolClass}
          term={term}
          classAverage={classAverage}
          config={activeConfig}
        />
      );
    case 'institutionnel':
      return (
        <BulletinInstitutionnel
          report={report}
          establishment={establishment}
          schoolClass={schoolClass}
          term={term}
          classAverage={classAverage}
          config={activeConfig}
        />
      );
    case 'elegant':
      return (
        <BulletinElegant
          report={report}
          establishment={establishment}
          schoolClass={schoolClass}
          term={term}
          classAverage={classAverage}
          config={activeConfig}
        />
      );
    case 'compact':
      return (
        <BulletinCompact
          report={report}
          establishment={establishment}
          schoolClass={schoolClass}
          term={term}
          classAverage={classAverage}
          config={activeConfig}
        />
      );
    case 'classique':
    default:
      return (
        <BulletinClassique
          report={report}
          establishment={establishment}
          schoolClass={schoolClass}
          term={term}
          classAverage={classAverage}
          config={activeConfig}
        />
      );
  }
};
