export type OfficePosition =
  | 'RH'
  | 'Magasinier'
  | 'Secrétariat'
  | 'Assistant'
  | 'Finance'
  | 'Comptable'
  | 'Directeur Général'
  | 'Directeur Administratif'
  | 'Coordinateur';

export interface PermissionsConfig {
  planning: {
    view: boolean;
    add: boolean;
    edit: boolean;
  };
  rdv: {
    view: boolean;
    add: boolean;
    edit: boolean;
  };
  factures: {
    view: boolean;
    add: boolean;
    edit: boolean;
  };
  stocks: {
    view: boolean;
    add: boolean;
    edit: boolean;
  };
  chiffreAffaire: {
    view: boolean;
  };
  gpsLive: {
    view: boolean;
  };
  label: {
    view: boolean;
    add: boolean;
    edit: boolean;
  };
  statuts: {
    view: boolean;
    edit: boolean;
  };
}

const allFalse: PermissionsConfig = {
  planning: { view: false, add: false, edit: false },
  rdv: { view: false, add: false, edit: false },
  factures: { view: false, add: false, edit: false },
  stocks: { view: false, add: false, edit: false },
  chiffreAffaire: { view: false },
  gpsLive: { view: false },
  label: { view: false, add: false, edit: false },
  statuts: { view: false, edit: false },
};

export const getOfficePermissions = (position: OfficePosition | null | undefined, role: string): PermissionsConfig => {
  if (role === 'admin') {
    return {
      planning: { view: true, add: true, edit: true },
      rdv: { view: true, add: true, edit: true },
      factures: { view: true, add: true, edit: true },
      stocks: { view: true, add: true, edit: true },
      chiffreAffaire: { view: true },
      gpsLive: { view: true },
      label: { view: true, add: true, edit: true },
      statuts: { view: true, edit: true },
    };
  }

  if (!position || role !== 'office') {
    return { ...allFalse };
  }

  switch (position) {
    case 'Directeur Général':
      return {
        planning: { view: true, add: true, edit: true },
        rdv: { view: true, add: true, edit: true },
        factures: { view: true, add: false, edit: false },
        stocks: { view: true, add: false, edit: false },
        chiffreAffaire: { view: true },
        gpsLive: { view: true },
        label: { view: true, add: true, edit: true },
        statuts: { view: true, edit: true },
      };

    case 'Directeur Administratif':
      return {
        planning: { view: true, add: true, edit: true },
        rdv: { view: true, add: true, edit: true },
        factures: { view: true, add: false, edit: false },
        stocks: { view: true, add: false, edit: false },
        chiffreAffaire: { view: true },
        gpsLive: { view: true },
        label: { view: true, add: true, edit: true },
        statuts: { view: true, edit: true },
      };

    case 'Coordinateur':
      return {
        planning: { view: true, add: true, edit: true },
        rdv: { view: true, add: true, edit: true },
        factures: { view: false, add: false, edit: false },
        stocks: { view: false, add: false, edit: false },
        chiffreAffaire: { view: false },
        gpsLive: { view: true },
        label: { view: true, add: true, edit: false },
        statuts: { view: true, edit: false },
      };

    case 'Assistant':
      return {
        planning: { view: true, add: true, edit: true },
        rdv: { view: true, add: true, edit: true },
        factures: { view: false, add: false, edit: false },
        stocks: { view: false, add: false, edit: false },
        chiffreAffaire: { view: false },
        gpsLive: { view: false },
        label: { view: true, add: true, edit: false },
        statuts: { view: true, edit: false },
      };

    case 'Secrétariat':
      return {
        planning: { view: true, add: false, edit: false },
        rdv: { view: true, add: false, edit: false },
        factures: { view: false, add: true, edit: false },
        stocks: { view: false, add: false, edit: false },
        chiffreAffaire: { view: false },
        gpsLive: { view: false },
        label: { view: true, add: false, edit: false },
        statuts: { view: true, edit: false },
      };

    case 'Finance':
      return {
        planning: { view: false, add: false, edit: false },
        rdv: { view: false, add: false, edit: false },
        factures: { view: true, add: false, edit: false },
        stocks: { view: false, add: false, edit: false },
        chiffreAffaire: { view: true },
        gpsLive: { view: false },
        label: { view: false, add: false, edit: false },
        statuts: { view: false, edit: false },
      };

    case 'Comptable':
      return {
        planning: { view: false, add: false, edit: false },
        rdv: { view: false, add: false, edit: false },
        factures: { view: true, add: false, edit: false },
        stocks: { view: false, add: false, edit: false },
        chiffreAffaire: { view: true },
        gpsLive: { view: false },
        label: { view: false, add: false, edit: false },
        statuts: { view: false, edit: false },
      };

    case 'Magasinier':
      return {
        planning: { view: false, add: false, edit: false },
        rdv: { view: false, add: false, edit: false },
        factures: { view: false, add: false, edit: false },
        stocks: { view: true, add: true, edit: true },
        chiffreAffaire: { view: false },
        gpsLive: { view: false },
        label: { view: true, add: false, edit: false },
        statuts: { view: false, edit: false },
      };

    case 'RH':
      return {
        planning: { view: true, add: false, edit: false },
        rdv: { view: true, add: false, edit: false },
        factures: { view: false, add: false, edit: false },
        stocks: { view: false, add: false, edit: false },
        chiffreAffaire: { view: false },
        gpsLive: { view: true },
        label: { view: true, add: false, edit: false },
        statuts: { view: true, edit: true },
      };

    default:
      return { ...allFalse };
  }
};

export const canAccess = (
  position: OfficePosition | null | undefined,
  role: string,
  feature: keyof PermissionsConfig,
  action: 'view' | 'add' | 'edit' = 'view'
): boolean => {
  const permissions = getOfficePermissions(position, role);
  const featurePermissions = permissions[feature] as any;

  if (typeof featurePermissions === 'object') {
    return featurePermissions[action] === true;
  }

  return featurePermissions === true;
};
