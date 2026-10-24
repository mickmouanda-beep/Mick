export const CONGO_DEPARTMENTS = [
  "Brazzaville", "Pointe-Noire", "Kouilou", "Niari", "Bouenza", "Lékoumou", "Pool", 
  "Plateaux", "Cuvette", "Cuvette-Ouest", "Sangha", "Likouala", "Djoué-Léfini", 
  "Nkéni-Alima", "Congo-Oubangui"
];

export const CONGO_GEO_DATA: Record<string, Record<string, string[]>> = {
  "Brazzaville": {
    "Brazzaville": ["Makélékélé", "Bacongo", "Poto-Poto", "Moungali", "Ouenzé", "Talangaï", "Mfilou", "Madibou", "Djiri"]
  },
  "Pointe-Noire": {
    "Pointe-Noire": ["Lumumba", "Mvou-Mvou", "Tié-Tié", "Loandjili", "Mongo-Poukou", "Ngoyo"]
  },
  "Niari": {
    "Dolisie": ["Dolisie Ville"],
    "Mossendjo": ["Mossendjo Ville"]
  },
  "Bouenza": {
    "Nkayi": ["Nkayi Ville"],
    "Madingou": ["Madingou Ville"]
  },
  "Plateaux": {
    "Djambala": ["Djambala Ville"],
    "Gamboma": ["Gamboma Ville"]
  },
  "Cuvette": {
    "Owando": ["Owando Ville"],
    "Mossaka": ["Mossaka Ville"]
  },
  "Sangha": {
    "Ouesso": ["Ouesso Ville"]
  },
  "Likouala": {
    "Impfondo": ["Impfondo Ville"]
  },
  "Kouilou": {
    "Loango": ["Loango Ville"]
  }
  // Other departments can be added as needed
};
