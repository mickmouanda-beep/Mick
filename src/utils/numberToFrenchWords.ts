/**
 * Convertit un nombre entier positif en lettres en français (avec devise Francs CFA).
 * Conforme aux règles d'orthographe françaises.
 */

const UNITES = [
  '',
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
  'seize',
  'dix-sept',
  'dix-huit',
  'dix-neuf'
];

const DIZAINES = [
  '',
  'dix',
  'vingt',
  'trente',
  'quarante',
  'cinquante',
  'soixante',
  'soixante-dix',
  'quatre-vingts',
  'quatre-vingt-dix'
];

function convertLessThanHundred(n: number): string {
  if (n < 20) {
    return UNITES[n];
  }

  const dizaine = Math.floor(n / 10);
  const reste = n % 10;

  if (dizaine === 7) {
    // 70-79: soixante-dix, soixante et onze, soixante-douze...
    if (reste === 1) return 'soixante et onze';
    return `soixante-${UNITES[10 + reste]}`;
  }

  if (dizaine === 8) {
    // 80: quatre-vingts, 81: quatre-vingt-un...
    if (reste === 0) return 'quatre-vingts';
    return `quatre-vingt-${UNITES[reste]}`;
  }

  if (dizaine === 9) {
    // 90-99: quatre-vingt-dix, quatre-vingt-onze...
    return `quatre-vingt-${UNITES[10 + reste]}`;
  }

  // 20-69
  const nomDizaine = DIZAINES[dizaine];
  if (reste === 0) return nomDizaine;
  if (reste === 1) return `${nomDizaine} et un`;
  return `${nomDizaine}-${UNITES[reste]}`;
}

function convertLessThanThousand(n: number): string {
  if (n === 0) return '';
  if (n < 100) return convertLessThanHundred(n);

  const centaine = Math.floor(n / 100);
  const reste = n % 100;

  let centText = '';
  if (centaine === 1) {
    centText = 'cent';
  } else {
    // 200: deux cents, 205: deux cent cinq
    centText = `${UNITES[centaine]} cent${reste === 0 ? 's' : ''}`;
  }

  if (reste === 0) return centText;
  return `${centText} ${convertLessThanHundred(reste)}`;
}

export function numberToFrenchWords(num: number, includeCurrency = true): string {
  const rounded = Math.floor(Math.abs(num));

  if (rounded === 0) {
    const zeroStr = 'zéro';
    return includeCurrency ? `${capitalize(zeroStr)} franc CFA` : capitalize(zeroStr);
  }

  if (rounded > 1000000000) {
    return `${rounded.toLocaleString('fr-FR')} francs CFA`;
  }

  const millions = Math.floor(rounded / 1000000);
  const milliers = Math.floor((rounded % 1000000) / 1000);
  const unites = rounded % 1000;

  const parts: string[] = [];

  // Millions
  if (millions > 0) {
    if (millions === 1) {
      parts.push('un million');
    } else {
      parts.push(`${convertLessThanThousand(millions)} millions`);
    }
  }

  // Milliers
  if (milliers > 0) {
    if (milliers === 1) {
      parts.push('mille');
    } else {
      parts.push(`${convertLessThanThousand(milliers)} mille`);
    }
  }

  // Unités
  if (unites > 0) {
    parts.push(convertLessThanThousand(unites));
  }

  let result = parts.join(' ').trim();

  // Mettre la première lettre en majuscule
  result = capitalize(result);

  if (includeCurrency) {
    if (rounded === 1) {
      result += ' franc CFA';
    } else if (rounded >= 1000000 && (rounded % 1000000 === 0)) {
      result += ' de francs CFA';
    } else {
      result += ' francs CFA';
    }
  }

  return result;
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
