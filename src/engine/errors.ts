import type { Localized } from "@/content/locales";
import { V1_DATABASE } from "./catalog";

export const FRANCHISES = [
  "doctor-who",
  "mario",
  "portal",
  "metal-gear",
  "dark-souls",
] as const;

type Franchise = (typeof FRANCHISES)[number];

interface ErrorEntry {
  franchise: Franchise;
  code: number;
  text: Localized;
}

export const ERROR_LEVEL = 16;
export const ERROR_STATE = 1;

export interface FixedError {
  code: number;
  level: number;
  state: number;
  text: Localized;
}

export const DATABASE_OFFLINE: FixedError = {
  code: 942,
  level: 14,
  state: 4,
  text: {
    "pt-BR": `Não é possível abrir o banco de dados '${V1_DATABASE}' porque ele está offline.`,
    en: `Database '${V1_DATABASE}' cannot be opened because it is offline.`,
  },
};

export const DATE_CONVERSION_FAILED: FixedError = {
  code: 241,
  level: ERROR_LEVEL,
  state: ERROR_STATE,
  text: {
    "pt-BR": "Falha ao converter data e/ou hora da cadeia de caracteres.",
    en: "Conversion failed when converting date and/or time from character string.",
  },
};

export const DATE_IN_THE_FUTURE: FixedError = {
  code: 13542,
  level: ERROR_LEVEL,
  state: ERROR_STATE,
  text: {
    "pt-BR": "Wibbly-wobbly, timey-wimey... esta data ainda não aconteceu.",
    en: "Wibbly-wobbly, timey-wimey... this date hasn't happened yet.",
  },
};

export const ERROR_POOL: readonly ErrorEntry[] = [
  {
    franchise: "doctor-who",
    code: 11,
    text: {
      "pt-BR": "Não pisque. Consulta abortada.",
      en: "Don't blink. Query aborted.",
    },
  },
  {
    franchise: "doctor-who",
    code: 1963,
    text: {
      "pt-BR": "EXTERMINAR! Sua consulta foi exterminada.",
      en: "EXTERMINATE! Your query has been exterminated.",
    },
  },
  {
    franchise: "doctor-who",
    code: 40,
    text: {
      "pt-BR": "É maior por dentro, mas esta tabela não está aqui.",
      en: "It's bigger on the inside, but this table isn't here.",
    },
  },
  {
    franchise: "doctor-who",
    code: 2008,
    text: {
      "pt-BR": "Spoilers! Este comando ainda não pode ser revelado.",
      en: "Spoilers! This command can't be revealed yet.",
    },
  },
  {
    franchise: "doctor-who",
    code: 3,
    text: {
      "pt-BR": "Inverta a polaridade do fluxo de nêutrons e tente de novo.",
      en: "Reverse the polarity of the neutron flow and try again.",
    },
  },
  {
    franchise: "mario",
    code: 404,
    text: {
      "pt-BR": "Obrigado, Mario! Mas a sua tabela está em outro castelo!",
      en: "Thank you, Mario! But your table is in another castle!",
    },
  },
  {
    franchise: "mario",
    code: 1985,
    text: {
      "pt-BR": "Mamma mia! A consulta caiu no buraco.",
      en: "Mamma mia! The query fell down a pit.",
    },
  },
  {
    franchise: "mario",
    code: 8,
    text: {
      "pt-BR": "O Bowser levou este comando. Tente outro cano.",
      en: "Bowser took this command. Try another pipe.",
    },
  },
  {
    franchise: "mario",
    code: 99,
    text: {
      "pt-BR": "Acabaram as vidas. Pegue um cogumelo e tente de novo.",
      en: "Out of lives. Grab a mushroom and try again.",
    },
  },
  {
    franchise: "mario",
    code: 100,
    text: {
      "pt-BR": "100 moedas, mas nada de 1-UP para esta consulta.",
      en: "100 coins, but no 1-UP for this query.",
    },
  },
  {
    franchise: "portal",
    code: 8675,
    text: {
      "pt-BR": "O bolo é uma mentira.",
      en: "The cake is a lie.",
    },
  },
  {
    franchise: "portal",
    code: 2007,
    text: {
      "pt-BR": "Isso foi um triunfo. (Esta consulta, não.)",
      en: "This was a triumph. (This query wasn't.)",
    },
  },
  {
    franchise: "portal",
    code: 19,
    text: {
      "pt-BR": "O Centro de Enriquecimento lembra que este comando não existe.",
      en: "The Enrichment Center reminds you that this command does not exist.",
    },
  },
  {
    franchise: "portal",
    code: 2011,
    text: {
      "pt-BR": "ESPAÇOOO! Sua consulta foi para o espaço.",
      en: "SPAAACE! Your query went to space.",
    },
  },
  {
    franchise: "portal",
    code: 17,
    text: {
      "pt-BR": "Nem o Cubo Companheiro salvou esta consulta.",
      en: "Not even the Companion Cube could save this query.",
    },
  },
  {
    franchise: "metal-gear",
    code: 1998,
    text: {
      "pt-BR": "Snake? Snake?! SNAAAAAKE!",
      en: "Snake? Snake?! SNAAAAAKE!",
    },
  },
  {
    franchise: "metal-gear",
    code: 14085,
    text: {
      "pt-BR": "Codec 140.85: Snake, esse comando não faz parte da missão.",
      en: "Codec 140.85: Snake, that command isn't part of the mission.",
    },
  },
  {
    franchise: "metal-gear",
    code: 1,
    text: {
      "pt-BR": "! (Você foi descoberto. Consulta abortada.)",
      en: "! (You've been spotted. Query aborted.)",
    },
  },
  {
    franchise: "metal-gear",
    code: 4,
    text: {
      "pt-BR": "A guerra mudou. A sua sintaxe, não.",
      en: "War has changed. Your syntax hasn't.",
    },
  },
  {
    franchise: "metal-gear",
    code: 2,
    text: {
      "pt-BR": "Nem uma caixa de papelão esconde este erro.",
      en: "Not even a cardboard box can hide this error.",
    },
  },
  {
    franchise: "dark-souls",
    code: 666,
    text: {
      "pt-BR": "VOCÊ MORREU. Transação revertida.",
      en: "YOU DIED. Transaction rolled back.",
    },
  },
  {
    franchise: "dark-souls",
    code: 9,
    text: {
      "pt-BR": "Prepare-se para morrer... e para reescrever esta consulta.",
      en: "Prepare to die... and to rewrite this query.",
    },
  },
  {
    franchise: "dark-souls",
    code: 7,
    text: {
      "pt-BR": "Louvado seja o Sol! Mas este comando está amaldiçoado.",
      en: "Praise the Sun! But this command is cursed.",
    },
  },
  {
    franchise: "dark-souls",
    code: 12,
    text: {
      "pt-BR": "Fogueira acesa. Descanse e tente de novo.",
      en: "Bonfire lit. Rest, then try again.",
    },
  },
  {
    franchise: "dark-souls",
    code: 13,
    text: {
      "pt-BR": "Baú incrível adiante. (Era um mímico.)",
      en: "Amazing chest ahead. (It was a mimic.)",
    },
  },
];

export function pickError(random: () => number): ErrorEntry {
  const index = Math.floor(random() * ERROR_POOL.length);
  return ERROR_POOL[Math.min(Math.max(index, 0), ERROR_POOL.length - 1)];
}
